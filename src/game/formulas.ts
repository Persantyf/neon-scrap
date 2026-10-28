import { BALANCE } from './balance';
import { MACHINE_BY_ID, type MachineDef } from './content/machines';
import type { BuyAmount, Cost, MachineId, ResourceId, Resources } from './types';

/**
 * Coste de comprar `k` unidades teniendo ya `owned`:
 * Σ_{i=owned}^{owned+k−1} base·g^i = base·g^owned·(g^k − 1)/(g − 1)
 */
export function bulkCost(def: MachineDef, owned: number, k: number, costMult = 1): Cost {
  const g = def.growth;
  const out: Cost = {};
  if (k <= 0) return out;
  const factor = (Math.pow(g, owned) * (Math.pow(g, k) - 1)) / (g - 1);
  for (const [res, base] of Object.entries(def.baseCost) as [ResourceId, number][]) {
    out[res] = Math.ceil(base * costMult * factor);
  }
  return out;
}

export function canAfford(have: Resources, cost: Cost): boolean {
  for (const [res, amount] of Object.entries(cost) as [ResourceId, number][]) {
    if (!(have[res] >= amount)) return false;
  }
  return true;
}

/** Recursos que faltan para pagar un coste (vacío si alcanza). */
export function shortfall(have: Resources, cost: Cost): Cost {
  const out: Cost = {};
  for (const [res, amount] of Object.entries(cost) as [ResourceId, number][]) {
    if (have[res] < amount) out[res] = amount - have[res];
  }
  return out;
}

export function pay(have: Resources, cost: Cost): void {
  for (const [res, amount] of Object.entries(cost) as [ResourceId, number][]) {
    have[res] = Math.max(0, have[res] - amount);
  }
}

export function scaleCost(cost: Cost, mult: number): Cost {
  const out: Cost = {};
  for (const [res, amount] of Object.entries(cost) as [ResourceId, number][]) out[res] = Math.ceil(amount * mult);
  return out;
}

/** Máximo de unidades que se pueden comprar con los recursos actuales. */
export function maxAffordable(def: MachineDef, owned: number, have: Resources, costMult = 1): number {
  const g = def.growth;
  let k = Infinity;
  for (const [res, base] of Object.entries(def.baseCost) as [ResourceId, number][]) {
    const first = base * costMult * Math.pow(g, owned);
    const funds = Math.max(0, have[res]);
    const kr = Math.floor(Math.log(1 + (funds * (g - 1)) / first) / Math.log(g));
    k = Math.min(k, kr);
  }
  if (!Number.isFinite(k) || k < 0) k = 0;
  k = Math.min(k, BALANCE.maxBulk);
  // Corrige errores de redondeo (el coste se redondea hacia arriba).
  while (k > 0 && !canAfford(have, bulkCost(def, owned, k, costMult))) k--;
  while (k < BALANCE.maxBulk && canAfford(have, bulkCost(def, owned, k + 1, costMult))) k++;
  return k;
}

/** Cantidad y coste que se mostrarán/comprarán para el modo de compra elegido. */
export function purchasePlan(
  id: MachineId,
  owned: number,
  have: Resources,
  amount: BuyAmount | number,
  costMult: number,
): { k: number; cost: Cost; affordable: boolean } {
  const def = MACHINE_BY_ID[id];
  if (amount === 'max') {
    const k = maxAffordable(def, owned, have, costMult);
    if (k === 0) return { k: 1, cost: bulkCost(def, owned, 1, costMult), affordable: false };
    return { k, cost: bulkCost(def, owned, k, costMult), affordable: true };
  }
  const cost = bulkCost(def, owned, amount, costMult);
  return { k: amount, cost, affordable: canAfford(have, cost) };
}

/** Coste de un nivel Mk: el precio de la máquina en su umbral × 40. */
export function levelCost(def: MachineDef, level: number, costMult = 1): Cost {
  const threshold = def.levelAt[level];
  const unit = bulkCost(def, threshold, 1, costMult);
  return scaleCost(unit, 40);
}

/**
 * Fórmula del prestigio, expuesta para la UI:
 * fragmentos = ⌊ (log₁₀(chatarra del ciclo) − umbral)^exponente × multiplicador ⌋.
 * Logarítmica a propósito: la producción crece de forma exponencial, así que cada
 * orden de magnitud extra aporta algo más que el anterior sin disparar la economía.
 */
export function fragmentsFor(runScrap: number, gainMult: number): number {
  const p = BALANCE.prestige;
  if (!(runScrap > 0)) return 0;
  const orders = Math.log10(runScrap) - p.log10Threshold;
  if (orders <= 0) return 0;
  return Math.floor(Math.pow(orders, p.exponent) * gainMult);
}

/** Chatarra del ciclo necesaria para alcanzar `n` fragmentos. */
export function scrapForFragments(n: number, gainMult: number): number {
  const p = BALANCE.prestige;
  return Math.pow(10, p.log10Threshold + Math.pow(n / gainMult, 1 / p.exponent));
}

/** Efecto de los clasificadores: crece de forma sublineal para que no eclipse al resto. */
export function sorterUnits(n: number): number {
  return n > 0 ? Math.pow(n, 0.8) : 0;
}
