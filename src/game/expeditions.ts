import { BALANCE } from './balance';
import {
  ENCOUNTER_BY_ID,
  ENCOUNTERS,
  SECTOR_BY_ID,
  type OptionDef,
  type ScaledAmount,
  type SectorDef,
} from './content/expeditions';
import { MODULE_BY_ID, MODULES, type Rarity } from './content/modules';
import { canAfford, pay, shortfall } from './formulas';
import { computeMods, energyCap } from './modifiers';
import { missingReqs } from './requirements';
import { emptyResources } from './state';
import type { Cost, GameState, ResourceId, Resources, Runtime } from './types';

export type Rng = () => number;

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export function sectorMissing(s: GameState, sector: SectorDef): string[] {
  return missingReqs(s, sector.requires);
}

/** Cantidad escalada: máx(mínimo × escala del sector, producción/s × segundos). */
export function scaledAmount(s: GameState, rt: Runtime, spec: ScaledAmount, sector: SectorDef, isReward: boolean): number {
  const rate = Math.max(0, rt.rates[spec.res].prod);
  const base = Math.max(spec.min * sector.scale, rate * spec.seconds);
  const m = computeMods(s);
  const amount = Math.floor(base * (isReward ? m.expReward : 1));
  // La energía se guarda en baterías: una recompensa mayor que su capacidad se perdería.
  if (spec.res === 'energy' && isReward) return Math.min(amount, Math.floor(energyCap(s, m)));
  return amount;
}

export function launchCheck(s: GameState, sectorId: string): { ok: boolean; reason?: string } {
  const sector = SECTOR_BY_ID[sectorId];
  if (!sector) return { ok: false, reason: 'Sector desconocido' };
  const missing = sectorMissing(s, sector);
  if (missing.length) return { ok: false, reason: missing.join(' · ') };
  if (s.expedition.run) return { ok: false, reason: 'Ya hay una expedición en curso' };
  if (s.expedition.cooldown > 0) return { ok: false, reason: 'La nave se está reparando' };
  if (!canAfford(s.resources, sector.fuel)) return { ok: false, reason: 'Falta combustible' };
  return { ok: true };
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function launchExpedition(s: GameState, rt: Runtime, sectorId: string, rng: Rng = Math.random): boolean {
  const check = launchCheck(s, sectorId);
  if (!check.ok) {
    rt.events.push({ type: 'error', title: 'No se puede lanzar', text: check.reason });
    return false;
  }
  const sector = SECTOR_BY_ID[sectorId];
  pay(s.resources, sector.fuel);
  const pool = ENCOUNTERS.filter((e) => e.sectors.includes(sectorId)).map((e) => e.id);
  const encounters = [...shuffle(pool, rng).slice(0, sector.steps - 1), sector.final];
  const hull = computeMods(s).hull;
  s.expedition.run = {
    sectorId,
    encounters,
    step: 0,
    hull,
    maxHull: hull,
    cargo: emptyResources(),
    modules: [],
    fragments: 0,
    status: 'event',
    lastOutcome: null,
    ending: null,
    log: [],
  };
  rt.events.push({ type: 'expedition', title: `Rumbo a ${sector.name}` });
  return true;
}

export interface OptionPreview {
  rewards: Cost;
  price: Cost;
  priceOk: boolean;
  hull: number;
  failHull: number;
  moduleChance: number;
}

export function previewOption(s: GameState, rt: Runtime, opt: OptionDef): OptionPreview {
  const sector = SECTOR_BY_ID[s.expedition.run?.sectorId ?? 'rust_belt'];
  const rewards: Cost = {};
  for (const r of opt.success.rewards ?? []) rewards[r.res] = (rewards[r.res] ?? 0) + scaledAmount(s, rt, r, sector, true);
  const price: Cost = {};
  if (opt.price) price[opt.price.res] = scaledAmount(s, rt, opt.price, sector, false);
  return {
    rewards,
    price,
    priceOk: canAfford(s.resources, price),
    hull: opt.success.hull ?? 0,
    failHull: opt.failure?.hull ?? 0,
    moduleChance: opt.success.moduleChance ?? 0,
  };
}

export function rollRarity(weights: Record<Rarity, number>, boost: number, rng: Rng): Rarity {
  const total = RARITY_ORDER.reduce((a, r) => a + weights[r], 0);
  let best = 0;
  for (let i = 0; i <= boost; i++) {
    let x = rng() * total;
    let idx = 0;
    for (; idx < RARITY_ORDER.length - 1; idx++) {
      x -= weights[RARITY_ORDER[idx]];
      if (x < 0) break;
    }
    best = Math.max(best, idx);
  }
  return RARITY_ORDER[best];
}

export function rollModule(sector: SectorDef, boost: number, rng: Rng): string {
  let rarity = rollRarity(sector.rarity, boost, rng);
  // Si el sector no tiene módulos de esa rareza, baja hasta encontrar alguno.
  let pool = MODULES.filter((m) => m.rarity === rarity);
  while (!pool.length) {
    rarity = RARITY_ORDER[Math.max(0, RARITY_ORDER.indexOf(rarity) - 1)];
    pool = MODULES.filter((m) => m.rarity === rarity);
  }
  return pool[Math.floor(rng() * pool.length) % pool.length].id;
}

export function chooseOption(s: GameState, rt: Runtime, optionId: string, rng: Rng = Math.random): boolean {
  const run = s.expedition.run;
  if (!run || run.status !== 'event') return false;
  const enc = ENCOUNTER_BY_ID[run.encounters[run.step]];
  const opt = enc?.options.find((o) => o.id === optionId);
  if (!opt) return false;
  const sector = SECTOR_BY_ID[run.sectorId];
  const preview = previewOption(s, rt, opt);
  if (!preview.priceOk) {
    const miss = shortfall(s.resources, preview.price);
    rt.events.push({ type: 'error', title: 'Recursos insuficientes', text: Object.keys(miss).join(', ') });
    return false;
  }
  pay(s.resources, preview.price);

  const success = rng() < opt.chance;
  const outcome = success ? opt.success : (opt.failure ?? opt.success);
  const details: string[] = [];
  for (const r of outcome.rewards ?? []) {
    const amount = scaledAmount(s, rt, r, sector, true);
    run.cargo[r.res] += amount;
    details.push(`+${amount}|${r.res}`);
  }
  if (outcome.hull) {
    run.hull = Math.min(run.maxHull, run.hull + outcome.hull);
    details.push(`${outcome.hull > 0 ? '+' : ''}${outcome.hull}|hull`);
  }
  if (outcome.moduleChance && rng() < outcome.moduleChance) {
    const id = rollModule(sector, outcome.rarityBoost ?? 0, rng);
    run.modules.push(id);
    details.push(`${id}|module`);
  }
  if (outcome.fragments) {
    run.fragments += outcome.fragments;
    details.push(`+${outcome.fragments}|fragments`);
  }
  run.lastOutcome = { text: outcome.text, good: success, details };
  run.log.push({ text: `${enc.title}: ${opt.label} — ${success ? 'éxito' : 'fallo'}`, good: success });

  if (run.hull <= 0) {
    run.hull = 0;
    run.status = 'finished';
    run.ending = 'destroyed';
  } else if (outcome.end) {
    run.status = 'finished';
    run.ending = 'retreat';
  } else if (run.step >= run.encounters.length - 1) {
    run.status = 'finished';
    run.ending = 'success';
  } else {
    run.status = 'outcome';
  }
  return true;
}

export function continueExpedition(s: GameState): void {
  const run = s.expedition.run;
  if (!run || run.status !== 'outcome') return;
  run.step += 1;
  run.status = 'event';
  run.lastOutcome = null;
}

export function retreatExpedition(s: GameState): void {
  const run = s.expedition.run;
  if (!run || run.status === 'finished') return;
  run.status = 'finished';
  run.ending = 'retreat';
}

/** Entrega el botín a la estación. Devuelve lo entregado. */
export function collectExpedition(s: GameState, rt: Runtime): { resources: Resources; modules: string[]; fragments: number } | null {
  const run = s.expedition.run;
  if (!run || run.status !== 'finished') return null;
  const keep = run.ending === 'destroyed' ? BALANCE.expedition.destroyedKeep : 1;
  const delivered = emptyResources();
  for (const k of Object.keys(run.cargo) as ResourceId[]) {
    const amount = Math.floor(run.cargo[k] * keep);
    delivered[k] = amount;
    s.resources[k] += amount;
    if (k === 'scrap') {
      s.stats.runScrap += amount;
      s.stats.totalScrap += amount;
    }
  }
  const modules = run.ending === 'destroyed' ? [] : run.modules;
  for (const id of modules) grantModule(s, rt, id);
  const fragments = run.ending === 'destroyed' ? 0 : run.fragments;
  if (fragments > 0) {
    s.prestige.fragments += fragments;
    s.prestige.fragmentsTotal += fragments;
  }
  const m = computeMods(s);
  s.expedition.cooldown = BALANCE.expedition.cooldown * m.expCooldown;
  if (run.ending !== 'destroyed') s.expedition.completed += 1;
  s.expedition.sectorRuns[run.sectorId] = (s.expedition.sectorRuns[run.sectorId] ?? 0) + 1;
  s.expedition.run = null;
  rt.events.push({
    type: 'expedition',
    title: run.ending === 'destroyed' ? 'Nave remolcada a la estación' : 'Expedición completada',
    text: run.ending === 'destroyed' ? 'Se recupera la mitad del cargamento.' : undefined,
  });
  return { resources: delivered, modules, fragments };
}

/** Añade un módulo a la colección. Los duplicados suben de nivel; los sobrantes se reciclan en datos. */
export function grantModule(s: GameState, rt: Runtime, id: string): void {
  const def = MODULE_BY_ID[id];
  if (!def) return;
  const lvl = s.modules.owned[id] ?? 0;
  if (lvl >= BALANCE.modules.maxLevel) {
    const data = Math.max(25, Math.floor(rt.rates.data.prod * 120));
    s.resources.data += data;
    rt.events.push({ type: 'module', title: `${def.name} reciclado`, text: `Nivel máximo: +${data} datos` });
    return;
  }
  s.modules.owned[id] = lvl + 1;
  const slots = computeMods(s).slots;
  if (lvl === 0 && s.modules.equipped.length < slots) s.modules.equipped.push(id);
  rt.events.push({
    type: 'module',
    id,
    title: lvl === 0 ? `Módulo nuevo: ${def.name}` : `${def.name} → nivel ${lvl + 1}`,
  });
}
