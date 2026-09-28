/* NICK-VERSE Scanner: achievements. Stored locally; awarded via NV.award(id). */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const X = {
    hello: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-12.6 4.2L4 14.5a1.6 1.6 0 0 1 2.6-1.8L7 13.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    cmd: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    phone: '<path d="M5 3.5h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.5 1.5V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
    cart: '<path d="M3 4h2.5l2.2 11h10.6l2-8H6.6"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    party: '<path d="M4 20l5-14 9 9z"/><path d="M14 4l1 2M19 5l-2 2M20 10l-2 .5M11 3.5l.5 1.5"/>',
    stealth: '<path d="M3 3l18 18"/><path d="M10.6 5.6A10 10 0 0 1 22 12s-1.2 2.2-3.4 4M6.3 7.3C3.7 9 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1"/>',
    alert: '<path d="M12 2v3M4.2 5.2l2 2M19.8 5.2l-2 2"/><path d="M6 20v-6a6 6 0 0 1 12 0v6"/><path d="M4 20h16"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/><path d="M15 9l-2 4-4 2 2-4z"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>',
    filter: '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="14.5" r="5"/>',
    shake: '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 8v8M20 8v8M2 10v4M22 10v4"/>',
    level: '<rect x="2" y="9" width="20" height="6" rx="3"/><circle cx="12" cy="12" r="1.6"/><path d="M9.5 9v6M14.5 9v6"/>',
    morse: '<circle cx="5" cy="12" r="1.6"/><path d="M9 12h5"/><circle cx="18" cy="12" r="1.6"/>',
    buy: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>'
  };
  const icon = (k) => NV.ic((NV.icons && NV.icons[k]) || X[k] || X.trophy);
  // id, name, hint, icon, tier (1 bronze, 2 silver, 3 gold)
  const LIST = [
    ['hello', 'Good Evening, Sir', 'Launch the scanner.', 'hello', 1],
    ['first-scan', 'First Contact', 'Complete a scan.', 'scan', 1],
    ['filters', 'Colour Blind Spot', 'Try four camera filters.', 'filter', 1],
    ['ar-lock', 'Target Acquired', 'Lock onto a target in AR mode.', 'ar', 2],
    ['colour', 'Paint Whisperer', 'Sample five colours.', 'color', 1],
    ['ocr', 'Well Read', 'Read some text with the Text Reader.', 'ocr', 2],
    ['measure', 'Precision Engineer', 'Measure something or calibrate the ruler.', 'measure', 1],
    ['level', 'Perfectly Level', 'Hold the level dead flat with live sensors.', 'level', 2],
    ['shake', 'Shaken, Not Stirred', 'Shake the phone five times.', 'shake', 1],
    ['quake', 'Tectonic', 'Register M6+ on the CINCO-Richter scale.', 'seismo', 2],
    ['metal', 'Treasure Hunter', 'Find a strong magnetic contact.', 'metal', 2],
    ['pulse', 'Still Ticking', 'Complete a pulse estimate.', 'heart', 2],
    ['guard-arm', 'On Watch', 'Arm the Perimeter Guard.', 'guard', 1],
    ['guard-trip', 'Caught Red-Handed', 'Trip the Perimeter Guard alarm.', 'alert', 2],
    ['weather', 'Meteorologist', 'Fetch a live weather report.', 'weather', 1],
    ['sky', 'Stargazer', 'Identify an object on the sky dome.', 'moon', 2],
    ['radar-contact', 'Blip!', 'Pick up a radar contact.', 'radar', 1],
    ['redalert', 'Shields Up', 'Trigger Red Alert.', 'threat', 1],
    ['party', 'Party Protocol', 'Engage party mode.', 'party', 1],
    ['stealth', 'Ghost Mode', 'Engage stealth mode.', 'stealth', 1],
    ['morse', 'Dot Dash Dot', 'Transmit Morse with the light.', 'morse', 1],
    ['voice', 'At Your Command', 'Give JARVIS a voice command.', 'mic', 2],
    ['palette', 'Power User', 'Open the command palette.', 'cmd', 1],
    ['hotline', 'Infinite Patience', 'Reach queue position 1,000+ on the CINCO hotline.', 'phone', 2],
    ['shopper', 'Window Shopper', 'Browse five CINCO products.', 'cart', 1],
    ['buy', 'Impulse Control: Absent', 'Attempt to buy a CINCO product.', 'buy', 1],
    ['night-owl', 'Night Owl', 'Use the scanner between midnight and 5 am.', 'moon', 2],
    ['gold', 'Midas Touch', 'Discover the secret gold theme.', 'crown', 3],
    ['explorer', 'Explorer', 'Open ten different tools.', 'compass', 2],
    ['completionist', 'Completionist', 'Open every tool.', 'trophy', 3]
  ];
  const B = (NV.badges = { list: LIST, got: NV.store.get('badges', {}) });
  const save = () => NV.store.set('badges', B.got);
  let queue = [], showing = false;
  function toastNext() {
    if (showing || !queue.length) return; showing = true; const b = queue.shift();
    NV.toast('Achievement unlocked: ' + b[1], 2800, { cls: 'badge', html: `<span class="bt-ico t${b[4]}">${icon(b[3])}</span><span class="bt-txt"><small>ACHIEVEMENT UNLOCKED</small><b>${NV.esc(b[1])}</b></span>` });
    NV.audio.badge(); NV.haptic([20, 40, 60]);
    setTimeout(() => { showing = false; toastNext(); }, 1500);
  }
  B.unlock = (id) => {
    if (B.got[id]) return false; const b = LIST.find((x) => x[0] === id); if (!b) return false;
    B.got[id] = Date.now(); save(); queue.push(b); toastNext(); render(); NV.emit('badge', id);
    return true;
  };
  B.has = (id) => !!B.got[id];
  B.count = () => LIST.filter((b) => B.got[b[0]]).length;
  function render() {
    const grid = $('#badge-grid'); if (!grid) return; const n = B.count(), pct = Math.round(n / LIST.length * 100);
    NV.text('#badge-count', `${n} / ${LIST.length}`); $('#badge-bar').style.width = pct + '%'; NV.text('#badge-pct', pct + '%');
    grid.innerHTML = LIST.map((b) => { const got = B.got[b[0]]; return `<div class="bdg ${got ? 'got' : 'locked'} t${b[4]}" role="listitem" title="${NV.esc(b[2])}"><div class="bdg-hex">${icon(b[3])}</div><div class="bdg-t"><b>${NV.esc(b[1])}</b><span>${got ? 'Unlocked ' + new Date(got).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : NV.esc(b[2])}</span></div></div>`; }).join('');
    const nav = document.querySelector('[data-tool="badges"] .tn-count, [data-tool="badges"] .count'); if (nav) nav.textContent = n;
  }
  B.render = render;
  NV._init_badges = () => {
    const grid = $('#badge-grid'); grid.setAttribute('role', 'list');
    let armed = 0; $('#badge-reset').onclick = (e) => {
      const btn = e.currentTarget; if (Date.now() - armed > 3000) { armed = Date.now(); btn.textContent = 'Tap again to confirm'; btn.classList.add('danger'); setTimeout(() => { btn.textContent = 'Reset Progress'; btn.classList.remove('danger'); }, 3000); NV.audio.deny(); return; }
      armed = 0; B.got = {}; save(); NV.store.set('visited', []); render(); btn.textContent = 'Reset Progress'; btn.classList.remove('danger'); NV.audio.powerDown(); NV.toast('Achievements reset. A fresh start, Sir.');
    };
    render();
    setTimeout(() => { B.unlock('hello'); const h = new Date().getHours(); if (h < 5) B.unlock('night-owl'); }, 4200);
  };
  NV.mods = NV.mods || {}; NV.mods.badges = Object.assign(NV.mods.badges || {}, { enter: render });
})();
