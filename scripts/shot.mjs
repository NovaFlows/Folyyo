// Capture d'écran pilotée par le protocole DevTools de Chrome.
//
// Pourquoi pas `chrome --screenshot` : cette option ne capture que le viewport,
// n'exécute pas de JS avant la prise, et ne permet pas de scroller. Or les
// sections du portfolio n'apparaissent qu'au scroll (animations `ld-reveal`),
// et le hero est en `min-h-screen` — agrandir la fenêtre étire le hero au lieu
// de révéler le reste de la page.
//
// Usage :
//   node scripts/shot.mjs <url> <sortie.png> [--w 1920] [--h 1080]
//                         [--full]            capture toute la page
//                         [--scroll 1200]     scrolle à Y avant la capture
//                         [--mobile]          viewport iPhone + UA mobile
//                         [--wait 2500]       attente avant capture (ms)
//                         [--js "…"]          JS à exécuter avant la capture
//
// Les animations d'apparition sont neutralisées avant chaque capture, sinon
// les sections non encore visibles ressortent vides.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
if (!url || !out) {
  console.error("usage: node scripts/shot.mjs <url> <sortie.png> [options]");
  process.exit(1);
}
const flag = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
const mobile = args.includes("--mobile");
const full = args.includes("--full");
const width = Number(flag("w", mobile ? 430 : 1920));
const height = Number(flag("h", mobile ? 932 : 1080));
const scrollY = Number(flag("scroll", 0));
const waitMs = Number(flag("wait", 2500));
const extraJs = flag("js", null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
  "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`,
  `--window-size=${width},${height}`,
  "--user-data-dir=" + process.env.TEMP + "\\claude-shot-profile",
  "about:blank",
], { stdio: "ignore" });

let ws;
const cleanup = () => { try { ws?.close(); } catch {} try { chrome.kill(); } catch {} };
process.on("exit", cleanup);

try {
  // Attendre que le port de debug réponde
  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      target = list.find((t) => t.type === "page");
      if (target) break;
    } catch { /* pas encore prêt */ }
  }
  if (!target) throw new Error("Chrome n'a pas ouvert son port de debug");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile,
    screenWidth: width, screenHeight: height,
  });
  if (mobile) {
    await send("Emulation.setUserAgentOverride", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
  }

  await send("Page.navigate", { url });
  await sleep(waitMs);

  // Neutralise les animations d'apparition au scroll : sans ça les sections
  // pas encore "révélées" sont capturées vides.
  await send("Runtime.evaluate", {
    expression: `
      document.querySelectorAll('.ld-reveal, [class*="reveal"]').forEach(el => {
        el.classList.add('is-visible','visible','in-view');
        el.style.opacity = '1'; el.style.transform = 'none';
      });
      document.querySelectorAll('*').forEach(el => {
        const s = getComputedStyle(el);
        if (s.opacity === '0' && el.offsetParent !== null) el.style.opacity = '1';
      });
    `,
  });

  if (extraJs && typeof extraJs === "string") {
    await send("Runtime.evaluate", { expression: extraJs });
  }
  if (scrollY > 0) {
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${scrollY});` });
    await sleep(900);
  }
  await sleep(700);

  // --measure "sel1|sel2" : renvoie le centre de chaque élément dans le même
  // viewport que la capture. Indispensable pour poser un curseur de souris
  // pile sur un bouton (mesurer dans une autre fenêtre donne un décalage).
  const measure = flag("measure", null);
  if (measure && typeof measure === "string") {
    const expr = `(() => {
      const out = {};
      ${JSON.stringify(measure.split("|"))}.forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) { out[sel] = null; return; }
        const r = el.getBoundingClientRect();
        out[sel] = { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2),
                     x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      });
      return JSON.stringify(out);
    })()`;
    const m = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    console.log("MEASURE " + m.result.value);
  }

  // --eval "<expr JS>" : imprime le résultat (pratique pour inspecter une page
  // sans écrire un script dédié).
  const evalExpr = flag("eval", null);
  if (evalExpr && typeof evalExpr === "string") {
    const r = await send("Runtime.evaluate", { expression: evalExpr, returnByValue: true });
    console.log("EVAL " + JSON.stringify(r.result.value));
  }

  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: full,
    ...(full ? {} : {}),
  });

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  const dims = await send("Runtime.evaluate", {
    expression: "JSON.stringify({h: document.documentElement.scrollHeight})",
    returnByValue: true,
  });
  console.log(`OK ${out} (page haute de ${JSON.parse(dims.result.value).h}px)`);
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exitCode = 1;
} finally {
  cleanup();
}
