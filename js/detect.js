/* NICK-VERSE Scanner: sensor tools. Metal detector (Magnetometer / compass-drift estimate / simulation),
   Seismograph (accelerometer trace, CINCO-Richter), Pulse estimator (fingertip PPG, entertainment only),
   Perimeter Guard (motion + camera alarm with hold-to-disarm). */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, SN = NV.sensors, TAU = Math.PI * 2, G = 9.80665;
  const txt = (...a) => NV.draw.txt(...a);
  const mods = (NV.mods = NV.mods || {});
  const J = NV.jarvis.lines;
  Object.assign(J, {
    guardArm: ['Perimeter armed, Sir. Nobody touches the scanner on my watch.', 'Guard active. I shall be watching with unblinking suspicion.', 'Armed. Any movement will be treated as a personal insult.'],
    guardTrip: ['Intruder alert! Someone has laid a finger on the scanner. I have their fingerprints. Metaphorically.', 'Perimeter breach, Sir! Unhand the device, whoever you are.', 'Alarm! The scanner has been moved. I am shocked, appalled and slightly thrilled.'],
    guardOff: ['Guard disarmed. Standing down from maximum suspicion.', 'Disarmed, Sir. I shall pretend that was a drill.'],
    metal: ['Metal detected, Sir. Either treasure, or a spoon. Statistically, a spoon.', 'Strong magnetic signature. Do be careful near the fridge magnets.'],
    quake: ['That registered on the CINCO-Richter scale, Sir. The biscuits are safe.', 'Seismic event confirmed. I suspect a foot.'],
    pulse: ['Pulse estimated, Sir. For entertainment only, but it does suggest you are alive. Splendid news.', 'Reading complete. Your heart appears to be doing heart things. Please consult an actual doctor for actual facts.']
  });

  // =================== METAL DETECTOR ===================
  const MD = (mods.metal = { src: 'none', raw: 48, field: 48, base: null, strength: 0, trace: new Array(200).fill(0), snd: true, sens: 6, sim: { tx: 0.7, ty: 0.3, px: 0.5, py: 0.5, found: 0, strongT: 0 }, sensor: null });
  let lastBeep = 0, prevHead = null, prevHT = 0, drift = 0, lastAward = 0;
  const FINDS = ['a CINCO commemorative coin (worth exactly nothing)', 'three pence and a button', 'the lost left sock, somehow magnetic', 'a spoon. Of course it is a spoon.', 'a very small anvil', 'the key to the biscuit tin', 'a fridge magnet shaped like a fridge'];
  function setDetSrc(src) {
    MD.src = src; const b = $('#det-badge');
    const L = { magnetometer: ['MAGNETOMETER', 'live', 'Source: Magnetometer (Generic Sensor API), µT'], drift: ['COMPASS ESTIMATE', 'warn', 'Source: compass-drift estimate (no raw magnetometer). Relative only.'], sim: ['SIMULATED', 'warn', 'Source: SIMULATION. Move the pointer (or tilt) around this panel to hunt the hidden object.'] }[src];
    b.textContent = L[0]; b.className = 'badge ' + L[1]; NV.text('#det-src', L[2]);
    $('#det-new').hidden = src !== 'sim';
    NV.text('#det-hint', src === 'sim' ? 'Simulation mode: somewhere in this panel a CINCO coin is hidden. Follow the beeps. On phones with a magnetometer, the real sensor is used.' : 'Wave the top of the phone slowly near metal. Phones use a magnetometer, so steel and magnets register and gold barely does.');
  }
  function newTarget() { MD.sim.tx = 0.15 + Math.random() * 0.7; MD.sim.ty = 0.15 + Math.random() * 0.7; MD.sim.found = 0; MD.sim.strongT = 0; $('#det-find').hidden = true; }
  async function startMag() {
    if (NV.settings.forcesim) return setDetSrc('sim');
    if ('Magnetometer' in window) {
      try {
        if (navigator.permissions && navigator.permissions.query) { try { const p = await navigator.permissions.query({ name: 'magnetometer' }); if (p.state === 'denied') throw new Error('denied'); } catch (e) { if (e.message === 'denied') throw e; } }
        const m = new window.Magnetometer({ frequency: 30 });
        m.addEventListener('reading', () => { if (m.x == null) return; MD.raw = Math.hypot(m.x, m.y, m.z); if (MD.src !== 'magnetometer') setDetSrc('magnetometer'); });
        m.addEventListener('error', () => { try { m.stop(); } catch (e) { /* ignore */ } MD.sensor = null; fallbackSrc(); });
        m.start(); MD.sensor = m; setDetSrc('magnetometer'); return;
      } catch (e) { MD.sensor = null; }
    }
    fallbackSrc();
  }
  function fallbackSrc() { setDetSrc(SN.orientMode === 'live' && SN.headingSrc === 'magnetic' && SN.motionMode === 'live' ? 'drift' : 'sim'); }
  MD.enter = () => { MD.base = null; startMag(); };
  MD.leave = () => { if (MD.sensor) { try { MD.sensor.stop(); } catch (e) { /* ignore */ } MD.sensor = null; } };
  MD.frame = (t, dt) => {
    const k = Math.min(dt || 16, 60) / 1000;
    if (MD.src === 'magnetometer') MD.field = NV.lerp(MD.field, MD.raw, 0.3);
    else if (MD.src === 'drift') { // heading change not explained by gyro rotation suggests magnetic disturbance
      const h = SN.heading; if (prevHead != null && t - prevHT > 0) { const dh = ((h - prevHead + 540) % 360 - 180) / ((t - prevHT) / 1000), gyro = SN.rot.a || 0; drift = NV.lerp(drift, Math.abs(Math.abs(dh) - Math.abs(gyro)), 0.1); } prevHead = h; prevHT = t; MD.field = NV.lerp(MD.field, 47 + NV.clamp(drift, 0, 300) * 0.6, 0.2);
    } else { // simulation: inverse-square-ish field around a hidden target
      const s = MD.sim; if (SN.orientMode === 'live' || MD.tilt) { s.px = NV.clamp(0.5 + SN.ori.gamma / 50, 0, 1); s.py = NV.clamp(0.5 + (SN.ori.beta - 40) / 50, 0, 1); }
      const d = Math.hypot(s.px - s.tx, s.py - s.ty), f = 47 + (Math.random() - 0.5) * 1.6 + 260 / (1 + Math.pow(d / 0.07, 2)) + 3 * Math.sin(t / 900);
      MD.field = NV.lerp(MD.field, f, 0.25);
    }
    if (MD.base == null && MD.field) MD.base = MD.src === 'sim' ? 47 : MD.field;
    const delta = MD.field - (MD.base || 47), strength = NV.clamp(Math.abs(delta) * (MD.sens / 6) / 110, 0, 1);
    MD.strength = NV.lerp(MD.strength, strength, 0.3);
    MD.trace.push(delta); MD.trace.shift();
    // beeps: faster and higher with strength
    const s = MD.strength, gap = s < 0.04 ? 1600 : NV.lerp(820, 65, Math.pow(s, 0.8));
    if (MD.snd && t - lastBeep > gap) { lastBeep = t; NV.audio.detect(s); if (s > 0.75) NV.haptic(12); }
    if (MD.src === 'sim') { const sim = MD.sim; if (s > 0.85) { sim.strongT += k; if (sim.strongT > 1.1 && !sim.found) { sim.found = 1; const what = NV.pick(FINDS); const el = $('#det-find'); el.hidden = false; el.innerHTML = `<b>★ FOUND:</b> ${NV.esc(what)}`; NV.audio.cash(); NV.fx.confetti(60); NV.award('metal'); NV.jarvis.speak(`Discovery, Sir. You have unearthed ${what}.`, { tag: 'MAG' }); } } else sim.strongT = Math.max(0, sim.strongT - k); }
    else if (s > 0.85 && t - lastAward > 20000) { lastAward = t; NV.award('metal'); NV.jarvis.auto('metal', 15000); }
    // draw
    const S = MD.sens;
    NV.arcGauge($('#det-gauge'), { value: s * 100, min: 0, max: 100, label: 'SIGNAL', big: Math.round(MD.field) + ' µT', sub: s > 0.75 ? 'STRONG CONTACT' : s > 0.35 ? 'SOMETHING NEARBY' : s > 0.1 ? 'FAINT' : 'SEARCHING', ticks: 5, zones: [[0, 35, '#57ffa8'], [35, 75, '#ffb547'], [75, 100, '#ff4d5e']] }); void S;
    const f = NV.fit($('#det-trace'));
    if (f) {
      const { x, w, h } = f, c = NV.colors; x.clearRect(0, 0, w, h);
      x.strokeStyle = NV.rgba(c.primary, 0.08); x.beginPath(); for (let i = 1; i < 8; i++) { const gx = Math.round(w * i / 8) + 0.5; x.moveTo(gx, 0); x.lineTo(gx, h); } x.stroke();
      x.strokeStyle = NV.rgba(c.primary, 0.3); x.beginPath(); x.moveTo(0, h / 2 + 0.5); x.lineTo(w, h / 2 + 0.5); x.stroke();
      const pts = MD.trace.map((v, i) => [i / (MD.trace.length - 1) * w, h / 2 - NV.clamp(v / 100, -1, 1) * (h / 2 - 5)]);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff4d5e'); g.addColorStop(0.35, c.tertiary); g.addColorStop(0.5, c.primary); g.addColorStop(0.65, c.tertiary); g.addColorStop(1, '#ff4d5e');
      x.globalAlpha = 0.12; x.fillStyle = g; x.beginPath(); x.moveTo(0, h / 2); pts.forEach(([px, py]) => x.lineTo(px, py)); x.lineTo(w, h / 2); x.fill(); x.globalAlpha = 1;
      NV.draw.glowLine(x, pts, g, 2, 10);
    }
    if (!MD._rt || t - MD._rt > 100) {
      MD._rt = t; NV.text('#det-ut', MD.field.toFixed(1) + ' µT'); NV.text('#det-delta', (delta >= 0 ? '+' : '') + delta.toFixed(1) + ' µT');
      const lit = Math.round(s * 12); NV.$$('#det-bars i').forEach((b, i) => b.classList.toggle('on', i < lit));
    }
  };
  MD.primary = () => $('#det-cal').click();
  function initMetal() {
    $('#det-bars').innerHTML = new Array(12).fill('<i></i>').join('');
    $('#det-cal').onclick = () => { MD.base = MD.field; NV.audio.confirm(); NV.toast('Baseline set to ' + MD.field.toFixed(1) + ' µT. Now wave it about, Sir.', 2200); };
    $('#det-snd').onclick = () => { MD.snd = !MD.snd; $('#det-snd').setAttribute('aria-pressed', MD.snd); NV.audio.click(MD.snd ? 1.2 : 0.8); };
    $('#det-sens').oninput = (e) => { MD.sens = +e.target.value; };
    $('#det-new').onclick = () => { newTarget(); NV.audio.whoosh(); NV.toast('A new object has been hidden. Happy hunting, Sir.', 2000); };
    const panel = document.querySelector('[data-mod="metal"]');
    panel.addEventListener('pointermove', (e) => { if (MD.src !== 'sim' || SN.orientMode === 'live') return; const r = panel.getBoundingClientRect(); MD.sim.px = (e.clientX - r.left) / r.width; MD.sim.py = (e.clientY - r.top) / r.height; }, { passive: true });
    newTarget();
  }

  // =================== SEISMOGRAPH ===================
  const JOKES = ['Dead calm · a mime tiptoeing', 'Butterfly sneeze', 'Cat landed (gracefully)', 'Spoon dropped two rooms away', 'Toddler stampede', 'Washing machine on spin', 'Nick jumped off the sofa', 'The sofa jumped off Nick', 'Moderate kaiju (small)', 'Someone opened the biscuit tin', 'Off the scale · CINCO warranty void'];
  const SE = (mods.seismo = { N: 720, buf: new Float32Array(720), idx: 0, peak: 0, mag: 0, maxMag: 0, events: NV.store.get('quakes', []), gain: 5, stomps: [], lastEv: 0, win: [] });
  const magOf = (a) => NV.clamp(3.2 * Math.log10(Math.max(a, 1e-4) * (SE.gain / 5) / (SN.motionMode === 'live' ? 0.05 : 0.2)), 0, 10);
  function renderQuakes() { $('#seis-events').innerHTML = SE.events.length ? SE.events.slice(0, 8).map((e) => `<li><span>${NV.esc(JOKES[Math.min(10, Math.floor(e.m))])}</span><span class="mono">${new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span class="risk r${e.m >= 7 ? 3 : e.m >= 5 ? 2 : e.m >= 3 ? 1 : 0}">M${e.m.toFixed(1)}</span></li>`).join('') : '<li class="li-empty"><span>No events yet. Tap the table, Sir.</span></li>'; }
  SE.frame = (t) => {
    // sample: magnitude deviation from 1 g (m/s²), plus injected stomps
    let v = Math.hypot(SN.acc.x, SN.acc.y, SN.acc.z) - G;
    SE.stomps = SE.stomps.filter((s) => t - s.t < 2500); SE.stomps.forEach((s) => { const dt = (t - s.t) / 1000; v += s.a * Math.exp(-dt / 0.45) * Math.sin(TAU * 11 * dt) + s.a * 0.4 * Math.exp(-dt / 0.9) * Math.sin(TAU * 4.3 * dt); });
    SE.buf[SE.idx] = v; SE.idx = (SE.idx + 1) % SE.N;
    SE.win.push([t, Math.abs(v)]); while (SE.win.length && t - SE.win[0][0] > 1500) SE.win.shift();
    const peak = SE.win.reduce((m, p) => Math.max(m, p[1]), 0); SE.peak = peak; SE.mag = NV.lerp(SE.mag, magOf(peak), 0.2); SE.maxMag = Math.max(SE.maxMag * 0.9995, SE.mag);
    if (SE.mag >= 3 && t - SE.lastEv > 1800) {
      SE.lastEv = t; setTimeout(() => { const m = SE.maxMag; SE.events.unshift({ t: Date.now(), m }); SE.events = SE.events.slice(0, 20); NV.store.set('quakes', SE.events); renderQuakes(); if (m >= 6) { NV.award('quake'); NV.jarvis.auto('quake', 12000); } NV.audio.rumble(Math.min(1, m / 8)); SE.maxMag = 0; }, 900);
    }
    const f = NV.fit($('#seis-cv')); if (!f) return; const { x, w, h } = f, c = NV.colors;
    // drum paper
    const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, 'rgba(0,0,0,.55)'); bg.addColorStop(0.12, NV.rgba(c.bg1, 0.55)); bg.addColorStop(0.5, NV.rgba(c.primary, 0.08)); bg.addColorStop(0.88, NV.rgba(c.bg1, 0.55)); bg.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    const pen = w - 34, scroll = (t / 1000 * 60) % 30;
    x.lineWidth = 1; x.strokeStyle = NV.rgba(c.primary, 0.1); x.beginPath();
    for (let gx = pen - scroll; gx > 0; gx -= 30) { x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, h); }
    for (let i = 1; i < 8; i++) { const gy = Math.round(h * i / 8) + 0.5; x.moveTo(0, gy); x.lineTo(pen, gy); } x.stroke();
    x.strokeStyle = NV.rgba(c.primary, 0.3); x.beginPath(); x.moveTo(0, h / 2 + 0.5); x.lineTo(pen, h / 2 + 0.5); x.stroke();
    const scale = (h / 2 - 8) / (0.6 / (SE.gain / 5));
    const pts = [], n = Math.min(SE.N, Math.floor(pen));
    for (let i = 0; i < n; i++) { const v2 = SE.buf[(SE.idx - 1 - i + SE.N * 2) % SE.N], y = h / 2 - NV.clamp(v2 * scale, -(h / 2 - 3), h / 2 - 3); pts.push([pen - i, y]); }
    x.save(); x.beginPath(); x.rect(0, 0, pen, h); x.clip();
    NV.draw.glowLine(x, pts, c.secondary, 1.3, 4);
    x.restore();
    // pen arm + stylus
    const py = pts.length ? pts[0][1] : h / 2;
    x.strokeStyle = NV.rgba(c.secondary, 0.7); x.lineWidth = 2; x.beginPath(); x.moveTo(w - 4, h / 2); x.lineTo(pen, py); x.stroke();
    x.fillStyle = c.tertiary; x.shadowColor = c.tertiary; x.shadowBlur = 12; x.beginPath(); x.arc(pen, py, 3.5, 0, TAU); x.fill(); x.shadowBlur = 0;
    x.fillStyle = NV.rgba(c.primary, 0.6); x.fillRect(w - 8, h / 2 - 16, 6, 32);
    // magnitude column
    const mh = (h - 20) * SE.mag / 10; const mg = x.createLinearGradient(0, h - 10, 0, 10); mg.addColorStop(0, '#57ffa8'); mg.addColorStop(0.5, c.tertiary); mg.addColorStop(1, '#ff4d5e');
    x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(6, 10, 6, h - 20); x.fillStyle = mg; x.fillRect(6, h - 10 - mh, 6, mh);
    txt(x, 'M' + SE.mag.toFixed(1), 18, 16, '#fff', 11); txt(x, SN.motionMode === 'live' ? 'LIVE ACCELEROMETER' : 'SIMULATED · TRY STOMP', 18, h - 12, NV.rgba(c.tertiary, 0.85), 9.5);
    if (!SE._rt || t - SE._rt > 120) {
      SE._rt = t; NV.text('#seis-mag', SE.mag.toFixed(1)); NV.text('#seis-label', JOKES[Math.min(10, Math.floor(SE.mag))]); NV.text('#seis-sub', `peak ${SE.maxMag.toFixed(1)} · live ${Math.abs(v).toFixed(2)} m/s²`);
      const b = $('#seis-badge'); const st = SN.motionMode === 'live' ? (SE.mag >= 5 ? 'QUAKE!' : 'LIVE') : 'SIMULATED'; if (b.textContent !== st) { b.textContent = st; b.className = 'badge ' + (st === 'LIVE' ? 'live' : st === 'QUAKE!' ? 'bad' : 'warn'); }
    }
  };
  SE.stomp = (a = 4 + Math.random() * 26) => { SE.stomps.push({ t: performance.now(), a }); NV.audio.rumble(Math.min(1, a / 8)); };
  SE.primary = () => SE.stomp();
  function initSeismo() {
    $('#seis-gain').oninput = (e) => { SE.gain = +e.target.value; };
    $('#seis-stomp').onclick = () => SE.stomp();
    $('#seis-reset').onclick = () => { SE.events = []; NV.store.set('quakes', []); SE.maxMag = 0; renderQuakes(); NV.audio.click(0.8); };
    renderQuakes();
  }

  // =================== PULSE ESTIMATOR (entertainment only) ===================
  const HR = (mods.heart = { on: false, demo: false, s: [], beats: [], bpm: null, q: 0, finger: false, t0: 0, done: false, ph: 0 });
  let hrSmall, hrCtx, lastBeatT = 0;
  function hrBadge(t, cls) { const b = $('#hr-badge'); b.textContent = t; b.className = 'badge' + (cls ? ' ' + cls : ''); }
  async function hrStart(demo) {
    HR.s = []; HR.beats = []; HR.bpm = null; HR.q = 0; HR.done = false; HR.t0 = performance.now(); HR.demo = demo; HR.on = true; HR.ph = 0;
    NV.text('#hr-start', 'Stop'); NV.text('#hr-bpm', '--');
    if (demo) { hrBadge('DEMO SIGNAL', 'warn'); NV.text('#hr-state', 'Demo mode: a simulated pulse, clearly not yours.'); return; }
    hrBadge('STARTING…', 'warn'); NV.text('#hr-state', 'Engaging the rear camera and torch…');
    if (!NV.cam.live || NV.cam.facing !== 'environment') await NV.cam.start('environment');
    const torch = NV.cam.live ? await NV.cam.setTorch(true) : false;
    if (!HR.on) return;
    if (!NV.cam.active()) { hrBadge('NO CAMERA', 'bad'); NV.text('#hr-state', 'No camera available. Try the demo signal instead.'); return; }
    hrBadge(NV.cam.sim ? 'SIM FEED' : torch ? 'TORCH ON' : 'NO TORCH', torch ? 'live' : 'warn');
    NV.text('#hr-state', torch ? 'Cover the camera and torch completely with a fingertip. Press lightly and keep still.' : 'No torch access on this device. Cover the camera and use a bright light behind your finger.');
  }
  function hrStop() { if (!HR.on) return; HR.on = false; if (!HR.demo && NV.cam.live) NV.cam.setTorch(false); NV.text('#hr-start', 'Start'); hrBadge(HR.bpm ? 'RESULT' : 'IDLE', HR.bpm ? 'live' : ''); }
  HR.leave = hrStop;
  HR.primary = () => (HR.on ? hrStop() : hrStart(false));
  function median(a) { const s = a.slice().sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  HR.frame = (t, dt) => {
    const c = NV.colors; let r = 0, g = 0, b = 0;
    if (HR.on) {
      if (HR.demo) { const bpm = 71 + 3 * Math.sin(t / 7000); HR.ph += (dt || 16) / 1000 * bpm / 60; const p = HR.ph % 1; const wave = Math.exp(-Math.pow((p - 0.15) / 0.07, 2)) + 0.45 * Math.exp(-Math.pow((p - 0.42) / 0.1, 2)); r = 190 - wave * 5 + (Math.random() - 0.5) * 0.6 + Math.sin(t / 3000) * 2; g = 20; b = 25; HR.finger = true; }
      else if (NV.cam.drawFeed(hrCtx, 24, 24, 1)) { const d = hrCtx.getImageData(6, 6, 12, 12).data; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; r /= n; g /= n; b /= n; HR.finger = r > 80 && r > g * 1.7 && r > b * 1.7; }
      HR.s.push({ t, v: r }); while (HR.s.length && t - HR.s[0].t > 12000) HR.s.shift();
    }
    // signal processing: detrend (1.2 s mean), smooth, invert (more blood = darker), detect peaks
    const S = HR.s, n = S.length, proc = new Array(n);
    if (n > 10) {
      let j0 = 0, sum = 0; for (let i = 0; i < n; i++) { sum += S[i].v; while (S[i].t - S[j0].t > 1200) { sum -= S[j0].v; j0++; } proc[i] = -(S[i].v - sum / (i - j0 + 1)); }
      for (let i = n - 1; i >= 2; i--) proc[i] = (proc[i] + proc[i - 1] + proc[i - 2]) / 3;
      if (HR.on && HR.finger && n > 20) {
        const recent = proc.slice(Math.max(0, n - 90)), amp = Math.max(...recent) - Math.min(...recent), i = n - 6;
        if (i > 6 && amp > 0.05) { const v = proc[i]; let isMax = true; for (let k = i - 6; k <= i + 5; k++) if (k !== i && proc[k] > v) { isMax = false; break; }
          if (isMax && v > Math.min(...recent) + amp * 0.55 && S[i].t - lastBeatT > 330) { lastBeatT = S[i].t; HR.beats.push(S[i].t); if (HR.beats.length > 16) HR.beats.shift(); const el = $('#hr-heart'); el.classList.remove('beat'); void el.getBoundingClientRect(); el.classList.add('beat'); if (NV.settings.uisound) NV.audio.thump(); } }
        const iv = []; for (let k = 1; k < HR.beats.length; k++) { const d = HR.beats[k] - HR.beats[k - 1]; if (d > 330 && d < 1500) iv.push(d); }
        if (iv.length >= 4) { const med = median(iv.slice(-10)), mean = iv.reduce((a, b2) => a + b2, 0) / iv.length, sd = Math.sqrt(iv.reduce((a, b2) => a + (b2 - mean) * (b2 - mean), 0) / iv.length); HR.bpm = NV.lerp(HR.bpm || 60000 / med, 60000 / med, 0.3); HR.q = NV.clamp(1 - (sd / mean) * 3, 0, 1); }
      }
    }
    if (HR.on && !HR.done && HR.bpm && HR.q > 0.55 && t - HR.t0 > 15000) { HR.done = true; NV.award('pulse'); NV.jarvis.speak(`${Math.round(HR.bpm)} beats per minute, give or take. ${NV.pick(J.pulse)}`, { tag: 'PULSE' }); NV.log.add({ type: 'note', title: `Pulse ~${Math.round(HR.bpm)} BPM (entertainment)`, detail: `Estimated ${Math.round(HR.bpm)} BPM, signal quality ${Math.round(HR.q * 100)}%${HR.demo ? ' (demo signal)' : ''}. Not a medical measurement.`, color: '#ff4d5e' }); }
    // finger preview
    const fp = NV.fit($('#hr-finger'));
    if (fp) { const { x, w, h } = fp; x.clearRect(0, 0, w, h); x.save(); x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) / 2 - 2, 0, TAU); x.clip();
      if (HR.on && HR.demo) { const k = 0.85 + 0.15 * Math.sin(HR.ph * TAU); const gg = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gg.addColorStop(0, `rgba(255,${Math.round(90 * k)},${Math.round(70 * k)},1)`); gg.addColorStop(1, '#5a0008'); x.fillStyle = gg; x.fillRect(0, 0, w, h); }
      else if (HR.on && NV.cam.drawFeed(x, w, h, 2)) { /* live preview */ } else { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, h); x.strokeStyle = NV.rgba(c.primary, 0.35); x.lineWidth = 1.4; for (let i = 1; i <= 7; i++) { x.beginPath(); x.ellipse(w / 2, h * 0.58, i * w * 0.055, i * h * 0.07, 0, Math.PI * (1.08 + i * 0.01), Math.PI * (1.92 - i * 0.01)); x.stroke(); } txt(x, 'PLACE FINGER', w / 2, h * 0.72, NV.rgba(c.secondary, 0.7), 9.5, 'center'); }
      x.restore(); x.strokeStyle = HR.finger && HR.on ? '#ff4d5e' : NV.rgba(c.primary, 0.6); x.lineWidth = 2; x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) / 2 - 2, 0, TAU); x.stroke(); }
    // waveform
    const f = NV.fit($('#hr-wave'));
    if (f) {
      const { x, w, h } = f; x.clearRect(0, 0, w, h);
      x.strokeStyle = NV.rgba('#ff4d5e', 0.1); x.lineWidth = 1; x.beginPath(); for (let i = 1; i < 12; i++) { const gx = Math.round(w * i / 12) + 0.5; x.moveTo(gx, 0); x.lineTo(gx, h); } for (let i = 1; i < 4; i++) { const gy = Math.round(h * i / 4) + 0.5; x.moveTo(0, gy); x.lineTo(w, gy); } x.stroke();
      if (n > 10) {
        const span = 6000, tEnd = S[n - 1].t, vis = []; for (let i = 0; i < n; i++) if (tEnd - S[i].t < span && proc[i] != null) vis.push([w - (tEnd - S[i].t) / span * w, proc[i]]);
        const mx = Math.max(0.3, ...vis.map((p) => Math.abs(p[1]))); const pts = vis.map(([px, v]) => [px, h / 2 - v / mx * (h / 2 - 6)]);
        if (pts.length > 1) NV.draw.glowLine(x, pts, '#ff5e6e', 2, 12);
        x.fillStyle = '#fff'; HR.beats.forEach((bt) => { const px = w - (tEnd - bt) / span * w; if (px > 0) { x.globalAlpha = 0.6; x.fillRect(px, 4, 1.5, h - 8); x.globalAlpha = 1; } });
      } else txt(x, HR.on ? 'ACQUIRING SIGNAL…' : 'PRESS START OR DEMO', w / 2, h / 2, NV.rgba(c.secondary, 0.6), 11, 'center');
    }
    if (!HR._rt || t - HR._rt > 200) {
      HR._rt = t; const el = t - HR.t0;
      NV.text('#hr-bpm', HR.bpm ? String(Math.round(HR.bpm)) : '--'); $('#hr-q').style.width = Math.round(HR.q * 100) + '%'; NV.text('#hr-qk', 'Signal quality ' + Math.round(HR.q * 100) + '%');
      NV.text('#hr-time', HR.on ? `${Math.floor(el / 1000)}s · ${HR.demo ? 'DEMO' : HR.finger ? 'FINGER DETECTED' : 'NO FINGER'}` : '--');
      NV.text('#hr-finger-k', HR.on ? (HR.finger ? 'SIGNAL' : 'NO FINGER') : 'NO SIGNAL');
      if (HR.on && !HR.demo) NV.text('#hr-state', !HR.finger ? 'I cannot see a fingertip, Sir. Cover the lens and torch completely.' : HR.bpm ? (HR.done ? `Estimate: ${Math.round(HR.bpm)} BPM. Entertainment only.` : 'Hold still… refining the estimate.') : 'Fingertip detected. Hold still for about 15 seconds.');
      if (HR.on && HR.demo && HR.bpm) NV.text('#hr-state', HR.done ? `Demo estimate: ${Math.round(HR.bpm)} BPM (simulated).` : 'Demo mode: detecting simulated beats…');
    }
  };
  function initHeart() {
    hrSmall = document.createElement('canvas'); hrSmall.width = hrSmall.height = 24; hrCtx = hrSmall.getContext('2d', { willReadFrequently: true });
    $('#hr-start').onclick = () => (HR.on ? hrStop() : hrStart(false));
    $('#hr-demo').onclick = () => { if (HR.on) hrStop(); hrStart(true); NV.audio.click(1.1); };
  }

  // =================== PERIMETER GUARD ===================
  const GD = (NV.guard = mods.guard = { state: 'off', usecam: false, sens: 6, m: 0, cm: 0, events: NV.store.get('guardEvents', []), t0: 0, base: null, count: 0 });
  let gSmall, gCtx, gPrev = null, gN = 0, armTimer = null, alarmHaptic = null;
  function gSet(state) {
    GD.state = state; const b = $('#guard-badge'), st = $('#guard-state');
    const L = { off: ['DISARMED', '', 'DISARMED', 'Arm the guard, put the phone down and step away. If it moves, or the camera sees motion, I shall make a scene.'], arming: ['ARMING', 'warn', 'ARMING…', 'Put the device down and step away. Arming in a moment.'], armed: ['ARMED', 'live', 'ARMED', 'Perimeter secure. Any movement will trigger the alarm. Hold the disarm button to stand down.'], alarm: ['BREACH!', 'bad', 'BREACH', 'Intruder detected. Hold to disarm.'] }[state];
    b.textContent = L[0]; b.className = 'badge ' + L[1]; st.textContent = L[2]; st.dataset.state = state; NV.text('#guard-desc', L[3]);
    $('#guard-arm').hidden = state !== 'off'; $('#guard-hold').hidden = state === 'off';
    document.body.classList.toggle('guard-armed', state === 'armed' || state === 'arming');
    NV.emit('guard', state);
  }
  function gLog(src) { GD.events.unshift({ t: Date.now(), src }); GD.events = GD.events.slice(0, 12); NV.store.set('guardEvents', GD.events); renderGuardEvents(); }
  function renderGuardEvents() { $('#guard-events').innerHTML = GD.events.length ? GD.events.slice(0, 6).map((e) => `<li><span>${e.src === 'armed' ? 'Perimeter armed' : e.src === 'disarmed' ? 'Disarmed' : 'Breach detected'}</span><span class="mono">${new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span class="risk r${e.src === 'armed' ? 1 : e.src === 'disarmed' ? 0 : 3}">${e.src.toUpperCase()}</span></li>`).join('') : '<li class="li-empty"><span>No events logged. Peaceful, isn\u2019t it?</span></li>'; }
  GD.arm = () => {
    if (GD.state !== 'off') return; clearInterval(armTimer); let n = 5; GD.count = n; gSet('arming'); NV.audio.arming(); NV.haptic(20);
    if (GD.usecam && !NV.cam.live) NV.cam.start();
    armTimer = setInterval(() => { n--; GD.count = n; if (n > 0) { NV.audio.arming(); return; } clearInterval(armTimer); GD.base = { b: SN.ori.beta, g: SN.ori.gamma }; gPrev = null; GD.t0 = performance.now(); gSet('armed'); NV.audio.arming(true); NV.wake('guard', true); NV.jarvis.say('guardArm'); gLog('armed'); NV.award('guard-arm'); }, 1000);
  };
  function trigger(src) {
    if (GD.state !== 'armed') return; gSet('alarm');
    const ov = $('#guard-alarm'); ov.classList.add('open'); ov.setAttribute('aria-hidden', 'false'); NV.text('#ga-src', 'Source: ' + (src === 'camera' ? 'camera motion' : 'device movement') + ' · ' + new Date().toLocaleTimeString());
    NV.audio.startLoop('guard', 'guard'); NV.haptic([500, 150, 500, 150, 500]); clearInterval(alarmHaptic); alarmHaptic = setInterval(() => NV.haptic([400, 200, 400]), 1600);
    NV.jarvis.speak(NV.pick(J.guardTrip), { tag: 'GUARD' }); gLog(src); NV.award('guard-trip');
    setTimeout(() => { try { $('#ga-hold').focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 100);
  }
  GD.disarm = () => {
    clearInterval(armTimer); clearInterval(alarmHaptic); const wasAlarm = GD.state === 'alarm', wasOn = GD.state !== 'off';
    NV.audio.stopLoop('guard'); NV.haptic(0); NV.wake('guard', false);
    const ov = $('#guard-alarm'); ov.classList.remove('open'); ov.setAttribute('aria-hidden', 'true');
    gSet('off'); GD.m = GD.cm = 0;
    if (wasOn) { NV.audio.powerDown(); if (wasAlarm) NV.jarvis.say('guardOff'); else NV.jarvis.log('Perimeter guard disarmed.', 'GUARD'); gLog('disarmed'); }
  };
  // background service: runs every frame while armed, whichever tool is showing
  NV.on('tick', ({ now }) => {
    if (GD.state !== 'armed') { GD.m = NV.lerp(GD.m, 0, 0.1); return; }
    const grace = now - GD.t0 < 900, sens = GD.sens;
    const thrA = 3.4 - sens * 0.27, lin = SN.linMag / thrA;
    let ori = 0; if (SN.orientMode === 'live' && GD.base) { ori = Math.hypot(SN.ori.beta - GD.base.b, SN.ori.gamma - GD.base.g) / (13 - sens); GD.base.b = NV.lerp(GD.base.b, SN.ori.beta, 0.0005); GD.base.g = NV.lerp(GD.base.g, SN.ori.gamma, 0.0005); }
    GD.m = Math.max(lin, ori, GD.m * 0.9);
    if (GD.usecam && NV.cam.live && gN++ % 3 === 0 && NV.cam.drawFeed(gCtx, 48, 36)) {
      const d = gCtx.getImageData(0, 0, 48, 36).data, n = 48 * 36, cur = new Float32Array(n); let changed = 0;
      for (let i = 0, j = 0; j < n; i += 4, j++) { cur[j] = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; if (gPrev && Math.abs(cur[j] - gPrev[j]) > 22) changed++; }
      gPrev = cur; GD.cm = NV.lerp(GD.cm, changed / n / (0.13 - sens * 0.01), 0.5);
    } else if (!GD.usecam || !NV.cam.live) GD.cm = 0;
    if (!grace && GD.m > 1) trigger('motion'); else if (!grace && GD.cm > 1) trigger('camera');
  });
  function bindHold(btn, ms, done) {
    let start = 0, raf = 0; const fg = btn.querySelector('.hb-fg');
    const set = (p) => { fg.style.strokeDasharray = `${p * 100} 100`; btn.style.setProperty('--p', p); };
    const step = () => { const p = NV.clamp((performance.now() - start) / ms, 0, 1); set(p); if (p >= 1) { stop(false); NV.audio.confirm(); NV.haptic(60); done(); return; } if (Math.floor(p * 10) !== Math.floor(((performance.now() - 16 - start) / ms) * 10)) NV.audio.tick(1 + p); raf = requestAnimationFrame(step); };
    const begin = (e) => { if (start) return; if (e && e.preventDefault) e.preventDefault(); start = performance.now(); btn.classList.add('holding'); raf = requestAnimationFrame(step); NV.haptic(15); };
    const stop = (cancel = true) => { if (!start) return; cancelAnimationFrame(raf); const p = (performance.now() - start) / ms; start = 0; btn.classList.remove('holding'); set(0); if (cancel && p < 1) { NV.audio.deny(); NV.toast('Keep holding for 1.5 seconds to disarm, Sir.', 1500); } };
    btn.addEventListener('pointerdown', (e) => { btn.setPointerCapture && btn.setPointerCapture(e.pointerId); begin(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, () => stop(true)));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.stopPropagation(); begin(e); } });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); stop(true); } });
    btn.addEventListener('click', (e) => e.preventDefault());
  }
  GD.frame = (t) => {
    const f = NV.fit($('#guard-cv')); if (!f) return; const { x, w, h } = f, c = NV.colors, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8, ts = t / 1000;
    const col = GD.state === 'alarm' ? '#ff2a3d' : GD.state === 'armed' ? '#57ffa8' : GD.state === 'arming' ? c.tertiary : c.primary;
    x.clearRect(0, 0, w, h);
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, NV.rgba(col, GD.state === 'alarm' ? 0.2 + 0.2 * Math.abs(Math.sin(ts * 6)) : 0.16)); bg.addColorStop(1, 'rgba(0,0,0,.3)'); x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    for (let i = 1; i <= 4; i++) { x.strokeStyle = NV.rgba(col, i === 4 ? 0.7 : 0.18); x.lineWidth = i === 4 ? 2 : 1; x.beginPath(); x.arc(cx, cy, R * i / 4, 0, TAU); x.stroke(); }
    if (GD.state === 'armed' || GD.state === 'alarm') { const sa = ts * (GD.state === 'alarm' ? 6 : 1.6); if (x.createConicGradient) { const g = x.createConicGradient(sa - 1, cx, cy); g.addColorStop(0, NV.rgba(col, 0)); g.addColorStop(1 / TAU, NV.rgba(col, 0.4)); g.addColorStop(1 / TAU + 0.001, NV.rgba(col, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, sa - 1, sa); x.closePath(); x.fill(); } }
    // motion ring
    const lv = NV.clamp(Math.max(GD.m, GD.cm), 0, 1.2); x.strokeStyle = lv > 0.7 ? '#ff4d5e' : col; x.lineWidth = 5; x.lineCap = 'round'; x.shadowColor = x.strokeStyle; x.shadowBlur = 12; x.beginPath(); x.arc(cx, cy, R * 0.86, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, lv)); x.stroke(); x.shadowBlur = 0; x.lineCap = 'butt';
    // shield
    const sR = R * 0.38; x.save(); x.translate(cx, cy); x.beginPath(); x.moveTo(0, -sR); x.lineTo(sR * 0.85, -sR * 0.62); x.lineTo(sR * 0.85, sR * 0.05); x.quadraticCurveTo(sR * 0.75, sR * 0.72, 0, sR * 1.02); x.quadraticCurveTo(-sR * 0.75, sR * 0.72, -sR * 0.85, sR * 0.05); x.lineTo(-sR * 0.85, -sR * 0.62); x.closePath();
    const sg = x.createLinearGradient(0, -sR, 0, sR); sg.addColorStop(0, NV.rgba(col, 0.55)); sg.addColorStop(1, NV.rgba(col, 0.12)); x.fillStyle = sg; x.fill(); x.strokeStyle = col; x.lineWidth = 2; x.shadowColor = col; x.shadowBlur = 16; x.stroke(); x.shadowBlur = 0; x.restore();
    const label = GD.state === 'arming' ? String(GD.count) : GD.state === 'armed' ? '✓' : GD.state === 'alarm' ? '!' : '⏻';
    txt(x, label, cx, cy + 2, '#fff', GD.state === 'arming' ? R * 0.34 : R * 0.26, 'center', 'Orbitron, sans-serif', '800');
    if (!GD._rt || t - GD._rt > 120) { GD._rt = t; $('#guard-m').style.width = Math.round(NV.clamp(GD.m, 0, 1) * 100) + '%'; NV.text('#guard-mv', NV.pad(NV.clamp(GD.m, 0, 0.99) * 100)); $('#guard-c').style.width = Math.round(NV.clamp(GD.cm, 0, 1) * 100) + '%'; NV.text('#guard-cv-v', GD.usecam ? (NV.cam.live ? NV.pad(NV.clamp(GD.cm, 0, 0.99) * 100) : 'N/A') : 'OFF'); }
  };
  GD.primary = () => (GD.state === 'off' ? GD.arm() : null);
  function initGuard() {
    gSmall = document.createElement('canvas'); gSmall.width = 48; gSmall.height = 36; gCtx = gSmall.getContext('2d', { willReadFrequently: true });
    $('#guard-arm').onclick = GD.arm;
    $('#guard-usecam').onchange = (e) => { GD.usecam = e.target.checked; if (GD.usecam && !NV.cam.live) { NV.cam.start().then((ok) => { if (!ok || !NV.cam.live) NV.toast('The camera channel needs a live camera, Sir. Motion sensing still works.'); }); } };
    $('#guard-sens').oninput = (e) => { GD.sens = +e.target.value; };
    bindHold($('#guard-hold'), 1500, GD.disarm); bindHold($('#ga-hold'), 1500, GD.disarm);
    gSet('off'); renderGuardEvents();
  }

  NV._init_detect = () => { initMetal(); initSeismo(); initHeart(); initGuard(); };
})();
