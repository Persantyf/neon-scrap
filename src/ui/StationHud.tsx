import { activateOverload, overloadUnlocked } from '../game/actions';
import { BALANCE } from '../game/balance';
import { fmt, fmtTime } from '../game/format';
import { computeMods } from '../game/modifiers';
import { activeMission } from '../game/progression';
import type { GameState, Runtime } from '../game/types';
import { sfx } from './audio';
import { Bar, CostList } from './common';
import { Icon } from './icons';
import { store } from './store';

export function OverloadButton({ s }: { s: GameState }) {
  const m = computeMods(s);
  const unlocked = overloadUnlocked(s);
  const active = s.overload.remaining > 0;
  const cooling = !active && s.overload.cooldown > 0;
  const ready = unlocked && !active && !cooling;
  const pct = active ? s.overload.remaining / m.overloadDuration : cooling ? 1 - s.overload.cooldown / m.overloadCooldown : 1;

  return (
    <button
      type="button"
      className={`overload ${active ? 'active' : ''} ${ready ? 'ready' : ''} ${!unlocked ? 'locked' : ''}`}
      aria-disabled={!ready}
      onClick={() => {
        if (store.act((gs, rt) => activateOverload(gs, rt))) sfx.overload();
        else sfx.error();
      }}
      title={
        unlocked
          ? `Multiplica toda la producción ×${m.overloadMult} durante ${m.overloadDuration} s. Enfriamiento: ${fmtTime(m.overloadCooldown)} tras terminar.`
          : `Se desbloquea con ${BALANCE.overload.unlockDrones} drones`
      }
    >
      <span className="overload-ring" style={{ ['--p' as string]: pct }} />
      <Icon name="bolt" size={20} />
      <span className="overload-text">
        <strong>SOBRECARGA</strong>
        <small>
          {!unlocked
            ? `${s.machines.drone.count}/${BALANCE.overload.unlockDrones} drones`
            : active
              ? `×${m.overloadMult} · ${Math.ceil(s.overload.remaining)} s`
              : cooling
                ? `Enfriando ${Math.ceil(s.overload.cooldown)} s`
                : `Lista · ×${m.overloadMult} ${m.overloadDuration} s`}
        </small>
      </span>
    </button>
  );
}

export function MissionCard({ s }: { s: GameState }) {
  const mission = activeMission(s, fmt);
  if (!mission) return null;
  return (
    <div className="mission">
      <div className="mission-head">
        <Icon name="target" size={14} />
        <span>Directiva {s.missions.done + 1}</span>
      </div>
      <strong className="mission-title">{mission.title}</strong>
      <p className="mission-hint">{mission.hint}</p>
      {mission.target > 1 && (
        <div className="mission-progress">
          <Bar value={mission.cur} max={mission.target} tone="amber" label="Progreso de la directiva" />
          <span>
            {fmt(Math.min(mission.cur, mission.target))} / {fmt(mission.target)}
          </span>
        </div>
      )}
      <div className="mission-reward">
        Recompensa <CostList cost={mission.reward} compact />
      </div>
    </div>
  );
}

/** Avisos de la estación: déficit de energía, chatarra consumida, etc. */
export function StationAlerts({ s, rt }: { s: GameState; rt: Runtime }) {
  const alerts: { tone: string; text: string }[] = [];
  if (rt.energyRatio < 0.995 && rt.rates.energy.cons > 0)
    alerts.push({ tone: 'coral', text: `Déficit de energía: las máquinas funcionan al ${Math.round(rt.energyRatio * 100)} %. Construye paneles o reactores, o pausa consumidores.` });
  const scrapNet = rt.rates.scrap.prod - rt.rates.scrap.cons;
  if (s.machines.foundry.count > 0 && s.machines.foundry.active && scrapNet < 0 && s.resources.scrap < 1)
    alerts.push({ tone: 'amber', text: 'Las fundiciones se están quedando sin chatarra.' });
  if (s.machines.lab.count > 0 && s.machines.lab.active && (rt.machineEfficiency.lab ?? 1) < 0.99 && rt.energyRatio > 0.99)
    alerts.push({ tone: 'amber', text: 'Los laboratorios necesitan más aleaciones.' });
  if (!alerts.length) return null;
  return (
    <div className="alerts" role="status">
      {alerts.map((a) => (
        <div key={a.text} className={`alert tone-${a.tone}`}>
          {a.text}
        </div>
      ))}
    </div>
  );
}

/** Resumen de crecimiento: comparación con hace ~5 minutos y multiplicadores clave. */
export function GrowthStrip({ s, rt }: { s: GameState; rt: Runtime }) {
  const m = computeMods(s);
  const h = s.stats.history;
  const now = Math.max(0, rt.rates.scrap.prod - rt.rates.scrap.cons);
  const past = h.length > 30 ? h[h.length - 31].scrap : h.length ? h[0].scrap : 0;
  const growth = past > 0 ? now / past : 0;
  return (
    <div className="growth-strip">
      <div>
        <span>Chatarra/s</span>
        <strong>{fmt(now, 1)}</strong>
      </div>
      <div>
        <span>{h.length > 30 ? 'vs. hace 5 min' : 'vs. inicio del registro'}</span>
        <strong className={growth >= 1 ? 'up' : ''}>{growth > 0 ? `×${growth >= 100 ? fmt(growth) : growth.toFixed(1)}` : '—'}</strong>
      </div>
      <div>
        <span>Multiplicador global</span>
        <strong>×{m.global < 100 ? m.global.toFixed(2) : fmt(m.global)}</strong>
      </div>
      <div>
        <span>Ciclo</span>
        <strong>{fmtTime(s.stats.runTime)}</strong>
      </div>
    </div>
  );
}
