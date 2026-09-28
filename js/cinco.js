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
      was: '$2,400', price: '$29.95', plus: 'plus a structural survey of your couch', fine: 'The periscope does not fetch snacks. We have been asked many, many times.' },
    { name: 'CINCO Bluetooth Spoon', line: 'Pairs with soup.', tag: 'Finally, a spoon that connects with your soup on a deeper level.',
      icon: I('<ellipse cx="24" cy="22" rx="11" ry="14" fill="#e8eef5"/><path d="M28 34l20 22" stroke-width="5"/><path d="M40 10q6 6 0 12M46 6q10 10 0 20" stroke="#3a7bd5" stroke-width="2.5"/>'),
      feats: ['Auto-pairs with any broth within ten metres', 'Firmware updates mid-spoonful', 'Plays a gentle chime when the soup is too hot', 'Now compatible with cereal (beta)'],
      was: '$649', price: '$14.95', plus: 'plus a soup subscription (mandatory)', fine: 'Do not submerge. It is a spoon. We know. Please do not submerge it anyway. Gazpacho not supported.' },
    { name: 'CINCO Silent Doorbell', line: 'For people who would rather not.', tag: 'Visitors press it. Nothing happens. Everybody wins.',
      icon: I('<rect x="18" y="10" width="28" height="44" rx="8" fill="#d8dde6"/><circle cx="32" cy="36" r="8" fill="#ffd23f"/><path d="M12 12l40 40" stroke="#e02c3e" stroke-width="4"/>'),
      feats: ['Zero decibels of pure, uninterrupted peace', 'Optional sign reading \u201cNobody Is Home (Probably)\u201d', 'Battery lasts forever because it does nothing', 'Introvert-certified by people who did not reply'],
      was: '$180', price: '$19.95', plus: 'plus one awkward wave through the window', fine: 'CINCO is not liable for missed parcels, missed guests, or the slow realisation that you missed a birthday.' },
    { name: 'CINCO Cloud Storage Jar', line: 'Your data, in an actual cloud.', tag: 'We have taken cloud storage literally, and put a real cloud in a real jar.',
      icon: I('<path d="M20 16h24v6l4 6v24a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V28l4-6z" fill="#cfe9ff"/><path d="M22 40a5 5 0 0 1 2-9 7 7 0 0 1 13-2 6 6 0 0 1 4 11z" fill="#fff"/><path d="M20 16h24"/>'),
      feats: ['Holds up to one (1) cloud, uncompressed', 'Unlimited bandwidth, limited lid strength', 'Automatic backups whenever it rains', 'End-to-end encrypted by a very tight lid'],
      was: '$9.99 per month forever', price: '$11.95', plus: 'plus condensation fees', fine: 'Cloud may evaporate. Do not open indoors. Data stored in the jar cannot be retrieved, read, or explained.' },
    { name: 'CINCO Self-Folding Map', line: 'It folds itself. Into a swan.', tag: 'Never struggle to refold a map again. It will do it for you, beautifully and incorrectly.',
      icon: I('<path d="M10 18l14-6 16 6 14-6v34l-14 6-16-6-14 6z" fill="#fff3c4"/><path d="M24 12v34M40 18v34"/><path d="M30 34q6-10 12-2q-4 2-6 8z" fill="#fff" stroke-width="2.5"/>'),
      feats: ['Folds into a swan, a crane, or occasionally a frog', 'Never folds back into a map', 'Shows every road except the one you need', 'Waterproof, Nick-proof, directionless'],
      was: '$99', price: '$8.95', plus: 'plus a compass (sold separately, also folds)', fine: 'Map is to scale, though CINCO cannot confirm which scale. Swan is decorative. Do not follow the swan.' },
    { name: 'CINCO Anti-Gravity Toast', line: 'Always lands butter-side up. On the ceiling.', tag: 'Breakfast, now with a refreshing disregard for physics.',
      icon: I('<path d="M16 30c-4-10 4-18 16-18s20 8 16 18v20H16z" fill="#e7b46a"/><path d="M22 30h20v14H22z" fill="#ffe28a"/><path d="M26 6l6-4 6 4M32 2v8" stroke-width="2.5"/>'),
      feats: ['Floats gently to the ceiling within four seconds', 'Butter side faces up, as nature intended', 'Comes with a stepladder-shaped spatula', 'Crumbs fall upwards, which is new'],
      was: '$75 a slice', price: '$4.95', plus: 'plus a very tall friend', fine: 'Do not toast near ceiling fans. Jam may experience vertigo. Marmalade is strictly forbidden.' },
    { name: 'CINCO Pre-Lost Keys', line: 'We lose them so you don\u2019t have to.', tag: 'Skip the panic. Your keys arrive already missing.',
      icon: I('<circle cx="22" cy="24" r="10" fill="#ffd23f"/><path d="M30 30l18 18M42 42l5-5M47 47l5-5"/><path d="M40 10h14v14" stroke-dasharray="3 4"/><text x="44" y="22" font-size="12" fill="#3a2200" stroke="none" font-family="sans-serif" font-weight="700">?</text>'),
      feats: ['Shipped directly to a location we cannot disclose', 'Saves an average of 11 minutes of searching', 'Includes a keyring with nothing on it', 'Pairs perfectly with the CINCO Left-Sock Radar'],
      was: '$30', price: '$2.95', plus: 'plus a spare set, also lost', fine: 'Keys may turn up in the sofa after purchase. This is a known issue and is considered a premium feature.' },
    { name: 'CINCO Emotional Support Stapler', line: 'It believes in you. And in paper.', tag: 'Holds your documents together. Holds you together, too.',
      icon: I('<path d="M10 40h44v10H10z" fill="#ff9aa2"/><path d="M12 40l6-16h34l2 8H20" fill="#ffc4cb"/><circle cx="26" cy="31" r="1.6" fill="#3a2200"/><circle cx="36" cy="31" r="1.6" fill="#3a2200"/><path d="M27 35q4 3 8 0" stroke-width="2"/>'),
      feats: ['Whispers “you’ve got this” with every staple', 'Refuses to staple anything you will regret', 'Comes with 5,000 staples and 5,000 affirmations', 'Jams only when it senses you need a break'],
      was: '$310', price: '$7.95', plus: 'plus one (1) weekly check-in', fine: 'Stapler is not a licensed therapist. It is, however, a very good listener. Do not staple feelings.' }
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
    ['CINCO Wi-Fi Scented Candle', 'Some candles smell faintly of dial-up. Screeching has been reported.', 'Remedy: open a window and wait for the handshake to finish.'],
    ['CINCO Bluetooth Spoon', 'Certain spoons have paired with the neighbour’s soup instead.', 'Remedy: exchange soups. Build community.'],
    ['CINCO Silent Doorbell', 'A batch of doorbells has started making a faint noise.', 'Remedy: return to CINCO for immediate silencing.'],
    ['CINCO Anti-Gravity Toast', 'Some toast has achieved low Earth orbit.', 'Remedy: wave. It can see you.'],
    ['CINCO Cloud Storage Jar', 'Several jars now contain a small, localised thunderstorm.', 'Remedy: do not open during business hours.'],
    ['CINCO Self-Folding Map', 'Maps have begun folding their owners.', 'Remedy: stay very still and think flat thoughts.']
  ];
  const browsed = new Set(NV.store.get('browsed', []));
  let adIdx = 0, adTimer = null, cur = 0, buys = 0, dodges = 0, busy = false, promoTimer = null, promoLeft = 599, recallTimer = null, recallIdx = Math.floor(Math.random() * RECALLS.length);

  function adShow(i, animate = true) {
    adIdx = (i + PRODUCTS.length) % PRODUCTS.length; const p = PRODUCTS[adIdx], body = $('#ad-body');
    const apply = () => { $('#ad-icon').innerHTML = p.icon; NV.text('#ad-name', p.name); NV.text('#ad-line', p.line); NV.$$('#ad-dots i').forEach((d, k) => d.classList.toggle('on', k === adIdx)); body.classList.remove('swap'); };
    if (!animate) return apply(); body.classList.add('swap'); setTimeout(apply, 380);
  }
  function startRotation() { clearInterval(adTimer); adTimer = setInterval(() => { if (!document.hidden) adShow(adIdx + 1); }, 7000); }
  CI.open = (i = adIdx) => {
    cur = (i + PRODUCTS.length) % PRODUCTS.length; const p = PRODUCTS[cur]; buys = 0; dodges = 0; busy = false;
    browsed.add(cur); NV.store.set('browsed', [...browsed]); if (browsed.size >= 5) NV.award('shopper');
    $('#promo-icon').innerHTML = p.icon; NV.text('#promo-name', p.name); NV.text('#promo-tag', '\u201c' + p.tag + '\u201d');
    $('#promo-feats').innerHTML = p.feats.map((f) => `<li>${NV.esc(f)}</li>`).join('');
    NV.text('#promo-was', p.was); NV.text('#promo-price', p.price); NV.text('#promo-plus', p.plus); NV.text('#promo-fine', p.fine);
    $('#promo-result').hidden = true; $('#promo-progress').hidden = true; $('#promo-btns').hidden = false; NV.text('#promo-buy', 'BUY NOW'); $('#promo-buy').style.transform = '';
    promoLeft = 599; clearInterval(promoTimer); promoTimer = setInterval(tickPromo, 1000); tickPromo();
    NV.openModal('promo'); clearInterval(adTimer);
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
        setTimeout(() => NV.jarvis.say('buy'), 600); NV.award('buy');
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
  CI.next = () => CI.open(cur + 1);
})();
