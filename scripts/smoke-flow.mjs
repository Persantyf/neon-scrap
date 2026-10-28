// Segunda prueba en navegador: flujo natural, offline, prestigio y barrido de botones.
// Uso: npm run build && npx vite preview --port 4173, y luego: node scripts/smoke-flow.mjs [url] [carpeta]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173/';
const outDir = process.argv[3] ?? 'smoke-shots';
fs.mkdirSync(outDir, { recursive: true });
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) =>
  fs.existsSync(p),
);
const browser = await puppeteer.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('·', ...a);
const shot = (n) => page.screenshot({ path: path.join(outDir, `${n}.png`) });
const KEY = 'neon-scrap-last-orbit:save';
const saved = async () => JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY)).state;
const nav = (label) => page.evaluate((l) => [...document.querySelectorAll('.rail-btn')].find((b) => b.textContent.includes(l)).click(), label);

await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });

// 1. Flujo natural: clics, dron y guantes desde la pestaña Mejoras
const box = await (await page.$('.station-wrap')).boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
for (let i = 0; i < 12; i++) await page.mouse.click(cx, cy);
await page.evaluate(() => document.querySelector('.machine .buy-btn').click());
for (let i = 0; i < 40; i++) await page.mouse.click(cx + 10, cy);
await page.evaluate(() => [...document.querySelectorAll('.seg button')].find((b) => b.textContent.includes('Mejoras')).click());
await sleep(150);
const upg = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.upgrade')].find((x) => x.textContent.includes('Guantes'));
  b?.click();
  return b ? 'encontrada' : 'no';
});
await sleep(200);
log('guantes:', upg, '| directiva actual:', await page.$eval('.mission-title', (e) => e.textContent));
log('valor de clic:', await page.$eval('.recover-value', (e) => e.textContent));
await shot('20-flujo');

// 2. Prestigio desde la UI con una partida importada
const env = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY));
env.state.research = ['batteries', 'radar', 'refining', 'neural', 'fusion', 'core_access'];
env.state.stats.runScrap = 2e9;
env.state.stats.totalScrap = 2e9;
env.state.machines.drone.count = 80;
env.state.modules = { owned: { core_relic: 1 }, equipped: ['core_relic'] };
await page.click('button[aria-label="Ajustes y partida"]');
await page.$eval(
  'textarea[aria-label="Texto de la partida a importar"]',
  (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },
  JSON.stringify(env),
);
await page.evaluate(() => [...document.querySelectorAll('.modal .primary-btn')].find((b) => b.textContent.includes('Importar texto')).click());
await sleep(200);
await page.keyboard.press('Escape');
await nav('Núcleo');
await sleep(200);
log('botón prestigio:', await page.$eval('.prestige-btn', (e) => e.textContent));
await page.click('.prestige-btn');
await sleep(200);
await shot('21-confirmar-prestigio');
await page.evaluate(() => [...document.querySelectorAll('.confirm-box .prestige-btn')].find((b) => b.textContent.includes('Confirmar')).click());
await sleep(800);
await shot('22-tras-prestigio');
const after = await saved();
log(
  'tras prestigio: reinicios',
  after.prestige.resets,
  '| fragmentos',
  after.prestige.fragments,
  '| drones',
  after.machines.drone.count,
  '| chatarra',
  Math.round(after.resources.scrap),
  '| módulos',
  JSON.stringify(after.modules),
);
await nav('Núcleo');
await sleep(200);
await page.evaluate(() => [...document.querySelectorAll('.core-up')].find((b) => b.textContent.includes('Memoria de enjambre')).click());
await sleep(300);
const after2 = await saved();
log('mejora del núcleo comprada:', JSON.stringify(after2.prestige.core), '| drones', after2.machines.drone.count);

// 3. Offline: retrasar el último guardado 3 h antes de que arranque la app
await page.evaluateOnNewDocument((k) => {
  const raw = localStorage.getItem(k);
  if (!raw || sessionStorage.getItem('offline-done')) return;
  sessionStorage.setItem('offline-done', '1');
  const e = JSON.parse(raw);
  e.savedAt = Date.now() - 3 * 3600 * 1000;
  e.state.lastSaved = e.savedAt;
  localStorage.setItem(k, JSON.stringify(e));
}, KEY);
await page.reload({ waitUntil: 'networkidle0' });
await sleep(500);
const offline = await page.$eval('.modal', (e) => e.innerText).catch(() => 'SIN MODAL');
log('modal offline:', offline.replace(/\s+/g, ' ').slice(0, 300));
await shot('23-offline');
await page.keyboard.press('Escape');
await sleep(200);

// 4. Barrido: pulsar todos los botones visibles de cada vista
let clicked = 0;
for (const v of ['Estación', 'Investigación', 'Expediciones', 'Módulos', 'Núcleo', 'Registro']) {
  await nav(v);
  await sleep(150);
  clicked += await page.evaluate(() => {
    const btns = [...document.querySelectorAll('main button, aside button')].filter(
      (b) => b.offsetParent && !b.classList.contains('sheet-close') && !b.classList.contains('prestige-btn'),
    );
    btns.forEach((b) => b.click());
    return btns.length;
  });
  await sleep(150);
}
log('botones pulsados en el barrido:', clicked);

// Ajustes: alternar opciones, guardar y borrar la partida
await page.click('button[aria-label="Ajustes y partida"]');
await page.evaluate(() => document.querySelectorAll('.modal input[type=checkbox]').forEach((c) => c.click()));
await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes('Guardar ahora')).click());
await sleep(150);
log('mensaje guardar:', await page.$eval('.form-msg', (e) => e.textContent));
await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes('Borrar la partida')).click());
await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes('Sí, borrar')).click());
await sleep(200);
const wiped = await saved();
log('tras borrar: reinicios', wiped.prestige.resets, '| chatarra', wiped.resources.scrap, '| ajustes', JSON.stringify(wiped.settings));
await shot('24-ajustes');
console.log('\nERRORES DE CONSOLA:', errors.length ? '\n' + errors.join('\n') : 'ninguno');
await browser.close();
