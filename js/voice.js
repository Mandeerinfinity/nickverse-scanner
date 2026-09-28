/* NICK-VERSE Scanner: voice input via the Web Speech API (SpeechRecognition). Commands are answered by NV.brain.
   Optional wake phrase: with "wake" on, the mic listens continuously and acts on phrases beginning with "Jarvis". */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const V = (NV.voice = { supported: !!SR, listening: false, wakeOn: false });
  let rec = null, hideT = 0, gotFinal = false, mode = 'once', armedUntil = 0, restartT = 0, fails = 0;
  const WAKE = /\b(jarvis|jervis|javis|jarvus|service)\b[\s,.:!]*/i;
  V.handle = (raw, opts = {}) => {
    const txt = String(raw || '').trim();
    NV.text('#voice-text', '“' + txt + '”');
    if (!txt) { NV.audio.deny(); return false; }
    const r = NV.brain.ask(txt, { source: opts.source || 'voice' });
    if (r.ok) NV.award('voice');
    return !!r.ok;
  };
  function ui(state, text) {
    const b = $('#btn-voice'), pill = $('#voice-pill'); clearTimeout(hideT);
    const live = state === 'listening' || state === 'wake';
    b.setAttribute('aria-pressed', live); b.classList.toggle('listening', state === 'listening'); b.classList.toggle('wake', state === 'wake');
    document.documentElement.classList.toggle('wake-on', state === 'wake');
    if (text != null) NV.text('#voice-text', text);
    pill.classList.toggle('live', live);
    if (state === 'idle') hideT = setTimeout(() => { pill.hidden = true; }, 1800); else if (state === 'wake') hideT = setTimeout(() => { pill.hidden = true; }, 2600); else pill.hidden = false;
    NV.emit('voice-state', state);
  }
  function build(continuous) {
    const r = new SR(); r.lang = 'en-GB'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = continuous; return r;
  }
  function onWakeResult(e) {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i], t = res[0].transcript.trim(); if (!t) continue;
      const m = t.match(WAKE), armed = performance.now() < armedUntil;
      if (!res.isFinal) { if (m || armed) { ui('listening', t + '…'); NV.jarvis.level = 0.3; } continue; }
      if (m) {
        const rest = t.slice(m.index + m[0].length).trim();
        if (rest.length > 1) { armedUntil = 0; V.handle(rest); }
        else { armedUntil = performance.now() + 7000; NV.audio.open(); NV.jarvis.speak(NV.pick(['Sir?', 'Yes, Nicholas?', 'Listening, Sir.', 'At your service.']), { tag: 'VOICE' }); }
      } else if (armed) { armedUntil = 0; V.handle(t); }
      setTimeout(() => { if (V.wakeOn && !V.listening) return; ui('wake', 'Say “Jarvis…”'); }, 1200);
    }
  }
  function startWake() {
    if (!SR || !NV.settings.wake || mode === 'once') return;
    clearTimeout(restartT);
    try {
      rec = build(true); mode = 'wake';
      rec.onstart = () => { V.wakeOn = true; fails = 0; ui('wake', 'Wake phrase active: say “Jarvis…”'); };
      rec.onresult = onWakeResult;
      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') { NV.setSetting('wake', false); NV.toast('Wake phrase switched off: the microphone is unavailable, Sir.', 3200); }
        else fails++;
      };
      rec.onend = () => {
        V.wakeOn = false;
        if (NV.settings.wake && mode === 'wake' && !document.hidden && fails < 5) restartT = setTimeout(startWake, fails ? 1500 * fails : 250);
        else if (mode === 'wake') ui('idle', 'Wake phrase paused.');
      };
      rec.start();
    } catch (e) { V.wakeOn = false; }
  }
  function stopRec() { clearTimeout(restartT); const r = rec; rec = null; if (r) { r.onend = null; try { r.abort(); } catch (e) { /* ignore */ } } V.wakeOn = false; }
  V.setWake = (on) => {
    if (on && !SR) { NV.toast('Wake phrase needs speech recognition (Chrome or Safari), Sir.', 3000); NV.setSetting('wake', false); return; }
    if (on) { stopRec(); mode = 'wake'; startWake(); } else { if (mode === 'wake') { mode = 'off'; stopRec(); ui('idle', 'Wake phrase off.'); } }
  };
  V.start = () => {
    if (!SR) { NV.audio.deny(); NV.toast('Voice commands are not supported in this browser, Sir (try Chrome or Safari). Opening the command palette instead.', 3600); setTimeout(() => NV.tools.openPalette(), 400); return; }
    if (V.listening) return;
    const wasWake = mode === 'wake'; stopRec();
    try {
      rec = build(false); mode = 'once'; gotFinal = false;
      rec.onstart = () => { V.listening = true; ui('listening', 'Listening, Sir…'); NV.audio.open(); NV.haptic(12); };
      rec.onresult = (e) => { let interim = '', fin = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; } if (interim) NV.text('#voice-text', interim + '…'); if (fin) { gotFinal = true; V.handle(fin.replace(/^\s*jarvis[\s,]*/i, '') || fin); } };
      rec.onerror = (e) => {
        const msg = { 'not-allowed': 'Microphone access was declined, Sir. Voice commands need permission.', 'service-not-allowed': 'Speech recognition is disabled in this browser.', network: 'Speech recognition needs an internet connection in this browser, Sir.', 'no-speech': 'I did not hear anything, Sir.', 'audio-capture': 'No microphone was found.', 'language-not-supported': 'British English recognition is unavailable here.' }[e.error];
        if (msg) { NV.toast(msg, 3200); NV.text('#voice-text', msg); }
      };
      rec.onend = () => {
        V.listening = false; ui('idle', gotFinal ? null : $('#voice-text').textContent === 'Listening, Sir…' ? 'Nothing heard.' : null); NV.audio.close();
        if (NV.settings.wake) { mode = 'wake'; restartT = setTimeout(startWake, 900); }
      };
      rec.start(); ui('listening', 'Starting microphone…');
    } catch (e) { V.listening = false; ui('idle', 'Voice unavailable.'); NV.toast('Voice recognition could not start here, Sir.', 2600); if (wasWake) { mode = 'wake'; startWake(); } }
  };
  V.stop = () => { if (rec && V.listening) { try { rec.abort(); } catch (e) { /* ignore */ } } V.listening = false; ui('idle'); };
  V.toggle = () => (V.listening ? V.stop() : V.start());
  NV._init_voice = () => {
    const b = $('#btn-voice'); b.onclick = V.toggle;
    if (!SR) { b.classList.add('unsupported'); b.title = 'Voice commands not supported in this browser'; }
    NV.onSetting((key, value) => { if (key === 'wake') V.setWake(!!value); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && NV.settings.wake && mode === 'wake' && !V.wakeOn) startWake(); });
    // Browsers require a user gesture before the mic: resume wake mode on the first tap.
    if (NV.settings.wake && SR) { mode = 'wake'; const go = () => { window.removeEventListener('pointerdown', go, true); startWake(); }; window.addEventListener('pointerdown', go, true); }
  };
})();
