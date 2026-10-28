import { buyResearch, researchCost, researchStatus } from '../game/actions';
import { RESEARCH, RESEARCH_BY_ID } from '../game/content/research';
import { describeEffect } from '../game/effects';
import { fmt } from '../game/format';
import { canAfford } from '../game/formulas';
import { missingReqs } from '../game/requirements';
import type { GameState, Runtime } from '../game/types';
import { sfx } from './audio';
import { CostList, Panel } from './common';
import { Icon } from './icons';
import { store } from './store';

const TIER_NAMES = ['Fundamentos', 'Optimización', 'Expansión', 'Frontera', 'Núcleo', 'Singularidad'];

export function ResearchView({ s, rt }: { s: GameState; rt: Runtime }) {
  const tiers = [...new Set(RESEARCH.map((r) => r.tier))].sort((a, b) => a - b);
  const dataRate = rt.rates.data.prod;
  return (
    <Panel
      title="Investigación"
      icon="research"
      className="view research-view"
      right={
        <span className="muted">
          {s.research.length}/{RESEARCH.length} · {fmt(s.resources.data, 1)} datos ({fmt(dataRate, 2)}/s)
        </span>
      }
    >
      {s.machines.lab.count === 0 && s.resources.data < 1 && (
        <p className="callout">Los datos se generan en los laboratorios. Construye una fundición y luego un laboratorio en el taller.</p>
      )}
      <div className="tech-tree">
        {tiers.map((tier) => (
          <div className="tech-col" key={tier}>
            <h3 className="tech-col-title">{TIER_NAMES[tier] ?? `Nivel ${tier + 1}`}</h3>
            {RESEARCH.filter((r) => r.tier === tier).map((r) => {
              const status = researchStatus(s, r.id);
              const cost = researchCost(s, r.id);
              const ok = status === 'available' && canAfford(s.resources, cost);
              const missing = [
                ...r.prereq.filter((p) => !s.research.includes(p)).map((p) => RESEARCH_BY_ID[p].name),
                ...missingReqs(s, r.requires),
              ];
              const eta = status === 'available' && !ok && dataRate > 0 ? Math.max(0, ((cost.data ?? 0) - s.resources.data) / dataRate) : null;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`tech ${status} ${ok ? 'ready' : ''}`}
                  aria-disabled={!ok}
                  onClick={() => {
                    if (status === 'done') return;
                    if (store.act((gs, grt) => buyResearch(gs, grt, r.id))) sfx.research();
                    else sfx.error();
                  }}
                >
                  <div className="tech-top">
                    <strong>{r.name}</strong>
                    {status === 'done' ? <Icon name="check" size={16} className="tech-done" /> : status === 'locked' ? <Icon name="lock" size={14} /> : null}
                  </div>
                  <ul className="tech-effects">
                    {r.effects.map((e, i) => (
                      <li key={i}>{describeEffect(e)}</li>
                    ))}
                  </ul>
                  {status !== 'done' && <CostList cost={cost} have={s.resources} compact />}
                  {status === 'locked' && missing.length > 0 && <em className="tech-req">Requiere: {missing.join(', ')}</em>}
                  {eta !== null && eta > 0 && eta < 3600 && <em className="tech-eta">≈ {Math.ceil(eta)} s de datos</em>}
                  {status === 'done' && <em className="tech-flavor">{r.flavor}</em>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="hint-small">Las investigaciones se reinician al REINICIAR EL NÚCLEO (salvo las que conserve el núcleo).</p>
    </Panel>
  );
}
