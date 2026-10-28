// Jugador simulado para probar el ritmo de la economía con la lógica real del juego.
import {
  activateOverload,
  buyLevel,
  buyMachine,
  buyResearch,
  buyUpgrade,
  machineUnlocked,
  nextLevelOffer,
  recoverScrap,
  researchCost,
  researchStatus,
  visibleUpgrades,
  buyCore,
  coreCost,
} from '../src/game/actions';
import { MACHINE_BY_ID } from '../src/game/content/machines';
import { RESEARCH } from '../src/game/content/research';
import { ENCOUNTER_BY_ID, SECTORS } from '../src/game/content/expeditions';
import { CORE_UPGRADES } from '../src/game/content/core';
import { chooseOption, collectExpedition, continueExpedition, launchCheck, launchExpedition, previewOption } from '../src/game/expeditions';
import { bulkCost, canAfford } from '../src/game/formulas';
import { computeMods } from '../src/game/modifiers';
import { canPrestige, doPrestige, prestigeGain } from '../src/game/prestige';
import { checkProgress } from '../src/game/progression';
import { advance } from '../src/game/simulation';
import { createInitialState, createRuntime } from '../src/game/state';
import type { GameState, MachineId, Runtime } from '../src/game/types';

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BotLog {
  milestones: Record<string, number>;
  state: GameState;
  rt: Runtime;
}

const cheap = (s: GameState, id: MachineId) => bulkCost(MACHINE_BY_ID[id], s.machines[id].count, 1, computeMods(s).machineCost);

function tryBuy(s: GameState, rt: Runtime, id: MachineId): boolean {
  if (!machineUnlocked(s, id)) return false;
  if (!canAfford(s.resources, cheap(s, id))) return false;
  return buyMachine(s, rt, id, 1) > 0;
}

// Energía almacenada que piden las próximas compras (los costes en energía exigen baterías).
function energyCapNeeded(s: GameState): number {
  return Math.max(cheap(s, 'sorter').energy ?? 0, machineUnlocked(s, 'foundry') ? (cheap(s, 'foundry').energy ?? 0) : 0) * 0.5;
}

function decide(s: GameState, rt: Runtime) {
  // Investigación: todo lo disponible, priorizando por coste.
  const avail = RESEARCH.filter((r) => researchStatus(s, r.id) === 'available').sort(
    (a, b) => (researchCost(s, a.id).data ?? 0) - (researchCost(s, b.id).data ?? 0),
  );
  for (const r of avail) if (canAfford(s.resources, researchCost(s, r.id))) buyResearch(s, rt, r.id);

  for (const u of visibleUpgrades(s)) if (canAfford(s.resources, u.cost)) buyUpgrade(s, rt, u.id);
  for (const id of Object.keys(s.machines) as MachineId[]) {
    const o = nextLevelOffer(s, id);
    if (o && s.machines[id].count >= o.threshold && canAfford(s.resources, o.cost)) buyLevel(s, rt, id);
  }

  const R = rt.rates;
  // Ahorro: si hay una mejora/nivel/investigación alcanzable en < 2 min de ingresos, no gastar en máquinas caras.
  const income = Math.max(1, R.scrap.prod - R.scrap.cons);
  const goals: number[] = [];
  for (const u of visibleUpgrades(s)) goals.push(u.cost.scrap ?? 0);
  for (const id of Object.keys(s.machines) as MachineId[]) {
    const o = nextLevelOffer(s, id);
    if (o && s.machines[id].count >= o.threshold) goals.push(o.cost.scrap ?? 0);
  }
  const target = goals.filter((g) => g > s.resources.scrap && g < income * 120).sort((a, b) => a - b)[0];
  const allow = (id: MachineId) => !target || (cheap(s, id).scrap ?? 0) < target * 0.05;
  const tryBuyS = (id: MachineId) => allow(id) && tryBuy(s, rt, id);
  for (let i = 0; i < 40; i++) {
    let bought = false;
    // Energía primero si hay déficit o margen bajo
    const eMargin = R.energy.prod - R.energy.cons;
    const energyNeeded = rt.energyRatio < 0.999 || eMargin < R.energy.cons * 0.15 || s.machines.solar.count < Math.min(6, s.machines.drone.count / 3);
    if (energyNeeded || s.resources.energy < energyCapNeeded(s)) {
      if (machineUnlocked(s, 'reactor') && s.machines.foundry.count > 3) bought = tryBuyS('reactor') || bought;
      bought = tryBuyS('solar') || bought;
    }
    bought = tryBuyS('harvester') || bought;
    bought = tryBuyS('fabricator') || bought;
    // Laboratorios si sobran aleaciones
    if (R.alloys.prod > 0 && R.alloys.cons < R.alloys.prod * 0.55) bought = tryBuyS('lab') || bought;
    // Fundiciones si la chatarra lo permite
    if (R.scrap.cons < R.scrap.prod * 0.5) bought = tryBuyS('foundry') || bought;
    if (s.machines.sorter.count < s.machines.drone.count / 3) bought = tryBuyS('sorter') || bought;
    bought = tryBuyS('drone') || bought;
    if (!bought) break;
  }
}

function playExpedition(s: GameState, rt: Runtime, rng: () => number) {
  const run = s.expedition.run;
  if (!run) {
    const sectors = SECTORS.filter((x) => launchCheck(s, x.id).ok).reverse();
    // Solo si el combustible es barato respecto a las reservas
    for (const sec of sectors) {
      const ok = Object.entries(sec.fuel).every(([k, v]) => s.resources[k as 'scrap'] > (v ?? 0) * 2.5);
      if (ok) {
        launchExpedition(s, rt, sec.id, rng);
        break;
      }
    }
    return;
  }
  if (run.status === 'event') {
    const enc = ENCOUNTER_BY_ID[run.encounters[run.step]];
    const opts = enc.options
      .map((o) => ({ o, p: previewOption(s, rt, o) }))
      .filter((x) => x.p.priceOk && !x.o.success.end)
      .filter((x) => run.hull + x.p.failHull > 0 || x.o.chance === 1);
    const pick = opts.sort((a, b) => b.o.chance * (1 + b.p.moduleChance) - a.o.chance * (1 + a.p.moduleChance))[0] ?? opts[0];
    const best = enc.options.find((o) => o.risk === 'medio' && run.hull > 50) ?? pick?.o ?? enc.options[0];
    chooseOption(s, rt, best.id, rng);
  } else if (run.status === 'outcome') continueExpedition(s);
  else collectExpedition(s, rt);
}

export function runBot(opts: { seconds: number; clicksPerSecond?: number; seed?: number; prestigeAt?: number; state?: GameState; trace?: number }): BotLog {
  const s = opts.state ?? createInitialState(0);
  const rt = createRuntime();
  const rng = seeded(opts.seed ?? 1);
  const cps = opts.clicksPerSecond ?? 4;
  const ms: Record<string, number> = {};
  const mark = (k: string, cond: boolean) => {
    if (cond && ms[k] === undefined) ms[k] = Math.round(s.stats.runTime);
  };
  const dt = 0.5;
  let clickAcc = 0;
  for (let t = 0; t < opts.seconds; t += dt) {
    clickAcc += cps * dt;
    while (clickAcc >= 1) {
      recoverScrap(s, rt);
      clickAcc -= 1;
    }
    advance(s, rt, dt);
    checkProgress(s, rt);
    activateOverload(s, rt);
    decide(s, rt);
    playExpedition(s, rt, rng);
    rt.events.length = 0;
    if (opts.trace && Math.round(s.stats.runTime * 2) % (opts.trace * 2) === 0) {
      const c = (id: MachineId) => s.machines[id].count + (s.machines[id].level ? `L${s.machines[id].level}` : '');
      console.log(
        `t=${Math.round(s.stats.runTime)} sc/s=${rt.rates.scrap.prod.toFixed(0)}-${rt.rates.scrap.cons.toFixed(0)} al/s=${rt.rates.alloys.prod.toFixed(1)}-${rt.rates.alloys.cons.toFixed(1)} da/s=${rt.rates.data.prod.toFixed(2)} E=${rt.energyRatio.toFixed(2)} ` +
          `ov=${s.overload.remaining > 0 ? 1 : 0} mDr=${computeMods(s).machineOut.drone.toFixed(1)} mSc=${computeMods(s).resource.scrap.toFixed(1)} sort=${(1 + Math.pow(s.machines.sorter.count, 0.8) * computeMods(s).sorterDrone).toFixed(1)} fab=${(1 + s.machines.fabricator.count * computeMods(s).fabBonus).toFixed(2)} mFo=${computeMods(s).machineOut.foundry.toFixed(1)} mLab=${computeMods(s).machineOut.lab.toFixed(1)} mDa=${computeMods(s).resource.data.toFixed(1)} ` +
          `dr=${c('drone')} so=${c('solar')} cl=${c('sorter')} fu=${c('foundry')} lab=${c('lab')} fab=${c('fabricator')} re=${c('reactor')} ha=${c('harvester')} | res=${s.research.length} up=${s.upgrades.length} mod=${Object.keys(s.modules.owned).length} glob=${computeMods(s).global.toFixed(2)} runScrap=${s.stats.runScrap.toExponential(2)}`,
      );
    }

    mark('drone1', s.machines.drone.count >= 1);
    mark('gloves', s.upgrades.includes('gloves'));
    mark('solar1', s.machines.solar.count >= 1);
    mark('foundry1', s.machines.foundry.count >= 1);
    mark('lab1', s.machines.lab.count >= 1);
    mark('radar', s.research.includes('radar'));
    mark('exp1', s.expedition.completed >= 1);
    mark('fab1', s.machines.fabricator.count >= 1);
    mark('fusion', s.research.includes('fusion'));
    mark('deep_map', s.research.includes('deep_map'));
    mark('core_access', s.research.includes('core_access'));
    mark('prestige_ready', canPrestige(s));
    mark('harvester1', s.machines.harvester.count >= 1);
    mark('void_jump', s.research.includes('void_jump'));
    if (opts.prestigeAt !== undefined && canPrestige(s) && prestigeGain(s) >= opts.prestigeAt) {
      ms.prestige_gain = prestigeGain(s);
      ms.prestige_time = Math.round(s.stats.runTime);
      ms.missions = s.missions.index;
      break;
    }
  }
  return { milestones: ms, state: s, rt };
}

/** Gasta fragmentos de forma razonable y reinicia. */
export function botPrestige(log: BotLog): GameState {
  const { state: s, rt } = log;
  doPrestige(s, rt);
  for (let i = 0; i < 30; i++) {
    let any = false;
    for (const c of CORE_UPGRADES) {
      const cost = coreCost(s, c.id);
      if (cost !== null && cost <= s.prestige.fragments) any = buyCore(s, rt, c.id) || any;
    }
    if (!any) break;
  }
  return s;
}
