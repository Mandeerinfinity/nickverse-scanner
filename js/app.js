/* NICK-VERSE Scanner: bootstrap, theme engine, render loop, input, protocols, easter eggs, PWA */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, S = NV.settings, SN = NV.sensors;
  const params = new URLSearchParams(location.search);

  // ---------- Theme engine ----------
  const KEYS = ['primary', 'secondary', 'tertiary', 'bg', 'bg1'];
  const pickColors = (t) => KEYS.reduce((o, k) => ((o[k] = t[k]), o), {});
  NV.colors = Object.assign(pickColors(NV.themeById(S.theme)), { v: 1 });
  const override = { red: false, stealth: false };
  let themeAnim = null, party = null;
  const effective = () => (override.red ? 'redalert' : override.stealth ? 'stealth' : S.theme);
  function applyTheme(id, animate = true) {
    const th = NV.themeById(id);
    document.body.dataset.theme = th.id;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = th.bg1;
    NV.$$('.theme-card').forEach((b) => { const on = b.dataset.theme === S.theme; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
    if (!animate || NV.reducedMotion) { Object.assign(NV.colors, pickColors(th)); NV.colors.v++; themeAnim = null; return; }
    themeAnim = { from: pickColors(NV.colors), to: pickColors(th), start: performance.now(), dur: 900 };
  }
  function stepTheme(now) {
    if (party) { const h = (now / 6.6) % 360; NV.colors.primary = hsl(h, 100, 62); NV.colors.secondary = hsl(h + 40, 100, 86); NV.colors.tertiary = hsl(h + 180, 100, 60); NV.colors.v++; return; }
    if (!themeAnim) return;
    const k = NV.ease(NV.clamp((now - themeAnim.start) / themeAnim.dur, 0, 1));
    KEYS.forEach((key) => { NV.colors[key] = NV.mixHex(themeAnim.from[key], themeAnim.to[key], k); }); NV.colors.v++;
    if (k >= 1) themeAnim = null;
  }
  function hsl(h, s, l) { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return NV.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255); }
  NV.hslHex = hsl;
  NV.setPalette = (id) => { override.red = id === 'redalert'; applyTheme(effective()); };
  const themes = () => NV.THEMES.filter((t) => !t.secret || S.secret);
  function setTheme(id) { if (id === S.theme) return; NV.setSetting('theme', id); override.stealth = false; document.body.classList.remove('stealth-mode'); applyTheme(effective()); NV.audio.confirm(); burstCenter(36); }
  function cycleTheme(dir = 1) { const list = themes(), i = list.findIndex((t) => t.id === S.theme); setTheme(list[(i + dir + list.length) % list.length].id); NV.toast('Theme: ' + NV.themeById(S.theme).name, 1800); }
  NV.setTheme = setTheme; NV.cycleTheme = cycleTheme;
  function buildThemeCards() {
    const cards = $('#theme-cards'); cards.innerHTML = '';
    themes().forEach((t) => { const c = NV.el('button', { class: 'theme-card' + (t.secret ? ' secret' : ''), 'data-theme': t.id, role: 'radio' }); c.innerHTML = `<span class="sw" style="background:${t.swatch};box-shadow:0 0 10px ${t.primary}"></span>${t.name}`; c.onclick = () => setTheme(t.id); cards.appendChild(c); });
    applyTheme(effective(), false);
  }
  function burstCenter(n) { const r = $('#modules').getBoundingClientRect(); NV.bg.burst(r.left + r.width / 2, r.top + Math.min(r.height, innerHeight) / 2, n); }

  // ---------- Modals / drawer ----------
  let lastFocus = null;
  const openSet = new Set(); NV.covered = () => openSet.size > 0;
  NV.openModal = (id) => { const m = $('#' + id); openSet.add(id); if (!m.classList.contains('open')) { lastFocus = document.activeElement; NV.audio.open(); } m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); };
  NV.closeModal = (id) => {
    const m = $('#' + id); openSet.delete(id); if (!m.classList.contains('open')) return; m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); NV.audio.close();
    if (id === 'promo') NV.cinco.close(); if (id === 'hotline') NV.hotline.close();
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  };
  function toggleDrawer(force) { const d = $('#settings'); const open = force ?? !d.classList.contains('open'); if (open === d.classList.contains('open')) return; d.classList.toggle('open', open); d.setAttribute('aria-hidden', !open); open ? NV.audio.open() : NV.audio.close(); }
  function toggleFullscreen() { const doc = document, el = doc.documentElement, fs = doc.fullscreenElement || doc.webkitFullscreenElement; try { if (!fs) (el.requestFullscreen || el.webkitRequestFullscreen).call(el); else (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); } catch (e) { NV.toast('Fullscreen is not supported here.'); } }
  NV.toggleDrawer = toggleDrawer; NV.toggleFullscreen = toggleFullscreen;
  NV.openSettings = (sec) => { toggleDrawer(true); const el = sec && $('#set-' + (sec === 'quality' ? 'perf' : sec)); if (el) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: NV.reducedMotion ? 'auto' : 'smooth' }), 120); };

  // ---------- Settings ----------
  const MAP = { 'set-fpshud': 'fpshud', 'set-quips': 'quips', 'set-wake': 'wake', 'set-particles': 'particles', 'set-scanlines': 'scanlines', 'set-parallax': 'parallax', 'set-uisound': 'uisound', 'set-haptics': 'haptics', 'set-speak': 'speak', 'set-commentary': 'commentary', 'set-forcesim': 'forcesim', 'set-wakelock': 'wakelock', 'set-ads': 'ads', 'set-recalls': 'recalls', 'set-hum': 'hum', 'set-reducemotion': 'reducemotion' };
  function bindSettings() {
    Object.entries(MAP).forEach(([id, key]) => { const el = $('#' + id); if (!el) return; el.checked = !!S[key]; el.addEventListener('change', () => { NV.setSetting(key, el.checked); NV.audio.click(el.checked ? 1.2 : 0.8); NV.haptic(8); }); });
    ['volume', 'sfxlevel', 'musiclevel'].forEach((k) => { const el = $('#set-' + k); el.value = S[k]; NV.text('#set-' + k + '-v', String(Math.round(S[k] * 100))); el.addEventListener('input', (e) => { NV.setSetting(k, +e.target.value); NV.text('#set-' + k + '-v', String(Math.round(e.target.value * 100))); }); el.addEventListener('change', () => NV.audio.confirm()); });
    $('#set-soundtest').onclick = () => { NV.audio.bootUp(); setTimeout(() => NV.audio.badge(), 1300); };
    $('#set-micoffset').value = S.micoffset; NV.text('#set-micoffset-v', String(S.micoffset)); $('#set-micoffset').addEventListener('input', (e) => { NV.setSetting('micoffset', +e.target.value); NV.text('#set-micoffset-v', e.target.value); });
    $('#set-voice').addEventListener('change', (e) => { NV.setSetting('voice', e.target.value); NV.jarvis.refreshVoices(); NV.jarvis.speak('Voice matrix recalibrated, Sir.'); });
    $('#set-reset').onclick = () => { NV.store.del('settings'); location.reload(); };
    const qSeg = $('#set-quality'), markQ = () => { NV.$$('button', qSeg).forEach((b) => { const on = b.dataset.q === (S.quality || 'auto'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.setAttribute('role', 'radio'); }); NV.text('#quality-note', (S.quality || 'auto') === 'auto' ? `Auto (now ${NV.perf.t.name}) watches the frame rate and steps effects down if frames take longer than 16.7 ms.` : `Fixed at ${NV.perf.t.name}. Auto adapts to the device instead.`); };
    NV.$$('button', qSeg).forEach((b) => (b.onclick = () => { NV.perf.set(b.dataset.q); NV.audio.click(1.1); NV.haptic(8); markQ(); NV.toast('Graphics quality: ' + NV.perf.label(), 1800); }));
    markQ(); NV.on('quality', markQ);
    if (NV.osReducedMotion) NV.text('#rm-note', 'Your system asks for reduced motion, so animations are already minimised.');
    NV.onSetting((k, v) => {
      const id = Object.keys(MAP).find((i) => MAP[i] === k); if (id && $('#' + id)) $('#' + id).checked = !!v;
      if (k === 'scanlines') document.body.classList.toggle('no-scanlines', !v);
      if (k === 'uisound') $('#btn-mute').setAttribute('aria-pressed', !v);
      if (k === 'wakelock') NV.wake('setting', v);
    });
    document.body.classList.toggle('no-scanlines', !S.scanlines); $('#btn-mute').setAttribute('aria-pressed', !S.uisound);
    document.documentElement.classList.toggle('reduce-motion', NV.reducedMotion);
    if (S.wakelock) NV.wake('setting', true);
  }

  // ---------- Parallax ----------
  const px = { x: 0, y: 0, tx: 0, ty: 0 }; let lastPX = 1e9, lastPY = 1e9, pxEls = null;
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; px.tx = (e.clientX / innerWidth - 0.5) * 2; px.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  document.addEventListener('mouseleave', () => { px.tx = px.ty = 0; });
  NV.parallax = px;
  function stepParallax() {
    if (SN.orientMode === 'live') { px.tx = NV.clamp(SN.ori.gamma / 30, -1, 1); px.ty = NV.clamp((SN.ori.beta - 40) / 30, -1, 1); }
    const on = S.parallax && !NV.reducedMotion && NV.perf.t.parallax;
    px.x = NV.lerp(px.x, on ? px.tx : 0, 0.06); px.y = NV.lerp(px.y, on ? px.ty : 0, 0.06);
    if (Math.abs(px.x - lastPX) < 0.002 && Math.abs(px.y - lastPY) < 0.002) return; lastPX = px.x; lastPY = px.y;
    if (!pxEls) pxEls = { mods: $('#modules'), glow: $('.bg-glow'), grid: $('.bg-grid') };
    const X = px.x * 14, Y = px.y * 14;
    pxEls.mods.style.transform = Math.abs(X) + Math.abs(Y) < 0.05 ? '' : `perspective(1600px) rotateX(${(-Y * 0.1).toFixed(2)}deg) rotateY(${(X * 0.1).toFixed(2)}deg)`;
    pxEls.glow.style.transform = `translate(${(-X * 0.6).toFixed(1)}px,${(-Y * 0.6).toFixed(1)}px)`;
    pxEls.grid.style.transform = `perspective(420px) rotateX(64deg) translateX(${(-X * 1.2).toFixed(1)}px)`;
  }

  // ---------- Readouts ----------
  function modeChip() {
    const m = SN.motionMode, o = SN.orientMode, live = [m, o].filter((v) => v === 'live').length;
    const txt = live === 2 ? 'SENSORS: LIVE' : live === 1 ? 'SENSORS: PARTIAL' : m === 'perm' ? 'SENSORS: TAP TO ENABLE' : m === 'wait' ? 'SENSORS: INIT' : 'SENSORS: SIMULATED';
    NV.text('#chip-mode-text', txt); $('#chip-mode .dot').classList.toggle('sim', live < 2);
    NV.motion.mode(); NV.nav.mode(); NV.emitCaps(); NV.emit('sensormode');
  }
  function arrayReadouts() {
    const h = Math.round(SN.heading) % 360; NV.text('#ar-heading', NV.pad(h, 3) + '°'); NV.text('#ar-heading-s', NV.cardinal(h) + (SN.headingSrc === 'sim' ? ' · sim' : ''));
    NV.text('#ar-tilt', `${Math.round(SN.ori.beta)}° ${Math.round(SN.ori.gamma)}°`); NV.text('#ar-tilt-s', SN.orientMode === 'live' ? 'pitch / roll' : 'pitch / roll · sim');
    NV.text('#ar-g', SN.g.toFixed(2) + 'g'); NV.text('#ar-g-s', 'peak ' + SN.peakG.toFixed(2) + 'g' + (SN.motionMode === 'live' ? '' : ' · sim'));
    const M = NV.meter; NV.text('#ar-db', M.active ? Math.round(M.db) + ' dB' : '-- dB'); NV.text('#ar-db-s', M.active ? (M.sim ? 'simulated' : 'mic live') : 'mic idle');
  }

  // ---------- Main loop (only the visible tool draws; hidden tools pause) ----------
  let last = performance.now(), frames = 0, fpsT = last, lastRead = 0, lastSec = 0, lastLight = 0, miniRadarVis = true, visCheck = 0, slowSecs = 0;
  NV.quality = 1;
  const CAM_TOOLS = new Set(['ar', 'color', 'ocr', 'heart', 'light']); let lastCamBg = 0;
  let frameIdx = 0, els = null;
  function loop(now) {
    const dt = now - last; last = now; frameIdx++;
    const tab = NV.tools.active, T = NV.perf.t, w0 = performance.now();
    if (!els) els = { radar: $('#radar'), mini: $('#mini-radar'), mods: $('#modules') };
    // Battery tier: tool canvases refresh at 30 Hz; the active tool is skipped entirely if scrolled out of view
    const covered = NV.covered(); // a full-screen modal hides the deck: pause every deck canvas
    const drawTool = !covered && (T.hz >= 60 || (frameIdx & 1) === 0) && NV.inView(els.mods);
    try {
      stepTheme(now); stepParallax();
      SN.tick(now); NV.motion.sample(); NV.meter.compute();
      if (now - lastLight > 100) { lastLight = now; NV.light.compute(now); }
      NV.threat.tick(now); NV.radar.update(now, dt);
      NV.bg.draw(dt, now); NV.fx.draw(dt);
      NV.emit('tick', { now, dt }); // background services (guard, seismic sampling)
      if (drawTool) switch (tab) {
        case 'scan': NV.cam.frame(now, true); break;
        case 'motion': NV.motion.frame(now); break;
        case 'nav': NV.nav.frame(now); break;
        case 'audio': NV.meter.frame(now); break;
        case 'threat': NV.threat.frame(now); break;
        case 'light': NV.light.frame(now); break;
        case 'radar': NV.radar.draw(els.radar, now, true); NV.radar.list(now); break;
        case 'timer': NV.timer.frame(now); break;
        default: if (NV.mods[tab] && NV.mods[tab].frame) NV.mods[tab].frame(now, dt);
      }
      // background camera analysis (feeds lux/threat); full rate only for camera tools, throttled elsewhere to save battery
      if (NV.cam.active() && (tab !== 'scan' || !drawTool) && now - lastCamBg > (CAM_TOOLS.has(tab) ? 60 : 200)) { lastCamBg = now; NV.cam.frame(now, false); }
      if (tab !== 'nav') NV.nav.dispH = NV.angLerp(NV.nav.dispH, SN.heading, 0.12);
      if (now - visCheck > 1000) { visCheck = now; miniRadarVis = NV.visible(els.mini); }
      if (!covered && miniRadarVis && NV.inView(els.mini) && (T.tier > 1 || (frameIdx & 1) === 0)) NV.radar.draw(els.mini, now, false);
      if (!covered) NV.jarvis.draw(now, frameIdx);
      if (NV.timer.running) NV.text('#chip-timer-text', NV.fmtDuration(NV.timer.elapsed(), false));
      if (now - lastRead > 100) { lastRead = now; arrayReadouts(); NV.nav.tickReadouts(); NV.meter.tickReadouts(); NV.light.tickReadouts(); }
      if (now - lastSec > 1000) { lastSec = now; NV.status.tick(); if (tab === 'system') NV.status.caps(); }
    } catch (e) { if (!loop._warned) { loop._warned = true; setTimeout(() => { throw e; }); } }
    frames++;
    NV.perf.frame(dt, performance.now() - w0, now);
    if (now - fpsT >= 1000) {
      const fps = frames * 1000 / (now - fpsT); NV.status.fps(fps); frames = 0; fpsT = now;
      // adaptive quality: lighten the ambient layer if we can't hold ~45 fps
      void slowSecs; NV.quality = NV.perf.tier >= 2 ? 1 : 0.5;
    }
    requestAnimationFrame(loop);
  }

  // ---------- Protocols ----------
  let partyTimer = null, partyBurst = null;
  function setStealth(on) {
    override.stealth = on; document.body.classList.toggle('stealth-mode', on); applyTheme(effective());
    if (on) { NV.jarvis.say('stealth', { quiet: true }); NV.audio.powerDown(); NV.award('stealth'); } markProto();
  }
  function setParty(on) {
    clearTimeout(partyTimer); clearInterval(partyBurst);
    if (on) {
      party = true; document.body.classList.add('party'); NV.audio.startLoop('party'); NV.fx.confetti(NV.reducedMotion ? 60 : 200); NV.jarvis.say('party'); NV.haptic([50, 50, 50, 50, 120]); NV.award('party');
      if (!NV.reducedMotion) partyBurst = setInterval(() => NV.fx.confetti(60, Math.random() * innerWidth, innerHeight * (0.2 + Math.random() * 0.3)), 1300);
      partyTimer = setTimeout(() => setParty(false), 14000);
    } else if (party) { party = null; document.body.classList.remove('party'); NV.audio.stopLoop(); if (NV.threat.red) NV.audio.startLoop('redalert'); applyTheme(effective()); }
    markProto();
  }
  NV.isParty = () => !!party; NV.isStealth = () => override.stealth;
  function diagnostics() {
    NV.showTab('system');
    const cam = NV.cam, steps = [
      ['Optical array', cam.live ? 'live camera' : cam.sim ? 'simulated feed' : navigator.mediaDevices ? 'ready, awaiting engagement' : 'unavailable'],
      ['Inertial unit', SN.motionMode === 'live' ? 'live' : 'simulated'],
      ['Magnetometer', 'Magnetometer' in window ? 'generic sensor available' : SN.headingSrc === 'magnetic' ? 'compass heading only' : 'simulated'],
      ['Acoustic sensor', NV.meter.active ? (NV.meter.sim ? 'simulated' : 'live') : 'idle'],
      ['Barcode engine', cam.qrSupported ? 'available' : 'not supported by this browser'],
      ['Text engine', 'TextDetector' in window ? 'native' : 'Tesseract.js on request'],
      ['Voice recognition', NV.voice && NV.voice.supported ? 'available' : 'not supported by this browser'],
      ['Haptics', navigator.vibrate ? 'available' : 'unavailable'],
      ['Sarcasm module', 'operating at 110%']
    ];
    steps.forEach(([k, v], i) => setTimeout(() => { NV.jarvis.log(`${k}: ${v}.`, 'DIAG'); NV.audio.blip(); }, 350 * i));
    setTimeout(() => NV.jarvis.speak('Diagnostics complete, Sir. Every system is either working, simulated, or pretending convincingly. The sarcasm module is, regrettably, flawless.', { tag: 'DIAG' }), 350 * steps.length + 300);
  }
  function runProto(p) {
    NV.closeModal('protocols'); NV.emit('proto', p);
    if (p === 'standard') { setParty(false); setStealth(false); NV.threat.setRed(false); NV.jarvis.say('standard'); }
    else if (p === 'stealth') setStealth(!override.stealth);
    else if (p === 'party') setParty(!party);
    else if (p === 'redalert') NV.threat.setRed(!NV.threat.red);
    else if (p === 'diagnostics') diagnostics();
    else if (p === 'briefing') NV.jarvis.briefing();
    else if (p === 'guard') { NV.showTab('guard'); setTimeout(() => NV.guard.arm(), 300); }
    else if (p === 'hotline') NV.hotline.open();
    else if (p === 'voice') NV.voice.toggle();
    setTimeout(markProto, 50);
  }
  NV.runProto = runProto;
  function markProto() { NV.$$('.proto').forEach((b) => b.classList.toggle('on', (b.dataset.proto === 'stealth' && override.stealth) || (b.dataset.proto === 'party' && !!party) || (b.dataset.proto === 'redalert' && NV.threat.red) || (b.dataset.proto === 'guard' && NV.guard && NV.guard.state !== 'off'))); }

  // ---------- Easter egg: CINCO Executive Gold ----------
  function unlockSecret() {
    if (!S.secret) { NV.setSetting('secret', true); buildThemeCards(); }
    NV.setSetting('theme', 'gold'); override.stealth = false; document.body.classList.remove('stealth-mode'); applyTheme(effective());
    NV.fx.confetti(220); NV.audio.cash(); NV.haptic([80, 40, 80, 40, 200]);
    NV.toast('★ SECRET UNLOCKED: CINCO Executive Gold theme', 5000); NV.jarvis.say('konami'); NV.award('gold');
  }
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']; let kpos = 0;
  let taps = [];

  // ---------- Keyboard ----------
  function primaryAction() {
    const tab = NV.tools.active;
    switch (tab) {
      case 'scan': NV.cam.scan(); break; case 'timer': NV.timer.toggle(); break; case 'audio': NV.meter.active ? NV.meter.stop() : NV.meter.start(); break;
      case 'threat': NV.threat.assess(); break; case 'light': NV.light.toggle(); break; case 'radar': NV.radar.doPulse(); break;
      case 'motion': SN.simShake(); break; case 'nav': $('#cmp-mark').click(); break;
      default: if (NV.mods[tab] && NV.mods[tab].primary) NV.mods[tab].primary(); else NV.jarvis.briefing();
    }
  }
  const CLASSIC = { 1: 'scan', 2: 'motion', 3: 'nav', 4: 'audio', 5: 'threat', 6: 'light', 7: 'radar', 8: 'system', 9: 'log', 0: 'timer' };
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === KONAMI[kpos]) { kpos++; if (kpos === KONAMI.length) { kpos = 0; unlockSecret(); return; } } else kpos = k === KONAMI[0] ? 1 : 0;
    if (e.target.matches('input, select, textarea') && e.key !== 'Escape') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'escape') {
      if ($('#guard-alarm').classList.contains('open')) return; // must hold to disarm
      if ($('#screenlight').classList.contains('open')) return NV.light.setOn(false);
      for (const id of ['palette', 'launcher', 'hotline', 'promo', 'log-detail', 'protocols', 'help']) if ($('#' + id).classList.contains('open')) return NV.closeModal(id);
      if ($('#settings').classList.contains('open')) return toggleDrawer(false);
      if (NV.cinco.closeRecall()) return;
      if (NV.voice && NV.voice.listening) return NV.voice.stop();
      if (NV.threat.red) return NV.threat.setRed(false);
      return;
    }
    if (document.querySelector('.modal.open')) return;
    if (kpos > 1 && k.startsWith('arrow')) return;
    if (/^[0-9]$/.test(k)) return NV.showTab(CLASSIC[k]);
    switch (k) {
      case ' ': e.preventDefault(); primaryAction(); break;
      case 'q': NV.showTab('scan'); NV.cam.setQr(!NV.cam.qr); break;
      case 'v': NV.cam.cycleFilter(); break;
      case 'l': NV.light.toggle(); break;
      case 'r': NV.threat.setRed(!NV.threat.red); break;
      case 'j': NV.jarvis.briefing(); break;
      case 'p': NV.openModal('protocols'); markProto(); break;
      case 't': cycleTheme(e.shiftKey ? -1 : 1); break;
      case 'm': NV.setSetting('uisound', !S.uisound); NV.toast(S.uisound ? 'Sound effects on.' : 'Sound effects muted.', 1600); break;
      case 'k': SN.simShake(); break;
      case 'f': toggleFullscreen(); break;
      case 's': toggleDrawer(); break;
      case 'g': NV.tools.openLauncher(); break;
      case 'c': NV.voice.toggle(); break;
      case 'h': NV.hotline.open(); break;
      case '[': NV.tools.step(-1); break;
      case ']': NV.tools.step(1); break;
      case '?': case '/': NV.openModal('help'); break;
    }
  }

  // ---------- Boot ----------
  function boot() {
    const el = $('#boot'); if (!el) return;
    const skip = params.has('noboot') || params.has('shot') || NV.reducedMotion;
    if (skip) { el.remove(); document.body.classList.add('booted'); return; }
    NV.buildTicks($('#boot-ticks'), 72, 6, 99, 96, 93);
    const grid = $('#boot-grid'); grid.innerHTML = NV.tools.list.map((t) => `<i title="${t.short}">${NV.ic(NV.icons[t.id])}</i>`).join('');
    const tiles = NV.$$('i', grid);
    const lines = ['Initialising NICK-VERSE sensor kernel', 'Polishing the optical array', 'Calibrating gyroscopic whatsits', 'Aligning the sky dome with the actual sky', 'Teaching the magnetometer to find spoons', 'Loading J.A.R.V.I.S. wit subroutines', 'Warming up the console and its dry wit', 'Tuning the spirit box (for comedy purposes)', 'Putting DJ Gary on hold', 'Consulting CINCO Corporation legal (again)', 'Mark XI systems ready'];
    const phases = ['PHASE 1 / 3 · KERNEL', 'PHASE 2 / 3 · SENSORS', 'PHASE 3 / 3 · PERSONALITY'];
    // title decode: letters resolve from noise (text only, ~0.8 s)
    const tNodes = [$('.boot-title').firstChild, $('.boot-title span')].filter(Boolean), finals = tNodes.map((n) => n.textContent), GL = '#%&@$*+=/<>01';
    let dec = 0; const decT = setInterval(() => { dec++; tNodes.forEach((n, k) => { const f = finals[k]; n.textContent = f.split('').map((ch, j) => (ch === ' ' || ch === '-' || j < dec - k * 3 ? ch : GL[(Math.random() * GL.length) | 0])).join(''); }); if (dec > 16) { clearInterval(decT); tNodes.forEach((n, k) => { n.textContent = finals[k]; }); } }, 50);
    const box = $('#boot-lines'), bar = $('#boot-progress'); let i = 0, done = false, pct = 0, pctTimer = null;
    const finish = () => {
      if (done) return; done = true; clearInterval(pctTimer); clearInterval(decT); tNodes.forEach((n, k) => { n.textContent = finals[k]; }); NV.text('#boot-phase', 'ALL SYSTEMS NOMINAL'); bar.style.width = '100%'; NV.text('#boot-pct', '100%');
      const h = new Date().getHours(); $('#boot-welcome').textContent = `${h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, Sir.`;
      el.classList.add('welcome'); NV.audio.bootUp();
      setTimeout(() => { el.classList.add('done'); document.body.classList.add('booted'); }, 650); setTimeout(() => el.remove(), 1500);
    };
    pctTimer = setInterval(() => { const tgt = Math.min(99, ((i + 0.6) / lines.length) * 100); pct = Math.min(tgt, pct + 0.3 + Math.max(0, tgt - pct) * 0.18); NV.text('#boot-pct', NV.pad(pct) + '%'); tiles.forEach((t, k) => t.classList.toggle('on', k / tiles.length < pct / 100)); }, 30);
    const step = () => { if (done) return; NV.text('#boot-phase', phases[Math.min(2, Math.floor(i / lines.length * 3))]); if (i < lines.length) { const d = NV.el('div'); d.innerHTML = `<span>${lines[i]}</span><span class="ok">OK</span>`; box.appendChild(d); while (box.children.length > 5) box.firstChild.remove(); i++; bar.style.width = (i / lines.length * 100) + '%'; setTimeout(step, 200); } else setTimeout(finish, 250); };
    setTimeout(step, 250); el.addEventListener('click', finish);
  }

  // ---------- PWA ----------
  let deferredPrompt = null;
  function initPWA() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').then((reg) => { NV.text('#sw-status', 'Offline cache active (v' + NV.VERSION + ').'); reg.update && setTimeout(() => reg.update().catch(() => {}), 4000); }).catch(() => NV.text('#sw-status', 'Offline cache unavailable.'));
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !params.has('noupdate')) $('#update-pill').hidden = false; });
    } else NV.text('#sw-status', 'Serve over http(s) to enable offline mode.');
    $('#update-reload').onclick = () => location.reload();
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('#set-install').disabled = false; });
    $('#set-install').onclick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (e) { /* dismissed */ } deferredPrompt = null; $('#set-install').disabled = true; };
    addEventListener('appinstalled', () => NV.toast('Installed. The scanner now lives on your home screen, Sir.'));
  }

  // ---------- Init ----------
  function init() {
    NV.perf.init(); buildThemeCards();
    ['cam-canvas', 'ar-canvas', 'col-canvas', 'ocr-canvas'].forEach((id) => { const c = $('#' + id); if (c) c._dprKind = 'cam'; });
    NV.bg.init($('#bg-canvas')); NV.fx.init($('#fx-canvas'));
    SN.init(); NV.jarvis.init(); NV.cam.init();
    NV.motion.init(); NV.nav.init(); NV.meter.init(); NV.threat.init(); NV.radar.init(); NV.status.init(); NV.log.init(); NV.timer.init();
    NV.light.init(); NV.cinco.init();
    ['optics', 'detect', 'sky', 'hotline', 'badges', 'brain', 'voice', 'console', 'extras'].forEach((m) => { const mod = NV['_init_' + m]; if (mod) mod(); });
    NV.tools.init();
    bindSettings(); initPWA();
    SN.on('mode', modeChip);

    NV.$$('[data-go]').forEach((b) => b.addEventListener('click', () => { NV.showTab(b.dataset.go, true); }));
    NV.$$('[data-engage]').forEach((b) => (b.onclick = () => NV.cam.start()));
    NV.$$('[data-engage-sim]').forEach((b) => (b.onclick = () => NV.cam.startSim()));
    $('#mini-radar-btn').onclick = () => NV.showTab('radar');
    const startTab = params.get('tab') || NV.store.get('tab', 'scan');
    NV.showTab(NV.tools.byId(startTab) ? startTab : 'scan', false);
    if (params.get('theme')) applyTheme(params.get('theme'), false);

    $('#btn-theme').onclick = () => cycleTheme(1); $('#btn-fullscreen').onclick = toggleFullscreen;
    $('#btn-settings').onclick = () => toggleDrawer(); $('#btn-help').onclick = () => NV.openModal('help');
    $('#btn-protocols').onclick = () => { NV.openModal('protocols'); markProto(); };
    $('#btn-mute').onclick = () => { NV.setSetting('uisound', !S.uisound); if (S.uisound) NV.audio.confirm(); };
    NV.$$('.proto').forEach((b) => (b.onclick = () => runProto(b.dataset.proto)));
    NV.$$('[data-close]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.close; if (id === 'settings') toggleDrawer(false); else NV.closeModal(id); }));
    NV.$$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) NV.closeModal(m.id); }));
    $('#jv-orb').onclick = () => NV.jarvis.briefing(); $('#jv-brief').onclick = () => NV.jarvis.briefing();
    $('#jv-analyse').onclick = () => NV.jarvis.analyse(); $('#jv-quip').onclick = () => NV.jarvis.quip();
    $('#hotline-cta').onclick = () => NV.hotline.open();
    $('#brand').addEventListener('click', () => { const n = performance.now(); taps = taps.filter((t) => n - t < 3000); taps.push(n); NV.audio.click(1 + taps.length * 0.08); if (taps.length >= 7) { taps = []; unlockSecret(); } });
    document.addEventListener('pointerdown', (e) => { const d = $('#settings'); if (d.classList.contains('open') && !d.contains(e.target) && !e.target.closest('#btn-settings')) toggleDrawer(false); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 100));
    NV.on('guard', markProto);

    boot();
    modeChip();
    if (params.has('autocam')) NV.cam.start(); else if (params.has('simcam')) NV.cam.startSim();
    if (params.has('recall')) setTimeout(() => NV.cinco.recall(), 600);
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
