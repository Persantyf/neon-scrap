import { useEffect, useRef, useState } from 'react';
import { BALANCE } from '../game/balance';
import { RESOURCE_INFO, fmt, fmtTime } from '../game/format';
import type { OfflineReport } from '../game/save';
import type { GameEvent, GameState, ResourceId } from '../game/types';
import { Icon } from './icons';
import { store } from './store';

/* ---------- Notificaciones ---------- */

export interface Toast {
  id: number;
  kind: string;
  title: string;
  text?: string;
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <strong>{t.title}</strong>
          {t.text && <span>{t.text}</span>}
        </div>
      ))}
    </div>
  );
}

export function Banner({ banner }: { banner: { id: number; title: string; text?: string } | null }) {
  if (!banner) return null;
  return (
    <div key={banner.id} className="banner" aria-live="assertive">
      <div className="banner-inner">
        <span className="banner-line" />
        <strong>{banner.title}</strong>
        {banner.text && <span>{banner.text}</span>}
        <span className="banner-line" />
      </div>
    </div>
  );
}

/** Traduce eventos del juego a notificaciones breves (sin saturar). */
export function toastFor(e: GameEvent): { kind: string; title: string; text?: string } | null {
  switch (e.type) {
    case 'achievement':
      return { kind: 'achievement', title: e.title, text: e.text };
    case 'mission':
      return { kind: 'mission', title: e.title, text: e.text };
    case 'unlock':
      return { kind: 'unlock', title: e.title, text: e.text };
    case 'firstBuild':
      return { kind: 'unlock', title: e.title };
    case 'research':
      return { kind: 'research', title: e.title };
    case 'module':
      return { kind: 'module', title: e.title, text: e.text };
    case 'expedition':
      return { kind: 'expedition', title: e.title, text: e.text };
    case 'error':
      return { kind: 'error', title: e.title, text: e.text };
    default:
      return null;
  }
}

/* ---------- Modal genérico ---------- */

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="panel-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Resumen offline ---------- */

export function OfflineModal({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  const entries = (Object.entries(report.gained) as [ResourceId, number][]).filter(([, v]) => Math.abs(v) >= 1);
  return (
    <Modal title="Bienvenido de vuelta" onClose={onClose}>
      <p>
        Has estado fuera <strong>{fmtTime(report.seconds)}</strong>.
        {report.capped && <> Se contabilizan como máximo {fmtTime(BALANCE.offlineCapSeconds)}.</>}
      </p>
      <div className="offline-gains">
        {entries.length ? (
          entries.map(([r, v]) => (
            <div key={r} className={`res-${r}`}>
              <Icon name={r} size={18} />
              <span>{RESOURCE_INFO[r].name}</span>
              <strong>
                {v >= 0 ? '+' : '−'}
                {fmt(Math.abs(v))}
              </strong>
            </div>
          ))
        ) : (
          <p className="muted">La estación no tenía máquinas produciendo.</p>
        )}
      </div>
      <p className="muted small">
        Cálculo: se han simulado {fmtTime(report.cappedSeconds)} en {fmt(report.steps)} pasos de {report.stepSeconds} s con las mismas reglas que en juego (energía,
        consumo de las cadenas y baterías). Los valores negativos indican recursos que tus máquinas han consumido. La Sobrecarga no se activa sola y las expediciones esperan tu
        decisión, pero los enfriamientos y reparaciones sí avanzan.
      </p>
      <button type="button" className="primary-btn" onClick={onClose}>
        Continuar
      </button>
    </Modal>
  );
}

/* ---------- Ajustes y partida ---------- */

export function SettingsModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const text = store.exportText();
    setExported(text);
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-scrap-partida-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: 'Partida exportada a un archivo JSON. También la tienes abajo para copiar.' });
    } catch {
      setMsg({ ok: true, text: 'Copia el texto de abajo para guardar tu partida.' });
    }
  };

  const doImport = (text: string) => {
    try {
      store.importText(text);
      setMsg({ ok: true, text: 'Partida importada y validada correctamente.' });
      setImportText('');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo importar.' });
    }
  };

  return (
    <Modal title="Ajustes y partida" onClose={onClose} wide>
      <div className="settings-grid">
        <section>
          <h3 className="section-title">Accesibilidad y sonido</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={s.settings.reducedMotion}
              onChange={(e) =>
                store.act((gs) => {
                  gs.settings.reducedMotion = e.target.checked;
                })
              }
            />
            <span>Reducir animaciones y partículas</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={s.settings.muted}
              onChange={(e) =>
                store.act((gs) => {
                  gs.settings.muted = e.target.checked;
                })
              }
            />
            <span>Silenciar efectos de sonido</span>
          </label>
          <h3 className="section-title">Guardado</h3>
          <p className="muted small">
            La partida se guarda sola cada {BALANCE.autosaveSeconds} s, al cambiar de pestaña y tras acciones importantes. Último guardado:{' '}
            {new Date(s.lastSaved).toLocaleTimeString('es-ES')}.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => setMsg(store.save() ? { ok: true, text: 'Partida guardada.' } : { ok: false, text: 'El navegador no permite guardar (¿modo privado?).' })}
            >
              Guardar ahora
            </button>
            <button type="button" className="ghost-btn" onClick={doExport}>
              Exportar JSON
            </button>
          </div>
          {exported && <textarea className="save-text" readOnly value={exported} onFocus={(e) => e.currentTarget.select()} aria-label="Partida exportada" />}
        </section>
        <section>
          <h3 className="section-title">Importar partida</h3>
          <textarea
            className="save-text"
            placeholder="Pega aquí el JSON de una partida exportada…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            aria-label="Texto de la partida a importar"
          />
          <div className="btn-row">
            <button type="button" className={`primary-btn ${importText.trim() ? '' : 'disabled'}`} aria-disabled={!importText.trim()} onClick={() => importText.trim() && doImport(importText)}>
              Importar texto
            </button>
            <button type="button" className="ghost-btn" onClick={() => fileRef.current?.click()}>
              Desde archivo…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) doImport(await f.text());
                e.target.value = '';
              }}
            />
          </div>
          <h3 className="section-title danger-title">Zona peligrosa</h3>
          {!confirmDelete ? (
            <button type="button" className="danger-btn" onClick={() => setConfirmDelete(true)}>
              Borrar la partida…
            </button>
          ) : (
            <div className="confirm-box">
              <p>Se borrará todo, incluidos fragmentos, módulos y logros. No se puede deshacer. Exporta antes si quieres conservarla.</p>
              <div className="btn-row">
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => {
                    store.hardReset();
                    setConfirmDelete(false);
                    setMsg({ ok: true, text: 'Partida borrada. Empiezas de cero.' });
                  }}
                >
                  Sí, borrar definitivamente
                </button>
                <button type="button" className="ghost-btn" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      {msg && <p className={`form-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</p>}
    </Modal>
  );
}

/* ---------- Fondo estelar ---------- */

export function Starfield({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    let raf = 0;
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.2 + Math.random() * 0.8,
      tw: Math.random() * Math.PI * 2,
    }));
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const W = window.innerWidth;
      const H = window.innerHeight;
      g.clearRect(0, 0, W, H);
      for (const st of stars) {
        if (!reducedMotion) {
          st.x -= dt * 0.004 * st.z;
          if (st.x < 0) st.x += 1;
          st.tw += dt * (0.5 + st.z);
        }
        const a = 0.25 + 0.45 * st.z * (0.75 + 0.25 * Math.sin(st.tw));
        g.fillStyle = st.z > 0.85 ? `rgba(255,214,170,${a})` : `rgba(170,230,255,${a})`;
        g.fillRect(st.x * W, st.y * H, st.z * 1.6, st.z * 1.6);
      }
      if (!reducedMotion && !document.hidden) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      if (!document.hidden && !reducedMotion) {
        cancelAnimationFrame(raf);
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reducedMotion]);
  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
