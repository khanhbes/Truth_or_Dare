// Plays full games in headless Chrome and checks the screen while doing so.
// No dependency: it talks to Chrome over the DevTools protocol (Node 22+).
//
//   npm run build && npx wrangler pages dev dist --port 8788
//   node scripts/smoke-game.mjs --sizes 1366x650,1536x730 --games 1
//
// Options: --url, --sizes WxH[,WxH], --games N (per size), --out DIR, --shots,
//          --skip 0.1, --reduced-motion, --min-fit WxH, --jobs N, --chrome PATH, --seed N
//
// Fails (exit code 1) on runtime errors, a game that gets stuck, sideways
// scrolling, a button that something else covers, and (at or above --min-fit) a
// main button outside the window or a card that moves between states.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value === undefined || value.startsWith('--') ? true : value;
};

const BASE_URL = option('url', 'http://127.0.0.1:8788/');
const SIZES = String(option('sizes', '1366x650,1536x730,1440x780,1920x945,390x844'))
  .split(',')
  .map((size) => size.split('x').map(Number));
const GAMES = Number(option('games', 1));
const OUT = resolve(String(option('out', join(tmpdir(), 'tod-smoke'))));
const SHOTS = Boolean(option('shots', false));
const SKIP_RATE = Number(option('skip', 0.1));
const REDUCED_MOTION = Boolean(option('reduced-motion', false));
const JOBS = Math.max(1, Number(option('jobs', 3)));
const [MIN_FIT_W, MIN_FIT_H] = String(option('min-fit', '1280x640')).split('x').map(Number);
const CHROME = [
  option('chrome', null),
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((path) => typeof path === 'string' && existsSync(path));

if (!CHROME) {
  console.error('Không tìm thấy Chrome. Dùng --chrome hoặc biến CHROME_PATH.');
  process.exit(2);
}

// Small seeded generator so a failing run can be repeated with --seed.
let seed = Number(option('seed', Date.now() % 2147483647)) || 1;
const random = () => {
  seed = (seed * 48271) % 2147483647;
  return seed / 2147483647;
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
mkdirSync(OUT, { recursive: true });

/** One Chrome per game: a background tab in a shared window would be throttled. */
const openBrowser = async () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'tod-smoke-'));
  const port = 9300 + Math.floor(Math.random() * 2000);
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', 'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let attempt = 0; attempt < 150 && !targets.some((target) => target.type === 'page'); attempt += 1) {
    await sleep(200);
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    } catch { /* Chrome is still starting. */ }
  }
  const socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  let onEvent = () => {};
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else onEvent(message);
  });
  return {
    send: (method, params = {}) => new Promise((done) => {
      const id = nextId;
      nextId += 1;
      pending.set(id, done);
      socket.send(JSON.stringify({ id, method, params }));
    }),
    listen: (handler) => { onEvent = handler; },
    close: async () => {
      socket.close();
      chrome.kill();
      await sleep(400);
      try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* Windows may still hold the folder. */ }
    },
  };
};

/** Runs inside the page: what state is the game in, and where is everything? */
const READ_STATE = `(() => {
  const visible = (el) => Boolean(el && el.getClientRects().length);
  const label = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim() || el.getAttribute('aria-label') || '';
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const dialog = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible).pop() || null;
  const root = [...document.querySelectorAll('[data-game-state]')].filter(visible)[0] || null;
  const slot = root && root.querySelector('[data-card-slot]');
  const main = root && [...root.querySelectorAll('[data-main-action], [data-action="agree"]')].filter(visible)[0] || null;
  let state = 'other';
  if (dialog && dialog.querySelector('#summary-title')) state = 'summary';
  else if (dialog) state = 'dialog';
  else if (root) state = root.dataset.gameState;
  if (state === 'answer' && main && main.dataset.action === 'start-timer') state = 'answer-timer';
  const inPosition = root && (root.dataset.phase === 'position' || root.dataset.phase === 'final');
  const percent = [...document.querySelectorAll('[role="progressbar"]')].filter(visible).pop();
  // A button is covered when something else would get the click in its middle.
  const isCovered = (button) => {
    const r = button.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    for (let box = button.parentElement; box; box = box.parentElement) {
      if (getComputedStyle(box).overflow === 'visible') continue;
      const c = box.getBoundingClientRect();
      if (x < c.left || x > c.right || y < c.top || y > c.bottom) return false;
    }
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit) && !button.contains(hit);
  };
  const scope = dialog || root;
  const covered = scope ? [...scope.querySelectorAll('button')].filter(visible).filter((b) => !b.disabled && isCovered(b)) : [];
  return {
    state: (inPosition && ['idle', 'hidden', 'moving'].includes(state) ? 'position-' : '') + state,
    main: box(main),
    mainLabel: main ? label(main).slice(0, 40) : null,
    card: box(slot),
    panels: [...document.querySelectorAll('.player-panel--side')].filter(visible).map(box),
    innerH: innerHeight, innerW: innerWidth, scrollY: Math.round(scrollY),
    overflowX: document.documentElement.scrollWidth - innerWidth,
    overflowY: document.documentElement.scrollHeight - innerHeight,
    dialogText: dialog ? dialog.innerText.replace(/\\s+/g, ' ').slice(0, 120) : null,
    percent: percent ? percent.getAttribute('aria-valuenow') : null,
    covered: covered.map((b) => label(b).slice(0, 40)),
  };
})()`;

/** Runs inside the page: press the next sensible button. `roll` decides skips. */
const ACT = (roll, skipRate) => `(() => {
  const visible = (el) => Boolean(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const label = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim() || el.getAttribute('aria-label') || '';
  const dialog = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible).pop() || null;
  const scope = dialog || document;
  const buttons = [...scope.querySelectorAll('button, [role="button"]')].filter(visible).filter((b) => !b.disabled);
  const press = (b, name) => { b.click(); return name + ' -> ' + label(b).slice(0, 50); };
  const by = (...texts) => buttons.find((b) => texts.some((t) => label(b).startsWith(t)));
  const action = (name) => buttons.find((b) => b.dataset.action === name);
  const groups = new Map();
  for (const choice of [...scope.querySelectorAll('.garment-choice')].filter(visible)) {
    const parent = choice.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(choice);
  }
  const confirm = by('Xác nhận bỏ', 'Xác nhận đổi', 'Xác nhận');
  if (dialog && confirm) return press(confirm, 'confirm');
  for (const list of groups.values()) {
    if (list.some((c) => c.getAttribute('aria-pressed') === 'true')) continue;
    const free = list.filter((c) => !c.disabled);
    if (free.length) { const chosen = free[Math.floor(${roll} * free.length)]; chosen.click(); return 'garment -> ' + label(chosen).slice(0, 40); }
  }
  if (dialog) {
    const penalty = action('penalty-garment');
    const free = action('penalty-none');
    const next = (${roll} * 997) % 1 < 0.5 ? (penalty || free) : (free || penalty);
    const other = by('Tiếp tục', 'Chơi tiếp', 'Đóng');
    if (next || other) return press(next || other, 'dialog');
    return 'NONE dialog ' + JSON.stringify(buttons.map(label).slice(0, 12));
  }
  const down = [...document.querySelectorAll('[aria-label^="Lá úp"]')].filter(visible).filter((b) => !b.disabled);
  if (down.length) { const card = down[Math.floor(${roll} * down.length)]; card.click(); return 'final-card'; }
  const skip = action('skip');
  if (skip && ${roll} < ${skipRate}) return press(skip, 'skip');
  for (const name of ['reveal', 'start-timer', 'complete', 'choose-dare', 'choose-truth', 'agree', 'draw']) {
    const button = action(name);
    if (button) return press(button, name);
  }
  return 'NONE ' + JSON.stringify(buttons.map(label).slice(0, 16));
})()`;

/** Runs inside the page: counts slow frames, so before/after runs can be compared. */
const FRAME_METER = `(() => {
  if (window.__frames) return 'on';
  window.__frames = { total: 0, slow: 0, worst: 0 };
  let last = performance.now();
  const tick = (now) => {
    const delta = now - last; last = now;
    window.__frames.total += 1;
    if (delta > 34) window.__frames.slow += 1;
    if (delta > window.__frames.worst) window.__frames.worst = Math.round(delta);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return 'on';
})()`;

const playGame = async (width, height, gameNumber) => {
  const browser = await openBrowser();
  try {
    return await runGame(browser, width, height, gameNumber);
  } finally {
    await browser.close();
  }
};

const runGame = async (browser, width, height, gameNumber) => {
  const { send } = browser;
  const errors = [];
  browser.listen((message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      errors.push(`exception: ${(details.exception?.description ?? details.text).slice(0, 300)}`);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(`console.error: ${message.params.args.map((item) => item.value ?? item.description ?? '').join(' ').slice(0, 300)}`);
    }
    if (message.method === 'Page.javascriptDialogOpening') {
      void send('Page.handleJavaScriptDialog', { accept: true });
    }
  });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.result?.exceptionDetails) throw new Error(`eval failed: ${JSON.stringify(response.result.exceptionDetails).slice(0, 300)}`);
    return response.result?.result?.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  if (REDUCED_MOTION) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }

  const label = `${width}x${height}#${gameNumber}`;
  const report = { label, draws: 0, skips: 0, finished: false, states: {}, offscreen: [], covered: [], overflowX: 0, overflowY: 0, cardTop: [], errors, log: [] };
  const shot = async (name) => {
    if (!SHOTS) return;
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, `${width}x${height}-${name}.png`), Buffer.from(result.data, 'base64'));
  };
  const waitFor = async (text, timeout = 60_000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await evaluate(`(document.body?.innerText ?? '').toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`).catch(() => false)) return true;
      await sleep(250);
    }
    report.log.push(`"${text}" did not appear`);
    return false;
  };
  const clickText = async (...texts) => evaluate(`(() => {
    const nodes = [...document.querySelectorAll('button, label, [role="button"]')].filter((n) => n.offsetWidth || n.getClientRects().length);
    for (const want of ${JSON.stringify(texts)}) {
      const node = nodes.find((n) => (n.textContent || '').replace(/\\s+/g, ' ').toLowerCase().includes(want.toLowerCase()));
      if (node) { node.scrollIntoView({ block: 'center' }); node.click(); return true; }
    }
    return false;
  })()`);
  const enterGame = async () => {
    await send('Page.navigate', { url: BASE_URL });
    if (!(await waitFor('Chơi ngay'))) return false;
    await clickText('Chơi ngay, không cần tài khoản', 'Chơi ngay');
    if (!(await waitFor('Bắt đầu chơi', 15_000))) return false;
    await sleep(900);
    await clickText('Bắt đầu chơi');
    if (!(await waitFor('Xác nhận 18+', 15_000))) return false;
    await sleep(900);
    await clickText('Xác nhận 18+');
    await sleep(500);
    await clickText('Vào bàn chơi');
    return waitFor('Tim Hồng', 15_000);
  };

  let stuck = 0;
  const recordState = async (view) => {
    const seen = report.states[view.state] ?? { count: 0, cardTop: [], mainBottom: 0, panelGap: 0 };
    seen.count += 1;
    if (view.card) {
      report.cardTop = [Math.min(report.cardTop[0] ?? view.card.top, view.card.top), Math.max(report.cardTop[1] ?? view.card.top, view.card.top)];
      seen.cardTop = [Math.min(seen.cardTop[0] ?? view.card.top, view.card.top), Math.max(seen.cardTop[1] ?? view.card.top, view.card.top)];
      seen.cardSize = `${view.card.w}x${view.card.h}`;
    }
    if (view.main) seen.mainBottom = Math.max(seen.mainBottom, view.main.bottom);
    if (view.panels.length === 2) {
      seen.panelTop = view.panels.map((panel) => panel.top).join('/');
      seen.panelGap = Math.max(seen.panelGap, Math.abs(view.panels[0].top - view.panels[1].top));
    }
    if (!report.states[view.state]) await shot(view.state);
    report.states[view.state] = seen;
    report.overflowX = Math.max(report.overflowX, view.overflowX);
    report.overflowY = Math.max(report.overflowY, view.overflowY);
    for (const name of view.covered) report.covered.push(`${view.state}: "${name}" is covered by something else`);
    if (view.main && view.main.bottom > view.innerH) {
      report.offscreen.push(`${view.state}: "${view.mainLabel}" ends at ${view.main.bottom}, window is ${view.innerH}`);
    }
  };

  if (await enterGame()) {
    await sleep(1500);
    await evaluate(FRAME_METER);
    for (let step = 0; step < 700; step += 1) {
      const view = await evaluate(READ_STATE);
      if (view.state === 'summary') { report.finished = true; await sleep(600); await shot('summary'); break; }
      if (['other', 'scene', 'moving', 'position-moving'].includes(view.state)) {
        stuck += 1;
        if (stuck > 30) { report.log.push(`stuck in "${view.state}"`); await shot('stuck'); break; }
        await sleep(300);
        continue;
      }
      // Let the entrance animation end before measuring.
      await sleep(view.state.includes('idle') ? 700 : 1000);
      const settled = await evaluate(READ_STATE);
      if (settled.state !== view.state) continue;
      await recordState(settled);
      // Rounded down: "1.0000" would point past the end of a list.
      const result = await evaluate(ACT((Math.floor(random() * 10_000) / 10_000).toFixed(4), SKIP_RATE));
      if (result.startsWith('NONE')) {
        stuck += 1;
        if (stuck > 12) { report.log.push(`no button: ${result}`); await shot('stuck'); break; }
        await sleep(500);
        continue;
      }
      if (process.env.SMOKE_VERBOSE) report.log.push(`${settled.state} ${settled.percent ?? ''}% ${result}`);
      if (result.startsWith('draw')) report.draws += 1;
      if (result.startsWith('skip')) report.skips += 1;
      stuck = 0;
      await sleep(result.startsWith('draw') ? 900 : 250);
    }
    report.frames = await evaluate('window.__frames');
  } else await shot('stuck');
  return report;
};

let failed = false;
const queue = Array.from({ length: GAMES }, (_, index) => SIZES.map(([width, height]) => [width, height, index + 1])).flat();
const reports = [];
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const [width, height, game] = job;
    try {
      reports.push(await playGame(width, height, game));
    } catch (error) {
      reports.push({
        label: `${width}x${height}#${game}`, draws: 0, skips: 0, finished: false, states: {},
        offscreen: [], covered: [], overflowX: 0, overflowY: 0, cardTop: [], errors: [`driver: ${error.message}`], log: [],
      });
    }
  }
}));
reports.sort((a, b) => a.label.localeCompare(b.label));
for (const report of reports) {
  const [width, height] = report.label.split('#')[0].split('x').map(Number);
  const mustFit = width >= MIN_FIT_W && height >= MIN_FIT_H;
  const offscreen = [...new Set(report.offscreen)];
  const problems = [
    ...(report.finished ? [] : ['game did not finish']),
    ...new Set(report.errors),
    ...new Set(report.covered),
    ...(mustFit ? offscreen : []),
    ...(mustFit && report.cardTop.length && report.cardTop[1] - report.cardTop[0] > 1 ? [`card moves between ${report.cardTop.join(' and ')}`] : []),
    ...(report.overflowX > 1 ? [`page scrolls sideways by ${report.overflowX}px`] : []),
  ];
  failed ||= problems.length > 0;
  console.log(`\n== ${report.label}: ${report.finished ? 'finished' : 'NOT FINISHED'} · ${report.draws} draws · ${report.skips} skips · page taller than window by ${report.overflowY}px · frames ${JSON.stringify(report.frames)}`);
  for (const [state, info] of Object.entries(report.states)) {
    console.log(`   ${state.padEnd(22)} x${String(info.count).padEnd(3)} card ${info.cardSize ?? '-'} top ${info.cardTop.join('–') || '-'} · main ends ${info.mainBottom || '-'} · panels ${info.panelTop ?? '-'}`);
  }
  if (!mustFit && offscreen.length) console.log(`   (not required to fit) ${offscreen.length} button positions below the window`);
  for (const line of [...report.log, ...problems.map((problem) => `PROBLEM ${problem}`)]) console.log(`   ${line}`);
}
console.log(failed ? '\nSMOKE FAILED' : '\nSMOKE OK');
process.exit(failed ? 1 : 0);
