import { useState } from 'react';
import {
  buyLevel,
  buyMachine,
  buyUpgrade,
  machineUnlocked,
  nextLevelOffer,
  roman,
  setBuyAmount,
  toggleMachine,
  visibleUpgrades,
} from '../game/actions';
import { MACHINES, MACHINE_BY_ID } from '../game/content/machines';
import { describeEffect } from '../game/effects';
import { canAfford, purchasePlan } from '../game/formulas';
import { machineInfo } from '../game/info';
import { computeMods } from '../game/modifiers';
import { missingReqs } from '../game/requirements';
import type { BuyAmount, GameState, MachineId, Runtime } from '../game/types';
import { sfx } from './audio';
import { CostList, RateList, missingLabel } from './common';
import { Icon } from './icons';
import { store } from './store';

function MachineCard({ s, rt, id }: { s: GameState; rt: Runtime; id: MachineId }) {
  const def = MACHINE_BY_ID[id];
  const st = s.machines[id];
  const m = computeMods(s);
  const plan = purchasePlan(id, st.count, s.resources, s.settings.buyAmount, m.machineCost);
  const info = machineInfo(s, rt, id);
  const lack = plan.affordable ? null : missingLabel(plan.cost, s.resources);
  const [flash, setFlash] = useState(0);
  const total: Partial<Record<string, number>> = {};
  for (const [r, v] of Object.entries(info.perUnit)) total[r] = (v ?? 0) * st.count * (st.active ? info.efficiency : 0);

  const buy = () => {
    const k = store.act((gs, grt) => buyMachine(gs, grt, id, gs.settings.buyAmount));
    if (k > 0) {
      setFlash((f) => f + 1);
      sfx.build();
    } else sfx.error();
  };

  return (
    <article className={`machine ${st.count === 0 ? 'is-new' : ''} ${!st.active ? 'is-off' : ''}`} style={{ ['--accent' as string]: def.color }}>
      <div className="machine-icon">
        <Icon name={id} size={22} />
        {st.level > 0 && <span className="mk">Mk {roman(st.level + 1)}</span>}
      </div>
      <div className="machine-body">
        <div className="machine-title">
          <h3>{def.name}</h3>
          <span key={flash} className={`machine-count ${flash ? 'bump' : ''}`}>{st.count}</span>
        </div>
        <p className="machine-desc">{def.desc}</p>
        <div className="machine-stats">
          {Object.keys(info.perUnit).length > 0 && (
            <span title="Producción por unidad">
              c/u <RateList rates={info.perUnit} />
            </span>
          )}
          {Object.keys(info.consumePerUnit).length > 0 && (
            <span className="consume" title="Consumo por unidad">
              consume <RateList rates={info.consumePerUnit} />
            </span>
          )}
          {info.effectText && st.count > 0 && <span className="effect">{info.effectText}</span>}
          {st.count > 0 && Object.keys(total).length > 0 && (
            <span className="total">
              total <RateList rates={total} />
            </span>
          )}
        </div>
        {info.limitedBy && (
          <div className="machine-warn">
            Al {Math.round(info.efficiency * 100)} % — {info.limitedBy}
          </div>
        )}
      </div>
      <div className="machine-actions">
        <button
          type="button"
          className={`buy-btn ${plan.affordable ? '' : 'disabled'}`}
          aria-disabled={!plan.affordable}
          onClick={buy}
          title={lack ?? `Comprar ${plan.k}`}
        >
          <span className="buy-qty">+{plan.k}</span>
          <CostList cost={plan.cost} have={s.resources} compact />
          {lack && <span className="buy-lack">{lack}</span>}
        </button>
        <div className="machine-toggles">
          {def.toggleable && st.count > 0 && (
            <button
              type="button"
              className={`mini-toggle ${st.active ? 'on' : 'off'}`}
              onClick={() => store.act((gs) => toggleMachine(gs, id))}
              title={st.active ? 'Pausar estas máquinas' : 'Reanudar estas máquinas'}
              aria-pressed={st.active}
            >
              <Icon name="power" size={13} />
              {st.active ? 'Activas' : 'Pausadas'}
            </button>
          )}
          {m.autobuy && (
            <button
              type="button"
              className={`mini-toggle ${s.autobuy[id] ? 'on' : 'off'}`}
              onClick={() =>
                store.act((gs) => {
                  gs.autobuy[id] = !gs.autobuy[id];
                })
              }
              aria-pressed={!!s.autobuy[id]}
              title="Construcción automática: compra una unidad cada segundo si puedes pagarla"
            >
              AUTO
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function LockedTeaser({ s, id }: { s: GameState; id: MachineId }) {
  const def = MACHINE_BY_ID[id];
  return (
    <article className="machine locked">
      <div className="machine-icon">
        <Icon name="lock" size={20} />
      </div>
      <div className="machine-body">
        <div className="machine-title">
          <h3>{def.name}</h3>
        </div>
        <p className="machine-desc">Próximo desbloqueo: {missingReqs(s, def.requires).join(' · ')}</p>
      </div>
    </article>
  );
}

function UpgradeList({ s }: { s: GameState }) {
  const m = computeMods(s);
  const offers = MACHINES.map((d) => nextLevelOffer(s, d.id))
    .filter((o): o is NonNullable<typeof o> => !!o && machineUnlocked(s, o.machine) && s.machines[o.machine].count >= Math.floor(o.threshold * 0.6))
    .map((o) => ({ kind: 'level' as const, o }));
  const ups = visibleUpgrades(s).map((u) => ({ kind: 'up' as const, u }));
  const items = [...ups, ...offers];
  const scrapOf = (it: (typeof items)[number]) => (it.kind === 'up' ? (it.u.cost.scrap ?? 0) + (it.u.cost.alloys ?? 0) * 50 : (it.o.cost.scrap ?? 0) + (it.o.cost.alloys ?? 0) * 50);
  items.sort((a, b) => scrapOf(a) - scrapOf(b));

  if (!items.length) return <p className="empty">Sigue construyendo: aparecerán nuevas mejoras al crecer la estación.</p>;

  return (
    <div className="upgrade-list">
      {items.map((it) => {
        if (it.kind === 'up') {
          const u = it.u;
          const ok = canAfford(s.resources, u.cost);
          return (
            <button
              key={u.id}
              type="button"
              className={`upgrade ${ok ? 'ready' : 'disabled'}`}
              aria-disabled={!ok}
              onClick={() => (store.act((gs, rt) => buyUpgrade(gs, rt, u.id)) ? sfx.buy() : sfx.error())}
            >
              <div className="upgrade-top">
                <strong>{u.name}</strong>
                <CostList cost={u.cost} have={s.resources} compact />
              </div>
              <span className="upgrade-effect">{u.effects.map((e) => describeEffect(e)).join(' · ')}</span>
              <em>{u.flavor}</em>
            </button>
          );
        }
        const o = it.o;
        const def = MACHINE_BY_ID[o.machine];
        const reached = s.machines[o.machine].count >= o.threshold;
        const ok = reached && canAfford(s.resources, o.cost);
        const effect =
          def.effect === 'sorter'
            ? `Efecto de clasificadores ×${def.levelOut}`
            : def.effect === 'fabricator'
              ? `Efecto de fabricadores ×${def.levelOut}`
              : `Producción ×${def.levelOut}${def.levelIn > 1 ? ` · consumo ×${def.levelIn}` : ''}`;
        return (
          <button
            key={`lvl-${o.machine}`}
            type="button"
            className={`upgrade level ${ok ? 'ready' : 'disabled'}`}
            aria-disabled={!ok}
            onClick={() => (store.act((gs, rt) => buyLevel(gs, rt, o.machine)) ? sfx.buy() : sfx.error())}
            style={{ ['--accent' as string]: def.color }}
          >
            <div className="upgrade-top">
              <strong>
                {def.short} Mk {roman(o.level + 1)}
              </strong>
              <CostList cost={o.cost} have={s.resources} compact />
            </div>
            <span className="upgrade-effect">{effect}</span>
            {!reached && (
              <em className="lack-text">
                Requiere {o.threshold} unidades (tienes {s.machines[o.machine].count})
              </em>
            )}
          </button>
        );
      })}
      <p className="hint-small">Mejoras compradas este ciclo: {s.upgrades.length}. Coste de máquinas actual ×{m.machineCost.toFixed(2)}.</p>
    </div>
  );
}

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

export function Workshop({ s, rt }: { s: GameState; rt: Runtime }) {
  const [tab, setTab] = useState<'machines' | 'upgrades'>('machines');
  const unlocked = MACHINES.filter((d) => machineUnlocked(s, d.id));
  const nextLocked = MACHINES.find((d) => !machineUnlocked(s, d.id));
  const readyUpgrades =
    visibleUpgrades(s).filter((u) => canAfford(s.resources, u.cost)).length +
    MACHINES.filter((d) => {
      const o = nextLevelOffer(s, d.id);
      return o && s.machines[d.id].count >= o.threshold && canAfford(s.resources, o.cost);
    }).length;

  return (
    <div className="workshop">
      <div className="workshop-head">
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'machines'} className={tab === 'machines' ? 'on' : ''} onClick={() => setTab('machines')}>
            Máquinas
          </button>
          <button type="button" role="tab" aria-selected={tab === 'upgrades'} className={tab === 'upgrades' ? 'on' : ''} onClick={() => setTab('upgrades')}>
            Mejoras {readyUpgrades > 0 && <span className="badge">{readyUpgrades}</span>}
          </button>
        </div>
        {tab === 'machines' && (
          <div className="seg small" aria-label="Cantidad a comprar">
            {AMOUNTS.map((a) => (
              <button
                key={String(a)}
                type="button"
                className={s.settings.buyAmount === a ? 'on' : ''}
                aria-pressed={s.settings.buyAmount === a}
                onClick={() => store.act((gs) => setBuyAmount(gs, a))}
              >
                {a === 'max' ? 'MÁX' : `×${a}`}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="workshop-scroll">
        {tab === 'machines' ? (
          <>
            {unlocked.map((d) => (
              <MachineCard key={d.id} s={s} rt={rt} id={d.id} />
            ))}
            {nextLocked && <LockedTeaser s={s} id={nextLocked.id} />}
          </>
        ) : (
          <UpgradeList s={s} />
        )}
      </div>
    </div>
  );
}
