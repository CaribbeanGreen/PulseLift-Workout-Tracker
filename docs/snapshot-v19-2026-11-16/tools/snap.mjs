import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
const PROFILE = process.argv[3];
const BASE = 'http://127.0.0.1:8765/';
const PORT = 9333;
const MAX_H = 14000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--window-size=1440,900', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', 'about:blank'
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {}
}
if (!target) { chrome.kill(); throw new Error('no devtools target'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
let blockedPosts = 0;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  } else if (m.method === 'Fetch.requestPaused') {
    const { requestId, request } = m.params;
    if (request.method !== 'GET') {
      blockedPosts++;
      send('Fetch.fulfillRequest', {
        requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from('{"ok":true}').toString('base64')
      });
    } else send('Fetch.continueRequest', { requestId });
  }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}
async function js(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(expr + ' -> ' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text));
  return r.result.value;
}

await send('Page.enable');
await send('Network.enable');
await send('Network.setBypassServiceWorker', { bypass: true });
await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/backup*' }] });

const VIEWPORTS = [
  { tag: 'desktop', width: 1440, height: 900, mobile: false, dpr: 1 },
  { tag: 'mobile', width: 390, height: 844, mobile: true, dpr: 2 }
];

// [file name, title, setup script, fullPage]
const STATES = [
  ['01-tracker-day-a', 'Tracker — Day A', `document.getElementById('tabDayA').click()`, true],
  ['02-tracker-day-b', 'Tracker — Day B', `document.getElementById('tabDayB').click()`, true],
  ['03-tracker-history-drawer', 'Tracker — history drawer open', `document.getElementById('tabDayA').click(); document.getElementById('toggleHistoryBtn').click()`, true],
  ['04-planner', 'Plan Builder', `switchPageView('planner')`, true],
  ['05-library', 'Exercise Library', `switchPageView('library')`, true],
  ['06-history', 'History & Analysis', `switchPageView('history')`, true],
  ['07-modal-3d-studio', '360° Studio modal (Dumbbell Floor Press)', `open3DStudioModal('floor-press')`, false],
  ['08-modal-tutorial', 'Tutorial modal', `openTutorialModal()`, false],
  ['09-modal-backfill', 'Backfill / quick-log modal', `openBackfillModal()`, false]
];

const report = [];
for (const vp of VIEWPORTS) {
  for (const [name, title, setup, fullPage] of STATES) {
    if (process.env.ONLY && !(name + '--' + vp.tag).match(process.env.ONLY)) continue;
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
    await send('Page.navigate', { url: BASE + '?snap=' + Date.now() });
    await sleep(3000);
    let err = null;
    try { await js(setup); } catch (e) { err = String(e.message).slice(0, 300); }
    await sleep(1200);
    let h = vp.height, truncated = false, fullH = vp.height;
    if (fullPage) {
      fullH = await js('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
      h = Math.min(fullH, MAX_H);
      truncated = fullH > MAX_H;
      await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: h, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
      await sleep(2500);
    } else {
      await sleep(1500);
      console.log('DIAG', await js(`JSON.stringify({iw:innerWidth,ih:innerHeight,sw:document.documentElement.scrollWidth,vv:[visualViewport.width,visualViewport.height,visualViewport.scale,visualViewport.offsetTop],sy:scrollY,r:(()=>{const e=[...document.querySelectorAll('.modal-3d-backdrop')].find(x=>!x.classList.contains('hidden'));const d=e&&e.firstElementChild;return d?[e.getBoundingClientRect().toJSON(),d.getBoundingClientRect().toJSON()]:null})()})`));
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = `${name}--${vp.tag}.png`;
    writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
    report.push({ file, title, viewport: vp.tag, width: vp.width, height: h, fullHeight: fullH, truncated, err });
    if (truncated && vp.tag === 'desktop') {
      let part = 2;
      for (let y = h; y < fullH; y += h, part++) {
        await js(`window.scrollTo(0, ${Math.min(y, fullH - h)})`);
        await sleep(2500);
        const s2 = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(path.join(OUT, `${name}--${vp.tag}-part${part}.png`), Buffer.from(s2.data, 'base64'));
        console.log('  part', part, 'from y', Math.min(y, fullH - h));
      }
    }
    console.log(file, h, truncated ? `(truncated from ${fullH})` : '', err || '');
  }
}
if (!process.env.ONLY) writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('blocked non-GET backup calls:', blockedPosts);
ws.close();
chrome.kill();
process.exit(0);
