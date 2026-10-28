// Prueba de humo en un navegador real (Chrome/Edge local, sin descargas).
// Uso: npm run dev (en otra terminal) y luego: node scripts/smoke.mjs [url] [carpeta-capturas]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5179/';
const outDir = process.argv[3] ?? 'smoke-shots';
fs.mkdirSync(outDir, { recursive: true });
const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = candidates.find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const errors = [];
const page = await browser.newPage();
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
const text = (sel) => page.$eval(sel, (el) => el.textContent);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('·', ...a);

await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await shot('01-inicio');
log('chatarra inicial', await text('.res-chip.res-scrap .res-value'));

// Recuperar chatarra pulsando la estación
const box = await (await page.$('.station-wrap')).boundingBox();
for (let i = 0; i < 25; i++) {
  await page.mouse.click(box.x + box.width / 2 + (i % 5) * 8, box.y + box.height / 2);
  await sleep(40);
}
log('tras 25 clics', await text('.res-chip.res-scrap .res-value'), '| directiva:', await text('.mission-title'));
await shot('02-clics');

// Comprar un dron
const buy = async (name) => {
  const ok = await page.evaluate((n) => {
    const card = [...document.querySelectorAll('.machine')].find((c) => c.querySelector('h3')?.textContent === n);
    const btn = card?.querySelector('.buy-btn');
    if (!btn) return 'sin botón';
    btn.click();
    return btn.classList.contains('disabled') ? 'deshabilitado' : 'ok';
  }, name);
  return ok;
};
log('comprar dron:', await buy('Dron de recuperación'));
await sleep(300);
log('drones:', await page.$eval('.machine .machine-count', (el) => el.textContent));
// Intentar comprar sin recursos → mensaje
for (let i = 0; i < 3; i++) await buy('Dron de recuperación');
await sleep(300);
log('toasts:', await page.$$eval('.toast', (t) => t.map((x) => x.textContent).join(' | ')));
await shot('03-dron');

// Cargar una partida avanzada con el importador real de Ajustes (prueba también la validación)
const exported = await page.evaluate(() => localStorage.getItem('neon-scrap-last-orbit:save'));
const env = JSON.parse(exported);
const s = env.state;
s.resources = { scrap: 5e6, energy: 2000, alloys: 60000, data: 9000 };
Object.assign(s.machines.drone, { count: 60 });
Object.assign(s.machines.solar, { count: 40 });
Object.assign(s.machines.sorter, { count: 20 });
Object.assign(s.machines.foundry, { count: 20 });
Object.assign(s.machines.lab, { count: 15 });
Object.assign(s.machines.fabricator, { count: 6 });
s.research = ['batteries', 'radar', 'refining', 'fusion', 'deep_map', 'swarm', 'core_access_typo'];
s.modules = { owned: { plasma_cell: 2, core_relic: 1, fake_module: 3 }, equipped: ['plasma_cell', 'fake_module'] };
s.stats.runScrap = 3e8;
const importJson = async (json) => {
  await page.click('button[aria-label="Ajustes y partida"]');
  await sleep(200);
  await page.$eval('textarea[aria-label="Texto de la partida a importar"]', (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, json);
  await page.evaluate(() => [...document.querySelectorAll('.modal .primary-btn')].find((b) => b.textContent.includes('Importar texto'))?.click());
  await sleep(300);
  const msg = await page.$eval('.form-msg', (e) => e.textContent).catch(() => 'sin mensaje');
  await page.keyboard.press('Escape');
  await sleep(200);
  return msg;
};
log('importar basura:', await importJson('{"hola": 1}'));
log('importar avanzada:', await importJson(JSON.stringify(env)));
await sleep(1200);
log('investigaciones tras importar:', await page.evaluate(() => JSON.parse(localStorage.getItem('neon-scrap-last-orbit:save')).state.research.join(',')));
log('módulos tras importar:', await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('neon-scrap-last-orbit:save')).state.modules)));
await shot('04-estacion-avanzada');

const nav = async (label) => {
  await page.evaluate((l) => [...document.querySelectorAll('.rail-btn')].find((b) => b.textContent.includes(l))?.click(), label);
  await sleep(400);
};
await nav('Investigación');
await shot('05-investigacion');
await nav('Expediciones');
await shot('06-expediciones');
// Lanzar expedición al primer sector y jugar las decisiones
await page.evaluate(() => [...document.querySelectorAll('.sector .primary-btn')][0]?.click());
await sleep(300);
await shot('07-encuentro');
for (let i = 0; i < 12; i++) {
  const st = await page.evaluate(() => {
    const opt = document.querySelector('.option:not(.disabled)');
    if (opt) { opt.click(); return 'elige'; }
    const cont = [...document.querySelectorAll('.run .primary-btn')].find((b) => b.textContent.includes('Continuar') || b.textContent.includes('Descargar'));
    if (cont) { const t = cont.textContent; cont.click(); return t; }
    return 'fin';
  });
  await sleep(250);
  if (st === 'fin') break;
  if (st.includes('Descargar')) break;
}
await shot('08-tras-expedicion');
log('expediciones completadas:', await page.$eval('.expedition-view .panel-head-right', (e) => e.textContent));
await nav('Módulos');
await shot('09-modulos');
await nav('Núcleo');
await shot('10-nucleo');
log('núcleo:', await text('.core-gain'), await text('.formula'));
await nav('Registro');
await shot('11-registro');
// Ajustes
await page.click('button[aria-label="Ajustes y partida"]');
await sleep(300);
await shot('12-ajustes');
await page.keyboard.press('Escape');

// Sobrecarga
await nav('Estación');
await page.click('.overload');
await sleep(600);
await shot('13-sobrecarga');
log('sobrecarga:', await text('.overload-text small'));

// Móvil
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await sleep(600);
await shot('14-movil-estacion');
await nav('Taller');
await shot('15-movil-taller');
await nav('Expediciones');
await shot('16-movil-expediciones');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
log('desbordamiento horizontal en móvil:', overflow);

console.log('\nERRORES DE CONSOLA:', errors.length ? '\n' + errors.join('\n') : 'ninguno');
await browser.close();
