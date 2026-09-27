/* NICK-VERSE Scanner: J.A.R.V.I.S.-style assistant (Web Speech API). British, formal, dryly witty. */
(function () {
  'use strict';
  const NV = window.NV, pick = NV.pick;
  const J = (NV.jarvis = { speaking: false, level: 0 });
  const synth = window.speechSynthesis || null;
  let voices = [], canvas, ctx, S = 0, dpr = 1, lastAuto = 0;

  const L = J.lines = {
    quips: [
      'I have scanned the room, Sir. It remains stubbornly a room.',
      'Sensors nominal. Imagination, as ever, running slightly hot.',
      'Should anything suspicious appear, I shall describe it in unnecessary detail.',
      'The scanner is calibrated to one part in a million. The other parts are educated guesswork.',
      'CINCO Corporation assures me this device is mostly harmless. I have asked for that in writing.',
      'For the record, pointing the scanner at the fridge will not produce new snacks. I have checked.',
      'Might I suggest scanning something interesting? The ceiling has now been scanned four times.',
      'Another day, another perfectly ordinary anomaly.',
      'I remain on standby, Sir. Poised, alert, and faintly judgemental.',
      'If the Nick-Verse requires saving, I recommend doing so after lunch.',
      'All readings are within tolerance, Sir. Mine is wearing thin, but the readings are fine.',
      'I have detected an elevated level of brilliance nearby. It is either you, Sir, or the lamp.',
      'Scanning is rather like tidying, Sir. Satisfying, and nobody else notices.'
    ],
    shake: ['Vigorous, Sir. The accelerometer is impressed.', 'I felt that. We all felt that.', 'Shake detected. It is not a snow globe, Sir, though I admire the optimism.', 'Kindly refrain from shaking the scanner. I keep my thoughts in there.', 'Seismic activity detected. Source: you.'],
    red: ['Red alert, Sir. I have taken the liberty of panicking on your behalf.', 'Shields are up. Metaphorically. We have no shields.', 'All hands to battle stations. That is to say, both of your hands.', 'The threat is being monitored. It appears to be monitoring us back.', 'Might I recommend a dramatic pose? It will not help, but it will look splendid.', 'Situation critical. Snack reserves at eleven percent.', 'I have notified the authorities. By which I mean I have written it in the log.', 'Remain calm, Sir. I am remaining calm for both of us, and it is exhausting.'],
    standDown: ['Standing down, Sir. My circuits thank you.', 'Red alert cancelled. Resuming my usual state of mild concern.', 'Crisis averted. I shall pretend I was never worried.'],
    level: ['Perfectly level, Sir. A spirit level would weep with envy.', 'Level achieved. Your tabletop is officially trustworthy.', 'Flat as a pancake, Sir. A well-made pancake.'],
    loud: ['That was rather loud, Sir. My microphone has filed a complaint.', 'Decibels are climbing. Shall I fetch the earmuffs?', 'I detect considerable noise. I trust it is applause.'],
    dark: ['It is rather dark, Sir. Shall I fetch some photons?', 'Low light detected. Ideal for brooding, less ideal for scanning.'],
    qr: ['Code decoded, Sir. I have not opened it. One does not simply click links.', 'Barcode read. It says what it says, and I say nothing further.'],
    torch: ['Illumination engaged. Do try not to blind the cat.', 'Let there be light. Within reason.'],
    party: ['Party protocol engaged. I have been assured this is fun.', 'Confetti deployed. I shall be finding it in my circuits for weeks.'],
    stealth: ['Going dark, Sir. I shall whisper from here on.', 'Stealth protocol active. Nobody can see us. Probably.'],
    standard: ['Standard protocol restored. Everything is delightfully ordinary again.'],
    konami: ['Executive override accepted. Welcome to the gold tier, Sir. CINCO is already invoicing you.'],
    recall: ['A CINCO recall notice, Sir. I recommend we do nothing and hope for the best.', 'Another recall. CINCO quality control remains a theoretical concept.'],
    buy: ['Sir, I intercepted the purchase. Nothing was bought. You are welcome.', 'I have blocked that transaction on the grounds of good taste.'],
    contact: ['Contact noted, Sir. It appears harmless, if a touch smug.', 'I have logged the contact. It did not wave back.', 'Unidentified, unbothered, and, frankly, unremarkable.']
  };

  function greetingFor(h) { return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  J.greeting = () => greetingFor(new Date().getHours());

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    const sel = NV.$('#set-voice'); if (!sel) return;
    const en = voices.filter((v) => /^en/i.test(v.lang)), list = en.length ? en : voices;
    sel.innerHTML = '<option value="">Auto (British preferred)</option>' + list.map((v) => `<option value="${NV.esc(v.name)}">${NV.esc(v.name)} (${NV.esc(v.lang)})</option>`).join('');
    sel.value = NV.settings.voice || '';
    const v = chooseVoice();
    NV.text('#jv-voice', v ? `Voice: ${v.name} (${v.lang})` : 'Voice: system default (en-GB requested)');
  }
  function chooseVoice() {
    if (!voices.length) return null;
    if (NV.settings.voice) { const v = voices.find((x) => x.name === NV.settings.voice); if (v) return v; }
    const gb = voices.filter((v) => /en[-_]GB/i.test(v.lang));
    const pref = ['Daniel', 'Google UK English Male', 'Arthur', 'Oliver', 'George', 'Ryan', 'Microsoft Ryan', 'UK English Male', 'Malcolm'];
    for (const p of pref) { const v = gb.find((x) => x.name.includes(p)) || voices.find((x) => x.name.includes(p) && /en/i.test(x.lang)); if (v) return v; }
    return gb.find((v) => /male/i.test(v.name)) || gb[0] || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
  }

  let typing = null;
  function log(text, tag = 'JARVIS') {
    const box = NV.$('#jv-log'); if (!box) return;
    NV.$$('p', box).forEach((p) => p.classList.add('old'));
    while (box.children.length > 6) box.firstChild.remove();
    const p = NV.el('p'); p.innerHTML = `<b>${NV.esc(tag)}</b><span></span><i class="caret"></i>`; box.appendChild(p);
    const span = p.querySelector('span'); let i = 0;
    if (typing) { clearInterval(typing.id); typing.finish(); }
    const finish = () => { span.textContent = text; const c = p.querySelector('.caret'); if (c) c.remove(); box.scrollTop = box.scrollHeight; };
    const id = setInterval(() => { i += 2; span.textContent = text.slice(0, i); box.scrollTop = box.scrollHeight; if (i >= text.length) { clearInterval(id); finish(); typing = null; } }, 16);
    typing = { id, finish };
  }
  function setState(s) { NV.text('#jv-state', s); }
  function fakeSpeak(text) { J.speaking = true; setState('SPEAKING'); setTimeout(() => { J.speaking = false; setState('ONLINE'); }, 600 + text.length * 50); }
  function speak(text, { silentLog = false, quiet = false, tag } = {}) {
    if (!silentLog) log(text, tag);
    if (!synth || !NV.settings.speak) { fakeSpeak(text); return; }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = chooseVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
      u.rate = 0.98; u.pitch = 0.92;
      const stealth = document.body.classList.contains('stealth-mode');
      u.volume = NV.clamp((NV.settings.volume + 0.2) * (quiet || stealth ? 0.4 : 1), 0, 1);
      const end = () => { J.speaking = false; setState('ONLINE'); };
      u.onend = end; u.onerror = end;
      J.speaking = true; setState('SPEAKING');
      synth.speak(u);
      setTimeout(() => { if (J.speaking && !synth.speaking) end(); }, 500 + text.length * 90);
    } catch (e) { fakeSpeak(text); }
  }
  J.speak = speak; J.log = log;
  J.say = (key, opts) => speak(pick(L[key] || L.quips), opts);
  J.auto = (key, minGap = 9000) => { if (!NV.settings.commentary) return; const n = performance.now(); if (n - lastAuto < minGap) return; lastAuto = n; J.say(key); };
  J.quip = () => J.say('quips');

  J.briefing = function () {
    const d = new Date(), st = NV.status || {}, s = NV.sensors, th = NV.threat || {};
    const tm = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const p = [`${greetingFor(d.getHours())}, Sir. Status briefing. The time is ${tm}.`];
    if (st.battery != null) p.push(`Power cell at ${Math.round(st.battery * 100)} percent${st.charging ? ' and charging' : ''}.`); else p.push('Power telemetry is unavailable; I shall assume you are plugged into something impressive.');
    p.push(navigator.onLine ? 'Uplink is stable.' : 'We are offline, Sir. Fortunately, I am not.');
    if (s) p.push(`Heading ${Math.round(s.heading)} degrees, roughly ${NV.cardinal(s.heading).split('').map((c) => ({ N: 'north', S: 'south', E: 'east', W: 'west' }[c])).join(' ')}${s.headingSrc === 'sim' ? ', simulated' : ''}.`);
    const au = NV.meter; if (au && au.active) p.push(`Ambient sound is about ${Math.round(au.db)} decibels.`);
    if (th.value != null) p.push(`Threat index ${Math.round(th.value)}, ${th.name.toLowerCase()}.`);
    const n = NV.log ? NV.log.count() : 0; p.push(n ? `The scan log holds ${n} ${n === 1 ? 'entry' : 'entries'}.` : 'The scan log is empty. Awaiting your curiosity.');
    p.push(pick(['All systems nominal.', 'Everything is running smoothly. Suspiciously so.', 'The Nick-Verse is secure, for now.', 'I have nothing further, except my undying professionalism.']));
    speak(p.join(' '), { tag: 'BRIEF' });
  };
  J.analyse = function () {
    const s = NV.sensors, au = NV.meter, cam = NV.cam, th = NV.threat || {};
    const p = ['Environmental analysis.'];
    if (au && au.active) { const db = Math.round(au.db); p.push(`Ambient noise ${db} decibels, ${db < 35 ? 'a library with the lights off' : db < 55 ? 'civilised conversation levels' : db < 75 ? 'lively, bordering on a family dinner' : 'approaching rock concert territory'}.`); }
    else p.push('The microphone is resting. I shall assume a dignified silence.');
    const tilt = Math.hypot(s.ori.beta, s.ori.gamma);
    p.push(tilt < 5 ? 'The device is level and composed.' : tilt < 30 ? `Device tilted about ${Math.round(tilt)} degrees. Jaunty.` : `Device tilted ${Math.round(tilt)} degrees. Either you are lying down, or we are sinking.`);
    if (cam && cam.luma != null) p.push(cam.luma < 0.18 ? 'Light levels are low. Mood lighting, or a cupboard.' : cam.luma > 0.75 ? 'It is very bright. Sunglasses advised.' : 'Light levels are adequate.');
    p.push(th.value > 60 ? 'Threat level is concerning. I suggest a brisk walk in the opposite direction.' : 'No credible threats. Several incredible ones.');
    speak(p.join(' '), { tag: 'ANALYSIS' });
  };

  function resize() { if (!canvas) return; const r = canvas.getBoundingClientRect(); if (!r.width) return; dpr = NV.dpr(); S = r.width; canvas.width = canvas.height = Math.round(S * dpr); }
  J.draw = function (t) {
    if (!canvas || !canvas.offsetParent) return;
    if (!S || canvas.width !== Math.round(S * dpr)) resize(); if (!S) return;
    const c = NV.colors, x = ctx, R = S * 0.42, tt = t / 1000;
    J.level = NV.lerp(J.level, J.speaking ? 0.55 + 0.45 * Math.abs(Math.sin(tt * 9) * Math.sin(tt * 3.7)) : 0.08, 0.15);
    x.setTransform(dpr, 0, 0, dpr, S / 2 * dpr, S / 2 * dpr); x.clearRect(-S / 2, -S / 2, S, S);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, R * 1.1);
    g.addColorStop(0, NV.rgba(c.secondary, 0.35 + J.level * 0.4)); g.addColorStop(0.4, NV.rgba(c.primary, 0.12 + J.level * 0.2)); g.addColorStop(1, NV.rgba(c.primary, 0));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 1.1, 0, Math.PI * 2); x.fill();
    const N = 56; x.lineCap = 'round'; x.shadowColor = c.primary; x.shadowBlur = 8 * dpr;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + tt * 0.2;
      const n = 0.5 + 0.5 * Math.sin(i * 0.9 + tt * 6) * Math.sin(i * 0.37 - tt * 3.3);
      const len = R * (0.08 + J.level * 0.34 * n + 0.03 * Math.sin(tt * 2 + i)), r0 = R * 0.62;
      x.strokeStyle = i % 2 ? c.primary : c.secondary; x.lineWidth = Math.max(1.2, S * 0.012);
      x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len)); x.stroke();
    }
    x.lineWidth = 1.5; x.strokeStyle = NV.rgba(c.primary, 0.7);
    x.beginPath(); x.arc(0, 0, R * 0.56, tt, tt + Math.PI * 1.4); x.stroke();
    x.strokeStyle = NV.rgba(c.secondary, 0.5);
    x.beginPath(); x.arc(0, 0, R * 0.5, -tt * 1.5, -tt * 1.5 + Math.PI * 0.8); x.stroke();
    x.beginPath(); x.arc(0, 0, R * 1.02, -tt * 0.4, -tt * 0.4 + Math.PI * 0.5); x.stroke();
    x.beginPath(); x.arc(0, 0, R * 1.02, -tt * 0.4 + Math.PI, -tt * 0.4 + Math.PI * 1.5); x.stroke();
    const cr = R * (0.28 + J.level * 0.08), cg = x.createRadialGradient(0, 0, 0, 0, 0, cr);
    cg.addColorStop(0, '#fff'); cg.addColorStop(0.5, c.secondary); cg.addColorStop(1, NV.rgba(c.primary, 0.2));
    x.shadowBlur = 24 * dpr; x.fillStyle = cg; x.beginPath(); x.arc(0, 0, cr, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0;
    x.font = `700 ${S * 0.09}px Orbitron, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = NV.rgba(c.bg, 0.85);
    x.fillText('J', 0, 1);
  };

  J.init = function () {
    canvas = NV.$('#jv-canvas'); ctx = canvas.getContext('2d');
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    if (synth) { loadVoices(); if ('onvoiceschanged' in synth) synth.onvoiceschanged = loadVoices; setTimeout(loadVoices, 800); }
    else NV.text('#jv-voice', 'Speech synthesis unavailable: text mode');
    log(`${J.greeting()}, Sir. Scanner online. Every sensor is awake, which is more than can be said for some of us.`);
  };
  J.refreshVoices = loadVoices;
})();
