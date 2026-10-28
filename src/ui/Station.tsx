import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { recoverScrap } from '../game/actions';
import { fmt } from '../game/format';
import { clickValue } from '../game/simulation';
import type { GameState, MachineId } from '../game/types';
import { sfx } from './audio';
import { store } from './store';

interface Float {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const SOLAR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const MODULE_ANGLES = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

/** Cantidad de piezas visibles según unidades: crece rápido al principio y luego despacio. */
const visual = (n: number, per: number, max: number) => (n <= 0 ? 0 : Math.min(max, 1 + Math.floor((n - 1) / per)));

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)] as const;
};

function SolarArm({ angle, panels }: { angle: number; panels: number }) {
  const len = 34 + panels * 26;
  return (
    <g transform={`rotate(${angle})`}>
      <line x1={0} y1={-62} x2={0} y2={-62 - len} className="truss" />
      {Array.from({ length: panels }, (_, i) => (
        <g key={i} transform={`translate(0 ${-88 - i * 26})`}>
          <g className="pop">
            <rect x={-22} y={-9} width={18} height={18} rx={1.5} className="panel" />
            <rect x={4} y={-9} width={18} height={18} rx={1.5} className="panel" />
            <line x1={-22} y1={0} x2={22} y2={0} className="panel-line" />
          </g>
        </g>
      ))}
    </g>
  );
}

function ModuleBlock({ kind, angle, r }: { kind: 'sorter' | 'foundry' | 'lab'; angle: number; r: number }) {
  const [x, y] = polar(r, angle);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle})`}>
      <g className="pop">
        {kind === 'foundry' && (
          <>
            <rect x={-13} y={-11} width={26} height={22} rx={3} className="foundry" />
            <rect x={-7} y={-5} width={14} height={8} rx={2} className="foundry-glow" />
          </>
        )}
        {kind === 'sorter' && (
          <>
            <circle r={9} className="sorter" />
            <g className="spin-fast">
              <path d="M-6 0H6M0 -6V6" className="sorter-blade" />
            </g>
          </>
        )}
        {kind === 'lab' && (
          <>
            <path d="M-12 6 A12 12 0 0 1 12 6 Z" className="lab" />
            <circle cx={0} cy={-1} r={2.5} className="lab-light" />
          </>
        )}
      </g>
    </g>
  );
}

const sameArt = (
  a: { counts: Record<MachineId, number>; overload: boolean; pulse: number },
  b: { counts: Record<MachineId, number>; overload: boolean; pulse: number },
) =>
  a.overload === b.overload &&
  a.pulse === b.pulse &&
  (Object.keys(a.counts) as MachineId[]).every((k) => a.counts[k] === b.counts[k]);

const StationArt = memo(function StationArt({
  counts,
  overload,
  pulse,
}: {
  counts: Record<MachineId, number>;
  overload: boolean;
  pulse: number;
}) {
  const arms = visual(counts.solar, 3, 8);
  const panelsPerArm = Math.min(4, Math.ceil(counts.solar / Math.max(1, arms) / 2));
  const sorters = visual(counts.sorter, 3, 8);
  const foundries = visual(counts.foundry, 3, 8);
  const labs = visual(counts.lab, 3, 8);
  const fabSegs = visual(counts.fabricator, 1, 16);
  const drones = Math.min(42, counts.drone);
  const harvesters = visual(counts.harvester, 2, 6);
  const reactor = counts.reactor > 0;
  const orbits = [
    { r: 168, n: Math.min(14, drones), cls: 'spin-a' },
    { r: 200, n: Math.min(14, Math.max(0, drones - 14)), cls: 'spin-b' },
    { r: 232, n: Math.max(0, drones - 28), cls: 'spin-c' },
  ];

  return (
    <svg viewBox="-320 -320 640 640" className={`station-svg ${overload ? 'is-overload' : ''}`} aria-hidden="true">
      <defs>
        <radialGradient id="coreGlow">
          <stop offset="0%" stopColor="var(--core-hot)" stopOpacity="1" />
          <stop offset="45%" stopColor="var(--core)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--core)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hullGrad" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3c52" />
          <stop offset="100%" stopColor="#101a28" />
        </linearGradient>
        <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d7bd6" />
          <stop offset="100%" stopColor="#163565" />
        </linearGradient>
      </defs>

      {/* Anillos orbitales */}
      <g className="spin-slow">
        <circle r={168} className="orbit" />
        <circle r={232} className="orbit orbit-faint" />
      </g>
      <g className="spin-rev">
        <circle r={200} className="orbit orbit-dash" />
        {counts.harvester > 0 && <circle r={276} className="orbit orbit-faint" />}
      </g>

      {/* Arrastreros */}
      {harvesters > 0 && (
        <g className="spin-harv">
          {Array.from({ length: harvesters }, (_, i) => {
            const [x, y] = polar(276, (360 / harvesters) * i);
            return (
              <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(360 / harvesters) * i + 90})`}>
                <g className="pop">
                  <path d="M-14 0 L-6 -7 H8 L14 0 L8 7 H-6 Z" className="harvester" />
                  <path d="M-14 0 L-30 -14 M-14 0 L-30 14" className="harvester-net" />
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* Paneles solares */}
      {SOLAR_ANGLES.slice(0, arms).map((a) => (
        <SolarArm key={a} angle={a} panels={Math.max(1, panelsPerArm)} />
      ))}

      {/* Anillo de fabricación */}
      {fabSegs > 0 && (
        <g className="spin-fab">
          {Array.from({ length: fabSegs }, (_, i) => {
            const a0 = (360 / 16) * i;
            const [x1, y1] = polar(136, a0 + 2);
            const [x2, y2] = polar(136, a0 + 20);
            return <path key={i} d={`M${x1} ${y1} A136 136 0 0 1 ${x2} ${y2}`} className="fab-seg pop" />;
          })}
        </g>
      )}

      {/* Casco central */}
      <polygon
        points={Array.from({ length: 8 }, (_, i) => polar(64, i * 45 + 22.5).map((v) => v.toFixed(1)).join(',')).join(' ')}
        className="hull"
      />
      <circle r={48} className="hull-ring" />

      {/* Módulos acoplados */}
      {MODULE_ANGLES.slice(0, sorters).map((a) => (
        <ModuleBlock key={`s${a}`} kind="sorter" angle={a} r={76} />
      ))}
      {MODULE_ANGLES.slice(0, foundries).map((a) => (
        <ModuleBlock key={`f${a}`} kind="foundry" angle={a} r={106} />
      ))}
      {MODULE_ANGLES.slice(0, labs).map((a) => (
        <ModuleBlock key={`l${a}`} kind="lab" angle={a} r={134} />
      ))}

      {/* Núcleo */}
      <circle r={reactor ? 70 : 52} fill="url(#coreGlow)" className="core-glow" />
      {reactor && (
        <g className="spin-fast">
          <ellipse rx={38} ry={12} className="reactor-ring" />
          <ellipse rx={38} ry={12} transform="rotate(60)" className="reactor-ring" />
          <ellipse rx={38} ry={12} transform="rotate(-60)" className="reactor-ring" />
        </g>
      )}
      <circle r={20} className="core" />
      <circle r={9} className="core-heart" />

      {/* Drones */}
      {orbits.map((o) =>
        o.n > 0 ? (
          <g key={o.r} className={o.cls}>
            {Array.from({ length: o.n }, (_, i) => {
              const [x, y] = polar(o.r, (360 / o.n) * i);
              return (
                <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(360 / o.n) * i})`}>
                  <path d="M0 -5 L4 4 L0 2 L-4 4 Z" className="drone pop" />
                </g>
              );
            })}
          </g>
        ) : null,
      )}

      {pulse > 0 && <circle key={pulse} r={60} className="build-pulse" />}
    </svg>
  );
}, sameArt);

export function Station({ s, reducedMotion }: { s: GameState; reducedMotion: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const [pulse, setPulse] = useState(0);
  const [hit, setHit] = useState(0);
  const nextId = useRef(1);

  // Pulso visual al construir
  useEffect(
    () =>
      store.onEvents((evs) => {
        if (evs.some((e) => e.type === 'build' || e.type === 'firstBuild' || e.type === 'upgrade')) setPulse((p) => p + 1);
      }),
    [],
  );

  // Bucle de partículas (solo mientras haya chispas vivas)
  const raf = useRef(0);
  const tick = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    sparks.current = sparks.current.filter((p) => p.life > 0);
    for (const p of sparks.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.03;
      g.globalAlpha = Math.max(0, p.life);
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, 1.2 + p.life * 1.8, 0, Math.PI * 2);
      g.fill();
    }
    if (sparks.current.length) raf.current = requestAnimationFrame(tick);
    else raf.current = 0;
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const burst = (x: number, y: number, n: number) => {
    if (reducedMotion) return;
    const colors = ['#3ff0d8', '#9fd8e6', '#ffb347'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1 + Math.random() * 3.5;
      sparks.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7 + Math.random() * 0.3, color: colors[i % 3] });
    }
    if (sparks.current.length > 260) sparks.current.splice(0, sparks.current.length - 260);
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };

  const onRecover = (clientX?: number, clientY?: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = clientX !== undefined ? clientX - rect.left : rect.width / 2 + (Math.random() - 0.5) * 60;
    const y = clientY !== undefined ? clientY - rect.top : rect.height / 2 + (Math.random() - 0.5) * 60;
    const v = store.act((st, rt) => recoverScrap(st, rt));
    sfx.click();
    burst(x, y, 10);
    setHit((h) => h + 1);
    const id = nextId.current++;
    setFloats((f) => [...f.slice(-10), { id, x, y, text: `+${fmt(v, 1)}` }]);
    window.setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 950);
  };

  const counts = Object.fromEntries(Object.entries(s.machines).map(([k, v]) => [k, v.count])) as Record<MachineId, number>;

  return (
    <div className="station-area">
      <div
        ref={wrapRef}
        className={`station-wrap ${hit % 2 ? 'hit-a' : hit ? 'hit-b' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Recuperar chatarra pulsando la estación"
        onPointerDown={(e) => {
          if (e.button === 0) onRecover(e.clientX, e.clientY);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRecover();
          }
        }}
      >
        <StationArt counts={counts} overload={s.overload.remaining > 0} pulse={pulse} />
        <canvas ref={canvasRef} className="spark-canvas" />
        {floats.map((f) => (
          <span key={f.id} className="float-num" style={{ left: f.x, top: f.y }}>
            {f.text}
          </span>
        ))}
      </div>
      <button type="button" className="recover-btn" onClick={() => onRecover()}>
        <span className="recover-label">RECUPERAR</span>
        <span className="recover-value">+{fmt(clickValue(s, store.rt), 1)} chatarra</span>
      </button>
    </div>
  );
}
