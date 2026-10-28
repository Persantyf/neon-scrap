import { describe, expect, it } from 'vitest';
import {
  activateOverload,
  buyCore,
  buyLevel,
  buyMachine,
  buyResearch,
  buyUpgrade,
  equipModule,
  recoverScrap,
  toggleMachine,
} from '../src/game/actions';
import { BALANCE } from '../src/game/balance';
import { MACHINE_BY_ID, MACHINES } from '../src/game/content/machines';
import { chooseOption, collectExpedition, continueExpedition, grantModule, launchExpedition } from '../src/game/expeditions';
import { bulkCost, canAfford, fragmentsFor, maxAffordable, purchasePlan, scrapForFragments } from '../src/game/formulas';
import { computeMods } from '../src/game/modifiers';
import { canPrestige, doPrestige, prestigeGain } from '../src/game/prestige';
import { checkProgress } from '../src/game/progression';
import { advance } from '../src/game/simulation';
import { createInitialState, createRuntime } from '../src/game/state';
import type { GameState } from '../src/game/types';
import { seeded } from './bot';

const fresh = () => ({ s: createInitialState(0), rt: createRuntime() });
const rich = (s: GameState, amount = 1e12) => {
  s.resources = { scrap: amount, energy: amount, alloys: amount, data: amount };
};

describe('fórmulas de coste', () => {
  it('el coste múltiple es la suma de los costes individuales', () => {
    for (const def of MACHINES) {
      for (const [res, base] of Object.entries(def.baseCost) as ['scrap', number][]) {
        let exact = 0;
        for (let i = 0; i < 10; i++) exact += base * Math.pow(def.growth, 5 + i);
        const bulk = bulkCost(def, 5, 10)[res]!;
        expect(bulk).toBeGreaterThanOrEqual(exact);
        expect(bulk - exact).toBeLessThan(1); // solo redondeo hacia arriba
      }
    }
  });

  it('el máximo asequible nunca supera los recursos disponibles', () => {
    const rng = seeded(42);
    for (let i = 0; i < 500; i++) {
      const def = MACHINES[Math.floor(rng() * MACHINES.length)];
      const owned = Math.floor(rng() * 120);
      const have = { scrap: rng() * 1e9, energy: rng() * 1e5, alloys: rng() * 1e6, data: rng() * 1e4 };
      const k = maxAffordable(def, owned, have);
      if (k > 0) expect(canAfford(have, bulkCost(def, owned, k))).toBe(true);
      if (k < BALANCE.maxBulk) expect(canAfford(have, bulkCost(def, owned, k + 1))).toBe(false);
    }
  });

  it('el plan ×10 no se puede pagar si solo alcanza para menos', () => {
    const { s } = fresh();
    s.resources.scrap = bulkCost(MACHINE_BY_ID.drone, 0, 9).scrap!;
    const plan = purchasePlan('drone', 0, s.resources, 10, 1);
    expect(plan.affordable).toBe(false);
    expect(purchasePlan('drone', 0, s.resources, 'max', 1).k).toBe(9);
  });
});

describe('recursos y compras', () => {
  it('recuperar chatarra suma recursos y la mejora la duplica', () => {
    const { s, rt } = fresh();
    expect(recoverScrap(s, rt)).toBe(1);
    s.resources.scrap = 100;
    expect(buyUpgrade(s, rt, 'gloves')).toBe(true);
    expect(s.resources.scrap).toBe(60);
    expect(recoverScrap(s, rt)).toBe(2);
  });

  it('comprar descuenta el coste exacto y no permite gastar lo que no hay', () => {
    const { s, rt } = fresh();
    s.resources.scrap = 25;
    expect(buyMachine(s, rt, 'drone', 1)).toBe(1);
    expect(s.resources.scrap).toBe(25 - 10);
    expect(buyMachine(s, rt, 'drone', 10)).toBe(0);
    expect(s.machines.drone.count).toBe(1);
    expect(rt.events.some((e) => e.type === 'error' && e.text?.includes('chatarra'))).toBe(true);
  });

  it('comprar el máximo deja los recursos en valores no negativos', () => {
    const { s, rt } = fresh();
    s.resources.scrap = 123456;
    const k = buyMachine(s, rt, 'drone', 'max');
    expect(k).toBeGreaterThan(20);
    expect(s.resources.scrap).toBeGreaterThanOrEqual(0);
    expect(s.resources.scrap).toBeLessThan(bulkCost(MACHINE_BY_ID.drone, k, 1).scrap!);
  });

  it('las máquinas bloqueadas no se pueden comprar', () => {
    const { s, rt } = fresh();
    rich(s);
    expect(buyMachine(s, rt, 'reactor', 1)).toBe(0);
    expect(buyMachine(s, rt, 'solar', 1)).toBe(0); // requiere 3 drones
    buyMachine(s, rt, 'drone', 3);
    expect(buyMachine(s, rt, 'solar', 1)).toBe(1);
  });

  it('los niveles Mk requieren el umbral de unidades y multiplican la producción', () => {
    const { s, rt } = fresh();
    rich(s);
    buyMachine(s, rt, 'drone', 5);
    expect(buyLevel(s, rt, 'drone')).toBe(false);
    buyMachine(s, rt, 'drone', 5);
    const before = computeMods(s).machineOut.drone;
    expect(buyLevel(s, rt, 'drone')).toBe(true);
    expect(computeMods(s).machineOut.drone).toBeCloseTo(before * 2);
  });
});

describe('producción automática y cadenas', () => {
  it('los drones producen según el tiempo real simulado, no según el número de pasos', () => {
    const a = fresh();
    const b = fresh();
    for (const x of [a, b]) x.s.machines.drone.count = 10;
    advance(a.s, a.rt, 60); // un paso grande (troceado internamente)
    for (let i = 0; i < 600; i++) advance(b.s, b.rt, 0.1);
    const expected = 10 * MACHINE_BY_ID.drone.produces.scrap! * computeMods(a.s).global * 60;
    expect(a.s.resources.scrap).toBeCloseTo(expected, 3);
    expect(b.s.resources.scrap).toBeCloseTo(expected, 3);
  });

  it('las fundiciones convierten chatarra y energía en aleaciones', () => {
    const { s, rt } = fresh();
    s.machines.foundry.count = 2;
    s.machines.solar.count = 50;
    s.resources = { scrap: 1000, energy: 100, alloys: 0, data: 0 };
    advance(s, rt, 10);
    const used = 1000 - s.resources.scrap;
    expect(used).toBeCloseTo(2 * 5 * 10, 3);
    expect(s.resources.alloys).toBeCloseTo(2 * 0.4 * 10 * computeMods(s).global, 3);
  });

  it('sin chatarra las fundiciones no producen y no generan recursos negativos', () => {
    const { s, rt } = fresh();
    s.machines.foundry.count = 5;
    s.machines.solar.count = 50;
    advance(s, rt, 30);
    expect(s.resources.alloys).toBe(0);
    expect(s.resources.scrap).toBe(0);
    expect(rt.machineEfficiency.foundry).toBe(0);
  });

  it('el déficit de energía reduce la eficiencia proporcionalmente', () => {
    const { s, rt } = fresh();
    s.machines.solar.count = 1; // 1,2 energía/s
    s.machines.sorter.count = 3; // 2,4 energía/s
    advance(s, rt, 5);
    expect(rt.energyRatio).toBeCloseTo(0.5, 2);
  });

  it('los laboratorios consumen aleaciones para producir datos', () => {
    const { s, rt } = fresh();
    s.machines.lab.count = 3;
    s.machines.solar.count = 100;
    s.resources.alloys = 100;
    advance(s, rt, 10);
    expect(100 - s.resources.alloys).toBeCloseTo(3 * 0.3 * 10, 3);
    expect(s.resources.data).toBeGreaterThan(0);
  });

  it('las máquinas pausadas no consumen ni producen', () => {
    const { s, rt } = fresh();
    s.machines.foundry.count = 2;
    s.machines.solar.count = 50;
    s.resources.scrap = 1000;
    toggleMachine(s, 'foundry');
    advance(s, rt, 10);
    expect(s.resources.scrap).toBe(1000);
    expect(s.resources.alloys).toBe(0);
  });

  it('la energía nunca supera la capacidad de las baterías', () => {
    const { s, rt } = fresh();
    s.machines.solar.count = 200;
    advance(s, rt, 3600);
    const cap = (BALANCE.energy.baseCap + 200 * BALANCE.energy.capPerSolar) * computeMods(s).energyCapMult;
    expect(s.resources.energy).toBeLessThanOrEqual(cap + 1e-6);
  });
});

describe('investigación', () => {
  it('desbloquea contenido y cobra su coste', () => {
    const { s, rt } = fresh();
    s.resources.data = 10000;
    s.resources.alloys = 10000;
    expect(buyResearch(s, rt, 'fusion')).toBe(false); // requiere refinado
    expect(buyResearch(s, rt, 'batteries')).toBe(true);
    expect(buyResearch(s, rt, 'refining')).toBe(true);
    expect(buyResearch(s, rt, 'fusion')).toBe(true);
    expect(s.resources.data).toBe(10000 - 10 - 160 - 700);
    rich(s);
    expect(buyMachine(s, rt, 'reactor', 1)).toBe(1);
  });
});

describe('Sobrecarga', () => {
  it('respeta duración, multiplicador y enfriamiento', () => {
    const { s, rt } = fresh();
    s.machines.drone.count = 10;
    const m = computeMods(s);
    expect(activateOverload(s, rt)).toBe(true);
    expect(activateOverload(s, rt)).toBe(false);
    const base = 10 * 0.45 * m.global;
    advance(s, rt, m.overloadDuration + 5);
    // Durante la duración, ×3; después, normal.
    expect(s.resources.scrap).toBeCloseTo(base * (m.overloadDuration * m.overloadMult + 5), 2);
    expect(s.overload.remaining).toBe(0);
    expect(s.overload.cooldown).toBeCloseTo(m.overloadCooldown - 5, 5);
    expect(activateOverload(s, rt)).toBe(false);
    advance(s, rt, m.overloadCooldown);
    expect(activateOverload(s, rt)).toBe(true);
  });

  it('no está disponible con menos de 5 drones al principio', () => {
    const { s, rt } = fresh();
    s.machines.drone.count = 4;
    expect(activateOverload(s, rt)).toBe(false);
  });
});

describe('expediciones', () => {
  const setup = () => {
    const { s, rt } = fresh();
    s.research = ['radar'];
    s.resources = { scrap: 1e6, energy: 1000, alloys: 1000, data: 100 };
    rt.rates.scrap.prod = 100;
    return { s, rt };
  };

  it('cobran combustible, aplican la recompensa escalada y entregan el botín', () => {
    const { s, rt } = setup();
    expect(launchExpedition(s, rt, 'rust_belt', seeded(1))).toBe(true);
    expect(s.resources.energy).toBe(1000 - 60);
    expect(s.resources.alloys).toBe(1000 - 15);
    const run = s.expedition.run!;
    run.encounters = ['debris_field', 'data_beacon', 'rust_heart'];
    expect(chooseOption(s, rt, 'sweep', () => 0.99)).toBe(true); // siempre éxito
    expect(run.cargo.scrap).toBe(Math.max(300, 100 * 45));
    continueExpedition(s);
    chooseOption(s, rt, 'copy', () => 0.5);
    continueExpedition(s);
    chooseOption(s, rt, 'safe_haul', () => 0.99);
    expect(run.status).toBe('finished');
    expect(run.ending).toBe('success');
    const scrapBefore = s.resources.scrap;
    const res = collectExpedition(s, rt)!;
    expect(s.resources.scrap - scrapBefore).toBe(res.resources.scrap);
    expect(s.expedition.completed).toBe(1);
    expect(s.expedition.cooldown).toBeGreaterThan(0);
    expect(launchExpedition(s, rt, 'rust_belt')).toBe(false); // reparando
  });

  it('si la nave se destruye se recupera la mitad y se pierden los módulos', () => {
    const { s, rt } = setup();
    launchExpedition(s, rt, 'rust_belt', seeded(2));
    const run = s.expedition.run!;
    run.cargo.scrap = 1000;
    run.modules = ['plasma_cell'];
    run.hull = 10;
    run.encounters = ['ion_storm', 'debris_field', 'rust_heart'];
    chooseOption(s, rt, 'cross', () => 0.99); // fallo: −40 de casco
    expect(run.ending).toBe('destroyed');
    const before = s.resources.scrap;
    collectExpedition(s, rt);
    expect(s.resources.scrap - before).toBe(500);
    expect(s.modules.owned.plasma_cell).toBeUndefined();
    expect(s.expedition.completed).toBe(0);
  });

  it('los módulos duplicados suben de nivel y se equipan con ranuras libres', () => {
    const { s, rt } = setup();
    grantModule(s, rt, 'plasma_cell');
    grantModule(s, rt, 'plasma_cell');
    expect(s.modules.owned.plasma_cell).toBe(2);
    expect(s.modules.equipped).toEqual(['plasma_cell']);
    const before = computeMods(s).resource.energy;
    expect(before).toBeCloseTo(1 + 0.25 * 2);
    grantModule(s, rt, 'fractal_swarm');
    grantModule(s, rt, 'core_relic');
    expect(s.modules.equipped.length).toBe(2);
    expect(equipModule(s, rt, 'core_relic')).toBe(false); // sin ranuras
  });

  it('las opciones con precio no se pueden elegir sin recursos', () => {
    const { s, rt } = setup();
    launchExpedition(s, rt, 'rust_belt', seeded(3));
    s.expedition.run!.encounters = ['trader', 'debris_field', 'rust_heart'];
    s.resources.alloys = 0;
    expect(chooseOption(s, rt, 'sell_alloys')).toBe(false);
  });
});

describe('prestigio', () => {
  it('la fórmula es monótona y coherente con su inversa', () => {
    expect(fragmentsFor(1e6, 1)).toBe(0);
    expect(fragmentsFor(1e8, 1)).toBe(4);
    expect(fragmentsFor(1e9, 1)).toBe(9);
    expect(fragmentsFor(scrapForFragments(7, 1) * 1.0001, 1)).toBe(7);
    let last = 0;
    for (let e = 6; e < 30; e += 0.25) {
      const f = fragmentsFor(Math.pow(10, e), 1.3);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
  });

  it('requiere «Acceso al núcleo» y al menos un fragmento', () => {
    const { s } = fresh();
    s.stats.runScrap = 1e9;
    expect(canPrestige(s)).toBe(false);
    s.research.push('core_access');
    expect(canPrestige(s)).toBe(true);
    s.stats.runScrap = 1e5;
    expect(canPrestige(s)).toBe(false);
  });

  it('reinicia exactamente lo previsto y conserva lo permanente', () => {
    const { s, rt } = fresh();
    rich(s);
    buyMachine(s, rt, 'drone', 30);
    buyUpgrade(s, rt, 'gloves');
    s.research = ['batteries', 'radar', 'refining', 'neural', 'fusion', 'core_access'];
    s.modules = { owned: { plasma_cell: 3 }, equipped: ['plasma_cell'] };
    s.achievements = ['first_scrap', 'drones_10'];
    s.missions.index = 12;
    s.stats.runScrap = 1e9;
    s.stats.totalScrap = 2e9;
    s.overload.uses = 7;
    s.autobuy.drone = true;
    s.settings.muted = true;
    const gain = prestigeGain(s);
    expect(doPrestige(s, rt)).toBe(gain);

    expect(s.resources).toEqual({ scrap: 0, energy: 0, alloys: 0, data: 0 });
    expect(s.machines.drone.count).toBe(0);
    expect(s.upgrades).toEqual([]);
    expect(s.research).toEqual([]);
    expect(s.stats.runScrap).toBe(0);
    // Conservado
    expect(s.prestige.fragments).toBe(gain);
    expect(s.prestige.fragmentsTotal).toBe(gain);
    expect(s.prestige.resets).toBe(1);
    expect(s.modules.owned.plasma_cell).toBe(3);
    expect(s.modules.equipped).toEqual(['plasma_cell']);
    expect(s.achievements).toEqual(['first_scrap', 'drones_10']);
    expect(s.missions.index).toBe(12);
    expect(s.stats.totalScrap).toBe(2e9);
    expect(s.overload.uses).toBe(7);
    expect(s.autobuy.drone).toBe(true);
    expect(s.settings.muted).toBe(true);
    // Bonificación permanente
    expect(computeMods(s).breakdown.fragments).toBeCloseTo(1 + gain * BALANCE.prestige.perFragmentBonus);
  });

  it('las mejoras del núcleo se aplican al empezar el siguiente ciclo', () => {
    const { s, rt } = fresh();
    s.prestige.fragments = 20;
    s.prestige.fragmentsTotal = 20;
    expect(buyCore(s, rt, 'swarm_memory')).toBe(true);
    expect(buyCore(s, rt, 'reserves')).toBe(true);
    expect(buyCore(s, rt, 'coordinates')).toBe(true);
    expect(s.prestige.fragments).toBe(20 - 1 - 1 - 3);
    s.research = ['radar', 'deep_map', 'core_access', 'batteries'];
    s.stats.runScrap = 1e8;
    doPrestige(s, rt);
    expect(s.machines.drone.count).toBe(10);
    expect(s.machines.solar.count).toBe(3);
    expect(s.resources.scrap).toBe(2000);
    expect(s.research.sort()).toEqual(['deep_map', 'radar']);
  });
});

describe('misiones y logros', () => {
  it('completar una directiva entrega su recompensa y avanza', () => {
    const { s, rt } = fresh();
    for (let i = 0; i < 15; i++) recoverScrap(s, rt);
    checkProgress(s, rt);
    expect(s.missions.index).toBe(1);
    expect(s.resources.scrap).toBe(30);
    expect(s.achievements).toContain('first_scrap');
  });

  it('al acabar la cadena se generan directivas automáticas', () => {
    const { s, rt } = fresh();
    s.missions.index = 999;
    checkProgress(s, rt);
    expect(s.missions.procedural).not.toBeNull();
  });
});
