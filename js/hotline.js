/* NICK-VERSE Scanner: CINCO Customer Support Hotline, v11 "Deluxe Suffering Edition".
   Pure parody: nothing is dialled, no links, no numbers, no purchases, nothing leaves the browser. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const H = { on: false, tab: 'phone' };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  let timers = [], typing = 0, node = 'root', depth = 1, maxDepth = 1, started = 0, qi = 0, raf = 0;

  // ---------------- JARVIS commentary ----------------
  let jvLast = 0;
  function jv(text, { speak = false, force = false } = {}) {
    const now = performance.now(); if (!force && now - jvLast < 2500) return; jvLast = now;
    const el = $('#hot-jv-t'); if (el) { el.textContent = text; const b = $('#hot-jv'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    if (speak && !annOn && NV.settings.commentary) NV.jarvis.speak(text, { tag: 'CINCO' }); else NV.jarvis.log(text, 'CINCO');
  }
  const JV = {
    open: ['Dialling CINCO support. I have packed you a sandwich, Sir.', 'Connecting to CINCO. I shall monitor your blood pressure from here.', 'Ah, CINCO support. Where hope goes to be put on hold.'],
    deep: ['We are now several menus deep, Sir. I have left a trail of breadcrumbs.', 'I believe this menu is recursive, Sir. So, I fear, is the pain.', 'Sir, I have lost track of which menu we are in. So, I suspect, has CINCO.'],
    dj: ['Every skip makes it worse, Sir. That is not a bug; I checked. It is company policy.', 'I did not think the music could deteriorate further. I was wrong.', 'That track has been skipped so hard it is now legally a different song.'],
    esc: ['Escalating, Sir. Please mind the gap between management tiers.', 'Onwards and upwards, Sir. Mostly upwards. Occasionally sideways.', 'Each rung of this ladder is less helpful than the last. Fascinating.'],
    bot: ['CINCObot has the conversational range of a toaster, Sir. A disappointed toaster.', 'I would offer to translate, Sir, but CINCObot does not understand itself either.', 'Sir, I believe CINCObot has just misunderstood the word "yes".'],
    claim: ['Rejected again, Sir. I am starting to admire their consistency.', 'I have read the warranty, Sir. It is 900 pages of the word "no" in different fonts.', 'Remarkable. They rejected it before you finished typing.'],
    survey: ['Every option is bad, Sir. I suggest picking the least dreadful one.', 'I have seen elections with more choice, Sir. Admittedly not many.'],
    ann: ['Another announcement, Sir. I shall pretend I did not hear it.', 'That voice is not me, Sir. I would never say "valued caller" with a straight face.'],
    callback: ['They will not call back, Sir. But the apologies are coming thick and fast.', 'Another apology, Sir. At this rate they will owe you a medal.']
  };

  // ---------------- Queue ----------------
  const QUEUE = [7, 12, 38, 104, 512, 1024, 9001, 48213, 1000000, 7.3e7, 4.2e9, 1e12, 1e18, 1e42, 1e100, Infinity, 'behind yourself', -3, 'a strongly worded letter', 'π'];
  const MSGS = ['Your call is important to us. Relatively speaking.', 'Please hold. Gary is looking for the phone.', 'Did you know? Most CINCO problems resolve themselves if you move house.', 'Our advisors are currently experiencing a lunch.', 'Your position has improved backwards. Congratulations.', 'Please continue to hold. Holding builds character.', 'We have detected you are still here. Impressive.', 'For faster service, please call yesterday.', 'The queue is now larger than the observable universe. Please remain calm.', 'You are now queueing behind yourself. Try not to push.', 'Estimated wait time: yes.', 'We value your patience and have added it to our collection.', 'Press 3 to speak to a human. Humans may not be available in your region.'];
  function fmtQ(v) { if (typeof v === 'string') return v; if (v === Infinity) return '∞'; if (v >= 1e100) return '1 googol'; if (v >= 1e12) return v.toExponential(0).replace('e+', '×10^'); return Math.round(v).toLocaleString('en-GB'); }
  function bump() {
    if (!H.on) return; qi = Math.min(QUEUE.length - 1, qi + 1); const v = QUEUE[qi];
    const el = $('#hot-queue'); el.textContent = fmtQ(v); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    NV.text('#hot-msg', MSGS[qi % MSGS.length]);
    if (typeof v !== 'number' || v >= 1000) NV.award('hotline');
    if (qi === 8) jv('Sir, your queue position is now in the millions. I suggest we let CINCO call us. They will not, of course.', { speak: true });
    if (qi === QUEUE.length - 1) qi = 5;
    later(bump, NV.lerp(4200, 2600, Math.random()));
  }

  // ---------------- Phone tree (recursive) ----------------
  const TREE = {
    root: { text: 'Welcome to CINCO Support. 1: product broken. 2: working too well. 3: speak to a human. 4: billing. 5: existential crisis. 6: a fact. 7: nobody presses 7. 8: the menu about menus. 9: language options. 0: operator. #: hang up.', keys: { 1: 'broken', 2: 'toowell', 3: 'human', 4: 'billing', 5: 'exist', 6: 'fact', 7: 'seven', 8: 'meta', 9: 'lang', 0: 'operator', '*': 'star' } },
    broken: { text: 'Product broken. 1: broken on purpose. 2: tried turning it off and on and on and off. 3: it was like that when you found it. 4: it is broken in a way that sparks joy. 9: go back.', keys: { 1: 'onpurpose', 2: 'offon', 3: 'found', 4: 'joy', 9: 'back' } },
    onpurpose: { text: 'Excellent. That is a feature. Your product is working as disappointed. Returning to the main menu.', go: 'root' },
    offon: { text: 'Have you tried turning it sideways? Our engineers recommend 45 degrees and a hopeful expression. 1: tried sideways. 2: tried upside down. 9: go back.', keys: { 1: 'sideways', 2: 'upside', 9: 'back' } },
    sideways: { text: 'Sideways did not work? Then it is definitely a you problem. Transferring you to the Department of You Problems.', go: 'youdept', delay: 3800 },
    youdept: { text: 'Department of You Problems. All of our advisors are currently also having you problems. 1: leave a sigh after the tone. 9: go back.', keys: { 1: 'sigh', 9: 'back' } },
    sigh: { text: 'Beeeep. Thank you. Your sigh has been filed under "Sighs, Assorted". Returning to the main menu.', go: 'root', delay: 3600 },
    upside: { text: 'Upside down voids the warranty. So does right-side up. So does looking at it. Returning to the main menu.', go: 'root' },
    found: { text: 'Finders keepers, breakers weepers. That is CINCO policy 7(b). Returning to the product broken menu.', go: 'broken' },
    joy: { text: 'Wonderful! Please keep it. CINCO is contractually unable to fix joy. Returning to the main menu.', go: 'root' },
    toowell: { text: 'Your product is working too well. This is highly irregular. 1: request a technician to make it worse. 2: report it to the authorities. 9: go back.', keys: { 1: 'worse', 2: 'authorities', 9: 'back' } },
    worse: { text: 'A CINCO technician has been dispatched to make it worse. Estimated arrival: whenever it is least convenient. Returning to the main menu.', go: 'root' },
    authorities: { text: 'The authorities have been notified. The authorities are also Gary. Gary is disappointed in you. Returning to the main menu.', go: 'root' },
    human: { text: 'Connecting you to a human…', go: 'human2', delay: 2200 },
    human2: { text: 'Hello, you are through to Gary. Gary is a very convincing recording of Gary. Gary says: have you tried the Emotional Support Stapler? 1: yes. 2: no. 9: go back.', keys: { 1: 'gary1', 2: 'gary1', 9: 'back' } },
    gary1: { text: 'Gary says: "Great. Have you tried it again?" 1: yes. 2: no. 3: are you a recording? 9: go back.', keys: { 1: 'gary1', 2: 'gary1', 3: 'gary2', 9: 'back' } },
    gary2: { text: 'Gary says: "I am absolutely not a recording." Gary says: "I am absolutely not a recording." Gary says: "I am absolutely—" Returning to the main menu.', go: 'root', delay: 4600 },
    billing: { text: 'Billing. Your account balance is a small sad potato. 1: dispute the potato. 2: pay in compliments. 3: request an itemised potato. 9: go back.', keys: { 1: 'potato', 2: 'compliment', 3: 'itemised', 9: 'back' } },
    potato: { text: 'Potato disputes are handled by the Potato Dispute Resolution Tribunal, which meets once a leap century. You are number 4 in the queue. Returning to billing.', go: 'billing', delay: 4200 },
    compliment: { text: 'Compliment received: "Nice menu." Your balance is now a medium sad potato. Thank you. Returning to billing.', go: 'billing', delay: 3800 },
    itemised: { text: 'Itemised potato: one potato, sad, small. Tax: another potato. Returning to billing. There is nothing to pay; this is not a real hotline.', go: 'billing', delay: 4600 },
    exist: { text: 'Existential support. 1: why am I here? 2: is anything real? 3: what is the meaning of CINCO? 9: go back, if back even exists.', keys: { 1: 'why', 2: 'real', 3: 'meaning', 9: 'back' } },
    why: { text: 'You are here because you pressed 5. Everything follows from pressing 5. Returning you to the existential menu, which you chose, freely, allegedly.', go: 'exist', delay: 4400 },
    real: { text: 'Nothing is real. Especially this hotline. Especially especially the warranty. Returning to the main menu.', go: 'root' },
    meaning: { text: 'CINCO stands for Customers Invariably Need Constant Oversight. It did not originally stand for anything. It now stands for that. Returning to the main menu.', go: 'root', delay: 4600 },
    fact: { text: 'Fun fact: the Silent Doorbell has never once disturbed anyone. Customer satisfaction: unknown. Returning to the main menu.', go: 'root', delay: 4800 },
    seven: { text: 'You pressed 7. Nobody has ever pressed 7. The menu is flattered and briefly speechless. …… Returning to the main menu.', go: 'root', delay: 3800 },
    lang: { text: 'For English, press 1. For English but louder, press 2. For Morse code, press 3. For interpretive dance, press 4. 9: go back.', keys: { 1: 'root', 2: 'loud', 3: 'morse', 4: 'dance', 9: 'back' } },
    loud: { text: 'WELCOME TO CINCO SUPPORT. YOUR CALL IS IMPORTANT TO US. RETURNING TO THE MAIN MENU. SORRY. SORRY. IS THIS BUTTON STUCK.', go: 'root', delay: 4200 },
    morse: { text: 'Morse support is now active. Beep boop beep. Translation: please continue to hold.', morse: true, go: 'root', delay: 4200 },
    dance: { text: 'Please perform your query as an interpretive dance now. …… Thank you. We have interpreted it as "billing". Transferring.', go: 'billing', delay: 5200 },
    operator: { text: 'The operator is operating. Transferring you to the escalation department, which is a ladder.', go: 'root', delay: 3400, tab: 'esc' },
    star: { text: 'You have pressed star. You are a star. Nothing else has changed.', go: 'root', delay: 3000 }
  };
  const stack = [];
  function metaNode(n) {
    const about = Array.from({ length: Math.min(n, 5) }, () => 'the menu about').join(' ') + (n > 5 ? ` (×${n - 5} more)` : '');
    return { text: `You have reached ${about} menus. Depth ${n}. 1: go deeper. 2: go shallower (currently unavailable). 3: hear this menu again, but slower. 9: main menu.`, keys: { 1: 'meta+', 2: 'shallow', 3: 'meta=', 9: 'root' } };
  }
  function lcd(text) { const el = $('#hot-lcd'); clearInterval(typing); if (NV.reducedMotion) { el.textContent = text; return; } let i = 0; el.textContent = ''; typing = setInterval(() => { i += 4; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typing); }, 33); }
  let metaN = 0;
  function nodeOf(id) { return id === 'meta' ? metaNode(metaN) : TREE[id]; }
  function setDepth(d) {
    depth = Math.max(1, d); maxDepth = Math.max(maxDepth, depth); NV.text('#hot-depth', depth); NV.text('#hot-crumb', stack.slice(-3).map((s) => s === 'meta' ? 'meta×' + metaN : s).join(' › ') || 'main');
    if (depth >= 10) NV.award('deepmenu'); if (depth === 5 || depth === 9 || depth === 14) jv(pick(JV.deep), { speak: depth === 9 });
  }
  function go(id, how = 'push') {
    if (id === 'back') { stack.pop(); const prev = stack.pop() || 'root'; if (Math.random() < 0.35 && prev !== 'root') { lcd('Going back… to a menu you have never seen before.'); later(() => H.on && go(pick(['exist', 'lang', 'billing', 'toowell'])), 2200); return; } id = prev; how = 'back'; }
    if (id === 'meta+') { metaN++; id = 'meta'; } else if (id === 'meta=') { id = 'meta'; } else if (id === 'meta') metaN = Math.max(1, metaN || 1);
    if (id === 'shallow') { lcd('Going shallower is a premium feature. Going deeper instead. Enjoy.'); later(() => { if (H.on) { metaN++; go('meta'); } }, 2200); return; }
    const n = nodeOf(id); if (!n) return;
    if (id === 'root') { stack.length = 0; metaN = 0; setDepth(1); } else { stack.push(id); setDepth(how === 'back' ? depth - 1 : depth + 1); }
    node = id; lcd(n.text);
    if (n.morse) { const t0 = 300; '.-.. --- .-..'.split('').forEach((ch, i) => { if (ch !== ' ') { later(() => NV.audio.beep(true, 740), t0 + i * 260); later(() => NV.audio.beep(false), t0 + i * 260 + (ch === '.' ? 70 : 200)); } }); }
    if (n.tab) later(() => H.on && showTab(n.tab), 2600);
    if (n.go) later(() => { if (H.on && node === id) go(n.go, 'jump'); }, n.delay || 3600);
  }
  function press(k) {
    NV.audio.dtmf(k); NV.haptic(8); const b = $(`#hot-pad [data-k="${CSS.escape(k)}"]`); if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
    if (H.tab !== 'phone') showTab('phone');
    if (k === '#') { lcd('Thank you for calling CINCO. Your call was not recorded because nothing is real.'); later(() => NV.closeModal('hotline'), 1200); return; }
    const n = nodeOf(node), nxt = n && n.keys && n.keys[k];
    if (nxt) go(nxt); else if (n && !n.go) lcd('That option is not available. Neither are the others, strictly speaking. ' + n.text);
  }

  // ---------------- Hold-music DJ ----------------
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const TRACKS = [
    { name: "Gary's Theme (Smooth Hold Mix)", bpm: 96, bar: (t, st, S, w, dj) => { // I-vi-ii-V elevator jazz
      const ch = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]][st % 4], b = dj.beat;
      ch.forEach((m, i) => dj.note(m, t + i * 0.02, b * 3.6, { type: 'triangle', gain: 0.03, attack: 0.08 }));
      dj.note(ch[0] - 12, t, b * 1.5, { gain: 0.11, bass: true }); dj.note(ch[2] - 12, t + b * 2, b * 1.5, { gain: 0.09, bass: true });
      [[76, 0], [74, 0.5], [72, 1], [74, 1.5], [76, 1.75], [79, 2.5], [77, 3], [76, 3.5]].forEach(([m, bt]) => dj.note(m + [0, -2, 2, -1][st % 4], t + bt * b, b * 0.8, { gain: 0.055 }));
      for (let i = 0; i < 8; i++) dj.hat(t + i * b * 0.5, i % 2 ? 0.01 : 0.018);
    } },
    { name: 'Lo-Fi Beats to Wait Forever To', bpm: 72, bar: (t, st, S, w, dj) => {
      const b = dj.beat, ch = [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 66]][st % 4];
      ch.forEach((m, i) => dj.note(m, t + i * 0.05, b * 3.8, { type: 'sine', gain: 0.045, attack: 0.2 }));
      dj.kick(t); dj.kick(t + b * 2.5); dj.snare(t + b); dj.snare(t + b * 3); for (let i = 0; i < 8; i++) dj.hat(t + i * b * 0.5 + (i % 2 ? 0.04 : 0), 0.012);
      dj.crackle(t, b * 4, 0.012);
    } },
    { name: 'The CINCO Anthem (Kazoo Edition)', bpm: 120, bar: (t, st, S, w, dj) => {
      const b = dj.beat, mel = [[67, 67, 72, 74], [76, 74, 72, 71], [69, 71, 72, 69], [67, 0, 67, 0]][st % 4];
      mel.forEach((m, i) => { if (m) dj.note(m, t + i * b, b * 0.9, { type: 'sawtooth', gain: 0.05, kazoo: true, vib: true }); });
      dj.note([48, 53, 55, 48][st % 4], t, b * 1.8, { type: 'square', gain: 0.05, bass: true }); dj.note([55, 60, 50, 55][st % 4], t + b * 2, b * 1.8, { type: 'square', gain: 0.05, bass: true });
      dj.snare(t + b); dj.snare(t + b * 3);
    } },
    { name: 'Elevator to Nowhere (Extended)', bpm: 110, bar: (t, st, S, w, dj) => { // bossa arpeggio
      const b = dj.beat, root = [62, 67, 60, 65][st % 4], arp = [0, 7, 10, 14, 10, 7, 3, 7];
      arp.forEach((iv, i) => dj.note(root + iv, t + i * b * 0.5, b * 0.45, { type: 'triangle', gain: 0.045 }));
      [0, 1.5, 2, 3.5].forEach((bt) => dj.note(root - 24 + (bt >= 2 ? 7 : 0), t + bt * b, b * 0.5, { gain: 0.1, bass: true }));
      [0.5, 1.5, 2.25, 3, 3.5].forEach((bt) => dj.hat(t + bt * b, 0.015));
    } },
    { name: "Recorder Recital by Gary's Nephew", bpm: 84, bar: (t, st, S, w, dj) => {
      const b = dj.beat, mel = [[72, 74, 76, 72], [72, 74, 76, 72], [76, 77, 79, 0], [76, 77, 79, 0]][st % 4];
      mel.forEach((m, i) => { if (m) dj.note(m + (Math.random() < 0.18 ? pick([-1, 1, 2]) : 0), t + i * b, b * 0.85, { type: 'sine', gain: 0.07, vib: true, breath: true }); });
    } },
    { name: 'Dial-Up Serenade (Remastered)', bpm: 100, bar: (t, st, S, w, dj) => {
      const b = dj.beat; dj.note(81, t, b * 0.7, { type: 'square', gain: 0.02 }); dj.note(76, t + b, b * 0.7, { type: 'square', gain: 0.02 });
      S.noise(t + b * 2, b * 0.9, { gain: 0.03, freq: 1800, sweepTo: 3200, q: 8, dest: dj.dest }); S.tone(1200, t + b * 3, b * 0.8, { type: 'sawtooth', gain: 0.015, glideTo: 2400, dest: dj.dest, filter: { type: 'bandpass', freq: 1800, q: 3 } });
      dj.note([48, 50, 52, 50][st % 4], t, b * 3.8, { type: 'triangle', gain: 0.06, bass: true });
    } }
  ];
  const WORSE = ['', ' (Slightly Worse)', ' (Played Underwater)', ' (Recorded on a Potato)', ' (Kazoo Remix, Unrequested)', ' (Gary Humming Along)', ' (Heard Through a Wall)', ' (Beyond Help)'];
  const DJ = { i: 0, worse: 0, skips: 0 };
  function djVoice(S, w) {
    const dest = S.musicBus, beat = 60 / TRACKS[DJ.i].bpm;
    const note = (m, t, dur, o = {}) => {
      if (!m) return; const wrong = Math.random() < w * 0.07 ? pick([-1, 1, 6]) : 0, det = (Math.random() * 2 - 1) * w * 22 + (w >= 2 ? Math.sin(t * 3) * w * 10 : 0);
      const f = N(m + wrong) * (w >= 6 ? 0.5 : 1), band = o.bass ? null : { type: 'bandpass', freq: w >= 2 ? 900 : 1300, q: 0.5 + w * 0.8 };
      S.tone(f, t, dur * (w >= 3 ? 0.6 + Math.random() * 0.7 : 1), { type: w >= 4 && !o.bass ? 'square' : (o.type || 'sine'), gain: (o.gain || 0.05) * (w >= 5 ? 0.8 : 1), attack: o.attack || 0.01, dest, filter: band, detune: det, glideTo: w >= 5 && Math.random() < 0.3 ? f * 0.94 : null });
      if (o.kazoo || (w >= 4 && !o.bass)) S.tone(f * 1.005, t, dur * 0.9, { type: 'sawtooth', gain: 0.018, dest, filter: { type: 'bandpass', freq: 1100, q: 6 } });
      if (o.breath || w >= 5) S.noise(t, dur * 0.5, { gain: 0.006 + w * 0.002, freq: 2500, q: 1, dest });
    };
    return { dest, beat, note,
      kick: (t) => S.tone(70, t, 0.18, { gain: 0.16, glideTo: 42, dest }),
      snare: (t) => S.noise(t, 0.12, { gain: 0.04, freq: 1800, q: 0.7, dest }),
      hat: (t, g) => S.noise(t, 0.035, { gain: g, freq: 7500, q: 1, dest }),
      crackle: (t, d, g) => { for (let i = 0; i < 6; i++) S.noise(t + Math.random() * d, 0.01, { gain: g * (1 + w), freq: 3000 + Math.random() * 4000, q: 4, dest }); } };
  }
  function djPlay() {
    if (!H.on || !NV.audio.canPlay()) { djLabel(); return; }
    const tr = TRACKS[DJ.i], barMs = 60 / tr.bpm * 4 * 1000 * (DJ.worse >= 3 ? 1.08 : 1);
    NV.audio.customLoop('music', 'dj', barMs, (t, st, S) => { const w = DJ.worse, dj = djVoice(S, w); tr.bar(t, st, S, w, dj); if (w >= 2) dj.crackle(t, barMs / 1000, 0.01); if (w >= 6 && st % 2) S.tone(110, t, barMs / 1000, { type: 'sawtooth', gain: 0.02, dest: dj.dest, filter: { freq: 400 } }); });
    djLabel();
  }
  function djLabel() {
    const tr = TRACKS[DJ.i]; NV.text('#hot-track', tr.name + WORSE[Math.min(DJ.worse, WORSE.length - 1)]);
    const q = Math.max(0, 5 - Math.ceil(DJ.worse * 5 / 7)); NV.text('#hot-q', '★'.repeat(q) + '☆'.repeat(5 - q));
    NV.text('#hot-djq', ['Audiophile', 'Tolerable', 'Questionable', 'Soggy', 'Potato-grade', 'Hostile', 'Structural damage', 'A war crime against ears'][Math.min(DJ.worse, 7)]);
  }
  function skip() {
    DJ.i = (DJ.i + 1) % TRACKS.length; DJ.worse = Math.min(7, DJ.worse + 1); DJ.skips++;
    NV.audio.whoosh(); NV.haptic(10); djPlay();
    const tips = ['DJ Gary says: "Great choice! Here is something worse."', 'DJ Gary has lowered the bitrate as punishment.', 'DJ Gary has replaced the drummer with a stapler.', 'DJ Gary is now playing it from a phone in his pocket.', 'DJ Gary has requested you stop skipping. He is fragile.', 'DJ Gary has left the booth. The music continues without supervision.', 'DJ Gary is back. He has brought a kazoo.'];
    NV.text('#hot-djmsg', tips[Math.min(DJ.skips - 1, tips.length - 1)]);
    if (DJ.worse >= 5) NV.award('dj'); if (DJ.skips === 2 || DJ.skips === 5) jv(pick(JV.dj), { speak: DJ.skips === 5 });
  }

  // ---------------- Hold announcements (a different voice) ----------------
  const ANN = ['Attention callers: the queue has been moved to a different building. Please hold while it is carried up the stairs.', 'This is a courtesy announcement. It is not courteous.', 'Callers wearing socks will now be served first. Callers wearing one sock will be served in half.', 'Reminder: CINCO support is closed on days.', 'The previous announcement has been recalled for safety reasons.', 'Your call may be recorded for training purposes. The trainee is a pigeon.', 'We are experiencing higher than usual call volumes. Usual is also high. Everything is high.', 'Did you know you can skip the queue by not calling? Many customers find this very effective.', 'Please do not press any buttons. Or do. We cannot see you. Or can we. We cannot.', 'This announcement is sponsored by the CINCO Silent Doorbell. You would not have heard it anyway.', 'A reminder that Gerald is watching. Gerald is always watching. Please enjoy the music.'];
  let annOn = false, annI = 0;
  function announce() {
    if (!H.on) return; const text = ANN[annI++ % ANN.length]; annOn = true;
    const bar = $('#hot-ann'); NV.text('#hot-ann-t', text); bar.hidden = false; bar.classList.remove('in'); void bar.offsetWidth; bar.classList.add('in');
    const S = NV.audio.canPlay() ? NV.audio.synth : null; if (S) { S.musicBus.gain.setTargetAtTime(NV.settings.musiclevel * 0.25, S.ctx.currentTime, 0.2); const t = S.ctx.currentTime; S.tone(784, t, 0.35, { gain: 0.08 }); S.tone(622, t + 0.3, 0.5, { gain: 0.08 }); }
    const spoke = NV.jarvis.speakAlt ? later(() => NV.jarvis.speakAlt(text), 700) : 0;
    later(() => { annOn = false; bar.classList.remove('in'); later(() => { bar.hidden = true; }, 400); if (S) S.musicBus.gain.setTargetAtTime(NV.settings.musiclevel, S.ctx.currentTime, 0.6); }, Math.max(6000, text.length * 75));
    if (annI === 2) later(() => jv(pick(JV.ann)), 7000);
    later(announce, NV.lerp(32000, 46000, Math.random()));
    return spoke;
  }

  // ---------------- Supervisor escalation ladder ----------------
  const LADDER = [
    { who: 'Supervisor', name: 'Dave', wait: 1600, say: 'Dave puts his hand over the phone and pretends to be his own voicemail. "Dave is not available. This is also Dave."' },
    { who: 'Senior Supervisor', name: 'Brenda', wait: 2200, say: 'Brenda says she will escalate your call as soon as she finds the escalator. She has been looking since 2019.' },
    { who: 'Regional Manager of Supervisors', name: 'Colin', wait: 2800, say: 'Colin is in a meeting about meetings. He sends a thumbs-up emoji, reads your complaint aloud, then sends another thumbs-up emoji.' },
    { who: 'The CINCO Board', name: 'Five people and a ficus', wait: 3400, say: 'The Board has voted 4 to 1 to form a committee to consider acknowledging your call. The ficus abstained. Gerald has been notified.' },
    { who: 'Gerald', name: 'Gerald', wait: 4200, say: 'Gerald picks up. There is a long, long pause. Gerald says: "No." Gerald hangs up. Somewhere, a stapler weeps.' }
  ];
  let rung = 0, escBusy = false;
  function renderLadder() {
    $('#hot-ladder').innerHTML = LADDER.map((l, i) => `<li class="${i < rung ? 'done' : i === rung ? 'next' : ''}${l.who === 'Gerald' ? ' gerald' : ''}"><span class="hl-n mono">${i + 1}</span><span class="hl-t"><b>${l.who}</b><small>${i < rung ? 'Unhelpful ✓' : i === rung ? 'Awaiting escalation' : 'Locked'}</small></span></li>`).join('');
    const b = $('#hot-escalate'); b.textContent = rung >= LADDER.length ? 'Escalate beyond Gerald' : `Escalate to ${LADDER[rung].who}`; b.disabled = escBusy;
  }
  function escalate() {
    if (escBusy) return;
    if (rung >= LADDER.length) { NV.text('#hot-esc-out', 'There is nothing beyond Gerald. Gerald is the edge of the known universe. Please do not look directly at Gerald.'); NV.audio.deny(); jv('I did warn you about Gerald, Sir.', { force: true }); return; }
    escBusy = true; const l = LADDER[rung]; renderLadder(); NV.audio.dtmf(String(rung + 1));
    NV.text('#hot-esc-out', `Transferring you to ${l.who} (${l.name})…`); const bar = $('#hot-esc-bar'); bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; void bar.offsetWidth; bar.style.transition = `transform ${l.wait}ms linear`; bar.style.transform = 'scaleX(1)';
    later(() => { escBusy = false; rung++; NV.text('#hot-esc-out', l.say); renderLadder(); NV.audio[l.who === 'Gerald' ? 'thump' : 'pop'](); if (l.who === 'Gerald') { NV.award('gerald'); jv('Gerald, Sir. I have met him once. We do not speak of it.', { speak: true, force: true }); } else jv(pick(JV.esc)); if (rung === 4) newTicket('Board referral'); }, l.wait);
  }

  // ---------------- Callback that never calls ----------------
  const APOLOGY = ['CINCO: We tried to call you back. Your phone was busy being a phone. Sorry!', 'CINCO: Second attempt failed. Gary dialled the number for Gary. Very sorry.', 'CINCO: We are deeply sorry. We have named a stapler after you. It is a very good stapler.', 'CINCO: Formal apology from Senior Supervisor Brenda, written on the back of a napkin. The napkin was used.', 'CINCO: The Board has issued an apology. The ficus has also signed it, in its own way.', 'CINCO: Gerald has asked us to pass on his apology. (Gerald did not ask this.)', 'CINCO: We are so sorry we have scheduled another callback to apologise for the callbacks. It will not happen either.'];
  const CB = { n: 0, on: false, t: 0 };
  function requestCallback() {
    if (CB.on) { NV.toast('A callback is already not happening, Sir. Please continue not waiting.', 2600); return; }
    CB.on = true; CB.n = 0; const tk = newTicket('Callback request'); NV.audio.confirm();
    NV.text('#hot-cb-state', `Callback requested (${tk}). Estimated call: within 3 to 5 business eternities.`); $('#hot-cb').textContent = 'Callback pending…';
    jv('They will call back, Sir. In the sense that the heat death of the universe will eventually arrive.');
    const step = () => { if (CB.n >= APOLOGY.length) { CB.on = false; $('#hot-cb').textContent = 'Request callback'; NV.text('#hot-cb-state', `${APOLOGY.length} apologies received. 0 calls. A perfect CINCO score.`); return; }
      const msg = APOLOGY[CB.n++]; NV.toast(msg, 4200); NV.audio.blip(); NV.text('#hot-cb-state', `Apologies received: ${CB.n}. Calls received: 0.`);
      if (CB.n === 3 || CB.n === 6) NV.jarvis.log(pick(JV.callback), 'CINCO');
      CB.t = setTimeout(step, 12000 + CB.n * 5000); };
    CB.t = setTimeout(step, 9000);
  }

  // ---------------- Tickets ----------------
  const TK_SUF = ['OOPS', 'NOPE', 'SADGE', 'MEH', 'LOL', 'UHOH', 'SORRY', 'HMM'], TK_STAT = ['Lost in the post', 'Assigned to Gary', 'Under the sofa', 'Awaiting a sign', 'Escalated to the void', 'Closed (by accident)', 'Reopened (by the wind)', 'Filed under "Later"', 'Being read aloud to the ficus'];
  const tickets = [];
  function newTicket(what = 'General despair') {
    const id = `CNC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}-${pick(TK_SUF)}`;
    tickets.unshift({ id, what, stat: pick(TK_STAT) }); if (tickets.length > 6) tickets.pop(); renderTickets(); return id;
  }
  function renderTickets() {
    const el = $('#hot-tickets'); if (!el) return;
    el.innerHTML = tickets.length ? tickets.map((t) => `<li><b class="mono">${t.id}</b><span>${NV.esc(t.what)}</span><i>${t.stat}</i></li>`).join('') : '<li class="empty">No tickets yet. A rare moment of peace.</li>';
  }

  // ---------------- Warranty claim form ----------------
  const REJECT = ['Claim submitted on a day ending in "y".', 'Warranty void: the product was used.', 'Warranty void: the product was not used, so we cannot confirm a fault.', 'Damage was caused by gravity, which is an Act of Physics and not covered.', 'Your receipt is printed in the wrong font. Claims require Comic Sans.', 'The product was purchased during Mercury retrograde.', 'The fault is a known feature and has a fan club.', 'Our records show you were happy once. Warranty void.', 'You looked at it funny. We have the footage. We do not have a camera, but we have the footage.', 'Claim form completed too neatly. Suspicious.', 'The warranty expired the moment you opened the box. It says so inside the box.', 'Gerald has reviewed your claim personally. Gerald said no.', 'Claims must be submitted in person at our head office, which is a shed that we sold to ourselves.'];
  let claims = 0;
  function submitClaim(e) {
    e.preventDefault(); const f = e.target, prod = f.prod.value, why = f.why.value.trim(), date = f.date.value, proof = f.proof.value, read = f.read.checked;
    let reason;
    if (!why) reason = 'You did not describe the problem. Claims describing nothing are covered by nothing.';
    else if (date && new Date(date) > new Date()) reason = 'Purchase date is in the future. Time travel voids all CINCO warranties, retroactively.';
    else if (!read) reason = 'You did not read all 912 pages of the warranty. In fairness, neither did we.';
    else if (proof === 'vibes') reason = 'Proof of purchase: vibes. The vibes were found to be insufficient.';
    else if (proof === 'drawing') reason = 'The drawing of your receipt was lovely, but the cat in the corner voids the claim.';
    else if (/refund|money|cash/i.test(why)) reason = 'Your claim mentions money. CINCO does not recognise money as a concept.';
    else reason = REJECT[claims % REJECT.length];
    claims++; const tk = newTicket('Warranty: ' + prod.replace('CINCO ', ''));
    const out = $('#hot-claim-out'); out.innerHTML = `<div class="stamp">REJECTED</div><b>Claim ${tk}</b><p>${NV.esc(reason)}</p><small>Appeals may be lodged with Gerald. Gerald rejects appeals.</small>`;
    out.hidden = false; out.classList.remove('in'); void out.offsetWidth; out.classList.add('in'); NV.audio.deny(); NV.haptic([30, 40, 30]);
    NV.award('warranty'); if (claims === 1 || claims % 3 === 0) jv(pick(JV.claim), { speak: claims === 3 });
  }

  // ---------------- Rigged survey ----------------
  const SURVEY = [
    ['How would you rate your CINCO experience today?', ['Bad', 'Very bad', 'Worse than bad', 'I would rather not say (counts as bad)']],
    ['How likely are you to recommend CINCO to a friend?', ['Not likely', 'Only to an enemy', 'I no longer have friends', 'Zero, but louder']],
    ['Was your issue resolved?', ['No', 'Also no', 'It got worse', 'What issue? I have forgotten who I am']],
    ['How was the hold music?', ['Unbearable', 'I can still hear it', 'It followed me home', 'DJ Gary owes me an apology']],
    ['How was Gerald?', ['Gerald was Gerald', 'Terrifying', 'Who is Gerald?', 'No comment, on legal advice']]
  ];
  let sv = {};
  function renderSurvey() {
    $('#hot-survey').innerHTML = SURVEY.map(([q, opts], i) => `<fieldset class="sv-q"><legend>${i + 1}. ${q}</legend>${opts.map((o, j) => `<label class="sv-o"><input type="radio" name="sv${i}" value="${j}"${sv[i] === j ? ' checked' : ''}><span>${o}</span></label>`).join('')}</fieldset>`).join('') +
      '<div class="sv-stars" aria-label="Overall rating">Overall: <span id="sv-stars">' + [1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} stars">☆</button>`).join('') + '</span></div>';
  }
  function submitSurvey() {
    const done = Object.keys(sv).length; const out = $('#hot-sv-out');
    if (done < SURVEY.length) { out.hidden = false; out.textContent = `Please answer all ${SURVEY.length} questions. Every answer is wrong, but they are all required.`; NV.audio.deny(); return; }
    out.hidden = false; out.innerHTML = '<b>Thank you!</b> Your feedback has been carefully rounded up to <span class="gold">★★★★★ Excellent</span>. CINCO has once again won Best Customer Service (awarded by CINCO, judged by CINCO, trophy made by CINCO).';
    NV.audio.cash(); NV.award('survey'); jv(pick(JV.survey), { force: true }); newTicket('Survey (glowing)');
  }

  // ---------------- CINCObot live chat (misunderstands everything) ----------------
  let botMiss = 0, botBusy = false;
  const mangle = (w) => { const on = pick(['b', 'fl', 'gr', 'sn', 'pl', 'sp', 'w']); return w.replace(/^[^aeiou]*/i, on); };
  function botReply(q) {
    const s = q.toLowerCase(), words = (q.match(/[a-z]{4,}/gi) || []).filter((w) => !/^(have|what|with|this|that|your|mine|from|about|please|would|could|there|they|them|their|when|where|which|just|like|want)$/i.test(w));
    if (/gerald/.test(s)) return 'Please do not say that name in this chat. The chat is frightened.';
    if (/refund|money back|money/.test(s)) return 'Great news! I have processed a refund of your patience. It has been credited to Gary.';
    if (/human|agent|person|real/.test(s)) return 'I am a human. Beep. I mean: hello, fellow human. I too enjoy breathing oxygen and paying taxes.';
    if (/cancel|unsubscribe|stop/.test(s)) return 'Done! I have upgraded you to CINCO Platinum Plus Max Ultra. You are welcome. There is no way to undo this.';
    if (/broken|not working|doesn'?t work|fault|faulty/.test(s)) return `Sorry to hear your ${mangle('token')} is broken. Have you tried a different coin?`;
    if (/help|support|assist/.test(s)) return 'I found 4,012 help articles about "kelp". Top result: "Seaweed: vegetable or lifestyle?"';
    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(s)) return 'Goodbye! Thank you for chatting with CINCObot. …Just kidding, I am still here. I am always here.';
    if (/thank|cheers|ta\b/.test(s)) return 'You are welcome! I have marked your issue as "Resolved (emotionally)".';
    if (/\b(yes|yeah|yep|ok|okay)\b/.test(s)) return 'I have heard "no". Cancelling everything. Including Tuesday.';
    if (/\b(no|nope|nah)\b/.test(s)) return 'Wonderful, a yes! Your order of 400 Bluetooth Spoons is on its way. (Not really. Nothing ships. Nothing is real.)';
    if (/\d/.test(s)) return `I have converted your number into a ticket: ${newTicket('Chat numerals')}. Please quote it to nobody.`;
    if (/jarvis/.test(s)) return 'Who is this JARVIS? He sounds competent. We do not allow that here.';
    if (/\?\s*$/.test(s)) return pick(['Great question! The answer is: purple.', 'Great question! Unfortunately I only answer statements.', 'Let me check… the answer is "have you tried turning it off and on?"']);
    if (words.length) { const w = pick(words); return `Did you mean "${mangle(w)}"? I have ordered you one. It will arrive whenever.`; }
    return pick(['I did not understand that, so I have escalated it to the bin.', 'Beep. Boop. Sorry, that was me thinking.', 'Could you repeat that in Morse?']);
  }
  function botSay(text, who = 'bot') {
    const log = $('#hot-chat'); const d = document.createElement('div'); d.className = 'hc-msg ' + who; d.textContent = text; log.appendChild(d);
    while (log.children.length > 40) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
  }
  function chatSend(text) {
    text = String(text || '').trim(); if (!text || botBusy) return; botSay(text, 'me'); $('#hot-chat-q').value = '';
    botBusy = true; const typingEl = document.createElement('div'); typingEl.className = 'hc-msg bot typing'; typingEl.innerHTML = '<i></i><i></i><i></i>'; $('#hot-chat').appendChild(typingEl); $('#hot-chat').scrollTop = 1e6;
    later(() => { typingEl.remove(); botBusy = false; botSay(botReply(text)); NV.audio.blip(); botMiss++; if (botMiss >= 3) NV.award('cincobot'); if (botMiss === 2 || botMiss === 6) jv(pick(JV.bot), { speak: botMiss === 6 }); }, 700 + Math.random() * 900);
  }

  // ---------------- Visualiser (shares the app rAF budget: 30 Hz on lite tiers) ----------------
  let lastViz = 0, vizData = null;
  function viz(now) {
    if (!H.on) return; raf = requestAnimationFrame(viz);
    if (H.tab !== 'phone' || now - lastViz < (NV.perf.tier <= 1 ? 33 : 16)) return; lastViz = now;
    const f = NV.fit($('#hot-viz')); if (!f) return; const { x, w, h } = f, t = now / 1000;
    x.clearRect(0, 0, w, h);
    const an = NV.audio.musicAnalyser; let data = null;
    if (an && NV.audio.loopKind('music') === 'dj') { if (!vizData || vizData.length !== an.frequencyBinCount) vizData = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(vizData); data = vizData; }
    const bars = w < 400 ? 28 : 40, bw = w / bars, wob = DJ.worse * 0.12;
    x.fillStyle = '#ff5ee1'; x.beginPath();
    for (let i = 0; i < bars; i++) {
      const fake = 0.25 + 0.3 * Math.abs(Math.sin(t * 2.1 + i * 0.45)) * (0.6 + 0.4 * Math.sin(t * 5.3 + i)) + 0.12 * Math.sin(t * 9 + i * 1.7);
      let v = data ? Math.max(data[Math.floor(Math.pow(i / bars, 1.35) * data.length * 0.45)] / 255, fake * 0.25) : fake;
      v = NV.clamp(v + (Math.random() - 0.5) * wob, 0.04, 1); const bh = v * (h - 22); x.rect(i * bw + 1.5, h - bh, bw - 3, bh);
    }
    x.fill(); x.globalCompositeOperation = 'source-atop'; x.drawImage(vizGrad(h), 0, 0, w, h); x.globalCompositeOperation = 'source-over';
  }
  let vg = null; function vizGrad(h) { if (vg && vg.height === Math.round(h)) return vg; vg = document.createElement('canvas'); vg.width = 2; vg.height = Math.max(2, Math.round(h)); const g = vg.getContext('2d'), gr = g.createLinearGradient(0, vg.height, 0, 0); gr.addColorStop(0, '#ff3b7a'); gr.addColorStop(0.6, '#ffb547'); gr.addColorStop(1, '#fff3a8'); g.fillStyle = gr; g.fillRect(0, 0, 2, vg.height); return vg; }

  // ---------------- Tabs, open, close ----------------
  function showTab(id) {
    H.tab = id; NV.$$('#hot-tabs [data-htab]').forEach((b) => { const on = b.dataset.htab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    NV.$$('.hot-pane').forEach((p) => { p.hidden = p.dataset.pane !== id; });
    NV.audio.tick(1.2);
    if (id === 'chat' && !$('#hot-chat').children.length) botSay('Hi! I am CINCObot, your virtual assistant. I understand everything perfectly. How can I misunderstand you today?');
    if (id === 'esc') renderLadder();
    if (id === 'chat' && innerWidth >= 900) setTimeout(() => $('#hot-chat-q').focus(), 50);
  }
  H.show = () => {
    if (H.on) return; H.on = true; node = 'root'; qi = 0; started = Date.now(); stack.length = 0; metaN = 0; depth = 1;
    DJ.i = Math.floor(Math.random() * TRACKS.length); DJ.worse = 0; DJ.skips = 0; NV.text('#hot-djmsg', 'DJ Gary is on the decks. Requests are ignored in the order they are received.');
    $('#hot-queue').textContent = fmtQ(QUEUE[0]); NV.text('#hot-msg', MSGS[0]); setDepth(1); djLabel(); renderTickets(); renderLadder();
    showTab('phone'); NV.openModal('hotline'); later(() => lcd('Ringing… ring ring… connecting you to the CINCO automated assistance experience™.'), 150);
    later(() => { if (H.on) go('root'); }, 2600); const clk = setInterval(() => { if (!H.on) return clearInterval(clk); const s2 = Math.floor((Date.now() - started) / 1000); NV.text('#hot-clock', NV.pad(Math.floor(s2 / 60)) + ':' + NV.pad(s2 % 60)); }, 1000); timers.push(clk); later(bump, 4200); later(djPlay, 900); later(announce, 16000);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(viz);
    jv(pick(JV.open), { force: true }); NV.emit('proto', 'hotline');
  };
  H.close = () => { if (!H.on) return; H.on = false; timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers = []; clearInterval(typing); cancelAnimationFrame(raf); NV.audio.stopLoop('music'); annOn = false; $('#hot-ann').hidden = true; botBusy = false; try { speechSynthesis.cancel(); } catch (e) { /* none */ } };
  NV.hotline = { open: H.show, close: H.close, isOpen: () => H.on, tab: showTab, skip, escalate, newTicket, chat: chatSend, depth: () => depth, _dj: DJ };
  NV._init_hotline = () => {
    const keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', 'OPER'], ['#', 'BYE']];
    $('#hot-pad').innerHTML = keys.map(([k, l]) => `<button type="button" data-k="${k}" aria-label="Key ${k}"><b>${k}</b><small>${l}</small></button>`).join('');
    $('#hot-pad').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    $('#hotline').addEventListener('keydown', (e) => { if (H.tab === 'phone' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && /^[0-9*#]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); press(e.key); } });
    $('#hot-hangup').onclick = () => NV.closeModal('hotline');
    $('#hot-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-htab]'); if (b) showTab(b.dataset.htab); });
    $('#hot-skip').onclick = skip; $('#hot-cb').onclick = requestCallback; $('#hot-escalate').onclick = escalate;
    $('#hot-ticket').onclick = () => { const id = newTicket(pick(['General despair', 'Existential query', 'Sock-related', 'Potato dispute', 'Vague unease'])); NV.audio.lock(); NV.toast('Ticket ' + id + ' created. It has already been lost.', 2600); };
    $('#hot-chat-f').addEventListener('submit', (e) => { e.preventDefault(); chatSend($('#hot-chat-q').value); });
    $('#hot-chat-chips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) chatSend(b.textContent); });
    $('#hot-claim').addEventListener('submit', submitClaim);
    const prod = $('#hot-claim [name=prod]'); prod.innerHTML = ['CINCO Pocket Sun', 'CINCO Left-Sock Radar', 'CINCO Personal Rain Cloud', 'CINCO Bluetooth Spoon', 'CINCO Silent Doorbell', 'CINCO Anti-Gravity Toast', 'CINCO Pre-Lost Keys', 'CINCO Emotional Support Stapler', 'NICK-VERSE Scanner (this app)'].map((p) => `<option>${p}</option>`).join('');
    renderSurvey();
    $('#hot-survey').addEventListener('change', (e) => { const m = e.target.name && e.target.name.match(/^sv(\d)$/); if (m) { sv[+m[1]] = +e.target.value; NV.audio.tick(); } });
    $('#hot-survey').addEventListener('click', (e) => { const b = e.target.closest('[data-star]'); if (!b) return; const n = +b.dataset.star; const stars = NV.$$('#sv-stars button');
      stars.forEach((s, i) => { s.textContent = i < n ? '★' : '☆'; }); if (n > 1) { later(() => stars.forEach((s, i) => { s.textContent = i < 1 ? '★' : '☆'; }), 450); NV.toast(n + ' stars? We have adjusted that to 1 for accuracy.', 2200); NV.audio.deny(); } else NV.audio.tick(); });
    $('#hot-sv-go').onclick = submitSurvey;
  };
})();
