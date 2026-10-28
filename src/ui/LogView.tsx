import { useEffect, useRef } from 'react';
import { BALANCE } from '../game/balance';
import { ACHIEVEMENTS } from '../game/content/achievements';
import { fmt, fmtTime } from '../game/format';
import { computeMods } from '../game/modifiers';
import type { GameState, Runtime } from '../game/types';
import { Panel } from './common';
import { Icon } from './icons';

/** Gráfica de producción en escala logarítmica (canvas, sin dependencias). */
function ProductionChart({ s }: { s: GameState }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const h = s.stats.history;
  const last = h[h.length - 1];
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const series: { key: 'scrap' | 'alloys' | 'data'; color: string }[] = [
      { key: 'scrap', color: '#9fd8e6' },
      { key: 'alloys', color: '#ffb347' },
      { key: 'data', color: '#c58bff' },
    ];
    const all = h.flatMap((p) => series.map((x) => p[x.key])).filter((v) => v > 0);
    if (h.length < 2 || !all.length) {
      g.fillStyle = 'rgba(160,190,210,0.6)';
      g.font = '13px "IBM Plex Sans", sans-serif';
      g.fillText('Recopilando datos de producción…', 12, H / 2);
      return;
    }
    const lo = Math.floor(Math.log10(Math.max(1e-2, Math.min(...all))));
    const hi = Math.ceil(Math.log10(Math.max(...all)) + 0.01);
    const y = (v: number) => H - 14 - ((Math.log10(Math.max(v, Math.pow(10, lo))) - lo) / Math.max(1, hi - lo)) * (H - 28);
    const x = (i: number) => 8 + (i / Math.max(1, h.length - 1)) * (W - 16);
    g.strokeStyle = 'rgba(120,200,220,0.08)';
    g.fillStyle = 'rgba(160,190,210,0.5)';
    g.font = '10px "Chakra Petch", monospace';
    for (let e = lo; e <= hi; e++) {
      const yy = y(Math.pow(10, e));
      g.beginPath();
      g.moveTo(0, yy);
      g.lineTo(W, yy);
      g.stroke();
      g.fillText(fmt(Math.pow(10, e)), 4, yy - 2);
    }
    for (const sr of series) {
      g.strokeStyle = sr.color;
      g.lineWidth = 2;
      g.beginPath();
      let started = false;
      h.forEach((p, i) => {
        const v = p[sr.key];
        if (v <= 0) return;
        if (!started) g.moveTo(x(i), y(v));
        else g.lineTo(x(i), y(v));
        started = true;
      });
      g.stroke();
    }
  }, [h.length, last]);
  return <canvas ref={ref} className="chart" aria-label="Historial de producción" />;
}

export function LogView({ s, rt }: { s: GameState; rt: Runtime }) {
  const m = computeMods(s);
  const b = m.breakdown;
  const firstSample = s.stats.history.find((p) => p.scrap > 0);
  const growth = firstSample && firstSample.scrap > 0 ? rt.rates.scrap.prod / firstSample.scrap : 0;
  const rows: [string, string][] = [
    ['Tiempo de este ciclo', fmtTime(s.stats.runTime)],
    ['Tiempo total de juego', fmtTime(s.stats.totalTime)],
    ['Chatarra en este ciclo', fmt(s.stats.runScrap)],
    ['Chatarra total', fmt(s.stats.totalScrap)],
    ['Aleaciones totales', fmt(s.stats.totalAlloys)],
    ['Datos totales', fmt(s.stats.totalData, 1)],
    ['Recuperaciones manuales', fmt(s.stats.clicks)],
    ['Máquinas construidas', fmt(s.stats.machinesBuilt)],
    ['Pico de chatarra/s', fmt(s.stats.peakScrapRate, 1)],
    ['Sobrecargas activadas', fmt(s.overload.uses)],
    ['Expediciones completadas', fmt(s.expedition.completed)],
    ['Mejor ciclo', s.prestige.bestRunTime ? fmtTime(s.prestige.bestRunTime) : '—'],
  ];
  return (
    <Panel title="Registro de la estación" icon="log" className="view log-view">
      <div className="log-grid">
        <section className="chart-box">
          <h3 className="section-title">
            Producción por segundo <span className="muted">· últimos {Math.round((s.stats.history.length * BALANCE.history.sampleEvery) / 60)} min</span>
          </h3>
          <ProductionChart s={s} />
          <div className="chart-legend">
            <span className="res-scrap">● Chatarra</span>
            <span className="res-alloys">● Aleaciones</span>
            <span className="res-data">● Datos</span>
            {growth > 0 && <strong>Producción ×{growth >= 100 ? fmt(growth) : growth.toFixed(1)} desde el inicio del registro</strong>}
          </div>
        </section>
        <section>
          <h3 className="section-title">Multiplicadores</h3>
          <table className="mult-table">
            <tbody>
              <tr><td>Logros ({s.achievements.length})</td><td>×{b.achievements.toFixed(2)}</td></tr>
              <tr><td>Fragmentos totales ({s.prestige.fragmentsTotal})</td><td>×{b.fragments.toFixed(2)}</td></tr>
              <tr><td>Mejoras del núcleo</td><td>×{b.core.toFixed(2)}</td></tr>
              <tr><td>Módulos equipados</td><td>×{b.modules.toFixed(2)}</td></tr>
              <tr><td>Investigación</td><td>×{b.research.toFixed(2)}</td></tr>
              <tr className="total"><td>Global</td><td>×{m.global.toFixed(2)}</td></tr>
              <tr><td>Drones (mejoras y niveles)</td><td>×{fmt(m.machineOut.drone, 2)}</td></tr>
              <tr><td>Sobrecarga</td><td>×{m.overloadMult} · {m.overloadDuration} s</td></tr>
            </tbody>
          </table>
          <h3 className="section-title">Estadísticas</h3>
          <dl className="stats">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <h3 className="section-title">
        Logros <span className="muted">· {s.achievements.length}/{ACHIEVEMENTS.length} · +{Math.round(BALANCE.achievementBonus * 100)} % de producción cada uno</span>
      </h3>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const got = s.achievements.includes(a.id);
          return (
            <div key={a.id} className={`ach ${got ? 'got' : ''}`} title={got || !a.secret ? a.desc : 'Logro secreto'}>
              <Icon name={got ? 'trophy' : 'lock'} size={16} />
              <div>
                <strong>{got || !a.secret ? a.name : '???'}</strong>
                <span>{got || !a.secret ? a.desc : 'Logro secreto'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
