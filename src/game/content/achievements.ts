import { MODULE_BY_ID } from './modules';
import type { GameState, Runtime } from '../types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** Los secretos no muestran su condición hasta conseguirse. */
  secret?: boolean;
  check: (s: GameState, rt: Runtime) => boolean;
}

const totalMachines = (s: GameState) => Object.values(s.machines).reduce((a, m) => a + m.count, 0);
const ownsRarity = (s: GameState, r: string) => Object.keys(s.modules.owned).some((id) => MODULE_BY_ID[id]?.rarity === r);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_scrap', name: 'Primer tornillo', desc: 'Recupera chatarra manualmente.', check: (s) => s.stats.clicks >= 1 },
  { id: 'clicks_500', name: 'Manos de hierro', desc: 'Recupera chatarra 500 veces a mano.', check: (s) => s.stats.clicks >= 500 },
  { id: 'clicks_3000', name: 'Tendinitis orbital', desc: 'Recupera chatarra 3.000 veces a mano.', check: (s) => s.stats.clicks >= 3000 },
  { id: 'drones_10', name: 'Enjambre', desc: 'Ten 10 drones.', check: (s) => s.machines.drone.count >= 10 },
  { id: 'drones_50', name: 'Nube de drones', desc: 'Ten 50 drones.', check: (s) => s.machines.drone.count >= 50 },
  { id: 'drones_150', name: 'Tormenta mecánica', desc: 'Ten 150 drones.', check: (s) => s.machines.drone.count >= 150 },
  { id: 'solar_25', name: 'Girasol', desc: 'Ten 25 paneles solares.', check: (s) => s.machines.solar.count >= 25 },
  { id: 'first_foundry', name: 'Primera colada', desc: 'Construye una fundición.', check: (s) => s.machines.foundry.count >= 1 },
  { id: 'foundry_25', name: 'Altos hornos', desc: 'Ten 25 fundiciones.', check: (s) => s.machines.foundry.count >= 25 },
  { id: 'first_lab', name: 'Método científico', desc: 'Construye un laboratorio.', check: (s) => s.machines.lab.count >= 1 },
  { id: 'fab_10', name: 'Línea de montaje', desc: 'Ten 10 módulos de fabricación.', check: (s) => s.machines.fabricator.count >= 10 },
  { id: 'reactor_1', name: 'Sol en una caja', desc: 'Construye un reactor de fusión.', check: (s) => s.machines.reactor.count >= 1 },
  { id: 'harvester_1', name: 'Pesca de altura', desc: 'Construye un arrastrero orbital.', check: (s) => s.machines.harvester.count >= 1 },
  { id: 'machines_250', name: 'Megafábrica', desc: 'Ten 250 máquinas a la vez.', check: (s) => totalMachines(s) >= 250 },
  { id: 'scrap_1e4', name: 'Chatarrero', desc: 'Recupera 10.000 de chatarra en total.', check: (s) => s.stats.totalScrap >= 1e4 },
  { id: 'scrap_1e6', name: 'Magnate del óxido', desc: 'Recupera 1 M de chatarra en total.', check: (s) => s.stats.totalScrap >= 1e6 },
  { id: 'scrap_1e9', name: 'Cinturón vacío', desc: 'Recupera 1 B de chatarra en total.', check: (s) => s.stats.totalScrap >= 1e9 },
  { id: 'scrap_1e12', name: 'Devorador de órbitas', desc: 'Recupera 1 T de chatarra en total.', check: (s) => s.stats.totalScrap >= 1e12 },
  { id: 'alloys_1e3', name: 'Metalurgia', desc: 'Produce 1.000 aleaciones en total.', check: (s) => s.stats.totalAlloys >= 1e3 },
  { id: 'alloys_1e6', name: 'Edad del acero', desc: 'Produce 1 M de aleaciones en total.', check: (s) => s.stats.totalAlloys >= 1e6 },
  { id: 'data_1e3', name: 'Archivo vivo', desc: 'Genera 1.000 datos en total.', check: (s) => s.stats.totalData >= 1e3 },
  { id: 'data_1e5', name: 'Singularidad de datos', desc: 'Genera 100.000 datos en total.', check: (s) => s.stats.totalData >= 1e5 },
  { id: 'overload_10', name: 'Al rojo vivo', desc: 'Activa la Sobrecarga 10 veces.', check: (s) => s.overload.uses >= 10 },
  { id: 'overload_100', name: 'Adicto al voltaje', desc: 'Activa la Sobrecarga 100 veces.', check: (s) => s.overload.uses >= 100 },
  { id: 'exp_1', name: 'Más allá de la órbita', desc: 'Completa una expedición.', check: (s) => s.expedition.completed >= 1 },
  { id: 'exp_10', name: 'Explorador veterano', desc: 'Completa 10 expediciones.', check: (s) => s.expedition.completed >= 10 },
  { id: 'exp_40', name: 'Cartógrafo del vacío', desc: 'Completa 40 expediciones.', check: (s) => s.expedition.completed >= 40 },
  {
    id: 'wreck',
    name: 'Remolcado',
    desc: 'Pierde el casco en una expedición.',
    secret: true,
    check: (s) => Object.values(s.expedition.sectorRuns).reduce((a, b) => a + b, 0) > s.expedition.completed,
  },
  { id: 'module_epic', name: 'Hallazgo épico', desc: 'Consigue un módulo épico.', check: (s) => ownsRarity(s, 'epic') },
  { id: 'module_legend', name: 'Leyenda recuperada', desc: 'Consigue un módulo legendario.', check: (s) => ownsRarity(s, 'legendary') },
  { id: 'module_6', name: 'Coleccionista', desc: 'Ten 6 tipos de módulo distintos.', check: (s) => Object.keys(s.modules.owned).length >= 6 },
  {
    id: 'module_max',
    name: 'Perfección modular',
    desc: 'Sube un módulo a nivel 5.',
    check: (s) => Object.values(s.modules.owned).some((l) => l >= 5),
  },
  { id: 'prestige_1', name: 'Renacimiento', desc: 'Reinicia el núcleo por primera vez.', check: (s) => s.prestige.resets >= 1 },
  { id: 'prestige_5', name: 'Ciclo eterno', desc: 'Reinicia el núcleo 5 veces.', check: (s) => s.prestige.resets >= 5 },
  { id: 'fragments_100', name: 'Corazón cristalino', desc: 'Obtén 100 fragmentos del núcleo en total.', check: (s) => s.prestige.fragmentsTotal >= 100 },
  {
    id: 'blackout',
    name: 'Apagón',
    desc: 'Deja tus máquinas por debajo del 50 % de energía.',
    secret: true,
    check: (s, rt) => rt.energyRatio < 0.5 && s.machines.foundry.count > 0,
  },
  {
    id: 'fast_cycle',
    name: 'Ciclo relámpago',
    desc: 'Reinicia el núcleo con un ciclo de menos de 12 minutos.',
    secret: true,
    check: (s) => s.prestige.bestRunTime > 0 && s.prestige.bestRunTime < 720,
  },
  { id: 'research_12', name: 'Mente brillante', desc: 'Completa 12 investigaciones en un ciclo.', check: (s) => s.research.length >= 12 },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>;
