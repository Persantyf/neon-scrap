import type { ResourceId } from './types';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

const fixed = (n: number, digits: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Formatea números grandes: 1.234 → "1.234", 1.234.567 → "1,23 M", 1e40 → "1,00e40". */
export function fmt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '−' + fmt(-n, decimals);
  if (n < 1000) {
    if (decimals > 0 && n < 100 && !Number.isInteger(n)) return fixed(n, n < 10 ? Math.min(decimals, 2) : 1);
    return Math.floor(n).toLocaleString('es-ES');
  }
  if (n < 1e6) return Math.floor(n).toLocaleString('es-ES');
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) {
    const exp = Math.floor(Math.log10(n));
    return `${fixed(n / Math.pow(10, exp), 2)}e${exp}`;
  }
  const scaled = n / Math.pow(1000, tier);
  return `${fixed(scaled, scaled < 10 ? 2 : scaled < 100 ? 1 : 0)} ${SUFFIXES[tier]}`;
}

/** Tasa por segundo con signo. */
export function fmtRate(n: number): string {
  if (Math.abs(n) < 0.005) return '0/s';
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n), 2)}/s`;
}

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60 ? `${s % 60} s` : ''}`.trim();
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

export function fmtPct(x: number): string {
  return `${Math.round(x * 100)} %`;
}

export const RESOURCE_INFO: Record<ResourceId, { name: string; color: string }> = {
  scrap: { name: 'Chatarra', color: '#9fd8e6' },
  energy: { name: 'Energía', color: '#ffd36b' },
  alloys: { name: 'Aleaciones', color: '#ffb347' },
  data: { name: 'Datos', color: '#c58bff' },
};
