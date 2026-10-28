import { RESOURCE_INFO, fmt, fmtRate } from '../game/format';
import { energyInfo } from '../game/info';
import type { GameState, ResourceId, Runtime } from '../game/types';
import { Icon } from './icons';

const ORDER: ResourceId[] = ['scrap', 'energy', 'alloys', 'data'];

function visible(s: GameState, r: ResourceId) {
  if (r === 'scrap') return true;
  if (r === 'energy') return s.machines.solar.count > 0 || s.resources.energy > 0 || s.prestige.resets > 0;
  if (r === 'alloys') return s.machines.foundry.count > 0 || s.resources.alloys > 0 || s.prestige.resets > 0;
  return s.machines.lab.count > 0 || s.resources.data > 0 || s.prestige.resets > 0;
}

export function TopBar({
  s,
  rt,
  onSettings,
  onToggleMute,
}: {
  s: GameState;
  rt: Runtime;
  onSettings: () => void;
  onToggleMute: () => void;
}) {
  const e = energyInfo(s, rt);
  return (
    <header className="topbar">
      <div className="brand">
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
          <circle cx="20" cy="20" r="12" fill="none" stroke="var(--teal)" strokeWidth="2.5" />
          <circle cx="20" cy="20" r="4.5" fill="var(--amber)" />
          <path d="M3 27 L37 13" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="brand-text">
          <strong>NEON SCRAP</strong>
          <span>LAST ORBIT</span>
        </div>
      </div>

      <div className="resources">
        {ORDER.filter((r) => visible(s, r)).map((r) => {
          const net = rt.rates[r].prod - rt.rates[r].cons;
          return (
            <div key={r} className={`res-chip res-${r}`} title={`${RESOURCE_INFO[r].name}: ${s.resources[r].toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}>
              <Icon name={r} size={18} />
              <div className="res-text">
                <span className="res-name">{RESOURCE_INFO[r].name}</span>
                <span className="res-value">
                  {fmt(s.resources[r], r === 'data' ? 1 : 0)}
                  {r === 'energy' && <small> / {fmt(e.cap)}</small>}
                </span>
                <span className={`res-rate ${net < -0.005 ? 'neg' : ''}`}>{fmtRate(net)}</span>
              </div>
              {r === 'energy' && (
                <div className="energy-meter" aria-hidden="true">
                  <div style={{ width: `${Math.min(100, (s.resources.energy / Math.max(1, e.cap)) * 100)}%` }} />
                </div>
              )}
            </div>
          );
        })}
        {(s.prestige.fragmentsTotal > 0 || s.prestige.resets > 0) && (
          <div className="res-chip res-core" title="Fragmentos del núcleo (sin gastar)">
            <Icon name="core" size={18} />
            <div className="res-text">
              <span className="res-name">Fragmentos</span>
              <span className="res-value">{fmt(s.prestige.fragments)}</span>
              <span className="res-rate">{fmt(s.prestige.fragmentsTotal)} totales</span>
            </div>
          </div>
        )}
      </div>

      <div className="top-actions">
        <button type="button" className="icon-btn" onClick={onToggleMute} aria-label={s.settings.muted ? 'Activar sonido' : 'Silenciar sonido'} title={s.settings.muted ? 'Activar sonido' : 'Silenciar'}>
          <Icon name={s.settings.muted ? 'soundOff' : 'soundOn'} size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Ajustes y partida" title="Ajustes y partida">
          <Icon name="settings" size={18} />
        </button>
      </div>
    </header>
  );
}
