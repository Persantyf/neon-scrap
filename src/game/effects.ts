import type { MachineId, ResourceId } from './types';

/**
 * Efectos declarativos compartidos por mejoras, investigación, núcleo y módulos.
 * Bonificaciones: `value` es una fracción y se aplica como ×(1 + value·veces).
 * Reducciones: ×(1 − value·veces), con un mínimo para no llegar nunca a 0.
 */
export type Effect =
  | { kind: 'clickMult'; value: number }
  | { kind: 'clickRate'; value: number }
  | { kind: 'autoClick'; value: number }
  | { kind: 'machineOut'; machine: MachineId; value: number }
  | { kind: 'resourceMult'; res: ResourceId; value: number }
  | { kind: 'global'; value: number }
  | { kind: 'energyUse'; value: number }
  | { kind: 'energyCap'; value: number }
  | { kind: 'sorterMult'; value: number }
  | { kind: 'fabMult'; value: number }
  | { kind: 'foundryHeat'; value: number }
  | { kind: 'overloadDuration'; value: number }
  | { kind: 'overloadCooldown'; value: number }
  | { kind: 'overloadMult'; value: number }
  | { kind: 'machineCost'; value: number }
  | { kind: 'researchCost'; value: number }
  | { kind: 'slots'; value: number }
  | { kind: 'hull'; value: number }
  | { kind: 'expReward'; value: number }
  | { kind: 'expCooldown'; value: number }
  | { kind: 'fragmentGain'; value: number }
  | { kind: 'fragmentBonus'; value: number }
  | { kind: 'unlockSector'; sector: string }
  | { kind: 'unlockMachine'; machine: MachineId }
  | { kind: 'unlockPrestige' }
  | { kind: 'unlockAutobuy' }
  | { kind: 'keepResearch'; ids: string[] }
  | { kind: 'startMachines'; machines: Partial<Record<MachineId, number>> }
  | { kind: 'startResources'; resources: Partial<Record<ResourceId, number>> };

const RES_NAME: Record<ResourceId, string> = {
  scrap: 'chatarra',
  energy: 'energía',
  alloys: 'aleaciones',
  data: 'datos',
};

const MACHINE_NAME: Record<MachineId, string> = {
  drone: 'drones',
  solar: 'paneles solares',
  sorter: 'clasificadores',
  foundry: 'fundiciones',
  lab: 'laboratorios',
  fabricator: 'fabricadores',
  reactor: 'reactores',
  harvester: 'arrastreros',
};

const pct = (v: number) => `${Math.round(v * 100)} %`;
const mult = (v: number) => (Number.isInteger(1 + v) ? `×${1 + v}` : `+${pct(v)}`);

/** Texto legible de un efecto multiplicado por `times` (niveles). */
export function describeEffect(e: Effect, times = 1): string {
  const t = times;
  switch (e.kind) {
    case 'clickMult':
      return `Recuperación manual ${mult(e.value * t)}`;
    case 'clickRate':
      return `Cada clic suma el ${pct(e.value * t)} de tu chatarra/s`;
    case 'autoClick':
      return `${e.value * t} recuperaciones automáticas por segundo`;
    case 'machineOut':
      return `Producción de ${MACHINE_NAME[e.machine]} ${mult(e.value * t)}`;
    case 'resourceMult':
      return `Producción de ${RES_NAME[e.res]} ${mult(e.value * t)}`;
    case 'global':
      return `Toda la producción ${mult(e.value * t)}`;
    case 'energyUse':
      return `Consumo de energía −${pct(e.value * t)}`;
    case 'energyCap':
      return `Capacidad de baterías ${mult(e.value * t)}`;
    case 'sorterMult':
      return `Efecto de los clasificadores ${mult(e.value * t)}`;
    case 'fabMult':
      return `Efecto de los fabricadores ${mult(e.value * t)}`;
    case 'foundryHeat':
      return `Cada fundición genera ${e.value * t} energía/s`;
    case 'overloadDuration':
      return `Sobrecarga dura +${e.value * t} s`;
    case 'overloadCooldown':
      return `Enfriamiento de Sobrecarga −${pct(e.value * t)}`;
    case 'overloadMult':
      return `Sobrecarga +${e.value * t} al multiplicador`;
    case 'machineCost':
      return `Coste de máquinas −${pct(e.value * t)}`;
    case 'researchCost':
      return `Coste de investigación −${pct(e.value * t)}`;
    case 'slots':
      return `+${e.value * t} ranura de módulo`;
    case 'hull':
      return `Casco de expedición +${e.value * t}`;
    case 'expReward':
      return `Botín de expediciones +${pct(e.value * t)}`;
    case 'expCooldown':
      return `Reparación entre expediciones −${pct(e.value * t)}`;
    case 'fragmentGain':
      return `Fragmentos obtenidos al reiniciar +${pct(e.value * t)}`;
    case 'fragmentBonus':
      return `Cada fragmento total da +${pct(e.value * t)} de producción extra`;
    case 'unlockSector':
      return `Desbloquea un nuevo sector de expedición`;
    case 'unlockMachine':
      return `Desbloquea: ${MACHINE_NAME[e.machine]}`;
    case 'unlockPrestige':
      return 'Permite REINICIAR EL NÚCLEO';
    case 'unlockAutobuy':
      return 'Desbloquea la construcción automática de máquinas';
    case 'keepResearch':
      return 'Conserva las coordenadas de sectores tras reiniciar';
    case 'startMachines':
      return `Empiezas cada ciclo con ${Object.entries(e.machines)
        .map(([k, v]) => `${(v ?? 0) * t} ${MACHINE_NAME[k as MachineId]}`)
        .join(' y ')}`;
    case 'startResources':
      return `Empiezas cada ciclo con ${Object.entries(e.resources)
        .map(([k, v]) => `${((v ?? 0) * t).toLocaleString('es-ES')} ${RES_NAME[k as ResourceId]}`)
        .join(' y ')}`;
  }
}
