import { MACHINE_IDS } from './content/machines';
import type { GameState, MachineId, MachineState, Resources, Runtime } from './types';

export const SAVE_VERSION = 2;

export const emptyResources = (): Resources => ({ scrap: 0, energy: 0, alloys: 0, data: 0 });

export function freshMachines(): Record<MachineId, MachineState> {
  return Object.fromEntries(MACHINE_IDS.map((id) => [id, { count: 0, level: 0, active: true }])) as Record<
    MachineId,
    MachineState
  >;
}

export function createInitialState(now = Date.now()): GameState {
  const reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  return {
    version: SAVE_VERSION,
    resources: emptyResources(),
    machines: freshMachines(),
    upgrades: [],
    research: [],
    overload: { remaining: 0, cooldown: 0, uses: 0 },
    expedition: { run: null, cooldown: 0, completed: 0, sectorRuns: {} },
    modules: { owned: {}, equipped: [] },
    prestige: { fragments: 0, fragmentsTotal: 0, resets: 0, core: {}, bestRunTime: 0 },
    stats: {
      runTime: 0,
      totalTime: 0,
      clicks: 0,
      runScrap: 0,
      totalScrap: 0,
      runAlloys: 0,
      totalAlloys: 0,
      totalData: 0,
      machinesBuilt: 0,
      peakScrapRate: 0,
      history: [],
      historyTimer: 0,
    },
    achievements: [],
    missions: { index: 0, procedural: null, done: 0 },
    autobuy: {},
    seen: [],
    settings: { reducedMotion, muted: false, buyAmount: 1 },
    lastSaved: now,
  };
}

export function createRuntime(): Runtime {
  return {
    rates: {
      scrap: { prod: 0, cons: 0 },
      energy: { prod: 0, cons: 0 },
      alloys: { prod: 0, cons: 0 },
      data: { prod: 0, cons: 0 },
    },
    energyRatio: 1,
    machineEfficiency: {},
    scrapGross: 0,
    events: [],
    checkTimer: 0,
    autobuyTimer: 0,
  };
}
