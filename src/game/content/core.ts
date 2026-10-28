import type { Effect } from '../effects';

/** Mejoras permanentes compradas con Fragmentos del Núcleo. Nunca se pierden. */
export interface CoreUpgradeDef {
  id: string;
  name: string;
  flavor: string;
  maxLevel: number;
  /** Coste en fragmentos del nivel `level` (0 = primera compra). */
  cost: (level: number) => number;
  effects: Effect[];
  requires?: string[];
}

export const CORE_UPGRADES: CoreUpgradeDef[] = [
  {
    id: 'swarm_memory',
    name: 'Memoria de enjambre',
    flavor: 'Los drones recuerdan el camino de vuelta.',
    maxLevel: 3,
    cost: (l) => [1, 4, 10][l],
    effects: [{ kind: 'startMachines', machines: { drone: 10, solar: 3 } }],
  },
  {
    id: 'reserves',
    name: 'Reservas de arranque',
    flavor: 'Un alijo oculto bajo el núcleo.',
    maxLevel: 3,
    cost: (l) => [1, 3, 8][l],
    effects: [{ kind: 'startResources', resources: { scrap: 2000, alloys: 50 } }],
  },
  {
    id: 'amplifier',
    name: 'Amplificador del núcleo',
    flavor: 'El núcleo reiniciado vibra con más fuerza.',
    maxLevel: 10,
    cost: (l) => Math.round(2 * Math.pow(1.8, l)),
    effects: [{ kind: 'global', value: 0.25 }],
  },
  {
    id: 'echo',
    name: 'Eco de sobrecarga',
    flavor: 'La sobrecarga deja una resonancia que acelera la siguiente.',
    maxLevel: 3,
    cost: (l) => [2, 5, 12][l],
    effects: [
      { kind: 'overloadCooldown', value: 0.15 },
      { kind: 'overloadDuration', value: 3 },
    ],
  },
  {
    id: 'archive',
    name: 'Archivo de investigación',
    flavor: 'Los datos de ciclos anteriores aceleran cada descubrimiento.',
    maxLevel: 3,
    cost: (l) => [2, 6, 15][l],
    effects: [{ kind: 'researchCost', value: 0.2 }],
  },
  {
    id: 'coordinates',
    name: 'Coordenadas persistentes',
    flavor: 'Las rutas de los sectores quedan grabadas en el núcleo.',
    maxLevel: 1,
    cost: () => 3,
    effects: [{ kind: 'keepResearch', ids: ['radar', 'deep_map', 'void_jump', 'titan_charts'] }],
  },
  {
    id: 'autobuilders',
    name: 'Autómatas de construcción',
    flavor: 'La estación se amplía sola mientras tú decides qué explorar.',
    maxLevel: 1,
    cost: () => 4,
    effects: [{ kind: 'unlockAutobuy' }],
  },
  {
    id: 'core_slot',
    name: 'Ranura del núcleo',
    flavor: 'Un zócalo de módulo tallado en el propio núcleo.',
    maxLevel: 1,
    cost: () => 6,
    effects: [{ kind: 'slots', value: 1 }],
  },
  {
    id: 'residual_armor',
    name: 'Blindaje residual',
    flavor: 'Placas cristalizadas con energía del núcleo.',
    maxLevel: 3,
    cost: (l) => [2, 5, 10][l],
    effects: [
      { kind: 'hull', value: 25 },
      { kind: 'expReward', value: 0.15 },
    ],
  },
  {
    id: 'crystal_lattice',
    name: 'Retícula cristalina',
    flavor: 'Cada fragmento acumulado irradia más energía.',
    maxLevel: 5,
    cost: (l) => Math.round(8 * Math.pow(2, l)),
    effects: [{ kind: 'fragmentBonus', value: 0.01 }],
  },
  {
    id: 'deep_core',
    name: 'Núcleo profundo',
    flavor: 'Más fragmentos en cada renacimiento.',
    maxLevel: 5,
    cost: (l) => Math.round(5 * Math.pow(2.2, l)),
    effects: [{ kind: 'fragmentGain', value: 0.2 }],
  },
];

export const CORE_BY_ID = Object.fromEntries(CORE_UPGRADES.map((c) => [c.id, c])) as Record<string, CoreUpgradeDef>;
