import type { Effect } from '../effects';
import type { Cost, Requirement } from '../types';

export interface UpgradeDef {
  id: string;
  name: string;
  flavor: string;
  cost: Cost;
  /** Cuándo aparece en la lista (para no saturar al jugador). */
  requires: Requirement;
  effects: Effect[];
}

/** Mejoras únicas compradas con recursos. Se pierden al reiniciar el núcleo. */
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'gloves',
    name: 'Guantes magnéticos',
    flavor: 'La chatarra se pega sola a tus manos.',
    cost: { scrap: 40 },
    requires: {},
    effects: [{ kind: 'clickMult', value: 1 }],
  },
  {
    id: 'servo',
    name: 'Servobrazo',
    flavor: 'Un brazo hidráulico rescatado de un carguero.',
    cost: { scrap: 350 },
    requires: { machines: { drone: 5 } },
    effects: [{ kind: 'clickMult', value: 1 }],
  },
  {
    id: 'swarm_ai',
    name: 'IA de enjambre',
    flavor: 'Los drones aprenden a no chocar entre sí.',
    cost: { scrap: 900 },
    requires: { machines: { drone: 8 } },
    effects: [{ kind: 'machineOut', machine: 'drone', value: 0.5 }],
  },
  {
    id: 'capacitors',
    name: 'Condensadores de pulso',
    flavor: 'Almacenan el excedente para la siguiente Sobrecarga.',
    cost: { scrap: 1200, energy: 60 },
    requires: { machines: { drone: 5, solar: 2 } },
    effects: [{ kind: 'overloadDuration', value: 5 }],
  },
  {
    id: 'plasma_claw',
    name: 'Garra de plasma',
    flavor: 'Corta los pecios más grandes de un solo pulso.',
    cost: { scrap: 2500, alloys: 15 },
    requires: { machines: { foundry: 1 } },
    effects: [{ kind: 'clickRate', value: 0.04 }],
  },
  {
    id: 'insulation',
    name: 'Cableado superconductor',
    flavor: 'Menos pérdidas en cada conexión.',
    cost: { scrap: 3000, energy: 120 },
    requires: { machines: { sorter: 3 } },
    effects: [{ kind: 'energyUse', value: 0.2 }],
  },
  {
    id: 'heat_recovery',
    name: 'Recuperación térmica',
    flavor: 'El calor de las fundiciones mueve turbinas auxiliares.',
    cost: { scrap: 5000, alloys: 60 },
    requires: { machines: { foundry: 3 } },
    effects: [{ kind: 'foundryHeat', value: 1.2 }],
  },
  {
    id: 'auto_claw',
    name: 'Brazo recolector',
    flavor: 'Recupera chatarra por ti, incluso cuando miras a otro lado.',
    cost: { scrap: 6000, alloys: 40 },
    requires: { machines: { foundry: 2 } },
    effects: [{ kind: 'autoClick', value: 2 }],
  },
  {
    id: 'precise_sorting',
    name: 'Clasificación óptica',
    flavor: 'Láseres que distinguen cien tipos de metal.',
    cost: { scrap: 9000, alloys: 80 },
    requires: { machines: { sorter: 8 } },
    effects: [{ kind: 'sorterMult', value: 1 }],
  },
  {
    id: 'data_compress',
    name: 'Compresión de datos',
    flavor: 'Los laboratorios aprovechan cada byte.',
    cost: { alloys: 200, data: 15 },
    requires: { machines: { lab: 2 } },
    effects: [{ kind: 'machineOut', machine: 'lab', value: 0.5 }],
  },
  {
    id: 'cargo_bay',
    name: 'Bodega ampliada',
    flavor: 'Más espacio para el botín de las expediciones.',
    cost: { alloys: 300, data: 20 },
    requires: { research: ['radar'] },
    effects: [{ kind: 'expReward', value: 0.3 }],
  },
  {
    id: 'orbital_magnets',
    name: 'Imanes orbitales',
    flavor: 'Atraen pecios de órbitas vecinas.',
    cost: { scrap: 40000, alloys: 500 },
    requires: { machines: { drone: 40 } },
    effects: [{ kind: 'resourceMult', res: 'scrap', value: 0.5 }],
  },
  {
    id: 'smart_grid',
    name: 'Red inteligente',
    flavor: 'Reparte la energía donde más rinde.',
    cost: { scrap: 60000, alloys: 900, data: 60 },
    requires: { machines: { solar: 30 } },
    effects: [
      { kind: 'energyCap', value: 2 },
      { kind: 'machineOut', machine: 'solar', value: 1 },
    ],
  },
  {
    id: 'fab_sync',
    name: 'Sincronía de fabricación',
    flavor: 'Las líneas de ensamblaje trabajan al unísono.',
    cost: { alloys: 2500, data: 250 },
    requires: { machines: { fabricator: 5 } },
    effects: [{ kind: 'fabMult', value: 0.5 }],
  },
  {
    id: 'crucible',
    name: 'Crisoles de iridio',
    flavor: 'Aguantan temperaturas imposibles.',
    cost: { scrap: 250000, alloys: 4000 },
    requires: { machines: { foundry: 20 } },
    effects: [{ kind: 'resourceMult', res: 'alloys', value: 1 }],
  },
  {
    id: 'quantum_lab',
    name: 'Procesado cuántico',
    flavor: 'Cada experimento se ejecuta en mil realidades.',
    cost: { alloys: 12000, data: 1500 },
    requires: { machines: { lab: 15 } },
    effects: [{ kind: 'resourceMult', res: 'data', value: 1 }],
  },
  {
    id: 'trawler_nets',
    name: 'Redes de grafeno',
    flavor: 'Los arrastreros no pierden ni un tornillo.',
    cost: { scrap: 2e6, alloys: 30000, data: 2000 },
    requires: { machines: { harvester: 5 } },
    effects: [{ kind: 'machineOut', machine: 'harvester', value: 1 }],
  },
  {
    id: 'overdrive_core',
    name: 'Núcleo de sobremarcha',
    flavor: 'La estación entera vibra durante la Sobrecarga.',
    cost: { scrap: 5e6, alloys: 50000, data: 5000 },
    requires: { research: ['overclock'] },
    effects: [{ kind: 'overloadDuration', value: 10 }],
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<string, UpgradeDef>;
