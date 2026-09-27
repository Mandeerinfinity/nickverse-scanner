/* NICK-VERSE Scanner: synthesized sound effects (Web Audio API, no samples) */
(function () {
  'use strict';
  const NV = window.NV;
  let ctx = null, master = null, sfxBus = null, loopTimer = null, loopKind = null, beepOsc = null, beepGain = null;

  const activated = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
  function ensure() {
    if (!ctx && !activated()) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = NV.settings.volume;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  NV.onSetting((k, v) => { if (k === 'volume' && master) master.gain.value = v; });
  const unlock = () => { ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);

  const on = () => NV.settings.uisound && ensure();
  function tone(freq, start, dur, { type = 'sine', gain = 0.3, attack = 0.005, glideTo = null, dest = null, filter = null } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, start);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 1; o.connect(f); node = f; }
    node.connect(g); g.connect(dest || sfxBus); o.start(start); o.stop(start + dur + 0.05);
  }
  function noise(start, dur, { gain = 0.1, freq = 2000, q = 1, type = 'bandpass', sweepTo = null } = {}) {
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, start); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(gain, start + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(start); src.stop(start + dur + 0.05);
  }

  NV.audio = {
    unlock: ensure,
    get ctx() { return ensure(); },
    click(p = 1) { if (!on()) return; const t = ctx.currentTime; tone(1800 * p, t, 0.05, { type: 'triangle', gain: 0.05 }); tone(2600 * p, t + 0.02, 0.04, { gain: 0.03 }); },
    confirm() { if (!on()) return; const t = ctx.currentTime; tone(660, t, 0.12, { gain: 0.08, glideTo: 990 }); tone(1320, t + 0.08, 0.18, { gain: 0.06 }); },
    deny() { if (!on()) return; const t = ctx.currentTime; tone(220, t, 0.14, { type: 'square', gain: 0.05 }); tone(165, t + 0.12, 0.2, { type: 'square', gain: 0.05 }); },
    scan() { // rising sweep + shimmer
      if (!on()) return; const t = ctx.currentTime;
      tone(300, t, 1.1, { type: 'sawtooth', gain: 0.05, glideTo: 2400, filter: { freq: 1800, q: 6 } });
      tone(600, t, 1.1, { type: 'sine', gain: 0.05, glideTo: 3200 });
      noise(t, 1.0, { gain: 0.04, freq: 800, sweepTo: 6000, q: 4 });
      for (let i = 0; i < 6; i++) tone(2400 + i * 180, t + 0.12 + i * 0.13, 0.06, { type: 'triangle', gain: 0.03 });
    },
    scanDone() { if (!on()) return; const t = ctx.currentTime; tone(1046, t, 0.12, { type: 'triangle', gain: 0.1 }); tone(1568, t + 0.1, 0.25, { type: 'triangle', gain: 0.09 }); tone(2093, t + 0.2, 0.35, { gain: 0.05 }); },
    shutter() { if (!on()) return; const t = ctx.currentTime; noise(t, 0.06, { gain: 0.2, freq: 3000, q: 0.7 }); noise(t + 0.07, 0.05, { gain: 0.12, freq: 2000, q: 0.7 }); },
    ping(pan = 0, vol = 1) { // sonar ping with echo
      if (!on()) return; const t = ctx.currentTime;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = NV.clamp(pan, -1, 1); p.connect(sfxBus); }
      const dest = p || sfxBus;
      tone(1320, t, 0.9, { gain: 0.08 * vol, dest }); tone(1320, t + 0.18, 0.7, { gain: 0.025 * vol, dest }); tone(2640, t, 0.25, { gain: 0.02 * vol, dest });
    },
    blip() { if (!on()) return; const t = ctx.currentTime; tone(1900, t, 0.04, { type: 'square', gain: 0.025 }); },
    shake() { if (!on()) return; const t = ctx.currentTime; tone(90, t, 0.3, { type: 'sawtooth', gain: 0.08, glideTo: 60, filter: { freq: 400 } }); noise(t, 0.25, { gain: 0.06, freq: 300, q: 1 }); tone(880, t + 0.05, 0.15, { type: 'triangle', gain: 0.05, glideTo: 1320 }); },
    level() { if (!on()) return; const t = ctx.currentTime; tone(1568, t, 0.1, { type: 'triangle', gain: 0.06 }); tone(2093, t + 0.08, 0.18, { gain: 0.05 }); },
    qr() { if (!on()) return; const t = ctx.currentTime; tone(1760, t, 0.08, { type: 'square', gain: 0.05 }); tone(2349, t + 0.09, 0.14, { type: 'square', gain: 0.05 }); },
    chime() { if (!on()) return; const t = ctx.currentTime; [[784, 0], [1047, 0.2], [1319, 0.4]].forEach(([f, d]) => { tone(f, t + d, 1.2, { gain: 0.12, attack: 0.01 }); tone(f * 2.01, t + d, 0.6, { gain: 0.03 }); }); },
    dingdong() { if (!ensure() || !NV.settings.uisound) return; const t = ctx.currentTime; tone(988, t, 0.8, { gain: 0.14, attack: 0.01 }); tone(784, t + 0.45, 1.1, { gain: 0.14, attack: 0.01 }); },
    powerUp() { if (!on()) return; const t = ctx.currentTime; tone(110, t, 0.9, { type: 'sawtooth', gain: 0.05, glideTo: 880, filter: { freq: 1200, q: 3 } }); tone(440, t + 0.5, 0.5, { gain: 0.06, glideTo: 1760 }); },
    powerDown() { if (!on()) return; const t = ctx.currentTime; tone(880, t, 0.6, { type: 'sawtooth', gain: 0.04, glideTo: 90, filter: { freq: 1200, q: 3 } }); },
    cash() { if (!on()) return; const t = ctx.currentTime; [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, t + i * 0.06, 0.3, { type: 'triangle', gain: 0.06 })); noise(t + 0.25, 0.3, { gain: 0.05, freq: 6000, q: 2 }); },
    whoosh() { if (!on()) return; const t = ctx.currentTime; noise(t, 0.35, { gain: 0.08, freq: 400, sweepTo: 4000, q: 1.5 }); },
    // Continuous beep for morse
    beep(onOff, freq = 700) {
      if (!ensure()) return;
      if (!beepOsc) { beepOsc = ctx.createOscillator(); beepGain = ctx.createGain(); beepGain.gain.value = 0; beepOsc.type = 'sine'; beepOsc.frequency.value = freq; beepOsc.connect(beepGain); beepGain.connect(master); beepOsc.start(); }
      const t = ctx.currentTime; beepGain.gain.cancelScheduledValues(t); beepGain.gain.setTargetAtTime(onOff ? 0.12 : 0, t, 0.004);
    },
    // Loops: red alert klaxon, party beat
    startLoop(kind) {
      if (!ensure()) return; this.stopLoop(); loopKind = kind; let step = 0;
      const run = () => {
        if (loopKind !== kind) return; const t = ctx.currentTime + 0.02;
        if (!NV.settings.uisound) return;
        if (kind === 'redalert') { tone(520, t, 0.9, { type: 'sawtooth', gain: 0.07, glideTo: 1040, filter: { freq: 2200, q: 2 } }); tone(1040, t + 0.9, 0.35, { type: 'square', gain: 0.03 }); }
        else if (kind === 'party') {
          const notes = [523, 659, 784, 988, 784, 659, 587, 740];
          for (let i = 0; i < 4; i++) { const n = notes[(step * 4 + i) % notes.length]; tone(n, t + i * 0.15, 0.14, { type: 'square', gain: 0.035 }); if (i % 2 === 0) { tone(70, t + i * 0.15, 0.12, { type: 'sine', gain: 0.18, glideTo: 40 }); } else noise(t + i * 0.15, 0.05, { gain: 0.05, freq: 8000, q: 1 }); }
          step++;
        }
      };
      run(); loopTimer = setInterval(run, kind === 'redalert' ? 1500 : 600);
    },
    stopLoop() { clearInterval(loopTimer); loopTimer = null; loopKind = null; }
  };
})();
