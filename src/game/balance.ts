// Constantes de equilibrio. Todo lo que afecta al ritmo de la partida vive aquí
// o en las definiciones de contenido (content/*), nunca en los componentes.

export const BALANCE = {
  /** Intervalo del bucle en primer plano (ms). La simulación usa el tiempo real transcurrido. */
  loopMs: 100,
  /** Trozo máximo de simulación por paso: evita saltos bruscos en las conversiones. */
  maxStepSeconds: 1,
  offlineStepSeconds: 2,
  offlineCapSeconds: 8 * 3600,
  /** Ausencias más largas que esto (pestaña oculta, equipo suspendido) muestran resumen. */
  offlineSummarySeconds: 60,
  autosaveSeconds: 15,

  click: { base: 1 },

  energy: { baseCap: 150, capPerSolar: 30, capPerReactor: 500 },

  overload: { unlockDrones: 5, duration: 15, cooldown: 60, mult: 3 },

  prestige: {
    /** Fragmentos = ⌊ (log₁₀(chatarra del ciclo) − umbral)^exponente × multiplicador ⌋ */
    log10Threshold: 6,
    exponent: 2,
    /** Bonificación pasiva por cada fragmento obtenido en total (no se pierde al gastarlo). */
    perFragmentBonus: 0.05,
  },

  achievementBonus: 0.02,

  modules: { baseSlots: 2, maxLevel: 5 },

  expedition: { baseHull: 100, cooldown: 75, destroyedKeep: 0.5 },

  history: { sampleEvery: 10, maxSamples: 120 },

  /** Límite de unidades por compra "máximo" para mantener la UI razonable. */
  maxBulk: 1000,
} as const;
