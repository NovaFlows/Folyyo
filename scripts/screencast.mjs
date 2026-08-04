// Enregistre un vrai screencast de l'app pendant qu'un scénario la pilote,
// à la manière des vidéos de démo des landings SaaS (own.page & co).
//
// Différence avec `shot.mjs` : ici on ne fige pas des états, on FILME. Les
// clics et les glissers sont de vrais événements souris envoyés à la page
// (Input.dispatchMouseEvent), donc React réagit pour de bon : le widget suit
// le curseur, la grille se réorganise, les thèmes s'appliquent avec leurs
// transitions CSS.
//
// Usage :
//   node scripts/screencast.mjs <url> <dossier_sortie> <scenario> [--wait 8000]
//
// Scénarios disponibles : "editor" (thèmes + déplacement de widgets)
//
// Sortie : dossier avec les frames + frames.txt (liste concat ffmpeg, durées
// réelles préservées) — assembler ensuite avec :
//   ffmpeg -f concat -safe 0 -i frames.txt -vsync vfr -pix_fmt yuv420p out.mp4

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9477;
const [url, outDir, scenario = "editor"] = process.argv.slice(2);
if (!url || !outDir) {
  console.error("usage: node scripts/screencast.mjs <url> <dossier> <scenario>");
  process.exit(1);
}
const flag = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const WAIT = Number(flag("wait", 9000));
const W = Number(flag("w", 1600));
const H = Number(flag("h", 1000));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
  "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`,
  "--user-data-dir=" + process.env.TEMP + "\\claude-cast", "about:blank",
], { stdio: "ignore" });

let ws;
const cleanup = () => { try { ws?.close(); } catch {} try { chrome.kill(); } catch {} };
process.on("exit", cleanup);

try {
  let target = null;
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      target = (await r.json()).find((t) => t.type === "page");
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error("port de debug indisponible");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pend = new Map();
  const frames = [];
  let t0 = 0;

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Page.screencastFrame") {
      const { data, sessionId, metadata } = m.params;
      const ts = metadata?.timestamp ?? Date.now() / 1000;
      if (!t0) t0 = ts;
      const name = `f${String(frames.length).padStart(5, "0")}.jpg`;
      writeFileSync(join(outDir, name), Buffer.from(data, "base64"));
      frames.push({ name, t: ts - t0 });
      ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId } }));
      return;
    }
    if (m.id && pend.has(m.id)) {
      const { resolve, reject } = pend.get(m.id);
      pend.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id; pend.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  const mouse = async (type, x, y, extra = {}) =>
    send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, ...extra });

  // Déplacement de souris humain : on interpole, sinon le curseur téléporte et
  // les handlers de drag ne suivent pas.
  const moveTo = async (x0, y0, x1, y1, steps = 22, delay = 16) => {
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOut
      await mouse("mouseMoved", x0 + (x1 - x0) * e, y0 + (y1 - y0) * e);
      await sleep(delay);
    }
    lastXY = [x1, y1];
  };
  const click = async (x, y) => {
    await mouse("mousePressed", x, y);
    await sleep(90);
    await mouse("mouseReleased", x, y);
  };
  const drag = async (x0, y0, x1, y1) => {
    await mouse("mousePressed", x0, y0);
    await sleep(160);
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      await mouse("mouseMoved", x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, { buttons: 1 });
      await sleep(22);
    }
    await sleep(200);
    await mouse("mouseReleased", x1, y1);
  };
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;

  // Pause "vivante" : pendant une attente, on fait vibrer imperceptiblement la
  // souris pour que Chrome continue d'émettre des images (sinon le screencast
  // se fige et la vidéo saccade).
  let lastXY = [W / 2, H / 2];
  const hold = async (ms, x = lastXY[0], y = lastXY[1]) => {
    const end = Date.now() + ms;
    let i = 0;
    while (Date.now() < end) {
      await mouse("mouseMoved", x + (i % 2 ? 0.5 : -0.5), y);
      await sleep(33);
      i++;
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
  });
  await send("Page.navigate", { url });
  await sleep(WAIT);

  // Chrome headless ne dessine pas le pointeur système : on injecte un curseur
  // qui suit les événements souris envoyés. Il rend aussi les clics lisibles
  // (halo) et, en bougeant, force la page à se redessiner — ce qui produit des
  // images de screencast régulières au lieu d'un flux saccadé.
  await evaluate(`(() => {
    if (window.__cast) return;
    window.__cast = true;
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transition:none';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2 L4 19 L9 14.5 L12.5 21.5 L15.5 20 L12 13.5 L18.5 13 Z" fill="#fff" stroke="#1c1917" stroke-width="1.5"/></svg>';
    document.body.appendChild(c);
    const halo = document.createElement('div');
    halo.style.cssText = 'position:fixed;border:2px solid #c9a96e;border-radius:99px;z-index:2147483646;pointer-events:none;opacity:0;width:0;height:0';
    document.body.appendChild(halo);
    addEventListener('mousemove', (e) => {
      c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    }, true);
    addEventListener('mousedown', (e) => {
      halo.animate(
        [ { width:'0px', height:'0px', opacity:.7, left:e.clientX+'px', top:e.clientY+'px' },
          { width:'54px', height:'54px', opacity:0, left:(e.clientX-27)+'px', top:(e.clientY-27)+'px' } ],
        { duration: 480, easing: 'ease-out' }
      );
    }, true);
  })()`);

  await send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
  await sleep(700);

  if (scenario === "editor") {
    // Repérage des éléments dans la page courante (les positions dépendent du
    // viewport, donc on les lit ici plutôt que de les coder en dur).
    const pos = JSON.parse(await evaluate(`(() => {
      const btns = [...document.querySelectorAll('button')];
      const th = btns.filter(b => /Terminal Dark|Ocean Night|Synthwave|Minimal Pro|Slate Clean/.test(b.innerText||''));
      const sc = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 80 && d.clientHeight > 300);
      if (sc[0]) sc[0].scrollTop = 1000;
      const items = [...document.querySelectorAll('.react-grid-item')];
      const box = (el) => { const r = el.getBoundingClientRect(); return { cx: r.x + r.width/2, cy: r.y + r.height/2, x: r.x, y: r.y, w: r.width, h: r.height }; };
      return JSON.stringify({
        themes: th.map(box),
        widgets: items.map(box),
      });
    })()`));

    await hold(900);

    // 1) changement de thème : deux clics espacés
    if (pos.themes[1]) {
      await moveTo(W * 0.45, H * 0.7, pos.themes[1].cx, pos.themes[1].cy, 26, 18);
      await click(pos.themes[1].cx, pos.themes[1].cy);
      await hold(1500);
    }
    if (pos.themes[2]) {
      await moveTo(pos.themes[1].cx, pos.themes[1].cy, pos.themes[2].cx, pos.themes[2].cy, 14, 18);
      await click(pos.themes[2].cx, pos.themes[2].cy);
      await hold(1600);
    }

    // 2) déplacement d'un widget : vrai drag, la grille réagit
    const w = pos.widgets[1] || pos.widgets[0];
    if (w) {
      const gx = w.cx, gy = w.y + 26; // on attrape près du haut du bloc
      await moveTo(pos.themes[2]?.cx ?? W * 0.7, pos.themes[2]?.cy ?? H * 0.4, gx, gy, 26, 18);
      await hold(300);
      await drag(gx, gy, gx + 40, gy - 210);
      await hold(1400);
    }

    // 3) redimensionnement : on tire la poignée en bas à droite du bloc
    const w2 = pos.widgets[1] || pos.widgets[0];
    if (w2) {
      const hx = w2.x + w2.w - 6, hy = w2.y + w2.h - 6;
      await moveTo(w2.cx, w2.cy, hx, hy, 20, 18);
      await hold(250);
      await drag(hx, hy, hx - 220, hy + 90);
      await hold(1500);
    }
  }

  await hold(700);
  await send("Page.stopScreencast");

  // Liste concat avec les durées réelles entre frames (rythme préservé).
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.max(0.016, frames[i + 1].t - frames[i].t) : 0.2;
    lines.push(`file '${frames[i].name}'`, `duration ${dur.toFixed(3)}`);
  }
  if (frames.length) lines.push(`file '${frames[frames.length - 1].name}'`);
  writeFileSync(join(outDir, "frames.txt"), lines.join("\n"));
  console.log(`OK ${frames.length} frames, ${frames[frames.length - 1]?.t.toFixed(1)}s -> ${outDir}`);
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exitCode = 1;
} finally {
  cleanup();
}
