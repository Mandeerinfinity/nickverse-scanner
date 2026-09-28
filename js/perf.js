/* NICK-VERSE Scanner: performance governor.
   Quality tiers (Ultra/High/Balanced/Battery + Auto), adaptive stepping from measured frame times,
   in-view tracking for canvases, a canvas glow budget and an optional FPS overlay. */
(function () {
  'use strict';
  const NV = window.NV;
  // dpr: backing-store cap for tool canvases; cam: cap for camera canvases; bg: ambient layer mode; bgScale: ambient canvas scale (CSS px -> backing px)
  // glow: multiplier applied to canvas shadowBlur (0 = no blur pass); hz: tool canvas refresh; deco: decorative CSS animations
  const TIERS = [
    { id: 'battery',  name: 'Battery',  dpr: 1,   cam: 1,    bg: 'static', bgScale: 0.34, bgHz: 0,  parts: 0.35, glow: 0,    hz: 30, blur: false, deco: false, parallax: false, scanbar: false },
    { id: 'balanced', name: 'Balanced', dpr: 1.5, cam: 1, bg: 'static', bgScale: 0.5,  bgHz: 0,  parts: 0.6,  glow: 0,    hz: 60, blur: false, deco: true,  parallax: false, scanbar: false },
    { id: 'high',     name: 'High',     dpr: 2,   cam: 1.5,  bg: 'anim',   bgScale: 0.6,  bgHz: 30, parts: 0.8,  glow: 0.6,  hz: 60, blur: true,  deco: true,  parallax: true,  scanbar: true },
    { id: 'ultra',    name: 'Ultra',    dpr: 2.5, cam: 2,    bg: 'anim',   bgScale: 1,    bgHz: 60, parts: 1,    glow: 1,    hz: 60, blur: true,  deco: true,  parallax: true,  scanbar: true }
  ];
  const IDS = TIERS.map((t) => t.id);
  const phone = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || innerWidth < 900;
  const P = (NV.perf = { TIERS, phone, tier: 1, t: TIERS[1], auto: true, fps: 60, ms: 16.7, work: 0, history: [] });
  const url = new URLSearchParams(location.search);

  function ceiling() { return phone ? 2 : 3; }
  function startTier() { if (phone) return 1; return (navigator.hardwareConcurrency || 4) >= 8 ? 2 : 2; }

  function apply(i, why) {
    i = NV.clamp(i, 0, 3); const prev = P.tier; P.tier = i; P.t = TIERS[i];
    const h = document.documentElement;
    IDS.forEach((id) => h.classList.toggle('q-' + id, id === P.t.id));
    h.classList.toggle('q-lite', i <= 1);
    h.classList.toggle('q-deco-off', !P.t.deco);
    if (prev !== i || why === 'init') { NV.emit('quality', { tier: i, prev, why }); if (why === 'auto') P.history.push({ t: Date.now(), from: TIERS[prev].id, to: P.t.id }); }
    updateHud(true);
  }
  P.set = (mode) => {
    if (!IDS.includes(mode) && mode !== 'auto') mode = 'auto';
    NV.setSetting('quality', mode);
  };
  P.label = () => (P.auto ? 'Auto · ' : '') + P.t.name;
  function fromSetting() {
    const q = url.get('q') || NV.settings.quality || 'auto';
    P.auto = q === 'auto'; apply(P.auto ? startTier() : IDS.indexOf(q), 'init'); failed.fill(0); calmSince = performance.now();
  }

  // ---- canvas glow budget: scale shadowBlur by the tier's glow factor (0 skips the blur pass entirely) ----
  try {
    const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    const d = proto && Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
    if (d && d.set && d.get) Object.defineProperty(proto, 'shadowBlur', { configurable: true, enumerable: d.enumerable, get() { return d.get.call(this); }, set(v) { d.set.call(this, v * P.t.glow); } });
  } catch (e) { /* leave canvas untouched */ }
  // ---- font cache: setting ctx.font re-parses the CSS font string every time (costly in per-frame HUD text).
  // Skip the parse when the same string is set again and nothing (e.g. restore()) has changed it since. ----
  try {
    const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    const fd = proto && Object.getOwnPropertyDescriptor(proto, 'font');
    if (fd && fd.set && fd.get) Object.defineProperty(proto, 'font', { configurable: true, enumerable: fd.enumerable, get() { return fd.get.call(this); },
      set(v) { if (v === this.__fs && fd.get.call(this) === this.__fg) return; fd.set.call(this, v); this.__fs = v; this.__fg = fd.get.call(this); } });
  } catch (e) { /* leave canvas untouched */ }

  // ---- in-view tracking (IntersectionObserver) ----
  const io = window.IntersectionObserver ? new IntersectionObserver((es) => es.forEach((e) => { e.target._iv = e.isIntersecting; }), { rootMargin: '40px' }) : null;
  NV.inView = (el) => { if (!el) return false; if (!io) return true; if (el._ivObs == null) { el._ivObs = 1; el._iv = true; io.observe(el); } return el._iv; };

  // ---- adaptive governor ----
  const N = 120, dts = new Float32Array(N), works = new Float32Array(N); let n = 0, idx = 0, lastEval = 0, bad = 0, calmSince = 0, holdUntil = 0;
  const failed = new Array(4).fill(0); // timestamp a tier last failed, so we don't bounce straight back up
  P.hold = (ms = 1200) => { holdUntil = Math.max(holdUntil, performance.now() + ms); };
  function pct(arr, count, q) { const a = Array.from(arr.subarray(0, count)).sort((x, y) => x - y); return a[Math.min(count - 1, Math.floor(count * q))]; }
  P.frame = (dt, work, now) => {
    if (dt > 250 || document.hidden) { n = 0; idx = 0; return; } // tab switch / resume: discard
    dts[idx] = dt; works[idx] = work; idx = (idx + 1) % N; n = Math.min(N, n + 1);
    if (now - lastEval < 1000 || n < 30) return; lastEval = now;
    const med = pct(dts, n, 0.5), p90w = pct(works, n, 0.9); let long = 0; for (let i = 0; i < n; i++) if (dts[i] > 22) long++;
    const longF = long / n; P.fps = 1000 / med; P.ms = med; P.work = p90w; P.longF = longF;
    updateHud();
    if (!P.auto || now < holdUntil) { bad = 0; return; }
    const struggling = med > 18.2 || longF > 0.12, comfy = med < 17.4 && longF < 0.03 && p90w < 7;
    if (struggling) { bad++; calmSince = now; if (bad >= 2 && P.tier > 0) { failed[P.tier] = now; apply(P.tier - 1, 'auto'); bad = 0; n = 0; P.hold(1500); } }
    else { bad = Math.max(0, bad - 1); if (!comfy) calmSince = now; }
    if (comfy && now - calmSince > 9000 && P.tier < ceiling() && now - failed[P.tier + 1] > 120000) { apply(P.tier + 1, 'auto'); calmSince = now; n = 0; P.hold(1500); }
  };

  // ---- FPS overlay ----
  let hud = null, hudT = 0, spark = null, sctx = null; const sparkBuf = [];
  function updateHud(force) {
    if (!hud || hud.hidden) return; const now = performance.now(); if (!force && now - hudT < 480) return; hudT = now;
    const fps = Math.min(999, P.fps); hud.querySelector('b').textContent = Math.round(fps);
    hud.querySelector('.fh-ms').textContent = P.ms.toFixed(1) + 'ms · js ' + P.work.toFixed(1);
    hud.querySelector('.fh-tier').textContent = P.label();
    hud.dataset.state = fps >= 55 ? 'ok' : fps >= 40 ? 'warn' : 'bad';
    sparkBuf.push(fps); if (sparkBuf.length > 40) sparkBuf.shift();
    const w = spark.width, h = spark.height; sctx.clearRect(0, 0, w, h); sctx.fillStyle = 'rgba(255,255,255,.12)'; sctx.fillRect(0, h * (1 - 60 / 70), w, 1);
    sparkBuf.forEach((v, i) => { sctx.fillStyle = v >= 55 ? '#57ffa8' : v >= 40 ? '#ffc247' : '#ff5a5a'; const bh = Math.max(1, Math.min(1, v / 70) * h); sctx.fillRect(i * (w / 40), h - bh, w / 40 - 1, bh); });
  }
  P.showHud = (on) => { if (!hud) return; hud.hidden = !on; if (on) updateHud(true); };

  P.init = () => {
    hud = NV.$('#fps-hud'); if (hud) { spark = hud.querySelector('canvas'); sctx = spark.getContext('2d'); hud.addEventListener('click', () => NV.openSettings && NV.openSettings('quality')); }
    fromSetting();
    P.showHud(!!NV.settings.fpshud || url.has('fps'));
    NV.onSetting((k, v) => { if (k === 'quality') { fromSetting(); } if (k === 'fpshud') P.showHud(!!v); });
    document.addEventListener('visibilitychange', () => { n = 0; P.hold(2000); });
  };
  // apply an initial tier immediately so first paint uses the right CSS
  (function early() { const q = url.get('q') || NV.settings.quality || 'auto'; P.auto = q === 'auto'; apply(P.auto ? startTier() : Math.max(0, IDS.indexOf(q)), 'init'); })();
  NV.dpr = (kind) => Math.min(window.devicePixelRatio || 1, kind === 'cam' ? P.t.cam : P.t.dpr);
})();
