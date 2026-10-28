import { describe, expect, it } from 'vitest';
import { botPrestige, runBot } from './bot';

describe('ritmo de progresión (bot activo)', () => {
  it('cumple los hitos de diseño del primer ciclo', () => {
    const log = runBot({ seconds: 60 * 60, clicksPerSecond: 3, seed: 7, prestigeAt: 1 });
    console.log('Ciclo 1', log.milestones);
    const m = log.milestones;
    expect(m.drone1).toBeLessThanOrEqual(10);
    expect(m.gloves).toBeLessThanOrEqual(60);
    expect(m.foundry1).toBeGreaterThanOrEqual(120);
    expect(m.foundry1).toBeLessThanOrEqual(330);
    expect(m.radar).toBeGreaterThanOrEqual(6 * 60);
    expect(m.radar).toBeLessThanOrEqual(13 * 60);
    expect(m.prestige_ready).toBeGreaterThanOrEqual(15 * 60);
    expect(m.prestige_ready).toBeLessThanOrEqual(35 * 60);
  });

  it('el segundo ciclo es más rápido que el primero', () => {
    const first = runBot({ seconds: 60 * 60, clicksPerSecond: 3, seed: 3, prestigeAt: 8 });
    console.log('Ciclo 1 (hasta 8 fragmentos)', first.milestones);
    const s = botPrestige(first);
    const second = runBot({ seconds: 60 * 60, clicksPerSecond: 3, seed: 4, prestigeAt: 1, state: s });
    console.log('Ciclo 2', second.milestones, 'fragmentos totales', s.prestige.fragmentsTotal, s.prestige.core);
    expect(second.milestones.prestige_ready).toBeLessThan(first.milestones.prestige_ready);
  });
});
