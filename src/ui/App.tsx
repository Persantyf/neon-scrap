import { useCallback, useEffect, useRef, useState } from 'react';
import { researchCost, researchStatus } from '../game/actions';
import { SECTORS } from '../game/content/expeditions';
import { MODULE_BY_ID } from '../game/content/modules';
import { RESEARCH } from '../game/content/research';
import { launchCheck } from '../game/expeditions';
import { canAfford } from '../game/formulas';
import { canPrestige } from '../game/prestige';
import type { GameEvent } from '../game/types';
import { setMuted, sfx } from './audio';
import { CoreView } from './CoreView';
import { ExpeditionView } from './ExpeditionView';
import { Icon } from './icons';
import { LogView } from './LogView';
import { ModulesView } from './ModulesView';
import { Banner, OfflineModal, SettingsModal, Starfield, Toasts, toastFor, type Toast } from './Overlays';
import { ResearchView } from './ResearchView';
import { Station } from './Station';
import { GrowthStrip, MissionCard, OverloadButton, StationAlerts } from './StationHud';
import { useGame, store } from './store';
import { TopBar } from './TopBar';
import { Workshop } from './Workshop';

type View = 'station' | 'workshop' | 'research' | 'expeditions' | 'modules' | 'core' | 'log';

const NAV: { id: View; label: string; short?: string; icon: string; mobileOnly?: boolean }[] = [
  { id: 'station', label: 'Estación', icon: 'station' },
  { id: 'workshop', label: 'Taller', icon: 'workshop', mobileOnly: true },
  { id: 'research', label: 'Investigación', short: 'Ciencia', icon: 'research' },
  { id: 'expeditions', label: 'Expediciones', short: 'Explorar', icon: 'expedition' },
  { id: 'modules', label: 'Módulos', icon: 'modules' },
  { id: 'core', label: 'Núcleo', icon: 'core' },
  { id: 'log', label: 'Registro', icon: 'log' },
];

const MILESTONE_BUILDS = new Set(['foundry', 'lab', 'fabricator', 'reactor', 'harvester']);

function useIsMobile() {
  const q = '(max-width: 960px)';
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

export function App() {
  const { s, rt } = useGame();
  const mobile = useIsMobile();
  const [view, setView] = useState<View>('station');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<{ id: number; title: string; text?: string } | null>(null);
  const toastId = useRef(1);

  useEffect(() => setMuted(s.settings.muted), [s.settings.muted]);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = toastId.current++;
    setToasts((list) => {
      if (t.kind === 'error' && list.some((x) => x.kind === 'error' && x.title === t.title && x.text === t.text)) return list;
      return [...list.slice(-3), { ...t, id }];
    });
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.kind === 'error' ? 2600 : 4200);
  }, []);

  useEffect(() => {
    store.start();
    if (store.loadError) pushToast({ kind: 'error', title: 'Partida dañada', text: `${store.loadError} Se ha guardado una copia aparte y empiezas de nuevo.` });
    return () => store.stop();
  }, [pushToast]);

  const showBanner = useCallback((title: string, text?: string) => {
    const id = Date.now();
    setBanner({ id, title, text });
    window.setTimeout(() => setBanner((b) => (b && b.id === id ? null : b)), 2800);
  }, []);

  useEffect(
    () =>
      store.onEvents((events: GameEvent[]) => {
        for (const e of events) {
          const t = toastFor(e);
          if (t) pushToast(t);
          if (e.type === 'achievement') sfx.achievement();
          if (e.type === 'mission') sfx.mission();
          if (e.type === 'unlock') sfx.research();
          if (e.type === 'firstBuild' && e.id && MILESTONE_BUILDS.has(e.id)) showBanner(e.title, 'Nueva instalación en la estación');
          if (e.type === 'research' && e.id === 'core_access') showBanner('ACCESO AL NÚCLEO', 'Ya puedes reiniciar el núcleo');
          if (e.type === 'research' && e.id === 'radar') showBanner('RADAR EN LÍNEA', 'Las expediciones están disponibles');
          if (e.type === 'module' && e.id && MODULE_BY_ID[e.id]?.rarity === 'legendary') showBanner('MÓDULO LEGENDARIO', MODULE_BY_ID[e.id].name);
          if (e.type === 'prestige') showBanner(e.title, e.text);
        }
      }),
    [pushToast, showBanner],
  );

  // Indicadores de navegación: algo útil espera en esa pestaña.
  const badges: Partial<Record<View, boolean>> = {
    research: RESEARCH.some((r) => researchStatus(s, r.id) === 'available' && canAfford(s.resources, researchCost(s, r.id))),
    expeditions: !!s.expedition.run || SECTORS.some((x) => launchCheck(s, x.id).ok),
    core: canPrestige(s),
  };

  const overload = s.overload.remaining > 0;
  const showStation = !mobile || view === 'station';
  const sheet =
    view === 'research' ? (
      <ResearchView s={s} rt={rt} />
    ) : view === 'expeditions' ? (
      <ExpeditionView s={s} rt={rt} />
    ) : view === 'modules' ? (
      <ModulesView s={s} />
    ) : view === 'core' ? (
      <CoreView s={s} onPrestige={() => setView('station')} />
    ) : view === 'log' ? (
      <LogView s={s} rt={rt} />
    ) : view === 'workshop' && mobile ? (
      <Workshop s={s} rt={rt} />
    ) : null;

  return (
    <div className={`app ${s.settings.reducedMotion ? 'reduced-motion' : ''} ${overload ? 'overload-on' : ''}`}>
      <Starfield reducedMotion={s.settings.reducedMotion} />
      <TopBar
        s={s}
        rt={rt}
        onSettings={() => setSettingsOpen(true)}
        onToggleMute={() =>
          store.act((gs) => {
            gs.settings.muted = !gs.settings.muted;
          })
        }
      />
      <div className="layout">
        <nav className="rail" aria-label="Secciones">
          {NAV.filter((n) => !n.mobileOnly || mobile).map((n) => (
            <button
              key={n.id}
              type="button"
              className={`rail-btn ${view === n.id ? 'on' : ''}`}
              aria-current={view === n.id ? 'page' : undefined}
              onClick={() => setView(n.id)}
            >
              <Icon name={n.icon} size={20} />
              <span>{mobile ? (n.short ?? n.label) : n.label}</span>
              {badges[n.id] && <i className="dot" aria-label="Novedad" />}
            </button>
          ))}
        </nav>

        <main className="center">
          {showStation && (
            <div className={`stage ${sheet && !mobile ? 'dimmed' : ''}`}>
              <div className="stage-top">
                <MissionCard s={s} />
                <StationAlerts s={s} rt={rt} />
              </div>
              <Station s={s} reducedMotion={s.settings.reducedMotion} />
              <div className="stage-bottom">
                <OverloadButton s={s} />
                <GrowthStrip s={s} rt={rt} />
              </div>
            </div>
          )}
          {sheet && (
            <div className="sheet">
              {!mobile && (
                <button type="button" className="sheet-close" onClick={() => setView('station')} aria-label="Volver a la estación">
                  <Icon name="close" size={16} /> Estación
                </button>
              )}
              {sheet}
            </div>
          )}
        </main>

        {!mobile && (
          <aside className="side" aria-label="Taller">
            <Workshop s={s} rt={rt} />
          </aside>
        )}
      </div>

      <Toasts toasts={toasts} />
      <Banner banner={banner} />
      {store.offlineReport && <OfflineModal report={store.offlineReport} onClose={() => store.dismissOffline()} />}
      {settingsOpen && <SettingsModal s={s} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
