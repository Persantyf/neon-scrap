import { BALANCE } from './balance';
import { CORE_BY_ID } from './content/core';
import { MACHINE_BY_ID, MACHINES } from './content/machines';
import { RESEARCH_BY_ID } from './content/research';
import { UPGRADE_BY_ID, UPGRADES } from './content/upgrades';
import { bulkCost, canAfford, levelCost, pay, purchasePlan, scaleCost } from './formulas';
import { computeMods } from './modifiers';
import { missingReqs, reqMet } from './requirements';
import { clickValue } from './simulation';
import type { BuyAmount, Cost, GameState, MachineId, Runtime } from './types';

const RES_LABEL: Record<string, string> = { scrap: 'chatarra', energy: 'energía', alloys: 'aleaciones', data: 'datos' };

function fail(rt: Runtime, title: string, text?: string): false {
  rt.events.push({ type: 'error', title, text });
  return false;
}

function missingText(s: GameState, cost: Cost): string {
  return Object.entries(cost)
    .filter(([k, v]) => s.resources[k as keyof Cost] < (v ?? 0))
    .map(([k]) => RES_LABEL[k])
    .join(', ');
}

export function recoverScrap(s: GameState, rt: Runtime): number {
  const v = clickValue(s, rt);
  s.resources.scrap += v;
  s.stats.runScrap += v;
  s.stats.totalScrap += v;
  s.stats.clicks += 1;
  return v;
}

export function machineUnlocked(s: GameState, id: MachineId): boolean {
  return reqMet(s, MACHINE_BY_ID[id].requires);
}

export function buyMachine(s: GameState, rt: Runtime, id: MachineId, amount: BuyAmount | number = 1): number {
  const def = MACHINE_BY_ID[id];
  if (!def) return 0;
  if (!machineUnlocked(s, id)) {
    fail(rt, 'Máquina bloqueada', missingReqs(s, def.requires).join(' · '));
    return 0;
  }
  const m = computeMods(s);
  const plan = purchasePlan(id, s.machines[id].count, s.resources, amount, m.machineCost);
  if (!plan.affordable) {
    fail(rt, 'Recursos insuficientes', `Falta ${missingText(s, plan.cost)}`);
    return 0;
  }
  pay(s.resources, plan.cost);
  const first = s.machines[id].count === 0;
  s.machines[id].count += plan.k;
  s.stats.machinesBuilt += plan.k;
  rt.events.push({ type: first ? 'firstBuild' : 'build', id, title: first ? `${def.name} en línea` : def.name });
  return plan.k;
}

export function toggleMachine(s: GameState, id: MachineId): void {
  if (MACHINE_BY_ID[id]?.toggleable) s.machines[id].active = !s.machines[id].active;
}

/* ---------- Niveles Mk ---------- */

export interface LevelOffer {
  machine: MachineId;
  level: number;
  threshold: number;
  cost: Cost;
}

export function nextLevelOffer(s: GameState, id: MachineId): LevelOffer | null {
  const def = MACHINE_BY_ID[id];
  const lvl = s.machines[id].level;
  if (lvl >= def.levelAt.length) return null;
  return { machine: id, level: lvl + 1, threshold: def.levelAt[lvl], cost: levelCost(def, lvl, computeMods(s).machineCost) };
}

export function buyLevel(s: GameState, rt: Runtime, id: MachineId): boolean {
  const offer = nextLevelOffer(s, id);
  if (!offer) return false;
  if (s.machines[id].count < offer.threshold) return fail(rt, 'Requisito no cumplido', `Necesitas ${offer.threshold} unidades`);
  if (!canAfford(s.resources, offer.cost)) return fail(rt, 'Recursos insuficientes', `Falta ${missingText(s, offer.cost)}`);
  pay(s.resources, offer.cost);
  s.machines[id].level += 1;
  rt.events.push({ type: 'upgrade', id, title: `${MACHINE_BY_ID[id].name} Mk ${roman(offer.level + 1)}` });
  return true;
}

export function roman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] ?? String(n);
}

/* ---------- Mejoras únicas ---------- */

export function visibleUpgrades(s: GameState) {
  return UPGRADES.filter((u) => !s.upgrades.includes(u.id) && reqMet(s, u.requires));
}

export function buyUpgrade(s: GameState, rt: Runtime, id: string): boolean {
  const def = UPGRADE_BY_ID[id];
  if (!def || s.upgrades.includes(id)) return false;
  if (!reqMet(s, def.requires)) return fail(rt, 'Mejora bloqueada');
  if (!canAfford(s.resources, def.cost)) return fail(rt, 'Recursos insuficientes', `Falta ${missingText(s, def.cost)}`);
  pay(s.resources, def.cost);
  s.upgrades.push(id);
  rt.events.push({ type: 'upgrade', id, title: def.name });
  return true;
}

/* ---------- Investigación ---------- */

export type ResearchStatus = 'done' | 'available' | 'locked';

export function researchCost(s: GameState, id: string): Cost {
  return scaleCost(RESEARCH_BY_ID[id].cost, computeMods(s).researchCost);
}

export function researchStatus(s: GameState, id: string): ResearchStatus {
  const def = RESEARCH_BY_ID[id];
  if (s.research.includes(id)) return 'done';
  if (def.prereq.every((p) => s.research.includes(p)) && reqMet(s, def.requires)) return 'available';
  return 'locked';
}

export function buyResearch(s: GameState, rt: Runtime, id: string): boolean {
  const def = RESEARCH_BY_ID[id];
  if (!def) return false;
  if (researchStatus(s, id) !== 'available') return fail(rt, 'Investigación bloqueada');
  const cost = researchCost(s, id);
  if (!canAfford(s.resources, cost)) return fail(rt, 'Recursos insuficientes', `Falta ${missingText(s, cost)}`);
  pay(s.resources, cost);
  s.research.push(id);
  rt.events.push({ type: 'research', id, title: `Investigación: ${def.name}` });
  return true;
}

/* ---------- Sobrecarga ---------- */

export function overloadUnlocked(s: GameState): boolean {
  return s.machines.drone.count >= BALANCE.overload.unlockDrones || s.overload.uses > 0 || s.prestige.resets > 0;
}

export function activateOverload(s: GameState, rt: Runtime): boolean {
  if (!overloadUnlocked(s)) return fail(rt, 'Sobrecarga no disponible', `Necesitas ${BALANCE.overload.unlockDrones} drones`);
  if (s.overload.remaining > 0 || s.overload.cooldown > 0) return false;
  const m = computeMods(s);
  s.overload.remaining = m.overloadDuration;
  s.overload.cooldown = m.overloadDuration + m.overloadCooldown;
  s.overload.uses += 1;
  rt.events.push({ type: 'overload', title: 'SOBRECARGA', text: `×${m.overloadMult} durante ${m.overloadDuration} s` });
  return true;
}

/* ---------- Módulos ---------- */

export function equipModule(s: GameState, rt: Runtime, id: string): boolean {
  if (!s.modules.owned[id] || s.modules.equipped.includes(id)) return false;
  if (s.modules.equipped.length >= computeMods(s).slots) return fail(rt, 'Sin ranuras libres', 'Retira otro módulo primero');
  s.modules.equipped.push(id);
  return true;
}

export function unequipModule(s: GameState, id: string): void {
  s.modules.equipped = s.modules.equipped.filter((m) => m !== id);
}

/* ---------- Mejoras del núcleo ---------- */

export function coreCost(s: GameState, id: string): number | null {
  const def = CORE_BY_ID[id];
  const lvl = s.prestige.core[id] ?? 0;
  if (!def || lvl >= def.maxLevel) return null;
  return def.cost(lvl);
}

export function buyCore(s: GameState, rt: Runtime, id: string): boolean {
  const cost = coreCost(s, id);
  if (cost === null) return false;
  if (s.prestige.fragments < cost) return fail(rt, 'Fragmentos insuficientes');
  s.prestige.fragments -= cost;
  s.prestige.core[id] = (s.prestige.core[id] ?? 0) + 1;
  // Aplicar inmediatamente las mejoras de inicio de ciclo, para que la compra se note ya.
  const def = CORE_BY_ID[id];
  for (const e of def.effects) {
    if (e.kind === 'startMachines') {
      for (const [mid, n] of Object.entries(e.machines)) {
        const st = s.machines[mid as MachineId];
        st.count = Math.max(st.count, (n ?? 0) * s.prestige.core[id]);
      }
    }
  }
  rt.events.push({ type: 'upgrade', id, title: `Núcleo: ${def.name}` });
  return true;
}

/* ---------- Construcción automática ---------- */

export function autobuyTick(s: GameState): void {
  if (!computeMods(s).autobuy) return;
  for (const def of MACHINES) {
    if (!s.autobuy[def.id] || !machineUnlocked(s, def.id)) continue;
    const m = computeMods(s);
    const cost = bulkCost(def, s.machines[def.id].count, 1, m.machineCost);
    if (canAfford(s.resources, cost)) {
      pay(s.resources, cost);
      s.machines[def.id].count += 1;
      s.stats.machinesBuilt += 1;
    }
  }
}

export function setBuyAmount(s: GameState, a: BuyAmount): void {
  s.settings.buyAmount = a;
}
