/* NICK-VERSE Scanner: CINCO Customer Support Hotline. Pure parody: nothing is dialled, no links, no purchases. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, TAU = Math.PI * 2;
  const H = { on: false };
  const QUEUE = [7, 12, 38, 104, 512, 1024, 9001, 48213, 1000000, 7.3e7, 4.2e9, 1e12, 1e18, 1e42, 1e100, Infinity, 'behind yourself', -3, 'a strongly worded letter', 'π'];
  const MSGS = ['Your call is important to us. Relatively speaking.', 'Please hold. Gary is looking for the phone.', 'Did you know? Most CINCO problems resolve themselves if you move house.', 'Our advisors are currently experiencing a lunch.', 'Your position has improved backwards. Congratulations.', 'Please continue to hold. Holding builds character.', 'We have detected you are still here. Impressive.', 'For faster service, please call yesterday.', 'The queue is now larger than the observable universe. Please remain calm.', 'You are now queueing behind yourself. Try not to push.', 'Estimated wait time: yes.', 'We value your patience and have added it to our collection.', 'Press 3 to speak to a human. Humans may not be available in your region.'];
  const TRACKS = ["Gary's Theme (Smooth Hold Mix)", 'Greensleeves But Worse', 'Four Minutes of Mild Optimism', 'Elevator to Nowhere (Extended)', 'Lo-Fi Beats to Wait Forever To', 'The CINCO Anthem (Kazoo Edition)'];
  const TREE = {
    root: { text: 'Welcome to CINCO Support. For product broken, press 1. Working too well, press 2. Human, press 3. Billing, press 4. Morse code, press 5. Press 6 to hear a fact. 0 for the operator. # to hang up.', keys: { 1: 'broken', 2: 'toowell', 3: 'human', 4: 'billing', 5: 'morse', 6: 'fact', 7: 'seven', 8: 'eight', 0: 'operator', '*': 'star', '#': 'hangup' } },
    broken: { text: 'Product broken. Press 1 if it is broken on purpose. Press 2 if you have tried turning it off and on and on and off. Press 9 to go back.', keys: { 1: 'onpurpose', 2: 'offon', 9: 'root' } },
    onpurpose: { text: 'Excellent. That is a feature. Your product is working as disappointed. Returning to the main menu.', go: 'root' },
    offon: { text: 'Have you tried turning it sideways? Our engineers recommend 45 degrees and a hopeful expression. Returning you to the main menu.', go: 'root' },
    toowell: { text: 'Your product is working too well. This is highly irregular. A CINCO technician will be dispatched to make it worse. Returning to the main menu.', go: 'root' },
    human: { text: 'Connecting you to a human…', go: 'human2', delay: 2200 },
    human2: { text: 'Hello, you are through to Gary. Gary is a very convincing recording of Gary. Gary says: have you tried the Emotional Support Stapler? Press 9 to go back.', keys: { 9: 'root' } },
    billing: { text: 'Billing. Your account balance is a small sad potato. There is nothing to pay, because this is not a real hotline. Press 9 to go back.', keys: { 9: 'root' } },
    morse: { text: 'Morse support is now active. Beep boop beep. Translation: please continue to hold.', morse: true, go: 'root', delay: 4200 },
    fact: { text: 'Fun fact: the Silent Doorbell has never once disturbed anyone. Customer satisfaction: unknown. Returning to the main menu.', go: 'root', delay: 4800 },
    seven: { text: 'You pressed 7. Nobody has ever pressed 7. The menu is flattered and briefly speechless.', go: 'root', delay: 3800 },
    eight: { text: 'Option 8 has been discontinued due to a surplus of eights. Please press a different number.', go: 'root', delay: 3800 },
    operator: { text: 'The operator is operating. Please hold while they finish operating.', go: 'root', delay: 3400 },
    star: { text: 'You have pressed star. You are a star. Nothing else has changed.', go: 'root', delay: 3000 }
  };
  let node = 'root', started = 0, qi = 0, timers = [], raf = 0, trackI = 0, typing = 0;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  function fmtQ(v) { if (typeof v === 'string') return v; if (v === Infinity) return '∞'; if (v >= 1e100) return '1 googol'; if (v >= 1e12) return v.toExponential(0).replace('e+', '×10^'); return Math.round(v).toLocaleString('en-GB'); }
  function lcd(text) { const el = $('#hot-lcd'); clearInterval(typing); if (NV.reducedMotion) { el.textContent = text; return; } let i = 0; el.textContent = ''; typing = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typing); }, 18); }
  function go(id) {
    const n = TREE[id]; if (!n) return; node = id; lcd(n.text);
    if (n.morse) { const t0 = 300; '.-.. --- .-..'.split('').forEach((ch, i) => { if (ch !== ' ') { later(() => NV.audio.beep(true, 740), t0 + i * 260); later(() => NV.audio.beep(false), t0 + i * 260 + (ch === '.' ? 70 : 200)); } }); }
    if (n.go) later(() => { if (H.on) go(n.go); }, n.delay || 3600);
  }
  function press(k) {
    NV.audio.dtmf(k); NV.haptic(8); const b = $(`#hot-pad [data-k="${CSS.escape(k)}"]`); if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
    const n = TREE[node]; const nxt = n.keys && n.keys[k];
    if (k === '#' || nxt === 'hangup') { lcd('Thank you for calling CINCO. Your call was not recorded because nothing is real.'); later(() => NV.closeModal('hotline'), 1100); return; }
    if (nxt) go(nxt); else if (!n.go) { lcd('That option is not available. Neither are the others, strictly speaking. ' + n.text); }
  }
  function bump() {
    if (!H.on) return; qi = Math.min(QUEUE.length - 1, qi + 1); const v = QUEUE[qi];
    const el = $('#hot-queue'); el.textContent = fmtQ(v); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    NV.text('#hot-msg', MSGS[Math.min(MSGS.length - 1, qi % MSGS.length)]);
    if (typeof v !== 'number' || v >= 1000) NV.award('hotline');
    if (qi === 8) NV.jarvis.speak('Sir, your queue position is now in the millions. I suggest we let CINCO call us. They will not, of course.', { tag: 'CINCO' });
    if (qi === QUEUE.length - 1) { qi = 5; }
    later(bump, NV.lerp(4200, 2600, Math.random()));
  }
  function viz() {
    if (!H.on) return; const f = NV.fit($('#hot-viz')); if (!f) { raf = requestAnimationFrame(viz); return; } const { x, w, h } = f, c = NV.colors, t = performance.now() / 1000;
    x.clearRect(0, 0, w, h);
    const an = NV.audio.musicAnalyser; let data = null;
    if (an && NV.audio.loopKind && NV.audio.loopKind('music') === 'hold') { data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data); if (!data.some((v) => v > 0)) data = null; }
    const bars = w < 400 ? 28 : 48, bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const fake = 0.25 + 0.3 * Math.abs(Math.sin(t * 2.1 + i * 0.45)) * (0.6 + 0.4 * Math.sin(t * 5.3 + i)) + 0.12 * Math.sin(t * 9 + i * 1.7); let v = data ? Math.max(data[Math.floor(Math.pow(i / bars, 1.35) * data.length * 0.4)] / 255, fake * 0.3) : fake;
      v = NV.clamp(v, 0.04, 1); const bh = v * (h - 10), g = x.createLinearGradient(0, h, 0, h - bh); g.addColorStop(0, '#ff3b7a'); g.addColorStop(0.6, '#ffb547'); g.addColorStop(1, '#fff3a8');
      x.fillStyle = g; const px = i * bw + 1.5, ww = bw - 3; x.beginPath(); x.roundRect ? x.roundRect(px, h - bh, ww, bh, 2) : x.rect(px, h - bh, ww, bh); x.fill();
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px, h - bh - 4, ww, 2);
    }
    x.strokeStyle = NV.rgba(c.secondary, 0.25); x.beginPath(); for (let i = 0; i <= w; i += 4) { const y = h / 2 + Math.sin(i / 22 + t * 3) * 8 * Math.sin(t * 0.7); i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke();
    const s = Math.floor((Date.now() - started) / 1000); NV.text('#hot-clock', NV.pad(Math.floor(s / 60)) + ':' + NV.pad(s % 60));
    raf = requestAnimationFrame(viz);
  }
  H.show = () => {
    if (H.on) return; H.on = true; node = 'root'; qi = 0; started = Date.now(); trackI = Math.floor(Math.random() * TRACKS.length);
    $('#hot-queue').textContent = fmtQ(QUEUE[0]); NV.text('#hot-msg', MSGS[0]); NV.text('#hot-track', TRACKS[trackI]);
    NV.openModal('hotline'); later(() => lcd('Ringing… ring ring… connecting you to the CINCO automated assistance experience™.'), 150);
    later(() => { if (H.on) go('root'); }, 2600); later(bump, 4200);
    later(() => { if (H.on) NV.audio.startLoop('hold', 'music'); }, 900);
    timers.push(setInterval(() => { trackI = (trackI + 1) % TRACKS.length; NV.text('#hot-track', TRACKS[trackI]); }, 24000));
    cancelAnimationFrame(raf); raf = requestAnimationFrame(viz);
    NV.jarvis.log('Dialling CINCO support. I have packed you a sandwich, Sir.', 'CINCO');
  };
  H.close = () => { if (!H.on) return; H.on = false; timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers = []; clearInterval(typing); cancelAnimationFrame(raf); NV.audio.stopLoop('music'); };
  NV.hotline = { open: H.show, close: H.close, get isOpen() { return H.on; } };
  NV._init_hotline = () => {
    const keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', 'OPER'], ['#', 'BYE']];
    $('#hot-pad').innerHTML = keys.map(([k, l]) => `<button type="button" data-k="${k}" aria-label="Key ${k}"><b>${k}</b><small>${l}</small></button>`).join('');
    $('#hot-pad').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    $('#hotline').addEventListener('keydown', (e) => { if (/^[0-9*#]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); press(e.key); } });
    $('#hot-hangup').onclick = () => NV.closeModal('hotline');
  };
})();
