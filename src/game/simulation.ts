import { BALANCE } from './balance';
import { MACHINE_BY_ID } from './content/machines';
import { sorterUnits } from './formulas';
import { computeMods, energyCap, type Mods } from './modifiers';
import type { GameState, MachineId, Runtime } from './types';

const ENERGY_CONSUMERS: MachineId[] = ['sorter', 'foundry', 'lab', 'fabricator', 'harvester'];

const running = (s: GameState, id: MachineId) => (s.machines[id].active ? s.machines[id].count : 0);

/** Chatarra por clic con los modificadores actuales. */
export function clickValue(s: GameState, rt: Runtime, m: Mods = computeMods(s)): number {
  const ov = s.overload.remaining > 0 ? m.overloadMult : 1;
  return (BALANCE.click.base * m.clickMult + m.clickRate * rt.scrapGross) * ov;
}

/**
 * Avanza la simulación `dt` segundos. Divide el paso si la Sobrecarga termina a mitad,
 * y en trozos de como máximo `maxStepSeconds` para que las cadenas de conversión sean estables.
 */
export function advance(s: GameState, rt: Runtime, dt: number, maxStep: number = BALANCE.maxStepSeconds): void {
  let left = Math.max(0, dt);
  while (left > 1e-9) {
    let d = Math.min(left, maxStep);
    if (s.overload.remaining > 0 && s.overload.remaining < d) d = s.overload.remaining;
    stepOnce(s, rt, d);
    left -= d;
  }
}

function stepOnce(s: GameState, rt: Runtime, dt: number): void {
  const m = computeMods(s);
  const R = s.resources;
  const ov = s.overload.remaining > 0 ? m.overloadMult : 1;
  const fab = 1 + running(s, 'fabricator') * m.fabBonus * rt.energyRatio;
  const out = m.global * ov * fab;
  const def = MACHINE_BY_ID;
  const prod = { scrap: 0, energy: 0, alloys: 0, data: 0 };
  const cons = { scrap: 0, energy: 0, alloys: 0, data: 0 };
  const eff: Runtime['machineEfficiency'] = {};

  // 1. Reactores: queman aleaciones para generar energía.
  const nR = running(s, 'reactor');
  let reactorRatio = 1;
  if (nR > 0) {
    const need = nR * (def.reactor.consumes.alloys ?? 0) * m.machineIn.reactor * dt;
    reactorRatio = need > 0 ? Math.min(1, R.alloys / need) : 1;
    R.alloys -= need * reactorRatio;
    cons.alloys += need * reactorRatio;
    eff.reactor = reactorRatio;
  }

  // 2. Energía: generación, demanda y baterías.
  const eGen =
    (s.machines.solar.count * (def.solar.produces.energy ?? 0) * m.machineOut.solar +
      nR * (def.reactor.produces.energy ?? 0) * m.machineOut.reactor * reactorRatio +
      running(s, 'foundry') * m.foundryHeat) *
    m.resource.energy *
    out *
    dt;
  let demand = 0;
  for (const id of ENERGY_CONSUMERS) {
    demand += running(s, id) * (def[id].consumes.energy ?? 0) * m.machineIn[id] * m.energyUse * dt;
  }
  const available = R.energy + eGen;
  const ratioE = demand > 0 ? Math.min(1, available / demand) : 1;
  R.energy = Math.min(energyCap(s, m), available - demand * ratioE);
  prod.energy += eGen;
  cons.energy += demand * ratioE;
  rt.energyRatio = ratioE;

  // 3. Chatarra: drones (autónomos) y arrastreros (necesitan energía), potenciados por clasificadores.
  const sorterBoost = 1 + sorterUnits(running(s, 'sorter')) * m.sorterDrone * ratioE;
  const droneScrap = s.machines.drone.count * (def.drone.produces.scrap ?? 0) * m.machineOut.drone;
  const harvScrap = running(s, 'harvester') * (def.harvester.produces.scrap ?? 0) * m.machineOut.harvester * ratioE;
  const scrapRate = (droneScrap + harvScrap) * sorterBoost * m.resource.scrap * out;
  rt.scrapGross = scrapRate;
  let scrapGain = scrapRate * dt;
  if (m.autoClicks > 0) scrapGain += m.autoClicks * clickValue(s, rt, m) * dt;
  R.scrap += scrapGain;
  prod.scrap += scrapGain;

  // 4. Fundiciones: chatarra + energía → aleaciones.
  const nF = running(s, 'foundry');
  if (nF > 0) {
    const need = nF * (def.foundry.consumes.scrap ?? 0) * m.machineIn.foundry * ratioE * dt;
    const r = need > 0 ? Math.min(1, R.scrap / need) : 0;
    R.scrap -= need * r;
    cons.scrap += need * r;
    const yieldBoost = 1 + sorterUnits(running(s, 'sorter')) * m.sorterYield * ratioE;
    const gain = nF * (def.foundry.produces.alloys ?? 0) * m.machineOut.foundry * ratioE * r * yieldBoost * m.resource.alloys * out * dt;
    R.alloys += gain;
    prod.alloys += gain;
    s.stats.runAlloys += gain;
    s.stats.totalAlloys += gain;
    eff.foundry = ratioE * r;
  }

  // 5. Laboratorios: aleaciones + energía → datos.
  const nL = running(s, 'lab');
  if (nL > 0) {
    const need = nL * (def.lab.consumes.alloys ?? 0) * m.machineIn.lab * ratioE * dt;
    const r = need > 0 ? Math.min(1, R.alloys / need) : 0;
    R.alloys -= need * r;
    cons.alloys += need * r;
    const gain = nL * (def.lab.produces.data ?? 0) * m.machineOut.lab * ratioE * r * m.resource.data * out * dt;
    R.data += gain;
    prod.data += gain;
    s.stats.totalData += gain;
    eff.lab = ratioE * r;
  }

  for (const id of ['sorter', 'fabricator', 'harvester'] as MachineId[]) if (running(s, id) > 0) eff[id] = ratioE;

  // Saneamiento: nunca negativos ni NaN.
  for (const k of ['scrap', 'energy', 'alloys', 'data'] as const) {
    if (!Number.isFinite(R[k]) || R[k] < 0) R[k] = Math.max(0, Number.isFinite(R[k]) ? R[k] : 0);
  }

  s.stats.runScrap += scrapGain;
  s.stats.totalScrap += scrapGain;
  s.stats.runTime += dt;
  s.stats.totalTime += dt;

  if (dt > 0) {
    for (const k of ['scrap', 'energy', 'alloys', 'data'] as const) {
      rt.rates[k].prod = prod[k] / dt;
      rt.rates[k].cons = cons[k] / dt;
    }
  }
  rt.machineEfficiency = eff;
  const netScrap = rt.rates.scrap.prod - rt.rates.scrap.cons;
  if (scrapRate > s.stats.peakScrapRate) s.stats.peakScrapRate = scrapRate;

  // Temporizadores
  s.overload.remaining = Math.max(0, s.overload.remaining - dt);
  s.overload.cooldown = Math.max(0, s.overload.cooldown - dt);
  s.expedition.cooldown = Math.max(0, s.expedition.cooldown - dt);

  // Historial para el panel de producción
  s.stats.historyTimer += dt;
  if (s.stats.historyTimer >= BALANCE.history.sampleEvery) {
    s.stats.historyTimer = 0;
    s.stats.history.push({
      t: Math.round(s.stats.runTime),
      scrap: Math.max(0, netScrap),
      alloys: Math.max(0, rt.rates.alloys.prod - rt.rates.alloys.cons),
      data: rt.rates.data.prod,
    });
    if (s.stats.history.length > BALANCE.history.maxSamples) s.stats.history.shift();
  }
}

/** Producción bruta estimada por segundo (para recompensas y previsiones). */
export function estimateRates(s: GameState, rt: Runtime) {
  return {
    scrap: Math.max(rt.rates.scrap.prod, 0),
    energy: Math.max(rt.rates.energy.prod, 0),
    alloys: Math.max(rt.rates.alloys.prod, 0),
    data: Math.max(rt.rates.data.prod, 0),
    cap: energyCap(s, computeMods(s)),
  };
}
