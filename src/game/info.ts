// Cálculos de presentación derivados de la simulación, para que la UI no repita fórmulas.
import { MACHINE_BY_ID } from './content/machines';
import { sorterUnits } from './formulas';
import { computeMods, energyCap, type Mods } from './modifiers';
import type { GameState, MachineId, ResourceId, Runtime } from './types';

export interface MachineInfo {
  /** Producción por unidad y segundo con los multiplicadores actuales (a plena eficiencia). */
  perUnit: Partial<Record<ResourceId, number>>;
  consumePerUnit: Partial<Record<ResourceId, number>>;
  /** Eficiencia real del último paso (energía e insumos). */
  efficiency: number;
  /** Motivo si funciona por debajo del 100 %. */
  limitedBy: string | null;
  /** Texto del efecto especial (clasificadores y fabricadores). */
  effectText: string | null;
}

export function outputMultiplier(s: GameState, rt: Runtime, m: Mods): number {
  const ov = s.overload.remaining > 0 ? m.overloadMult : 1;
  const fab = 1 + (s.machines.fabricator.active ? s.machines.fabricator.count : 0) * m.fabBonus * rt.energyRatio;
  return m.global * ov * fab;
}

export function machineInfo(s: GameState, rt: Runtime, id: MachineId): MachineInfo {
  const m = computeMods(s);
  const def = MACHINE_BY_ID[id];
  const out = outputMultiplier(s, rt, m);
  const sorterN = s.machines.sorter.active ? s.machines.sorter.count : 0;
  const perUnit: MachineInfo['perUnit'] = {};
  for (const [res, base] of Object.entries(def.produces) as [ResourceId, number][]) {
    let v = base * m.machineOut[id] * m.resource[res] * out;
    if (id === 'drone' || id === 'harvester') v *= 1 + sorterUnits(sorterN) * m.sorterDrone;
    if (id === 'foundry') v *= 1 + sorterUnits(sorterN) * m.sorterYield;
    perUnit[res] = v;
  }
  if (id === 'foundry' && m.foundryHeat > 0) perUnit.energy = m.foundryHeat * m.resource.energy * out;
  const consumePerUnit: MachineInfo['consumePerUnit'] = {};
  for (const [res, base] of Object.entries(def.consumes) as [ResourceId, number][]) {
    consumePerUnit[res] = base * m.machineIn[id] * (res === 'energy' ? m.energyUse : 1);
  }

  const st = s.machines[id];
  let efficiency = st.count > 0 && st.active ? (rt.machineEfficiency[id] ?? 1) : 1;
  if (!st.active) efficiency = 0;
  let limitedBy: string | null = null;
  if (st.count > 0 && st.active && efficiency < 0.995) {
    if (rt.energyRatio < 0.995 && def.consumes.energy) limitedBy = 'energía insuficiente';
    else if (id === 'foundry') limitedBy = 'falta chatarra';
    else if (id === 'lab' || id === 'reactor') limitedBy = 'faltan aleaciones';
    else limitedBy = 'energía insuficiente';
  }

  let effectText: string | null = null;
  if (id === 'sorter') {
    const d = sorterUnits(sorterN) * m.sorterDrone * rt.energyRatio;
    const y = sorterUnits(sorterN) * m.sorterYield * rt.energyRatio;
    effectText = `Drones y arrastreros +${Math.round(d * 100)} % · Fundiciones +${Math.round(y * 100)} %`;
  }
  if (id === 'fabricator') {
    const f = (s.machines.fabricator.active ? s.machines.fabricator.count : 0) * m.fabBonus * rt.energyRatio;
    effectText = `Toda la producción +${Math.round(f * 100)} % (+${(m.fabBonus * 100).toFixed(1)} % por módulo)`;
  }
  return { perUnit, consumePerUnit, efficiency, limitedBy, effectText };
}

export function energyInfo(s: GameState, rt: Runtime) {
  const m = computeMods(s);
  return { stored: s.resources.energy, cap: energyCap(s, m), ratio: rt.energyRatio };
}
