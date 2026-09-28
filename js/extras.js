/* NICK-VERSE Scanner v11 tools: Soundscape & Sound Board, Paranormal Detector (fake), Mission Planner,
   GPS Speedometer, Clap Switch and Daily Briefing. Canvases draw only while their tool is visible. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, TAU = Math.PI * 2;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  NV.mods = NV.mods || {};
  const every = (ms) => { let t = 0; return (now) => (now - t >= ms ? ((t = now), true) : false); };
  const liteHz = () => (NV.perf.tier <= 1 ? 33 : 16);

  // =====================================================================
  // 1) SOUNDSCAPE & SOUND BOARD
  // =====================================================================
  const SC = { layers: {}, bus: null, an: null, data: null, sleepT: 0, sleepAt: 0 };
  const LAYERS = [
    { id: 'rain', name: 'Rain', ic: '🌧' }, { id: 'wind', name: 'Wind', ic: '🌬' }, { id: 'ocean', name: 'Ocean', ic: '🌊' },
    { id: 'fire', name: 'Campfire', ic: '🔥' }, { id: 'night', name: 'Night Crickets', ic: '🦗' }, { id: 'hum', name: 'Starship Hum', ic: '🛸' }
  ];
  function scBus() {
    const S = NV.audio.synth; if (!S) return null;
    if (!SC.bus) { SC.bus = S.ctx.createGain(); SC.bus.gain.value = 1; SC.bus.connect(S.master); SC.an = S.ctx.createAnalyser(); SC.an.fftSize = 256; SC.an.smoothingTimeConstant = 0.8; SC.bus.connect(SC.an); SC.data = new Uint8Array(SC.an.frequencyBinCount); }
    return S;
  }
  function lfo(ctx, rate, depth, param) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); return o; }
  function noiseSrc(S) { const src = S.ctx.createBufferSource(); src.buffer = S.noiseBuf(); src.loop = true; src.start(0, Math.random() * 1.5); return src; }
  function startLayer(id, vol) {
    const S = scBus(); if (!S) { NV.toast('Tap anywhere first so the browser allows audio, Sir.', 2400); return false; }
    const ctx = S.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(SC.bus); out.gain.setTargetAtTime(vol, ctx.currentTime, 0.6);
    const nodes = [out], timers = [];
    const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; nodes.push(b); return b; };
    if (id === 'rain') { const n = noiseSrc(S), hp = filt('highpass', 900), lp = filt('lowpass', 7000), g = ctx.createGain(); g.gain.value = 0.28; n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); nodes.push(n, g, lfo(ctx, 0.13, 0.05, g.gain));
      timers.push(setInterval(() => { if (!NV.settings.uisound) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) S.tone(2400 + Math.random() * 3000, t + Math.random() * 0.2, 0.02, { gain: 0.012, dest: out }); }, 180)); }
    else if (id === 'wind') { const n = noiseSrc(S), bp = filt('bandpass', 450, 1.1), g = ctx.createGain(); g.gain.value = 0.5; n.connect(bp); bp.connect(g); g.connect(out); nodes.push(n, g, lfo(ctx, 0.07, 260, bp.frequency), lfo(ctx, 0.11, 0.3, g.gain)); }
    else if (id === 'ocean') { const n = noiseSrc(S), lp = filt('lowpass', 750), g = ctx.createGain(); g.gain.value = 0.35; n.connect(lp); lp.connect(g); g.connect(out); nodes.push(n, g, lfo(ctx, 0.085, 0.3, g.gain), lfo(ctx, 0.085, 350, lp.frequency)); }
    else if (id === 'fire') { const n = noiseSrc(S), lp = filt('lowpass', 320), g = ctx.createGain(); g.gain.value = 0.4; n.connect(lp); lp.connect(g); g.connect(out); nodes.push(n, g);
      timers.push(setInterval(() => { if (!NV.settings.uisound || Math.random() < 0.35) return; const t = ctx.currentTime; S.noise(t, 0.015 + Math.random() * 0.03, { gain: 0.05 + Math.random() * 0.08, freq: 1500 + Math.random() * 3500, q: 3, dest: out }); }, 120)); }
    else if (id === 'night') { timers.push(setInterval(() => { if (!NV.settings.uisound) return; const t = ctx.currentTime, f = 4300 + Math.random() * 400; for (let i = 0; i < 3; i++) S.tone(f, t + i * 0.06, 0.035, { gain: 0.03, dest: out }); if (Math.random() < 0.2) S.tone(f * 0.9, t + 0.4, 0.04, { gain: 0.02, dest: out, pan: Math.random() * 2 - 1 }); }, 900)); }
    else if (id === 'hum') { const lp = filt('lowpass', 220), g = ctx.createGain(); g.gain.value = 0.5; lp.connect(g); g.connect(out); nodes.push(g);
      [55, 110.3, 165.2].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'sawtooth'; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = [0.4, 0.25, 0.1][i]; o.connect(og); og.connect(lp); o.start(); nodes.push(o, og); }); nodes.push(lfo(ctx, 0.2, 40, lp.frequency)); }
    SC.layers[id] = { out, nodes, timers, vol }; return true;
  }
  function stopLayer(id) {
    const L = SC.layers[id]; if (!L) return; delete SC.layers[id]; L.timers.forEach(clearInterval);
    const S = NV.audio.synth; if (S) L.out.gain.setTargetAtTime(0, S.ctx.currentTime, 0.4);
    setTimeout(() => L.nodes.forEach((n) => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { /* done */ } }), 1800);
  }
  function scRender() {
    NV.$$('#sc-layers .sc-layer').forEach((el) => { const on = !!SC.layers[el.dataset.l]; el.classList.toggle('on', on); el.querySelector('.sc-tg').setAttribute('aria-pressed', on); });
    const n = Object.keys(SC.layers).length; NV.text('#sc-badge', n ? n + ' LAYER' + (n > 1 ? 'S' : '') : 'SILENT'); $('#sc-badge').className = 'badge' + (n ? ' live' : '');
    if (n >= 3) NV.award('dj-sound');
  }
  const PADS = [
    ['Airhorn', (S, t) => { [0, 0.18, 0.36].forEach((d, i) => { [415, 466, 554].forEach((f) => S.tone(f, t + d, i === 2 ? 0.55 : 0.15, { type: 'sawtooth', gain: 0.05, filter: { freq: 2600 } })); }); }],
    ['Ba-dum-tss', (S, t) => { S.tone(180, t, 0.12, { gain: 0.2, glideTo: 90 }); S.tone(120, t + 0.16, 0.12, { gain: 0.2, glideTo: 70 }); S.noise(t + 0.34, 0.5, { gain: 0.1, freq: 8000, q: 0.6 }); }],
    ['Sad Trombone', (S, t) => { [[392, 0], [370, 0.45], [349, 0.9], [330, 1.35]].forEach(([f, d], i) => S.tone(f, t + d, i === 3 ? 1.1 : 0.42, { type: 'sawtooth', gain: 0.06, filter: { freq: 1200, q: 2 }, glideTo: i === 3 ? f * 0.94 : null })); }],
    ['Drumroll', (S, t) => { for (let i = 0; i < 28; i++) S.noise(t + i * 0.05, 0.05, { gain: 0.03 + i * 0.002, freq: 1600, q: 0.8 }); S.noise(t + 1.45, 0.7, { gain: 0.12, freq: 6000, q: 0.5 }); S.tone(90, t + 1.45, 0.3, { gain: 0.2, glideTo: 50 }); }],
    ['Laser', (S, t) => { S.tone(2400, t, 0.25, { type: 'square', gain: 0.04, glideTo: 180, filter: { freq: 4000 } }); }],
    ['Applause', (S, t) => { for (let i = 0; i < 90; i++) S.noise(t + Math.random() * 2, 0.02, { gain: 0.03 + Math.random() * 0.04, freq: 1500 + Math.random() * 2500, q: 1.5 }); }],
    ['Crickets', (S, t) => { for (let k = 0; k < 4; k++) for (let i = 0; i < 3; i++) S.tone(4500, t + k * 0.5 + i * 0.06, 0.035, { gain: 0.035 }); }],
    ['Dun Dun DUN', (S, t) => { [[196, 0, 0.3], [185, 0.35, 0.3], [147, 0.75, 1.4]].forEach(([f, d, l]) => { S.tone(f, t + d, l, { type: 'sawtooth', gain: 0.07, filter: { freq: 900 } }); S.tone(f / 2, t + d, l, { gain: 0.12 }); }); }],
    ['Level Up', (S, t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => S.tone(f, t + i * 0.07, 0.2, { type: 'square', gain: 0.035, filter: { freq: 5000 } })); }],
    ['Boing', (S, t) => { S.tone(140, t, 0.5, { type: 'triangle', gain: 0.15, glideTo: 520 }); S.tone(520, t + 0.1, 0.4, { gain: 0.03, glideTo: 180 }); }],
    ['Thunder', (S, t) => { S.noise(t, 2.2, { gain: 0.25, freq: 180, q: 0.5, type: 'lowpass' }); S.noise(t + 0.05, 0.5, { gain: 0.12, freq: 900, q: 0.6, sweepTo: 200 }); }],
    ['Warp', (S, t) => { S.tone(80, t, 1.2, { type: 'sawtooth', gain: 0.06, glideTo: 1600, filter: { freq: 2000, q: 5 } }); S.noise(t, 1.2, { gain: 0.05, freq: 300, sweepTo: 8000, q: 2 }); }]
  ];
  NV.mods.sound = {
    enter() { scRender(); },
    frame: (() => { const due = every(33); return (now) => {
      if (!due(now)) return; const f = NV.fit($('#sc-viz')); if (!f) return; const { x, w, h } = f, c = NV.colors; x.clearRect(0, 0, w, h);
      const on = SC.an && Object.keys(SC.layers).length; if (on) SC.an.getByteFrequencyData(SC.data);
      const N = 48, bw = w / N; x.fillStyle = NV.rgba(c.primary, 0.75); x.beginPath();
      for (let i = 0; i < N; i++) { const v = on ? SC.data[Math.floor(Math.pow(i / N, 1.4) * SC.data.length * 0.8)] / 255 : 0.03 + 0.02 * Math.sin(now / 600 + i * 0.4); const bh = Math.max(2, v * h * 0.9); x.rect(i * bw + 1, (h - bh) / 2, bw - 2, bh); }
      x.fill();
      if (SC.sleepAt) { const left = Math.max(0, SC.sleepAt - Date.now()); NV.text('#sc-sleep-left', NV.fmtDuration(left, false)); }
    }; })()
  };
  function initSound() {
    $('#sc-layers').innerHTML = LAYERS.map((l) => `<div class="sc-layer" data-l="${l.id}"><button class="sc-tg" aria-pressed="false"><span class="sc-ic" aria-hidden="true">${l.ic}</span><b>${l.name}</b></button><input type="range" min="0" max="1" step="0.01" value="0.6" aria-label="${l.name} volume"></div>`).join('');
    $('#sc-layers').addEventListener('click', (e) => { const b = e.target.closest('.sc-tg'); if (!b) return; const id = b.parentElement.dataset.l; if (SC.layers[id]) stopLayer(id); else startLayer(id, +b.parentElement.querySelector('input').value); NV.audio.click(); scRender(); });
    $('#sc-layers').addEventListener('input', (e) => { if (e.target.type !== 'range') return; const L = SC.layers[e.target.parentElement.dataset.l]; const S = NV.audio.synth; if (L && S) L.out.gain.setTargetAtTime(+e.target.value, S.ctx.currentTime, 0.1); });
    $('#sc-stop').onclick = () => { Object.keys(SC.layers).forEach(stopLayer); scRender(); clearTimeout(SC.sleepT); SC.sleepAt = 0; NV.text('#sc-sleep-left', ''); $('#sc-sleep').value = '0'; };
    $('#sc-sleep').onchange = (e) => { clearTimeout(SC.sleepT); const m = +e.target.value; SC.sleepAt = m ? Date.now() + m * 60000 : 0; NV.text('#sc-sleep-left', ''); if (m) { SC.sleepT = setTimeout(() => { $('#sc-stop').click(); NV.toast('Sleep timer: soundscape faded out. Goodnight, Sir.', 3000); }, m * 60000); NV.toast(`Soundscape will fade out in ${m} minutes.`, 2000); } };
    $('#sc-pads').innerHTML = PADS.map(([n], i) => `<button type="button" data-pad="${i}"><span>${n}</span></button>`).join('');
    $('#sc-pads').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-pad]'); if (!b) return; const S = NV.audio.canPlay() ? NV.audio.synth : null; if (!S) { NV.toast('Sound is muted, Sir.', 1500); return; } PADS[+b.dataset.pad][1](S, S.ctx.currentTime + 0.01); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); NV.haptic(12); });
  }

  // =====================================================================
  // 2) PARANORMAL DETECTOR (clearly fake, horror-comedy)
  // =====================================================================
  const GH = { on: false, emf: 0.3, target: 0.3, box: false, freq: 88.1, word: '', ents: [], lastEnt: 0, boxT: 0, calm: 0 };
  const WORDS = ['HELLO', 'BISCUITS', 'NICHOLAS', 'WHY', 'SOCKS', 'BEHIND YOU', 'WI-FI', 'GARY', 'LEAVE', 'SNACKS', 'CINCO', 'BOO', 'TUESDAY', 'MOIST', 'SORRY', 'HOMEWORK', 'CHEESE', 'TOO LOUD', 'WHO', 'NICE HUD'];
  const ENT = { name: ['Gary\u2019s Ghost', 'The Grey Lady (Beige, actually)', 'A Spooky Hamster', 'Sir Reginald the Headless', 'The Phantom Sock Thief', 'A Poltergeist Named Dave', 'The Wi-Fi Wraith', 'An Unpaid Intern (Deceased)', 'Victorian Child #4', 'The Toaster Spirit'],
    type: ['Poltergeist', 'Apparition', 'Residual echo', 'Class IV spectre', 'Mildly haunted draught', 'Orb (probably dust)', 'Demonic (on its day off)'],
    mood: ['mildly peckish', 'passive-aggressive', 'looking for its keys', 'bored', 'strongly disapproves of your haircut', 'lonely, wants a chat', 'furious about the thermostat', 'friendly, if damp'] };
  const ANSWERS = { 'Is anyone there?': ['YES', 'NO (lie)', 'JUST ME', 'WHO ASKS'], 'What is your name?': ['GARY', 'STEVE', 'NOT TELLING', 'BORIS?'], 'Did you eat my biscuits?': ['YES', 'DELICIOUS', 'NO. MAYBE.', 'CRUMBS'], 'Are you friendly?': ['MOSTLY', 'BOO', 'DEPENDS', 'HUGS'], 'Should I be scared?': ['NO', 'A LITTLE', 'LOOK BEHIND', 'NAH'] };
  function ghDetect(force) {
    const e = { name: pick(ENT.name), type: pick(ENT.type), mood: pick(ENT.mood), t: Date.now() }; GH.ents.unshift(e); if (GH.ents.length > 5) GH.ents.pop();
    $('#gh-ents').innerHTML = GH.ents.map((x) => `<li><b>${NV.esc(x.name)}</b><span>${x.type} · ${x.mood}</span></li>`).join('');
    GH.target = 0.85 + Math.random() * 0.15; NV.audio.rumble(0.6); NV.haptic([40, 60, 120]); NV.award('ghost');
    const card = $('#gh-alert'); card.hidden = false; NV.text('#gh-alert-t', `${e.name} detected. ${e.type}, ${e.mood}.`); card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    if (force || Math.random() < 0.5) NV.jarvis.speak(pick([`Sir, the detector reports ${e.name}. I report that the detector is making it up.`, `An entity, Sir. ${e.type}. I would remind you that this is entirely fictional, and so, probably, is the ghost.`, `Contact, Sir. It appears to be ${e.mood}. As are we all.`]), { tag: 'PARANORMAL' });
  }
  function ghBox(on) {
    GH.box = on; $('#gh-box').setAttribute('aria-pressed', on); $('#gh-box').textContent = on ? 'Spirit Box: ON' : 'Spirit Box';
    if (on) { const S = NV.audio.canPlay() && NV.audio.synth; if (S) NV.audio.customLoop('ghost', 'box', 180, (t, st, S2) => { S2.noise(t, 0.16, { gain: 0.025, freq: 800 + Math.random() * 2400, q: 0.8, dest: S2.sfxBus }); if (st % 9 === 0) S2.tone(300 + Math.random() * 300, t, 0.1, { type: 'square', gain: 0.01, filter: { freq: 1200 } }); }); }
    else NV.audio.stopLoop('ghost');
  }
  function ghWord(w) { GH.word = w; const el = $('#gh-word'); el.textContent = '“' + w + '”'; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); if (NV.jarvis.speakAlt) NV.jarvis.speakAlt(w.toLowerCase(), { pitch: 0.2, rate: 0.6 }); }
  NV.mods.ghost = {
    enter() { if (!GH.on) NV.text('#gh-state', 'Press Begin Investigation. Results are 100% invented.'); },
    leave() { if (GH.box) ghBox(false); },
    frame: (() => { let lt = 0; return (now) => {
      if (now - lt < liteHz()) return; const dt = Math.min(0.1, (now - lt) / 1000); lt = now;
      if (GH.on) {
        const sn = NV.sensors || {}; const jig = Math.min(0.4, Math.abs((sn.g || 1) - 1) * 2);
        if (Math.random() < dt * 0.6) GH.target = NV.clamp(0.15 + Math.random() * 0.45 + jig, 0, 1);
        if (now - GH.lastEnt > 9000 && Math.random() < dt * 0.09) { GH.lastEnt = now; ghDetect(false); }
        GH.emf = NV.lerp(GH.emf, GH.target, 0.08) + (Math.random() - 0.5) * 0.03; GH.target = NV.lerp(GH.target, 0.25, dt * 0.15);
        const mg = (GH.emf * 12).toFixed(1); NV.text('#gh-mg', mg + ' mG'); NV.text('#gh-level', ['CALM', 'CALM', 'STIRRING', 'ACTIVE', 'HAUNTED', 'VERY HAUNTED'][Math.min(5, Math.floor(GH.emf * 6))]);
        if (GH.emf > 0.7 && Math.random() < dt * 3) NV.audio.detect(GH.emf);
      }
      if (GH.box) { GH.freq += 0.3; if (GH.freq > 107.9) GH.freq = 88.1; NV.text('#gh-freq', GH.freq.toFixed(1) + ' FM'); if (now - GH.boxT > 4200 && Math.random() < dt * 0.5) { GH.boxT = now; ghWord(pick(WORDS)); } }
      drawEmf(now);
    }; })()
  };
  function drawEmf(now) {
    const f = NV.fit($('#gh-gauge')); if (!f) return; const { x, w, h } = f; x.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.88, R = Math.min(w * 0.44, h * 0.8), cols = ['#57ffa8', '#b6ff57', '#ffe657', '#ffab3d', '#ff4d5e'], lvl = GH.on ? GH.emf : 0;
    for (let i = 0; i < 5; i++) { const a0 = Math.PI + i * Math.PI / 5 + 0.04, a1 = a0 + Math.PI / 5 - 0.08, lit = lvl * 5 > i + 0.2; x.strokeStyle = lit ? cols[i] : 'rgba(255,255,255,.08)'; x.lineWidth = R * 0.16; x.beginPath(); x.arc(cx, cy, R * 0.82, a0, a1); x.stroke(); }
    const a = Math.PI + NV.clamp(lvl, 0, 1) * Math.PI; x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, 5, 0, TAU); x.fill();
    x.fillStyle = NV.rgba(NV.colors.secondary, 0.7); x.font = '600 10px ShareTech, monospace'; x.textAlign = 'center'; x.fillText('EMF · ENTIRELY FICTIONAL UNITS', cx, h * 0.98);
  }
  function initGhost() {
    $('#gh-start').onclick = () => { GH.on = !GH.on; $('#gh-start').textContent = GH.on ? 'End Investigation' : 'Begin Investigation'; NV.text('#gh-badge', GH.on ? 'INVESTIGATING' : 'IDLE'); $('#gh-badge').className = 'badge' + (GH.on ? ' live' : ''); NV.text('#gh-state', GH.on ? 'Sweeping for spectral activity. Walk slowly and look brave.' : 'Investigation ended. The ghosts have been told to go home.'); NV.audio[GH.on ? 'powerUp' : 'powerDown'](); if (GH.on) { GH.lastEnt = performance.now() - 5000; NV.jarvis.log('Paranormal sweep started, Sir. I shall be over here, being rational.', 'PARANORMAL'); } else if (GH.box) ghBox(false); };
    $('#gh-box').onclick = () => { if (!GH.on) $('#gh-start').click(); ghBox(!GH.box); };
    $('#gh-qs').innerHTML = Object.keys(ANSWERS).map((q) => `<button type="button">${q}</button>`).join('');
    $('#gh-qs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (!GH.on) $('#gh-start').click(); NV.text('#gh-state', 'You asked: “' + b.textContent + '” … listening…'); setTimeout(() => { ghWord(pick(ANSWERS[b.textContent])); GH.target = 0.7 + Math.random() * 0.3; }, 1400 + Math.random() * 1400); });
    $('#gh-banish').onclick = () => { if (!GH.ents.length) { NV.toast('Nothing to banish, Sir. The room is spookily unspooky.', 2000); return; } const e = GH.ents.shift(); $('#gh-ents').innerHTML = GH.ents.map((x) => `<li><b>${NV.esc(x.name)}</b><span>${x.type} · ${x.mood}</span></li>`).join(''); GH.target = 0.1; NV.audio.whoosh(); NV.toast(`${e.name} banished to the CINCO returns department.`, 2600); $('#gh-alert').hidden = true; };
  }

  // =====================================================================
  // 3) MISSION PLANNER (checklist + countdown)
  // =====================================================================
  const TEMPLATES = {
    house: ['Leave the House', ['Keys', 'Wallet', 'Phone', 'Charger', 'Snacks', 'Check the hob is off']],
    launch: ['Launch Sequence', ['Fuel the rocket (juice box)', 'Systems check', 'Brief the crew (the cat)', 'Tell Mum', 'Helmet on']],
    movie: ['Movie Night', ['Pick a film (no arguing)', 'Popcorn', 'Blankets', 'Phones on silent', 'Lights down']],
    homework: ['Operation Homework', ['Find the homework', 'Understand the homework', 'Do the homework', 'Hand in the homework', 'Celebrate']],
    morning: ['Morning Launch', ['Out of bed', 'Teeth', 'Breakfast', 'Bag packed', 'Shoes (both)']]
  };
  const MS = Object.assign({ name: 'Leave the House', items: TEMPLATES.house[1].map((t) => ({ t, d: false })), dur: 300000, end: 0, left: 300000, running: false }, NV.store.get('mission', {}));
  MS.running = MS.running && MS.end > Date.now(); let msTick = 0, lastCall = -1;
  const msSave = () => NV.store.set('mission', { name: MS.name, items: MS.items, dur: MS.dur, end: MS.end, left: MS.left, running: MS.running });
  function msRender() {
    $('#ms-name').value = MS.name;
    $('#ms-list').innerHTML = MS.items.map((it, i) => `<li class="${it.d ? 'done' : ''}"><label><input type="checkbox" data-i="${i}"${it.d ? ' checked' : ''}><span>${NV.esc(it.t)}</span></label><button class="icon-btn xs" data-del="${i}" aria-label="Remove item" title="Remove">✕</button></li>`).join('') || '<li class="empty">No items. Add one below, Sir.</li>';
    const n = MS.items.filter((i) => i.d).length, tot = MS.items.length, p = tot ? n / tot : 0;
    $('#ms-ring').style.setProperty('--p', p); NV.text('#ms-pct', Math.round(p * 100) + '%'); NV.text('#ms-count', `${n} / ${tot}`);
    msTime();
  }
  function msTime() {
    const left = MS.running ? Math.max(0, MS.end - Date.now()) : MS.left, s = Math.ceil(left / 1000);
    NV.text('#ms-clock', 'T−' + (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + NV.pad(Math.floor(s / 60) % 60) + ':' + NV.pad(s % 60));
    $('#ms-clock').classList.toggle('warn', MS.running && s <= 10); NV.text('#ms-go', MS.running ? 'Pause' : left < MS.dur && left > 0 ? 'Resume' : 'Launch');
    NV.text('#ms-badge', MS.running ? 'COUNTDOWN' : left === 0 ? 'T-ZERO' : 'STANDBY'); $('#ms-badge').className = 'badge' + (MS.running ? ' live' : left === 0 ? ' warn' : '');
    const bar = $('#ms-bar'); if (bar) bar.style.transform = `scaleX(${MS.dur ? 1 - left / MS.dur : 0})`;
    if (MS.running) {
      if (s <= 10 && s > 0 && s !== lastCall) { lastCall = s; NV.audio.arming(false); if (s === 10) NV.jarvis.speak('T-minus ten seconds, Sir.', { tag: 'MISSION' }); }
      if (left <= 0) { MS.running = false; MS.left = 0; msSave(); NV.audio.arming(true); NV.audio.chime(); NV.haptic([200, 100, 200]); const n = MS.items.filter((i) => i.d).length; NV.jarvis.speak(n === MS.items.length ? `Mission time, Sir. ${MS.name}: every item complete. Splendid.` : `Mission time, Sir. ${MS.name}: ${n} of ${MS.items.length} items complete. I shall pretend not to notice the others.`, { tag: 'MISSION' }); NV.toast('🚀 T-zero: ' + MS.name, 4000); msTime(); }
    }
  }
  function msTickStart() { clearInterval(msTick); if (MS.running) msTick = setInterval(msTime, 250); }
  NV.mods.mission = { enter: msRender };
  NV.mission = { get running() { return MS.running; }, left: () => (MS.running ? Math.max(0, MS.end - Date.now()) : MS.left), name: () => MS.name };
  function initMission() {
    $('#ms-tpl').innerHTML = '<option value="">Templates…</option>' + Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('');
    $('#ms-tpl').onchange = (e) => { const t = TEMPLATES[e.target.value]; if (!t) return; MS.name = t[0]; MS.items = t[1].map((x) => ({ t: x, d: false })); e.target.value = ''; msSave(); msRender(); NV.audio.confirm(); };
    $('#ms-name').addEventListener('change', (e) => { MS.name = e.target.value.trim() || 'Unnamed Mission'; msSave(); });
    $('#ms-add').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#ms-item').value.trim(); if (!v) return; MS.items.push({ t: v.slice(0, 60), d: false }); $('#ms-item').value = ''; msSave(); msRender(); NV.audio.click(); });
    $('#ms-list').addEventListener('change', (e) => { const i = e.target.dataset.i; if (i == null) return; MS.items[+i].d = e.target.checked; msSave(); msRender(); NV.audio.tick(e.target.checked ? 1.3 : 0.8); NV.haptic(8);
      if (MS.items.length && MS.items.every((x) => x.d)) { NV.award('mission'); NV.fx.confetti(90); NV.audio.badge(); NV.jarvis.speak(pick(['Checklist complete, Sir. Mission ready.', 'All items ticked, Sir. I am almost impressed.', 'Every box checked, Nicholas. Very thorough.']), { tag: 'MISSION' }); } });
    $('#ms-list').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (!b) return; MS.items.splice(+b.dataset.del, 1); msSave(); msRender(); NV.audio.close(); });
    $('#ms-durs').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; MS.dur = +b.dataset.m * 60000; MS.left = MS.dur; MS.running = false; clearInterval(msTick); msSave(); msTime(); NV.audio.click(); NV.$$('#ms-durs [data-m]').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#ms-go').onclick = () => { if (MS.running) { MS.left = Math.max(0, MS.end - Date.now()); MS.running = false; NV.audio.click(0.8); } else { if (MS.left <= 0) MS.left = MS.dur; MS.end = Date.now() + MS.left; MS.running = true; lastCall = -1; NV.audio.powerUp(); NV.jarvis.log(`Countdown started for ${MS.name}, Sir.`, 'MISSION'); } msSave(); msTickStart(); msTime(); };
    $('#ms-reset').onclick = () => { MS.running = false; MS.left = MS.dur; MS.items.forEach((i) => { i.d = false; }); clearInterval(msTick); msSave(); msRender(); NV.audio.close(); };
    msTickStart();
  }

  // =====================================================================
  // 4) GPS SPEEDOMETER & TRIP METER
  // =====================================================================
  const SP = { watch: null, sim: false, speed: 0, max: 0, dist: 0, moving: 0, last: null, alt: null, acc: null, head: null, t0: 0, simT: 0, unit: NV.store.get('spunit', /^en-(US|GB)/.test(navigator.language || '') ? 'mph' : 'kmh'), disp: 0, lastQuip: 0 };
  const UNITS = { kmh: ['km/h', 3.6, 'km', 1000], mph: ['mph', 2.23694, 'mi', 1609.344], ms: ['m/s', 1, 'm', 1], kn: ['kn', 1.94384, 'nmi', 1852] };
  function hav(a, b) { const R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r, s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
  function spFix(p) {
    const c = p.coords, now = p.timestamp || Date.now(), pt = { lat: c.latitude, lon: c.longitude, t: now };
    SP.acc = c.accuracy; SP.alt = c.altitude; SP.head = c.heading;
    if (c.accuracy > 60) { NV.text('#sp-src', `GPS · waiting for accuracy (±${Math.round(c.accuracy)} m)`); return; }
    let v = c.speed;
    if (SP.last) { const d = hav(SP.last, pt), dt = (now - SP.last.t) / 1000; if (dt > 0) { if (v == null || isNaN(v)) v = d / dt; if (d > Math.max(3, c.accuracy * 0.3) && d / dt < 90) { SP.dist += d; if (v > 0.5) SP.moving += dt; } } }
    SP.last = pt; spSet(v || 0); NV.text('#sp-src', `GPS LIVE · ±${Math.round(c.accuracy)} m`);
  }
  function spSet(v) { SP.speed = Math.max(0, v); if (SP.speed > SP.max) SP.max = SP.speed; if (SP.dist > 100) NV.award('speed');
    const kmh = SP.speed * 3.6, now = performance.now(); if (kmh > 120 && now - SP.lastQuip > 60000) { SP.lastQuip = now; NV.jarvis.speak('Sir, we are travelling rather briskly. I trust you are a passenger.', { tag: 'SPEED' }); } }
  function spStart() {
    if (SP.watch != null || SP.sim) return spStop();
    if (!navigator.geolocation) { NV.toast('Geolocation is unavailable here, Sir. Starting the simulator.', 2600); return spSim(); }
    SP.t0 = Date.now(); NV.text('#sp-src', 'GPS · acquiring satellites…'); $('#sp-start').textContent = 'Stop';
    SP.watch = navigator.geolocation.watchPosition(spFix, (e) => { NV.text('#sp-src', e.code === 1 ? 'Location permission declined. Try the simulator.' : 'GPS unavailable: ' + (e.message || 'no signal')); spStop(true); }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
    spBadge();
  }
  function spSim() { spStop(true); SP.sim = true; SP.simT = performance.now(); SP.t0 = Date.now(); $('#sp-start').textContent = 'Stop'; NV.text('#sp-src', 'SIMULATED · a gentle drive around the Nick-Verse'); spBadge(); }
  function spStop(quiet) { if (SP.watch != null) { navigator.geolocation.clearWatch(SP.watch); SP.watch = null; } SP.sim = false; SP.speed = 0; $('#sp-start').textContent = 'Start GPS'; if (!quiet) NV.text('#sp-src', 'GPS idle'); spBadge(); }
  function spBadge() { const live = SP.watch != null, b = $('#sp-badge'); b.textContent = live ? 'GPS' : SP.sim ? 'SIMULATED' : 'IDLE'; b.className = 'badge' + (live ? ' live' : SP.sim ? ' warn' : ''); }
  NV.mods.speed = {
    enter() { NV.$$('#sp-units [data-u]').forEach((b) => b.classList.toggle('on', b.dataset.u === SP.unit)); },
    frame: (() => { let lt = 0, lr = 0; return (now) => {
      if (now - lt < liteHz()) return; const dt = (now - lt) / 1000; lt = now;
      if (SP.sim) { const t = (now - SP.simT) / 1000, v = Math.max(0, 13 + 9 * Math.sin(t / 9) + 4 * Math.sin(t / 2.3) - (t % 40 > 34 ? 18 : 0)); SP.dist += v * Math.min(dt, 0.2); if (v > 0.5) SP.moving += Math.min(dt, 0.2); spSet(v); SP.alt = 42 + 6 * Math.sin(t / 20); SP.head = (t * 6) % 360; SP.acc = 5; }
      SP.disp = NV.lerp(SP.disp, SP.speed, 0.12);
      const U = UNITS[SP.unit], f = NV.fit($('#sp-gauge'));
      if (f) { const mx = SP.unit === 'ms' ? 40 : SP.unit === 'kn' ? 80 : SP.unit === 'mph' ? 100 : 160; NV.arcGauge($('#sp-gauge'), { value: Math.min(mx, SP.disp * U[1]), min: 0, max: mx, peak: SP.max * U[1], label: U[0].toUpperCase(), big: (SP.disp * U[1]).toFixed(SP.unit === 'ms' ? 1 : 0), sub: SP.watch != null ? 'GPS' : SP.sim ? 'SIMULATED' : 'IDLE', ticks: 8, zones: [[0, mx * 0.6, NV.colors.primary], [mx * 0.6, mx * 0.85, '#ffb547'], [mx * 0.85, mx, '#ff4d5e']] }); }
      if (now - lr > 250) { lr = now;
        NV.text('#sp-trip', (SP.dist / U[3]).toFixed(SP.dist / U[3] < 10 ? 2 : 1) + ' ' + U[2]); NV.text('#sp-max', (SP.max * U[1]).toFixed(0) + ' ' + U[0]);
        NV.text('#sp-avg', (SP.moving > 1 ? (SP.dist / SP.moving) * U[1] : 0).toFixed(0) + ' ' + U[0]); NV.text('#sp-time', NV.fmtDuration(SP.moving * 1000, false));
        NV.text('#sp-alt', SP.alt != null ? Math.round(SP.alt) + ' m' : '--'); NV.text('#sp-head', SP.head != null && !isNaN(SP.head) ? Math.round(SP.head) + '° ' + NV.cardinal(SP.head) : '--'); }
    }; })()
  };
  NV.speedo = SP;
  function initSpeed() {
    $('#sp-start').onclick = () => { NV.audio.click(); spStart(); };
    $('#sp-sim').onclick = () => { NV.audio.click(); if (SP.sim) spStop(); else spSim(); };
    $('#sp-reset').onclick = () => { SP.dist = 0; SP.max = 0; SP.moving = 0; SP.last = null; NV.audio.close(); };
    $('#sp-units').addEventListener('click', (e) => { const b = e.target.closest('[data-u]'); if (!b) return; SP.unit = b.dataset.u; NV.store.set('spunit', SP.unit); NV.mods.speed.enter(); NV.audio.tick(); });
  }

  // =====================================================================
  // 5) CLAP SWITCH (mic transients)
  // =====================================================================
  const CL = { armed: false, base: 40, claps: [], last: 0, lamp: false, sens: +NV.store.get('clapsens', 6), n: 0, peakT: 0, level: 0 };
  const CL_ACTIONS = { lamp: 'Toggle the holo-lamp', torch: 'Toggle torch / screen light', status: 'Status report', scan: 'Optical scan', party: 'Party mode', theme: 'Next theme', redalert: 'Red alert', none: 'Do nothing (very relaxing)' };
  const clMap = Object.assign({ 2: 'lamp', 3: 'status' }, NV.store.get('clapmap', {}));
  function clFire(n) {
    const a = clMap[n] || 'none'; CL.n++; NV.award('clap'); const dots = $('#cl-dots'); if (dots) { dots.textContent = '👏'.repeat(n); dots.classList.remove('in'); void dots.offsetWidth; dots.classList.add('in'); }
    NV.text('#cl-last', `${n} claps → ${CL_ACTIONS[a]}`); NV.haptic([20, 30, 20]);
    if (a === 'lamp') { CL.lamp = !CL.lamp; $('#cl-lamp').classList.toggle('on', CL.lamp); NV.audio[CL.lamp ? 'confirm' : 'close'](); }
    else if (a === 'torch') NV.light.toggle(); else if (a === 'status') NV.jarvis.briefing(); else if (a === 'scan') { NV.showTab('scan'); setTimeout(() => NV.cam.scan(), 600); }
    else if (a === 'party' || a === 'redalert') NV.runProto(a === 'party' ? (NV.isParty() ? 'standard' : 'party') : (NV.threat.red ? 'standard' : 'redalert')); else if (a === 'theme') NV.cycleTheme(1);
    if (CL.n === 1) NV.jarvis.log('Clap switch triggered, Sir. The 1980s would be proud.', 'CLAP');
  }
  function clOnset(now) { CL.claps = CL.claps.filter((t) => now - t < 1400); CL.claps.push(now); CL.last = now; CL.peakT = now; NV.audio.tick(1.4); }
  function clTick({ now }) {
    if (!CL.armed) return; const M = NV.meter; if (!M.active) return;
    const lv = M.raw != null ? M.raw : M.db; CL.level = lv;
    const thr = 34 - CL.sens * 2.4; // sensitivity 1..10 → +31.6..+10 dB above ambient
    if (lv - CL.base > thr && now - CL.last > 140) clOnset(now);
    else if (now - CL.last > 260) CL.base = NV.lerp(CL.base, lv, 0.02);
    if (CL.claps.length && now - CL.claps[CL.claps.length - 1] > 700) { const n = CL.claps.length; CL.claps = []; if (n >= 2) clFire(Math.min(n, 3)); else NV.text('#cl-last', 'One clap heard. Clap twice or three times, Sir.'); }
  }
  function clArm(on) {
    CL.armed = on; $('#cl-arm').textContent = on ? 'Disarm' : 'Arm Clap Switch'; $('#cl-arm').classList.toggle('danger', on);
    NV.text('#cl-badge', on ? 'LISTENING' : 'OFF'); $('#cl-badge').className = 'badge' + (on ? ' live' : '');
    if (on && !NV.meter.active) NV.meter.start(); CL.base = NV.meter.active ? (NV.meter.raw || NV.meter.db || 40) : 40;
    NV.text('#cl-state', on ? 'Armed. Works across every tool while the page is open. Clap sharply, twice or three times.' : 'Disarmed.');
  }
  NV.mods.clap = {
    frame: (() => { let lt = 0; return (now) => {
      if (now - lt < liteHz()) return; lt = now; const f = NV.fit($('#cl-meter')); if (!f) return; const { x, w, h } = f, c = NV.colors; x.clearRect(0, 0, w, h);
      const M = NV.meter, lv = M.active ? (M.raw != null ? M.raw : M.db) : 0, toX = (d) => NV.clamp(d / 110, 0, 1) * w, thr = CL.base + 34 - CL.sens * 2.4;
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, h * 0.3, w, h * 0.4);
      x.fillStyle = now - CL.peakT < 180 ? '#ffd23f' : c.primary; x.fillRect(0, h * 0.3, toX(lv), h * 0.4);
      x.fillStyle = NV.rgba(c.secondary, 0.45); x.fillRect(toX(CL.base) - 1, h * 0.2, 2, h * 0.6);
      x.fillStyle = '#ff4d5e'; x.fillRect(toX(thr) - 1.5, h * 0.12, 3, h * 0.76);
      x.font = '600 10px ShareTech, monospace'; x.fillStyle = NV.rgba(c.secondary, 0.8); x.textAlign = 'left'; x.fillText(M.active ? Math.round(lv) + ' dB' + (M.sim ? ' (sim)' : '') : 'MIC OFF', 4, h * 0.2);
      x.textAlign = 'right'; x.fillStyle = '#ff8a95'; x.fillText('TRIGGER', Math.min(w - 2, toX(thr) + 40), h * 0.98);
    }; })()
  };
  function initClap() {
    const opts = Object.entries(CL_ACTIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    ['2', '3'].forEach((n) => { const s = $('#cl-map' + n); s.innerHTML = opts; s.value = clMap[n]; s.onchange = () => { clMap[n] = s.value; NV.store.set('clapmap', clMap); NV.audio.click(); }; });
    $('#cl-arm').onclick = () => clArm(!CL.armed);
    $('#cl-sens').value = CL.sens; $('#cl-sens').oninput = (e) => { CL.sens = +e.target.value; NV.store.set('clapsens', CL.sens); };
    $('#cl-test2').onclick = () => clFire(2); $('#cl-test3').onclick = () => clFire(3);
    $('#cl-lamp').onclick = () => { CL.lamp = !CL.lamp; $('#cl-lamp').classList.toggle('on', CL.lamp); NV.audio.click(); };
    NV.on('tick', clTick);
  }

  // =====================================================================
  // 6) DAILY BRIEFING
  // =====================================================================
  const BRQ = ['Another day, another opportunity to scan things that do not need scanning, Sir.', 'I have reviewed the day ahead, Sir. It looks manageable, provided nobody calls CINCO.', 'All systems nominal. Morale: adequate. Biscuit reserves: unknown.', 'I took the liberty of optimising your schedule, Sir. I removed nothing, but it feels lighter.', 'Today’s forecast: a high chance of brilliance, with scattered showers of sarcasm.', 'The Nick-Verse is secure, Sir. Mostly because nobody else knows it exists.'];
  function brText() {
    const d = new Date(), s = NV.sky.summary(), b = NV.status.battery, n = NV.badges.count(), tot = NV.badges.list.length, rem = NV.brain.reminders()[0];
    const p = [`${NV.jarvis.greeting()}, Sir. It is ${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}.`];
    if (s.ok) p.push(`In ${s.place} it is ${s.temp}${s.unit} and ${s.desc.toLowerCase()}${s.hi != null ? `, with a high of ${s.hi} and a low of ${s.lo}` : ''}.${s.rain >= 50 ? ` Rain is ${s.rain}% likely: an umbrella would be wise.` : ''}`);
    else p.push('I have no weather report yet; open Weather and Sky and I shall fetch one.');
    p.push(`The moon is ${s.moon.name.toLowerCase()}, ${Math.round(s.moon.illum * 100)}% lit.`);
    if (b != null) p.push(`Battery at ${Math.round(b * 100)} percent${NV.status.charging ? ' and charging' : ''}.`);
    p.push(`Achievements: ${n} of ${tot}.`); if (rem) p.push(`Next reminder at ${new Date(rem.due).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: ${rem.text || rem.kind}.`);
    return p.join(' ');
  }
  function brRender() {
    const d = new Date(), s = NV.sky.summary();
    NV.text('#br-greet', NV.jarvis.greeting() + ', Nicholas'); NV.text('#br-date', d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    NV.text('#br-time', d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    if (s.ok) { NV.text('#br-temp', s.temp + s.unit); NV.text('#br-wdesc', s.desc); NV.text('#br-wsub', `${s.place}${s.hi != null ? ` · H ${s.hi}° L ${s.lo}°` : ''} · rain ${s.rain || 0}%${s.cached ? ' · cached' : ''}`); $('#br-wx-fetch').hidden = true; }
    else { NV.text('#br-temp', '--'); NV.text('#br-wdesc', 'No report yet'); NV.text('#br-wsub', 'Tap Fetch for a live forecast (Open-Meteo, no key).'); $('#br-wx-fetch').hidden = false; }
    NV.text('#br-moon', s.moon.name); NV.text('#br-moon-s', Math.round(s.moon.illum * 100) + '% illuminated');
    NV.text('#br-sun', `↑${s.sunrise || '--'} ↓${s.sunset || '--'}`); const dl = +s.dayLen; NV.text('#br-sun-s', dl > 0 ? `Daylight ${Math.floor(dl / 60)}h ${NV.pad(Math.round(dl % 60))}m` : (s.dayLen || ''));
    const b = NV.status.battery; NV.text('#br-bat', b != null ? Math.round(b * 100) + '%' + (NV.status.charging ? ' ⚡' : '') : 'EXT'); $('#br-bat-bar').style.transform = `scaleX(${b != null ? b : 1})`;
    const n = NV.badges.count(), tot = NV.badges.list.length, next = NV.badges.list.find((x) => !NV.badges.has(x[0])); NV.text('#br-ach', `${n} / ${tot}`); NV.text('#br-ach-s', next ? 'Next: ' + next[1] + ' · ' + next[2] : 'All unlocked. Show-off.');
    const rem = NV.brain.reminders()[0]; NV.text('#br-rem', rem ? new Date(rem.due).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'None'); NV.text('#br-rem-s', rem ? (rem.text || (rem.kind === 'timer' ? 'Timer' : 'Reminder')) : 'Ask JARVIS: “remind me in 20 minutes…”');
    NV.text('#br-sys', NV.perf.label()); NV.text('#br-sys-s', `${Math.round(NV.perf.fps || 60)} fps · ${NV.tools.list.length} tools online`);
    const ms = NV.mission; NV.text('#br-ms', ms.running ? NV.fmtDuration(ms.left(), false) : 'Standby'); NV.text('#br-ms-s', ms.name());
    brMoon(s);
    const tips = NV.tools.list.filter((t) => !['brief'].includes(t.id)); const tip = tips[(d.getDate() + d.getMonth() * 3) % tips.length]; NV.text('#br-tip', `${tip.name}: ${tip.desc}.`); $('#br-tip-go').dataset.tool = tip.id;
  }
  let moonDone = 0;
  function brMoon(s) { const cv = $('#br-moon-cv'), f = NV.fit(cv); if (!f) return false; f.x.clearRect(0, 0, f.w, f.h); NV.sky.paintMoon(f.x, f.w / 2, f.h / 2, Math.min(f.w, f.h) * 0.42, (s || NV.sky.summary()).moon.phase, 1, false); return true; }
  let wxTried = 0;
  NV.mods.brief = {
    enter() { moonDone = 0; brRender(); NV.text('#br-quip', pick(BRQ)); NV.award('brief'); if (!NV.sky.summary().ok && navigator.onLine !== false && Date.now() - wxTried > 600000) { wxTried = Date.now(); NV.text('#br-wsub', 'Fetching a live forecast…'); Promise.resolve(NV.sky.refresh()).then(() => setTimeout(brRender, 200)).catch(() => {}); } },
    frame: (() => { let lt = 0; return (now) => { if (!moonDone) moonDone = brMoon() ? 1 : 0; if (now - lt > 1000) { lt = now; NV.text('#br-time', new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); } }; })()
  };
  NV.briefText = brText;
  function initBrief() {
    $('#br-read').onclick = () => NV.jarvis.speak(brText(), { tag: 'BRIEFING' });
    $('#br-wx-fetch').onclick = () => { NV.text('#br-wsub', 'Fetching…'); Promise.resolve(NV.sky.refresh()).then(() => setTimeout(brRender, 300)).catch(() => NV.text('#br-wsub', 'Could not reach the weather service.')); };
    $('#br-quip-new').onclick = () => { NV.text('#br-quip', pick(BRQ)); NV.audio.click(); };
    $('#br-tip-go').onclick = (e) => NV.showTab(e.currentTarget.dataset.tool);
    NV.on('weather', () => { if (NV.tools.active === 'brief') brRender(); });
  }

  NV._init_extras = () => {
    [initSound, initGhost, initMission, initSpeed, initClap, initBrief].forEach((fn) => { try { fn(); } catch (e) { setTimeout(() => { throw e; }); } });
  };
})();
