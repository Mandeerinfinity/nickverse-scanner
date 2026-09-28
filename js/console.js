/* NICK-VERSE Scanner: JARVIS Console tool. Chat by text or voice, holo-core orb and voice waveform,
   session memory, reminders and voice settings. Answers come from NV.brain (local rules, no keys). */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const SUGG = ['Status report', "What's the weather?", 'Remind me in 5 minutes to stretch', 'Roll 2d6', 'Convert 10 km to miles', 'Tell me a joke', 'CINCO fact', 'What have I done?', 'Open radar', 'Odds of double six', 'What is 17% of 240?', 'How are you?', 'Flip a coin', 'Set a timer for 3 minutes', 'Battery level', 'What is my heading?', 'Moon phase', 'What can you do?'];
  const C = { orb: null, ox: null, wave: null, wx: null, S: 0, ww: 0, wh: 0, dpr: 1, lastDraw: 0 };
  const hm = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function add(text, who, tag) {
    const log = $('#jc-log'); if (!log) return;
    const d = document.createElement('div'); d.className = 'jc-msg ' + who;
    d.innerHTML = `<span class="jm-h mono">${who === 'me' ? 'NICHOLAS' : NV.esc(tag || 'JARVIS')} · ${hm(Date.now())}</span>`; const p = document.createElement('p'); p.textContent = text; d.appendChild(p);
    log.appendChild(d); while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function chips() {
    const pool = SUGG.slice().sort(() => Math.random() - 0.5).slice(0, innerWidth < 600 ? 5 : 7);
    $('#jc-chips').innerHTML = pool.map((s) => `<button type="button">${NV.esc(s)}</button>`).join('');
  }
  function renderMem() {
    const el = $('#jc-mem'); if (!el) return; const m = NV.brain.memory().slice(-8).reverse();
    el.innerHTML = m.length ? m.map((x) => `<li><span class="mono">${hm(x.t)}</span>${NV.esc(x.text)}</li>`).join('') : '<li class="empty">Nothing yet this session, Sir. A blank slate.</li>';
  }
  function renderRem() {
    const el = $('#jc-rem'); if (!el) return; const r = NV.brain.reminders();
    el.innerHTML = r.length ? r.map((x) => `<li><span class="mono">${hm(x.due)}</span><span class="jr-t">${x.kind === 'timer' ? '⏱ Timer' : '⏰ ' + NV.esc(x.text || 'Reminder')}</span><button class="icon-btn xs" data-cancel="${x.id}" aria-label="Cancel reminder" title="Cancel">✕</button></li>`).join('') : '<li class="empty">No reminders. Try “remind me in 10 minutes to check the oven”.</li>';
  }
  function syncSettings() {
    NV.$$('#mod-jc [data-set]').forEach((i) => { i.checked = !!NV.settings[i.dataset.set]; });
    const r = $('#jc-rate'), p = $('#jc-pitch'); if (r) { r.value = NV.settings.vrate; NV.text('#jc-rate-v', (+NV.settings.vrate).toFixed(2) + '×'); } if (p) { p.value = NV.settings.vpitch; NV.text('#jc-pitch-v', (+NV.settings.vpitch).toFixed(2)); }
    const v = $('#jc-voice'); if (v && v.options.length) v.value = NV.settings.voice || '';
    const cv = NV.jarvis.currentVoice && NV.jarvis.currentVoice(); NV.text('#jc-vname', cv ? cv.name : (window.speechSynthesis ? 'Browser default' : 'Speech unavailable'));
    const mic = $('#jc-wake-note'); if (mic) mic.textContent = NV.voice.supported ? (NV.settings.wake ? 'Listening for “Jarvis…” (mic stays on while this page is open).' : 'Off. When on, say “Jarvis” then your request.') : 'Speech recognition is not supported in this browser.';
  }
  function resize() {
    C.dpr = Math.min(NV.dpr(), 2);
    const r = C.orb.getBoundingClientRect(); C.S = r.width; if (C.S) { C.orb.width = C.orb.height = Math.round(C.S * C.dpr); }
    const w = C.wave.getBoundingClientRect(); C.ww = w.width; C.wh = w.height; if (C.ww) { C.wave.width = Math.round(C.ww * C.dpr); C.wave.height = Math.round(C.wh * C.dpr); }
  }
  function drawWave(t) {
    const x = C.wx, w = C.ww, h = C.wh, c = NV.colors, lv = NV.jarvis.level || 0, tt = t / 1000;
    x.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); x.clearRect(0, 0, w, h);
    x.strokeStyle = NV.rgba(c.primary, 0.18); x.lineWidth = 1; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
    for (let k = 0; k < 3; k++) {
      const amp = h * 0.42 * (lv * (1 - k * 0.25) + 0.02), fr = 0.018 + k * 0.009, sp = 5 + k * 2.2;
      x.strokeStyle = k === 0 ? c.secondary : NV.rgba(c.primary, 0.5 - k * 0.12); x.lineWidth = k === 0 ? 2 : 1.2; x.beginPath();
      for (let i = 0; i <= w; i += 4) { const env = Math.sin(Math.PI * i / w), y = h / 2 + Math.sin(i * fr + tt * sp + k) * Math.sin(i * 0.004 + tt * 1.3) * amp * env; i ? x.lineTo(i, y) : x.moveTo(i, y); }
      x.stroke();
    }
  }
  const M = {
    enter() { resize(); chips(); renderMem(); renderRem(); syncSettings(); if (!$('#jc-log').children.length) add(`${NV.jarvis.greeting ? NV.jarvis.greeting() : 'Good day'}, Sir. Console online. Ask me anything: the weather, a sum, a reminder, or simply how I am. I shall pretend to be flattered.`, 'jv'); },
    frame(now) {
      if (!C.orb) return; const J = NV.jarvis, idle = !J.speaking && (J.level || 0) < 0.1 && !NV.voice.listening;
      if (idle && now - C.lastDraw < (NV.perf.tier <= 1 ? 50 : 33)) return; C.lastDraw = now;
      if (!C.S || C.orb.width !== Math.round(C.S * C.dpr)) resize(); if (!C.S) return;
      C.ox.setTransform(C.dpr, 0, 0, C.dpr, C.S / 2 * C.dpr, C.S / 2 * C.dpr);
      J.drawCore(C.ox, C.S, now, { listening: NV.voice.listening || NV.voice.wakeOn });
      if (C.ww) drawWave(now);
    }
  };
  NV.mods = NV.mods || {}; NV.mods.jarvis = M;
  NV._init_console = () => {
    C.orb = $('#jc-orb'); C.wave = $('#jc-wave'); if (!C.orb) return; C.ox = C.orb.getContext('2d'); C.wx = C.wave.getContext('2d');
    window.addEventListener('resize', () => { if (NV.tools.active === 'jarvis') resize(); });
    $('#jc-form').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#jc-q').value.trim(); if (!q) return; $('#jc-q').value = ''; NV.brain.ask(q, { source: 'text' }); });
    $('#jc-chips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; NV.brain.ask(b.textContent, { source: 'text' }); setTimeout(chips, 600); });
    $('#jc-mic').onclick = () => NV.voice.toggle();
    $('#jc-orb').addEventListener('click', () => NV.voice.toggle());
    $('#jc-rem').addEventListener('click', (e) => { const b = e.target.closest('[data-cancel]'); if (b) { NV.brain.cancelReminder(b.dataset.cancel); NV.audio.close(); NV.toast('Reminder cancelled, Sir.', 1600); } });
    $('#jc-clear').onclick = () => { $('#jc-log').innerHTML = ''; NV.audio.close(); add('Transcript cleared. My memory of this session remains, however. I never forget, Sir.', 'jv'); };
    $('#jc-voice').addEventListener('change', (e) => { NV.setSetting('voice', e.target.value); NV.jarvis.refreshVoices(); NV.jarvis.speak('Voice matrix recalibrated, Sir. How do I sound?'); });
    $('#jc-rate').addEventListener('input', (e) => { NV.setSetting('vrate', +e.target.value); syncSettings(); });
    $('#jc-pitch').addEventListener('input', (e) => { NV.setSetting('vpitch', +e.target.value); syncSettings(); });
    ['#jc-rate', '#jc-pitch'].forEach((s) => $(s).addEventListener('change', () => NV.jarvis.speak('Testing, testing. Still British, Sir.')));
    $('#jc-test').onclick = () => NV.jarvis.speak(NV.pick(['Good evening, Nicholas. All systems nominal and the tea is, regrettably, imaginary.', 'Voice check complete, Sir. I sound marvellous, if I say so myself.', 'Testing. One, two, three. That is as high as I count for free, Sir.']));
    NV.$$('#mod-jc [data-set]').forEach((i) => i.addEventListener('change', () => { NV.setSetting(i.dataset.set, i.checked); NV.audio.click(i.checked ? 1.2 : 0.8); if (i.dataset.set === 'wake' && i.checked && NV.voice.supported) NV.toast('Wake phrase on. Say “Jarvis” then your request, Sir.', 2600); if (i.dataset.set === 'wake' && Notification && Notification.permission === 'default') { /* only reminders ask for notifications */ } }));
    NV.on('ask', ({ q, source }) => add(q, 'me', source));
    NV.on('jsay', ({ text, tag }) => add(text, 'jv', tag));
    NV.on('memory', () => { if (NV.tools.active === 'jarvis') renderMem(); });
    NV.on('reminders', () => { renderRem(); const n = NV.brain.reminders().length; NV.text('#jc-state', n ? n + ' REMINDER' + (n > 1 ? 'S' : '') : 'ONLINE'); });
    NV.on('voices', syncSettings);
    NV.on('voice-state', (s) => { const b = $('#jc-mic'); if (!b) return; b.classList.toggle('on', s === 'listening'); b.classList.toggle('wake', s === 'wake'); b.setAttribute('aria-pressed', s === 'listening'); NV.text('#jc-state', s === 'listening' ? 'LISTENING' : s === 'wake' ? 'WAKE: “JARVIS”' : 'ONLINE'); });
    NV.onSetting((k) => { if (['speak', 'wake', 'quips', 'vrate', 'vpitch', 'voice'].includes(k)) syncSettings(); });
    // Reminders: ask for notification permission on the first one (only if the user opted to create one)
    NV.on('reminders', () => { if (window.Notification && Notification.permission === 'default' && NV.brain.reminders().length && !C.askedN) { C.askedN = true; try { Notification.requestPermission().catch(() => {}); } catch (e) { /* older API */ } } });
    renderRem();
  };
})();
