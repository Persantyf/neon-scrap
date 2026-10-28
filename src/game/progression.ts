import { ACHIEVEMENTS } from './content/achievements';
import { MACHINES } from './content/machines';
import { MISSIONS } from './content/missions';
import type { Cost, GameState, ProceduralMission, Runtime } from './types';
import { reqMet } from './requirements';

export interface ActiveMission {
  title: string;
  hint: string;
  cur: number;
  target: number;
  reward: Cost;
  procedural: boolean;
}

const totalMachines = (s: GameState) => Object.values(s.machines).reduce((a, m) => a + m.count, 0);

/** Redondea a una cifra "bonita" (1, 2, 5 × 10^n). */
export function niceNumber(x: number): number {
  if (x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function proceduralProgress(s: GameState, p: ProceduralMission): number {
  switch (p.kind) {
    case 'runScrap':
      return s.stats.runScrap;
    case 'machines':
      return totalMachines(s);
    case 'expeditions':
      return s.expedition.completed;
    case 'data':
      return s.stats.totalData;
    case 'alloys':
      return s.stats.runAlloys;
  }
}

const PROC_TITLE: Record<ProceduralMission['kind'], (n: string) => string> = {
  runScrap: (n) => `Recupera ${n} de chatarra en este ciclo`,
  machines: (n) => `Ten ${n} máquinas en la estación`,
  expeditions: (n) => `Completa expediciones hasta llegar a ${n}`,
  data: (n) => `Genera ${n} datos en total`,
  alloys: (n) => `Produce ${n} aleaciones en este ciclo`,
};

export function makeProcedural(s: GameState, rt: Runtime): ProceduralMission {
  const kinds: ProceduralMission['kind'][] = ['runScrap', 'machines', 'alloys', 'expeditions', 'data'];
  const kind = kinds[s.missions.done % kinds.length];
  let target: number;
  switch (kind) {
    case 'runScrap':
      target = niceNumber(Math.max(1e5, s.stats.runScrap * 4));
      break;
    case 'machines':
      target = totalMachines(s) + 20;
      break;
    case 'alloys':
      target = niceNumber(Math.max(500, s.stats.runAlloys * 4));
      break;
    case 'expeditions':
      target = s.expedition.completed + 2;
      break;
    case 'data':
      target = niceNumber(Math.max(500, s.stats.totalData * 2));
      break;
  }
  const reward: Cost = {
    scrap: Math.ceil(Math.max(1000, rt.rates.scrap.prod * 180)),
    alloys: Math.ceil(Math.max(50, rt.rates.alloys.prod * 120)),
  };
  return { kind, target, reward };
}

export function activeMission(s: GameState, fmt: (n: number) => string = String): ActiveMission | null {
  const def = MISSIONS[s.missions.index];
  if (def) {
    const [cur, target] = def.progress(s);
    return { title: def.title, hint: def.hint, cur, target, reward: def.reward, procedural: false };
  }
  const p = s.missions.procedural;
  if (!p) return null;
  return {
    title: PROC_TITLE[p.kind](fmt(p.target)),
    hint: 'Directiva automática de la estación.',
    cur: proceduralProgress(s, p),
    target: p.target,
    reward: p.reward,
    procedural: true,
  };
}

function grant(s: GameState, reward: Cost) {
  for (const [k, v] of Object.entries(reward)) {
    const key = k as keyof Cost;
    s.resources[key] += v ?? 0;
    if (key === 'scrap') {
      s.stats.runScrap += v ?? 0;
      s.stats.totalScrap += v ?? 0;
    }
  }
}

/** Comprueba misiones, logros y desbloqueos. Barato: se llama varias veces por segundo. */
export function checkProgress(s: GameState, rt: Runtime): void {
  // Misiones (puede completarse más de una seguida)
  for (let guard = 0; guard < 5; guard++) {
    const def = MISSIONS[s.missions.index];
    if (def) {
      const [cur, target] = def.progress(s);
      if (cur < target) break;
      grant(s, def.reward);
      s.missions.index += 1;
      s.missions.done += 1;
      rt.events.push({ type: 'mission', title: 'Directiva completada', text: def.title });
      continue;
    }
    if (!s.missions.procedural) s.missions.procedural = makeProcedural(s, rt);
    const p = s.missions.procedural;
    if (proceduralProgress(s, p) < p.target) break;
    grant(s, p.reward);
    s.missions.done += 1;
    rt.events.push({ type: 'mission', title: 'Directiva completada', text: PROC_TITLE[p.kind](String(p.target)) });
    s.missions.procedural = makeProcedural(s, rt);
  }

  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.includes(a.id) && a.check(s, rt)) {
      s.achievements.push(a.id);
      rt.events.push({ type: 'achievement', id: a.id, title: `Logro: ${a.name}`, text: a.desc });
    }
  }

  // Desbloqueos de máquinas: aviso único cuando aparecen por primera vez.
  for (const def of MACHINES) {
    const key = `machine:${def.id}`;
    if (!s.seen.includes(key) && reqMet(s, def.requires)) {
      s.seen.push(key);
      if (def.id !== 'drone') rt.events.push({ type: 'unlock', id: def.id, title: 'Nueva máquina disponible', text: def.name });
    }
  }
}
