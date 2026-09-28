/* NICK-VERSE Scanner: voice commands via the Web Speech API (SpeechRecognition), with graceful fallback. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const V = (NV.voice = { supported: !!SR, listening: false });
  let rec = null, hideT = 0, gotFinal = false;
  const EXTRA = { achievements: 'badges', badges: 'badges', trophies: 'badges', compass: 'nav', navigation: 'nav', level: 'motion', motion: 'motion', sound: 'audio', decibel: 'audio', noise: 'audio', torch: 'light', flashlight: 'light', lux: 'light', stopwatch: 'timer', log: 'log', history: 'log', system: 'system', threat: 'threat', heart: 'heart', pulse: 'heart', 'heart rate': 'heart', metal: 'metal', 'metal detector': 'metal', magnet: 'metal', seismograph: 'seismo', earthquake: 'seismo', quake: 'seismo', sky: 'weather', stars: 'weather', 'star map': 'weather', moon: 'weather', guard: 'guard', perimeter: 'guard', colour: 'color', color: 'color', ruler: 'measure', protractor: 'measure', reader: 'ocr', text: 'ocr', ar: 'ar', 'a r': 'ar', augmented: 'ar' };
  function findTool(q) {
    q = q.trim(); if (!q) return null; const T = NV.tools.list;
    for (const [k, v] of Object.entries(EXTRA).sort((a, b) => b[0].length - a[0].length)) if (new RegExp('\\b' + k + '\\b').test(q)) return v;
    for (const t of T) { const names = [t.id, t.name.toLowerCase(), t.short.toLowerCase(), ...(t.alias || [])]; if (names.some((n) => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(q))) return t.id; }
    return null;
  }
  const say = (s) => NV.jarvis.speak(s, { tag: 'VOICE' });
  const toolName = (id) => (NV.tools.byId(id) || {}).name || id;
  V.handle = (raw) => {
    const q = String(raw || '').toLowerCase().replace(/[^\w\s']/g, ' ').replace(/\b(jarvis|please|could you|can you|would you|kindly)\b/g, ' ').replace(/\s+/g, ' ').trim();
    NV.text('#voice-text', '“' + String(raw || '').trim() + '”');
    let ok = true; const m = q.match(/\b(?:open|show|show me|go to|goto|launch|switch to|display|take me to|bring up)\s+(?:the\s+)?(.+)/);
    if (!q) ok = false;
    else if (/\b(red alert|battle stations)\b/.test(q)) { if (!NV.threat.red) NV.runProto('redalert'); else say('Red alert is already active, Sir.'); }
    else if (/\b(stand down|all clear|cancel( the)? alert|normal mode|standard mode|calm down)\b/.test(q)) NV.runProto('standard');
    else if (/\bdisarm\b/.test(q)) { if (NV.guard.state !== 'off') NV.guard.disarm(); else say('The perimeter is not armed, Sir.'); }
    else if (/\b(arm|activate|engage)\b.*\b(guard|perimeter|alarm)\b|\bperimeter guard\b|\bguard mode\b/.test(q)) { NV.runProto('guard'); }
    else if (/\bstealth\b/.test(q)) { if (!NV.isStealth()) NV.runProto('stealth'); else say('Already in stealth mode, Sir. Whispering now.'); }
    else if (/\bparty\b/.test(q)) { if (!NV.isParty()) NV.runProto('party'); else say('The party is already in progress, Sir.'); }
    else if (/\b(status|report|briefing|sitrep|how are (we|things))\b/.test(q)) NV.jarvis.briefing();
    else if (/\bdiagnostic/.test(q)) NV.runProto('diagnostics');
    else if (/\b(hotline|customer support|call cinco|support line)\b/.test(q)) NV.hotline.open();
    else if (/\b(palette|command menu)\b/.test(q)) NV.tools.openPalette();
    else if (/\b(launcher|all tools|menu)\b/.test(q)) NV.tools.openLauncher();
    else if (/\b(next|change|cycle|switch)\b.*\btheme\b|\btheme\b/.test(q)) { NV.cycleTheme(); say('Theme changed, Sir.'); }
    else if (/\bunmute\b|\bsound on\b/.test(q)) { NV.setSetting('uisound', true); say('Sound restored, Sir.'); }
    else if (/\b(mute|silence|sound off|be quiet)\b/.test(q)) { say('Muting sound effects. I shall remain eloquent.'); NV.setSetting('uisound', false); }
    else if (m && findTool(m[1])) { const id = findTool(m[1]); NV.showTab(id); say(`${toolName(id)}, Sir.`); }
    else if (/\b(scan|analy[sz]e|what is this|what am i looking at)\b/.test(q)) { NV.showTab('scan'); const go = () => NV.cam.scan(); if (NV.cam.active()) setTimeout(go, 350); else NV.cam.start().then(() => setTimeout(go, 700)); }
    else if (/\b(weather|forecast|temperature|raining)\b/.test(q)) { NV.showTab('weather'); setTimeout(() => NV.mods.weather.primary && NV.mods.weather.primary(), 500); }
    else if (/\b(what time|the time|time is it)\b/.test(q)) say(`It is ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, Sir.`);
    else if (/\bjoke\b/.test(q)) NV.jarvis.quip();
    else if (/\b(thank|thanks|cheers|good job|well done)\b/.test(q)) say(NV.pick(['Always a pleasure, Sir.', 'You are most welcome, Sir.', 'Just doing my job, Sir. Rather well, I might add.']));
    else if (/\b(hello|hi|hey|good (morning|afternoon|evening))\b/.test(q)) say(NV.pick(['Hello, Sir. What shall we scan today?', 'At your service, Sir.']));
    else if (/\b(who are you|your name)\b/.test(q)) say('I am JARVIS, your scanner butler. I do the thinking; you do the pointing.');
    else if (findTool(q)) { const id = findTool(q); NV.showTab(id); say(`${toolName(id)}, Sir.`); }
    else ok = false;
    if (ok) { NV.award('voice'); NV.audio.confirm(); }
    else { NV.audio.deny(); say('I am afraid I did not catch that, Sir. Try “open radar”, “red alert” or “status report”.'); }
    return ok;
  };
  function ui(state, text) {
    const b = $('#btn-voice'), pill = $('#voice-pill'); clearTimeout(hideT);
    b.setAttribute('aria-pressed', state === 'listening'); b.classList.toggle('listening', state === 'listening');
    if (text != null) NV.text('#voice-text', text);
    pill.classList.toggle('live', state === 'listening');
    if (state === 'idle') hideT = setTimeout(() => { pill.hidden = true; }, 1800); else pill.hidden = false;
  }
  V.start = () => {
    if (!SR) { NV.audio.deny(); NV.toast('Voice commands are not supported in this browser, Sir (try Chrome or Safari). Opening the command palette instead.', 3600); setTimeout(() => NV.tools.openPalette(), 400); return; }
    if (V.listening) return;
    try {
      rec = new SR(); rec.lang = 'en-GB'; rec.interimResults = true; rec.maxAlternatives = 3; rec.continuous = false; gotFinal = false;
      rec.onstart = () => { V.listening = true; ui('listening', 'Listening, Sir…'); NV.audio.open(); NV.haptic(12); };
      rec.onresult = (e) => { let interim = '', fin = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; } if (interim) NV.text('#voice-text', interim + '…'); if (fin) { gotFinal = true; V.handle(fin); } };
      rec.onerror = (e) => {
        const msg = { 'not-allowed': 'Microphone access was declined, Sir. Voice commands need permission.', 'service-not-allowed': 'Speech recognition is disabled in this browser.', network: 'Speech recognition needs an internet connection in this browser, Sir.', 'no-speech': 'I did not hear anything, Sir.', 'audio-capture': 'No microphone was found.', 'language-not-supported': 'British English recognition is unavailable here.' }[e.error];
        if (msg) { NV.toast(msg, 3200); NV.text('#voice-text', msg); }
      };
      rec.onend = () => { V.listening = false; ui('idle', gotFinal ? null : $('#voice-text').textContent === 'Listening, Sir…' ? 'Nothing heard.' : null); NV.audio.close(); };
      rec.start(); ui('listening', 'Starting microphone…');
    } catch (e) { V.listening = false; ui('idle', 'Voice unavailable.'); NV.toast('Voice recognition could not start here, Sir.', 2600); }
  };
  V.stop = () => { if (rec && V.listening) { try { rec.abort(); } catch (e) { /* ignore */ } } V.listening = false; ui('idle'); };
  V.toggle = () => (V.listening ? V.stop() : V.start());
  NV._init_voice = () => {
    const b = $('#btn-voice'); b.onclick = V.toggle;
    if (!SR) { b.classList.add('unsupported'); b.title = 'Voice commands not supported in this browser'; }
  };
})();
