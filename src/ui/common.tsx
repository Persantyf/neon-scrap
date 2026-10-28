import type { ReactNode } from 'react';
import { RESOURCE_INFO, fmt } from '../game/format';
import type { Cost, ResourceId, Resources } from '../game/types';
import { Icon } from './icons';

/** Lista de costes; marca en rojo lo que falta y lo explica en el título. */
export function CostList({ cost, have, compact }: { cost: Cost; have?: Resources; compact?: boolean }) {
  const entries = Object.entries(cost).filter(([, v]) => (v ?? 0) > 0) as [ResourceId, number][];
  return (
    <span className={`cost-list ${compact ? 'compact' : ''}`}>
      {entries.map(([res, v]) => {
        const lack = have ? have[res] < v : false;
        return (
          <span
            key={res}
            className={`cost res-${res} ${lack ? 'lack' : ''}`}
            title={lack && have ? `Faltan ${fmt(v - have[res])} de ${RESOURCE_INFO[res].name.toLowerCase()}` : RESOURCE_INFO[res].name}
          >
            <Icon name={res} size={13} />
            {fmt(v)}
          </span>
        );
      })}
    </span>
  );
}

/** Texto con el primer recurso que falta, para el estado deshabilitado de los botones. */
export function missingLabel(cost: Cost, have: Resources): string | null {
  for (const [res, v] of Object.entries(cost) as [ResourceId, number][]) {
    if (have[res] < v) return `Falta ${RESOURCE_INFO[res].name.toLowerCase()}`;
  }
  return null;
}

export function Panel({ title, icon, right, children, className }: { title?: ReactNode; icon?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className ?? ''}`}>
      {title !== undefined && (
        <header className="panel-head">
          {icon && <Icon name={icon} size={16} />}
          <h2>{title}</h2>
          {right && <div className="panel-head-right">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Bar({ value, max, tone = 'teal', label }: { value: number; max: number; tone?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`bar tone-${tone}`} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="bar-fill" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function RateList({ rates }: { rates: Partial<Record<ResourceId, number>> }) {
  return (
    <span className="rate-list">
      {(Object.entries(rates) as [ResourceId, number][]).map(([r, v]) => (
        <span key={r} className={`res-${r}`}>
          <Icon name={r} size={12} />
          {fmt(v, 2)}/s
        </span>
      ))}
    </span>
  );
}
