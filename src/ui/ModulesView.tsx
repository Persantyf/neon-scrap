import { equipModule, unequipModule } from '../game/actions';
import { BALANCE } from '../game/balance';
import { MODULES, RARITY_INFO } from '../game/content/modules';
import { describeEffect } from '../game/effects';
import { computeMods } from '../game/modifiers';
import type { GameState } from '../game/types';
import { sfx } from './audio';
import { Panel } from './common';
import { Icon } from './icons';
import { store } from './store';

export function ModulesView({ s }: { s: GameState }) {
  const slots = computeMods(s).slots;
  const ownedCount = Object.keys(s.modules.owned).length;
  return (
    <Panel
      title="Módulos raros"
      icon="modules"
      className="view modules-view"
      right={
        <span className="muted">
          Ranuras {s.modules.equipped.length}/{slots} · Colección {ownedCount}/{MODULES.length}
        </span>
      }
    >
      <p className="callout">
        Los módulos se consiguen en expediciones. Solo los equipados tienen efecto. Los duplicados suben su nivel (máx. {BALANCE.modules.maxLevel}). Se conservan al
        reiniciar el núcleo.
      </p>
      <div className="slots">
        {Array.from({ length: slots }, (_, i) => {
          const id = s.modules.equipped[i];
          const def = MODULES.find((m) => m.id === id);
          return (
            <div key={i} className={`slot ${def ? 'filled' : ''}`} style={def ? { ['--accent' as string]: RARITY_INFO[def.rarity].color } : undefined}>
              {def ? (
                <>
                  <strong>{def.name}</strong>
                  <span>Nv {s.modules.owned[def.id]}</span>
                </>
              ) : (
                <span className="muted">Ranura libre</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="module-grid">
        {MODULES.map((def) => {
          const lvl = s.modules.owned[def.id] ?? 0;
          const equipped = s.modules.equipped.includes(def.id);
          const rarity = RARITY_INFO[def.rarity];
          if (!lvl)
            return (
              <article key={def.id} className="module unknown" style={{ ['--accent' as string]: rarity.color }}>
                <Icon name="lock" size={16} />
                <strong>Módulo {rarity.name.toLowerCase()} sin descubrir</strong>
                <span className="muted">{def.rarity === 'legendary' ? 'Solo en sectores profundos.' : 'Explora para encontrarlo.'}</span>
              </article>
            );
          return (
            <article key={def.id} className={`module ${equipped ? 'equipped' : ''}`} style={{ ['--accent' as string]: rarity.color }}>
              <div className="module-top">
                <span className="rarity">{rarity.name}</span>
                <span className="pips">
                  {Array.from({ length: BALANCE.modules.maxLevel }, (_, i) => (
                    <i key={i} className={i < lvl ? 'on' : ''} />
                  ))}
                </span>
              </div>
              <strong>{def.name}</strong>
              <ul>
                {def.effects.map((e, i) => (
                  <li key={i}>{describeEffect(e, lvl)}</li>
                ))}
              </ul>
              <em>{def.flavor}</em>
              <button
                type="button"
                className={equipped ? 'ghost-btn' : 'primary-btn'}
                onClick={() => {
                  if (equipped) store.act((gs) => unequipModule(gs, def.id));
                  else if (store.act((gs, rt) => equipModule(gs, rt, def.id))) sfx.buy();
                  else sfx.error();
                }}
              >
                {equipped ? 'Retirar' : 'Equipar'}
              </button>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
