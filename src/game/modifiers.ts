import { BALANCE } from './balance';
import { CORE_UPGRADES } from './content/core';
import { FABRICATOR_BONUS, MACHINES, SORTER_DRONE_BONUS, SORTER_YIELD_BONUS } from './content/machines';
import { MODULE_BY_ID } from './content/modules';
import { RESEARCH_BY_ID } from './content/research';
import { UPGRADE_BY_ID } from './content/upgrades';
import type { Effect } from './effects';
import type { GameState, MachineId, ResourceId } from './types';

/** Todos los multiplicadores activos, calculados en un único sitio. */
export interface Mods {
  global: number;
  machineOut: Record<MachineId, number>;
  machineIn: Record<MachineId, number>;
  resource: Record<ResourceId, number>;
  energyUse: number;
  energyCapMult: number;
  sorterDrone: number;
  sorterYield: number;
  fabBonus: number;
  foundryHeat: number;
  clickMult: number;
  clickRate: number;
  autoClicks: number;
  overloadMult: number;
  overloadDuration: number;
  overloadCooldown: number;
  machineCost: number;
  researchCost: number;
  slots: number;
  hull: number;
  expReward: number;
  expCooldown: number;
  fragmentGain: number;
  fragmentBonus: number;
  /** Desglose para el panel de estadísticas. */
  breakdown: { achievements: number; fragments: number; core: number; modules: number; research: number };
  autobuy: boolean;
  prestigeUnlocked: boolean;
}

const reduce = (v: number, min = 0.1) => Math.max(min, v);

function blank(): Mods {
  const machineOut = {} as Record<MachineId, number>;
  const machineIn = {} as Record<MachineId, number>;
  for (const m of MACHINES) {
    machineOut[m.id] = 1;
    machineIn[m.id] = 1;
  }
  return {
    global: 1,
    machineOut,
    machineIn,
    resource: { scrap: 1, energy: 1, alloys: 1, data: 1 },
    energyUse: 1,
    energyCapMult: 1,
    sorterDrone: SORTER_DRONE_BONUS,
    sorterYield: SORTER_YIELD_BONUS,
    fabBonus: FABRICATOR_BONUS,
    foundryHeat: 0,
    clickMult: 1,
    clickRate: 0,
    autoClicks: 0,
    overloadMult: BALANCE.overload.mult,
    overloadDuration: BALANCE.overload.duration,
    overloadCooldown: BALANCE.overload.cooldown,
    machineCost: 1,
    researchCost: 1,
    slots: BALANCE.modules.baseSlots,
    hull: BALANCE.expedition.baseHull,
    expReward: 1,
    expCooldown: 1,
    fragmentGain: 1,
    fragmentBonus: BALANCE.prestige.perFragmentBonus,
    breakdown: { achievements: 1, fragments: 1, core: 1, modules: 1, research: 1 },
    autobuy: false,
    prestigeUnlocked: false,
  };
}

/** Aplica un efecto `t` veces (nivel). Devuelve el multiplicador global aportado, para el desglose. */
function apply(m: Mods, e: Effect, t: number): number {
  switch (e.kind) {
    case 'clickMult':
      m.clickMult *= 1 + e.value * t;
      break;
    case 'clickRate':
      m.clickRate += e.value * t;
      break;
    case 'autoClick':
      m.autoClicks += e.value * t;
      break;
    case 'machineOut':
      m.machineOut[e.machine] *= 1 + e.value * t;
      break;
    case 'resourceMult':
      m.resource[e.res] *= 1 + e.value * t;
      break;
    case 'global':
      m.global *= 1 + e.value * t;
      return 1 + e.value * t;
    case 'energyUse':
      m.energyUse *= reduce(1 - e.value * t, 0.2);
      break;
    case 'energyCap':
      m.energyCapMult *= 1 + e.value * t;
      break;
    case 'sorterMult':
      m.sorterDrone *= 1 + e.value * t;
      m.sorterYield *= 1 + e.value * t;
      break;
    case 'fabMult':
      m.fabBonus *= 1 + e.value * t;
      break;
    case 'foundryHeat':
      m.foundryHeat += e.value * t;
      break;
    case 'overloadDuration':
      m.overloadDuration += e.value * t;
      break;
    case 'overloadCooldown':
      m.overloadCooldown *= reduce(1 - e.value * t, 0.25);
      break;
    case 'overloadMult':
      m.overloadMult += e.value * t;
      break;
    case 'machineCost':
      m.machineCost *= reduce(1 - e.value * t, 0.3);
      break;
    case 'researchCost':
      m.researchCost *= reduce(1 - e.value * t, 0.3);
      break;
    case 'slots':
      m.slots += e.value * t;
      break;
    case 'hull':
      m.hull += e.value * t;
      break;
    case 'expReward':
      m.expReward *= 1 + e.value * t;
      break;
    case 'expCooldown':
      m.expCooldown *= reduce(1 - e.value * t, 0.2);
      break;
    case 'fragmentGain':
      m.fragmentGain *= 1 + e.value * t;
      break;
    case 'fragmentBonus':
      m.fragmentBonus += e.value * t;
      break;
    case 'unlockAutobuy':
      m.autobuy = true;
      break;
    case 'unlockPrestige':
      m.prestigeUnlocked = true;
      break;
    default:
      break;
  }
  return 1;
}

export function computeMods(s: GameState): Mods {
  const m = blank();

  for (const id of s.upgrades) for (const e of UPGRADE_BY_ID[id]?.effects ?? []) apply(m, e, 1);

  let research = 1;
  for (const id of s.research) for (const e of RESEARCH_BY_ID[id]?.effects ?? []) research *= apply(m, e, 1);

  let core = 1;
  for (const c of CORE_UPGRADES) {
    const lvl = s.prestige.core[c.id] ?? 0;
    if (lvl > 0) for (const e of c.effects) core *= apply(m, e, lvl);
  }

  let modules = 1;
  for (const id of s.modules.equipped) {
    const def = MODULE_BY_ID[id];
    const lvl = s.modules.owned[id] ?? 0;
    if (def && lvl > 0) for (const e of def.effects) modules *= apply(m, e, lvl);
  }

  // Niveles Mk de cada máquina
  for (const def of MACHINES) {
    const lvl = s.machines[def.id].level;
    if (lvl > 0) {
      const out = Math.pow(def.levelOut, lvl);
      if (def.effect === 'sorter') {
        m.sorterDrone *= out;
        m.sorterYield *= out;
      } else if (def.effect === 'fabricator') {
        m.fabBonus *= out;
      } else {
        m.machineOut[def.id] *= out;
      }
      m.machineIn[def.id] *= Math.pow(def.levelIn, lvl);
    }
  }

  const ach = 1 + s.achievements.length * BALANCE.achievementBonus;
  const frag = 1 + s.prestige.fragmentsTotal * m.fragmentBonus;
  m.global *= ach * frag;
  m.breakdown = { achievements: ach, fragments: frag, core, modules, research };
  m.slots = Math.floor(m.slots);
  return m;
}

export function energyCap(s: GameState, m: Mods): number {
  const e = BALANCE.energy;
  return (e.baseCap + s.machines.solar.count * e.capPerSolar + s.machines.reactor.count * e.capPerReactor) * m.energyCapMult;
}
