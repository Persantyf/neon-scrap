import { CORE_UPGRADES } from './content/core';
import { fragmentsFor, scrapForFragments } from './formulas';
import { computeMods } from './modifiers';
import { emptyResources, freshMachines } from './state';
import type { GameState, MachineId, ResourceId, Runtime } from './types';

export function prestigeUnlocked(s: GameState): boolean {
  return computeMods(s).prestigeUnlocked;
}

export function prestigeGain(s: GameState): number {
  return fragmentsFor(s.stats.runScrap, computeMods(s).fragmentGain);
}

/** Chatarra del ciclo necesaria para el siguiente fragmento (para la barra de progreso). */
export function nextFragmentAt(s: GameState): number {
  const g = computeMods(s).fragmentGain;
  return scrapForFragments(prestigeGain(s) + 1, g);
}

export function canPrestige(s: GameState): boolean {
  return prestigeUnlocked(s) && prestigeGain(s) >= 1;
}

/** Lo que se pierde y lo que se conserva, para mostrarlo antes de confirmar. */
export const PRESTIGE_RULES = {
  lost: [
    'Chatarra, energía, aleaciones y datos',
    'Todas las máquinas y sus niveles Mk',
    'Mejoras e investigaciones del ciclo',
    'Expedición en curso y estado de la Sobrecarga',
  ],
  kept: [
    'Fragmentos del núcleo y mejoras del núcleo',
    'Módulos recuperados y sus niveles (y los que tengas equipados)',
    'Logros y su bonificación de producción',
    'Directivas completadas y estadísticas totales',
    'Ajustes y construcción automática',
  ],
};

export function doPrestige(s: GameState, rt: Runtime): number {
  if (!canPrestige(s)) return 0;
  const gain = prestigeGain(s);
  const runTime = s.stats.runTime;

  s.prestige.fragments += gain;
  s.prestige.fragmentsTotal += gain;
  s.prestige.resets += 1;
  if (s.prestige.bestRunTime === 0 || runTime < s.prestige.bestRunTime) s.prestige.bestRunTime = runTime;

  // Conservación por mejoras del núcleo
  const keepResearch = new Set<string>();
  const startMachines: Partial<Record<MachineId, number>> = {};
  const startRes = emptyResources();
  for (const c of CORE_UPGRADES) {
    const lvl = s.prestige.core[c.id] ?? 0;
    if (!lvl) continue;
    for (const e of c.effects) {
      if (e.kind === 'keepResearch') e.ids.forEach((id) => s.research.includes(id) && keepResearch.add(id));
      if (e.kind === 'startMachines')
        for (const [id, n] of Object.entries(e.machines)) startMachines[id as MachineId] = (startMachines[id as MachineId] ?? 0) + (n ?? 0) * lvl;
      if (e.kind === 'startResources')
        for (const [id, n] of Object.entries(e.resources)) startRes[id as ResourceId] += (n ?? 0) * lvl;
    }
  }

  s.resources = startRes;
  s.machines = freshMachines();
  for (const [id, n] of Object.entries(startMachines)) s.machines[id as MachineId].count = n ?? 0;
  s.upgrades = [];
  s.research = s.research.filter((id) => keepResearch.has(id));
  s.overload = { remaining: 0, cooldown: 0, uses: s.overload.uses };
  s.expedition.run = null;
  s.expedition.cooldown = 0;
  s.stats.runTime = 0;
  s.stats.runScrap = 0;
  s.stats.runAlloys = 0;
  s.stats.history = [];
  s.stats.historyTimer = 0;
  // Los módulos equipados se conservan, ajustados a las ranuras disponibles.
  s.modules.equipped = s.modules.equipped.slice(0, computeMods(s).slots);
  if (s.missions.procedural) s.missions.procedural = null;

  rt.energyRatio = 1;
  rt.events.push({ type: 'prestige', title: 'NÚCLEO REINICIADO', text: `+${gain} fragmentos del núcleo` });
  return gain;
}
