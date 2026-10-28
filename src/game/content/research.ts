import type { Effect } from '../effects';
import type { Cost, Requirement } from '../types';

export interface ResearchDef {
  id: string;
  name: string;
  flavor: string;
  cost: Cost;
  /** Columna del árbol (0 = raíz). Solo afecta a la presentación. */
  tier: number;
  prereq: string[];
  /** Requisitos adicionales que no son tecnologías previas. */
  requires?: Requirement;
  effects: Effect[];
}

export const RESEARCH: ResearchDef[] = [
  {
    id: 'batteries',
    name: 'Baterías de grafeno',
    flavor: 'Celdas de alta densidad para guardar el excedente.',
    cost: { data: 10 },
    tier: 0,
    prereq: [],
    effects: [{ kind: 'energyCap', value: 3 }],
  },
  {
    id: 'radar',
    name: 'Radar de largo alcance',
    flavor: 'Detecta pecios más allá de la órbita baja.',
    cost: { data: 30, alloys: 40 },
    tier: 0,
    prereq: [],
    effects: [{ kind: 'unlockSector', sector: 'rust_belt' }],
  },
  {
    id: 'stable_overload',
    name: 'Sobrecarga estable',
    flavor: 'Un bucle de refrigeración evita que el núcleo se funda.',
    cost: { data: 80 },
    tier: 1,
    prereq: ['batteries'],
    effects: [
      { kind: 'overloadDuration', value: 8 },
      { kind: 'overloadCooldown', value: 0.2 },
    ],
  },
  {
    id: 'swarm',
    name: 'Protocolo de enjambre',
    flavor: 'Los drones comparten rutas y se reparten el trabajo.',
    cost: { data: 120 },
    tier: 1,
    prereq: ['batteries'],
    effects: [{ kind: 'machineOut', machine: 'drone', value: 1 }],
  },
  {
    id: 'refining',
    name: 'Algoritmos de refinado',
    flavor: 'Mezclas óptimas calculadas en tiempo real.',
    cost: { data: 160 },
    tier: 1,
    prereq: ['batteries'],
    effects: [{ kind: 'machineOut', machine: 'foundry', value: 0.5 }],
  },
  {
    id: 'modular',
    name: 'Ranuras modulares',
    flavor: 'Adaptadores universales para módulos recuperados.',
    cost: { data: 250 },
    tier: 1,
    prereq: ['radar'],
    effects: [{ kind: 'slots', value: 1 }],
  },
  {
    id: 'shields',
    name: 'Escudos deflectores',
    flavor: 'Una burbuja magnética protege la nave de expedición.',
    cost: { data: 300 },
    tier: 1,
    prereq: ['radar'],
    effects: [
      { kind: 'hull', value: 40 },
      { kind: 'expCooldown', value: 0.3 },
    ],
  },
  {
    id: 'fusion',
    name: 'Fusión compacta',
    flavor: 'Un sol del tamaño de un contenedor.',
    cost: { data: 700, alloys: 3000 },
    tier: 2,
    prereq: ['refining'],
    effects: [{ kind: 'unlockMachine', machine: 'reactor' }],
  },
  {
    id: 'deep_map',
    name: 'Cartografía profunda',
    flavor: 'Mapas de la vieja estación fantasma del sector 7.',
    cost: { data: 900 },
    tier: 2,
    prereq: ['radar'],
    effects: [{ kind: 'unlockSector', sector: 'ghost_station' }],
  },
  {
    id: 'neural',
    name: 'Red neuronal',
    flavor: 'Los laboratorios se entrenan con sus propios resultados.',
    cost: { data: 1500 },
    tier: 2,
    prereq: ['refining'],
    effects: [{ kind: 'resourceMult', res: 'data', value: 1 }],
  },
  {
    id: 'overclock',
    name: 'Overclocking',
    flavor: 'Saltarse los límites de fábrica, con estilo.',
    cost: { data: 2500 },
    tier: 2,
    prereq: ['stable_overload'],
    effects: [{ kind: 'overloadMult', value: 1 }],
  },
  {
    id: 'trawlers',
    name: 'Arrastreros orbitales',
    flavor: 'Planos de naves recolectoras de la era dorada.',
    cost: { data: 5000, alloys: 40000 },
    tier: 3,
    prereq: ['fusion'],
    effects: [{ kind: 'unlockMachine', machine: 'harvester' }],
  },
  {
    id: 'void_jump',
    name: 'Salto al vacío',
    flavor: 'Coordenadas de una anomalía que no debería existir.',
    cost: { data: 8000 },
    tier: 3,
    prereq: ['deep_map', 'shields'],
    effects: [{ kind: 'unlockSector', sector: 'void_anomaly' }],
  },
  {
    id: 'core_access',
    name: 'Acceso al núcleo',
    flavor: 'El corazón de la estación puede reiniciarse... y renacer más fuerte.',
    cost: { data: 6000, alloys: 40000 },
    tier: 3,
    prereq: ['neural', 'fusion'],
    effects: [{ kind: 'unlockPrestige' }],
  },
  {
    id: 'nanotech',
    name: 'Nanoensamblaje',
    flavor: 'Las máquinas se construyen solas a partir de polvo metálico.',
    cost: { data: 25000 },
    tier: 4,
    prereq: ['trawlers'],
    effects: [{ kind: 'machineCost', value: 0.15 }],
  },
  {
    id: 'resonance',
    name: 'Resonancia del núcleo',
    flavor: 'Los ecos de ciclos anteriores refuerzan el presente.',
    cost: { data: 40000 },
    tier: 4,
    prereq: ['core_access'],
    requires: { resets: 1 },
    effects: [{ kind: 'fragmentGain', value: 0.25 }],
  },
  {
    id: 'titan_charts',
    name: 'Cartas del abismo',
    flavor: 'Rutas hacia un cementerio de naves colosales.',
    cost: { data: 60000 },
    tier: 4,
    prereq: ['void_jump'],
    requires: { resets: 1 },
    effects: [{ kind: 'unlockSector', sector: 'titan_graveyard' }],
  },
  {
    id: 'singularity_lab',
    name: 'Laboratorio de singularidad',
    flavor: 'Investigar el tiempo mismo.',
    cost: { data: 300000, alloys: 5e6 },
    tier: 5,
    prereq: ['nanotech', 'resonance'],
    requires: { resets: 1 },
    effects: [{ kind: 'global', value: 1 }],
  },
];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r])) as Record<string, ResearchDef>;
