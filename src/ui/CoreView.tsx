import { useState } from 'react';
import { buyCore, coreCost } from '../game/actions';
import { BALANCE } from '../game/balance';
import { CORE_UPGRADES } from '../game/content/core';
import { describeEffect } from '../game/effects';
import { fmt, fmtTime } from '../game/format';
import { computeMods } from '../game/modifiers';
import { PRESTIGE_RULES, canPrestige, doPrestige, nextFragmentAt, prestigeGain, prestigeUnlocked } from '../game/prestige';
import type { GameState } from '../game/types';
import { sfx } from './audio';
import { Bar, Panel } from './common';
import { Icon } from './icons';
import { store } from './store';

export function CoreView({ s, onPrestige }: { s: GameState; onPrestige: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const m = computeMods(s);
  const unlocked = prestigeUnlocked(s);
  const gain = prestigeGain(s);
  const next = nextFragmentAt(s);
  const ready = canPrestige(s);
  const p = BALANCE.prestige;
  const orders = s.stats.runScrap > 0 ? Math.log10(s.stats.runScrap) : 0;
  const passiveNow = s.prestige.fragmentsTotal * m.fragmentBonus;
  const passiveAfter = (s.prestige.fragmentsTotal + gain) * m.fragmentBonus;

  return (
    <Panel title="Reiniciar el núcleo" icon="core" className="view core-view" right={<span className="muted">Reinicios: {s.prestige.resets}</span>}>
      <div className="core-hero">
        <div className={`core-orb ${ready ? 'ready' : ''}`} aria-hidden="true">
          <span />
        </div>
        <div className="core-numbers">
          <span className="eyebrow">Fragmentos al reiniciar ahora</span>
          <strong className="core-gain">+{fmt(gain)}</strong>
          <div className="core-next">
            <Bar value={orders} max={Math.log10(Math.max(10, next))} tone="coral" label="Progreso al siguiente fragmento" />
            <span>
              Siguiente fragmento con {fmt(next)} de chatarra en el ciclo (llevas {fmt(s.stats.runScrap)})
            </span>
          </div>
          <p className="formula">
            Fragmentos = ⌊ (log₁₀(chatarra del ciclo) − {p.log10Threshold})<sup>{p.exponent}</sup> × {m.fragmentGain.toFixed(2)} ⌋
            {orders > p.log10Threshold && (
              <>
                {' '}
                = ⌊ ({orders.toFixed(2)} − {p.log10Threshold})<sup>{p.exponent}</sup> × {m.fragmentGain.toFixed(2)} ⌋ = {gain}
              </>
            )}
          </p>
          <p className="muted small">
            Cada orden de magnitud de chatarra recuperada aporta más fragmentos que el anterior. Cada fragmento obtenido en total suma +{Math.round(m.fragmentBonus * 100)} % de
            producción para siempre, aunque lo gastes. Ahora: +{Math.round(passiveNow * 100)} % → tras reiniciar: +{Math.round(passiveAfter * 100)} %.
          </p>
        </div>
      </div>

      {!unlocked && (
        <p className="callout">
          <Icon name="lock" size={14} /> Investiga «Acceso al núcleo» para poder reiniciar. Mientras tanto, la previsión de arriba te dice cuánto ganarías.
        </p>
      )}

      {unlocked && !confirming && (
        <button type="button" className={`prestige-btn ${ready ? '' : 'disabled'}`} aria-disabled={!ready} onClick={() => ready && setConfirming(true)}>
          {ready ? `REINICIAR EL NÚCLEO (+${gain} fragmentos)` : `Necesitas al menos 1 fragmento (${fmt(next)} de chatarra en el ciclo)`}
        </button>
      )}

      {confirming && (
        <div className="confirm-box" role="alertdialog" aria-labelledby="confirm-title">
          <h3 id="confirm-title">¿Reiniciar el núcleo?</h3>
          <div className="keep-lose">
            <div>
              <h4 className="lose">Se pierde</h4>
              <ul>
                {PRESTIGE_RULES.lost.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="keep">Se conserva</h4>
              <ul>
                {PRESTIGE_RULES.kept.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="muted small">Ciclo actual: {fmtTime(s.stats.runTime)}. Recibirás +{gain} fragmentos y podrás gastarlos en las mejoras de abajo.</p>
          <div className="run-actions">
            <button
              type="button"
              className="prestige-btn"
              onClick={() => {
                const g = store.act((gs, rt) => doPrestige(gs, rt));
                if (g > 0) {
                  sfx.prestige();
                  onPrestige();
                }
                setConfirming(false);
              }}
            >
              Confirmar reinicio
            </button>
            <button type="button" className="ghost-btn" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <h3 className="section-title">
        Mejoras del núcleo <span className="muted">· {fmt(s.prestige.fragments)} fragmentos disponibles</span>
      </h3>
      <div className="core-grid">
        {CORE_UPGRADES.map((c) => {
          const lvl = s.prestige.core[c.id] ?? 0;
          const cost = coreCost(s, c.id);
          const maxed = cost === null;
          const ok = !maxed && s.prestige.fragments >= cost;
          return (
            <button
              key={c.id}
              type="button"
              className={`core-up ${maxed ? 'maxed' : ok ? 'ready' : 'disabled'}`}
              aria-disabled={!ok}
              onClick={() => {
                if (store.act((gs, rt) => buyCore(gs, rt, c.id))) sfx.research();
                else sfx.error();
              }}
            >
              <div className="upgrade-top">
                <strong>{c.name}</strong>
                <span className="core-cost">
                  {maxed ? 'MÁX' : (
                    <>
                      <Icon name="core" size={13} /> {cost}
                    </>
                  )}
                </span>
              </div>
              <span className="level-line">
                Nivel {lvl}/{c.maxLevel}
              </span>
              <ul>
                {c.effects.map((e, i) => (
                  <li key={i}>{describeEffect(e, Math.max(1, lvl))}</li>
                ))}
              </ul>
              <em>{c.flavor}</em>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
