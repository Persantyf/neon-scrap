// Efectos de sonido sintetizados con WebAudio: sin archivos externos.

let ctx: AudioContext | null = null;
let muted = false;
let lastClick = 0;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t0 + dur);
  const v = opts.vol ?? 0.08;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.05, freq = 1200) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

export const sfx = {
  click() {
    const now = performance.now();
    if (now - lastClick < 40) return;
    lastClick = now;
    tone(520 + Math.random() * 80, 0.06, { type: 'triangle', vol: 0.05, slide: 0.6 });
    noise(0.04, 0.025, 2400);
  },
  buy() {
    tone(440, 0.08, { type: 'square', vol: 0.035 });
    tone(660, 0.1, { type: 'square', vol: 0.03, delay: 0.05 });
  },
  build() {
    tone(220, 0.15, { type: 'sawtooth', vol: 0.04, slide: 2 });
    noise(0.12, 0.04, 800);
  },
  research() {
    [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'sine', vol: 0.06, delay: i * 0.07 }));
  },
  overload() {
    tone(110, 0.7, { type: 'sawtooth', vol: 0.06, slide: 4 });
    tone(220, 0.6, { type: 'square', vol: 0.03, slide: 3, delay: 0.05 });
  },
  achievement() {
    [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.05, delay: i * 0.08 }));
  },
  mission() {
    tone(784, 0.12, { type: 'triangle', vol: 0.05 });
    tone(1175, 0.2, { type: 'triangle', vol: 0.05, delay: 0.09 });
  },
  module() {
    [392, 523, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'sine', vol: 0.06, delay: i * 0.06 }));
  },
  expedition() {
    noise(0.5, 0.05, 400);
    tone(180, 0.5, { type: 'sine', vol: 0.05, slide: 2.5 });
  },
  bad() {
    tone(160, 0.25, { type: 'sawtooth', vol: 0.05, slide: 0.5 });
    noise(0.2, 0.06, 300);
  },
  error() {
    tone(140, 0.12, { type: 'square', vol: 0.03 });
  },
  prestige() {
    tone(80, 1.6, { type: 'sawtooth', vol: 0.07, slide: 8 });
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.05, delay: 0.6 + i * 0.1 }));
  },
};
