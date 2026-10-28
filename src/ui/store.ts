import { useSyncExternalStore } from 'react';
import { autobuyTick } from '../game/actions';
import { BALANCE } from '../game/balance';
import { checkProgress } from '../game/progression';
import { SAVE_KEY, SaveError, applyOffline, deserialize, serialize, type OfflineReport } from '../game/save';
import { advance } from '../game/simulation';
import { createInitialState, createRuntime } from '../game/state';
import type { GameEvent, GameState, Runtime } from '../game/types';

type Listener = () => void;
type EventListener = (events: GameEvent[]) => void;

/** Eventos tras los que conviene guardar en el momento. */
const IMPORTANT = new Set(['firstBuild', 'upgrade', 'research', 'prestige', 'module', 'expedition', 'achievement', 'mission']);

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export class GameStore {
  state: GameState;
  rt: Runtime;
  version = 0;
  offlineReport: OfflineReport | null = null;
  loadError: string | null = null;
  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private last = Date.now();
  private saveTimer = 0;

  constructor() {
    this.rt = createRuntime();
    this.state = this.load();
  }

  /* ---------- Persistencia ---------- */

  private load(): GameState {
    const ls = storage();
    const raw = ls?.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    try {
      const s = deserialize(raw);
      const elapsed = (Date.now() - s.lastSaved) / 1000;
      if (elapsed > BALANCE.offlineSummarySeconds) {
        this.offlineReport = applyOffline(s, this.rt, elapsed);
      } else if (elapsed > 0) {
        advance(s, this.rt, elapsed);
      }
      checkProgress(s, this.rt);
      return s;
    } catch (e) {
      // Conserva la partida dañada aparte para no perderla del todo.
      ls?.setItem(`${SAVE_KEY}:corrupta`, raw);
      this.loadError = e instanceof SaveError ? e.message : 'No se pudo cargar la partida guardada.';
      return createInitialState();
    }
  }

  save(): boolean {
    const ls = storage();
    if (!ls) return false;
    try {
      const now = Date.now();
      ls.setItem(SAVE_KEY, serialize(this.state, now));
      this.state.lastSaved = now;
      this.saveTimer = 0;
      return true;
    } catch {
      return false;
    }
  }

  exportText(): string {
    return serialize(this.state);
  }

  importText(text: string): void {
    const s = deserialize(text); // lanza SaveError si no es válida
    s.lastSaved = Date.now();
    this.state = s;
    this.rt = createRuntime();
    this.offlineReport = null;
    advance(this.state, this.rt, 0.1);
    checkProgress(this.state, this.rt);
    this.rt.events.length = 0;
    this.save();
    this.notify();
  }

  hardReset(): void {
    storage()?.removeItem(SAVE_KEY);
    const settings = { ...this.state.settings, buyAmount: 1 as const };
    this.state = createInitialState();
    this.state.settings = settings;
    this.rt = createRuntime();
    this.offlineReport = null;
    this.save();
    this.notify();
  }

  /* ---------- Bucle ---------- */

  start(): void {
    if (this.timer) return;
    this.last = Date.now();
    this.timer = setInterval(() => this.frame(), BALANCE.loopMs);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onHide);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onHide);
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.save();
    else this.frame();
  };

  private onHide = () => {
    this.save();
  };

  /**
   * Avanza según el tiempo real transcurrido, no según el número de llamadas: si el navegador
   * ralentiza la pestaña en segundo plano, el siguiente fotograma recupera todo el tiempo perdido.
   */
  frame(): void {
    const now = Date.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) return; // reloj hacia atrás: ignorar
    if (dt > BALANCE.offlineSummarySeconds) {
      this.offlineReport = applyOffline(this.state, this.rt, dt);
    } else {
      advance(this.state, this.rt, dt);
    }
    this.rt.checkTimer += dt;
    if (this.rt.checkTimer >= 0.25) {
      this.rt.checkTimer = 0;
      checkProgress(this.state, this.rt);
    }
    this.rt.autobuyTimer += dt;
    if (this.rt.autobuyTimer >= 1) {
      this.rt.autobuyTimer = 0;
      autobuyTick(this.state);
    }
    this.saveTimer += dt;
    if (this.saveTimer >= BALANCE.autosaveSeconds) this.save();
    this.flush();
  }

  /** Ejecuta una acción del jugador sobre el estado y refresca la UI. */
  act<T>(fn: (s: GameState, rt: Runtime) => T): T {
    const result = fn(this.state, this.rt);
    checkProgress(this.state, this.rt);
    this.flush();
    return result;
  }

  private flush(): void {
    const events = this.rt.events;
    if (events.length) {
      this.rt.events = [];
      if (events.some((e) => IMPORTANT.has(e.type))) this.save();
      for (const l of this.eventListeners) l(events);
    }
    this.notify();
  }

  notify(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  onEvents(l: EventListener): () => void {
    this.eventListeners.add(l);
    return () => this.eventListeners.delete(l);
  }

  dismissOffline(): void {
    this.offlineReport = null;
    this.notify();
  }
}

export const store = new GameStore();

/** Re-renderiza el componente en cada actualización del juego y devuelve el estado actual. */
export function useGame(): { s: GameState; rt: Runtime; store: GameStore } {
  useSyncExternalStore(store.subscribe, () => store.version);
  return { s: store.state, rt: store.rt, store };
}
