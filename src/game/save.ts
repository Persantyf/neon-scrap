import { BALANCE } from './balance';
import { ACHIEVEMENT_BY_ID } from './content/achievements';
import { CORE_BY_ID } from './content/core';
import { ENCOUNTER_BY_ID, SECTOR_BY_ID } from './content/expeditions';
import { MACHINE_IDS } from './content/machines';
import { MISSIONS } from './content/missions';
import { computeMods } from './modifiers';
import { MODULE_BY_ID } from './content/modules';
import { RESEARCH_BY_ID } from './content/research';
import { UPGRADE_BY_ID } from './content/upgrades';
import { advance } from './simulation';
import { SAVE_VERSION, createInitialState } from './state';
import type { ExpeditionRun, GameState, MachineId, ProceduralMission, Resources, Runtime } from './types';

export const SAVE_KEY = 'neon-scrap-last-orbit:save';
export const GAME_ID = 'neon-scrap-last-orbit';

export interface SaveEnvelope {
  game: string;
  version: number;
  savedAt: number;
  state: unknown;
}

export class SaveError extends Error {}

/* ---------- Utilidades de saneamiento ---------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Número finito y no negativo (y opcionalmente entero y acotado). */
function num(v: unknown, fallback = 0, opts: { int?: boolean; max?: number } = {}): number {
  let n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) n = fallback;
  if (opts.int) n = Math.floor(n);
  if (opts.max !== undefined) n = Math.min(n, opts.max);
  return n;
}
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const idList = (v: unknown, valid: Record<string, unknown>) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x in valid))] : [];

function resources(v: unknown): Resources {
  const o = isObj(v) ? v : {};
  return { scrap: num(o.scrap), energy: num(o.energy), alloys: num(o.alloys), data: num(o.data) };
}

/* ---------- Migraciones ---------- */

/**
 * v1 (prototipo): los fragmentos estaban en la raíz (`fragments`, `fragmentsTotal`) y el sonido
 * se guardaba como `settings.sound` (true = activado). v2 los agrupa en `prestige` y usa `muted`.
 */
const MIGRATIONS: Record<number, (raw: Obj) => Obj> = {
  1: (raw) => {
    const prestige = isObj(raw.prestige) ? { ...raw.prestige } : {};
    if (raw.fragments !== undefined && prestige.fragments === undefined) prestige.fragments = raw.fragments;
    if (raw.fragmentsTotal !== undefined && prestige.fragmentsTotal === undefined) prestige.fragmentsTotal = raw.fragmentsTotal;
    const settings = isObj(raw.settings) ? { ...raw.settings } : {};
    if (typeof settings.sound === 'boolean' && settings.muted === undefined) settings.muted = !settings.sound;
    delete settings.sound;
    const out: Obj = { ...raw, prestige, settings, version: 2 };
    delete out.fragments;
    delete out.fragmentsTotal;
    return out;
  },
};

export function migrate(raw: Obj, fromVersion: number): Obj {
  let v = fromVersion;
  let cur = raw;
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (step) cur = step(cur);
    v += 1;
  }
  return cur;
}

/* ---------- Validación ---------- */

function validateRun(v: unknown): ExpeditionRun | null {
  if (!isObj(v)) return null;
  const sectorId = typeof v.sectorId === 'string' && v.sectorId in SECTOR_BY_ID ? v.sectorId : null;
  if (!sectorId) return null;
  const encounters = Array.isArray(v.encounters) ? v.encounters.filter((e): e is string => typeof e === 'string' && e in ENCOUNTER_BY_ID) : [];
  if (!encounters.length) return null;
  const maxHull = Math.max(1, num(v.maxHull, 100));
  const status = v.status === 'event' || v.status === 'outcome' || v.status === 'finished' ? v.status : 'event';
  const ending = v.ending === 'success' || v.ending === 'retreat' || v.ending === 'destroyed' ? v.ending : null;
  const lo = isObj(v.lastOutcome) ? v.lastOutcome : null;
  return {
    sectorId,
    encounters,
    step: Math.min(num(v.step, 0, { int: true }), encounters.length - 1),
    hull: Math.min(maxHull, num(v.hull, maxHull)),
    maxHull,
    cargo: resources(v.cargo),
    modules: idList(v.modules, MODULE_BY_ID).slice(0, 10),
    fragments: num(v.fragments, 0, { int: true, max: 100 }),
    status: status === 'finished' && !ending ? 'event' : status,
    lastOutcome: lo
      ? {
          text: typeof lo.text === 'string' ? lo.text : '',
          good: bool(lo.good, true),
          details: Array.isArray(lo.details) ? lo.details.filter((d): d is string => typeof d === 'string') : [],
        }
      : null,
    ending: status === 'finished' ? ending : null,
    log: Array.isArray(v.log)
      ? v.log.filter(isObj).slice(-12).map((l) => ({ text: String(l.text ?? ''), good: bool(l.good, true) }))
      : [],
  };
}

/** Convierte cualquier objeto en un GameState válido, rellenando lo que falte. */
export function sanitizeState(raw: Obj): GameState {
  const base = createInitialState();
  const s = base;

  s.resources = resources(raw.resources);

  const machines = isObj(raw.machines) ? raw.machines : {};
  for (const id of MACHINE_IDS) {
    const m = isObj(machines[id]) ? (machines[id] as Obj) : {};
    s.machines[id as MachineId] = {
      count: num(m.count, 0, { int: true, max: 1e6 }),
      level: num(m.level, 0, { int: true, max: 20 }),
      active: bool(m.active, true),
    };
  }

  s.upgrades = idList(raw.upgrades, UPGRADE_BY_ID);
  s.research = idList(raw.research, RESEARCH_BY_ID);

  const ov = isObj(raw.overload) ? raw.overload : {};
  s.overload = { remaining: num(ov.remaining, 0, { max: 600 }), cooldown: num(ov.cooldown, 0, { max: 3600 }), uses: num(ov.uses, 0, { int: true }) };

  const ex = isObj(raw.expedition) ? raw.expedition : {};
  const sectorRuns: Record<string, number> = {};
  if (isObj(ex.sectorRuns)) for (const [k, v] of Object.entries(ex.sectorRuns)) if (k in SECTOR_BY_ID) sectorRuns[k] = num(v, 0, { int: true });
  s.expedition = {
    run: validateRun(ex.run),
    cooldown: num(ex.cooldown, 0, { max: 3600 }),
    completed: num(ex.completed, 0, { int: true }),
    sectorRuns,
  };

  const mod = isObj(raw.modules) ? raw.modules : {};
  const owned: Record<string, number> = {};
  if (isObj(mod.owned))
    for (const [k, v] of Object.entries(mod.owned)) {
      const lvl = num(v, 0, { int: true, max: BALANCE.modules.maxLevel });
      if (k in MODULE_BY_ID && lvl > 0) owned[k] = lvl;
    }
  s.modules = { owned, equipped: idList(mod.equipped, owned).slice(0, 6) };

  const pr = isObj(raw.prestige) ? raw.prestige : {};
  const core: Record<string, number> = {};
  if (isObj(pr.core))
    for (const [k, v] of Object.entries(pr.core)) {
      const def = CORE_BY_ID[k];
      const lvl = num(v, 0, { int: true, max: def?.maxLevel ?? 0 });
      if (def && lvl > 0) core[k] = lvl;
    }
  const fragments = num(pr.fragments, 0, { int: true });
  s.prestige = {
    fragments,
    // El total obtenido nunca puede ser menor que lo que queda sin gastar.
    fragmentsTotal: Math.max(num(pr.fragmentsTotal, 0, { int: true }), fragments),
    resets: num(pr.resets, 0, { int: true }),
    core,
    bestRunTime: num(pr.bestRunTime),
  };

  const st = isObj(raw.stats) ? raw.stats : {};
  s.stats = {
    runTime: num(st.runTime),
    totalTime: num(st.totalTime),
    clicks: num(st.clicks, 0, { int: true }),
    runScrap: num(st.runScrap),
    totalScrap: num(st.totalScrap),
    runAlloys: num(st.runAlloys),
    totalAlloys: num(st.totalAlloys),
    totalData: num(st.totalData),
    machinesBuilt: num(st.machinesBuilt, 0, { int: true }),
    peakScrapRate: num(st.peakScrapRate),
    history: Array.isArray(st.history)
      ? st.history
          .filter(isObj)
          .slice(-BALANCE.history.maxSamples)
          .map((h) => ({ t: num(h.t), scrap: num(h.scrap), alloys: num(h.alloys), data: num(h.data) }))
      : [],
    historyTimer: num(st.historyTimer, 0, { max: BALANCE.history.sampleEvery }),
  };
  // Coherencia: lo producido en total nunca es menor que lo del ciclo.
  s.stats.totalScrap = Math.max(s.stats.totalScrap, s.stats.runScrap);
  s.stats.totalAlloys = Math.max(s.stats.totalAlloys, s.stats.runAlloys);
  s.stats.totalTime = Math.max(s.stats.totalTime, s.stats.runTime);

  s.achievements = idList(raw.achievements, ACHIEVEMENT_BY_ID);

  const mi = isObj(raw.missions) ? raw.missions : {};
  let procedural: ProceduralMission | null = null;
  if (isObj(mi.procedural)) {
    const kinds = ['runScrap', 'machines', 'expeditions', 'data', 'alloys'];
    const p = mi.procedural;
    if (typeof p.kind === 'string' && kinds.includes(p.kind)) {
      procedural = { kind: p.kind as ProceduralMission['kind'], target: Math.max(1, num(p.target, 1)), reward: resources(p.reward) };
    }
  }
  s.missions = { index: num(mi.index, 0, { int: true, max: MISSIONS.length }), procedural, done: num(mi.done, 0, { int: true }) };

  const ab = isObj(raw.autobuy) ? raw.autobuy : {};
  s.autobuy = {};
  for (const id of MACHINE_IDS) if (ab[id] === true) s.autobuy[id as MachineId] = true;

  s.seen = Array.isArray(raw.seen) ? raw.seen.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];

  const se = isObj(raw.settings) ? raw.settings : {};
  s.settings = {
    reducedMotion: bool(se.reducedMotion, base.settings.reducedMotion),
    muted: bool(se.muted, false),
    buyAmount: se.buyAmount === 10 || se.buyAmount === 'max' ? se.buyAmount : 1,
  };
  s.modules.equipped = s.modules.equipped.slice(0, computeMods(s).slots);
  s.lastSaved = num(raw.lastSaved, Date.now());
  s.version = SAVE_VERSION;
  return s;
}

/* ---------- Serialización ---------- */

export function serialize(s: GameState, now = Date.now()): string {
  const env: SaveEnvelope = { game: GAME_ID, version: SAVE_VERSION, savedAt: now, state: { ...s, lastSaved: now } };
  return JSON.stringify(env);
}

/** Parsea y valida un texto de partida (exportado o de localStorage). Lanza SaveError si no es válido. */
export function deserialize(text: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SaveError('El texto no es JSON válido.');
  }
  if (!isObj(parsed)) throw new SaveError('El archivo no contiene una partida.');
  if (parsed.game !== GAME_ID) throw new SaveError('Esta partida no es de NEON SCRAP: LAST ORBIT.');
  const version = num(parsed.version, 0, { int: true });
  if (version < 1) throw new SaveError('Versión de partida desconocida.');
  if (version > SAVE_VERSION) throw new SaveError('La partida es de una versión más nueva del juego.');
  if (!isObj(parsed.state)) throw new SaveError('La partida está vacía o dañada.');
  const migrated = migrate(parsed.state, version);
  const state = sanitizeState(migrated);
  const savedAt = num(parsed.savedAt, state.lastSaved);
  state.lastSaved = Math.min(savedAt, Date.now());
  return state;
}

/* ---------- Progreso offline ---------- */

export interface OfflineReport {
  seconds: number;
  cappedSeconds: number;
  gained: Resources;
  steps: number;
  stepSeconds: number;
  capped: boolean;
}

/**
 * Simula el tiempo ausente con la misma lógica que el juego en vivo (energía, cadenas,
 * insumos y temporizadores), en pasos de `offlineStepSeconds`, con un máximo de 8 h.
 */
export function applyOffline(s: GameState, rt: Runtime, elapsedSeconds: number): OfflineReport {
  const seconds = Math.max(0, elapsedSeconds);
  const cappedSeconds = Math.min(seconds, BALANCE.offlineCapSeconds);
  const before = { ...s.resources };
  const step = BALANCE.offlineStepSeconds;
  advance(s, rt, cappedSeconds, step);
  const gained = {
    scrap: s.resources.scrap - before.scrap,
    energy: s.resources.energy - before.energy,
    alloys: s.resources.alloys - before.alloys,
    data: s.resources.data - before.data,
  };
  return {
    seconds,
    cappedSeconds,
    gained,
    steps: Math.ceil(cappedSeconds / step),
    stepSeconds: step,
    capped: seconds > BALANCE.offlineCapSeconds,
  };
}
