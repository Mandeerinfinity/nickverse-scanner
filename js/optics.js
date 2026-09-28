/* NICK-VERSE Scanner: optical tools. AR overlay tracking HUD, Colour Lab (picker + paint matcher),
   Text Reader (TextDetector or lazy Tesseract.js), Measure (calibrated ruler + tilt protractor). */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, SN = NV.sensors, TAU = Math.PI * 2;
  const txt = (...a) => NV.draw.txt(...a);
  const mods = (NV.mods = NV.mods || {});
  // Orientation helpers: world "up" vector in device coords -> camera elevation and screen-plane roll
  function attitude() {
    const b = SN.ori.beta * NV.DEG, g = SN.ori.gamma * NV.DEG;
    const ux = -Math.sin(g) * Math.cos(b), uy = Math.sin(b), uz = Math.cos(g) * Math.cos(b);
    return { elev: Math.asin(NV.clamp(-uz, -1, 1)) / NV.DEG, roll: Math.atan2(-ux, uy) / NV.DEG, tilt: Math.acos(NV.clamp(uz, -1, 1)) / NV.DEG };
  }
  NV.attitude = attitude;
  function idleFeed(x, w, h, t, label) {
    const c = NV.colors; x.fillStyle = '#02070b'; x.fillRect(0, 0, w, h);
    x.strokeStyle = NV.rgba(c.primary, 0.08); x.lineWidth = 1; x.beginPath();
    for (let i = 0; i < w; i += 24) { x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, h); } for (let j = 0; j < h; j += 24) { x.moveTo(0, j + 0.5); x.lineTo(w, j + 0.5); } x.stroke();
    const y = (t / 12) % h; x.fillStyle = NV.rgba(c.primary, 0.06); x.fillRect(0, y, w, 40);
    if (label) txt(x, label, w / 2, h - 18, NV.rgba(c.secondary, 0.5), 10, 'center');
  }

  // =================== AR OVERLAY ===================
  const AR = (mods.ar = { mode: 'bright', locked: false, ladder: true, tgt: { x: 0.5, y: 0.5, w: 0.2, h: 0.2, conf: 0 }, id: 1, fps: 60 });
  let arSmall, arCtx, arPrev = null, arN = 0, arLockT = 0, arAcq = 0, arLum = null, arFrameT = 0;
  const SW = 64;
  function arTrack(w, h) {
    const SH = Math.max(8, Math.round(SW * h / w));
    if (arSmall.width !== SW || arSmall.height !== SH) { arSmall.width = SW; arSmall.height = SH; arPrev = null; }
    if (!NV.cam.drawFeed(arCtx, SW, SH)) return;
    const d = arCtx.getImageData(0, 0, SW, SH).data, n = SW * SH;
    const lum = new Float32Array(n), sc = new Float32Array(n); let mean = 0;
    for (let i = 0, j = 0; j < n; i += 4, j++) { lum[j] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; mean += lum[j]; }
    mean /= n;
    for (let j = 0, i = 0; j < n; j++, i += 4) {
      if (AR.mode === 'bright') sc[j] = lum[j];
      else if (AR.mode === 'salient') { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); sc[j] = Math.abs(lum[j] - mean) * 0.8 + (mx - mn) * 0.7; }
      else sc[j] = arPrev ? Math.abs(lum[j] - arPrev[j]) * 3 : 0;
    }
    arPrev = lum; arLum = mean / 255;
    // 5x5 box blur via separable passes
    const tmp = new Float32Array(n), bl = new Float32Array(n), R = 2;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { let s = 0, c = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < SW) { s += sc[y * SW + xx]; c++; } } tmp[y * SW + x] = s / c; }
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { let s = 0, c = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < SH) { s += tmp[yy * SW + x]; c++; } } bl[y * SW + x] = s / c; }
    let x0 = 0, x1 = SW, y0 = 0, y1 = SH;
    if (AR.locked) { const cx = AR.tgt.x * SW, cy = AR.tgt.y * SH, rw = Math.max(6, AR.tgt.w * SW), rh = Math.max(6, AR.tgt.h * SH); x0 = Math.max(0, Math.floor(cx - rw)); x1 = Math.min(SW, Math.ceil(cx + rw)); y0 = Math.max(0, Math.floor(cy - rh)); y1 = Math.min(SH, Math.ceil(cy + rh)); }
    let best = -1, bx = SW / 2, by = SH / 2, avg = 0, cnt = 0;
    for (let y = Math.max(y0, 1); y < Math.min(y1, SH - 1); y++) for (let x = Math.max(x0, 1); x < Math.min(x1, SW - 1); x++) { const v = bl[y * SW + x]; avg += v; cnt++; if (v > best) { best = v; bx = x; by = y; } }
    avg /= Math.max(1, cnt);
    const thr = avg + (best - avg) * 0.6; let minx = bx, maxx = bx, miny = by, maxy = by;
    const win = 14;
    for (let y = Math.max(0, by - win); y < Math.min(SH, by + win); y++) for (let x = Math.max(0, bx - win); x < Math.min(SW, bx + win); x++) if (bl[y * SW + x] >= thr) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    const conf = NV.clamp((best - avg) / (AR.mode === 'motion' ? 40 : 90), 0, 1);
    const T = AR.tgt, k = AR.mode === 'motion' ? 0.18 : 0.28;
    const nx = (minx + maxx + 1) / 2 / SW, ny = (miny + maxy + 1) / 2 / SH, nw = NV.clamp((maxx - minx + 3) / SW, 0.08, 0.7), nh = NV.clamp((maxy - miny + 3) / SH, 0.08, 0.7);
    if (conf > 0.12 || AR.locked) { T.x = NV.lerp(T.x, nx, k); T.y = NV.lerp(T.y, ny, k); T.w = NV.lerp(T.w, nw, 0.15); T.h = NV.lerp(T.h, nh, 0.15); }
    const was = T.conf; T.conf = NV.lerp(T.conf, conf, 0.2);
    if (was < 0.35 && T.conf >= 0.35 && performance.now() - arAcq > 2500) { arAcq = performance.now(); AR.id = 1 + ((AR.id) % 99); NV.audio.tick(1.3); }
  }
  function brackets(x, bx, by, bw, bh, col, t, locked) {
    const L = Math.min(bw, bh) * (0.28 + 0.05 * Math.sin(t / 180)); x.strokeStyle = col; x.lineWidth = locked ? 3 : 2.2; x.shadowColor = col; x.shadowBlur = 12; x.beginPath();
    [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([px, py, sx, sy]) => { x.moveTo(px, py + L * sy); x.lineTo(px, py); x.lineTo(px + L * sx, py); });
    x.stroke(); x.shadowBlur = 0;
    if (locked) { const cx = bx + bw / 2, cy = by + bh / 2, r = Math.min(bw, bh) * 0.62; x.setLineDash([4, 6]); x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, r, t / 500, t / 500 + TAU); x.stroke(); x.setLineDash([]); }
  }
  function arHud(x, w, h, t) {
    const c = NV.colors, P = c.primary, S2 = c.secondary, cx = w / 2, cy = h / 2, m = Math.min(w, h), A = attitude(), hd = SN.heading || 0, fs = m < 330 ? 9.5 : 11;
    const vg = x.createRadialGradient(cx, cy, m * 0.3, cx, cy, Math.hypot(w, h) * 0.6); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
    // heading tape
    const tw = Math.min(w * 0.7, 420), tx = cx - tw / 2, ty = 14, ppd = tw / 90;
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(tx, ty, tw, 24); x.save(); x.beginPath(); x.rect(tx, ty, tw, 30); x.clip();
    for (let dgr = Math.floor((hd - 50) / 5) * 5; dgr <= hd + 50; dgr += 5) { const px = cx + (dgr - hd) * ppd, maj = ((dgr % 15) + 15) % 15 === 0; x.strokeStyle = NV.rgba(S2, maj ? 0.9 : 0.4); x.lineWidth = 1; x.beginPath(); x.moveTo(px, ty + 24); x.lineTo(px, ty + (maj ? 14 : 19)); x.stroke(); if (maj) { const v = ((dgr % 360) + 360) % 360; txt(x, { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[v] || String(v), px, ty + 8, v % 90 ? NV.rgba(S2, 0.75) : c.tertiary, fs, 'center'); } }
    x.restore(); x.fillStyle = S2; x.beginPath(); x.moveTo(cx, ty + 26); x.lineTo(cx - 5, ty + 33); x.lineTo(cx + 5, ty + 33); x.fill();
    txt(x, NV.pad(Math.round(hd) % 360, 3) + '°', cx, ty + 44, '#fff', fs + 1, 'center');
    // pitch ladder (camera elevation) rotated by roll
    if (AR.ladder) {
      const ppdV = h / 55; x.save(); x.translate(cx, cy); x.rotate(-A.roll * NV.DEG); x.beginPath(); x.rect(-w * 0.34, -h * 0.3, w * 0.68, h * 0.6); x.clip();
      for (let p = -90; p <= 90; p += 10) { const y = (A.elev - p) * ppdV; if (Math.abs(y) > h * 0.3) continue; const L = p === 0 ? w * 0.3 : w * 0.1; x.strokeStyle = p === 0 ? NV.rgba(c.tertiary, 0.85) : NV.rgba(P, 0.55); x.lineWidth = p === 0 ? 1.6 : 1.1; if (p < 0) x.setLineDash([5, 5]); x.beginPath(); x.moveTo(-L, y); x.lineTo(-L * 0.35, y); x.moveTo(L * 0.35, y); x.lineTo(L, y); x.stroke(); x.setLineDash([]); if (p) { txt(x, String(p), -L - 14, y, NV.rgba(S2, 0.7), 9.5, 'center'); txt(x, String(p), L + 14, y, NV.rgba(S2, 0.7), 9.5, 'center'); } }
      x.restore();
      // roll arc
      const rr = m * 0.36; x.strokeStyle = NV.rgba(S2, 0.35); x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, rr, -Math.PI * 0.75, -Math.PI * 0.25); x.stroke();
      [-45, -30, -15, 0, 15, 30, 45].forEach((d) => { const a = (-90 + d) * NV.DEG; x.beginPath(); x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); x.lineTo(cx + Math.cos(a) * (rr - (d % 30 ? 5 : 9)), cy + Math.sin(a) * (rr - (d % 30 ? 5 : 9))); x.stroke(); });
      const ra = (-90 - NV.clamp(A.roll, -60, 60)) * NV.DEG; x.fillStyle = c.tertiary; x.beginPath(); x.moveTo(cx + Math.cos(ra) * (rr + 2), cy + Math.sin(ra) * (rr + 2)); x.lineTo(cx + Math.cos(ra - 0.05) * (rr + 11), cy + Math.sin(ra - 0.05) * (rr + 11)); x.lineTo(cx + Math.cos(ra + 0.05) * (rr + 11), cy + Math.sin(ra + 0.05) * (rr + 11)); x.fill();
    }
    // reticle
    const R = m * 0.075; x.strokeStyle = NV.rgba(S2, 0.9); x.lineWidth = 1.4; x.beginPath(); x.arc(cx, cy, R, t / 700, t / 700 + Math.PI * 0.5); x.moveTo(cx + Math.cos(t / 700 + Math.PI) * R, cy + Math.sin(t / 700 + Math.PI) * R); x.arc(cx, cy, R, t / 700 + Math.PI, t / 700 + Math.PI * 1.5); x.stroke();
    x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(cx - R * 1.9, cy); x.lineTo(cx - R * 0.5, cy); x.moveTo(cx + R * 0.5, cy); x.lineTo(cx + R * 1.9, cy); x.moveTo(cx, cy - R * 0.5); x.lineTo(cx, cy - R * 1.2); x.moveTo(cx, cy + R * 0.5); x.lineTo(cx, cy + R * 1.2); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, 1.6, 0, TAU); x.fill();
    // target
    const T = AR.tgt, bw = T.w * w, bh = T.h * h, bx = T.x * w - bw / 2, by = T.y * h - bh / 2, tc = AR.locked ? '#57ffa8' : T.conf > 0.35 ? c.tertiary : NV.rgba(P, 0.7);
    if (T.conf > 0.12 || AR.locked) {
      x.strokeStyle = NV.rgba(tc, 0.5); x.lineWidth = 1; x.setLineDash([2, 4]); x.beginPath(); x.moveTo(cx, cy); x.lineTo(T.x * w, T.y * h); x.stroke(); x.setLineDash([]);
      brackets(x, bx, by, bw, bh, tc, t, AR.locked);
      const lx = NV.clamp(bx + bw + 8, 8, w - 150), ly = NV.clamp(by + 10, 60, h - 60);
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(lx - 4, ly - 10, 142, 44);
      txt(x, `TGT-${NV.pad(AR.id)} ${AR.locked ? '◆ LOCKED' : T.conf > 0.35 ? 'TRACKING' : 'ACQUIRING'}`, lx, ly, tc, 10.5);
      txt(x, `CONF ${Math.round(T.conf * 100)}%  RNG ${range().toFixed(1)}m`, lx, ly + 13, NV.rgba(S2, 0.9), 10);
      txt(x, `BRG ${NV.pad(Math.round(bearing()), 3)}°  X${Math.round((T.x - 0.5) * 100)} Y${Math.round((0.5 - T.y) * 100)}`, lx, ly + 26, NV.rgba(S2, 0.75), 10);
    }
    // side telemetry
    const L = [['ELV', (A.elev >= 0 ? '+' : '') + A.elev.toFixed(0) + '°'], ['ROLL', A.roll.toFixed(0) + '°'], ['G', SN.g.toFixed(2)], ['MODE', AR.mode.toUpperCase()]];
    L.forEach(([k, v], i) => { txt(x, k, 14, h * 0.36 + i * 30, NV.rgba(S2, 0.55), 9.5); txt(x, v, 14, h * 0.36 + i * 30 + 12, '#fff', fs + 1); });
    const Rr = [['LUM', Math.round((arLum || 0) * 100) + '%'], ['FPS', String(Math.round(AR.fps))], ['SRC', NV.cam.sim ? 'SIM' : 'LIVE'], ['TIME', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })]];
    Rr.forEach(([k, v], i) => { txt(x, k, w - 14, h * 0.36 + i * 30, NV.rgba(S2, 0.55), 9.5, 'right'); txt(x, v, w - 14, h * 0.36 + i * 30 + 12, '#fff', fs + 1, 'right'); });
    // corner frame
    x.strokeStyle = NV.rgba(P, 0.8); x.lineWidth = 2; x.beginPath(); const i2 = 8, cl = 22;
    [[i2, i2, 1, 1], [w - i2, i2, -1, 1], [i2, h - i2, 1, -1], [w - i2, h - i2, -1, -1]].forEach(([px, py, sx, sy]) => { x.moveTo(px, py + cl * sy); x.lineTo(px, py); x.lineTo(px + cl * sx, py); }); x.stroke();
    txt(x, 'NV-AR MK X · ' + (AR.locked ? 'TARGET LOCK' : 'AUTO-TRACK'), 14, h - 14, NV.rgba(P, 0.85), fs);
  }
  const bearing = () => ((SN.heading || 0) + (AR.tgt.x - 0.5) * 62 + 360) % 360;
  const range = () => NV.clamp(0.55 / Math.sqrt(Math.max(0.004, AR.tgt.w * AR.tgt.h)), 0.3, 40);
  AR.frame = (t, dt) => {
    const f = NV.fit($('#ar-canvas')); if (!f) return; const { x, w, h } = f;
    AR.fps = NV.lerp(AR.fps, 1000 / Math.max(1, dt || 16), 0.05);
    if (!NV.cam.active() || !NV.cam.drawFeed(x, w, h)) { idleFeed(x, w, h, t, 'AR HUD STANDBY'); arHud(x, w, h, t); return; }
    if (arN++ % 2 === 0) arTrack(w, h);
    arHud(x, w, h, t);
    if (t - arFrameT > 250) { arFrameT = t; NV.text('#ar-tgt', `TGT-${NV.pad(AR.id)}`); NV.text('#ar-conf', Math.round(AR.tgt.conf * 100) + '%'); NV.text('#ar-brg', NV.pad(Math.round(bearing()), 3) + '°'); NV.text('#ar-rng', range().toFixed(1) + ' m'); const b = $('#ar-badge'); const s = AR.locked ? 'LOCKED' : AR.tgt.conf > 0.35 ? 'TRACKING' : 'ACQUIRING'; if (b.textContent !== s) { b.textContent = s; b.className = 'badge ' + (AR.locked ? 'live' : 'warn'); } }
  };
  AR.enter = () => { if (!NV.cam.active()) NV.text('#ar-badge', 'STANDBY'); };
  AR.primary = () => analyseTarget();
  function analyseTarget() {
    if (!NV.cam.active()) { NV.cam.start(); return; }
    const T = AR.tgt, d = arCtx.getImageData(NV.clamp(Math.round(T.x * arSmall.width) - 1, 0, arSmall.width - 3), NV.clamp(Math.round(T.y * arSmall.height) - 1, 0, arSmall.height - 3), 3, 3).data;
    let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } r /= 9; g /= 9; b /= 9;
    const name = NV.cam.colorName(r, g, b), l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const guess = l > 0.8 ? NV.pick(['a light source, possibly a lamp with ambitions', 'something extremely bright, perhaps a window', 'a highly reflective surface. Or a very confident ghost']) : AR.mode === 'motion' ? NV.pick(['something moving. I suspect a hand, Sir. Possibly yours.', 'a moving object of unknown intent', 'motion. Either you, the cat, or a very slow ninja']) : NV.pick(['an object of moderate interest', 'a thing, broadly speaking', 'an item worthy of a second glance']);
    NV.audio.lock(); NV.haptic([15, 40, 15]);
    NV.jarvis.speak(`Target ${NV.pad(AR.id)} analysed. Dominant colour ${name.toLowerCase()}, bearing ${Math.round(bearing())} degrees, estimated range ${range().toFixed(1)} metres. It appears to be ${guess}.`, { tag: 'AR' });
    let th = null; try { th = $('#ar-canvas').toDataURL('image/jpeg', 0.6); } catch (e) { th = null; }
    NV.log.add({ type: 'scan', title: `AR target ${NV.pad(AR.id)} · ${name}`, detail: `Bearing ${Math.round(bearing())}°, range ~${range().toFixed(1)} m (estimate), confidence ${Math.round(T.conf * 100)}%, mode ${AR.mode}. Analysis is entertainment.`, color: NV.rgbToHex(r, g, b), thumb: th });
  }
  function initAR() {
    arSmall = document.createElement('canvas'); arCtx = arSmall.getContext('2d', { willReadFrequently: true });
    NV.$$('#ar-mode button').forEach((b) => (b.onclick = () => { AR.mode = b.dataset.m; arPrev = null; AR.locked = false; $('#ar-lock').setAttribute('aria-pressed', false); NV.$$('#ar-mode button').forEach((o) => o.classList.toggle('on', o === b)); NV.audio.click(1.1); }));
    $('#ar-lock').onclick = () => { AR.locked = !AR.locked; $('#ar-lock').setAttribute('aria-pressed', AR.locked); if (AR.locked) { NV.audio.lock(); NV.haptic(30); NV.award('ar-lock'); } else NV.audio.click(0.8); };
    $('#ar-ladder').onclick = () => { AR.ladder = !AR.ladder; $('#ar-ladder').setAttribute('aria-pressed', AR.ladder); NV.audio.click(); };
    $('#ar-analyse').onclick = analyseTarget;
    $('#ar-canvas').addEventListener('click', (e) => { if (!NV.cam.active()) return; const r = e.currentTarget.getBoundingClientRect(); AR.tgt.x = (e.clientX - r.left) / r.width; AR.tgt.y = (e.clientY - r.top) / r.height; AR.locked = true; $('#ar-lock').setAttribute('aria-pressed', true); NV.audio.lock(); NV.award('ar-lock'); });
  }

  // =================== COLOUR LAB ===================
  const CSS = 'Alice Blue:f0f8ff,Antique White:faebd7,Aqua:00ffff,Aquamarine:7fffd4,Azure:f0ffff,Beige:f5f5dc,Bisque:ffe4c4,Black:000000,Blanched Almond:ffebcd,Blue:0000ff,Blue Violet:8a2be2,Brown:a52a2a,Burlywood:deb887,Cadet Blue:5f9ea0,Chartreuse:7fff00,Chocolate:d2691e,Coral:ff7f50,Cornflower Blue:6495ed,Cornsilk:fff8dc,Crimson:dc143c,Dark Blue:00008b,Dark Cyan:008b8b,Dark Goldenrod:b8860b,Dark Grey:a9a9a9,Dark Green:006400,Dark Khaki:bdb76b,Dark Magenta:8b008b,Dark Olive Green:556b2f,Dark Orange:ff8c00,Dark Orchid:9932cc,Dark Red:8b0000,Dark Salmon:e9967a,Dark Sea Green:8fbc8f,Dark Slate Blue:483d8b,Dark Slate Grey:2f4f4f,Dark Turquoise:00ced1,Dark Violet:9400d3,Deep Pink:ff1493,Deep Sky Blue:00bfff,Dim Grey:696969,Dodger Blue:1e90ff,Firebrick:b22222,Floral White:fffaf0,Forest Green:228b22,Gainsboro:dcdcdc,Ghost White:f8f8ff,Gold:ffd700,Goldenrod:daa520,Grey:808080,Green:008000,Green Yellow:adff2f,Honeydew:f0fff0,Hot Pink:ff69b4,Indian Red:cd5c5c,Indigo:4b0082,Ivory:fffff0,Khaki:f0e68c,Lavender:e6e6fa,Lavender Blush:fff0f5,Lawn Green:7cfc00,Lemon Chiffon:fffacd,Light Blue:add8e6,Light Coral:f08080,Light Cyan:e0ffff,Light Goldenrod:fafad2,Light Grey:d3d3d3,Light Green:90ee90,Light Pink:ffb6c1,Light Salmon:ffa07a,Light Sea Green:20b2aa,Light Sky Blue:87cefa,Light Slate Grey:778899,Light Steel Blue:b0c4de,Light Yellow:ffffe0,Lime:00ff00,Lime Green:32cd32,Linen:faf0e6,Maroon:800000,Medium Aquamarine:66cdaa,Medium Blue:0000cd,Medium Orchid:ba55d3,Medium Purple:9370db,Medium Sea Green:3cb371,Medium Slate Blue:7b68ee,Medium Spring Green:00fa9a,Medium Turquoise:48d1cc,Medium Violet Red:c71585,Midnight Blue:191970,Mint Cream:f5fffa,Misty Rose:ffe4e1,Moccasin:ffe4b5,Navajo White:ffdead,Navy:000080,Old Lace:fdf5e6,Olive:808000,Olive Drab:6b8e23,Orange:ffa500,Orange Red:ff4500,Orchid:da70d6,Pale Goldenrod:eee8aa,Pale Green:98fb98,Pale Turquoise:afeeee,Pale Violet Red:db7093,Papaya Whip:ffefd5,Peach Puff:ffdab9,Peru:cd853f,Pink:ffc0cb,Plum:dda0dd,Powder Blue:b0e0e6,Purple:800080,Rebecca Purple:663399,Red:ff0000,Rosy Brown:bc8f8f,Royal Blue:4169e1,Saddle Brown:8b4513,Salmon:fa8072,Sandy Brown:f4a460,Sea Green:2e8b57,Seashell:fff5ee,Sienna:a0522d,Silver:c0c0c0,Sky Blue:87ceeb,Slate Blue:6a5acd,Slate Grey:708090,Snow:fffafa,Spring Green:00ff7f,Steel Blue:4682b4,Tan:d2b48c,Teal:008080,Thistle:d8bfd8,Tomato:ff6347,Turquoise:40e0d0,Violet:ee82ee,Wheat:f5deb3,White:ffffff,White Smoke:f5f5f5,Yellow:ffff00,Yellow Green:9acd32,Charcoal:36454f,Cream:fffdd0,Mustard:e1ad01,Terracotta:e2725b,Sage:9caf88,Mauve:e0b0ff,Burgundy:800020,Ochre:cc7722,Mint:98ff98,Taupe:8b8589,Denim:1560bd,Sand:c2b280';
  const NAMED = CSS.split(',').map((e) => { const [n, h] = e.split(':'); const rgb = NV.hexToRgb(h); return { n, hex: '#' + h, lab: lab(...rgb) }; });
  function lab(r, g, b) {
    const f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    const R = f(r), G = f(g), B = f(b);
    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const q = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); X = q(X); Y = q(Y); Z = q(Z);
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  }
  function nearest(rgb) { const L = lab(...rgb); let best = null, bd = 1e9; for (const c of NAMED) { const d = Math.hypot(L[0] - c.lab[0], L[1] - c.lab[1], L[2] - c.lab[2]); if (d < bd) { bd = d; best = c; } } return { ...best, de: bd }; }
  NV.nearestColour = nearest;
  const ADJ = ['Suspicious', 'Midnight', 'Executive', 'Retired', 'Mildly Haunted', 'Sunday', 'Tactical', 'Artisanal', 'Nostalgic', 'Dramatic', 'Polite', 'Radioactive', 'Sleepy', 'Victorian', 'Galactic', 'Understated', 'Nick-Verse', 'Existential'];
  const NOUN = { red: ['Ketchup', 'Fire Engine', 'Lobster', 'Tomato Rebellion'], orange: ['Traffic Cone', 'Marmalade', 'Pumpkin', 'Tangerine Dream'], yellow: ['Rubber Duck', 'Custard', 'Banana Peel', 'Pocket Sun'], green: ['Retired Frog', 'Houseplant', 'Pea Soup', 'Alien Lettuce'], teal: ['Swimming Pool', 'Mermaid', 'Lagoon', 'Screensaver'], blue: ['Sky Fragment', 'Denim', 'Deep Sea', 'Sad Robot'], purple: ['Grape Of Destiny', 'Wizard Robe', 'Aubergine', 'Disco Relic'], pink: ['Bubblegum', 'Flamingo', 'Candyfloss', 'Blush'], brown: ['Cardboard Fort', 'Artisan Toast', 'Couch Cushion', 'Biscuit'], grey: ['Office Chair', 'Pigeon', 'Concrete Thought', 'Rain Cloud'], white: ['Blank Page', 'Ghost', 'Polar Bear', 'Fresh Snow'], black: ['Void', 'Pocket Interior', 'Midnight Sock', 'Espresso'] };
  const FIN = ['Matte', 'Eggshell', 'Satin', 'Gloss', 'Existential Satin', 'High-Drama Gloss'];
  function family(h, s, l) { if (l < 0.12) return 'black'; if (l > 0.92 && s < 0.4) return 'white'; if (s < 0.14) return 'grey'; if ((h < 40 || h > 15) && l < 0.42 && h < 45 && s < 0.75) return 'brown'; if (h < 15 || h >= 345) return l > 0.7 ? 'pink' : 'red'; if (h < 40) return 'orange'; if (h < 68) return 'yellow'; if (h < 160) return 'green'; if (h < 195) return 'teal'; if (h < 255) return 'blue'; if (h < 300) return 'purple'; return 'pink'; }
  function paintName(rgb) {
    const q = rgb.map((v) => v >> 4).join(','); let hsh = 0; for (const ch of q) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const [h, s, l] = NV.cam.rgb2hsl(...rgb), fam = family(h, s, l);
    return `CINCO Paint No. ${100 + (hsh % 900)} · “${ADJ[hsh % ADJ.length]} ${NOUN[fam][(hsh >> 5) % NOUN[fam].length]}” · ${FIN[(hsh >> 9) % FIN.length]}`;
  }
  const hslHex = (h, s, l) => NV.hslHex(((h % 360) + 360) % 360, s * 100, l * 100);
  const CL = (mods.color = { pt: { x: 0.5, y: 0.5 }, locked: false, rgb: null, taps: 0, lastS: 0 });
  let colCv;
  function sampleAt(f) {
    const { x, w, h, dpr } = f, px = Math.round(CL.pt.x * w * dpr), py = Math.round(CL.pt.y * h * dpr), r = Math.max(2, Math.round(3 * dpr));
    const d = x.getImageData(NV.clamp(px - r, 0, colCv.width - 2 * r - 1), NV.clamp(py - r, 0, colCv.height - 2 * r - 1), 2 * r + 1, 2 * r + 1).data;
    let R = 0, G = 0, B = 0, n = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    CL.rgb = [R / n, G / n, B / n]; renderColour();
  }
  function renderColour() {
    const rgb = CL.rgb.map(Math.round), hex = NV.rgbToHex(...rgb).toUpperCase(), [h, s, l] = NV.cam.rgb2hsl(...rgb), near = nearest(rgb);
    const k = 1 - Math.max(...rgb) / 255, cmyk = k >= 1 ? [0, 0, 0, 100] : [(1 - rgb[0] / 255 - k) / (1 - k), (1 - rgb[1] / 255 - k) / (1 - k), (1 - rgb[2] / 255 - k) / (1 - k), k].map((v, i) => Math.round((i < 3 ? v : v) * 100));
    const sw = $('#col-swatch'); sw.style.background = hex; sw.style.setProperty('--sw', hex); sw.classList.toggle('light', l > 0.6); NV.text('#col-swatch-k', hex);
    NV.text('#col-name', near.n); NV.text('#col-match', `Nearest named colour ${near.hex.toUpperCase()} · ΔE ${near.de.toFixed(1)} ${near.de < 3 ? '(excellent)' : near.de < 8 ? '(close)' : near.de < 16 ? '(near-ish)' : '(loose)'}`);
    NV.text('#col-paint', paintName(rgb));
    NV.text('#col-hex', hex); NV.text('#col-rgb', rgb.join(', ')); NV.text('#col-hsl', `${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`); NV.text('#col-cmyk', cmyk.join(', '));
    const S2 = Math.max(0.35, s), L2 = NV.clamp(l, 0.25, 0.75);
    const rows = [['Complementary', [0, 180]], ['Triadic', [0, 120, 240]], ['Analogous', [-30, 0, 30]], ['Split', [0, 150, 210]]];
    const key = rows.map((r) => r[1].map((o) => (o === 0 ? hex : hslHex(h + o, S2, L2))).join()).join('|');
    if (CL._hk !== key) { CL._hk = key; $('#col-harmony').innerHTML = rows.map(([n, offs]) => `<div class="h-row"><span class="h-k">${n}</span><div class="h-sw">${offs.map((o) => { const c = o === 0 ? hex : hslHex(h + o, S2, L2).toUpperCase(); return `<button data-hex="${c}" style="--c:${c}" title="Copy ${c}"><i></i><span class="mono">${c}</span></button>`; }).join('')}</div></div>`).join(''); }
    const b = $('#col-badge'); const bt = CL.locked ? 'LOCKED' : 'LIVE SAMPLE'; if (b.textContent !== bt) { b.textContent = bt; b.className = 'badge ' + (CL.locked ? 'warn' : 'live'); }
  }
  function renderSaved() { const list = NV.store.get('swatches', []); $('#col-saved').innerHTML = list.length ? list.map((c) => `<button data-hex="${c}" style="--c:${c}" title="Copy ${c}"><i></i><span class="mono">${c}</span></button>`).join('') : '<span class="empty">Saved swatches appear here.</span>'; }
  CL.frame = (t) => {
    const f = NV.fit(colCv); if (!f) return; const { x, w, h } = f, c = NV.colors;
    if (!NV.cam.active() || !NV.cam.drawFeed(x, w, h)) { idleFeed(x, w, h, t, 'COLOUR LAB STANDBY'); return; }
    if (!CL.locked && t - CL.lastS > 140) { CL.lastS = t; sampleAt(f); }
    const px = CL.pt.x * w, py = CL.pt.y * h;
    // loupe: magnified pixels around the sample point
    const lr = Math.min(56, w * 0.14), lx = px + (px > w - lr * 2.6 ? -lr * 1.6 : lr * 1.6), ly = NV.clamp(py - lr * 1.2, lr + 6, h - lr - 6), dpr = f.dpr;
    x.save(); x.beginPath(); x.arc(lx, ly, lr, 0, TAU); x.clip(); x.imageSmoothingEnabled = false;
    x.setTransform(1, 0, 0, 1, 0, 0); const sz = 14 * dpr; x.drawImage(colCv, px * dpr - sz / 2, py * dpr - sz / 2, sz, sz, (lx - lr) * dpr, (ly - lr) * dpr, lr * 2 * dpr, lr * 2 * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; const cell = lr * 2 / 14; for (let i = -7; i <= 7; i++) { x.beginPath(); x.moveTo(lx + i * cell, ly - lr); x.lineTo(lx + i * cell, ly + lr); x.moveTo(lx - lr, ly + i * cell); x.lineTo(lx + lr, ly + i * cell); x.stroke(); }
    x.restore();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.shadowColor = c.primary; x.shadowBlur = 12; x.beginPath(); x.arc(lx, ly, lr, 0, TAU); x.stroke(); x.shadowBlur = 0;
    x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.strokeRect(lx - cell / 2, ly - cell / 2, cell, cell);
    // marker
    const hex = CL.rgb ? NV.rgbToHex(...CL.rgb) : '#000';
    x.strokeStyle = CL.locked ? c.tertiary : '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 14, 0, TAU); x.stroke();
    x.beginPath(); x.moveTo(px - 24, py); x.lineTo(px - 17, py); x.moveTo(px + 17, py); x.lineTo(px + 24, py); x.moveTo(px, py - 24); x.lineTo(px, py - 17); x.moveTo(px, py + 17); x.lineTo(px, py + 24); x.stroke();
    x.fillStyle = hex; x.beginPath(); x.arc(px, py, 5, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1; x.stroke();
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(10, h - 30, 170, 22); txt(x, (CL.locked ? '◆ LOCKED ' : '● SAMPLING ') + hex.toUpperCase(), 18, h - 19, CL.locked ? c.tertiary : c.secondary, 11);
  };
  CL.primary = () => $('#col-save').click();
  function initColour() {
    colCv = $('#col-canvas'); colCv._ctx = colCv.getContext('2d', { willReadFrequently: true });
    colCv.addEventListener('pointerdown', (e) => {
      if (!NV.cam.active()) return; const r = colCv.getBoundingClientRect(); CL.pt = { x: NV.clamp((e.clientX - r.left) / r.width, 0.01, 0.99), y: NV.clamp((e.clientY - r.top) / r.height, 0.01, 0.99) };
      CL.lastS = 0; if (CL.locked) { CL.locked = false; $('#col-lock').setAttribute('aria-pressed', false); }
      NV.audio.pop(); NV.haptic(12); CL.taps++; const n = NV.store.get('colourTaps', 0) + 1; NV.store.set('colourTaps', n); if (n >= 5) NV.award('colour');
      setTimeout(() => { if (CL.rgb) { CL.locked = true; $('#col-lock').setAttribute('aria-pressed', true); renderColour(); } }, 220);
    });
    $('#col-lock').onclick = () => { CL.locked = !CL.locked; $('#col-lock').setAttribute('aria-pressed', CL.locked); NV.audio.click(CL.locked ? 1.2 : 0.8); if (CL.rgb) renderColour(); };
    $('#col-save').onclick = () => { if (!CL.rgb) { NV.toast('Sample a colour first, Sir. Tap the feed.'); return; } const hex = NV.rgbToHex(...CL.rgb).toUpperCase(), list = NV.store.get('swatches', []).filter((c) => c !== hex); list.unshift(hex); NV.store.set('swatches', list.slice(0, 12)); renderSaved(); NV.audio.confirm(); NV.toast('Swatch ' + hex + ' saved.', 1800); };
    $('#col-clear').onclick = () => { NV.store.set('swatches', []); renderSaved(); NV.audio.click(0.8); };
    $('#col-swatch').onclick = () => CL.rgb && NV.copy(NV.rgbToHex(...CL.rgb).toUpperCase(), 'Copied');
    const copyHex = (e) => { const b = e.target.closest('[data-hex]'); if (b) { NV.copy(b.dataset.hex, 'Copied'); NV.audio.pop(); } };
    $('#col-harmony').addEventListener('click', copyHex); $('#col-saved').addEventListener('click', copyHex);
    NV.$$('.col-codes [data-copy]').forEach((b) => (b.onclick = () => { const v = b.querySelector('.v').textContent; if (v !== '--') NV.copy(b.dataset.copy === 'hex' ? v : `${b.dataset.copy}(${v.replace(/°/g, '')})`, 'Copied'); }));
    renderSaved();
  }

  // =================== TEXT READER ===================
  const OC = (mods.ocr = { frozen: false, busy: false, engine: null, boxes: [], text: '' });
  const TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  let snap, sctx, native = null, tessWorker = null, tessLoading = null, ocrCv;
  function engineLabel() { NV.text('#ocr-engine', native ? 'Engine: TextDetector (built into this browser, works offline)' : tessWorker ? 'Engine: Tesseract.js (loaded, ready)' : 'Engine: Tesseract.js on request (~4 MB download on first read, needs internet)'); }
  function setOcrBadge(t, cls) { const b = $('#ocr-badge'); b.textContent = t; b.className = 'badge' + (cls ? ' ' + cls : ''); }
  function prog(p, label) { const bar = $('#ocr-prog'); if (p == null) { bar.hidden = true; return; } bar.hidden = false; $('#ocr-prog-fill').style.width = Math.round(p * 100) + '%'; if (label) NV.text('#ocr-engine', label); }
  function loadScript(src, ms = 25000) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous'; const to = setTimeout(() => { s.remove(); rej(new Error('timeout')); }, ms); s.onload = () => { clearTimeout(to); res(); }; s.onerror = () => { clearTimeout(to); s.remove(); rej(new Error('load')); }; document.head.appendChild(s); }); }
  async function ensureTess() {
    if (tessWorker) return tessWorker;
    if (!navigator.onLine) throw new Error('offline');
    if (!tessLoading) tessLoading = (async () => {
      prog(0.05, 'Downloading the Tesseract.js text engine…');
      if (!window.Tesseract) await loadScript(TESS_URL);
      const w = await window.Tesseract.createWorker('eng', 1, { logger: (m) => { if (m && typeof m.progress === 'number') prog(0.1 + m.progress * 0.85, 'Text engine: ' + (m.status || 'working') + '…'); } });
      tessWorker = w; return w;
    })().catch((e) => { tessLoading = null; throw e; });
    return tessLoading;
  }
  function captureFeed() {
    const si = NV.cam.source(); if (!si) return false;
    const r = $('#ocr-canvas').getBoundingClientRect(), aspect = r.width / Math.max(1, r.height), W = Math.min(1600, si.sw), H = Math.round(W / aspect);
    snap.width = W; snap.height = H; NV.cam.drawFeed(sctx, W, H); return true;
  }
  async function recognise() {
    if (OC.busy) return; OC.busy = true; OC.boxes = []; setOcrBadge('READING…', 'warn'); $('#ocr-read').disabled = true; NV.audio.scan();
    try {
      let lines = [];
      if (native) {
        const res = await native.detect(snap);
        OC.boxes = res.map((r) => ({ x: r.boundingBox.x / snap.width, y: r.boundingBox.y / snap.height, w: r.boundingBox.width / snap.width, h: r.boundingBox.height / snap.height }));
        lines = res.slice().sort((a, b) => a.boundingBox.y - b.boundingBox.y || a.boundingBox.x - b.boundingBox.x).map((r) => r.rawValue);
      } else {
        const w = await ensureTess(); prog(0.92, 'Reading…');
        const { data } = await w.recognize(snap);
        OC.boxes = (data.words || []).filter((wd) => wd.confidence > 40).map((wd) => ({ x: wd.bbox.x0 / snap.width, y: wd.bbox.y0 / snap.height, w: (wd.bbox.x1 - wd.bbox.x0) / snap.width, h: (wd.bbox.y1 - wd.bbox.y0) / snap.height }));
        lines = OC.boxes.length && (data.confidence == null || data.confidence > 35) ? (data.lines && data.lines.length ? data.lines.filter((ln) => ln.confidence > 40).map((ln) => ln.text) : (data.text || '').split('\n')) : [];
      }
      OC.text = lines.map((l) => l.trim()).filter((l) => l && /[A-Za-z0-9]{2,}/.test(l)).join('\n');
      prog(null); engineLabel();
      if (OC.text) { $('#ocr-out').textContent = OC.text; setOcrBadge(OC.boxes.length + ' REGIONS', 'live'); NV.audio.scanDone(); NV.award('ocr'); NV.log.add({ type: 'note', title: 'Text: ' + OC.text.slice(0, 40), detail: OC.text.slice(0, 1500), thumb: thumbOf() }); NV.jarvis.speak(OC.text.length < 140 ? `I read: ${OC.text.replace(/\n/g, '. ')}` : `I have read ${OC.text.split(/\s+/).length} words, Sir. They are on screen.`, { tag: 'OCR' }); }
      else { $('#ocr-out').innerHTML = '<span class="ocr-empty">No legible text found. Try more light, less wobble, or larger print.</span>'; setOcrBadge('NO TEXT', 'warn'); NV.audio.deny(); }
    } catch (e) {
      prog(null); engineLabel();
      const off = e && e.message === 'offline';
      $('#ocr-out').innerHTML = `<span class="ocr-empty">${off ? 'You appear to be offline, Sir. The text engine needs a one-time download, so reading text will work once you are back online. Everything else still works offline.' : 'I could not load the text engine (the network may be blocked). The scanner itself is unaffected. Please try again later.'}</span>`;
      setOcrBadge(off ? 'OFFLINE' : 'ENGINE N/A', 'bad'); NV.audio.deny();
    } finally { OC.busy = false; $('#ocr-read').disabled = false; }
  }
  function thumbOf() { const t = document.createElement('canvas'); t.width = 240; t.height = Math.round(240 * snap.height / Math.max(1, snap.width)); try { t.getContext('2d').drawImage(snap, 0, 0, t.width, t.height); return t.toDataURL('image/jpeg', 0.7); } catch (e) { return null; } }
  OC.read = () => {
    if (OC.busy) return;
    if (!OC.frozen) { if (!NV.cam.active()) { NV.cam.start(); NV.toast('Engaging optics first, Sir. Press again once you can see the text.'); return; } if (!captureFeed()) return; OC.frozen = true; $('#ocr-resume').disabled = false; NV.audio.shutter(); }
    recognise();
  };
  OC.primary = OC.read;
  OC.frame = (t) => {
    const f = NV.fit(ocrCv); if (!f) return; const { x, w, h } = f, c = NV.colors;
    if (OC.frozen) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const s = Math.min(w / snap.width, h / snap.height), dw = snap.width * s, dh = snap.height * s, ox = (w - dw) / 2, oy = (h - dh) / 2; x.drawImage(snap, ox, oy, dw, dh);
      x.strokeStyle = '#57ffa8'; x.lineWidth = 1.5; x.shadowColor = '#57ffa8'; x.shadowBlur = 8; OC.boxes.forEach((b) => x.strokeRect(ox + b.x * dw, oy + b.y * dh, b.w * dw, b.h * dh)); x.shadowBlur = 0;
      if (OC.busy) { const y = oy + ((t / 6) % dh); const g = x.createLinearGradient(0, y - 50, 0, y); g.addColorStop(0, NV.rgba(c.primary, 0)); g.addColorStop(1, NV.rgba(c.primary, 0.4)); x.fillStyle = g; x.fillRect(ox, y - 50, dw, 50); x.fillStyle = c.primary; x.fillRect(ox, y, dw, 2); }
      return; }
    if (!NV.cam.active() || !NV.cam.drawFeed(x, w, h)) { idleFeed(x, w, h, t, 'TEXT READER STANDBY'); return; }
    const gw = w * 0.82, gh = h * 0.56, gx = (w - gw) / 2, gy = (h - gh) / 2, L = 26;
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, w, gy); x.fillRect(0, gy + gh, w, h - gy - gh); x.fillRect(0, gy, gx, gh); x.fillRect(gx + gw, gy, w - gx - gw, gh);
    x.strokeStyle = c.secondary; x.lineWidth = 2.5; x.shadowColor = c.primary; x.shadowBlur = 10; x.beginPath();
    [[gx, gy, 1, 1], [gx + gw, gy, -1, 1], [gx, gy + gh, 1, -1], [gx + gw, gy + gh, -1, -1]].forEach(([px, py, sx, sy]) => { x.moveTo(px, py + L * sy); x.lineTo(px, py); x.lineTo(px + L * sx, py); }); x.stroke(); x.shadowBlur = 0;
    txt(x, 'ALIGN TEXT WITHIN THE FRAME', w / 2, gy - 12, NV.rgba(c.secondary, 0.9), 10.5, 'center');
  };
  OC.leave = () => {};
  function initOCR() {
    ocrCv = $('#ocr-canvas'); snap = document.createElement('canvas'); snap.width = 4; snap.height = 3; sctx = snap.getContext('2d');
    if ('TextDetector' in window) { try { native = new window.TextDetector(); } catch (e) { native = null; } }
    engineLabel();
    $('#ocr-read').onclick = OC.read;
    $('#ocr-resume').onclick = () => { OC.frozen = false; OC.boxes = []; $('#ocr-resume').disabled = true; if (!NV.cam.active()) $('#ocr-start').classList.remove('gone'); setOcrBadge('READY'); NV.audio.click(0.9); };
    $('#ocr-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return; const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)); snap.width = Math.round(img.width * s); snap.height = Math.round(img.height * s); sctx.drawImage(img, 0, 0, snap.width, snap.height); URL.revokeObjectURL(url); OC.frozen = true; $('#ocr-start').classList.add('gone'); $('#ocr-resume').disabled = false; recognise(); };
      img.onerror = () => { URL.revokeObjectURL(url); NV.toast('That image would not open, Sir.'); };
      img.src = url; e.target.value = '';
    });
    $('#ocr-copy').onclick = () => (OC.text ? NV.copy(OC.text.length > 60 ? OC.text : OC.text, 'Copied text') : NV.toast('Nothing to copy yet, Sir.'));
    $('#ocr-speak').onclick = () => (OC.text ? NV.jarvis.speak(OC.text.slice(0, 600), { tag: 'READ' }) : NV.toast('Nothing to read yet, Sir.'));
    $('#ocr-clear').onclick = () => { OC.text = ''; OC.boxes = []; $('#ocr-out').innerHTML = '<span class="ocr-empty">Recognised text will appear here. Point at something printed, in good light.</span>'; NV.audio.click(0.8); };
  }

  // =================== MEASURE ===================
  const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  const MS = (mods.measure = { mode: 'ruler', ppm: NV.store.get('ppm', coarse ? 6.3 : 3.78), cal: NV.store.get('ppmCal', false), a: 10, b: 60, drag: null, hold: false, held: 0, zero: NV.store.get('protZero', 0), pmode: 'edge', calOpen: false });
  const R0 = 14; // px from canvas left edge to the ruler's zero
  function measureReads() {
    const mm = Math.abs(MS.b - MS.a);
    NV.text('#ms-len', mm.toFixed(1) + ' mm'); NV.text('#ms-cm', (mm / 10).toFixed(2) + ' cm'); NV.text('#ms-in', (mm / 25.4).toFixed(2) + ' in'); NV.text('#ms-scale-v', MS.ppm.toFixed(2) + ' px/mm');
    const b = $('#ms-badge'); b.textContent = MS.cal ? 'CALIBRATED' : 'UNCALIBRATED'; b.className = 'badge ' + (MS.cal ? 'live' : 'warn');
  }
  function drawRuler() {
    const f = NV.fit($('#ms-ruler-cv')); if (!f) return; const { x, w, h } = f, c = NV.colors, p = MS.ppm;
    x.clearRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, NV.rgba(c.primary, 0.16)); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const maxMm = (w - R0) / p;
    // metric ticks along the top
    x.lineWidth = 1;
    for (let mm = 0; mm <= maxMm; mm++) { const X = R0 + mm * p + 0.5, big = mm % 10 === 0, mid = mm % 5 === 0; if (p < 4.5 && !mid && mm % 2) continue; x.strokeStyle = big ? c.secondary : NV.rgba(c.primary, mid ? 0.8 : 0.55); x.beginPath(); x.moveTo(X, 0); x.lineTo(X, big ? 30 : mid ? 21 : 13); x.stroke(); if (big) txt(x, String(mm / 10), X + (mm ? 0 : 5), 40, big && mm ? '#fff' : NV.rgba(c.secondary, 0.8), 11, 'center'); }
    txt(x, 'CENTIMETRES', w - 10, 58, NV.rgba(c.secondary, 0.6), 9.5, 'right');
    // imperial along the bottom
    const ppi = p * 25.4, maxIn = (w - R0) / ppi;
    for (let s = 0; s <= maxIn * 16; s++) { const X = R0 + (s / 16) * ppi + 0.5, whole = s % 16 === 0, half = s % 8 === 0, q = s % 4 === 0; if (ppi < 70 && !q) continue; x.strokeStyle = whole ? c.secondary : NV.rgba(c.primary, half ? 0.75 : 0.45); x.beginPath(); x.moveTo(X, h); x.lineTo(X, h - (whole ? 26 : half ? 19 : q ? 13 : 8)); x.stroke(); if (whole) txt(x, String(s / 16), X + (s ? 0 : 5), h - 34, s ? '#fff' : NV.rgba(c.secondary, 0.8), 11, 'center'); }
    txt(x, 'INCHES', w - 10, h - 52, NV.rgba(c.secondary, 0.6), 9.5, 'right');
    // measurement band + handles
    const fitMm = (w - R0 - 12) / p; if (!MS.drag && fitMm > 10) { if (MS.b > fitMm) { MS.b = Math.round(fitMm * 0.8); measureReads(); } if (MS.a > fitMm) { MS.a = Math.min(MS.b - 5, 10); measureReads(); } }
    const A = R0 + MS.a * p, B = R0 + MS.b * p, lo = Math.min(A, B), hi = Math.max(A, B), mm = Math.abs(MS.b - MS.a);
    x.fillStyle = NV.rgba(c.primary, 0.18); x.fillRect(lo, 48, hi - lo, h - 96);
    x.strokeStyle = NV.rgba(c.secondary, 0.6); x.setLineDash([4, 4]); x.beginPath(); x.moveTo(lo, h / 2); x.lineTo(hi, h / 2); x.stroke(); x.setLineDash([]);
    [A, B].forEach((X, i) => { x.strokeStyle = i ? c.tertiary : c.secondary; x.lineWidth = 2; x.shadowColor = x.strokeStyle; x.shadowBlur = 10; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, h); x.stroke(); x.shadowBlur = 0; x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(X, h / 2, 11, 0, TAU); x.fill(); x.fillStyle = NV.colors.bg; txt(x, i ? 'B' : 'A', X, h / 2 + 1, '#021018', 11, 'center', 'Orbitron, sans-serif', '800'); });
    const lab = mm >= 10 ? (mm / 10).toFixed(1) + ' cm' : mm.toFixed(1) + ' mm', lx = NV.clamp((lo + hi) / 2, 50, w - 50);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(lx - 44, h / 2 - 32, 88, 20); txt(x, lab, lx, h / 2 - 22, '#fff', 13, 'center', 'Orbitron, sans-serif', '700');
    if (!MS.cal) txt(x, 'UNCALIBRATED ESTIMATE', w / 2, h / 2 + 26, NV.rgba(c.tertiary, 0.85), 10, 'center');
  }
  function protAngle() {
    const A = attitude(); let v = MS.pmode === 'edge' ? A.roll : A.tilt; v -= MS.zero; if (MS.pmode === 'edge') v = ((v + 540) % 360) - 180; return v;
  }
  function drawProt(t) {
    const f = NV.fit($('#ms-prot-cv')); if (!f) return; const { x, w, h } = f, c = NV.colors;
    x.clearRect(0, 0, w, h);
    const live = MS.hold ? MS.held : protAngle(); MS.disp = MS.disp == null ? live : MS.disp + (live - MS.disp) * 0.2; const ang = MS.disp;
    const cx = w / 2, cy = h * 0.86, R = Math.min(w * 0.46, h * 0.78);
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, NV.rgba(c.primary, 0.18)); bg.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, Math.PI, TAU); x.closePath(); x.fill();
    x.strokeStyle = NV.rgba(c.primary, 0.7); x.lineWidth = 2; x.shadowColor = c.primary; x.shadowBlur = 10; x.beginPath(); x.arc(cx, cy, R, Math.PI, TAU); x.stroke(); x.shadowBlur = 0;
    for (let d = 0; d <= 180; d++) { const a = Math.PI + d * NV.DEG, big = d % 10 === 0, mid = d % 5 === 0; if (!mid && R < 150 && d % 2) continue; x.strokeStyle = big ? c.secondary : NV.rgba(c.primary, mid ? 0.7 : 0.4); x.lineWidth = big ? 1.6 : 1; x.beginPath(); x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.lineTo(cx + Math.cos(a) * (R - (big ? 16 : mid ? 10 : 6)), cy + Math.sin(a) * (R - (big ? 16 : mid ? 10 : 6))); x.stroke(); if (big && d % 30 === 0) txt(x, String(MS.pmode === 'edge' ? d - 90 : 180 - d > 90 ? d : 180 - d), cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30), NV.rgba(c.secondary, 0.75), 10.5, 'center'); }
    x.strokeStyle = NV.rgba(c.primary, 0.35); x.lineWidth = 1; x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.stroke();
    // needle
    const na = MS.pmode === 'edge' ? -Math.PI / 2 + NV.clamp(ang, -90, 90) * NV.DEG : Math.PI + NV.clamp(ang, 0, 180) * NV.DEG;
    x.fillStyle = NV.rgba(c.primary, 0.22); x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R * 0.82, MS.pmode === 'edge' ? -Math.PI / 2 : Math.PI, na, MS.pmode === 'edge' ? ang < 0 : false); x.closePath(); x.fill();
    x.strokeStyle = MS.hold ? c.tertiary : '#fff'; x.lineWidth = 2.5; x.shadowColor = c.secondary; x.shadowBlur = 14; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(na) * R * 0.94, cy + Math.sin(na) * R * 0.94); x.stroke(); x.shadowBlur = 0;
    x.fillStyle = c.secondary; x.beginPath(); x.arc(cx, cy, 6, 0, TAU); x.fill();
    txt(x, (ang >= 0 && MS.pmode === 'edge' ? '+' : '') + ang.toFixed(1) + '°', cx, cy - R * 0.4, '#fff', Math.max(22, R * 0.2), 'center', 'Orbitron, sans-serif', '800');
    txt(x, MS.hold ? '◆ HELD' : MS.pmode === 'edge' ? 'EDGE ANGLE FROM VERTICAL' : 'TILT FROM FLAT', cx, cy - R * 0.4 + Math.max(22, R * 0.2) * 0.9, MS.hold ? c.tertiary : NV.rgba(c.secondary, 0.7), 10.5, 'center');
    if (!MS._rt || t - MS._rt > 120) { MS._rt = t; NV.text('#ms-ang', ang.toFixed(1) + '°'); NV.text('#ms-slope', Math.abs(ang) < 89 ? (Math.tan(Math.abs(ang) * NV.DEG) * 100).toFixed(1) + '%' : '∞'); NV.text('#ms-ref', MS.zero.toFixed(1) + '°'); NV.text('#ms-src', SN.orientMode === 'live' ? 'LIVE TILT' : 'SIMULATED'); }
  }
  MS.frame = (t) => { if (MS.mode === 'ruler') drawRuler(); else drawProt(t); };
  MS.primary = () => { if (MS.mode === 'prot') $('#ms-hold').click(); else $('#ms-cal').click(); };
  function setCalCard() { const card = $('#ms-card'); card.style.width = (85.6 * MS.ppm) + 'px'; card.style.height = (53.98 * MS.ppm) + 'px'; card.style.borderRadius = (3.18 * MS.ppm) + 'px'; NV.text('#ms-scale-n', MS.ppm.toFixed(2)); }
  function initMeasure() {
    const cv = $('#ms-ruler-cv');
    NV.$$('#ms-mode button').forEach((b) => (b.onclick = () => { MS.mode = b.dataset.m; NV.$$('#ms-mode button').forEach((o) => o.classList.toggle('on', o === b)); $('#ms-ruler').hidden = MS.mode !== 'ruler'; $('#ms-prot').hidden = MS.mode !== 'prot'; NV.audio.click(1.1); }));
    NV.$$('#ms-pmode button').forEach((b) => (b.onclick = () => { MS.pmode = b.dataset.p; MS.disp = null; NV.$$('#ms-pmode button').forEach((o) => o.classList.toggle('on', o === b)); NV.audio.click(); }));
    const toMm = (e) => { const r = cv.getBoundingClientRect(); return NV.clamp((e.clientX - r.left - R0) / MS.ppm, 0, (r.width - R0) / MS.ppm); };
    cv.addEventListener('pointerdown', (e) => { const mm = toMm(e); MS.drag = Math.abs(mm - MS.a) < Math.abs(mm - MS.b) ? 'a' : 'b'; MS[MS.drag] = mm; cv.setPointerCapture(e.pointerId); NV.audio.tick(); measureReads(); });
    cv.addEventListener('pointermove', (e) => { if (!MS.drag) return; MS[MS.drag] = toMm(e); measureReads(); });
    const up = () => { if (MS.drag) { MS.drag = null; NV.haptic(6); } }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    $('#ms-reset').onclick = () => { MS.a = 10; MS.b = 60; measureReads(); NV.audio.click(); };
    $('#ms-cal').onclick = () => { MS.calOpen = !$('#ms-calib').hidden ? false : true; $('#ms-calib').hidden = !MS.calOpen; $('#ms-scale').value = MS.ppm; setCalCard(); NV.audio.click(1.1); if (MS.calOpen) setTimeout(() => $('#ms-calib').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); };
    $('#ms-scale').addEventListener('input', (e) => { MS.ppm = +e.target.value; setCalCard(); measureReads(); });
    $('#ms-cal-cancel').onclick = () => { MS.ppm = NV.store.get('ppm', coarse ? 6.3 : 3.78); $('#ms-calib').hidden = true; measureReads(); NV.audio.click(0.8); };
    $('#ms-cal-save').onclick = () => { MS.cal = true; NV.store.set('ppm', MS.ppm); NV.store.set('ppmCal', true); $('#ms-calib').hidden = true; measureReads(); NV.audio.confirm(); NV.toast('Ruler calibrated to your screen. Precision engaged, Sir.'); NV.award('measure'); };
    $('#ms-hold').onclick = () => { MS.hold = !MS.hold; MS.held = protAngle(); $('#ms-hold').setAttribute('aria-pressed', MS.hold); NV.text('#ms-hold', MS.hold ? 'Release' : 'Hold'); NV.audio.click(MS.hold ? 1.3 : 0.8); NV.haptic(15); };
    $('#ms-zero').onclick = () => { const A = attitude(); MS.zero = MS.pmode === 'edge' ? A.roll : A.tilt; NV.store.set('protZero', MS.zero); MS.disp = null; NV.audio.confirm(); };
    $('#ms-unzero').onclick = () => { MS.zero = 0; NV.store.set('protZero', 0); MS.disp = null; NV.audio.click(); };
    measureReads();
  }

  NV._init_optics = () => { initAR(); initColour(); initOCR(); initMeasure(); };
})();
