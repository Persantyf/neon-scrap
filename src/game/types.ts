// Tipos compartidos por toda la lógica de juego. La UI solo los lee.

export type ResourceId = 'scrap' | 'energy' | 'alloys' | 'data';
export const RESOURCE_IDS: ResourceId[] = ['scrap', 'energy', 'alloys', 'data'];

export type Cost = Partial<Record<ResourceId, number>>;
export type Resources = Record<ResourceId, number>;

export type MachineId =
  | 'drone'
  | 'solar'
  | 'sorter'
  | 'foundry'
  | 'lab'
  | 'fabricator'
  | 'reactor'
  | 'harvester';

/** Requisitos genéricos para desbloquear cualquier contenido. */
export interface Requirement {
  machines?: Partial<Record<MachineId, number>>;
  research?: string[];
  upgrades?: string[];
  core?: string[];
  resets?: number;
  totalScrap?: number;
}

export interface MachineState {
  count: number;
  /** Nivel de mejora (Mk). 0 = Mk I. */
  level: number;
  /** Las máquinas que consumen recursos pueden pausarse. */
  active: boolean;
}

export type ExpeditionStatus = 'event' | 'outcome' | 'finished';

export interface ExpeditionRun {
  sectorId: string;
  encounters: string[];
  step: number;
  hull: number;
  maxHull: number;
  cargo: Resources;
  modules: string[];
  fragments: number;
  status: ExpeditionStatus;
  /** Resultado de la última decisión, mostrado antes de continuar. */
  lastOutcome: { text: string; good: boolean; details: string[] } | null;
  ending: 'success' | 'retreat' | 'destroyed' | null;
  log: { text: string; good: boolean }[];
}

export interface ProceduralMission {
  kind: 'runScrap' | 'machines' | 'expeditions' | 'data' | 'alloys';
  target: number;
  reward: Cost;
}

export interface Settings {
  reducedMotion: boolean;
  muted: boolean;
  buyAmount: BuyAmount;
}

export type BuyAmount = 1 | 10 | 'max';

export interface GameState {
  version: number;
  resources: Resources;
  machines: Record<MachineId, MachineState>;
  upgrades: string[];
  research: string[];
  overload: { remaining: number; cooldown: number; uses: number };
  expedition: {
    run: ExpeditionRun | null;
    cooldown: number;
    completed: number;
    sectorRuns: Record<string, number>;
  };
  modules: { owned: Record<string, number>; equipped: string[] };
  prestige: {
    fragments: number;
    fragmentsTotal: number;
    resets: number;
    core: Record<string, number>;
    bestRunTime: number;
  };
  stats: {
    runTime: number;
    totalTime: number;
    clicks: number;
    runScrap: number;
    totalScrap: number;
    runAlloys: number;
    totalAlloys: number;
    totalData: number;
    machinesBuilt: number;
    peakScrapRate: number;
    history: { t: number; scrap: number; alloys: number; data: number }[];
    historyTimer: number;
  };
  achievements: string[];
  missions: { index: number; procedural: ProceduralMission | null; done: number };
  autobuy: Partial<Record<MachineId, boolean>>;
  seen: string[];
  settings: Settings;
  lastSaved: number;
}

/** Estado derivado que no se guarda: tasas, eventos para la UI, etc. */
export interface Runtime {
  rates: Record<ResourceId, { prod: number; cons: number }>;
  energyRatio: number;
  machineEfficiency: Partial<Record<MachineId, number>>;
  scrapGross: number;
  events: GameEvent[];
  checkTimer: number;
  autobuyTimer: number;
}

export type GameEventType =
  | 'achievement'
  | 'mission'
  | 'unlock'
  | 'milestone'
  | 'build'
  | 'firstBuild'
  | 'research'
  | 'upgrade'
  | 'overload'
  | 'expedition'
  | 'module'
  | 'prestige'
  | 'error';

export interface GameEvent {
  type: GameEventType;
  title: string;
  text?: string;
  id?: string;
}
