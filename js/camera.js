/* NICK-VERSE Scanner: optical scanner. Live camera or simulated feed, filters, zoom, HUD, scan analysis, QR/barcode. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const C = (NV.cam = { live: false, sim: false, frozen: false, scanning: false, filter: 'normal', zoom: 1, facing: 'environment', luma: null, center: [0, 0, 0], qr: false, qrSupported: 'BarcodeDetector' in window, track: null, stream: null, torchCap: false, hwZoom: null, res: '' });
  const FILTERS = ['normal', 'night', 'thermal', 'edge'];
  const FNAME = { normal: 'NORMAL', night: 'NIGHT-VIS', thermal: 'THERMAL', edge: 'EDGE-DETECT' };
  let video, cv, base, bctx, proc, pctx, det, dctx, simCv, simCtx, detector = null;
  let qrBusy = false, lastQr = 0, qrBoxes = [], lastQrVal = '', lastQrAt = 0, scanStart = 0, hist = new Array(32).fill(0), frameN = 0, lastAnalysis = null, callout = null;
  let wasLiveBeforeHide = false;

  // ---------- LUTs ----------
  const THERM = (() => { const stops = [[0, [0, 0, 10]], [0.18, [40, 0, 90]], [0.36, [140, 0, 140]], [0.52, [230, 30, 60]], [0.68, [255, 120, 0]], [0.84, [255, 220, 40]], [1, [255, 255, 235]]]; const lut = new Uint8ClampedArray(256 * 3); for (let i = 0; i < 256; i++) { const t = i / 255; let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++; const [t0, c0] = stops[k], [t1, c1] = stops[k + 1], f = (t - t0) / (t1 - t0); for (let j = 0; j < 3; j++) lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * f; } return lut; })();

  // ---------- Colour naming ----------
  const NAMES = [['Black', '#000000'], ['Midnight', '#101830'], ['Charcoal', '#36454f'], ['Slate Grey', '#708090'], ['Grey', '#8a8a8a'], ['Silver', '#c0c0c0'], ['White', '#f8f8f8'], ['Cream', '#fffdd0'], ['Beige', '#d8c8a8'], ['Tan', '#d2b48c'], ['Brown', '#7b4a26'], ['Chocolate', '#4e2a14'], ['Maroon', '#800000'], ['Crimson', '#dc143c'], ['Red', '#e02020'], ['Coral', '#ff7f50'], ['Salmon', '#fa8072'], ['Orange', '#ff8c00'], ['Amber', '#ffbf00'], ['Gold', '#d4af37'], ['Yellow', '#ffe135'], ['Olive', '#808000'], ['Lime', '#9acd32'], ['Green', '#2e9e44'], ['Forest Green', '#1f5130'], ['Mint', '#98ff98'], ['Teal', '#008080'], ['Turquoise', '#40e0d0'], ['Cyan', '#00c8ff'], ['Sky Blue', '#87ceeb'], ['Blue', '#1e5bd8'], ['Navy', '#1a2a5a'], ['Indigo', '#4b0082'], ['Purple', '#7d3cb5'], ['Violet', '#b57edc'], ['Magenta', '#e0218a'], ['Pink', '#ff9ec4'], ['Lavender', '#c8b8e8']].map(([n, h]) => [n, NV.hexToRgb(h)]);
  function colorName(r, g, b) {
    let best = null, bd = 1e9;
    for (const [n, [R, G, B]] of NAMES) { const rm = (r + R) / 2, dr = r - R, dg = g - G, db = b - B; const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = n; } }
    return best;
  }
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }

  // ---------- Fake analysis (entertainment) ----------
  const OBJ = {
    dark: ['A Very Small Void', 'The Inside Of A Pocket', 'Midnight (Portable Edition)', 'An Unlit Mystery', 'Sofa Underside, Uncharted'],
    bright: ['A Suspiciously Clean Surface', 'Ceiling (Probable)', 'Concentrated Daylight', 'A Blank Page Full Of Potential', 'Overexposed Optimism'],
    red: ['Ketchup-Adjacent Artefact', 'Emergency Button (Do Not Press)', 'A Very Confident Tomato', 'Sports Car (Miniature, Imaginary)'],
    warm: ['Cheese Of Unknown Origin', 'Pocket Sun (Knock-Off)', 'Rubber Duck, Tactical Edition', 'A Banana With Ambitions'],
    green: ['Houseplant, Mildly Sentient', 'Alien Lettuce', 'Retired Frog', 'A Salad Nobody Ordered', 'Test Pattern Of Unusual Enthusiasm'],
    blue: ['Fragment Of Sky', 'Swimming Pool (Compressed)', 'A Sad Robot\u2019s Favourite Colour', 'Deep-Sea Screensaver'],
    purple: ['Wizard Accessory', 'Grape Of Destiny', 'Bubblegum Singularity', 'Disco Relic, Well Preserved'],
    grey: ['Office Chair, Existential', 'Concrete Philosophy', 'A Cloud That Gave Up', 'Probably A Wall', 'Beige\u2019s Quieter Cousin'],
    brown: ['Cardboard Box (Fort Potential: High)', 'Wooden Something', 'Artisan Toast', 'Couch Cushion Archaeology Site']
  };
  const VERDICTS = ['Verdict: safe to boop.', 'Verdict: do not make eye contact.', 'Verdict: worthy of a sequel.', 'Verdict: technically a sandwich.', 'Verdict: would scan again.', 'Verdict: consult a qualified wizard.', 'Verdict: suspiciously ordinary. Keep watching it.', 'Verdict: probably fine. Probably.'];
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function fakeAnalysis(rgb, bright) {
    const [h, s, l] = rgb2hsl(...rgb);
    const fam = bright < 0.16 ? 'dark' : bright > 0.84 ? 'bright' : s < 0.16 ? 'grey' : (h < 15 || h >= 340) ? 'red' : h < 45 ? (l < 0.45 ? 'brown' : 'warm') : h < 70 ? 'warm' : h < 170 ? 'green' : h < 255 ? 'blue' : 'purple';
    const r = rng(hashStr(NV.rgbToHex(...rgb) + Date.now()));
    const pickR = (a) => a[Math.floor(r() * a.length)];
    const pct = (lo = 0, hi = 100) => Math.round(lo + r() * (hi - lo));
    return {
      object: pickR(OBJ[fam]), confidence: pct(12, 97),
      metrics: [['Snack Potential', pct()], ['Sentience', pct(0, 18)], ['Vibes', pct(40, 100)], ['Threat', fam === 'red' ? pct(30, 80) : pct(0, 35)], ['Sparkle', Math.round(bright * 100)], ['Nick-Verse Relevance', pct(55, 100)]],
      verdict: pickR(VERDICTS)
    };
  }

  // ---------- Simulated feed ----------
  function drawSim(t) {
    const W = 640, H = 480, x = simCtx, ts = t / 1000;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2a44'); g.addColorStop(0.55, '#2b3550'); g.addColorStop(0.56, '#3b2f2a'); g.addColorStop(1, '#1a1512');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // window with daylight
    const wx = 400, wy = 60; x.fillStyle = '#9fd4ff'; x.fillRect(wx, wy, 170, 150); x.fillStyle = 'rgba(255,240,200,.35)'; x.fillRect(wx, wy + 100, 170, 50);
    x.strokeStyle = '#e8e2d8'; x.lineWidth = 8; x.strokeRect(wx, wy, 170, 150); x.beginPath(); x.moveTo(wx + 85, wy); x.lineTo(wx + 85, wy + 150); x.moveTo(wx, wy + 75); x.lineTo(wx + 170, wy + 75); x.stroke();
    // lamp
    x.fillStyle = '#ffcf6b'; x.beginPath(); x.moveTo(80, 120); x.lineTo(150, 120); x.lineTo(135, 70); x.lineTo(95, 70); x.fill();
    const lg = x.createRadialGradient(115, 130, 5, 115, 130, 160); lg.addColorStop(0, 'rgba(255,210,120,.45)'); lg.addColorStop(1, 'rgba(255,210,120,0)'); x.fillStyle = lg; x.fillRect(0, 0, 320, 330);
    x.fillStyle = '#5a4636'; x.fillRect(110, 120, 10, 150); x.fillRect(70, 262, 90, 10);
    // plant
    x.fillStyle = '#b5552b'; x.fillRect(250, 300, 60, 60);
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(ts * 1.3 + i) * 0.06; x.strokeStyle = i % 2 ? '#2e9e44' : '#3fbf5a'; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(280, 302); x.quadraticCurveTo(280 + Math.cos(a) * 40, 300 + Math.sin(a) * 50, 280 + Math.cos(a) * 70, 300 + Math.sin(a) * 90); x.stroke(); }
    // bouncing mystery orb
    const ox = 470 + Math.sin(ts * 0.8) * 90, oy = 360 + Math.abs(Math.sin(ts * 2.1)) * -60;
    const og = x.createRadialGradient(ox - 8, oy - 8, 2, ox, oy, 30); og.addColorStop(0, '#fff'); og.addColorStop(0.4, '#ff5ee1'); og.addColorStop(1, '#6a1b9a'); x.fillStyle = og; x.beginPath(); x.arc(ox, oy, 28, 0, Math.PI * 2); x.fill();
    // rubber duck
    const dx = 170 + Math.sin(ts * 0.5) * 30; x.fillStyle = '#ffd23f'; x.beginPath(); x.ellipse(dx, 400, 34, 22, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(dx + 22, 372, 16, 0, Math.PI * 2); x.fill(); x.fillStyle = '#ff7a3d'; x.beginPath(); x.moveTo(dx + 36, 372); x.lineTo(dx + 50, 376); x.lineTo(dx + 36, 380); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(dx + 26, 368, 2.5, 0, Math.PI * 2); x.fill();
    // noise
    const id = x.getImageData(0, 0, W, H), d = id.data; for (let i = 0; i < d.length; i += 16) { const n = (Math.random() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(id, 0, 0);
    x.font = '700 13px ShareTech, monospace'; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText('CINCO SIMULATION FEED // NOT A REAL CAMERA', 16, 24);
  }

  // ---------- Camera control ----------
  function setBadge(txt, cls) { const b = $('#cam-badge'); b.textContent = txt; b.className = 'badge' + (cls ? ' ' + cls : ''); }
  function stopTracks() { if (C.stream) { C.stream.getTracks().forEach((t) => t.stop()); C.stream = null; C.track = null; } C.live = false; }
  C.start = async (facing = C.facing) => {
    C.facing = facing;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { NV.toast('Camera API unavailable in this browser. Engaging simulated feed.'); C.startSim(); return false; }
    setBadge('CONNECTING…', 'warn');
    try {
      stopTracks();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      C.stream = stream; C.track = stream.getVideoTracks()[0];
      video.srcObject = stream; try { await video.play(); } catch (e) { /* autoplay nuance */ }
      C.live = true; C.sim = false; C.frozen = false;
      let caps = {}; try { caps = (C.track.getCapabilities && C.track.getCapabilities()) || {}; } catch (e) { caps = {}; }
      C.hwZoom = caps.zoom && caps.zoom.max > caps.zoom.min ? caps.zoom : null; C.torchCap = !!caps.torch;
      NV.$$('.cam-start').forEach((e) => e.classList.add('gone')); setBadge('LIVE', 'live'); NV.audio.powerUp(); NV.haptic(30);
      applyZoom(); updateReadouts(); NV.emitCaps && NV.emitCaps();
      return true;
    } catch (e) {
      NV.toast(`Camera unavailable (${e.name || 'error'}). Engaging simulated feed, Sir.`);
      C.startSim(); return false;
    }
  };
  C.startSim = () => { stopTracks(); C.sim = true; C.frozen = false; NV.$$('.cam-start').forEach((e) => e.classList.add('gone')); setBadge('SIM FEED', 'warn'); NV.audio.powerUp(); updateReadouts(); NV.emitCaps && NV.emitCaps(); };
  C.active = () => C.live || C.sim;
  C.flip = () => { if (!C.live) { NV.toast('Camera switching requires a live camera.'); return; } C.start(C.facing === 'environment' ? 'user' : 'environment'); NV.audio.whoosh(); };
  C.setTorch = async (on) => { if (!C.live || !C.torchCap || !C.track) return false; try { await C.track.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch (e) { return false; } };
  const usedFilters = new Set(NV.store.get('filtersUsed', []));
  C.setFilter = (f) => { C.filter = f; NV.$$('#cam-filters button').forEach((b) => b.classList.toggle('on', b.dataset.filter === f)); NV.audio.click(1.1); usedFilters.add(f); NV.store.set('filtersUsed', [...usedFilters]); if (usedFilters.size >= 4) NV.award('filters'); };
  C.cycleFilter = () => C.setFilter(FILTERS[(FILTERS.indexOf(C.filter) + 1) % FILTERS.length]);
  function applyZoom() {
    NV.text('#cam-zoom-v', C.zoom.toFixed(1) + '×' + (C.hwZoom ? ' HW' : ''));
    if (C.hwZoom && C.track) { const z = C.hwZoom, v = NV.clamp(z.min + (C.zoom - 1) / 7 * (z.max - z.min), z.min, z.max); C.track.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => { C.hwZoom = null; }); }
  }
  C.setQr = async (on) => {
    C.qr = on; $('#cam-qr').setAttribute('aria-pressed', on);
    if (!on) { qrBoxes = []; return; }
    if (!C.qrSupported) { NV.toast('BarcodeDetector is not supported in this browser. Try Chrome on Android, Sir.'); C.qr = false; $('#cam-qr').setAttribute('aria-pressed', false); return; }
    if (!detector) {
      try { let f = await BarcodeDetector.getSupportedFormats(); if (!f || !f.length) throw new Error('none'); detector = new BarcodeDetector({ formats: f }); }
      catch (e) { C.qrSupported = false; NV.toast('No barcode formats available on this device.'); C.qr = false; $('#cam-qr').setAttribute('aria-pressed', false); updateReadouts(); return; }
    }
    if (!C.active()) C.start();
    NV.toast('QR mode engaged. Point at a code, Sir.', 2200);
  };
  function updateReadouts() {
    NV.text('#ro-qr', C.qrSupported ? (C.qr ? 'SCANNING' : 'READY') : 'UNSUPPORTED');
    NV.text('#ro-res', C.live ? (C.res || 'LIVE') : C.sim ? 'SIM 640×480' : 'OFFLINE');
  }

  // ---------- Frame pipeline ----------
  function sourceInfo() {
    if (C.live && video.readyState >= 2 && video.videoWidth) return { src: video, sw: video.videoWidth, sh: video.videoHeight };
    if (C.sim) return { src: simCv, sw: 640, sh: 480 };
    return null;
  }
  function crop(sw, sh, w, h, zoom) { const sc = Math.max(w / sw, h / sh) * zoom, cw = w / sc, ch = h / sc; return [(sw - cw) / 2, (sh - ch) / 2, cw, ch]; }

  function processFrame(t, src, sw, sh, w, h) {
    const pw = 320, ph = Math.max(1, Math.round(pw * h / w));
    if (proc.width !== pw || proc.height !== ph) { proc.width = pw; proc.height = ph; }
    const zoom = C.hwZoom ? 1 : C.zoom, [sx, sy, cw, ch] = crop(sw, sh, w, h, zoom);
    pctx.drawImage(src, sx, sy, cw, ch, 0, 0, pw, ph);
    const id = pctx.getImageData(0, 0, pw, ph), d = id.data, n = pw * ph;
    // analysis: mean luma, histogram, center sample
    let sum = 0; hist.fill(0);
    for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; sum += l; hist[l >> 3]++; }
    C.luma = sum / n / 255;
    let cr = 0, cg = 0, cb = 0, cnt = 0; const cx = pw >> 1, cy = ph >> 1;
    for (let yy = cy - 3; yy <= cy + 3; yy++) for (let xx = cx - 3; xx <= cx + 3; xx++) { const k = (yy * pw + xx) * 4; cr += d[k]; cg += d[k + 1]; cb += d[k + 2]; cnt++; }
    C.center = [cr / cnt, cg / cnt, cb / cnt];
    // filters
    if (C.filter !== 'normal') {
      const o = pctx.createImageData(pw, ph), od = o.data;
      if (C.filter === 'night') {
        for (let i = 0; i < d.length; i += 4) { let l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; l = Math.pow(l, 0.55) * 1.25 * 255 + (Math.random() - 0.5) * 34; od[i] = l * 0.28; od[i + 1] = l; od[i + 2] = l * 0.36; od[i + 3] = 255; }
      } else if (C.filter === 'thermal') {
        for (let i = 0; i < d.length; i += 4) { const l = Math.min(255, (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) | 0) * 3; od[i] = THERM[l]; od[i + 1] = THERM[l + 1]; od[i + 2] = THERM[l + 2]; od[i + 3] = 255; }
      } else if (C.filter === 'edge') {
        const L = new Float32Array(n); for (let i = 0, j = 0; j < n; i += 4, j++) L[j] = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        const [ar, ag, ab] = NV.hexToRgb(NV.colors.primary);
        for (let y = 1; y < ph - 1; y++) for (let x = 1; x < pw - 1; x++) {
          const j = y * pw + x;
          const gx = -L[j - pw - 1] - 2 * L[j - 1] - L[j + pw - 1] + L[j - pw + 1] + 2 * L[j + 1] + L[j + pw + 1];
          const gy = -L[j - pw - 1] - 2 * L[j - pw] - L[j - pw + 1] + L[j + pw - 1] + 2 * L[j + pw] + L[j + pw + 1];
          const m = Math.min(1, Math.hypot(gx, gy) / 280), k = j * 4, bg = L[j] * 0.1;
          od[k] = bg + ar * m + 255 * m * m * 0.4; od[k + 1] = bg + ag * m + 255 * m * m * 0.4; od[k + 2] = bg + ab * m + 255 * m * m * 0.4; od[k + 3] = 255;
        }
      }
      pctx.putImageData(o, 0, 0);
      return { data: d, pw, ph, filtered: true };
    }
    return { data: d, pw, ph, filtered: false, crop: [sx, sy, cw, ch] };
  }

  C.frame = function (t, display = true) {
    if (!C.active()) return;
    if (C.sim && (!C.frozen || !display)) drawSim(t);
    const si = sourceInfo(); if (!si) return;
    if (C.live) C.res = `${si.sw}×${si.sh}`;
    if (!display) { if (!C.frozen && frameN++ % 3 === 0) processFrame(t, si.src, si.sw, si.sh, 320, 240); return; }
    const f = NV.fit(cv); if (!f) return;
    const { w, h, dpr } = f;
    if (base.width !== cv.width || base.height !== cv.height) { base.width = cv.width; base.height = cv.height; }
    if (!C.frozen) {
      const p = processFrame(t, si.src, si.sw, si.sh, w, h);
      bctx.save(); bctx.setTransform(1, 0, 0, 1, 0, 0);
      if (C.live && C.facing === 'user') { bctx.translate(base.width, 0); bctx.scale(-1, 1); }
      bctx.imageSmoothingEnabled = true; bctx.imageSmoothingQuality = 'high';
      if (p.filtered) bctx.drawImage(proc, 0, 0, base.width, base.height);
      else { const [sx, sy, cw, ch] = p.crop; bctx.drawImage(si.src, sx, sy, cw, ch, 0, 0, base.width, base.height); }
      bctx.restore();
      frameN++;
      if (C.qr && detector && !qrBusy && t - lastQr > 350) runQr(si, w, h);
      if (frameN % 6 === 0) liveReadouts();
    }
    const x = f.x; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(base, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHud(x, w, h, t);
  };

  function runQr(si, w, h) {
    qrBusy = true; lastQr = performance.now();
    const dw = 640, dh = Math.round(dw * h / w); if (det.width !== dw || det.height !== dh) { det.width = dw; det.height = dh; }
    const [sx, sy, cw, ch] = crop(si.sw, si.sh, w, h, C.hwZoom ? 1 : C.zoom); dctx.drawImage(si.src, sx, sy, cw, ch, 0, 0, dw, dh);
    detector.detect(det).then((codes) => {
      const k = w / dw; qrBoxes = codes.map((c) => ({ pts: (c.cornerPoints || []).map((p) => [p.x * k, p.y * k]), val: c.rawValue, fmt: c.format, t: performance.now() }));
      const c = codes[0]; const now = performance.now();
      if (c && c.rawValue && (c.rawValue !== lastQrVal || now - lastQrAt > 6000)) { lastQrVal = c.rawValue; lastQrAt = now; showQr(c); }
    }).catch(() => {}).finally(() => { qrBusy = false; });
  }
  function showQr(c) {
    $('#qr-card').hidden = false; NV.text('#qr-format', (c.format || 'code').replace(/_/g, ' ').toUpperCase() + ' DETECTED'); NV.text('#qr-value', c.rawValue);
    NV.audio.qr(); NV.haptic([20, 40, 20]);
    NV.log && NV.log.add({ type: 'qr', title: 'Code: ' + c.rawValue.slice(0, 40), detail: `${(c.format || '').toUpperCase()}: ${c.rawValue}`, thumb: thumb() });
    NV.jarvis.auto('qr', 4000);
  }

  function liveReadouts() {
    const [r, g, b] = C.center, hex = NV.rgbToHex(r, g, b);
    $('#ro-sw').style.background = hex; NV.text('#ro-hex', hex.toUpperCase() + ' · ' + colorName(r, g, b));
    NV.text('#ro-luma', Math.round((C.luma || 0) * 100) + '%'); updateReadouts();
  }

  // ---------- HUD ----------
  function drawHud(x, w, h, t) {
    const c = NV.colors, P = c.primary, S2 = c.secondary, ts = t / 1000, m = Math.min(w, h);
    const tint = C.filter === 'night' ? '#7dff9a' : P;
    x.save();
    // vignette
    const vg = x.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
    if (C.filter === 'night') { x.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1); }
    // thirds grid
    x.strokeStyle = NV.rgba(tint, 0.13); x.lineWidth = 1; x.beginPath();
    for (let i = 1; i < 3; i++) { x.moveTo(w * i / 3, 0); x.lineTo(w * i / 3, h); x.moveTo(0, h * i / 3); x.lineTo(w, h * i / 3); } x.stroke();
    // corner brackets
    const inset = 14, L = Math.min(34, m * 0.09); x.strokeStyle = tint; x.lineWidth = 2.5; x.shadowColor = tint; x.shadowBlur = 10; x.beginPath();
    [[inset, inset, 1, 1], [w - inset, inset, -1, 1], [inset, h - inset, 1, -1], [w - inset, h - inset, -1, -1]].forEach(([px, py, sx, sy]) => { x.moveTo(px, py + L * sy); x.lineTo(px, py); x.lineTo(px + L * sx, py); });
    x.stroke();
    // reticle
    const cx = w / 2, cy = h / 2, R = m * 0.17;
    const scanP = C.scanning ? NV.clamp((performance.now() - scanStart) / 1200, 0, 1) : 0;
    x.lineWidth = 1.5; x.setLineDash([6, 8]); x.strokeStyle = NV.rgba(tint, 0.85);
    x.beginPath(); x.arc(cx, cy, R, ts * 0.6, ts * 0.6 + Math.PI * 2); x.stroke(); x.setLineDash([]);
    x.strokeStyle = NV.rgba(S2, 0.8); x.lineWidth = 2.5;
    x.beginPath(); x.arc(cx, cy, R * 0.68, -ts * 1.2, -ts * 1.2 + Math.PI * 0.55); x.stroke();
    x.beginPath(); x.arc(cx, cy, R * 0.68, -ts * 1.2 + Math.PI, -ts * 1.2 + Math.PI * 1.55); x.stroke();
    x.lineWidth = 2; x.strokeStyle = tint; x.beginPath();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.moveTo(cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.08); x.lineTo(cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * 1.3); }
    x.stroke();
    x.shadowBlur = 0; x.strokeStyle = '#fff'; x.lineWidth = 1.2; x.strokeRect(cx - 7, cy - 7, 14, 14);
    x.beginPath(); x.moveTo(cx - 18, cy); x.lineTo(cx - 10, cy); x.moveTo(cx + 10, cy); x.lineTo(cx + 18, cy); x.moveTo(cx, cy - 18); x.lineTo(cx, cy - 10); x.moveTo(cx, cy + 10); x.lineTo(cx, cy + 18); x.stroke();
    if (C.scanning) {
      x.shadowColor = S2; x.shadowBlur = 16; x.strokeStyle = S2; x.lineWidth = 4;
      x.beginPath(); x.arc(cx, cy, R * 1.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * scanP); x.stroke();
      const sy = h * ((ts * 1.6) % 1); const sg = x.createLinearGradient(0, sy - 60, 0, sy); sg.addColorStop(0, NV.rgba(tint, 0)); sg.addColorStop(1, NV.rgba(tint, 0.35)); x.fillStyle = sg; x.fillRect(0, sy - 60, w, 60);
      x.fillStyle = tint; x.fillRect(0, sy, w, 2);
      label(x, 'ANALYSING… ' + Math.round(scanP * 100) + '%', cx, cy + R * 1.5, S2, 13, 'center');
    } else if (!C.frozen) {
      const sy = h * ((ts * 0.35) % 1); const sg = x.createLinearGradient(0, sy - 40, 0, sy); sg.addColorStop(0, NV.rgba(tint, 0)); sg.addColorStop(1, NV.rgba(tint, 0.16)); x.fillStyle = sg; x.fillRect(0, sy - 40, w, 40);
    }
    x.shadowBlur = 0;
    // text: top
    const fs = m < 330 ? 10 : 11.5;
    label(x, `OPT-9000 · ${FNAME[C.filter]} · ${C.zoom.toFixed(1)}×`, inset + 12, inset + 18, tint, fs);
    const tr = C.sim ? 'SIM FEED' : C.frozen ? 'FRAME LOCKED' : '● REC';
    if (!(C.live && !C.frozen && Math.floor(ts * 1.5) % 2)) label(x, tr, w - inset - 12, inset + 18, C.sim || C.frozen ? c.tertiary : '#ff4d5e', fs, 'right');
    // bottom-left: sample
    const [r, g, b] = C.center; const hex = NV.rgbToHex(r, g, b);
    x.fillStyle = hex; x.strokeStyle = '#fff'; x.lineWidth = 1; x.fillRect(inset + 12, h - inset - 30, 16, 16); x.strokeRect(inset + 12, h - inset - 30, 16, 16);
    label(x, hex.toUpperCase(), inset + 34, h - inset - 18, S2, fs);
    label(x, 'LUM ' + Math.round((C.luma || 0) * 100) + '%', inset + 12, h - inset - 36, tint, fs);
    // bottom-right: histogram
    const hw = Math.min(120, w * 0.28), hh = 30, hx = w - inset - 12 - hw, hy = h - inset - 12;
    const mx = Math.max(1, ...hist); x.fillStyle = NV.rgba(tint, 0.55);
    for (let i = 0; i < 32; i++) { const bh = (hist[i] / mx) * hh; x.fillRect(hx + i * hw / 32, hy - bh, hw / 32 - 1, bh); }
    x.strokeStyle = NV.rgba(tint, 0.5); x.beginPath(); x.moveTo(hx, hy + 0.5); x.lineTo(hx + hw, hy + 0.5); x.stroke();
    label(x, 'HISTOGRAM', hx + hw, hy - hh - 6, NV.rgba(tint, 0.8), 9, 'right');
    // side ruler (zoom scale)
    x.strokeStyle = NV.rgba(tint, 0.6); x.beginPath();
    for (let i = 0; i <= 20; i++) { const yy = h * 0.3 + (h * 0.4) * i / 20, len = i % 5 ? 5 : 10; x.moveTo(w - inset - 2, yy); x.lineTo(w - inset - 2 - len, yy); }
    x.stroke();
    const zy = h * 0.7 - (h * 0.4) * (C.zoom - 1) / 7; x.fillStyle = S2; x.beginPath(); x.moveTo(w - inset - 16, zy); x.lineTo(w - inset - 24, zy - 5); x.lineTo(w - inset - 24, zy + 5); x.fill();
    // QR boxes
    const now = performance.now();
    qrBoxes.forEach((q) => { if (now - q.t > 900 || q.pts.length < 4) return; x.strokeStyle = '#57ffa8'; x.lineWidth = 3; x.shadowColor = '#57ffa8'; x.shadowBlur = 14; x.beginPath(); q.pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.stroke(); x.shadowBlur = 0; label(x, q.fmt.toUpperCase(), q.pts[0][0], q.pts[0][1] - 8, '#57ffa8', 11); });
    if (C.qr) label(x, 'QR MODE · SEEKING CODES', cx, inset + 40, '#57ffa8', fs, 'center');
    // frozen callout
    if (C.frozen && callout) {
      const bx = cx + R * 0.8, by = cy - R * 0.8, tx = Math.min(w - inset - 10, cx + R * 1.6), ty = Math.max(inset + 50, cy - R * 1.4);
      x.strokeStyle = S2; x.lineWidth = 1.5; x.shadowColor = S2; x.shadowBlur = 8; x.beginPath(); x.moveTo(bx, by); x.lineTo(tx - 40, ty); x.lineTo(tx, ty); x.stroke(); x.shadowBlur = 0;
      x.fillStyle = callout.hex; x.fillRect(tx - 40, ty - 26, 14, 14); x.strokeStyle = '#fff'; x.strokeRect(tx - 40, ty - 26, 14, 14);
      label(x, callout.name.toUpperCase(), tx - 22, ty - 14, '#fff', 12);
      label(x, callout.obj.toUpperCase(), tx, ty + 16, S2, 10.5, 'right', true);
    }
    x.restore();
  }
  function label(x, s, px, py, col, size = 11, align = 'left', bgBox = false) {
    x.font = `${size}px ShareTech, ui-monospace, monospace`; x.textAlign = align; x.textBaseline = 'alphabetic';
    if (bgBox) { const wd = x.measureText(s).width; const lx = align === 'right' ? px - wd : align === 'center' ? px - wd / 2 : px; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(lx - 5, py - size, wd + 10, size + 6); }
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(s, px + 1, py + 1); x.fillStyle = col; x.fillText(s, px, py);
  }

  // ---------- Scan ----------
  function thumb() { const tc = document.createElement('canvas'); const tw = 240, th = Math.round(tw * (base.height || 3) / (base.width || 4)); tc.width = tw; tc.height = th; try { tc.getContext('2d').drawImage(base.width ? base : proc, 0, 0, tw, th); return tc.toDataURL('image/jpeg', 0.72); } catch (e) { return null; } }
  function analyse() {
    const pw = proc.width, ph = proc.height, d = pctx.getImageData(0, 0, pw, ph).data;
    const bins = new Map(); let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]; sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4); let e = bins.get(key); if (!e) { e = [0, 0, 0, 0]; bins.set(key, e); } e[0]++; e[1] += r; e[2] += g; e[3] += b;
    }
    const total = pw * ph, sorted = [...bins.values()].sort((a, b) => b[0] - a[0]);
    const palette = sorted.slice(0, 6).map((e) => ({ rgb: [e[1] / e[0], e[2] / e[0], e[3] / e[0]], pct: e[0] / total }));
    const dom = palette[0].rgb, bright = sum / total / 255;
    return { dom, hex: NV.rgbToHex(...dom), name: colorName(...dom), bright, palette, fake: fakeAnalysis(dom, bright) };
  }
  C.scan = function () {
    if (C.scanning) return;
    if (C.frozen) { C.resume(); }
    if (!C.active()) { C.start().then(() => setTimeout(C.scan, 900)); return; }
    C.scanning = true; scanStart = performance.now(); callout = null;
    $('#cam-scan').classList.add('busy'); NV.text('#cam-scan span', 'SCANNING'); setBadge('ANALYSING', 'warn');
    NV.audio.scan(); NV.haptic([15, 60, 15, 60, 15]);
    setTimeout(() => {
      C.frozen = true; C.scanning = false;
      const a = analyse(); lastAnalysis = a;
      callout = { name: a.name, hex: a.hex, obj: a.fake.object };
      const fl = $('#cam-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      NV.audio.shutter(); setTimeout(() => NV.audio.scanDone(), 120); NV.haptic(60);
      $('#cam-scan').classList.remove('busy'); NV.text('#cam-scan span', 'RESCAN'); $('#cam-resume').disabled = false; setBadge('FRAME LOCKED', 'warn');
      renderReport(a);
      const th = thumb();
      NV.log && NV.log.add({ type: 'scan', title: a.fake.object, detail: `${a.name} (${a.hex.toUpperCase()}) · brightness ${Math.round(a.bright * 100)}% · ${FNAME[C.filter]} · ${C.sim ? 'simulated feed' : 'live camera'}. ${a.fake.verdict}`, color: a.hex, thumb: th, bright: a.bright, filter: C.filter });
      NV.award('first-scan'); NV.emit('scan', a);
      NV.jarvis.speak(`Scan complete. Dominant colour: ${a.name.toLowerCase()}, brightness ${Math.round(a.bright * 100)} percent. Entertainment analysis suggests: ${a.fake.object}. ${a.fake.verdict}`, { tag: 'SCAN' });
      if (a.bright < 0.12) setTimeout(() => NV.jarvis.auto('dark', 1000), 5000);
      const rep = $('#scan-report'); if (innerWidth < 900) setTimeout(() => rep.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
    }, 1200);
  };
  C.resume = () => { C.frozen = false; callout = null; $('#cam-resume').disabled = true; NV.text('#cam-scan span', 'SCAN'); setBadge(C.sim ? 'SIM FEED' : 'LIVE', C.sim ? 'warn' : 'live'); NV.audio.click(0.9); };
  function renderReport(a) {
    $('#scan-report').hidden = false;
    $('#rep-swatch').style.background = a.hex; $('#rep-swatch').style.setProperty('--sw', a.hex);
    NV.text('#rep-color', a.name); NV.text('#rep-hex', `${a.hex.toUpperCase()} · RGB ${a.dom.map((v) => Math.round(v)).join(', ')}`);
    NV.text('#rep-bright', Math.round(a.bright * 100) + '%');
    $('#rep-palette').innerHTML = a.palette.map((p) => `<i style="background:${NV.rgbToHex(...p.rgb)};flex:${Math.max(0.03, p.pct).toFixed(3)}" title="${NV.rgbToHex(...p.rgb)} ${Math.round(p.pct * 100)}%"></i>`).join('');
    NV.text('#rep-object', `Object: ${a.fake.object} · confidence ${a.fake.confidence}%`);
    $('#rep-metrics').innerHTML = a.fake.metrics.map(([k, v]) => `<li><b><span>${k}</span><span class="mono">${v}%</span></b><i style="--w:${v}%"></i></li>`).join('');
    NV.text('#rep-verdict', a.fake.verdict);
  }
  C.snapshotThumb = thumb;
  C.colorName = colorName;
  C.rgb2hsl = rgb2hsl;
  C.source = sourceInfo;
  C.crop = crop;
  C.mirrored = () => C.live && C.facing === 'user';
  // Draw the current feed (cover-cropped, mirrored for selfie cam) into any 2D context. Returns false if no feed.
  C.drawFeed = (x, w, h, zoom = 1) => {
    const si = sourceInfo(); if (!si) return false;
    const [sx, sy, cw, ch] = crop(si.sw, si.sh, w, h, zoom);
    x.save(); if (C.mirrored()) { x.translate(w, 0); x.scale(-1, 1); }
    x.drawImage(si.src, sx, sy, cw, ch, 0, 0, w, h); x.restore(); return true;
  };

  C.init = function () {
    video = $('#cam-video'); cv = $('#cam-canvas');
    base = document.createElement('canvas'); bctx = base.getContext('2d');
    proc = document.createElement('canvas'); pctx = proc.getContext('2d', { willReadFrequently: true });
    det = document.createElement('canvas'); dctx = det.getContext('2d');
    simCv = document.createElement('canvas'); simCv.width = 640; simCv.height = 480; simCtx = simCv.getContext('2d', { willReadFrequently: true });
    $('#cam-engage').onclick = () => C.start();
    $('#cam-sim').onclick = () => C.startSim();
    $('#cam-scan').onclick = () => C.scan();
    $('#cam-resume').onclick = () => C.resume();
    $('#cam-flip').onclick = () => C.flip();
    $('#cam-qr').onclick = () => C.setQr(!C.qr);
    $('#qr-copy').onclick = async () => { try { await navigator.clipboard.writeText($('#qr-value').textContent); NV.toast('Copied to clipboard.'); } catch (e) { NV.toast('Clipboard unavailable. Long-press to copy, Sir.'); } };
    $('#qr-dismiss').onclick = () => { $('#qr-card').hidden = true; };
    NV.$$('#cam-filters button').forEach((b) => (b.onclick = () => C.setFilter(b.dataset.filter)));
    const z = $('#cam-zoom'); z.addEventListener('input', () => { C.zoom = +z.value; applyZoom(); });
    // pinch-free wheel zoom on desktop
    cv.addEventListener('wheel', (e) => { if (!C.active()) return; e.preventDefault(); C.zoom = NV.clamp(C.zoom - Math.sign(e.deltaY) * 0.2, 1, 8); z.value = C.zoom; applyZoom(); }, { passive: false });
    cv.addEventListener('dblclick', () => C.active() && C.scan());
    updateReadouts();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && C.live) { wasLiveBeforeHide = true; stopTracks(); }
      else if (!document.hidden && wasLiveBeforeHide) { wasLiveBeforeHide = false; C.start(C.facing); }
    });
  };
})();
