/* NICK-VERSE Scanner: motion / orientation sensor hub with a clearly-labelled simulation fallback */
(function () {
  'use strict';
  const NV = window.NV;
  const G = 9.80665;
  const S = (NV.sensors = {
    motionMode: 'wait', orientMode: 'wait', needsPerm: false,
    acc: { x: 0, y: 0, z: G }, lin: { x: 0, y: 0, z: 0 }, rot: { a: 0, b: 0, g: 0 },
    ori: { alpha: 0, beta: 0, gamma: 0 }, heading: 0, headingSrc: 'sim',
    g: 1, peakG: 1, shakes: 0, linMag: 0
  });
  const handlers = {};
  S.on = (ev, fn) => (handlers[ev] = handlers[ev] || []).push(fn);
  const emit = (ev, d) => (handlers[ev] || []).forEach((fn) => { try { fn(d); } catch (e) { /* ignore */ } });

  let gotMotion = false, gotOri = false, hasAbs = false, grav = { x: 0, y: 0, z: G };
  let hits = [], lastHit = 0, lastShake = 0;
  S.sens = 5;

  function process(acc, lin, rot) {
    grav.x = NV.lerp(grav.x, acc.x, 0.1); grav.y = NV.lerp(grav.y, acc.y, 0.1); grav.z = NV.lerp(grav.z, acc.z, 0.1);
    const l = lin || { x: acc.x - grav.x, y: acc.y - grav.y, z: acc.z - grav.z };
    S.acc = acc; S.lin = l; S.rot = rot;
    S.g = Math.hypot(acc.x, acc.y, acc.z) / G;
    if (S.g > S.peakG) S.peakG = S.g;
    const m = Math.hypot(l.x, l.y, l.z); S.linMag = m;
    const now = performance.now(), thr = 26 - S.sens * 2;
    if (m > thr && now - lastHit > 90) { hits.push(now); lastHit = now; }
    hits = hits.filter((t) => now - t < 800);
    if (hits.length >= 3 && now - lastShake > 900) { lastShake = now; hits = []; S.shakes++; emit('shake', { mag: m }); }
  }

  function onMotion(e) {
    if (NV.settings.forcesim) return;
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    if (!gotMotion) { gotMotion = true; S.motionMode = 'live'; emit('mode'); }
    const l = e.acceleration, r = e.rotationRate;
    process({ x: a.x, y: a.y, z: a.z }, l && l.x != null ? { x: l.x, y: l.y, z: l.z } : null, r && r.alpha != null ? { a: r.alpha, b: r.beta, g: r.gamma } : { a: 0, b: 0, g: 0 });
  }
  function onOrient(e, absEvt) {
    if (NV.settings.forcesim || e.beta == null) return;
    if (!gotOri) { gotOri = true; S.orientMode = 'live'; emit('mode'); }
    S.ori = { alpha: e.alpha || 0, beta: e.beta, gamma: e.gamma || 0 };
    if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) { S.heading = e.webkitCompassHeading; S.headingSrc = 'magnetic'; }
    else if (absEvt || e.absolute) { hasAbs = true; if (e.alpha != null) { S.heading = (360 - e.alpha) % 360; S.headingSrc = 'magnetic'; } }
    else if (!hasAbs && e.alpha != null) { S.heading = (360 - e.alpha) % 360; S.headingSrc = 'relative'; }
  }

  // ---------- simulation ----------
  const sim = { tb: 0, tg: 0, b: 0, g: 0, a: 0, hb: 212, shakeUntil: 0, prev: null };
  window.addEventListener('pointermove', (e) => {
    sim.tg = NV.clamp((e.clientX / innerWidth - 0.5) * 2, -1, 1) * 38;
    sim.tb = NV.clamp((e.clientY / innerHeight - 0.5) * 2, -1, 1) * 38;
  }, { passive: true });
  S.simShake = () => { sim.shakeUntil = performance.now() + 750; };

  S.tick = (t) => {
    const simMotion = S.motionMode !== 'live', simOri = S.orientMode !== 'live';
    if (!simMotion && !simOri) return;
    const ts = t / 1000;
    sim.b = NV.lerp(sim.b, sim.tb + Math.sin(ts * 0.7) * 5 + Math.sin(ts * 2.3) * 1.8 + (Math.random() - 0.5) * 0.8, 0.08);
    sim.g = NV.lerp(sim.g, sim.tg + Math.sin(ts * 0.9 + 1) * 4.5 + Math.sin(ts * 1.7 + 2) * 1.6 + (Math.random() - 0.5) * 0.8, 0.08);
    const heading = (sim.hb + 32 * Math.sin(ts / 9) + 9 * Math.sin(ts / 2.7) + 360) % 360;
    const shaking = t < sim.shakeUntil;
    if (simOri) { S.ori = { alpha: (360 - heading) % 360, beta: sim.b, gamma: sim.g }; S.heading = heading; S.headingSrc = 'sim'; }
    if (simMotion) {
      const b = sim.b * NV.DEG, g = sim.g * NV.DEG, n = () => (Math.random() - 0.5) * 0.3;
      const sh = shaking ? 30 * Math.sin(ts * 44) : 0, sh2 = shaking ? 14 * Math.cos(ts * 37) : 0;
      const acc = { x: G * Math.sin(g) * Math.cos(b) + n() + sh, y: G * Math.sin(b) + n() + sh2, z: G * Math.cos(b) * Math.cos(g) + n() };
      const cur = { a: heading, b: sim.b, g: sim.g };
      const rot = sim.prev ? { a: ((cur.a - sim.prev.a + 540) % 360 - 180) * 60 + (Math.random() - 0.5) * 2 + (shaking ? 200 * Math.sin(ts * 30) : 0), b: (cur.b - sim.prev.b) * 60 + (Math.random() - 0.5) * 2, g: (cur.g - sim.prev.g) * 60 + (Math.random() - 0.5) * 2 } : { a: 0, b: 0, g: 0 };
      sim.prev = cur;
      process(acc, shaking ? { x: sh, y: sh2, z: 0 } : null, rot);
    }
  };

  function decide() {
    if (NV.settings.forcesim) { S.motionMode = 'sim'; S.orientMode = 'sim'; emit('mode'); return; }
    if (!gotMotion) S.motionMode = S.needsPerm ? 'perm' : 'sim';
    if (!gotOri) S.orientMode = S.needsPerm ? 'perm' : 'sim';
    emit('mode');
  }
  S.requestPermission = async () => {
    try {
      const r1 = await DeviceMotionEvent.requestPermission();
      let r2 = 'granted';
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') r2 = await DeviceOrientationEvent.requestPermission();
      if (r1 === 'granted' || r2 === 'granted') { S.needsPerm = false; NV.toast('Motion sensors authorised. Splendid.'); setTimeout(decide, 1500); emit('mode'); return true; }
      NV.toast('Motion permission declined. Simulation it is, Sir.');
    } catch (e) { NV.toast('Motion permission unavailable here. Running the simulation.'); }
    S.needsPerm = false; decide(); return false;
  };
  S.resetPeak = () => { S.peakG = S.g; };
  S.isSim = () => S.motionMode !== 'live' || S.orientMode !== 'live';
  S.init = () => {
    S.needsPerm = !!(window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function');
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientation', (e) => onOrient(e, false));
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', (e) => onOrient(e, true));
    setTimeout(decide, 1500);
    NV.onSetting((k, v) => { if (k === 'forcesim') { if (v) { gotMotion = false; gotOri = false; } decide(); } });
  };
  S.caps = {
    motion: () => (S.motionMode === 'live' ? 'live' : window.DeviceMotionEvent ? 'sim' : 'na'),
    orient: () => (S.orientMode === 'live' ? 'live' : window.DeviceOrientationEvent ? 'sim' : 'na')
  };
})();
