/* NICK-VERSE Scanner: Photon suite. Flashlight (torch or screen fallback), strobe, morse, light meter. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const LI = (NV.light = { on: false, mode: null, strobe: false, color: '#ffffff', bright: 1, lux: null, luxSrc: 'sim', morse: false });
  const COLORS = [['#ffffff', 'Daylight'], ['#ffd9a0', 'Warm'], ['#ff2a2a', 'Night red'], ['#8fd8ff', 'Cool'], ['theme', 'Theme']];
  const isAndroidish = /Android/i.test(navigator.userAgent) && navigator.maxTouchPoints > 0;
  let strobeTimer = null, strobeArm = 0, strobePhase = true, morseTimers = [], als = null, simLux = 320;

  function slColor() { const c = LI.color === 'theme' ? NV.colors.secondary : LI.color; return NV.mixHex('#000000', c, LI.bright); }
  function setBadge() { const b = $('#light-badge'); b.textContent = LI.on ? (LI.mode === 'torch' ? 'TORCH ON' : 'SCREEN LIGHT') + (LI.strobe ? ' · STROBE' : '') : LI.morse ? 'TRANSMITTING' : 'STANDBY'; b.className = 'badge' + (LI.on || LI.morse ? ' live' : ''); }
  function showScreen(on) { const s = $('#screenlight'); s.style.setProperty('--sl', slColor()); s.classList.toggle('open', on); s.setAttribute('aria-hidden', !on); s.classList.remove('strobe-off'); }
  async function tryTorch() {
    if (NV.cam.live && NV.cam.torchCap) return NV.cam.setTorch(true);
    if (!NV.cam.live && isAndroidish) { const ok = await NV.cam.start('environment'); if (ok && NV.cam.torchCap) return NV.cam.setTorch(true); }
    return false;
  }
  LI.setOn = async (on) => {
    if (on === LI.on) return;
    if (on) {
      LI.on = true; const torch = await tryTorch(); LI.mode = torch ? 'torch' : 'screen';
      if (!torch) { showScreen(true); NV.text('#sl-k', 'SCREEN LIGHT · TORCH UNAVAILABLE'); }
      NV.text('#torch-mode', torch ? 'Hardware torch engaged' : 'Screen-light fallback (no torch access)');
      NV.audio.powerUp(); NV.haptic(30); NV.wake('light', true); NV.jarvis.auto('torch', 30000);
    } else {
      stopStrobe(); if (LI.mode === 'torch') NV.cam.setTorch(false); showScreen(false); LI.on = false; LI.mode = null;
      NV.text('#torch-mode', 'Torch if available · screen-light fallback'); NV.audio.powerDown(); NV.wake('light', false);
    }
    $('#torch-btn').setAttribute('aria-pressed', LI.on); setBadge();
  };
  LI.toggle = () => LI.setOn(!LI.on);
  function lampSet(v) { // raw on/off used by strobe + morse
    $('#morse-lamp').classList.toggle('on', v);
    if (!LI.on) return;
    if (LI.mode === 'torch') NV.cam.setTorch(v); else $('#screenlight').classList.toggle('strobe-off', !v);
  }
  function stopStrobe() { clearInterval(strobeTimer); strobeTimer = null; if (LI.strobe) { LI.strobe = false; lampSet(true); $('#morse-lamp').classList.remove('on'); } $('#strobe-btn').setAttribute('aria-pressed', false); NV.text('#strobe-btn', 'Strobe'); setBadge(); }
  async function startStrobe() {
    if (!LI.on) await LI.setOn(true);
    LI.strobe = true; const hz = +$('#strobe-hz').value; strobePhase = true;
    clearInterval(strobeTimer); strobeTimer = setInterval(() => { strobePhase = !strobePhase; lampSet(strobePhase); }, 500 / hz);
    $('#strobe-btn').setAttribute('aria-pressed', true); NV.text('#strobe-btn', 'Stop'); setBadge();
  }
  LI.strobeClick = () => {
    if (LI.strobe) return stopStrobe();
    if (Date.now() - strobeArm > 3000) { strobeArm = Date.now(); NV.text('#strobe-btn', 'Confirm?'); setTimeout(() => { if (!LI.strobe) NV.text('#strobe-btn', 'Strobe'); }, 3000); NV.audio.click(); return; }
    startStrobe();
  };

  // ---------- Morse ----------
  const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.', '@': '.--.-.', '&': '.-...', ':': '---...', '=': '-...-', '+': '.-.-.', '-': '-....-', "'": '.----.' };
  function renderMorse(text, cur = -1) {
    const box = $('#morse-code'); let i = -1;
    box.innerHTML = text.split('').map((ch) => { if (ch === ' ') return '<span class="c">/</span>'; const m = MORSE[ch]; if (!m) return ''; i++; return `<span class="c ${i < cur ? 'done' : i === cur ? 'cur' : ''}">${m.replace(/\./g, '·').replace(/-/g, '−')}</span>`; }).join('');
  }
  LI.stopMorse = () => { morseTimers.forEach(clearTimeout); morseTimers = []; if (LI.morse) { LI.morse = false; NV.audio.beep(false); lampSet(LI.on); $('#morse-lamp').classList.remove('on'); NV.text('#morse-go', 'Transmit'); setBadge(); } };
  LI.transmit = (text) => {
    if (LI.morse) return LI.stopMorse();
    stopStrobe();
    text = (text || '').toUpperCase().replace(/[^A-Z0-9 .,?!/@&:=+\-']/g, '').replace(/\s+/g, ' ').trim();
    if (!text) { NV.toast('Nothing to transmit, Sir. Brevity has limits.'); return; }
    const unit = 1200 / +$('#morse-wpm').value, beep = $('#morse-beep').checked;
    let t = 0, ci = -1; LI.morse = true; NV.text('#morse-go', 'Stop'); setBadge(); renderMorse(text, 0);
    const at = (ms, fn) => morseTimers.push(setTimeout(fn, ms));
    text.split(' ').forEach((word, wi) => {
      if (wi) t += unit * 4; // 7u total with trailing 3u
      word.split('').forEach((ch) => {
        const m = MORSE[ch]; if (!m) return; ci++; const idx = ci;
        at(t, () => renderMorse(text, idx));
        m.split('').forEach((sym) => {
          const d = sym === '.' ? unit : unit * 3;
          at(t, () => { lampSet(true); if (beep) NV.audio.beep(true); }); at(t + d, () => { lampSet(false); if (beep) NV.audio.beep(false); });
          t += d + unit;
        });
        t += unit * 2;
      });
    });
    at(t + 50, () => { renderMorse(text, 999); LI.morse = false; NV.audio.beep(false); lampSet(LI.on); $('#morse-lamp').classList.remove('on'); NV.text('#morse-go', 'Transmit'); setBadge(); NV.toast('Transmission complete. Nobody replied. Typical.'); });
    NV.audio.unlock();
    if (!LI.on) NV.toast('Tip: switch on the flashlight first to transmit with the torch or screen.', 3000);
  };

  // ---------- Light meter ----------
  function luxDesc(l) { return l < 1 ? 'Moonlight' : l < 50 ? 'Dim room' : l < 200 ? 'Living room' : l < 600 ? 'Office' : l < 2000 ? 'Overcast day' : l < 20000 ? 'Daylight' : 'Direct sunlight'; }
  LI.compute = (t) => {
    if (als && LI.luxSrc === 'sensor') return;
    const cam = NV.cam;
    if (cam.active() && cam.luma != null) { const est = Math.pow(10, cam.luma * 4.2) - 1; LI.lux = NV.lerp(LI.lux ?? est, est, 0.1); LI.luxSrc = cam.sim ? 'simcam' : 'camera'; }
    else { simLux = NV.clamp(simLux + (Math.random() - 0.5) * 6 + (320 - simLux) * 0.01, 5, 2000); LI.lux = simLux + 12 * Math.sin(t / 1500); LI.luxSrc = 'sim'; }
  };
  LI.frame = () => {
    const l = Math.max(0, LI.lux || 0);
    NV.arcGauge($('#lux-gauge'), { value: Math.log10(l + 1), min: 0, max: 5, label: 'LUX (LOG)', big: l >= 1000 ? (l / 1000).toFixed(1) + 'k lx' : Math.round(l) + ' lx', sub: luxDesc(l).toUpperCase(), ticks: 5 });
  };
  LI.tickReadouts = () => {
    const l = Math.max(0, LI.lux || 0), src = { sensor: 'Ambient light sensor', camera: 'Camera estimate (auto-exposure affects it)', simcam: 'Estimate from simulated feed', sim: 'SIMULATED · tap the gauge to use the camera' }[LI.luxSrc];
    NV.text('#lux-src', 'Source: ' + src);
    NV.text('#ar-lux', (l >= 1000 ? (l / 1000).toFixed(1) + 'k' : Math.round(l)) + ' lx'); NV.text('#ar-lux-s', LI.luxSrc === 'sensor' ? 'ALS sensor' : LI.luxSrc === 'camera' ? 'camera est.' : 'simulated');
  };
  function initALS() {
    if (!('AmbientLightSensor' in window)) return;
    try { als = new window.AmbientLightSensor({ frequency: 4 }); als.addEventListener('reading', () => { LI.lux = als.illuminance; LI.luxSrc = 'sensor'; }); als.addEventListener('error', () => { als = null; }); als.start(); } catch (e) { als = null; }
  }

  LI.init = () => {
    const sw = $('#screen-colors');
    COLORS.forEach(([c, n], i) => { const b = NV.el('button', { title: n, 'aria-label': n, class: i === 0 ? 'on' : '' }); b.style.background = c === 'theme' ? 'var(--acc2)' : c; b.onclick = () => { LI.color = c; NV.$$('button', sw).forEach((o) => o.classList.toggle('on', o === b)); $('#screenlight').style.setProperty('--sl', slColor()); NV.audio.click(); }; sw.appendChild(b); });
    $('#torch-btn').onclick = LI.toggle;
    $('#sl-off').onclick = (e) => { e.stopPropagation(); LI.setOn(false); };
    $('#screenlight').addEventListener('click', (e) => { if (!e.target.closest('.sl-ui')) LI.setOn(false); });
    $('#sl-bright').oninput = (e) => { LI.bright = +e.target.value; $('#screenlight').style.setProperty('--sl', slColor()); };
    $('#strobe-hz').oninput = (e) => { NV.text('#strobe-hz-v', e.target.value + ' Hz'); if (LI.strobe) startStrobe(); };
    $('#strobe-btn').onclick = LI.strobeClick;
    $('#morse-wpm').oninput = (e) => NV.text('#morse-wpm-v', e.target.value + ' WPM');
    $('#morse-go').onclick = () => LI.transmit($('#morse-text').value);
    $('#morse-sos').onclick = () => { if (LI.morse) LI.stopMorse(); $('#morse-text').value = 'SOS'; LI.transmit('SOS'); };
    $('#morse-text').addEventListener('input', (e) => renderMorse(e.target.value.toUpperCase()));
    $('#morse-text').addEventListener('keydown', (e) => { if (e.key === 'Enter') LI.transmit(e.target.value); });
    $('#lux-gauge').addEventListener('click', () => { if (!NV.cam.active()) NV.cam.start(); });
    renderMorse($('#morse-text').value.toUpperCase());
    initALS();
  };
})();
