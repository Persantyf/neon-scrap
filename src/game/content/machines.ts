import type { Cost, MachineId, Requirement, ResourceId } from '../types';

export interface MachineDef {
  id: MachineId;
  name: string;
  short: string;
  desc: string;
  baseCost: Cost;
  growth: number;
  /** Producción por unidad y segundo (antes de multiplicadores). */
  produces: Partial<Record<ResourceId, number>>;
  /** Consumo por unidad y segundo. */
  consumes: Partial<Record<ResourceId, number>>;
  /** Efecto especial que no es producción directa (clasificadores, fabricación). */
  effect?: string;
  requires: Requirement;
  /** Cantidades a las que se desbloquea cada nivel Mk. */
  levelAt: number[];
  /** Multiplicador de salida por nivel y, en convertidores, de consumo. */
  levelOut: number;
  levelIn: number;
  toggleable: boolean;
  color: string;
}

export const MACHINES: MachineDef[] = [
  {
    id: 'drone',
    name: 'Dron de recuperación',
    short: 'Drones',
    desc: 'Pequeños recolectores autónomos que arrastran chatarra hasta la estación.',
    baseCost: { scrap: 10 },
    growth: 1.15,
    produces: { scrap: 0.45 },
    consumes: {},
    requires: {},
    levelAt: [10, 25, 50, 100, 150, 200, 300],
    levelOut: 2,
    levelIn: 1,
    toggleable: false,
    color: '#3ff0d8',
  },
  {
    id: 'solar',
    name: 'Panel solar',
    short: 'Paneles',
    desc: 'Láminas fotovoltaicas recuperadas. Generan energía y amplían las baterías.',
    baseCost: { scrap: 60 },
    growth: 1.15,
    produces: { energy: 1.2 },
    consumes: {},
    requires: { machines: { drone: 3 } },
    levelAt: [10, 25, 50, 100, 150, 200],
    levelOut: 2,
    levelIn: 1,
    toggleable: false,
    color: '#7cc8ff',
  },
  {
    id: 'sorter',
    name: 'Clasificador',
    short: 'Clasificadores',
    desc: 'Separa la chatarra útil. Aumenta la recolección de drones y el rendimiento de las fundiciones.',
    baseCost: { scrap: 220, energy: 15 },
    growth: 1.2,
    produces: {},
    consumes: { energy: 0.8 },
    effect: 'sorter',
    requires: { machines: { solar: 1 } },
    levelAt: [10, 25, 50, 100, 150],
    levelOut: 1.3,
    levelIn: 1,
    toggleable: true,
    color: '#b6f36b',
  },
  {
    id: 'foundry',
    name: 'Fundición',
    short: 'Fundiciones',
    desc: 'Funde chatarra en aleaciones. Consume chatarra y energía de forma continua.',
    baseCost: { scrap: 700, energy: 40 },
    growth: 1.2,
    produces: { alloys: 0.4 },
    consumes: { scrap: 5, energy: 1.5 },
    requires: { machines: { sorter: 1 } },
    levelAt: [10, 25, 50, 100, 150],
    levelOut: 1.5,
    levelIn: 1.25,
    toggleable: true,
    color: '#ffb347',
  },
  {
    id: 'lab',
    name: 'Laboratorio',
    short: 'Laboratorios',
    desc: 'Analiza aleaciones exóticas para extraer datos de investigación.',
    baseCost: { scrap: 1500, alloys: 20 },
    growth: 1.22,
    produces: { data: 0.07 },
    consumes: { alloys: 0.3, energy: 2.5 },
    requires: { machines: { foundry: 1 } },
    levelAt: [10, 25, 50, 100],
    levelOut: 1.5,
    levelIn: 1.25,
    toggleable: true,
    color: '#c58bff',
  },
  {
    id: 'fabricator',
    name: 'Módulo de fabricación',
    short: 'Fabricadores',
    desc: 'Ensambla piezas de precisión. Cada módulo aumenta la producción de toda la estación.',
    baseCost: { alloys: 400, data: 60 },
    growth: 1.3,
    produces: {},
    consumes: { energy: 5 },
    effect: 'fabricator',
    requires: { machines: { lab: 2 } },
    levelAt: [10, 25, 50],
    levelOut: 1.5,
    levelIn: 1,
    toggleable: true,
    color: '#ff6b5e',
  },
  {
    id: 'reactor',
    name: 'Reactor de fusión',
    short: 'Reactores',
    desc: 'Fusión compacta alimentada con aleaciones. Enormes cantidades de energía.',
    baseCost: { scrap: 80000, alloys: 2000 },
    growth: 1.25,
    produces: { energy: 25 },
    consumes: { alloys: 0.6 },
    requires: { research: ['fusion'] },
    levelAt: [10, 25, 50, 100],
    levelOut: 2,
    levelIn: 1.25,
    toggleable: true,
    color: '#ffd36b',
  },
  {
    id: 'harvester',
    name: 'Arrastrero orbital',
    short: 'Arrastreros',
    desc: 'Naves de arrastre que barren órbitas enteras. Necesitan energía para sus redes magnéticas.',
    baseCost: { scrap: 2e6, alloys: 20000, data: 500 },
    growth: 1.25,
    produces: { scrap: 120 },
    consumes: { energy: 4 },
    requires: { research: ['trawlers'] },
    levelAt: [10, 25, 50, 100],
    levelOut: 2,
    levelIn: 1,
    toggleable: true,
    color: '#5fffa8',
  },
];

export const MACHINE_BY_ID = Object.fromEntries(MACHINES.map((m) => [m.id, m])) as Record<MachineId, MachineDef>;
export const MACHINE_IDS = MACHINES.map((m) => m.id);

/** Efectos de los clasificadores y fabricadores por unidad (antes de mejoras). */
export const SORTER_DRONE_BONUS = 0.12;
export const SORTER_YIELD_BONUS = 0.03;
export const FABRICATOR_BONUS = 0.04;
