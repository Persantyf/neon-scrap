import { MACHINE_BY_ID } from './content/machines';
import { RESEARCH_BY_ID } from './content/research';
import { UPGRADE_BY_ID } from './content/upgrades';
import { CORE_BY_ID } from './content/core';
import type { GameState, MachineId, Requirement } from './types';

export function reqMet(s: GameState, r: Requirement | undefined): boolean {
  return missingReqs(s, r).length === 0;
}

/** Lista legible de lo que falta para cumplir un requisito. */
export function missingReqs(s: GameState, r: Requirement | undefined): string[] {
  if (!r) return [];
  const out: string[] = [];
  if (r.machines) {
    for (const [id, n] of Object.entries(r.machines)) {
      const have = s.machines[id as MachineId].count;
      if (have < (n ?? 0)) out.push(`${n} × ${MACHINE_BY_ID[id as MachineId].name} (tienes ${have})`);
    }
  }
  for (const id of r.research ?? []) {
    if (!s.research.includes(id)) out.push(`Investigar «${RESEARCH_BY_ID[id]?.name ?? id}»`);
  }
  for (const id of r.upgrades ?? []) {
    if (!s.upgrades.includes(id)) out.push(`Mejora «${UPGRADE_BY_ID[id]?.name ?? id}»`);
  }
  for (const id of r.core ?? []) {
    if (!s.prestige.core[id]) out.push(`Núcleo: «${CORE_BY_ID[id]?.name ?? id}»`);
  }
  if (r.resets && s.prestige.resets < r.resets) out.push(`Reiniciar el núcleo ${r.resets} vez`);
  if (r.totalScrap && s.stats.totalScrap < r.totalScrap) out.push(`Recuperar ${r.totalScrap} de chatarra en total`);
  return out;
}
