/* NICK-VERSE Scanner: tool registry, navigation (desktop category rail, mobile dock + launcher),
   command palette (Ctrl/⌘+K) and smooth tool transitions. */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$;
  const ic = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    scan: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/><circle cx="12" cy="12" r="3.5"/>',
    ar: '<path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3"/><path d="M7 12h3M14 12h3M12 7v3M12 14v3"/><circle cx="12" cy="12" r="1"/>',
    color: '<path d="M16 3.5l4.5 4.5-2.4 2.4-4.5-4.5z"/><path d="M14.3 7.2l-8.8 8.8V19h3l8.8-8.8"/><path d="M4 21h4"/>',
    ocr: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    measure: '<path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l1.5 1.5M13 6l2 2M5.5 14.5l1 1"/>',
    motion: '<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>',
    nav: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    seismo: '<path d="M3 20h18"/><path d="M3 13h3l1.5-4 2.5 9 2.5-12 2 7h2l1-2h3.5"/>',
    metal: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 8h4M14 8h4"/>',
    heart: '<path d="M12 20s-7-4.3-8.8-9C2 7.8 4 4.8 7.2 4.8c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8C20 4.8 22 7.8 20.8 11 19 15.7 12 20 12 20z"/><path d="M5 12h3l1.5-2 2 4 1.5-2h6"/>',
    weather: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2.5v1.5M3.5 9H2M4.4 4.4l1 1M13.6 4.4l-1 1"/><path d="M8 20a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17.5 20z"/>',
    audio: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
    light: '<path d="M8 3h8v4l-2 3v11h-4V10L8 7z"/><path d="M12 13v2M8 7h8"/>',
    threat: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.4-6.4"/>',
    guard: '<path d="M12 2.5l8 3.5v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><circle cx="12" cy="11.5" r="2.5"/><path d="M12 14v3"/>',
    system: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9.5 9.5h5v5h-5zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    log: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    timer: '<circle cx="12" cy="14" r="7"/><path d="M12 14v-4M10 3h4M12 3v4M18 7l1.5-1.5"/>',
    badges: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.6 10L6 3h4l2 4 2-4h4l-2.6 7"/><path d="M12 12.3l.8 1.6 1.8.3-1.3 1.2.3 1.8-1.6-.8-1.6.8.3-1.8-1.3-1.2 1.8-.3z"/>',
    optics: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sensors: '<circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    environ: '<path d="M12 3c3 4 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 3-7 6-11z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
    tactical: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 8v8M8 12h8"/>',
    records: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
  };
  NV.icons = I; NV.ic = ic;
  const CATS = [
    { id: 'optics', name: 'Optics' }, { id: 'sensors', name: 'Sensors' }, { id: 'environ', name: 'Environment' },
    { id: 'tactical', name: 'Tactical' }, { id: 'records', name: 'Records' }
  ];
  const TOOLS = [
    { id: 'scan', name: 'Optical Scanner', short: 'Scan', cat: 'optics', key: '1', desc: 'Camera HUD, filters, QR and analysis', alias: ['scanner', 'camera', 'optics'] },
    { id: 'ar', name: 'AR Overlay', short: 'AR', cat: 'optics', desc: 'Tracking brackets and a telemetry reticle', alias: ['augmented', 'tracking', 'hud'] },
    { id: 'color', name: 'Colour Lab', short: 'Colour', cat: 'optics', desc: 'Colour picker and paint matcher', alias: ['color', 'colour', 'paint', 'picker'] },
    { id: 'ocr', name: 'Text Reader', short: 'Reader', cat: 'optics', desc: 'Read printed text with the camera', alias: ['ocr', 'text', 'read'] },
    { id: 'measure', name: 'Measure', short: 'Measure', cat: 'optics', desc: 'On-screen ruler and tilt protractor', alias: ['ruler', 'protractor', 'angle'] },
    { id: 'motion', name: 'Motion & Tilt', short: 'Motion', cat: 'sensors', key: '2', desc: 'Accelerometer, gyro, G-force, shakes', alias: ['accelerometer', 'gyro', 'gyroscope'] },
    { id: 'nav', name: 'Compass & Level', short: 'Nav', cat: 'sensors', key: '3', desc: 'Compass rose and bubble level', alias: ['compass', 'level', 'navigation'] },
    { id: 'seismo', name: 'Seismograph', short: 'Seismo', cat: 'sensors', desc: 'Vibration trace on the CINCO-Richter scale', alias: ['seismograph', 'earthquake', 'vibration', 'quake'] },
    { id: 'metal', name: 'Metal Detector', short: 'Metal', cat: 'sensors', desc: 'Magnetometer field strength with beeps', alias: ['metal', 'magnet', 'detector', 'magnetometer'] },
    { id: 'heart', name: 'Pulse Estimator', short: 'Pulse', cat: 'sensors', desc: 'Fingertip camera pulse (entertainment)', alias: ['heart', 'pulse', 'heart rate', 'bpm'] },
    { id: 'weather', name: 'Weather & Sky', short: 'Sky', cat: 'environ', desc: 'Forecast, sun, moon, planets and stars', alias: ['weather', 'sky', 'stars', 'moon', 'forecast'] },
    { id: 'audio', name: 'Acoustic Analyser', short: 'Audio', cat: 'environ', key: '4', desc: 'dB meter, spectrum and spectrogram', alias: ['sound', 'decibel', 'microphone', 'audio'] },
    { id: 'light', name: 'Photon Suite', short: 'Light', cat: 'environ', key: '6', desc: 'Torch, strobe, Morse and light meter', alias: ['torch', 'flashlight', 'morse', 'light'] },
    { id: 'threat', name: 'Threat Assessment', short: 'Threat', cat: 'tactical', key: '5', desc: 'Threat index and contacts', alias: ['threat', 'danger'] },
    { id: 'radar', name: 'Sonar Sweep', short: 'Radar', cat: 'tactical', key: '7', desc: 'Sweep radar with fictional contacts', alias: ['radar', 'sonar'] },
    { id: 'guard', name: 'Perimeter Guard', short: 'Guard', cat: 'tactical', desc: 'Motion alarm with hold-to-disarm', alias: ['perimeter', 'guard', 'alarm', 'security'] },
    { id: 'system', name: 'System Diagnostics', short: 'System', cat: 'records', key: '8', desc: 'Battery, network, FPS, capabilities', alias: ['system', 'diagnostics', 'battery'] },
    { id: 'log', name: 'Scan Log', short: 'Log', cat: 'records', key: '9', desc: 'Saved scans and events', alias: ['log', 'history'] },
    { id: 'timer', name: 'Scan Timer', short: 'Timer', cat: 'records', key: '0', desc: 'Stopwatch and timed auto-scan', alias: ['timer', 'stopwatch'] },
    { id: 'badges', name: 'Achievements', short: 'Badges', cat: 'records', desc: 'Badges earned for using features', alias: ['achievements', 'badges', 'trophies'] }
  ];
  const byId = (id) => TOOLS.find((t) => t.id === id);
  const DEFAULT_FAVS = ['scan', 'weather', 'radar', 'guard'];
  const T = (NV.tools = { list: TOOLS, cats: CATS, byId, active: null, cat: 'optics', favs: (NV.store.get('favs', DEFAULT_FAVS) || DEFAULT_FAVS).filter(byId).slice(0, 4) });
  NV.mods = NV.mods || {};
  const visited = new Set(NV.store.get('visited', []));

  // ---------- Rendering ----------
  function renderCats() {
    $('#tn-cats').innerHTML = CATS.map((c) => `<button role="tab" data-cat="${c.id}" aria-selected="false" title="${c.name}" aria-label="${c.name}">${ic(I[c.id])}<span>${c.name}</span><i class="tn-count">${TOOLS.filter((t) => t.cat === c.id).length}</i></button>`).join('');
  }
  function renderCatTools() {
    $('#tn-tools').innerHTML = TOOLS.filter((t) => t.cat === T.cat).map((t) => `<button role="tab" data-tool="${t.id}" aria-selected="${t.id === T.active}" class="${t.id === T.active ? 'active' : ''}" title="${NV.esc(t.desc)}">${ic(I[t.id])}<span>${t.short}</span>${t.key ? `<kbd>${t.key}</kbd>` : ''}</button>`).join('');
    NV.$$('#tn-cats button').forEach((b) => { const on = b.dataset.cat === T.cat; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); b.classList.toggle('has-active', byId(T.active) && byId(T.active).cat === b.dataset.cat); });
    const hot = NV.threat && NV.threat.value >= 60; NV.$$('[data-tool="threat"]').forEach((b) => b.classList.toggle('alert-dot', hot));
  }
  function renderDock() {
    const f = T.favs, slot = (id) => { const t = byId(id); return t ? `<button class="dock-btn${id === T.active ? ' active' : ''}" data-tool="${id}" aria-label="${t.name}">${ic(I[id])}<span>${t.short}</span></button>` : ''; };
    const activeIsFav = f.includes(T.active), at = byId(T.active);
    $('#dock').innerHTML = `<div class="dock-inner glass">${slot(f[0])}${slot(f[1])}<button class="dock-launch${activeIsFav ? '' : ' away'}" id="dock-launch" aria-label="Open tool launcher">${ic(I.grid)}<span>${!activeIsFav && at ? at.short : 'Tools'}</span></button>${slot(f[2])}${slot(f[3])}</div>`;
    $('#dock-launch').onclick = () => openLauncher();
  }
  function renderLauncher(q = '') {
    const qq = q.trim().toLowerCase();
    const match = (t) => !qq || (t.name + ' ' + t.short + ' ' + t.desc + ' ' + t.alias.join(' ')).toLowerCase().includes(qq);
    const html = CATS.map((c) => {
      const ts = TOOLS.filter((t) => t.cat === c.id && match(t)); if (!ts.length) return '';
      return `<section class="l-sec"><h3>${ic(I[c.id])}${c.name}</h3><div class="l-tiles">${ts.map((t) => `<div class="l-tile${t.id === T.active ? ' active' : ''}"><button class="l-main" data-tool="${t.id}">${ic(I[t.id])}<b>${t.name}</b><small>${t.desc}</small>${status(t.id)}</button><button class="l-star${T.favs.includes(t.id) ? ' on' : ''}" data-fav="${t.id}" aria-pressed="${T.favs.includes(t.id)}" aria-label="Pin ${t.name} to dock">${T.favs.includes(t.id) ? '★' : '☆'}</button></div>`).join('')}</div></section>`;
    }).join('');
    $('#launch-grid').innerHTML = html || '<div class="empty-state">No tool by that name, Sir. Try "radar" or "weather".</div>';
  }
  function status(id) {
    const live = (id === 'scan' || id === 'ar' || id === 'color' || id === 'ocr') ? NV.cam && NV.cam.active() : id === 'audio' ? NV.meter && NV.meter.active : id === 'guard' ? NV.guard && NV.guard.state !== 'off' : id === 'timer' ? NV.timer && NV.timer.running : false;
    return live ? '<i class="l-live">LIVE</i>' : '';
  }
  function toggleFav(id) {
    const i = T.favs.indexOf(id);
    if (i >= 0) T.favs.splice(i, 1);
    else { if (T.favs.length >= 4) { NV.toast('The dock holds four favourites, Sir. Unpin one first.'); NV.audio.deny(); return; } T.favs.push(id); }
    NV.store.set('favs', T.favs); NV.audio.click(i >= 0 ? 0.8 : 1.2); NV.haptic(10); renderDock(); renderLauncher($('#launch-q').value);
  }

  // ---------- Showing tools ----------
  let transitioning = false;
  function swap(name) {
    NV.$$('.module').forEach((p) => p.classList.toggle('active', p.dataset.mod === name));
  }
  NV.showTab = (name, sound = true) => {
    if (!byId(name)) name = 'scan';
    const prev = T.active; if (prev === name) { if (sound) NV.closeModal && closeOverlays(); return; }
    const dir = prev ? (TOOLS.findIndex((t) => t.id === name) >= TOOLS.findIndex((t) => t.id === prev) ? 1 : -1) : 1;
    if (prev && NV.mods[prev] && NV.mods[prev].leave) { try { NV.mods[prev].leave(); } catch (e) { setTimeout(() => { throw e; }); } }
    T.active = name; T.cat = byId(name).cat;
    const doSwap = () => swap(name);
    if (sound && prev && document.startViewTransition && !NV.reducedMotion && !transitioning && !document.hidden) {
      document.documentElement.dataset.navdir = dir > 0 ? 'fwd' : 'back'; transitioning = true;
      try { const vt = document.startViewTransition(doSwap); vt.finished.finally(() => { transitioning = false; }); vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {}); }
      catch (e) { transitioning = false; doSwap(); }
    } else doSwap();
    renderCatTools(); renderDock();
    NV.store.set('tab', name);
    if (sound) { NV.audio.nav(dir); NV.haptic(8); }
    if (name === 'system') { NV.status.devInfo(); NV.status.caps(); }
    if (name === 'motion') NV.motion.mode();
    if (name === 'nav') NV.nav.mode();
    if (NV.mods[name] && NV.mods[name].enter) { try { NV.mods[name].enter(); } catch (e) { setTimeout(() => { throw e; }); } }
    visited.add(name); NV.store.set('visited', [...visited]);
    if (visited.size >= 10) NV.award('explorer'); if (visited.size >= TOOLS.length) NV.award('completionist');
    NV.emit('tool', name);
    if (sound && innerWidth < 900) requestAnimationFrame(() => { const top = $('#modules').getBoundingClientRect().top, off = 72; if (top < off - 1 || top > innerHeight * 0.45) scrollBy({ top: top - off, behavior: NV.reducedMotion ? 'auto' : 'smooth' }); });
  };
  T.show = NV.showTab;
  T.step = (d) => { const i = TOOLS.findIndex((t) => t.id === T.active); NV.showTab(TOOLS[(i + d + TOOLS.length) % TOOLS.length].id); };
  function closeOverlays() { ['launcher', 'palette'].forEach((id) => { if ($('#' + id).classList.contains('open')) NV.closeModal(id); }); }

  // ---------- Launcher ----------
  function openLauncher() { renderLauncher(''); $('#launch-q').value = ''; NV.openModal('launcher'); if (innerWidth >= 900) setTimeout(() => $('#launch-q').focus(), 60); }
  T.openLauncher = openLauncher;

  // ---------- Command palette ----------
  let palItems = [], palSel = 0, palShown = [];
  function buildItems() {
    const P = (id) => () => NV.runProto(id);
    const items = TOOLS.map((t) => ({ group: 'Tools', label: t.name, hint: t.desc, icon: I[t.id], keys: t.alias.join(' ') + ' ' + t.short, run: () => NV.showTab(t.id) }));
    [['Red Alert', 'redalert', I.threat, 'klaxon danger'], ['Stealth Mode', 'stealth', I.optics, 'dim quiet ninja'], ['Party Mode', 'party', I.star, 'confetti'], ['Standard Protocol', 'standard', I.scan, 'normal reset stand down'], ['Diagnostics', 'diagnostics', I.system, 'self test'], ['Status Briefing', 'briefing', I.audio, 'report jarvis'], ['Arm Perimeter Guard', 'guard', I.guard, 'alarm security']]
      .forEach(([l, id, icon, k]) => items.push({ group: 'Protocols', label: l, icon, keys: k, run: P(id) }));
    const A = (label, icon, run, keys = '', hint = '') => items.push({ group: 'Actions', label, icon, run, keys, hint });
    A('Voice Command', '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>', () => NV.voice.toggle(), 'speak microphone listen', 'Press C');
    A('CINCO Customer Support Hotline', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', () => NV.hotline.open(), 'call phone support cinco hold', 'Press H');
    A('CINCO Infomercial', I.bolt, () => NV.cinco.open(), 'advert product buy shop');
    A('CINCO Product Recall', I.threat, () => NV.cinco.recall(), 'recall notice');
    A('Tool Launcher', I.grid, openLauncher, 'all tools apps grid', 'Press G');
    A('Settings', I.system, () => NV.toggleDrawer(true), 'preferences options volume', 'Press S');
    A('Keyboard Shortcuts', I.records, () => NV.openModal('help'), 'help keys', 'Press ?');
    A('Toggle Sound', I.audio, () => { NV.setSetting('uisound', !NV.settings.uisound); NV.toast(NV.settings.uisound ? 'Sound effects on.' : 'Sound effects muted.', 1600); }, 'mute unmute volume');
    A('Cycle Theme', I.environ, () => NV.cycleTheme(1), 'colour palette skin', 'Press T');
    A('Fullscreen', I.scan, () => NV.toggleFullscreen(), 'full screen', 'Press F');
    A('JARVIS: Wit, Please', I.star, () => NV.jarvis.quip(), 'joke quip funny');
    A('JARVIS: Analyse Environment', I.sensors, () => NV.jarvis.analyse(), 'analysis');
    A('Export Scan Log', I.log, () => $('#log-export').click(), 'download json');
    NV.THEMES.filter((t) => !t.secret || NV.settings.secret).forEach((t) => items.push({ group: 'Themes', label: 'Theme: ' + t.name, icon: I.environ, keys: 'theme colour ' + t.id, run: () => NV.setTheme(t.id), swatch: t.primary }));
    return items;
  }
  function score(item, q) {
    if (!q) return 1;
    const hay = (item.label + ' ' + (item.keys || '') + ' ' + (item.hint || '')).toLowerCase(), lab = item.label.toLowerCase();
    if (lab.startsWith(q)) return 100; if (lab.split(/[\s:&]+/).some((w) => w.startsWith(q))) return 80; if ((item.keys || '').toLowerCase().split(/\s+/).some((w) => w.startsWith(q))) return 70; if (hay.includes(q)) return 60;
    let i = 0; for (const ch of hay) { if (ch === q[i]) i++; if (i === q.length) return 20; } return 0;
  }
  function renderPalette() {
    const q = $('#pal-q').value.trim().toLowerCase();
    palShown = palItems.map((it) => ({ it, s: score(it, q) })).filter((x) => x.s > 0).sort((a, b) => (q ? b.s - a.s : 0)).map((x) => x.it).slice(0, 40);
    palSel = NV.clamp(palSel, 0, Math.max(0, palShown.length - 1));
    let g = '';
    $('#pal-list').innerHTML = palShown.length ? palShown.map((it, i) => { const head = !q && it.group !== g ? `<li class="pal-group" role="presentation">${(g = it.group)}</li>` : ''; return `${head}<li role="option" id="pal-o${i}" data-i="${i}" aria-selected="${i === palSel}" class="${i === palSel ? 'sel' : ''}"><span class="pal-ic">${it.swatch ? `<i class="pal-sw" style="background:${it.swatch}"></i>` : ic(it.icon || I.bolt)}</span><span class="pal-l">${NV.esc(it.label)}${it.hint ? `<small>${NV.esc(it.hint)}</small>` : ''}</span><span class="pal-g mono">${it.group}</span></li>`; }).join('') : '<li class="pal-empty">Nothing matches, Sir. Perhaps try "radar", "red alert" or "weather".</li>';
    $('#pal-q').setAttribute('aria-activedescendant', palShown.length ? 'pal-o' + palSel : '');
    const sel = $('#pal-list .sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function openPalette() { palItems = buildItems(); palSel = 0; $('#pal-q').value = ''; renderPalette(); NV.openModal('palette'); setTimeout(() => $('#pal-q').focus(), 40); NV.award('palette'); }
  function runPal(i) { const it = palShown[i]; if (!it) return; NV.closeModal('palette'); setTimeout(() => it.run(), 60); }
  T.openPalette = openPalette;
  T.togglePalette = () => ($('#palette').classList.contains('open') ? NV.closeModal('palette') : openPalette());

  T.init = () => {
    renderCats();
    $('#tn-cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; T.cat = b.dataset.cat; renderCatTools(); NV.audio.tick(1.1); });
    const go = (e) => { const b = e.target.closest('[data-tool]'); if (!b) return; closeOverlays(); NV.showTab(b.dataset.tool); };
    $('#tn-tools').addEventListener('click', go); $('#dock').addEventListener('click', go);
    $('#launch-grid').addEventListener('click', (e) => { const f = e.target.closest('[data-fav]'); if (f) return toggleFav(f.dataset.fav); go(e); });
    $('#launch-q').addEventListener('input', (e) => renderLauncher(e.target.value));
    $('#launch-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = $('#launch-grid [data-tool]'); if (b) { closeOverlays(); NV.showTab(b.dataset.tool); } } });
    $('#tn-launch').onclick = openLauncher; $('#tn-palette').onclick = openPalette; $('#btn-palette').onclick = openPalette;
    $('#pal-q').addEventListener('input', () => { palSel = 0; renderPalette(); });
    $('#pal-q').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); palSel = (palSel + 1) % Math.max(1, palShown.length); renderPalette(); NV.audio.tick(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = (palSel - 1 + palShown.length) % Math.max(1, palShown.length); renderPalette(); NV.audio.tick(); }
      else if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
    });
    $('#pal-list').addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) runPal(+li.dataset.i); });
    $('#pal-list').addEventListener('pointermove', (e) => { const li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== palSel) { palSel = +li.dataset.i; NV.$$('#pal-list [data-i]').forEach((o) => { const on = +o.dataset.i === palSel; o.classList.toggle('sel', on); o.setAttribute('aria-selected', on); }); } });
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); T.togglePalette(); } }, true);
    if (document.startViewTransition) document.documentElement.classList.add('has-vt');
    renderDock();
    NV.on('badge', () => { if ($('#launcher').classList.contains('open')) renderLauncher($('#launch-q').value); });
  };
})();
