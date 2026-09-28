/* NICK-VERSE Scanner: synthesized sound design (Web Audio API, no samples).
   Buses: sfx + music -> master -> compressor -> out, with a generated-impulse reverb send. */
(function () {
  'use strict';
  const NV = window.NV;
  let ctx = null, master = null, sfxBus = null, musicBus = null, verbSend = null, beepOsc = null, beepGain = null, musicAnalyser = null, hum = null;
  const loops = new Map();

  const activated = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
  function impulse(sec = 1.8, decay = 3.2) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function ensure() {
    if (!ctx && !activated()) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      const S = NV.settings;
      master = ctx.createGain(); master.gain.value = S.volume;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ctx.destination);
      const verb = ctx.createConvolver(); verb.buffer = impulse(); const verbOut = ctx.createGain(); verbOut.gain.value = 0.55; verb.connect(verbOut); verbOut.connect(master);
      verbSend = ctx.createGain(); verbSend.gain.value = 0.22; verbSend.connect(verb);
      sfxBus = ctx.createGain(); sfxBus.gain.value = S.sfxlevel; sfxBus.connect(master); sfxBus.connect(verbSend);
      musicBus = ctx.createGain(); musicBus.gain.value = S.musiclevel; musicBus.connect(master);
      musicAnalyser = ctx.createAnalyser(); musicAnalyser.fftSize = 256; musicAnalyser.smoothingTimeConstant = 0.78; musicBus.connect(musicAnalyser);
      if (S.hum) setHum(true);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  NV.onSetting((k, v) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (k === 'volume') master.gain.setTargetAtTime(v, t, 0.03);
    if (k === 'sfxlevel') sfxBus.gain.setTargetAtTime(v, t, 0.03);
    if (k === 'musiclevel') musicBus.gain.setTargetAtTime(v, t, 0.03);
    if (k === 'hum' || k === 'uisound') setHum(NV.settings.hum && NV.settings.uisound);
  });
  const unlock = () => { ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);

  // Ambient reactor hum (optional, very quiet)
  function setHum(on) {
    if (!ctx) return;
    if (on && !hum) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.connect(g);
      const oscs = [55, 110.4, 164.8].map((fr, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = fr; const og = ctx.createGain(); og.gain.value = [0.5, 0.25, 0.1][i]; o.connect(og); og.connect(f); o.start(); return o; });
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      g.gain.setTargetAtTime(0.028, ctx.currentTime, 1.2); hum = { g, oscs: oscs.concat(lfo) };
    } else if (!on && hum) { const h = hum; hum = null; h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => h.oscs.forEach((o) => { try { o.stop(); } catch (e) { /* stopped */ } }), 2000); }
  }

  const on = () => NV.settings.uisound && ensure();
  function tone(freq, start, dur, { type = 'sine', gain = 0.3, attack = 0.005, glideTo = null, dest = null, filter = null, pan = null, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, start); if (detune) o.detune.value = detune;
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 1; o.connect(f); node = f; }
    let out = dest || sfxBus;
    if (pan != null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = NV.clamp(pan, -1, 1); p.connect(out); out = p; }
    node.connect(g); g.connect(out); o.start(start); o.stop(start + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(start, dur, { gain = 0.1, freq = 2000, q = 1, type = 'bandpass', sweepTo = null, dest = null } = {}) {
    if (!noiseBuf) { const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, start); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxBus); src.start(start, Math.random()); src.stop(start + dur + 0.05);
  }

  // Original elevator-jazz hold music (I-vi-ii-V), phone-band filtered.
  const HOLD = { chords: [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [293.7, 349.2, 440, 523.3], [196, 246.9, 293.7, 349.2]], mel: [[659, 0], [587, 0.5], [523, 1], [587, 1.5], [659, 1.75], [784, 2.5], [698, 3], [659, 3.5]] };
  function holdBar(t, step, dest) {
    const ch = HOLD.chords[step % 4], beat = 0.5, f = { type: 'bandpass', freq: 1200, q: 0.5 };
    ch.forEach((fr, i) => tone(fr, t + i * 0.02, beat * 3.6, { type: 'triangle', gain: 0.035, attack: 0.08, dest, filter: f }));
    tone(ch[0] / 2, t, beat * 1.5, { type: 'sine', gain: 0.12, dest }); tone(ch[2] / 2, t + beat * 2, beat * 1.5, { type: 'sine', gain: 0.1, dest });
    const shift = [0, -2, 2, -1][step % 4], k = Math.pow(2, shift / 12);
    HOLD.mel.forEach(([fr, b], i) => { if ((step + i) % 3 === 2 && i > 3) return; tone(fr * k, t + b * beat, beat * 0.8, { type: 'sine', gain: 0.06, dest, filter: f }); tone(fr * k * 2, t + b * beat, beat * 0.3, { type: 'sine', gain: 0.012, dest }); });
    for (let i = 0; i < 8; i++) noise(t + i * beat * 0.5, 0.04, { gain: i % 2 ? 0.012 : 0.02, freq: 7000, q: 1, dest });
  }

  NV.audio = {
    unlock: ensure,
    get ctx() { return ensure(); },
    get musicAnalyser() { return musicAnalyser; },
    get musicOn() { return !!(ctx && NV.settings.uisound && loops.has('music')); },
    click(p = 1) { if (!on()) return; const t = ctx.currentTime; tone(1800 * p, t, 0.05, { type: 'triangle', gain: 0.05 }); tone(2600 * p, t + 0.02, 0.04, { gain: 0.03 }); },
    tick(p = 1) { if (!on()) return; const t = ctx.currentTime; tone(3200 * p, t, 0.025, { type: 'square', gain: 0.012, filter: { type: 'highpass', freq: 2000 } }); },
    confirm() { if (!on()) return; const t = ctx.currentTime; tone(660, t, 0.12, { gain: 0.08, glideTo: 990 }); tone(1320, t + 0.08, 0.18, { gain: 0.06 }); },
    deny() { if (!on()) return; const t = ctx.currentTime; tone(220, t, 0.14, { type: 'square', gain: 0.05, filter: { freq: 1400 } }); tone(165, t + 0.12, 0.2, { type: 'square', gain: 0.05, filter: { freq: 1200 } }); },
    nav(dir = 1) { // tool switch: airy swoosh + two-note tick panned in the travel direction
      if (!on()) return; const t = ctx.currentTime;
      noise(t, 0.22, { gain: 0.035, freq: dir > 0 ? 900 : 2600, sweepTo: dir > 0 ? 3800 : 700, q: 1.2 });
      tone(dir > 0 ? 1175 : 1568, t + 0.02, 0.09, { type: 'triangle', gain: 0.045, pan: -0.4 * dir }); tone(dir > 0 ? 1568 : 1175, t + 0.08, 0.14, { type: 'sine', gain: 0.04, pan: 0.4 * dir });
    },
    open() { if (!on()) return; const t = ctx.currentTime; noise(t, 0.3, { gain: 0.03, freq: 600, sweepTo: 5000, q: 2 }); [880, 1320, 1760].forEach((f, i) => tone(f, t + i * 0.045, 0.22, { type: 'sine', gain: 0.035 })); },
    close() { if (!on()) return; const t = ctx.currentTime; noise(t, 0.2, { gain: 0.025, freq: 3000, sweepTo: 500, q: 2 }); tone(1100, t, 0.12, { type: 'triangle', gain: 0.035, glideTo: 700 }); },
    scan() {
      if (!on()) return; const t = ctx.currentTime;
      tone(300, t, 1.1, { type: 'sawtooth', gain: 0.05, glideTo: 2400, filter: { freq: 1800, q: 6 } });
      tone(600, t, 1.1, { type: 'sine', gain: 0.05, glideTo: 3200 });
      noise(t, 1.0, { gain: 0.04, freq: 800, sweepTo: 6000, q: 4 });
      for (let i = 0; i < 6; i++) tone(2400 + i * 180, t + 0.12 + i * 0.13, 0.06, { type: 'triangle', gain: 0.03, pan: (i % 2 ? 0.5 : -0.5) });
    },
    scanDone() { if (!on()) return; const t = ctx.currentTime; tone(1046, t, 0.12, { type: 'triangle', gain: 0.1 }); tone(1568, t + 0.1, 0.25, { type: 'triangle', gain: 0.09 }); tone(2093, t + 0.2, 0.35, { gain: 0.05 }); },
    shutter() { if (!on()) return; const t = ctx.currentTime; noise(t, 0.06, { gain: 0.2, freq: 3000, q: 0.7 }); noise(t + 0.07, 0.05, { gain: 0.12, freq: 2000, q: 0.7 }); },
    ping(pan = 0, vol = 1) { if (!on()) return; const t = ctx.currentTime; tone(1320, t, 0.9, { gain: 0.08 * vol, pan }); tone(1320, t + 0.18, 0.7, { gain: 0.025 * vol, pan: -pan }); tone(2640, t, 0.25, { gain: 0.02 * vol, pan }); },
    blip() { if (!on()) return; const t = ctx.currentTime; tone(1900, t, 0.04, { type: 'square', gain: 0.025, filter: { freq: 4000 } }); },
    shake() { if (!on()) return; const t = ctx.currentTime; tone(90, t, 0.3, { type: 'sawtooth', gain: 0.08, glideTo: 60, filter: { freq: 400 } }); noise(t, 0.25, { gain: 0.06, freq: 300, q: 1 }); tone(880, t + 0.05, 0.15, { type: 'triangle', gain: 0.05, glideTo: 1320 }); },
    rumble(k = 1) { if (!on()) return; const t = ctx.currentTime; tone(48, t, 0.7, { type: 'sawtooth', gain: 0.12 * k, glideTo: 30, filter: { freq: 180 } }); noise(t, 0.6, { gain: 0.08 * k, freq: 140, q: 0.8, type: 'lowpass' }); },
    level() { if (!on()) return; const t = ctx.currentTime; tone(1568, t, 0.1, { type: 'triangle', gain: 0.06 }); tone(2093, t + 0.08, 0.18, { gain: 0.05 }); },
    qr() { if (!on()) return; const t = ctx.currentTime; tone(1760, t, 0.08, { type: 'square', gain: 0.05, filter: { freq: 5000 } }); tone(2349, t + 0.09, 0.14, { type: 'square', gain: 0.05, filter: { freq: 5000 } }); },
    lock() { if (!on()) return; const t = ctx.currentTime; [1318, 1760, 2637].forEach((f, i) => tone(f, t + i * 0.07, 0.12, { type: 'square', gain: 0.03, filter: { freq: 5200 } })); },
    pop() { if (!on()) return; const t = ctx.currentTime; tone(420, t, 0.09, { type: 'sine', gain: 0.1, glideTo: 1400 }); tone(2400, t + 0.05, 0.05, { gain: 0.02 }); },
    thump() { if (!on()) return; const t = ctx.currentTime; tone(70, t, 0.12, { gain: 0.16, glideTo: 45 }); tone(60, t + 0.16, 0.1, { gain: 0.09, glideTo: 40 }); },
    detect(strength) { // metal-detector blip: pitch rises with field strength
      if (!on()) return; const t = ctx.currentTime, s = NV.clamp(strength, 0, 1), f = 380 + s * 1500;
      tone(f, t, 0.05 + (1 - s) * 0.05, { type: s > 0.7 ? 'square' : 'triangle', gain: 0.035 + s * 0.035, filter: { freq: 4000 } });
    },
    arming(final = false) { if (!on()) return; const t = ctx.currentTime; tone(final ? 1760 : 1175, t, final ? 0.4 : 0.09, { type: 'square', gain: 0.04, filter: { freq: 3000 } }); },
    chime() { if (!on()) return; const t = ctx.currentTime; [[784, 0], [1047, 0.2], [1319, 0.4]].forEach(([f, d]) => { tone(f, t + d, 1.2, { gain: 0.12, attack: 0.01 }); tone(f * 2.01, t + d, 0.6, { gain: 0.03 }); }); },
    badge() { // achievement fanfare with sparkle
      if (!on()) return; const t = ctx.currentTime;
      [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]].forEach(([f, d]) => { tone(f, t + d, 0.5, { type: 'triangle', gain: 0.07 }); tone(f * 2, t + d, 0.25, { gain: 0.02 }); });
      tone(1568, t + 0.4, 0.9, { gain: 0.05 }); for (let i = 0; i < 7; i++) tone(3000 + Math.random() * 2500, t + 0.35 + i * 0.05, 0.08, { gain: 0.012, pan: Math.random() * 2 - 1 });
    },
    dingdong() { if (!ensure() || !NV.settings.uisound) return; const t = ctx.currentTime; tone(988, t, 0.8, { gain: 0.14, attack: 0.01 }); tone(784, t + 0.45, 1.1, { gain: 0.14, attack: 0.01 }); },
    powerUp() { if (!on()) return; const t = ctx.currentTime; tone(110, t, 0.9, { type: 'sawtooth', gain: 0.05, glideTo: 880, filter: { freq: 1200, q: 3 } }); tone(440, t + 0.5, 0.5, { gain: 0.06, glideTo: 1760 }); },
    bootUp() { // cinematic boot: sub drop, rising swell, sparkle
      if (!on()) return; const t = ctx.currentTime;
      tone(55, t, 1.6, { type: 'sine', gain: 0.18, glideTo: 38 }); noise(t, 1.4, { gain: 0.05, freq: 300, sweepTo: 7000, q: 1.5 });
      tone(220, t + 0.2, 1.3, { type: 'sawtooth', gain: 0.035, glideTo: 880, filter: { freq: 1600, q: 4 } });
      [659, 988, 1319, 1976].forEach((f, i) => tone(f, t + 1.1 + i * 0.07, 0.7, { type: 'triangle', gain: 0.04, pan: i % 2 ? 0.4 : -0.4 }));
    },
    powerDown() { if (!on()) return; const t = ctx.currentTime; tone(880, t, 0.6, { type: 'sawtooth', gain: 0.04, glideTo: 90, filter: { freq: 1200, q: 3 } }); },
    cash() { if (!on()) return; const t = ctx.currentTime; [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, t + i * 0.06, 0.3, { type: 'triangle', gain: 0.06 })); noise(t + 0.25, 0.3, { gain: 0.05, freq: 6000, q: 2 }); },
    whoosh() { if (!on()) return; const t = ctx.currentTime; noise(t, 0.35, { gain: 0.08, freq: 400, sweepTo: 4000, q: 1.5 }); },
    dtmf(key) { // telephone keypad tones
      if (!on()) return; const R = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] }[key]; if (!R) return;
      const t = ctx.currentTime; R.forEach((f) => tone(f, t, 0.16, { gain: 0.05, attack: 0.004 }));
    },
    beep(onOff, freq = 700) {
      if (!ensure()) return;
      if (!beepOsc) { beepOsc = ctx.createOscillator(); beepGain = ctx.createGain(); beepGain.gain.value = 0; beepOsc.type = 'sine'; beepOsc.frequency.value = freq; beepOsc.connect(beepGain); beepGain.connect(sfxBus); beepOsc.start(); }
      beepOsc.frequency.setValueAtTime(freq, ctx.currentTime);
      const t = ctx.currentTime; beepGain.gain.cancelScheduledValues(t); beepGain.gain.setTargetAtTime(onOff && NV.settings.uisound ? 0.12 : 0, t, 0.004);
    },
    // Loops run in named slots so hold music and alarms can coexist. Slot 'main' = redalert/party, 'guard', 'music'.
    startLoop(kind, slot = 'main') {
      if (!ensure()) return; this.stopLoop(slot); let step = 0;
      const period = { redalert: 1500, party: 600, guard: 700, hold: 4000 }[kind] || 1000;
      const run = () => {
        if (!loops.has(slot) || loops.get(slot).kind !== kind) return; if (!NV.settings.uisound) return;
        const t = ctx.currentTime + 0.03;
        if (kind === 'redalert') { tone(520, t, 0.9, { type: 'sawtooth', gain: 0.07, glideTo: 1040, filter: { freq: 2200, q: 2 } }); tone(1040, t + 0.9, 0.35, { type: 'square', gain: 0.03, filter: { freq: 3000 } }); }
        else if (kind === 'party') {
          const notes = [523, 659, 784, 988, 784, 659, 587, 740];
          for (let i = 0; i < 4; i++) { const n = notes[(step * 4 + i) % notes.length]; tone(n, t + i * 0.15, 0.14, { type: 'square', gain: 0.03, dest: musicBus, filter: { freq: 3500 } }); if (i % 2 === 0) tone(70, t + i * 0.15, 0.12, { type: 'sine', gain: 0.18, glideTo: 40, dest: musicBus }); else noise(t + i * 0.15, 0.05, { gain: 0.05, freq: 8000, q: 1, dest: musicBus }); }
        } else if (kind === 'guard') { // two-tone siren with sub pulse
          tone(step % 2 ? 960 : 1280, t, 0.34, { type: 'square', gain: 0.05, filter: { freq: 2600, q: 1.5 }, dest: musicBus }); tone(step % 2 ? 1280 : 960, t + 0.35, 0.34, { type: 'square', gain: 0.05, filter: { freq: 2600, q: 1.5 }, dest: musicBus }); tone(60, t, 0.3, { gain: 0.12, dest: musicBus });
        } else if (kind === 'hold') holdBar(t, step, musicBus);
        step++;
      };
      loops.set(slot, { kind, timer: setInterval(run, period) }); run();
    },
    stopLoop(slot = 'main') { const l = loops.get(slot); if (l) { clearInterval(l.timer); loops.delete(slot); } },
    loopKind(slot = 'main') { const l = loops.get(slot); return l ? l.kind : null; },
    // Custom loops for the hotline DJ and soundboard: fn(t, step, synth) is called every `period` ms.
    customLoop(slot, kind, period, fn) {
      if (!ensure()) return; this.stopLoop(slot); let step = 0;
      const run = () => { const l = loops.get(slot); if (!l || l.kind !== kind || !NV.settings.uisound) return; try { fn(ctx.currentTime + 0.03, step++, NV.audio.synth); } catch (e) { /* keep looping */ } };
      loops.set(slot, { kind, timer: setInterval(run, period) }); run();
    },
    get synth() { if (!ensure()) return null; return { ctx, tone, noise, musicBus, sfxBus, master, verbSend, noiseBuf: () => { if (!noiseBuf) noise(ctx.currentTime, 0.01, { gain: 0.0001 }); return noiseBuf; } }; },
    canPlay() { return !!(NV.settings.uisound && ensure()); }
  };
})();
