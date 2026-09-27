/* NICK-VERSE Scanner: modules. Motion, Nav, Acoustic meter, Threat, Radar, System, Log, Timer */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, S = NV.sensors;
  const TAU = Math.PI * 2;

  // Shared drawing helpers ------------------------------------------------
  function glowLine(x, pts, col, w = 2, blur = 8) { x.strokeStyle = col; x.lineWidth = w; x.shadowColor = col; x.shadowBlur = blur; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke(); x.shadowBlur = 0; }
  function txt(x, s, px, py, col, size = 11, align = 'left', font = 'ShareTech, ui-monospace, monospace', weight = '') { x.font = `${weight} ${size}px ${font}`; x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, px, py); }
  NV.draw = { glowLine, txt };
  function graphFrame(x, w, h) {
    const c = NV.colors; x.clearRect(0, 0, w, h);
    x.strokeStyle = NV.rgba(c.primary, 0.08); x.lineWidth = 1; x.beginPath();
    for (let i = 1; i < 8; i++) { const gx = Math.round(w * i / 8) + 0.5; x.moveTo(gx, 0); x.lineTo(gx, h); }
    for (let i = 1; i < 4; i++) { const gy = Math.round(h * i / 4) + 0.5; x.moveTo(0, gy); x.lineTo(w, gy); }
    x.stroke(); x.strokeStyle = NV.rgba(c.primary, 0.25); x.beginPath(); x.moveTo(0, h / 2 + 0.5); x.lineTo(w, h / 2 + 0.5); x.stroke();
  }
  function seriesGraph(cv, bufs, range, cols, unit) {
    const f = NV.fit(cv); if (!f) return; const { x, w, h } = f; graphFrame(x, w, h);
    bufs.forEach((b, k) => {
      const pts = b.map((v, i) => [(i / (b.length - 1)) * w, h / 2 - NV.clamp(v / range, -1, 1) * (h / 2 - 6)]);
      const col = cols[k];
      // area fill
      x.globalAlpha = 0.08; x.fillStyle = col; x.beginPath(); x.moveTo(0, h / 2); pts.forEach(([px, py]) => x.lineTo(px, py)); x.lineTo(w, h / 2); x.fill(); x.globalAlpha = 1;
      glowLine(x, pts, col, 1.8, 8);
      const [lx, ly] = pts[pts.length - 1]; x.fillStyle = '#fff'; x.shadowColor = col; x.shadowBlur = 10; x.beginPath(); x.arc(lx - 2, ly, 2.8, 0, TAU); x.fill(); x.shadowBlur = 0;
    });
    txt(x, '+' + range + unit, 4, 9, NV.rgba(NV.colors.secondary, 0.6), 9.5); txt(x, '−' + range + unit, 4, h - 9, NV.rgba(NV.colors.secondary, 0.6), 9.5);
  }
  function arcGauge(cv, { value, min = 0, max = 100, peak = null, label = '', big = '', sub = '', zones = null, ticks = 10, unit = '' }) {
    const f = NV.fit(cv); if (!f) return; const { x, w, h } = f, c = NV.colors;
    x.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.54, R = Math.min(w, h * 1.1) * 0.42, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const toA = (v) => a0 + (a1 - a0) * NV.clamp((v - min) / (max - min), 0, 1);
    const bg = x.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.15); bg.addColorStop(0, NV.rgba(c.primary, 0.12)); bg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R * 1.15, 0, TAU); x.fill();
    x.lineCap = 'round'; x.lineWidth = R * 0.1; x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.arc(cx, cy, R, a0, a1); x.stroke();
    if (zones) zones.forEach(([from, to, col]) => { x.strokeStyle = NV.rgba(col, 0.28); x.lineWidth = R * 0.1; x.lineCap = 'butt'; x.beginPath(); x.arc(cx, cy, R, toA(from), toA(to)); x.stroke(); });
    const vg = x.createLinearGradient(cx - R, cy, cx + R, cy); vg.addColorStop(0, c.primary); vg.addColorStop(1, c.secondary);
    x.lineCap = 'round'; x.strokeStyle = vg; x.lineWidth = R * 0.1; x.shadowColor = c.primary; x.shadowBlur = 16; x.beginPath(); x.arc(cx, cy, R, a0, toA(value)); x.stroke(); x.shadowBlur = 0;
    for (let i = 0; i <= ticks * 5; i++) { const a = a0 + (a1 - a0) * i / (ticks * 5), maj = i % 5 === 0, r1 = R * 0.8, r2 = R * (maj ? 0.7 : 0.75); x.strokeStyle = maj ? NV.rgba(c.secondary, 0.85) : NV.rgba(c.primary, 0.4); x.lineWidth = maj ? 1.6 : 1; x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); x.stroke(); if (maj && R > 60) txt(x, String(Math.round(min + (max - min) * i / (ticks * 5))), cx + Math.cos(a) * R * 0.58, cy + Math.sin(a) * R * 0.58, NV.rgba(c.secondary, 0.6), Math.max(8, R * 0.085), 'center'); }
    if (peak != null) { const a = toA(peak); x.fillStyle = c.tertiary; x.shadowColor = c.tertiary; x.shadowBlur = 10; x.beginPath(); x.moveTo(cx + Math.cos(a) * R * 1.13, cy + Math.sin(a) * R * 1.13); x.lineTo(cx + Math.cos(a - 0.06) * R * 1.25, cy + Math.sin(a - 0.06) * R * 1.25); x.lineTo(cx + Math.cos(a + 0.06) * R * 1.25, cy + Math.sin(a + 0.06) * R * 1.25); x.fill(); x.shadowBlur = 0; }
    const na = toA(value); x.strokeStyle = '#fff'; x.lineWidth = 2.2; x.shadowColor = c.secondary; x.shadowBlur = 12; x.beginPath(); x.moveTo(cx + Math.cos(na) * R * 0.16, cy + Math.sin(na) * R * 0.16); x.lineTo(cx + Math.cos(na) * R * 0.9, cy + Math.sin(na) * R * 0.9); x.stroke();
    x.fillStyle = c.secondary; x.beginPath(); x.arc(cx, cy, R * 0.07, 0, TAU); x.fill(); x.shadowBlur = 0;
    txt(x, big, cx, cy + R * 0.42, '#fff', Math.max(14, R * 0.26), 'center', 'Orbitron, sans-serif', '700');
    txt(x, sub, cx, cy + R * 0.7, NV.rgba(c.secondary, 0.8), Math.max(9, R * 0.1), 'center');
    txt(x, label, cx, cy - R * 0.32, NV.rgba(c.secondary, 0.65), Math.max(8, R * 0.09), 'center');
    void unit;
  }
  NV.arcGauge = arcGauge;

  // ======================= MOTION =======================
  const MO = (NV.motion = {});
  const N = 160, bufA = [[], [], []], bufR = [[], [], []];
  for (let k = 0; k < 3; k++) { bufA[k] = new Array(N).fill(0); bufR[k] = new Array(N).fill(0); }
  let shakeFlashT = 0;
  MO.sample = () => { const a = S.acc, r = S.rot; [a.x, a.y, a.z].forEach((v, k) => { bufA[k].push(v); bufA[k].shift(); }); [r.a, r.b, r.g].forEach((v, k) => { bufR[k].push(v); bufR[k].shift(); }); };
  MO.frame = (t) => {
    const c = NV.colors, cols = [c.primary, c.tertiary, '#ff5ee1'];
    seriesGraph($('#acc-graph'), bufA, 20, cols, '');
    seriesGraph($('#gyro-graph'), bufR, 360, cols, '°');
    arcGauge($('#g-gauge'), { value: S.g, min: 0, max: 4, peak: S.peakG, label: 'G-FORCE', big: S.g.toFixed(2) + 'g', sub: 'PEAK ' + S.peakG.toFixed(2) + 'g', ticks: 4, zones: [[2.5, 4, '#ff4d5e']] });
    if (t % 4 < 1 || true) {
      NV.text('#acc-vals', `${S.acc.x.toFixed(1)} ${S.acc.y.toFixed(1)} ${S.acc.z.toFixed(1)} m/s²`);
      NV.text('#gyro-vals', `${S.rot.a.toFixed(0)} ${S.rot.b.toFixed(0)} ${S.rot.g.toFixed(0)} °/s`);
      NV.text('#ori-a', S.ori.alpha.toFixed(1) + '°'); NV.text('#ori-b', S.ori.beta.toFixed(1) + '°'); NV.text('#ori-g', S.ori.gamma.toFixed(1) + '°');
    }
    if (shakeFlashT && performance.now() - shakeFlashT > 700) { $('#shake-card').classList.remove('hit'); shakeFlashT = 0; }
  };
  MO.onShake = () => {
    NV.text('#shake-n', String(S.shakes));
    NV.text('#shake-s', NV.pick(['Shake registered!', 'Whoa there.', 'Magnificent wobble.', 'Seismic event logged.', 'The gyros are dizzy.']));
    const card = $('#shake-card'); card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit'); shakeFlashT = performance.now();
    NV.audio.shake(); NV.haptic([60, 40, 60]);
    const r = card.getBoundingClientRect(); if (r.width) NV.bg.burst(r.left + r.width / 2, r.top + r.height / 2, 30);
    NV.jarvis.auto('shake', 8000);
  };
  MO.init = () => {
    $('#g-reset').onclick = () => { S.resetPeak(); NV.audio.click(); };
    $('#shake-sens').value = S.sens; $('#shake-sens').oninput = (e) => { S.sens = +e.target.value; };
    $('#sim-shake').onclick = () => { S.simShake(); if (S.motionMode === 'live') NV.toast('Live sensors active. Give the actual device a shake, Sir.'); };
    $('#perm-btn').onclick = () => S.requestPermission();
    S.on('shake', MO.onShake);
  };
  MO.mode = () => {
    const m = S.motionMode, b = $('#motion-badge');
    b.textContent = m === 'live' ? 'LIVE' : m === 'perm' ? 'SIM · PERMISSION NEEDED' : m === 'sim' ? 'SIMULATED' : 'WAITING'; b.className = 'badge ' + (m === 'live' ? 'live' : 'warn');
    $('#perm-bar').hidden = !S.needsPerm;
    $('#sim-shake').hidden = m === 'live';
    NV.text('#motion-hint', m === 'live' ? 'Live IMU telemetry. Give it a shake, Sir.' : 'Simulated telemetry: on desktop it follows your mouse. Press K or tap Simulate Shake.');
  };

  // ======================= NAV (compass + level) =======================
  const NA = (NV.nav = { dispH: 0, offB: NV.store.get('lvlB', 0), offG: NV.store.get('lvlG', 0), mark: NV.store.get('mark', null), wasLevel: false });
  NA.frame = () => {
    NA.dispH = NV.angLerp(NA.dispH, S.heading, 0.12);
    drawCompass(); drawLevel();
  };
  NA.tickReadouts = () => { const h = Math.round(NA.dispH) % 360; NV.text('#cmp-deg', NV.pad(h, 3) + '°'); NV.text('#cmp-dir', NV.cardinal(h) + (S.headingSrc === 'sim' ? ' · SIM' : S.headingSrc === 'relative' ? ' · REL' : '')); };
  function drawCompass() {
    const f = NV.fit($('#compass')); if (!f) return; const { x, w, h } = f, c = NV.colors, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8, hd = NA.dispH * NV.DEG;
    x.clearRect(0, 0, w, h);
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, NV.rgba(c.primary, 0.14)); bg.addColorStop(0.7, NV.rgba(c.bg1, 0.35)); bg.addColorStop(1, 'rgba(0,0,0,.5)');
    x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    x.strokeStyle = NV.rgba(c.primary, 0.55); x.lineWidth = 2; x.shadowColor = c.primary; x.shadowBlur = 12; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke(); x.shadowBlur = 0;
    x.save(); x.translate(cx, cy); x.rotate(-hd);
    for (let d = 0; d < 360; d += 5) {
      const a = d * NV.DEG - Math.PI / 2, maj = d % 30 === 0, mid = d % 10 === 0, r1 = R - 4, r2 = R - (maj ? 18 : mid ? 12 : 8);
      x.strokeStyle = maj ? c.secondary : NV.rgba(c.primary, mid ? 0.7 : 0.4); x.lineWidth = maj ? 2 : 1;
      x.beginPath(); x.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); x.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); x.stroke();
      if (maj) {
        const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || String(d), card = d % 90 === 0;
        x.save(); x.translate(Math.cos(a) * (R - 32), Math.sin(a) * (R - 32)); x.rotate(a + Math.PI / 2);
        txt(x, lab, 0, 0, d === 0 ? c.tertiary : card ? '#fff' : NV.rgba(c.secondary, 0.75), card ? Math.max(12, R * 0.11) : Math.max(8, R * 0.06), 'center', card ? 'Orbitron, sans-serif' : undefined, card ? '800' : '');
        x.restore();
      }
    }
    // inner rose
    x.rotate(0); const rr = R * 0.5;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, len = i % 2 ? rr * 0.55 : rr, wd = rr * 0.12; x.fillStyle = i === 0 ? c.tertiary : i % 2 ? NV.rgba(c.primary, 0.35) : NV.rgba(c.secondary, 0.55); x.beginPath(); x.moveTo(Math.cos(a) * len, Math.sin(a) * len); x.lineTo(Math.cos(a + Math.PI / 2) * wd, Math.sin(a + Math.PI / 2) * wd); x.lineTo(0, 0); x.lineTo(Math.cos(a - Math.PI / 2) * wd, Math.sin(a - Math.PI / 2) * wd); x.closePath(); x.fill(); }
    if (NA.mark != null) { const a = NA.mark * NV.DEG - Math.PI / 2; x.fillStyle = '#57ffa8'; x.shadowColor = '#57ffa8'; x.shadowBlur = 12; x.beginPath(); x.arc(Math.cos(a) * (R - 11), Math.sin(a) * (R - 11), 5, 0, TAU); x.fill(); x.shadowBlur = 0; }
    x.restore();
    x.strokeStyle = NV.rgba(c.primary, 0.3); x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, R * 0.62, 0, TAU); x.stroke();
    x.beginPath(); x.arc(cx, cy, R * 0.2, 0, TAU); x.stroke();
    // lubber line
    x.fillStyle = '#fff'; x.shadowColor = c.secondary; x.shadowBlur = 14; x.beginPath(); x.moveTo(cx, cy - R + 2); x.lineTo(cx - 9, cy - R - 10 + 2 + 20); x.lineTo(cx + 9, cy - R - 10 + 2 + 20); x.closePath(); x.fill(); x.shadowBlur = 0;
    x.fillStyle = c.secondary; x.beginPath(); x.arc(cx, cy, 4, 0, TAU); x.fill();
  }
  function drawLevel() {
    const f = NV.fit($('#level')); if (!f) return; const { x, w, h } = f, c = NV.colors;
    x.clearRect(0, 0, w, h);
    const b = S.ori.beta - NA.offB, g = S.ori.gamma - NA.offG, tilt = Math.hypot(b, g), lvl = tilt < 1;
    const R = Math.min(w, h) * 0.36, cx = w * 0.44, cy = h * 0.44, col = lvl ? '#57ffa8' : c.primary;
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, NV.rgba(col, 0.16)); bg.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    x.strokeStyle = NV.rgba(col, 0.7); x.lineWidth = 2; x.shadowColor = col; x.shadowBlur = 12; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke(); x.shadowBlur = 0;
    [5, 10, 20].forEach((d) => { x.strokeStyle = NV.rgba(c.primary, 0.3); x.lineWidth = 1; x.setLineDash([3, 4]); x.beginPath(); x.arc(cx, cy, R * d / 30, 0, TAU); x.stroke(); x.setLineDash([]); txt(x, d + '°', cx + R * d / 30 + 2, cy - 6, NV.rgba(c.secondary, 0.5), 9); });
    x.strokeStyle = NV.rgba(c.primary, 0.4); x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    const bx = cx + NV.clamp(-g, -30, 30) / 30 * R * 0.85, by = cy + NV.clamp(-b, -30, 30) / 30 * R * 0.85, br = R * 0.14;
    bubble(x, bx, by, br, col);
    x.strokeStyle = '#fff'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, br * 1.15, 0, TAU); x.stroke();
    // horizontal vial
    const vx = cx - R, vy = h * 0.9, vw = R * 2, vh = Math.max(14, R * 0.16);
    vial(x, vx, vy - vh / 2, vw, vh, NV.clamp(-g, -20, 20) / 20, col, true);
    const hx = w * 0.9, hy = cy - R, hh = R * 2;
    vial(x, hx - vh / 2, hy, vh, hh, NV.clamp(-b, -20, 20) / 20, col, false);
    NV.text('#lvl-read', `${b.toFixed(1)}° / ${g.toFixed(1)}°`);
    NV.text('#lvl-state', lvl ? 'LEVEL ✓' : tilt < 5 ? 'NEARLY' : 'TILTED');
    if (lvl && !NA.wasLevel) { NV.audio.level(); NV.haptic(25); NV.jarvis.auto('level', 20000); }
    NA.wasLevel = lvl;
  }
  function bubble(x, bx, by, br, col) { const g = x.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br); g.addColorStop(0, '#fff'); g.addColorStop(0.35, NV.rgba(col, 0.9)); g.addColorStop(1, NV.rgba(col, 0.25)); x.fillStyle = g; x.shadowColor = col; x.shadowBlur = 18; x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill(); x.shadowBlur = 0; }
  function vial(x, vx, vy, vw, vh, t, col, horiz) {
    x.fillStyle = 'rgba(0,0,0,.4)'; x.strokeStyle = NV.rgba(col, 0.6); x.lineWidth = 1.5; x.beginPath(); x.roundRect ? x.roundRect(vx, vy, vw, vh, Math.min(vw, vh) / 2) : x.rect(vx, vy, vw, vh); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; x.beginPath();
    if (horiz) { x.moveTo(vx + vw / 2 - vh * 0.7, vy + 2); x.lineTo(vx + vw / 2 - vh * 0.7, vy + vh - 2); x.moveTo(vx + vw / 2 + vh * 0.7, vy + 2); x.lineTo(vx + vw / 2 + vh * 0.7, vy + vh - 2); }
    else { x.moveTo(vx + 2, vy + vh / 2 - vw * 0.7); x.lineTo(vx + vw - 2, vy + vh / 2 - vw * 0.7); x.moveTo(vx + 2, vy + vh / 2 + vw * 0.7); x.lineTo(vx + vw - 2, vy + vh / 2 + vw * 0.7); }
    x.stroke();
    const r = Math.min(vw, vh) * 0.38;
    if (horiz) bubble(x, vx + vw / 2 + t * (vw / 2 - r - 3), vy + vh / 2, r, col); else bubble(x, vx + vw / 2, vy + vh / 2 + t * (vh / 2 - r - 3), r, col);
  }
  NA.init = () => {
    $('#lvl-zero').onclick = () => { NA.offB = S.ori.beta; NA.offG = S.ori.gamma; NV.store.set('lvlB', NA.offB); NV.store.set('lvlG', NA.offG); NV.toast('Level zeroed to current orientation.'); NV.audio.confirm(); };
    $('#lvl-reset').onclick = () => { NA.offB = NA.offG = 0; NV.store.set('lvlB', 0); NV.store.set('lvlG', 0); NV.audio.click(); };
    $('#cmp-mark').onclick = () => { NA.mark = Math.round(S.heading); NV.store.set('mark', NA.mark); NV.toast(`Bearing ${NV.pad(NA.mark, 3)}° marked, Sir.`); NV.audio.confirm(); };
    $('#cmp-clear').onclick = () => { NA.mark = null; NV.store.set('mark', null); NV.audio.click(); };
  };
  NA.mode = () => { const m = S.orientMode, b = $('#nav-badge'); b.textContent = m === 'live' ? (S.headingSrc === 'magnetic' ? 'LIVE · MAGNETIC' : 'LIVE · RELATIVE') : m === 'perm' ? 'SIM · PERMISSION NEEDED' : m === 'sim' ? 'SIMULATED' : 'WAITING'; b.className = 'badge ' + (m === 'live' ? 'live' : 'warn'); };

  // ======================= ACOUSTIC METER =======================
  const M = (NV.meter = { active: false, sim: false, db: 0, peak: 0, avg: 0, freq: 0 });
  let an = null, tData, fData, micStream = null, simNodes = [], energy = 0, eCount = 0, spectro, sctx, peaks = [], palV = -1, pal = [], lastLoud = 0;
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteOf = (f) => { if (!f) return ''; const n = Math.round(12 * Math.log2(f / 440)) + 69; return NOTES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1); };
  function classify(db) { return db < 30 ? 'Near silence · a mime convention' : db < 45 ? 'Quiet room · library energy' : db < 60 ? 'Conversation · civilised' : db < 75 ? 'Busy · family dinner' : db < 88 ? 'Loud · lawnmower adjacent' : 'Very loud · rock concert (hearing at risk)'; }
  function setupAnalyser(ctx) { an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.72; tData = new Float32Array(an.fftSize); fData = new Uint8Array(an.frequencyBinCount); peaks = new Array(56).fill(0); }
  function stopAll() { if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; } simNodes.forEach((n) => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { /* ignore */ } }); simNodes = []; M.active = false; }
  function setBadge(t, cls) { const b = $('#audio-badge'); b.textContent = t; b.className = 'badge ' + (cls || ''); }
  M.start = async () => {
    const ctx = NV.audio.ctx; if (!ctx) { NV.toast('Web Audio unavailable.'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { NV.toast('Microphone API unavailable. Running the simulation.'); return M.simulate(); }
    try {
      stopAll();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      setupAnalyser(ctx); ctx.createMediaStreamSource(micStream).connect(an);
      M.active = true; M.sim = false; M.peak = 0; energy = 0; eCount = 0; setBadge('MIC LIVE', 'live'); NV.text('#au-start', 'Stop Mic'); NV.audio.powerUp(); NV.emitCaps && NV.emitCaps();
    } catch (e) { NV.toast(`Microphone unavailable (${e.name || 'error'}). Engaging simulated audio.`); M.simulate(); }
  };
  M.simulate = () => {
    const ctx = NV.audio.ctx; if (!ctx) return; stopAll(); setupAnalyser(ctx);
    const mix = ctx.createGain(); mix.gain.value = 0.25; mix.connect(an); simNodes.push(mix);
    [[196, 'sine', 0.5], [392, 'triangle', 0.25], [1175, 'sine', 0.12]].forEach(([f, type, g]) => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = type; o.frequency.value = f; gg.gain.value = g; o.connect(gg); gg.connect(mix); o.start(); simNodes.push(o);
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.2 + Math.random() * 0.6; lg.gain.value = f * 0.03; l.connect(lg); lg.connect(o.frequency); l.start(); simNodes.push(l); });
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6; const ng = ctx.createGain(); ng.gain.value = 0.4; ns.connect(nf); nf.connect(ng); ng.connect(mix); ns.start(); simNodes.push(ns);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.15; lfoG.gain.value = 0.18; lfo.connect(lfoG); lfoG.connect(mix.gain); lfo.start(); simNodes.push(lfo);
    M.active = true; M.sim = true; M.peak = 0; energy = 0; eCount = 0; setBadge('SIMULATED', 'warn'); NV.text('#au-start', 'Stop'); NV.audio.click(); NV.emitCaps && NV.emitCaps();
  };
  M.stop = () => { stopAll(); setBadge('MIC IDLE'); NV.text('#au-start', 'Start Mic'); NV.audio.powerDown(); NV.emitCaps && NV.emitCaps(); };
  M.compute = () => {
    if (!M.active || !an) return;
    an.getFloatTimeDomainData(tData); an.getByteFrequencyData(fData);
    let s = 0; for (let i = 0; i < tData.length; i++) s += tData[i] * tData[i];
    const rms = Math.sqrt(s / tData.length), dbfs = 20 * Math.log10(Math.max(rms, 1e-7));
    const db = NV.clamp(dbfs + NV.settings.micoffset, 0, 130);
    M.db = NV.lerp(M.db, db, 0.25); if (M.db > M.peak) M.peak = M.db;
    energy += Math.pow(10, M.db / 10); eCount++; M.avg = 10 * Math.log10(energy / eCount);
    const sr = NV.audio.ctx.sampleRate, binHz = sr / an.fftSize; let mx = 0, mi = 0;
    for (let i = Math.floor(50 / binHz); i < Math.min(fData.length, 5000 / binHz); i++) if (fData[i] > mx) { mx = fData[i]; mi = i; }
    M.freq = mx > 60 ? mi * binHz : 0;
    if (M.db > 88 && performance.now() - lastLoud > 15000) { lastLoud = performance.now(); NV.jarvis.auto('loud', 12000); }
  };
  function palette() {
    if (palV === NV.colors.v) return pal; palV = NV.colors.v; const c = NV.colors; pal = [];
    for (let i = 0; i < 64; i++) { const t = i / 63; const col = t < 0.4 ? NV.mixHex('#000000', c.primary, t / 0.4) : t < 0.8 ? NV.mixHex(c.primary, c.secondary, (t - 0.4) / 0.4) : NV.mixHex(c.secondary, '#ffffff', (t - 0.8) / 0.2); pal.push(col); }
    return pal;
  }
  M.frame = (t) => {
    const c = NV.colors;
    arcGauge($('#db-gauge'), { value: M.active ? M.db : 0, min: 0, max: 120, peak: M.active ? M.peak : null, label: M.sim ? 'dB · SIMULATED' : 'dB (APPROX)', big: M.active ? Math.round(M.db) + ' dB' : '--', sub: M.active ? noteOf(M.freq) || 'NO TONE' : 'MIC IDLE', ticks: 6, zones: [[0, 60, '#57ffa8'], [60, 85, '#ffb547'], [85, 120, '#ff4d5e']] });
    // spectrum
    let f = NV.fit($('#au-spectrum'));
    if (f) {
      const { x, w, h } = f; graphFrame(x, w, h);
      const nb = 56, gap = 2, bw = (w - gap * (nb - 1)) / nb, sr = M.active ? NV.audio.ctx.sampleRate : 48000, binHz = sr / 2048;
      const grd = x.createLinearGradient(0, h, 0, 0); grd.addColorStop(0, c.primary); grd.addColorStop(1, c.secondary);
      for (let i = 0; i < nb; i++) {
        let v = 0;
        if (M.active && fData) { const f0 = 30 * Math.pow(16000 / 30, i / nb), f1 = 30 * Math.pow(16000 / 30, (i + 1) / nb); const b0 = Math.floor(f0 / binHz), b1 = Math.max(b0 + 1, Math.floor(f1 / binHz)); for (let k = b0; k < b1 && k < fData.length; k++) v = Math.max(v, fData[k]); v /= 255; }
        else v = 0.04 + 0.03 * Math.sin(t / 400 + i * 0.4);
        const bh = v * (h - 8); peaks[i] = Math.max(bh, (peaks[i] || 0) - 1.2);
        x.fillStyle = grd; x.shadowColor = c.primary; x.shadowBlur = 6; x.fillRect(i * (bw + gap), h - bh, bw, bh); x.shadowBlur = 0;
        x.fillStyle = '#fff'; x.fillRect(i * (bw + gap), h - peaks[i] - 3, bw, 2);
      }
      ['100', '1k', '10k'].forEach((lab, k) => { const fr = [100, 1000, 10000][k], px = Math.log(fr / 30) / Math.log(16000 / 30) * w; txt(x, lab, px, 9, NV.rgba(c.secondary, 0.55), 9.5, 'center'); });
    }
    // waveform
    f = NV.fit($('#au-wave'));
    if (f) { const { x, w, h } = f; graphFrame(x, w, h); const pts = []; const n = 256; for (let i = 0; i < n; i++) { const v = M.active && tData ? tData[i * 4] : Math.sin(t / 200 + i / 10) * 0.02; pts.push([i / (n - 1) * w, h / 2 - NV.clamp(v * 3, -1, 1) * (h / 2 - 4)]); } glowLine(x, pts, c.secondary, 1.6, 10); }
    // spectrogram
    f = NV.fit($('#au-spectro'));
    if (f) {
      const { x, w, h } = f, P = palette();
      if (!spectro) { spectro = document.createElement('canvas'); spectro.width = 240; spectro.height = 80; sctx = spectro.getContext('2d'); sctx.fillStyle = '#000'; sctx.fillRect(0, 0, 240, 80); }
      sctx.drawImage(spectro, -1, 0);
      const sr = M.active ? NV.audio.ctx.sampleRate : 48000, binHz = sr / 2048;
      for (let y = 0; y < 80; y++) { let v = 0; if (M.active && fData) { const fr = 40 * Math.pow(12000 / 40, 1 - y / 79), b = Math.min(fData.length - 1, Math.round(fr / binHz)); v = fData[b] / 255; } sctx.fillStyle = P[Math.min(63, Math.floor(v * 63))]; sctx.fillRect(239, y, 1, 1); }
      x.imageSmoothingEnabled = true; x.clearRect(0, 0, w, h); x.drawImage(spectro, 0, 0, w, h);
    }
  };
  M.tickReadouts = () => {
    NV.text('#au-db', M.active ? M.db.toFixed(1) + ' dB' : '-- dB'); NV.text('#au-peak', M.active ? M.peak.toFixed(1) + ' dB' : '-- dB'); NV.text('#au-avg', M.active ? M.avg.toFixed(1) + ' dB' : '-- dB');
    NV.text('#au-freq', M.active && M.freq ? `${Math.round(M.freq)} Hz ${noteOf(M.freq)}` : '-- Hz'); NV.text('#au-class', M.active ? classify(M.db) : 'Awaiting audio');
  };
  M.init = () => {
    $('#au-start').onclick = () => (M.active ? M.stop() : M.start());
    $('#au-sim').onclick = () => M.simulate();
    $('#au-reset').onclick = () => { M.peak = M.db; energy = 0; eCount = 0; NV.audio.click(); };
  };

  // ======================= THREAT =======================
  const LEVELS = [[20, 'NOMINAL', '#57ffa8', 'No credible threats. Several incredible ones.'], [40, 'GUARDED', '#9fe8ff', 'Mild suspicion. Keep one eyebrow raised.'], [60, 'ELEVATED', '#ffb547', 'Something is afoot. Possibly a foot.'], [80, 'HIGH', '#ff7a3d', 'Considerable peril. Snacks should be secured.'], [101, 'RED', '#ff2a3d', 'Maximum drama. Assume a heroic stance.']];
  const T = (NV.threat = { value: 8, name: 'NOMINAL', col: '#57ffa8', red: false, f: { noise: 0, motion: 0, dark: 0, anomaly: 32 }, assessing: 0 });
  const POOL = [['Unattended sock', 0], ['Suspicious crumb trail', 1], ['Cat, plotting', 2], ['Rogue Lego brick (floor)', 3], ['Houseplant, judging you', 1], ['Low-flying moth', 1], ['Wi-Fi dead zone', 2], ['Pending software update', 2], ['Tuesday', 1], ['Unread group chat (47)', 2], ['Squeaky floorboard', 0], ['Neighbour\u2019s leaf blower', 2], ['Plot hole, minor', 1], ['Last slice of pizza (contested)', 3], ['Spoiler, incoming', 3], ['Dust bunny collective', 0], ['Charger cable 4 cm too short', 2]];
  let tList = [], lastList = 0, lastT = 0, redTimer = null;
  function levelOf(v) { return LEVELS.find((l) => v < l[0]); }
  T.tick = (t) => {
    if (t - lastT < 200) return; lastT = t;
    const f = T.f, M2 = NV.meter, cam = NV.cam;
    f.noise = M2.active ? NV.clamp((M2.db - 40) / 50, 0, 1) * 100 : NV.lerp(f.noise, 0, 0.1);
    f.motion = Math.max(NV.clamp(S.linMag / 14, 0, 1) * 100, f.motion * 0.9);
    f.dark = cam && cam.luma != null && cam.active() ? NV.clamp((0.3 - cam.luma) / 0.3, 0, 1) * 100 : 0;
    f.anomaly = NV.clamp(f.anomaly + (Math.random() - 0.5) * 7 + (32 - f.anomaly) * 0.03 + (Math.random() < 0.01 ? 35 : 0), 0, 100);
    let target = 4 + f.noise * 0.3 + f.motion * 0.3 + f.dark * 0.15 + f.anomaly * 0.3;
    if (T.red) target = Math.max(target, 90 + Math.random() * 8);
    T.value = NV.lerp(T.value, NV.clamp(target, 0, 100), 0.18);
    const L = levelOf(T.value); T.name = L[1]; T.col = L[2]; T.desc = L[3];
    // UI
    NV.text('#chip-threat-text', 'THREAT ' + NV.pad(T.value) + ' · ' + T.name); $('#chip-threat').classList.toggle('hot', T.value >= 60);
    $('#tmini-fill').style.width = T.value.toFixed(1) + '%'; $('#tmini-fill').style.setProperty('--tc', T.col); NV.text('#tmini-val', NV.pad(T.value)); NV.text('#tmini-lvl', T.name);
    const b = $('#threat-badge'); b.textContent = T.name; b.className = 'badge ' + (T.value >= 60 ? 'bad' : T.value >= 40 ? 'warn' : 'live');
    if (NV.visible($('#threat-level'))) {
      NV.text('#threat-level', T.name); $('#threat-level').style.setProperty('--tc', T.col); NV.text('#threat-desc', T.desc);
      $('#threat-factors').innerHTML = [['Acoustic', f.noise], ['Kinetic', f.motion], ['Darkness', f.dark], ['Anomalies', f.anomaly]].map(([k, v]) => `<div class="tf"><span>${k}</span><i><b style="width:${v.toFixed(0)}%"></b></i><span>${NV.pad(v)}</span></div>`).join('');
    }
    NV.$('[data-tab="threat"]').classList.toggle('alert-dot', T.value >= 60);
    if (t - lastList > 5000 || !tList.length) { lastList = t; refreshList(); }
  };
  function refreshList() {
    const pool = POOL.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    tList = pool.map(([n, r]) => ({ n, r: T.red ? Math.min(3, r + 1) : r, b: Math.floor(Math.random() * 360), d: (Math.random() * 40 + 1).toFixed(1) }));
    const RN = ['LOW', 'MILD', 'MED', 'HIGH'];
    const ul = $('#threat-list'); if (ul) ul.innerHTML = tList.map((c) => `<li><span>${NV.esc(c.n)}</span><span class="mono">${NV.pad(c.b, 3)}° · ${c.d}m</span><span class="risk r${c.r}">${RN[c.r]}</span></li>`).join('');
  }
  T.frame = (t) => {
    const f = NV.fit($('#threat-canvas')); if (!f) return; const { x, w, h } = f, c = NV.colors, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10, ts = t / 1000;
    x.clearRect(0, 0, w, h);
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, NV.rgba(T.col, 0.2)); bg.addColorStop(1, 'rgba(0,0,0,.3)'); x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    // segmented ring
    const segs = 50, a0 = -Math.PI / 2;
    for (let i = 0; i < segs; i++) { const a = a0 + i / segs * TAU + 0.02, on = i / segs < T.value / 100, L = levelOf(i / segs * 100); x.strokeStyle = on ? L[2] : 'rgba(255,255,255,.07)'; x.lineWidth = R * 0.12; x.shadowColor = L[2]; x.shadowBlur = on ? 12 : 0; x.beginPath(); x.arc(cx, cy, R * 0.86, a, a + TAU / segs - 0.04); x.stroke(); }
    x.shadowBlur = 0;
    // rotating inner rings
    x.strokeStyle = NV.rgba(c.primary, 0.5); x.lineWidth = 1.5; x.setLineDash([2, 6]); x.beginPath(); x.arc(cx, cy, R * 0.66, ts * 0.5, ts * 0.5 + TAU); x.stroke(); x.setLineDash([]);
    x.strokeStyle = NV.rgba(T.col, 0.8); x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, R * 0.6, -ts, -ts + Math.PI * 0.6); x.stroke(); x.beginPath(); x.arc(cx, cy, R * 0.6, -ts + Math.PI, -ts + Math.PI * 1.6); x.stroke();
    if (T.assessing) {
      const p = NV.clamp((performance.now() - T.assessing) / 2600, 0, 1), a = a0 + p * TAU * 2;
      const g = x.createLinearGradient(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.addColorStop(0, NV.rgba(c.secondary, 0)); g.addColorStop(1, c.secondary);
      x.strokeStyle = g; x.lineWidth = 3; x.shadowColor = c.secondary; x.shadowBlur = 14; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); x.stroke(); x.shadowBlur = 0;
      txt(x, 'ASSESSING ' + Math.round(p * 100) + '%', cx, cy + R * 0.34, c.secondary, Math.max(10, R * 0.08), 'center');
    } else txt(x, 'THREAT INDEX', cx, cy + R * 0.34, NV.rgba(c.secondary, 0.7), Math.max(9, R * 0.075), 'center');
    txt(x, NV.pad(T.value), cx, cy - R * 0.02, '#fff', Math.max(28, R * 0.42), 'center', 'Orbitron, sans-serif', '800');
    txt(x, T.name, cx, cy - R * 0.36, T.col, Math.max(10, R * 0.1), 'center', 'Orbitron, sans-serif', '700');
  };
  T.assess = () => {
    if (T.assessing) return; T.assessing = performance.now(); NV.audio.scan(); NV.haptic([20, 80, 20]);
    NV.text('#th-assess', 'Assessing…'); $('#th-assess').disabled = true;
    setTimeout(() => {
      T.assessing = 0; NV.text('#th-assess', 'Run Assessment'); $('#th-assess').disabled = false; NV.audio.scanDone();
      const top = tList.slice().sort((a, b) => b.r - a.r)[0];
      const line = `Assessment complete. Threat index ${Math.round(T.value)}, ${T.name.toLowerCase()}. Principal concern: ${top ? top.n.toLowerCase() : 'nothing whatsoever'}. ${T.value < 40 ? 'I recommend carrying on, Sir, with a light air of vigilance.' : T.value < 70 ? 'I recommend a strategic snack and heightened eyebrows.' : 'I recommend immediate and dramatic retreat. Walk, do not run. Style matters.'}`;
      NV.jarvis.speak(line, { tag: 'TAC' });
      let th = null; try { th = $('#threat-canvas').toDataURL('image/jpeg', 0.7); } catch (e) { th = null; }
      NV.log && NV.log.add({ type: 'threat', title: `Threat ${Math.round(T.value)} · ${T.name}`, detail: line + ' (Entertainment only.)', thumb: th, color: T.col });
    }, 2600);
  };
  T.setRed = (on) => {
    if (on === T.red) return; T.red = on;
    document.body.classList.toggle('red-alert', on); $('#redalert').setAttribute('aria-hidden', !on);
    NV.text('#th-red', on ? 'Stand Down' : 'Engage Red Alert');
    NV.setPalette && NV.setPalette(on ? 'redalert' : null);
    clearInterval(redTimer);
    if (on) {
      NV.audio.startLoop('redalert'); NV.haptic([400, 200, 400, 200, 400]); NV.jarvis.say('red');
      let i = 0; redTimer = setInterval(() => { i++; NV.haptic([300, 150, 300]); if (i % 3 === 0 && NV.settings.commentary) NV.jarvis.say('red'); }, 2600);
      refreshList();
    } else { NV.audio.stopLoop(); NV.haptic(0); NV.jarvis.say('standDown'); refreshList(); }
  };
  T.init = () => { $('#th-assess').onclick = T.assess; $('#th-red').onclick = () => T.setRed(!T.red); $('#ra-stand').onclick = () => T.setRed(false); refreshList(); };

  // ======================= RADAR =======================
  const RD = (NV.radar = { range: 50, contacts: [], pulse: 0 });
  const CONTACTS = [['Lost Left Sock', 'TEXTILE'], ['Cat (Probable)', 'FELINE'], ['Neighbour\u2019s Wi-Fi', 'SIGNAL'], ['Pigeon, Highly Organised', 'AVIAN'], ['Unattended Sandwich', 'SNACK'], ['Robot Vacuum On Patrol', 'DRONE'], ['Mysterious Hum', 'ACOUSTIC'], ['A Tuesday', 'TEMPORAL'], ['Delivery Van (Not Yours)', 'VEHICLE'], ['Plot Twist', 'NARRATIVE'], ['Dust Bunny Swarm', 'FAUNA'], ['Ghost Of A Screensaver', 'SPECTRAL'], ['Garden Gnome (Allegedly Still)', 'GNOME'], ['Ice-Cream Van Jingle', 'ACOUSTIC'], ['Frisbee, Rogue', 'AERIAL']];
  let cid = 0, lastSpawn = 0, prevSweep = 0, lastListR = 0;
  function spawn() { const [n, cl] = NV.pick(CONTACTS.filter(([nm]) => !RD.contacts.some((c) => c.name === nm))); RD.contacts.push({ id: ++cid, name: n, cls: cl, ang: Math.random() * TAU, dist: 0.18 + Math.random() * 0.76, va: (Math.random() - 0.5) * 0.02, vd: (Math.random() - 0.5) * 0.01, hit: -1e9, born: performance.now() }); }
  for (let i = 0; i < 6; i++) spawn();
  const sweepAt = (t) => ((t / 3200) * TAU) % TAU;
  RD.update = (t, dt) => {
    const k = Math.min(dt, 50) / 1000, sw = sweepAt(t);
    RD.contacts.forEach((c) => {
      c.ang = (c.ang + c.va * k + TAU) % TAU; c.dist = NV.clamp(c.dist + c.vd * k, 0.12, 0.97); if (c.dist <= 0.12 || c.dist >= 0.97) c.vd *= -1;
      const crossed = prevSweep <= sw ? (c.ang > prevSweep && c.ang <= sw) : (c.ang > prevSweep || c.ang <= sw);
      if (crossed) { c.hit = t; if (NV.$('#radar-ping').checked && NV.visible($('#radar'))) NV.audio.ping(Math.cos(c.ang - Math.PI / 2) * 0.8, 1 - c.dist * 0.6); }
    });
    prevSweep = sw;
    if (t - lastSpawn > 7000) { lastSpawn = t; if (RD.contacts.length > 8 || (RD.contacts.length > 4 && Math.random() < 0.5)) RD.contacts.shift(); else spawn(); }
    NV.text('#mini-radar-count', RD.contacts.length + ' CONTACTS');
  };
  RD.draw = (cv, t, big) => {
    const f = NV.fit(cv); if (!f) return; const { x, w, h } = f, c = NV.colors, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - (big ? 22 : 6), sw = sweepAt(t), hd = (S.heading || 0) * NV.DEG;
    x.clearRect(0, 0, w, h);
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, NV.rgba(c.primary, 0.16)); bg.addColorStop(0.75, NV.rgba(c.bg1, 0.55)); bg.addColorStop(1, 'rgba(0,0,0,.6)');
    x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    // rings + crosshair
    x.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { x.strokeStyle = NV.rgba(c.primary, i === 4 ? 0.7 : 0.25); x.beginPath(); x.arc(cx, cy, R * i / 4, 0, TAU); x.stroke(); if (big) txt(x, Math.round(RD.range * i / 4) + 'm', cx + 4, cy - R * i / 4 + 9, NV.rgba(c.secondary, 0.55), 9.5); }
    x.strokeStyle = NV.rgba(c.primary, 0.2); x.beginPath();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; x.moveTo(cx + Math.cos(a) * R * 0.08, cy + Math.sin(a) * R * 0.08); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } x.stroke();
    // degree ring (rotates with heading)
    for (let d = 0; d < 360; d += 10) { const a = d * NV.DEG - Math.PI / 2 - hd, maj = d % 30 === 0; x.strokeStyle = NV.rgba(c.secondary, maj ? 0.8 : 0.35); x.beginPath(); x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.lineTo(cx + Math.cos(a) * (R + (maj ? 7 : 4)), cy + Math.sin(a) * (R + (maj ? 7 : 4))); x.stroke(); if (big && maj) txt(x, d === 0 ? 'N' : String(d), cx + Math.cos(a) * (R + 15), cy + Math.sin(a) * (R + 15), d === 0 ? c.tertiary : NV.rgba(c.secondary, 0.6), d === 0 ? 12 : 9, 'center', d === 0 ? 'Orbitron, sans-serif' : undefined, d === 0 ? '800' : ''); }
    // sweep trail
    const sa = sw - Math.PI / 2;
    if (x.createConicGradient) { const g = x.createConicGradient(sa - 1.2, cx, cy); g.addColorStop(0, NV.rgba(c.primary, 0)); g.addColorStop(1.2 / TAU, NV.rgba(c.primary, 0.42)); g.addColorStop(1.2 / TAU + 0.0005, NV.rgba(c.primary, 0)); g.addColorStop(1, NV.rgba(c.primary, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, sa - 1.2, sa); x.closePath(); x.fill(); }
    else { for (let i = 0; i < 24; i++) { const a2 = sa - i * 0.05; x.fillStyle = NV.rgba(c.primary, 0.35 * (1 - i / 24)); x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a2 - 0.05, a2); x.fill(); } }
    x.strokeStyle = c.secondary; x.lineWidth = 2; x.shadowColor = c.primary; x.shadowBlur = 14; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R); x.stroke(); x.shadowBlur = 0;
    // pulse wave
    if (RD.pulse) { const p = (performance.now() - RD.pulse) / 1400; if (p >= 1) RD.pulse = 0; else { x.strokeStyle = NV.rgba(c.secondary, 1 - p); x.lineWidth = 3; x.shadowColor = c.secondary; x.shadowBlur = 16; x.beginPath(); x.arc(cx, cy, R * p, 0, TAU); x.stroke(); x.shadowBlur = 0; } }
    // speckle noise
    x.fillStyle = NV.rgba(c.primary, 0.25); for (let i = 0; i < (big ? 18 : 8); i++) { const a = Math.random() * TAU, r = Math.random() * R; x.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.2, 1.2); }
    // contacts
    RD.contacts.forEach((ct) => {
      const age = t - ct.hit, al = Math.exp(-age / 2200); if (al < 0.03) return;
      const a = ct.ang - Math.PI / 2, px = cx + Math.cos(a) * ct.dist * R, py = cy + Math.sin(a) * ct.dist * R, col = ct.cls === 'SNACK' || ct.cls === 'NARRATIVE' ? c.tertiary : c.secondary;
      const gr = x.createRadialGradient(px, py, 0, px, py, big ? 16 : 9); gr.addColorStop(0, NV.rgba(col, 0.9 * al)); gr.addColorStop(1, NV.rgba(col, 0)); x.fillStyle = gr; x.beginPath(); x.arc(px, py, big ? 16 : 9, 0, TAU); x.fill();
      x.fillStyle = `rgba(255,255,255,${al})`; x.beginPath(); x.arc(px, py, big ? 3.2 : 2, 0, TAU); x.fill();
      if (age < 900) { const p = age / 900; x.strokeStyle = NV.rgba(col, 1 - p); x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 4 + p * (big ? 22 : 12), 0, TAU); x.stroke(); }
      if (big && al > 0.2) { x.globalAlpha = al; txt(x, ct.name.toUpperCase(), px + 10, py - 8, col, 10); txt(x, Math.round(ct.dist * RD.range) + 'm', px + 10, py + 5, NV.rgba(c.secondary, 0.7), 9); x.globalAlpha = 1; }
    });
    // own position
    x.fillStyle = '#fff'; x.shadowColor = c.secondary; x.shadowBlur = 10; x.beginPath(); x.moveTo(cx, cy - 7); x.lineTo(cx - 5, cy + 5); x.lineTo(cx, cy + 2); x.lineTo(cx + 5, cy + 5); x.closePath(); x.fill(); x.shadowBlur = 0;
    if (big) { txt(x, 'SIMULATED CONTACTS · ENTERTAINMENT', 8, h - 8, NV.rgba(c.tertiary, 0.8), 9.5); txt(x, `HDG ${NV.pad(Math.round(S.heading) % 360, 3)}°`, w - 8, h - 8, NV.rgba(c.secondary, 0.8), 10, 'right'); }
  };
  RD.list = (t) => {
    if (t - lastListR < 500) return; lastListR = t;
    const ul = $('#contact-list'); if (!ul || !NV.visible(ul)) return;
    ul.innerHTML = RD.contacts.slice().sort((a, b) => a.dist - b.dist).map((c) => `<li><span>${NV.esc(c.name)}</span><span class="mono">${NV.pad(Math.round((c.ang / NV.DEG + (S.heading || 0)) % 360), 3)}° / ${Math.round(c.dist * RD.range)}m</span><span class="risk r${c.cls === 'SNACK' || c.cls === 'NARRATIVE' ? 2 : 1}">${c.cls}</span></li>`).join('');
  };
  RD.doPulse = () => { RD.pulse = performance.now(); const t = performance.now(); RD.contacts.forEach((c) => (c.hit = t + c.dist * 1400)); NV.audio.ping(0, 1.2); NV.haptic(30); };
  RD.init = () => {
    NV.$$('#radar-range button').forEach((b) => (b.onclick = () => { RD.range = +b.dataset.r; NV.$$('#radar-range button').forEach((o) => o.classList.toggle('on', o === b)); NV.audio.click(); }));
    $('#radar-scan').onclick = RD.doPulse;
    $('#radar').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, R = Math.min(r.width, r.height) / 2 - 22;
      let best = null, bd = 30;
      RD.contacts.forEach((c) => { const a = c.ang - Math.PI / 2, px = r.width / 2 + Math.cos(a) * c.dist * R, py = r.height / 2 + Math.sin(a) * c.dist * R, d = Math.hypot(px - mx, py - my); if (d < bd) { bd = d; best = c; } });
      if (best) NV.jarvis.speak(`Contact: ${best.name}, ${Math.round(best.dist * RD.range)} metres. Classification ${best.cls.toLowerCase()}. ${NV.pick(NV.jarvis.lines.contact)}`, { tag: 'SONAR' });
      else RD.doPulse();
    });
  };

  // ======================= SYSTEM =======================
  const ST = (NV.status = { battery: null, charging: false, fpsHist: [] });
  const t0 = Date.now();
  function uaInfo() {
    const ua = navigator.userAgent, d = navigator.userAgentData;
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1) ? 'iOS / iPadOS' : /Windows/i.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Unknown';
    const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Unknown';
    const ver = (ua.match(/(?:Edg|Chrome|Firefox|Version)\/(\d+)/) || [])[1] || '';
    return { os: d && d.platform ? d.platform : os, browser: br + (ver ? ' ' + ver : ''), mobile: d ? d.mobile : /Mobi/i.test(ua) };
  }
  ST.devInfo = () => {
    const u = uaInfo(), tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const items = [['OS', u.os], ['Browser', u.browser], ['Form factor', u.mobile ? 'Handheld' : 'Desktop / tablet'], ['Screen', `${screen.width}×${screen.height} @${(devicePixelRatio || 1).toFixed(1)}x`], ['Viewport', `${innerWidth}×${innerHeight}`], ['CPU cores', navigator.hardwareConcurrency || '--'], ['Memory', navigator.deviceMemory ? '≥' + navigator.deviceMemory + ' GB' : 'Undisclosed'], ['Touch points', navigator.maxTouchPoints || 0], ['Orientation', (screen.orientation && screen.orientation.type) || (innerWidth > innerHeight ? 'landscape' : 'portrait')], ['Language', navigator.language || '--'], ['Time zone', tz], ['Storage', '…']];
    $('#dev-list').innerHTML = items.map(([k, v], i) => `<div class="ro"><span class="k">${k}</span><span class="v mono" ${i === 11 ? 'id="dev-storage"' : ''}>${NV.esc(String(v))}</span></div>`).join('');
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => NV.text('#dev-storage', `${(e.usage / 1048576).toFixed(1)} / ${(e.quota / 1073741824).toFixed(1)} GB`)).catch(() => NV.text('#dev-storage', '--')); else NV.text('#dev-storage', '--');
  };
  ST.caps = () => {
    const cam = NV.cam, M2 = NV.meter;
    const list = [
      ['Camera', cam.live ? 'live' : cam.sim ? 'sim' : navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'ready' : 'na'],
      ['Microphone', M2.active && !M2.sim ? 'live' : M2.sim ? 'sim' : navigator.mediaDevices ? 'ready' : 'na'],
      ['Accelerometer', S.caps.motion()], ['Gyroscope', S.caps.motion()], ['Orientation', S.caps.orient()],
      ['Compass', S.orientMode === 'live' && S.headingSrc === 'magnetic' ? 'live' : S.orientMode === 'live' ? 'ready' : 'sim'],
      ['Torch', cam.torchCap ? 'ready' : 'sim'], ['Barcode Detector', cam.qrSupported ? 'ready' : 'na'], ['Vibration', navigator.vibrate ? 'ready' : 'na'],
      ['Speech', window.speechSynthesis ? 'ready' : 'na'], ['Wake Lock', navigator.wakeLock ? 'ready' : 'na'], ['Ambient Light', 'AmbientLightSensor' in window ? 'ready' : 'sim'],
      ['Battery API', navigator.getBattery ? 'live' : 'na'], ['Network Info', navigator.connection ? 'live' : 'ready'], ['Offline Cache', navigator.serviceWorker && navigator.serviceWorker.controller ? 'live' : 'serviceWorker' in navigator ? 'ready' : 'na']
    ];
    const LBL = { live: 'LIVE', ready: 'READY', sim: 'FALLBACK', na: 'N/A' };
    $('#cap-grid').innerHTML = list.map(([k, s]) => `<div class="cap"><span>${k}</span><b class="${s}">${k === 'Torch' && s === 'sim' ? 'SCREEN' : k === 'Ambient Light' && s === 'sim' ? 'CAM EST.' : LBL[s]}</b></div>`).join('');
  };
  NV.emitCaps = () => { if (NV.visible($('#cap-grid'))) ST.caps(); };
  ST.init = () => {
    NV.text('#st-dpr', `${screen.width}×${screen.height} @${(devicePixelRatio || 1).toFixed(1)}x`);
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        const upd = () => {
          ST.battery = b.level; ST.charging = b.charging;
          NV.text('#st-battery', Math.round(b.level * 100) + '%' + (b.charging ? ' ⚡' : '')); $('#st-battery-bar').style.width = b.level * 100 + '%';
          const tm = b.charging ? b.chargingTime : b.dischargingTime;
          NV.text('#st-battery-note', b.charging ? (isFinite(tm) && tm > 0 ? `Full in ${Math.round(tm / 60)} min` : 'Charging · stable') : (isFinite(tm) ? `${Math.floor(tm / 3600)}h ${NV.pad(Math.floor(tm / 60) % 60)}m remaining` : 'Discharging'));
          NV.text('#ar-bat', Math.round(b.level * 100) + '%'); NV.text('#ar-bat-s', b.charging ? 'charging ⚡' : 'on battery');
        };
        upd(); ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((ev) => b.addEventListener(ev, upd));
      }).catch(batFallback);
    } else batFallback();
    const net = () => {
      const c = navigator.connection, on = navigator.onLine;
      NV.text('#st-net', on ? (c && c.effectiveType ? c.effectiveType.toUpperCase() : 'ONLINE') : 'OFFLINE');
      $('#st-net-bar').style.width = !on ? '4%' : c && c.downlink ? NV.clamp(c.downlink / 10 * 100, 10, 100) + '%' : '100%';
      NV.text('#st-net-note', !on ? 'Running on local reserves' : c && c.downlink ? `${c.downlink} Mbps · ${c.rtt ?? '--'}ms RTT` : 'Link established');
    };
    net(); addEventListener('online', net); addEventListener('offline', net);
    if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', net);
    ST.devInfo(); addEventListener('resize', () => { if (NV.visible($('#dev-list'))) ST.devInfo(); });
  };
  function batFallback() { NV.text('#st-battery', 'EXT'); $('#st-battery-bar').style.width = '100%'; NV.text('#st-battery-note', 'Battery API unavailable · external power assumed'); NV.text('#ar-bat', 'EXT'); NV.text('#ar-bat-s', 'battery API n/a'); }
  ST.tick = () => { const s = Math.floor((Date.now() - t0) / 1000); NV.text('#st-uptime', NV.fmtHMS(s)); NV.text('#st-uptime-note', 'Page alive ' + Math.round(performance.now() / 1000) + 's'); };
  ST.fps = (fps) => {
    NV.text('#st-fps', Math.round(fps) + ' FPS'); ST.fpsHist.push(fps); if (ST.fpsHist.length > 40) ST.fpsHist.shift();
    const cv = $('#st-spark'); if (!cv || !NV.visible(cv)) return; const x = cv.getContext('2d'), W = cv.width, H = cv.height;
    x.clearRect(0, 0, W, H); x.beginPath(); ST.fpsHist.forEach((v, i) => { const px = (i / 39) * W, py = H - 3 - NV.clamp(v / 65, 0, 1) * (H - 6); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = NV.colors.primary; x.lineWidth = 1.5; x.shadowColor = NV.colors.primary; x.shadowBlur = 6; x.stroke();
  };

  // ======================= LOG =======================
  const LG = (NV.log = {});
  let entries = NV.store.get('log', []), openId = null;
  const ICON = { scan: '◎', qr: '▦', threat: '▲', note: '✎', audio: '♪' };
  function save() { let tries = 0; while (!NV.store.set('log', entries) && entries.length && tries++ < 40) entries.pop(); }
  LG.count = () => entries.length;
  LG.add = (e) => { entries.unshift(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now() }, e)); if (entries.length > 30) entries.length = 30; save(); LG.render(); };
  LG.remove = (id) => { entries = entries.filter((e) => e.id !== id); save(); LG.render(); };
  LG.render = () => {
    NV.text('#log-count', entries.length + (entries.length === 1 ? ' ENTRY' : ' ENTRIES'));
    const g = $('#log-grid');
    g.innerHTML = entries.length ? entries.map((e) => `<button class="log-card" data-id="${e.id}"><div class="log-thumb" style="${e.thumb ? `background-image:url(${e.thumb})` : ''}">${e.thumb ? '' : ICON[e.type] || '◎'}<span class="lt-type">${e.type.toUpperCase()}</span>${e.color ? `<span class="lt-sw" style="background:${e.color}"></span>` : ''}</div><div class="log-meta"><div class="log-title">${NV.esc(e.title)}</div><div class="log-time">${NV.fmtTime(e.t)}</div></div></button>`).join('') : '<div class="empty-state">No scans logged yet, Sir. Press SCAN on the optical scanner to begin.</div>';
    const r = $('#recent'), last = entries.slice(0, 4);
    r.innerHTML = last.length ? last.map((e) => `<button data-id="${e.id}" title="${NV.esc(e.title)}" style="${e.thumb ? `background-image:url(${e.thumb})` : ''}">${e.thumb ? '' : ICON[e.type] || '◎'}</button>`).join('') : '<div class="empty">No scans yet. The universe awaits.</div>';
  };
  LG.open = (id) => {
    const e = entries.find((x) => x.id === id); if (!e) return; openId = id;
    NV.text('#ld-type', e.type.toUpperCase()); NV.text('#ld-title', e.title);
    $('#ld-body').innerHTML = `${e.thumb ? `<img src="${e.thumb}" alt="Scan thumbnail">` : ''}<p class="k">Logged</p><p>${NV.esc(new Date(e.t).toLocaleString())}</p><p class="k">Detail</p><p>${NV.esc(e.detail || '')}</p>${e.type === 'scan' ? '<p class="k">Note</p><p>Colour and brightness are measured from the frame. The object analysis is fictional entertainment.</p>' : ''}`;
    NV.openModal('log-detail');
  };
  LG.init = () => {
    LG.render();
    const onClick = (ev) => { const b = ev.target.closest('[data-id]'); if (b) LG.open(b.dataset.id); };
    $('#log-grid').addEventListener('click', onClick); $('#recent').addEventListener('click', onClick);
    $('#ld-delete').onclick = () => { if (openId) LG.remove(openId); NV.closeModal('log-detail'); NV.toast('Entry deleted.'); };
    let armed = 0;
    $('#log-clear').onclick = () => { if (!entries.length) return; if (Date.now() - armed > 3000) { armed = Date.now(); NV.text('#log-clear', 'Tap to confirm'); setTimeout(() => NV.text('#log-clear', 'Clear All'), 3000); return; } entries = []; save(); LG.render(); NV.text('#log-clear', 'Clear All'); NV.toast('Scan log cleared. A fresh start, Sir.'); NV.audio.powerDown(); };
    $('#log-export').onclick = () => { const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }); const a = NV.el('a', { href: URL.createObjectURL(blob), download: 'nickverse-scan-log.json' }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); NV.toast('Log exported to your downloads.'); };
  };

  // ======================= TIMER =======================
  const TM = (NV.timer = { running: false, start: 0, acc: 0, marks: [], auto: 0 });
  const now = () => performance.now();
  TM.elapsed = () => TM.acc + (TM.running ? now() - TM.start : 0);
  TM.toggle = () => { if (TM.running) { TM.acc += now() - TM.start; TM.running = false; NV.audio.click(0.8); } else { TM.start = now(); TM.running = true; NV.audio.confirm(); } ui(); };
  TM.mark = () => { if (!TM.running) return; const e = TM.elapsed(), prev = TM.marks.length ? TM.marks[TM.marks.length - 1] : 0; TM.marks.push(e); NV.audio.blip(); NV.haptic(15); renderMarks(prev); };
  TM.reset = () => { TM.running = false; TM.acc = 0; TM.marks = []; ui(); renderMarks(); NV.audio.click(0.7); };
  function renderMarks() {
    const ol = $('#tm-marks'); if (!TM.marks.length) { ol.innerHTML = '<li class="empty">No marks yet, Sir.</li>'; return; }
    ol.innerHTML = TM.marks.map((m, i) => `<li><span>MARK ${NV.pad(i + 1)}</span><span>${NV.fmtDuration(m - (i ? TM.marks[i - 1] : 0))}</span><span>${NV.fmtDuration(m)}</span></li>`).reverse().join('');
  }
  function ui() {
    const st = TM.running ? 'RUNNING' : TM.acc ? 'PAUSED' : 'STANDBY';
    NV.text('#tm-state', st); NV.text('#tm-start', TM.running ? 'Pause' : TM.acc ? 'Resume' : 'Start'); $('#tm-start').classList.toggle('running', TM.running);
    $('#tm-mark').disabled = !TM.running; $('#tm-reset').disabled = !TM.running && !TM.acc;
    $('#chip-timer').hidden = !TM.running && !TM.acc;
  }
  TM.frame = () => {
    if (TM.auto) return;
    const e = TM.elapsed(); if (!TM.running && !TM.acc && !$('#tm-main').dataset.set) { $('#tm-main').dataset.set = 1; }
    const s = NV.fmtDuration(e), [main, cs] = s.split('.');
    const el = $('#tm-main'); const html = `${main}<span>.${cs}</span>`; if (el._h !== html) { el.innerHTML = html; el._h = html; el.classList.remove('count'); }
    NV.setRing($('#tm-ring'), (e % 60000) / 60000); NV.setRing($('#tm-ring2'), (e % 1000) / 1000);
    const last = TM.marks.length ? TM.marks[TM.marks.length - 1] : 0; NV.text('#tm-sub', `MARK ${NV.pad(TM.marks.length + 1)} · ${NV.fmtDuration(e - last)}`);
    if (TM.running || TM.acc) NV.text('#chip-timer-text', NV.fmtDuration(e, false));
  };
  TM.autoScan = () => {
    if (TM.auto) return; let n = 5; TM.auto = 1; const el = $('#tm-main'); el._h = null; el.classList.add('count');
    NV.toast('Auto-scan armed. Point the scanner at something intriguing, Sir.', 2500);
    if (!NV.cam.active()) NV.cam.start();
    const step = () => {
      if (n > 0) { el.textContent = n; NV.text('#tm-sub', 'AUTO-SCAN IN'); NV.setRing($('#tm-ring'), n / 5); NV.setRing($('#tm-ring2'), 1); NV.audio.blip(); NV.haptic(20); n--; setTimeout(step, 1000); }
      else { TM.auto = 0; el.classList.remove('count'); NV.showTab('scan'); setTimeout(() => NV.cam.scan(), 350); }
    };
    step();
  };
  TM.init = () => { NV.buildTicks($('#tm-ticks')); $('#tm-start').onclick = TM.toggle; $('#tm-mark').onclick = TM.mark; $('#tm-reset').onclick = TM.reset; $('#tm-auto').onclick = TM.autoScan; ui(); };
})();
