import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { computeMods, energyCap } from '../src/game/modifiers';
import { GAME_ID, SaveError, applyOffline, deserialize, serialize } from '../src/game/save';
import { advance } from '../src/game/simulation';
import { SAVE_VERSION, createInitialState, createRuntime } from '../src/game/state';

const sample = () => {
  const s = createInitialState(1000);
  s.resources = { scrap: 1234.5, energy: 50, alloys: 77, data: 3 };
  s.machines.drone.count = 12;
  s.machines.drone.level = 1;
  s.machines.foundry = { count: 3, level: 0, active: false };
  s.upgrades = ['gloves'];
  s.research = ['batteries', 'radar'];
  s.modules = { owned: { plasma_cell: 2 }, equipped: ['plasma_cell'] };
  s.prestige = { fragments: 4, fragmentsTotal: 9, resets: 1, core: { amplifier: 2 }, bestRunTime: 900 };
  s.achievements = ['first_scrap'];
  s.missions.index = 5;
  s.settings = { reducedMotion: true, muted: true, buyAmount: 'max' };
  return s;
};

describe('guardado y carga', () => {
  it('serializar y deserializar conserva el estado', () => {
    const s = sample();
    const back = deserialize(serialize(s, 5000));
    expect(back.resources).toEqual(s.resources);
    expect(back.machines.drone).toEqual({ count: 12, level: 1, active: true });
    expect(back.machines.foundry.active).toBe(false);
    expect(back.upgrades).toEqual(['gloves']);
    expect(back.research).toEqual(['batteries', 'radar']);
    expect(back.modules).toEqual(s.modules);
    expect(back.prestige).toEqual(s.prestige);
    expect(back.settings).toEqual(s.settings);
    expect(back.lastSaved).toBe(5000);
  });

  it('rechaza textos que no son partidas válidas', () => {
    expect(() => deserialize('no es json')).toThrow(SaveError);
    expect(() => deserialize('[]')).toThrow(SaveError);
    expect(() => deserialize(JSON.stringify({ game: 'otro', version: 1, state: {} }))).toThrow(SaveError);
    expect(() => deserialize(JSON.stringify({ game: GAME_ID, version: SAVE_VERSION + 1, state: {} }))).toThrow(/más nueva/);
    expect(() => deserialize(JSON.stringify({ game: GAME_ID, version: SAVE_VERSION, state: null }))).toThrow(SaveError);
  });

  it('sanea valores negativos, imposibles y desconocidos', () => {
    const env = JSON.parse(serialize(sample()));
    const st = env.state;
    st.resources = { scrap: -50, energy: 'NaN', alloys: Infinity, data: '12' };
    st.machines.drone.count = -3;
    st.machines.solar.count = 2.7;
    st.machines.bogus = { count: 5 };
    st.research.push('inventada');
    st.modules = { owned: { plasma_cell: 99, fake: 1 }, equipped: ['fake', 'plasma_cell', 'plasma_cell'] };
    st.prestige.fragments = 50;
    st.prestige.fragmentsTotal = 10;
    st.prestige.core = { amplifier: 999, nope: 2 };
    st.stats.runScrap = 1e9;
    st.stats.totalScrap = 5;
    const s = deserialize(JSON.stringify(env));
    expect(s.resources).toEqual({ scrap: 0, energy: 0, alloys: 0, data: 12 });
    expect(s.machines.drone.count).toBe(0);
    expect(s.machines.solar.count).toBe(2);
    expect('bogus' in s.machines).toBe(false);
    expect(s.research).toEqual(['batteries', 'radar']);
    expect(s.modules.owned).toEqual({ plasma_cell: BALANCE.modules.maxLevel });
    expect(s.modules.equipped).toEqual(['plasma_cell']);
    expect(s.prestige.fragmentsTotal).toBeGreaterThanOrEqual(s.prestige.fragments);
    expect(s.prestige.core).toEqual({ amplifier: 10 });
    expect(s.stats.totalScrap).toBeGreaterThanOrEqual(s.stats.runScrap);
  });

  it('migra partidas de la versión 1', () => {
    const v1 = {
      game: GAME_ID,
      version: 1,
      savedAt: 1000,
      state: {
        resources: { scrap: 10, energy: 0, alloys: 0, data: 0 },
        fragments: 3,
        fragmentsTotal: 8,
        settings: { sound: false, reducedMotion: false },
      },
    };
    const s = deserialize(JSON.stringify(v1));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.prestige.fragments).toBe(3);
    expect(s.prestige.fragmentsTotal).toBe(8);
    expect(s.settings.muted).toBe(true);
    expect(s.machines.drone.count).toBe(0); // campos ausentes rellenados con valores por defecto
  });

  it('una expedición guardada a medias se recupera', () => {
    const s = sample();
    s.expedition.run = {
      sectorId: 'rust_belt',
      encounters: ['debris_field', 'trader', 'rust_heart'],
      step: 1,
      hull: 60,
      maxHull: 100,
      cargo: { scrap: 500, energy: 0, alloys: 0, data: 0 },
      modules: ['plasma_cell'],
      fragments: 0,
      status: 'event',
      lastOutcome: null,
      ending: null,
      log: [{ text: 'x', good: true }],
    };
    const back = deserialize(serialize(s));
    expect(back.expedition.run?.step).toBe(1);
    expect(back.expedition.run?.cargo.scrap).toBe(500);
  });
});

describe('progreso offline', () => {
  it('equivale a jugar en vivo el mismo tiempo', () => {
    const make = () => {
      const s = createInitialState(0);
      s.machines.drone.count = 30;
      s.machines.solar.count = 10;
      s.machines.sorter.count = 4;
      s.machines.foundry.count = 2;
      s.resources.scrap = 100;
      return s;
    };
    const live = make();
    const liveRt = createRuntime();
    for (let i = 0; i < 3600; i++) advance(live, liveRt, 1);
    const off = make();
    const report = applyOffline(off, createRuntime(), 3600);
    expect(report.cappedSeconds).toBe(3600);
    expect(off.resources.alloys / live.resources.alloys).toBeCloseTo(1, 2);
    expect(off.resources.scrap / live.resources.scrap).toBeCloseTo(1, 1);
    expect(report.gained.alloys).toBeCloseTo(off.resources.alloys, 5);
  });

  it('cuenta como máximo ocho horas y no rompe la economía', () => {
    const s = createInitialState(0);
    s.machines.drone.count = 50;
    s.machines.solar.count = 20;
    const r = applyOffline(s, createRuntime(), 30 * 24 * 3600);
    expect(r.capped).toBe(true);
    expect(r.cappedSeconds).toBe(BALANCE.offlineCapSeconds);
    expect(s.stats.totalTime).toBeCloseTo(BALANCE.offlineCapSeconds, 3);
    for (const v of Object.values(s.resources)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(s.resources.energy).toBeLessThanOrEqual(energyCap(s, computeMods(s)) + 1e-6);
  });

  it('una Sobrecarga activa al salir solo dura su tiempo restante', () => {
    const s = createInitialState(0);
    s.machines.drone.count = 10;
    s.overload.remaining = 10;
    s.overload.cooldown = 70;
    const rt = createRuntime();
    applyOffline(s, rt, 600);
    const g = computeMods(s).global;
    expect(s.resources.scrap).toBeCloseTo(10 * 0.45 * g * (10 * computeMods(s).overloadMult + 590), 2);
    expect(s.overload.cooldown).toBe(0);
  });
});
