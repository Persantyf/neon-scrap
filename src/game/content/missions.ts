import { MODULE_BY_ID } from './modules';
import type { Cost, GameState, MachineId } from '../types';

export interface MissionDef {
  id: string;
  title: string;
  hint: string;
  progress: (s: GameState) => [number, number];
  reward: Cost;
}

const m = (id: MachineId, n: number) => (s: GameState): [number, number] => [s.machines[id].count, n];
const bool = (f: (s: GameState) => boolean) => (s: GameState): [number, number] => [f(s) ? 1 : 0, 1];

/** Cadena de directivas: hace de tutorial y luego marca objetivos a corto plazo. */
export const MISSIONS: MissionDef[] = [
  { id: 'm_scrap', title: 'Recupera 15 de chatarra', hint: 'Pulsa la estación o el botón RECUPERAR.', progress: (s) => [s.stats.totalScrap, 15], reward: { scrap: 15 } },
  { id: 'm_drone1', title: 'Construye tu primer dron', hint: 'Los drones recogen chatarra por ti.', progress: m('drone', 1), reward: { scrap: 20 } },
  { id: 'm_gloves', title: 'Compra «Guantes magnéticos»', hint: 'Pestaña Mejoras del taller.', progress: bool((s) => s.upgrades.includes('gloves')), reward: { scrap: 40 } },
  { id: 'm_drone5', title: 'Ten 5 drones', hint: 'Con 5 drones se desbloquea la Sobrecarga.', progress: m('drone', 5), reward: { scrap: 60 } },
  { id: 'm_overload', title: 'Activa la SOBRECARGA', hint: 'Triplica la producción durante unos segundos.', progress: (s) => [s.overload.uses, 1], reward: { scrap: 120 } },
  { id: 'm_solar', title: 'Construye un panel solar', hint: 'La energía alimenta las máquinas avanzadas.', progress: m('solar', 1), reward: { scrap: 150 } },
  { id: 'm_sorter', title: 'Construye un clasificador', hint: 'Mejora la recolección de todos los drones.', progress: m('sorter', 1), reward: { scrap: 250 } },
  { id: 'm_drone15', title: 'Ten 15 drones', hint: 'Más drones, más chatarra para fundir.', progress: m('drone', 15), reward: { scrap: 400 } },
  { id: 'm_foundry', title: 'Construye una fundición', hint: 'Primera cadena: chatarra → aleaciones.', progress: m('foundry', 1), reward: { scrap: 500, energy: 50 } },
  { id: 'm_alloys50', title: 'Produce 50 aleaciones', hint: 'Mantén las fundiciones con chatarra y energía.', progress: (s) => [s.stats.runAlloys, 50], reward: { scrap: 800 } },
  { id: 'm_lab', title: 'Construye un laboratorio', hint: 'Los datos permiten investigar.', progress: m('lab', 1), reward: { alloys: 30 } },
  { id: 'm_batteries', title: 'Investiga «Baterías de grafeno»', hint: 'Pestaña Investigación.', progress: bool((s) => s.research.includes('batteries')), reward: { scrap: 1500 } },
  { id: 'm_radar', title: 'Investiga «Radar de largo alcance»', hint: 'Desbloquea las expediciones.', progress: bool((s) => s.research.includes('radar')), reward: { alloys: 40 } },
  { id: 'm_exp1', title: 'Completa una expedición', hint: 'Pestaña Expediciones: elige bien cada ruta.', progress: (s) => [s.expedition.completed, 1], reward: { data: 15 } },
  { id: 'm_drone_mk2', title: 'Mejora los drones a Mk II', hint: 'Disponible con 10 drones, en Mejoras.', progress: (s) => [s.machines.drone.level, 1], reward: { scrap: 3000 } },
  { id: 'm_fab', title: 'Construye un módulo de fabricación', hint: 'Aumenta la producción de toda la estación.', progress: m('fabricator', 1), reward: { alloys: 120 } },
  { id: 'm_drones50', title: 'Ten 50 drones', hint: 'El enjambre crece.', progress: m('drone', 50), reward: { scrap: 20000 } },
  { id: 'm_alloys1k', title: 'Produce 1.000 aleaciones en este ciclo', hint: 'Más fundiciones, más clasificadores.', progress: (s) => [s.stats.runAlloys, 1000], reward: { data: 60 } },
  { id: 'm_fusion', title: 'Investiga «Fusión compacta»', hint: 'Los reactores resuelven la energía.', progress: bool((s) => s.research.includes('fusion')), reward: { alloys: 400 } },
  { id: 'm_reactor', title: 'Construye un reactor de fusión', hint: 'Consume aleaciones, genera mucha energía.', progress: m('reactor', 1), reward: { scrap: 50000 } },
  { id: 'm_exp3', title: 'Completa 3 expediciones', hint: 'Cada sector tiene encuentros distintos.', progress: (s) => [s.expedition.completed, 3], reward: { data: 120 } },
  { id: 'm_core', title: 'Investiga «Acceso al núcleo»', hint: 'Abre el camino al prestigio.', progress: bool((s) => s.research.includes('core_access')), reward: { alloys: 1500 } },
  { id: 'm_reset', title: 'REINICIA EL NÚCLEO', hint: 'Pestaña Núcleo: revisa qué se conserva.', progress: (s) => [s.prestige.resets, 1], reward: { scrap: 5000 } },
  {
    id: 'm_core_buy',
    title: 'Compra una mejora del núcleo',
    hint: 'Los fragmentos compran mejoras permanentes.',
    progress: (s) => [Object.values(s.prestige.core).reduce((a, b) => a + b, 0), 1],
    reward: { scrap: 10000 },
  },
  { id: 'm_run1m', title: 'Recupera 1 M de chatarra en un ciclo', hint: 'El segundo ciclo es mucho más rápido.', progress: (s) => [s.stats.runScrap, 1e6], reward: { alloys: 2000 } },
  { id: 'm_void', title: 'Investiga «Salto al vacío»', hint: 'Un sector con tecnología avanzada.', progress: bool((s) => s.research.includes('void_jump')), reward: { data: 300 } },
  { id: 'm_harv', title: 'Construye un arrastrero orbital', hint: 'Requiere «Arrastreros orbitales».', progress: m('harvester', 1), reward: { alloys: 5000 } },
  { id: 'm_void_run', title: 'Explora la Anomalía del Vacío', hint: 'Casco reforzado recomendado.', progress: (s) => [s.expedition.sectorRuns.void_anomaly ?? 0, 1], reward: { data: 800 } },
  {
    id: 'm_epic',
    title: 'Consigue un módulo épico',
    hint: 'Los sectores profundos los guardan.',
    progress: bool((s) => Object.keys(s.modules.owned).some((id) => ['epic', 'legendary'].includes(MODULE_BY_ID[id]?.rarity))),
    reward: { data: 1000 },
  },
  { id: 'm_reset3', title: 'Reinicia el núcleo 3 veces', hint: 'Cada ciclo deja más fragmentos.', progress: (s) => [s.prestige.resets, 3], reward: { scrap: 1e6 } },
  { id: 'm_titan', title: 'Investiga «Cartas del abismo»', hint: 'Un sector con fragmentos del núcleo.', progress: bool((s) => s.research.includes('titan_charts')), reward: { data: 3000 } },
  { id: 'm_titan_run', title: 'Explora el Cementerio de Titanes', hint: 'El trono guarda fragmentos.', progress: (s) => [s.expedition.sectorRuns.titan_graveyard ?? 0, 1], reward: { alloys: 50000 } },
];
