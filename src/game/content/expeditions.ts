import type { Cost, Requirement, ResourceId } from '../types';
import type { Rarity } from './modules';

/** Cantidad que escala con la economía: máx(mínimo × escala del sector, producción/s × segundos). */
export interface ScaledAmount {
  res: ResourceId;
  seconds: number;
  min: number;
}

export interface OutcomeDef {
  text: string;
  rewards?: ScaledAmount[];
  hull?: number;
  moduleChance?: number;
  rarityBoost?: number;
  fragments?: number;
  /** Termina la expedición con éxito tras esta decisión. */
  end?: boolean;
}

export type Risk = 'bajo' | 'medio' | 'alto';

export interface OptionDef {
  id: string;
  label: string;
  desc: string;
  risk: Risk;
  chance: number;
  /** Precio pagado desde la estación al elegir la opción. */
  price?: ScaledAmount;
  success: OutcomeDef;
  failure?: OutcomeDef;
}

export interface EncounterDef {
  id: string;
  title: string;
  text: string;
  sectors: string[];
  options: OptionDef[];
}

export interface SectorDef {
  id: string;
  name: string;
  desc: string;
  requires: Requirement;
  fuel: Cost;
  steps: number;
  /** Multiplicador de los mínimos de recompensa. */
  scale: number;
  rarity: Record<Rarity, number>;
  final: string;
  color: string;
}

const ALL = ['rust_belt', 'ghost_station', 'void_anomaly', 'titan_graveyard'];
const DEEP = ['ghost_station', 'void_anomaly', 'titan_graveyard'];
const ABYSS = ['void_anomaly', 'titan_graveyard'];

export const SECTORS: SectorDef[] = [
  {
    id: 'rust_belt',
    name: 'Cinturón de Óxido',
    desc: 'Un anillo de cargueros desguazados. Riesgo bajo, mucha chatarra.',
    requires: { research: ['radar'] },
    fuel: { energy: 60, alloys: 15 },
    steps: 3,
    scale: 1,
    rarity: { common: 70, rare: 25, epic: 5, legendary: 0 },
    final: 'rust_heart',
    color: '#ffb347',
  },
  {
    id: 'ghost_station',
    name: 'Estación Fantasma',
    desc: 'Una estación gemela a la tuya, abandonada hace siglos. Módulos raros.',
    requires: { research: ['deep_map'] },
    fuel: { energy: 300, alloys: 150 },
    steps: 4,
    scale: 5,
    rarity: { common: 40, rare: 42, epic: 15, legendary: 3 },
    final: 'ghost_bridge',
    color: '#3ff0d8',
  },
  {
    id: 'void_anomaly',
    name: 'Anomalía del Vacío',
    desc: 'El espacio se pliega sobre sí mismo. Tecnología avanzada y peligro real.',
    requires: { research: ['void_jump'] },
    fuel: { energy: 1200, alloys: 900, data: 40 },
    steps: 5,
    scale: 25,
    rarity: { common: 20, rare: 40, epic: 30, legendary: 10 },
    final: 'void_eye',
    color: '#c58bff',
  },
  {
    id: 'titan_graveyard',
    name: 'Cementerio de Titanes',
    desc: 'Naves colosales de una guerra olvidada. Aquí aún laten fragmentos del núcleo.',
    requires: { research: ['titan_charts'] },
    fuel: { energy: 5000, alloys: 8000, data: 400 },
    steps: 5,
    scale: 150,
    rarity: { common: 5, rare: 35, epic: 38, legendary: 22 },
    final: 'titan_throne',
    color: '#ff6b5e',
  },
];

export const ENCOUNTERS: EncounterDef[] = [
  {
    id: 'debris_field',
    title: 'Campo de chatarra',
    text: 'Una nube densa de placas, tornillos y vigas gira lentamente frente a la proa.',
    sectors: ALL,
    options: [
      {
        id: 'sweep',
        label: 'Barrido seguro',
        desc: 'Recoges lo que flota en la periferia.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'La bodega se llena de chatarra limpia.', rewards: [{ res: 'scrap', seconds: 45, min: 300 }] },
      },
      {
        id: 'deep_trawl',
        label: 'Arrastre profundo',
        desc: 'Entras al centro del campo, donde están las piezas grandes.',
        risk: 'medio',
        chance: 0.7,
        success: { text: 'Remolcas medio carguero de vuelta.', rewards: [{ res: 'scrap', seconds: 130, min: 900 }] },
        failure: {
          text: 'Una viga golpea el casco, pero algo recuperas.',
          hull: -25,
          rewards: [{ res: 'scrap', seconds: 20, min: 150 }],
        },
      },
    ],
  },
  {
    id: 'derelict_module',
    title: 'Módulo abandonado',
    text: 'Un módulo de laboratorio flota a la deriva con las luces de emergencia aún encendidas.',
    sectors: ALL,
    options: [
      {
        id: 'force',
        label: 'Forzar la esclusa',
        desc: 'Lo que hay dentro podría ser valioso… o inestable.',
        risk: 'medio',
        chance: 0.65,
        success: {
          text: 'Dentro encuentras material raro intacto.',
          rewards: [{ res: 'alloys', seconds: 40, min: 20 }],
          moduleChance: 0.6,
        },
        failure: { text: 'Una descompresión explosiva sacude la nave.', hull: -20 },
      },
      {
        id: 'scan',
        label: 'Escaneo remoto',
        desc: 'Copias sus registros sin acercarte.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Los registros contienen datos útiles.', rewards: [{ res: 'data', seconds: 60, min: 8 }] },
      },
      {
        id: 'strip',
        label: 'Desguazar el exterior',
        desc: 'Arrancas sus placas de blindaje.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Placas de aleación de primera, aunque rozas el casco.', rewards: [{ res: 'alloys', seconds: 60, min: 25 }], hull: -5 },
      },
    ],
  },
  {
    id: 'ion_storm',
    title: 'Tormenta iónica',
    text: 'Un frente de partículas cargadas ilumina los sensores de violeta.',
    sectors: ALL,
    options: [
      {
        id: 'cross',
        label: 'Atravesarla',
        desc: 'En su interior hay tecnología arrastrada por la tormenta.',
        risk: 'alto',
        chance: 0.5,
        success: {
          text: 'Sales del otro lado con la bodega crepitando.',
          rewards: [{ res: 'data', seconds: 150, min: 18 }],
          moduleChance: 0.4,
          rarityBoost: 1,
        },
        failure: { text: 'Los rayos queman media nave.', hull: -40 },
      },
      {
        id: 'harvest',
        label: 'Recolectar partículas',
        desc: 'Desplegar las velas colectoras en el borde.',
        risk: 'medio',
        chance: 0.75,
        success: { text: 'Las baterías de la nave rebosan.', rewards: [{ res: 'energy', seconds: 120, min: 80 }] },
        failure: { text: 'Una vela se rasga y golpea el casco.', hull: -15 },
      },
      {
        id: 'around',
        label: 'Rodearla',
        desc: 'Gastas energía de la estación en un desvío seguro.',
        risk: 'bajo',
        chance: 1,
        price: { res: 'energy', seconds: 15, min: 30 },
        success: { text: 'Un rodeo largo pero tranquilo.' },
      },
    ],
  },
  {
    id: 'distress',
    title: 'Señal de socorro',
    text: 'Una baliza repite un mensaje en bucle: «Tripulación atrapada. Necesitamos ayuda».',
    sectors: ALL,
    options: [
      {
        id: 'answer',
        label: 'Responder',
        desc: 'Podrían recompensarte. O podría ser una trampa.',
        risk: 'medio',
        chance: 0.7,
        success: {
          text: 'Los supervivientes reparan tu nave y comparten sus datos.',
          hull: 25,
          rewards: [
            { res: 'data', seconds: 80, min: 10 },
            { res: 'alloys', seconds: 30, min: 15 },
          ],
        },
        failure: { text: 'Era una emboscada de carroñeros.', hull: -30 },
      },
      {
        id: 'ignore',
        label: 'Ignorarla',
        desc: 'Sigues tu ruta en silencio.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'La señal se apaga a tu espalda.' },
      },
    ],
  },
  {
    id: 'trader',
    title: 'Mercader errante',
    text: 'Una nave mercante cubierta de antenas te saluda por el canal abierto.',
    sectors: ALL,
    options: [
      {
        id: 'sell_alloys',
        label: 'Vender aleaciones',
        desc: 'Paga con aleaciones de la estación a cambio de datos cifrados.',
        risk: 'bajo',
        chance: 1,
        price: { res: 'alloys', seconds: 30, min: 20 },
        success: { text: 'Un buen trato. Los datos son auténticos.', rewards: [{ res: 'data', seconds: 120, min: 15 }] },
      },
      {
        id: 'repair',
        label: 'Comprar reparaciones',
        desc: 'Paga con chatarra para reforzar el casco.',
        risk: 'bajo',
        chance: 1,
        price: { res: 'scrap', seconds: 40, min: 400 },
        success: { text: 'Sus mecánicos dejan el casco como nuevo.', hull: 40 },
      },
      {
        id: 'pass',
        label: 'Despedirse',
        desc: 'No necesitas nada hoy.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'El mercader se aleja tarareando.' },
      },
    ],
  },
  {
    id: 'micrometeor',
    title: 'Lluvia de micrometeoritos',
    text: 'Miles de partículas a velocidad orbital. La alarma de proximidad no para de sonar.',
    sectors: ALL,
    options: [
      {
        id: 'shields',
        label: 'Escudos al máximo',
        desc: 'Desvías energía de la estación a los escudos.',
        risk: 'bajo',
        chance: 1,
        price: { res: 'energy', seconds: 20, min: 40 },
        success: { text: 'Solo unos arañazos.', hull: -5 },
      },
      {
        id: 'evade',
        label: 'Maniobra evasiva',
        desc: 'Confías en tus reflejos.',
        risk: 'medio',
        chance: 0.6,
        success: { text: '¡Ni un rasguño!' },
        failure: { text: 'Varios impactos atraviesan el blindaje.', hull: -30 },
      },
      {
        id: 'mine',
        label: 'Minar los fragmentos',
        desc: 'Algunos meteoritos son de metal puro.',
        risk: 'alto',
        chance: 0.45,
        success: { text: 'Metal casi puro, listo para fundir.', rewards: [{ res: 'alloys', seconds: 150, min: 60 }] },
        failure: { text: 'Te acercas demasiado.', hull: -45 },
      },
    ],
  },
  {
    id: 'data_beacon',
    title: 'Baliza de datos',
    text: 'Un satélite científico sigue transmitiendo, aunque nadie lo escucha desde hace décadas.',
    sectors: ALL,
    options: [
      {
        id: 'decrypt',
        label: 'Descifrar el núcleo',
        desc: 'Acceso completo, si el cortafuegos no te frena.',
        risk: 'medio',
        chance: 0.7,
        success: { text: 'Años de observaciones en tus manos.', rewards: [{ res: 'data', seconds: 140, min: 15 }] },
        failure: { text: 'Un virus antiguo corrompe sistemas de la nave.', hull: -15 },
      },
      {
        id: 'copy',
        label: 'Copiar en bruto',
        desc: 'Solo lo que no está cifrado.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Poco, pero seguro.', rewards: [{ res: 'data', seconds: 50, min: 6 }] },
      },
    ],
  },
  {
    id: 'drone_hive',
    title: 'Colmena de drones salvajes',
    text: 'Drones sin dueño han construido una colmena con restos de naves.',
    sectors: ALL,
    options: [
      {
        id: 'hack',
        label: 'Hackear la colmena',
        desc: 'Si funciona, trabajarán para ti un rato.',
        risk: 'medio',
        chance: 0.6,
        success: {
          text: 'Los drones descargan su botín en tu bodega.',
          rewards: [{ res: 'scrap', seconds: 160, min: 900 }],
          moduleChance: 0.25,
        },
        failure: { text: 'El enjambre se defiende.', hull: -25 },
      },
      {
        id: 'destroy',
        label: 'Abrir fuego',
        desc: 'Desmontas la colmena a cañonazos.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Chatarra de aleación, con algún rebote.', rewards: [{ res: 'alloys', seconds: 70, min: 30 }], hull: -10 },
      },
      {
        id: 'avoid',
        label: 'Pasar de largo',
        desc: 'No vale la pena el riesgo.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Los drones ni se inmutan.' },
      },
    ],
  },
  {
    id: 'ghost_echo',
    title: 'Ecos en la radio',
    text: 'Voces distorsionadas en una frecuencia que no aparece en ningún registro.',
    sectors: DEEP,
    options: [
      {
        id: 'follow',
        label: 'Seguir el eco',
        desc: 'Algo te está guiando hacia una cámara sellada.',
        risk: 'alto',
        chance: 0.4,
        success: { text: 'La cámara guarda un módulo intacto.', moduleChance: 1, rarityBoost: 1 },
        failure: { text: 'Los ecos eran sistemas de defensa.', hull: -35 },
      },
      {
        id: 'record',
        label: 'Registrar frecuencias',
        desc: 'Los analizarás desde la estación.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Patrones fascinantes.', rewards: [{ res: 'data', seconds: 80, min: 10 }] },
      },
    ],
  },
  {
    id: 'cryo_vault',
    title: 'Bóveda criogénica',
    text: 'Contenedores congelados con el sello de una corporación extinta.',
    sectors: DEEP,
    options: [
      {
        id: 'open',
        label: 'Abrir los contenedores',
        desc: 'Algo dentro sigue registrando actividad.',
        risk: 'medio',
        chance: 0.6,
        success: {
          text: 'Suministros y componentes perfectamente conservados.',
          rewards: [
            { res: 'alloys', seconds: 120, min: 50 },
            { res: 'data', seconds: 60, min: 8 },
          ],
          moduleChance: 0.3,
        },
        failure: { text: 'Algo despertó dentro.', hull: -20 },
      },
      {
        id: 'coolant',
        label: 'Robar el refrigerante',
        desc: 'Úsalo para sellar las grietas del casco.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'El casco cruje, pero aguanta mejor.', hull: 20 },
      },
    ],
  },
  {
    id: 'micro_singularity',
    title: 'Microsingularidad',
    text: 'Un punto negro del tamaño de una canica dobla la luz a su alrededor.',
    sectors: ABYSS,
    options: [
      {
        id: 'probe',
        label: 'Sondear el horizonte',
        desc: 'Lo que cae dentro no vuelve. Casi nunca.',
        risk: 'alto',
        chance: 0.35,
        success: {
          text: 'La sonda regresa con datos imposibles y un objeto brillante.',
          rewards: [{ res: 'data', seconds: 300, min: 30 }],
          moduleChance: 0.7,
          rarityBoost: 2,
        },
        failure: { text: 'La marea gravitatoria retuerce la nave.', hull: -50 },
      },
      {
        id: 'radiation',
        label: 'Cosechar radiación',
        desc: 'Su disco emite energía pura.',
        risk: 'medio',
        chance: 0.7,
        success: {
          text: 'Energía y metal fundido por la gravedad.',
          rewards: [
            { res: 'energy', seconds: 200, min: 300 },
            { res: 'alloys', seconds: 100, min: 80 },
          ],
        },
        failure: { text: 'Los escudos se sobrecalientan.', hull: -25 },
      },
      {
        id: 'retreat',
        label: 'Volver a casa',
        desc: 'Regresas ahora con todo lo que llevas.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Prudencia: el botín llega intacto.', end: true },
      },
    ],
  },
  {
    id: 'titan_wreck',
    title: 'Pecio titánico',
    text: 'El casco de una nave de guerra de doce kilómetros, partido en dos.',
    sectors: ABYSS,
    options: [
      {
        id: 'salvage',
        label: 'Desguace sistemático',
        desc: 'Un trabajo largo con mucho material.',
        risk: 'medio',
        chance: 0.65,
        success: {
          text: 'Toneladas de material de grado militar.',
          rewards: [
            { res: 'scrap', seconds: 300, min: 5000 },
            { res: 'alloys', seconds: 150, min: 150 },
          ],
        },
        failure: { text: 'Una sección se derrumba sobre la nave.', hull: -30 },
      },
      {
        id: 'reactor',
        label: 'Extraer su reactor',
        desc: 'Aún funciona. Aún podría explotar.',
        risk: 'alto',
        chance: 0.4,
        success: {
          text: 'El reactor late en la bodega.',
          rewards: [{ res: 'energy', seconds: 400, min: 800 }],
          moduleChance: 0.5,
          rarityBoost: 1,
        },
        failure: { text: 'Una sobrecarga te alcanza al salir.', hull: -45 },
      },
    ],
  },
  // Encuentros finales de cada sector
  {
    id: 'rust_heart',
    title: 'Corazón de Óxido',
    text: 'El centro del cinturón: un carguero colosal todavía cargado.',
    sectors: [],
    options: [
      {
        id: 'loot_core',
        label: 'Saquear la bodega principal',
        desc: 'Lo mejor del sector, protegido por restos inestables.',
        risk: 'medio',
        chance: 0.7,
        success: { text: '¡Un tesoro de óxido y metal!', rewards: [{ res: 'scrap', seconds: 200, min: 1500 }], moduleChance: 0.85 },
        failure: { text: 'La bodega colapsa a medias.', hull: -30, rewards: [{ res: 'scrap', seconds: 60, min: 400 }] },
      },
      {
        id: 'safe_haul',
        label: 'Llevarse lo seguro',
        desc: 'Contenedores sueltos del exterior.',
        risk: 'bajo',
        chance: 1,
        success: {
          text: 'Una carga respetable sin sobresaltos.',
          rewards: [
            { res: 'scrap', seconds: 100, min: 700 },
            { res: 'alloys', seconds: 50, min: 25 },
          ],
          moduleChance: 0.2,
        },
      },
    ],
  },
  {
    id: 'ghost_bridge',
    title: 'Puente de mando fantasma',
    text: 'Las pantallas se encienden solas al entrar. Alguien dejó un mensaje.',
    sectors: [],
    options: [
      {
        id: 'download',
        label: 'Descargar los archivos',
        desc: 'Toda la memoria de la estación gemela.',
        risk: 'medio',
        chance: 0.65,
        success: { text: 'Planos, registros y un módulo de la tripulación.', rewards: [{ res: 'data', seconds: 250, min: 40 }], moduleChance: 1 },
        failure: { text: 'Las defensas se activan.', hull: -35 },
      },
      {
        id: 'console',
        label: 'Desmontar la consola',
        desc: 'Componentes de precisión, sin tocar la memoria.',
        risk: 'bajo',
        chance: 1,
        success: { text: 'Piezas de calidad excepcional.', rewards: [{ res: 'alloys', seconds: 150, min: 100 }], moduleChance: 0.35 },
      },
    ],
  },
  {
    id: 'void_eye',
    title: 'Ojo de la Anomalía',
    text: 'Una esfera de nada absoluta. Los instrumentos muestran números que no tienen sentido.',
    sectors: [],
    options: [
      {
        id: 'gaze',
        label: 'Mirar dentro',
        desc: 'Nadie ha vuelto para contarlo. Todavía.',
        risk: 'alto',
        chance: 0.45,
        success: { text: 'Vuelves cambiado. Y con algo extraordinario.', rewards: [{ res: 'data', seconds: 500, min: 80 }], moduleChance: 1, rarityBoost: 2 },
        failure: { text: 'La anomalía te escupe hecho pedazos.', hull: -60 },
      },
      {
        id: 'edge',
        label: 'Recoger restos del borde',
        desc: 'Tecnología que la anomalía ha ido acumulando.',
        risk: 'medio',
        chance: 0.8,
        success: { text: 'Restos de civilizaciones desconocidas.', rewards: [{ res: 'alloys', seconds: 250, min: 300 }], moduleChance: 0.5 },
        failure: { text: 'El borde es más inestable de lo que parecía.', hull: -25 },
      },
    ],
  },
  {
    id: 'titan_throne',
    title: 'Trono del Titán',
    text: 'El puente de la nave insignia. En su centro late un núcleo como el de tu estación.',
    sectors: [],
    options: [
      {
        id: 'rip_core',
        label: 'Arrancar el núcleo',
        desc: 'Contiene fragmentos del núcleo cristalizados.',
        risk: 'alto',
        chance: 0.5,
        success: { text: 'Fragmentos del núcleo, puros y brillantes.', fragments: 2, moduleChance: 1, rarityBoost: 2 },
        failure: { text: 'El titán aún se defiende.', hull: -60 },
      },
      {
        id: 'harvest_hull',
        label: 'Cosechar el casco',
        desc: 'Material de un tamaño que da vértigo.',
        risk: 'medio',
        chance: 0.8,
        success: {
          text: 'La bodega no da abasto.',
          rewards: [
            { res: 'scrap', seconds: 600, min: 20000 },
            { res: 'alloys', seconds: 300, min: 800 },
          ],
          moduleChance: 0.4,
        },
        failure: { text: 'Un mamparo cede sobre tu nave.', hull: -30 },
      },
    ],
  },
];

export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<string, SectorDef>;
export const ENCOUNTER_BY_ID = Object.fromEntries(ENCOUNTERS.map((e) => [e.id, e])) as Record<string, EncounterDef>;
