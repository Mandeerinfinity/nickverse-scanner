/* NICK-VERSE Scanner: ambient particle field (depth + parallax) and confetti FX */
(function () {
  'use strict';
  const NV = window.NV;
  const bg = (NV.bg = {});
  let canvas, ctx, W = 0, H = 0, dpr = 1, quality = 1, parts = [], sparks = [], bloomP = null, bloomS = null, bloomV = -1;
  function makeBloom(hex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, NV.rgba(hex, 0.6)); g.addColorStop(1, NV.rgba(hex, 0));
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return cv;
  }

  function seed() {
    const area = W * H; const n = Math.round(NV.clamp(area / 9000, 40, 170) * (NV.reducedMotion ? 0.45 : quality < 1 ? 0.55 : 1));
    parts = [];
    for (let i = 0; i < n; i++) {
      const z = Math.random(); // 0 far .. 1 near
      parts.push({ x: Math.random() * W, y: Math.random() * H, z, vx: (Math.random() - 0.5) * 0.12 * (0.4 + z), vy: (-0.05 - Math.random() * 0.18) * (0.4 + z), r: 0.5 + z * 1.9, tw: Math.random() * Math.PI * 2 });
    }
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    seed();
  }

  bg.init = function (el) {
    canvas = el; ctx = canvas.getContext('2d');
    resize(); window.addEventListener('resize', resize);
    NV.onSetting((k) => { if (k === 'reducemotion') seed(); });
  };
  bg.setQuality = function (q) { q = q < 1 ? 0.5 : 1; if (q === quality) return; quality = q; if (canvas) seed(); };
  bg.reseed = function () { if (canvas) seed(); };
  bg.burst = function (x, y, n = 24) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 2.6; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 }); }
  };

  bg.draw = function (dt, t) {
    if (!canvas) return;
    const c = NV.colors, x = ctx;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    if (!NV.settings.particles) return;
    const speed = (NV.reducedMotion ? 0.35 : 1) * (document.body.classList.contains('stealth-mode') ? 0.3 : document.body.classList.contains('red-alert') ? 2.2 : 1);
    const k = Math.min(dt, 50) / 16.67 * speed;
    const ox = (NV.parallax ? NV.parallax.x : 0) * 26, oy = (NV.parallax ? NV.parallax.y : 0) * 26;
    const pr = NV.hexToRgb(c.primary), sr = NV.hexToRgb(c.secondary);
    if (bloomV !== c.v) { bloomP = makeBloom(c.primary); bloomS = makeBloom(c.secondary); bloomV = c.v; }

    // update + project
    for (const p of parts) {
      p.x += p.vx * k; p.y += p.vy * k; p.tw += 0.02 * k;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      p.px = p.x - ox * p.z; p.py = p.y - oy * p.z;
    }
    // constellation lines between near particles (foreground only)
    x.lineWidth = 0.6;
    const near = quality < 1 || NV.reducedMotion ? [] : parts.filter((p) => p.z > 0.55); /* skip O(n²) lines when throttled */
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const a = near[i], b = near[j], dx = a.px - b.px, dy = a.py - b.py, d2 = dx * dx + dy * dy;
      if (d2 < 16000) { const al = (1 - d2 / 16000) * 0.16; x.strokeStyle = `rgba(${pr[0]},${pr[1]},${pr[2]},${al})`; x.beginPath(); x.moveTo(a.px, a.py); x.lineTo(b.px, b.py); x.stroke(); }
    }
    // particles (additive)
    x.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const tw = 0.55 + 0.45 * Math.sin(p.tw);
      const col = p.z > 0.8 ? sr : pr, al = (0.18 + p.z * 0.6) * tw;
      if (p.z > 0.7) { // soft bloom sprite (pre-rendered)
        const spr = col === sr ? bloomS : bloomP, rr = p.r * 5;
        x.globalAlpha = NV.clamp(al * 0.9, 0, 1); x.drawImage(spr, p.px - rr, p.py - rr, rr * 2, rr * 2); x.globalAlpha = 1;
      }
      x.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${al})`; x.beginPath(); x.arc(p.px, p.py, p.r, 0, Math.PI * 2); x.fill();
    }
    // sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.x += s.vx * k; s.y += s.vy * k; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.022 * k;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      x.fillStyle = `rgba(${sr[0]},${sr[1]},${sr[2]},${s.life})`; x.beginPath(); x.arc(s.x, s.y, 1.6 * s.life + 0.4, 0, Math.PI * 2); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    void t;
  };
})();

/* Confetti / celebratory FX layer */
(function () {
  'use strict';
  const NV = window.NV;
  const fx = (NV.fx = {});
  let cv, x, W, H, dpr = 1, bits = [], active = false;
  const COLS = ['#ffd23f', '#ff4d8d', '#4dffb8', '#4dc3ff', '#b46bff', '#ffffff', '#ff7a3d'];
  function resize() { if (!cv) return; dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  fx.init = (el) => { cv = el; x = cv.getContext('2d'); resize(); addEventListener('resize', resize); };
  fx.confetti = (n = 160, ox, oy) => {
    if (!cv) return;
    const cx = ox ?? W / 2, cy = oy ?? H * 0.35;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, s = 6 + Math.random() * 11;
      bits.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5, c: NV.pick(COLS), life: 1, shape: Math.random() < 0.25 ? 1 : 0 });
    }
    active = true;
  };
  fx.rain = (n = 60) => { if (!cv) return; for (let i = 0; i < n; i++) bits.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: NV.pick(COLS), life: 1, shape: Math.random() < 0.25 ? 1 : 0 }); active = true; };
  fx.draw = (dt) => {
    if (!active || !x) return;
    const k = Math.min(dt, 50) / 16.67;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.vy += 0.28 * k; b.vx *= Math.pow(0.985, k); b.vy *= Math.pow(0.985, k); b.x += b.vx * k; b.y += b.vy * k; b.r += b.vr * k;
      if (b.y > H + 30) { bits.splice(i, 1); continue; }
      x.save(); x.translate(b.x, b.y); x.rotate(b.r); x.scale(1, Math.cos(b.r * 2.3));
      x.fillStyle = b.c; x.shadowColor = b.c; x.shadowBlur = 6;
      if (b.shape) { x.beginPath(); x.arc(0, 0, b.w * 0.45, 0, Math.PI * 2); x.fill(); } else x.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      x.restore();
    }
    if (!bits.length) { active = false; x.clearRect(0, 0, W, H); }
  };
})();
