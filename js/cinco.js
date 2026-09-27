/* NICK-VERSE Scanner: CINCO Corporation parody. Sponsored transmissions, infomercial, product recalls.
   Nothing is ever sold, charged, linked or purchased. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const CI = (NV.cinco = {});
  const I = (p) => `<svg viewBox="0 0 64 64" fill="none" stroke="#3a2200" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const PRODUCTS = [
    { name: 'CINCO Pocket Sun', line: 'Daylight, to go.', tag: 'Why wait for morning when morning can wait in your pocket?',
      icon: I('<circle cx="32" cy="26" r="11" fill="#fff3a0"/><path d="M32 7v5M32 40v5M13 26h5M46 26h5M18.5 12.5l3.5 3.5M42 36l3.5 3.5M45.5 12.5L42 16M22 36l-3.5 3.5"/><path d="M14 40h36v12a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#7fb3ff"/><path d="M14 44h36"/>'),
      feats: ['Delivers up to eleven minutes of mid-July', 'Adjustable from \u201cCosy\u201d to \u201cSurface Of\u201d', 'Pocket-safe* (*pocket not included, and also not safe)', 'Solar-powered, which is admittedly circular'],
      was: '$4.6 billion', price: '$24.95', plus: 'plus SPF 900 sunscreen (mandatory)', fine: 'Do not look directly at the Pocket Sun. Do not look indirectly at it either. Aim away from planets, pets and Mondays.' },
    { name: 'CINCO Left-Sock Radar', line: 'Finds the one that got away.', tag: 'Every tumble dryer has a portal. We found it.',
      icon: I('<circle cx="30" cy="34" r="22" fill="#b8f0d0"/><circle cx="30" cy="34" r="13"/><path d="M30 34l15-15"/><path d="M42 44h8v8a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4v-2l6-2z" fill="#ff9aa2"/>'),
      feats: ['Detects left socks within a three-mile radius', 'Ignores right socks, purely out of principle', 'Includes emotional support for mismatched pairs', 'Now 40% less likely to locate a hamster by mistake'],
      was: '$399', price: '$12.95', plus: 'per sock, per ping', fine: 'Right socks sold separately. Radar may locate socks you did not want found. CINCO accepts no liability for dryer-portal incursions.' },
    { name: 'CINCO Honk-Horn Shoehorn', line: 'Slip in. Announce yourself.', tag: 'The only shoehorn that tells the entire street you have arrived.',
      icon: I('<path d="M12 50c6-10 8-26 10-38h8c0 14 2 28 6 38z" fill="#ffd0e0"/><path d="M36 50h10l8-8v18l-8-8H36" fill="#ffd23f"/><path d="M56 40l4-4M57 50h5M56 60l4 4" stroke-width="2.5"/>'),
      feats: ['A deafening 140-decibel HONK on every use', 'Ergonomic grip for one-handed dramatic entrances', 'Three tones: Goose, Ferry and Disappointed Uncle', 'Doubles as a trumpet if you believe hard enough'],
      was: '$220', price: '$17.95', plus: 'plus one (1) noise complaint', fine: 'Not for use in libraries, at funerals, or near geese, who may take it personally.' },
    { name: 'CINCO Personal Rain Cloud', line: 'Weather, but just for you.', tag: 'Follows you everywhere, like a loyal and slightly damp puppy.',
      icon: I('<path d="M14 36a9 9 0 0 1 3-17 13 13 0 0 1 25-3 10 10 0 0 1 6 20z" fill="#e6ecf2"/><path d="M20 44l-3 7M30 44l-3 7M40 44l-3 7" stroke="#3a7bd5"/><path d="M48 30c6 2 8 8 6 14" stroke-dasharray="2 4"/>'),
      feats: ['Keeps plants, and you, permanently hydrated', 'Optional thunder for a more dramatic commute', 'Leash included for windy days', 'Ideal for indoor gardening and outdoor sulking'],
      was: '$1,800', price: '$34.95', plus: 'plus towels (a great many towels)', fine: 'Cloud may unionise. Do not feed after midnight. Rainbows are a premium add-on, billed per arc.' },
    { name: 'CINCO Wi-Fi Scented Candle', line: 'Smells like five bars.', tag: 'At last, your living room can smell exactly like a strong connection.',
      icon: I('<rect x="20" y="30" width="24" height="26" rx="4" fill="#fff3c4"/><path d="M32 30v-5"/><path d="M32 12c4 4 4 8 0 12-4-4-4-8 0-12z" fill="#ff9d2e"/><path d="M12 22a28 28 0 0 1 40 0M17 27a20 20 0 0 1 30 0" stroke-width="2.5"/>'),
      feats: ['Notes of router, fresh fibre and a hint of buffering', 'Burns for forty hours, or until the next update', 'Flickers ominously whenever someone starts a video call', 'Password printed on the base (it is \u201cpassword\u201d)'],
      was: '$89', price: '$9.95', plus: 'plus scented data charges', fine: 'Does not provide Wi-Fi. Does not really provide light either. Please do not attempt to stream the candle.' },
    { name: 'CINCO Decaf Water', line: 'All the water. None of the excitement.', tag: 'Carefully decaffeinated, for those who find regular water too stimulating.',
      icon: I('<path d="M26 8h12v8l6 8v28a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V24l6-8z" fill="#bfe8ff"/><path d="M20 34h24"/><path d="M28 44q4-6 8 0" /><path d="M26 8h12"/>'),
      feats: ['99.9% caffeine-free (the other 0.1% is also water)', 'Hand-calmed by trained water whisperers', 'Available in Still, Stiller and Motionless', 'Pairs beautifully with an early night'],
      was: '$50 per sip', price: '$6.95', plus: 'plus a deposit of your dignity', fine: 'May contain water. Do not operate heavy machinery while this relaxed. Batch 44 is under review.' },
    { name: 'CINCO Couch Periscope', line: 'See the snacks. Never stand up.', tag: 'Survey the whole kitchen from the sofa. Like a submarine, only crumbier.',
      icon: I('<path d="M10 46h44v8H10z" fill="#c9a27a"/><path d="M14 46v-8h36v8" fill="#e0bf94"/><path d="M40 38V14h10" /><rect x="46" y="9" width="10" height="10" rx="2" fill="#9fd3ff"/><path d="M34 14h6"/>'),
      feats: ['Telescoping reach of up to two whole rooms', 'Built-in crumb deflector', 'Night mode for 3 a.m. fridge reconnaissance', 'Certified by the Institute of Staying Put'],
      was: '$2,400', price: '$29.95', plus: 'plus a structural survey of your couch', fine: 'The periscope does not fetch snacks. We have been asked many, many times.' }
  ];
  const STEPS = ['Contacting Gary in Accounts…', 'Consulting Legal\u2019s Magic 8-Ball…', 'Converting dollars into vibes…', 'Checking whether you REALLY need this…', 'Asking J.A.R.V.I.S. for permission…', 'Finalising… (this is the slow bit)'];
  const RESULTS = [
    (n) => `Order #CINCO-${n} DENIED by J.A.R.V.I.S. on grounds of good taste. Nothing was purchased.`,
    () => 'Payment accepted: one (1) compliment. Please compliment the nearest houseplant within 24 hours. Nothing was purchased.',
    () => 'Your order has been placed… on a very high shelf, out of reach. Nothing was purchased.',
    () => 'Success! A CINCO representative will now think about you fondly. That is all that will happen.',
    () => 'Transaction complete. You were charged exactly $0.00 and one mild sense of regret.',
    () => 'Order received. Delivery ETA: when you least expect it. (It will not arrive. It does not exist.)'
  ];
  const RECALLS = [
    ['CINCO Nick-Verse Scan-O-Matic 9000', 'Units assembled on a Tuesday may detect Tuesdays. Detected Tuesdays cannot be undetected.', 'Remedy: avoid scanning calendars until further notice.'],
    ['CINCO Decaf Water (Batch 44)', 'Batch 44 has been found to contain water.', 'Remedy: keep drinking. We are as surprised as you are.'],
    ['CINCO Left-Sock Radar', 'Some units have begun locating right socks. Owners are advised to remain calm.', 'Remedy: wear both. Embrace the chaos.'],
    ['CINCO Personal Rain Cloud', 'Clouds sold in spring have unionised and are demanding sunshine breaks.', 'Remedy: negotiate in good faith. Offer a rainbow.'],
    ['CINCO Honk-Horn Shoehorn', 'Honk volume may exceed the legal limit for most continents.', 'Remedy: use only while standing in a different country.'],
    ['CINCO Pocket Sun', 'Several Pocket Suns shipped with a tiny planet already in orbit.', 'Remedy: be kind to the inhabitants. They have started paying taxes.'],
    ['CINCO Wi-Fi Scented Candle', 'Some candles smell faintly of dial-up. Screeching has been reported.', 'Remedy: open a window and wait for the handshake to finish.']
  ];
  let adIdx = 0, adTimer = null, cur = 0, buys = 0, dodges = 0, busy = false, promoTimer = null, promoLeft = 599, recallTimer = null, recallIdx = Math.floor(Math.random() * RECALLS.length);

  function adShow(i, animate = true) {
    adIdx = (i + PRODUCTS.length) % PRODUCTS.length; const p = PRODUCTS[adIdx], body = $('#ad-body');
    const apply = () => { $('#ad-icon').innerHTML = p.icon; NV.text('#ad-name', p.name); NV.text('#ad-line', p.line); NV.$$('#ad-dots i').forEach((d, k) => d.classList.toggle('on', k === adIdx)); body.classList.remove('swap'); };
    if (!animate) return apply(); body.classList.add('swap'); setTimeout(apply, 380);
  }
  function startRotation() { clearInterval(adTimer); adTimer = setInterval(() => { if (!document.hidden) adShow(adIdx + 1); }, 7000); }
  CI.open = (i = adIdx) => {
    cur = (i + PRODUCTS.length) % PRODUCTS.length; const p = PRODUCTS[cur]; buys = 0; dodges = 0; busy = false;
    $('#promo-icon').innerHTML = p.icon; NV.text('#promo-name', p.name); NV.text('#promo-tag', '\u201c' + p.tag + '\u201d');
    $('#promo-feats').innerHTML = p.feats.map((f) => `<li>${NV.esc(f)}</li>`).join('');
    NV.text('#promo-was', p.was); NV.text('#promo-price', p.price); NV.text('#promo-plus', p.plus); NV.text('#promo-fine', p.fine);
    $('#promo-result').hidden = true; $('#promo-progress').hidden = true; $('#promo-btns').hidden = false; NV.text('#promo-buy', 'BUY NOW'); $('#promo-buy').style.transform = '';
    promoLeft = 599; clearInterval(promoTimer); promoTimer = setInterval(tickPromo, 1000); tickPromo();
    NV.openModal('promo'); NV.audio.confirm(); clearInterval(adTimer);
  };
  function tickPromo() { promoLeft--; if (promoLeft < 0) promoLeft = 599; NV.text('#promo-timer', promoLeft % 97 === 0 ? 'OFFER EXTENDED! (IT ALWAYS IS)' : `OFFER ENDS IN 00:${NV.pad(Math.floor(promoLeft / 60))}:${NV.pad(promoLeft % 60)}`); }
  CI.close = () => { clearInterval(promoTimer); startRotation(); };
  function dodge() { const b = $('#promo-buy'); dodges++; const dx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 70), dy = (Math.random() - 0.5) * 40; b.style.transform = `translate(${dx}px,${dy}px) rotate(${(Math.random() - 0.5) * 16}deg)`; NV.text('#promo-buy', ['NOPE', 'TOO SLOW', 'ALMOST', 'FINE…'][Math.min(dodges - 1, 3)]); NV.audio.whoosh(); }
  function buy(e) {
    if (busy) return;
    if (buys >= 1 && dodges < 3) { e.preventDefault(); dodge(); return; }
    busy = true; $('#promo-buy').style.transform = ''; $('#promo-btns').hidden = true; $('#promo-result').hidden = true; $('#promo-progress').hidden = false;
    let i = 0; const fill = $('#pp-fill'); fill.style.width = '0%';
    const step = () => {
      if (i < STEPS.length) { NV.text('#pp-txt', STEPS[i]); fill.style.width = Math.min(99, Math.round((i + 1) / STEPS.length * 99)) + '%'; NV.audio.blip(); i++; setTimeout(step, i === STEPS.length ? 1100 : 520); }
      else {
        busy = false; buys++; dodges = 0; $('#promo-progress').hidden = true; $('#promo-btns').hidden = false; NV.text('#promo-buy', buys === 1 ? 'BUY AGAIN?' : 'BUY EVEN MORE?');
        const r = $('#promo-result'); r.hidden = false; r.textContent = '✓ ' + RESULTS[(buys - 1 + cur) % RESULTS.length](Math.floor(100000 + Math.random() * 899999));
        NV.audio.cash(); NV.haptic([30, 30, 60]);
        const bb = $('#promo-card-anchor') || r; const rr = bb.getBoundingClientRect(); NV.fx.confetti(90, rr.left + rr.width / 2, rr.top);
        setTimeout(() => NV.jarvis.say('buy'), 600);
      }
    };
    step();
  }
  // Recalls
  function scheduleRecall(first) { clearTimeout(recallTimer); const ms = first ? 50000 + Math.random() * 60000 : 180000 + Math.random() * 180000; recallTimer = setTimeout(() => { if (NV.settings.recalls && !document.hidden && !document.querySelector('.modal.open')) CI.recall(); scheduleRecall(false); }, ms); }
  CI.recall = () => {
    const [p, b, r] = RECALLS[recallIdx++ % RECALLS.length];
    NV.text('#recall-prod', p); NV.text('#recall-body', b); NV.text('#recall-remedy', r);
    const el = $('#recall'); el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); NV.audio.dingdong(); NV.haptic([40, 60, 40]);
  };
  CI.closeRecall = () => { const el = $('#recall'); if (!el.classList.contains('open')) return false; el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); return true; };
  CI.init = () => {
    $('#ad-dots').innerHTML = PRODUCTS.map(() => '<i></i>').join('');
    adShow(Math.floor(Math.random() * PRODUCTS.length), false); startRotation();
    $('#cinco-ad').addEventListener('click', () => CI.open());
    const b = $('#promo-buy');
    b.addEventListener('click', buy);
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && buys >= 1 && dodges < 3 && !busy) dodge(); });
    $('#recall-ok').onclick = () => { CI.closeRecall(); NV.audio.click(); };
    $('#recall-panic').onclick = () => { const el = $('#recall'); el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300, iterations: 2 }); NV.jarvis.say('recall'); setTimeout(CI.closeRecall, 700); };
    scheduleRecall(true);
    document.body.classList.toggle('no-ads', !NV.settings.ads);
    NV.onSetting((k, v) => { if (k === 'ads') document.body.classList.toggle('no-ads', !v); });
  };
  CI.products = PRODUCTS;
})();
