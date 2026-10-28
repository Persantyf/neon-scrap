import type { Effect } from '../effects';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ModuleDef {
  id: string;
  name: string;
  flavor: string;
  rarity: Rarity;
  /** Efectos por nivel. Los duplicados suben el nivel hasta BALANCE.modules.maxLevel. */
  effects: Effect[];
  glyph: string;
}

export const RARITY_INFO: Record<Rarity, { name: string; color: string }> = {
  common: { name: 'Común', color: '#9fb4c8' },
  rare: { name: 'Raro', color: '#3ff0d8' },
  epic: { name: 'Épico', color: '#c58bff' },
  legendary: { name: 'Legendario', color: '#ffb347' },
};

export const MODULES: ModuleDef[] = [
  {
    id: 'plasma_cell',
    name: 'Célula de plasma',
    flavor: 'Aún zumba con la energía de una estrella muerta.',
    rarity: 'common',
    effects: [{ kind: 'resourceMult', res: 'energy', value: 0.25 }],
    glyph: 'bolt',
  },
  {
    id: 'fractal_swarm',
    name: 'Enjambre fractal',
    flavor: 'Un firmware que divide cada dron en dos mitades eficientes.',
    rarity: 'common',
    effects: [{ kind: 'machineOut', machine: 'drone', value: 0.3 }],
    glyph: 'swarm',
  },
  {
    id: 'titan_arm',
    name: 'Brazo de titanio',
    flavor: 'Demasiado pesado para un humano. Perfecto para la estación.',
    rarity: 'common',
    effects: [
      { kind: 'clickMult', value: 1 },
      { kind: 'clickRate', value: 0.01 },
    ],
    glyph: 'arm',
  },
  {
    id: 'refining_matrix',
    name: 'Matriz de refinado',
    flavor: 'Cristal que ordena átomos de metal en estructuras perfectas.',
    rarity: 'rare',
    effects: [{ kind: 'resourceMult', res: 'alloys', value: 0.25 }],
    glyph: 'matrix',
  },
  {
    id: 'cognitive_core',
    name: 'Núcleo cognitivo',
    flavor: 'Una IA dormida que sueña con ecuaciones.',
    rarity: 'rare',
    effects: [{ kind: 'resourceMult', res: 'data', value: 0.25 }],
    glyph: 'brain',
  },
  {
    id: 'ceramite_hull',
    name: 'Casco de ceramita',
    flavor: 'Placas que se reparan solas con calor.',
    rarity: 'rare',
    effects: [
      { kind: 'hull', value: 20 },
      { kind: 'expReward', value: 0.05 },
    ],
    glyph: 'shield',
  },
  {
    id: 'flow_regulator',
    name: 'Regulador de flujo',
    flavor: 'Válvulas cuánticas que no desperdician ni un electrón.',
    rarity: 'rare',
    effects: [{ kind: 'energyUse', value: 0.08 }],
    glyph: 'valve',
  },
  {
    id: 'temporal_capacitor',
    name: 'Condensador temporal',
    flavor: 'Estira los segundos durante la Sobrecarga.',
    rarity: 'epic',
    effects: [
      { kind: 'overloadDuration', value: 4 },
      { kind: 'overloadMult', value: 0.25 },
    ],
    glyph: 'hourglass',
  },
  {
    id: 'cartographer_probe',
    name: 'Sonda cartógrafa',
    flavor: 'Conoce rutas que nadie ha volado.',
    rarity: 'epic',
    effects: [
      { kind: 'expReward', value: 0.2 },
      { kind: 'expCooldown', value: 0.1 },
    ],
    glyph: 'probe',
  },
  {
    id: 'nanoforge',
    name: 'Nanoforja',
    flavor: 'Imprime piezas con una fracción del material.',
    rarity: 'epic',
    effects: [{ kind: 'machineCost', value: 0.04 }],
    glyph: 'forge',
  },
  {
    id: 'core_relic',
    name: 'Reliquia del núcleo',
    flavor: 'Un fragmento de la estación original. Late como un corazón.',
    rarity: 'legendary',
    effects: [{ kind: 'global', value: 0.15 }],
    glyph: 'relic',
  },
  {
    id: 'antimatter_battery',
    name: 'Batería de antimateria',
    flavor: 'No la sueltes. En serio.',
    rarity: 'legendary',
    effects: [
      { kind: 'resourceMult', res: 'energy', value: 0.5 },
      { kind: 'energyCap', value: 1 },
    ],
    glyph: 'battery',
  },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<string, ModuleDef>;
