/* NICK-VERSE Scanner: ambient layer (glow, horizon grid, depth particles, vignette) and confetti FX.
   Performance: one low-resolution canvas for the whole ambient layer. On Balanced/Battery tiers it is
   rendered once and only redrawn when the theme, size or mode changes, so the compositor has no
   full-screen damage per frame. On High/Ultra it animates at a capped rate. */
(function () {
  'use strict';
  const NV = window.NV;
  const bg = (NV.bg = {});
  let canvas, ctx, W = 0, H = 0, sc = 0.5, parts = [], sparks = [], bloomP = null, bloomS = null, bloomV = -1;
  let base = null, bctx = null, baseKey = '', dirty = true, lastDraw = 0, acc = 0, gridOff = 0, modeKey = '';
  function makeBloom(hex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, NV.rgba(hex, 0.6)); g.addColorStop(1, NV.rgba(hex, 0));
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return cv;
  }
  const tier = () => (NV.perf ? NV.perf.t : { bg: 'anim', bgScale: 1, bgHz: 60, parts: 1, parallax: true });
  function seed() {
    const T = tier(), area = W * H;
    const n = Math.round(NV.clamp(area / 9000, 36, 160) * (NV.reducedMotion ? 0.45 : 1) * T.parts);
    parts = [];
    for (let i = 0; i < n; i++) {
      const z = Math.random(); // 0 far .. 1 near
      parts.push({ x: Math.random() * W, y: Math.random() * H, z, vx: (Math.random() - 0.5) * 0.12 * (0.4 + z), vy: (-0.05 - Math.random() * 0.18) * (0.4 + z), r: 0.5 + z * 1.9, tw: Math.random() * Math.PI * 2, px: 0, py: 0 });
    }
    dirty = true;
  }
  function resize() {
    const T = tier();
    W = window.innerWidth; H = window.innerHeight;
    sc = NV.clamp((window.devicePixelRatio || 1) * T.bgScale, 0.3, 2);
    canvas.width = Math.max(1, Math.round(W * sc)); canvas.height = Math.max(1, Math.round(H * sc));
    baseKey = ''; seed();
  }
  // static base: theme glows + horizon grid + vignette, rendered once per theme/size
  function renderBase(c) {
    const key = c.primary + c.secondary + canvas.width + 'x' + canvas.height + modeKey;
    if (key === baseKey) return; baseKey = key;
    if (!base) { base = document.createElement('canvas'); bctx = base.getContext('2d'); }
    base.width = canvas.width; base.height = canvas.height;
    const x = bctx; x.setTransform(sc, 0, 0, sc, 0, 0); x.clearRect(0, 0, W, H);
    const glow = (cx, cy, r, col, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, NV.rgba(col, a)); g.addColorStop(1, NV.rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    const m = Math.max(W, H), red = modeKey.includes('r'), dim = modeKey.includes('s') ? 0.35 : 1;
    glow(W * 0.5, H * 0.42, m * 0.55, c.primary, 0.17 * dim);
    glow(W * 0.12, H * 0.92, m * 0.38, c.secondary, 0.08 * dim);
    glow(W * 0.9, H * 0.08, m * 0.32, c.primary, 0.1 * dim);
    if (red) glow(W * 0.5, H * 0.5, m * 0.7, '#ff1a2e', 0.1);
    // horizon grid (perspective) at the bottom
    x.save(); x.beginPath(); x.rect(0, H * 0.56, W, H * 0.44); x.clip();
    const hy = H * 0.56, vx = W / 2; x.strokeStyle = NV.rgba(c.primary, 0.16 * dim); x.lineWidth = 1 / sc;
    x.beginPath(); for (let i = -14; i <= 14; i++) { x.moveTo(vx + i * 8, hy); x.lineTo(vx + i * W * 0.16, H + 10); } x.stroke();
    x.restore();
    // vignette
    const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }
  function gridLines(x, c, off) { // moving horizontal lines of the horizon grid
    const hy = H * 0.56, dim = modeKey.includes('s') ? 0.35 : 1; x.lineWidth = 1 / sc;
    for (let i = 0; i < 9; i++) { const f = ((i + off) / 9), y = hy + (H - hy) * f * f; x.strokeStyle = NV.rgba(c.primary, (0.05 + 0.16 * f) * dim); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  }

  bg.init = function (el) {
    canvas = el; ctx = canvas.getContext('2d', { alpha: true });
    resize(); window.addEventListener('resize', resize);
    NV.onSetting((k) => { if (k === 'reducemotion' || k === 'particles') seed(); });
    NV.on('quality', () => resize());
  };
  bg.setQuality = function () { if (canvas) resize(); };
  bg.reseed = function () { if (canvas) seed(); };
  bg.invalidate = () => { dirty = true; };
  bg.burst = function (x, y, n = 24) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 2.6; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 }); }
    dirty = true;
  };

  bg.draw = function (dt, t) {
    if (!canvas) return;
    const T = tier(), c = NV.colors, x = ctx, cls = document.body.classList;
    const mk = (cls.contains('red-alert') ? 'r' : '') + (cls.contains('stealth-mode') ? 's' : '');
    if (mk !== modeKey) { modeKey = mk; dirty = true; }
    if (bloomV !== c.v) { bloomV = c.v; dirty = true; }
    const animated = T.bg === 'anim' && !NV.reducedMotion;
    if (animated) { acc += dt; if (acc < 1000 / T.bgHz - 2 && !sparks.length) return; }
    else { if (!dirty && !sparks.length) return; if (t - lastDraw < 90) return; } // static tiers: redraw only on change, max ~11 Hz
    const k = Math.min(animated ? acc : dt, 60) / 16.67 * (NV.reducedMotion ? 0.35 : 1) * (mk.includes('s') ? 0.3 : mk.includes('r') ? 2.2 : 1);
    acc = 0; lastDraw = t; dirty = false;
    renderBase(c);
    if (!bloomP || bloomP._v !== c.v) { bloomP = makeBloom(c.primary); bloomS = makeBloom(c.secondary); bloomP._v = c.v; }
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, canvas.width, canvas.height); x.drawImage(base, 0, 0);
    x.setTransform(sc, 0, 0, sc, 0, 0);
    if (animated) gridOff = (gridOff + 0.012 * k) % 1;
    gridLines(x, c, gridOff);
    if (!NV.settings.particles) return;
    const px = T.parallax && NV.parallax ? NV.parallax : { x: 0, y: 0 }, ox = px.x * 26, oy = px.y * 26;
    const pr = NV.hexToRgb(c.primary), sr = NV.hexToRgb(c.secondary);
    const pS = `rgb(${pr[0]},${pr[1]},${pr[2]})`, sS = `rgb(${sr[0]},${sr[1]},${sr[2]})`;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (animated) { p.x += p.vx * k; p.y += p.vy * k; p.tw += 0.02 * k; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10; }
      const X = p.x - ox * p.z, Y = p.y - oy * p.z, tw = 0.55 + 0.45 * Math.sin(p.tw), near = p.z > 0.8, al = (0.18 + p.z * 0.6) * tw;
      if (p.z > 0.7) { const rr = p.r * 5; x.globalAlpha = NV.clamp(al * 0.9, 0, 1); x.drawImage(near ? bloomS : bloomP, X - rr, Y - rr, rr * 2, rr * 2); }
      x.globalAlpha = NV.clamp(al, 0, 1); x.fillStyle = near ? sS : pS; const r = Math.max(p.r, 0.9 / sc); x.fillRect(X - r * 0.7, Y - r * 0.7, r * 1.4, r * 1.4);
    }
    x.globalAlpha = 1;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; const kk = Math.min(dt, 50) / 16.67; s.x += s.vx * kk; s.y += s.vy * kk; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.022 * kk;
      if (s.life <= 0) { sparks.splice(i, 1); if (!sparks.length) dirty = true; continue; }
      x.globalAlpha = s.life; x.fillStyle = sS; x.beginPath(); x.arc(s.x, s.y, 1.6 * s.life + 0.4, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  };
})();

/* Confetti / celebratory FX layer: the canvas is hidden (no layer cost) unless something is flying. */
(function () {
  'use strict';
  const NV = window.NV;
  const fx = (NV.fx = {});
  let cv, x, W, H, dpr = 1, bits = [], active = false;
  const COLS = ['#ffd23f', '#ff4d8d', '#4dffb8', '#4dc3ff', '#b46bff', '#ffffff', '#ff7a3d'];
  function resize() { if (!cv) return; dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  function show(on) { if (cv) cv.style.display = on ? 'block' : 'none'; }
  fx.init = (el) => { cv = el; x = cv.getContext('2d'); resize(); addEventListener('resize', resize); show(false); };
  fx.confetti = (n = 160, ox, oy) => {
    if (!cv) return;
    if (NV.perf && NV.perf.tier <= 1) n = Math.round(n * 0.6);
    const cx = ox ?? W / 2, cy = oy ?? H * 0.35;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, s = 6 + Math.random() * 11;
      bits.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5, c: NV.pick(COLS), life: 1, shape: Math.random() < 0.25 ? 1 : 0 });
    }
    active = true; show(true);
  };
  fx.rain = (n = 60) => { if (!cv) return; for (let i = 0; i < n; i++) bits.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: NV.pick(COLS), life: 1, shape: Math.random() < 0.25 ? 1 : 0 }); active = true; show(true); };
  fx.draw = (dt) => {
    if (!active || !x) return;
    const k = Math.min(dt, 50) / 16.67;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.vy += 0.28 * k; b.vx *= Math.pow(0.985, k); b.vy *= Math.pow(0.985, k); b.x += b.vx * k; b.y += b.vy * k; b.r += b.vr * k;
      if (b.y > H + 30) { bits[i] = bits[bits.length - 1]; bits.pop(); continue; }
      const cs = Math.cos(b.r), sn = Math.sin(b.r), sy = Math.cos(b.r * 2.3);
      x.setTransform(dpr * cs, dpr * sn, -dpr * sn * sy, dpr * cs * sy, b.x * dpr, b.y * dpr);
      x.fillStyle = b.c;
      if (b.shape) { x.beginPath(); x.arc(0, 0, b.w * 0.45, 0, Math.PI * 2); x.fill(); } else x.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    }
    if (!bits.length) { active = false; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); show(false); }
  };
  fx.active = () => active;
})();
