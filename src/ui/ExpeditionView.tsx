import { BALANCE } from '../game/balance';
import { ENCOUNTER_BY_ID, SECTOR_BY_ID, SECTORS } from '../game/content/expeditions';
import { MODULE_BY_ID, RARITY_INFO } from '../game/content/modules';
import {
  chooseOption,
  collectExpedition,
  continueExpedition,
  launchCheck,
  launchExpedition,
  previewOption,
  retreatExpedition,
  sectorMissing,
} from '../game/expeditions';
import { RESOURCE_INFO, fmt, fmtTime } from '../game/format';
import { computeMods } from '../game/modifiers';
import type { GameState, ResourceId, Resources, Runtime } from '../game/types';
import { sfx } from './audio';
import { Bar, CostList, Panel } from './common';
import { Icon } from './icons';
import { store } from './store';

const RISK_LABEL = { bajo: 'Riesgo bajo', medio: 'Riesgo medio', alto: 'Riesgo alto' };

function Detail({ d }: { d: string }) {
  const [value, kind] = d.split('|');
  if (kind === 'hull') return <span className={`detail ${value.startsWith('-') ? 'bad' : 'good'}`}><Icon name="hull" size={13} /> {value} casco</span>;
  if (kind === 'module') {
    const m = MODULE_BY_ID[value];
    return (
      <span className="detail module" style={{ color: RARITY_INFO[m.rarity].color }}>
        <Icon name="modules" size={13} /> {m.name} ({RARITY_INFO[m.rarity].name})
      </span>
    );
  }
  if (kind === 'fragments') return <span className="detail good"><Icon name="core" size={13} /> {value} fragmentos</span>;
  const res = kind as ResourceId;
  return (
    <span className={`detail res-${res}`}>
      <Icon name={res} size={13} /> +{fmt(Number(value.replace('+', '')))} {RESOURCE_INFO[res].name.toLowerCase()}
    </span>
  );
}

function Cargo({ cargo, modules, fragments }: { cargo: Resources; modules: string[]; fragments: number }) {
  const has = Object.values(cargo).some((v) => v > 0) || modules.length > 0 || fragments > 0;
  return (
    <div className="cargo">
      <h4>Bodega</h4>
      {!has && <span className="muted">Vacía</span>}
      <CostList cost={cargo} compact />
      {modules.map((id, i) => (
        <span key={i} className="cargo-module" style={{ color: RARITY_INFO[MODULE_BY_ID[id].rarity].color }}>
          <Icon name="modules" size={13} /> {MODULE_BY_ID[id].name}
        </span>
      ))}
      {fragments > 0 && (
        <span className="cargo-module" style={{ color: 'var(--coral)' }}>
          <Icon name="core" size={13} /> {fragments} fragmentos
        </span>
      )}
    </div>
  );
}

function ActiveRun({ s, rt }: { s: GameState; rt: Runtime }) {
  const run = s.expedition.run!;
  const sector = SECTOR_BY_ID[run.sectorId];
  const enc = ENCOUNTER_BY_ID[run.encounters[run.step]];
  return (
    <div className="run" style={{ ['--accent' as string]: sector.color }}>
      <div className="run-head">
        <div>
          <span className="eyebrow">{sector.name}</span>
          <div className="run-steps">
            {run.encounters.map((_, i) => (
              <span key={i} className={`step ${i < run.step ? 'done' : i === run.step ? 'current' : ''} ${i === run.encounters.length - 1 ? 'final' : ''}`} />
            ))}
          </div>
        </div>
        <div className="hull-box">
          <Icon name="hull" size={16} />
          <Bar value={run.hull} max={run.maxHull} tone={run.hull / run.maxHull < 0.35 ? 'coral' : 'teal'} label="Casco" />
          <span>
            {Math.round(run.hull)}/{run.maxHull}
          </span>
        </div>
      </div>

      {run.status === 'event' && enc && (
        <div className="encounter">
          <h3>{enc.title}</h3>
          <p>{enc.text}</p>
          <div className="options">
            {enc.options.map((o) => {
              const p = previewOption(s, rt, o);
              const lethal = o.failure?.hull !== undefined && run.hull + (o.failure.hull ?? 0) <= 0 && o.chance < 1;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`option risk-${o.risk} ${p.priceOk ? '' : 'disabled'}`}
                  aria-disabled={!p.priceOk}
                  onClick={() => {
                    const ok = store.act((gs, grt) => chooseOption(gs, grt, o.id));
                    if (!ok) return sfx.error();
                    const r = store.state.expedition.run;
                    if (r?.lastOutcome?.good) sfx.mission();
                    else sfx.bad();
                  }}
                >
                  <div className="option-top">
                    <strong>{o.label}</strong>
                    <span className={`risk risk-${o.risk}`}>{RISK_LABEL[o.risk]}</span>
                  </div>
                  <span className="option-desc">{o.desc}</span>
                  <div className="option-info">
                    <span>Éxito {Math.round(o.chance * 100)} %</span>
                    {Object.keys(p.rewards).length > 0 && (
                      <span>
                        Botín <CostList cost={p.rewards} compact />
                      </span>
                    )}
                    {p.moduleChance > 0 && <span className="mod-chance">Módulo {Math.round(p.moduleChance * 100)} %</span>}
                    {p.hull !== 0 && <span className={p.hull < 0 ? 'bad' : 'good'}>Casco {p.hull > 0 ? '+' : ''}{p.hull}</span>}
                    {o.chance < 1 && p.failHull < 0 && <span className="bad">Si falla: casco {p.failHull}</span>}
                    {Object.keys(p.price).length > 0 && (
                      <span>
                        Coste <CostList cost={p.price} have={s.resources} compact />
                      </span>
                    )}
                  </div>
                  {lethal && <span className="lethal">¡Un fallo destruiría la nave!</span>}
                </button>
              );
            })}
          </div>
          {run.step > 0 && (
            <button type="button" className="ghost-btn" onClick={() => store.act((gs) => retreatExpedition(gs))}>
              Regresar ahora con el botín
            </button>
          )}
        </div>
      )}

      {run.status !== 'event' && run.lastOutcome && (
        <div className={`outcome ${run.lastOutcome.good ? 'good' : 'bad'}`}>
          <h3>{run.lastOutcome.good ? 'Éxito' : 'Contratiempo'}</h3>
          <p>{run.lastOutcome.text}</p>
          <div className="details">
            {run.lastOutcome.details.map((d, i) => (
              <Detail key={i} d={d} />
            ))}
          </div>
        </div>
      )}

      {run.status === 'outcome' && (
        <div className="run-actions">
          <button type="button" className="primary-btn" onClick={() => store.act((gs) => continueExpedition(gs))}>
            Continuar ({run.step + 2}/{run.encounters.length})
          </button>
          <button type="button" className="ghost-btn" onClick={() => store.act((gs) => retreatExpedition(gs))}>
            Regresar con el botín
          </button>
        </div>
      )}

      {run.status === 'finished' && (
        <div className={`run-end ending-${run.ending}`}>
          <h3>
            {run.ending === 'success' ? 'Sector completado' : run.ending === 'retreat' ? 'Regreso a la estación' : 'Nave destruida'}
          </h3>
          <p>
            {run.ending === 'destroyed'
              ? 'Los remolcadores recuperan la nave. Se pierden los módulos y la mitad del cargamento.'
              : 'Todo el cargamento llegará intacto a la estación.'}
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              const res = store.act((gs, grt) => collectExpedition(gs, grt));
              if (res) {
                if (res.modules.length) sfx.module();
                else sfx.buy();
              }
            }}
          >
            Descargar el botín
          </button>
        </div>
      )}

      <Cargo cargo={run.cargo} modules={run.modules} fragments={run.fragments} />
      {run.log.length > 0 && (
        <ol className="run-log">
          {run.log.map((l, i) => (
            <li key={i} className={l.good ? 'good' : 'bad'}>
              {l.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ExpeditionView({ s, rt }: { s: GameState; rt: Runtime }) {
  const m = computeMods(s);
  return (
    <Panel
      title="Expediciones"
      icon="expedition"
      className="view expedition-view"
      right={<span className="muted">Completadas: {s.expedition.completed} · Casco {m.hull} · Botín ×{m.expReward.toFixed(2)}</span>}
    >
      {s.expedition.run ? (
        <ActiveRun s={s} rt={rt} />
      ) : (
        <>
          <p className="callout">
            Cada expedición consume combustible y presenta encuentros con varias rutas. El botín escala con tu producción actual. Si el casco llega a 0, la nave vuelve
            remolcada con la mitad del cargamento.
          </p>
          {s.expedition.cooldown > 0 && (
            <div className="cooldown">
              <Icon name="hull" size={16} /> Reparando la nave: {fmtTime(s.expedition.cooldown)}
              <Bar value={BALANCE.expedition.cooldown * m.expCooldown - s.expedition.cooldown} max={BALANCE.expedition.cooldown * m.expCooldown} tone="teal" label="Reparación" />
            </div>
          )}
          <div className="sectors">
            {SECTORS.map((sec) => {
              const missing = sectorMissing(s, sec);
              const check = launchCheck(s, sec.id);
              const locked = missing.length > 0;
              return (
                <article key={sec.id} className={`sector ${locked ? 'locked' : ''}`} style={{ ['--accent' as string]: sec.color }}>
                  <div className="sector-art" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="sector-body">
                    <h3>
                      {locked && <Icon name="lock" size={14} />} {sec.name}
                    </h3>
                    <p>{sec.desc}</p>
                    <div className="sector-meta">
                      <span>{sec.steps} encuentros</span>
                      <span>Explorado {s.expedition.sectorRuns[sec.id] ?? 0} veces</span>
                      <span className="rarity-line">
                        {(['common', 'rare', 'epic', 'legendary'] as const)
                          .filter((r) => sec.rarity[r] > 0)
                          .map((r) => (
                            <i key={r} style={{ background: RARITY_INFO[r].color, flex: sec.rarity[r] }} title={`${RARITY_INFO[r].name}: ${sec.rarity[r]} %`} />
                          ))}
                      </span>
                    </div>
                    {locked ? (
                      <em className="tech-req">Requiere: {missing.join(' · ')}</em>
                    ) : (
                      <div className="sector-launch">
                        <span>
                          Combustible <CostList cost={sec.fuel} have={s.resources} compact />
                        </span>
                        <button
                          type="button"
                          className={`primary-btn ${check.ok ? '' : 'disabled'}`}
                          aria-disabled={!check.ok}
                          title={check.reason}
                          onClick={() => {
                            if (store.act((gs, grt) => launchExpedition(gs, grt, sec.id))) sfx.expedition();
                            else sfx.error();
                          }}
                        >
                          {check.ok ? 'Lanzar expedición' : check.reason}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}
