/* NICK-VERSE Scanner: shared utilities */
(function () {
  'use strict';
  const NV = (window.NV = window.NV || {});
  NV.VERSION = '11.0.0';

  NV.THEMES = [
    { id: 'arc',     name: 'Cyan Core',       primary: '#4de8ff', secondary: '#bff8ff', tertiary: '#ffb547', bg: '#01060b', bg1: '#05263a', swatch: 'radial-gradient(circle at 35% 35%,#e8feff,#4de8ff 45%,#05263a)' },
    { id: 'armor',   name: 'Crimson Armor',   primary: '#ff4545', secondary: '#ffd27a', tertiary: '#ffd27a', bg: '#070102', bg1: '#2c0708', swatch: 'conic-gradient(from 200deg,#ff4545,#ffd27a,#ff4545)' },
    { id: 'stealth', name: 'Stealth Night',   primary: '#9fb4c4', secondary: '#e9f1f6', tertiary: '#7dffb5', bg: '#030405', bg1: '#12171c', swatch: 'radial-gradient(circle at 35% 35%,#e9f1f6,#56636e 50%,#0b0e11)' },
    { id: 'neon',    name: 'Nick-Verse Neon', primary: '#b46bff', secondary: '#ff5ee1', tertiary: '#5ef2ff', bg: '#05010c', bg1: '#220a3d', swatch: 'conic-gradient(from 90deg,#b46bff,#ff5ee1,#5ef2ff,#b46bff)' },
    { id: 'gamma',   name: 'Gamma Pulse',     primary: '#5dff9a', secondary: '#d9ff6b', tertiary: '#ffe66b', bg: '#010803', bg1: '#06291a', swatch: 'radial-gradient(circle at 35% 35%,#f4fff0,#5dff9a 45%,#06291a)' },
    { id: 'gold',    name: 'CINCO Executive Gold', secret: true, primary: '#ffc93c', secondary: '#fff1b8', tertiary: '#ff7a3d', bg: '#080500', bg1: '#2e2203', swatch: 'conic-gradient(from 30deg,#fff1b8,#ffc93c,#b87400,#ffc93c,#fff1b8)' }
  ];
  NV.PALETTES = { redalert: { id: 'redalert', name: 'Red Alert', primary: '#ff2a3d', secondary: '#ffb3ba', tertiary: '#ffd23f', bg: '#0a0001', bg1: '#3a0509' } };
  NV.themeById = (id) => NV.THEMES.find((t) => t.id === id) || NV.PALETTES[id] || NV.THEMES[0];

  const PREFIX = 'nickverse.scanner.';
  NV.store = {
    get(key, fallback) { try { const v = localStorage.getItem(PREFIX + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; } },
    del(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } }
  };

  NV.DEFAULTS = { theme: 'arc', particles: true, scanlines: true, parallax: true, uisound: true, haptics: true, speak: true, commentary: true, volume: 0.7, voice: '', forcesim: false, wakelock: false, micoffset: 94, ads: true, recalls: true, secret: false,
    sfxlevel: 0.9, musiclevel: 0.7, hum: false, reducemotion: false, quality: 'auto', fpshud: false, quips: true, vrate: 1, vpitch: 1, wake: false, units: /^en-US|^en-LR|^my/i.test(navigator.language || '') ? 'f' : 'c' };
  NV.settings = Object.assign({}, NV.DEFAULTS, NV.store.get('settings', {}));
  const listeners = [];
  NV.onSetting = (fn) => listeners.push(fn);
  NV.setSetting = (k, v) => {
    NV.settings[k] = v; NV.store.set('settings', NV.settings);
    listeners.forEach((fn) => { try { fn(k, v); } catch (e) { /* keep going */ } });
  };

  NV.pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, '0');
  NV.fmtDuration = (ms, withCs = true) => {
    ms = Math.max(0, ms);
    const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
    const base = (h ? h + ':' + NV.pad(m) : NV.pad(m)) + ':' + NV.pad(s);
    return withCs ? base + '.' + NV.pad(cs) : base;
  };
  NV.fmtHMS = (s) => NV.pad(Math.floor(s / 3600)) + ':' + NV.pad(Math.floor(s / 60) % 60) + ':' + NV.pad(s % 60);
  NV.fmtTime = (t) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  NV.hexToRgb = (hex) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  NV.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(NV.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  NV.rgba = (hex, a) => { const [r, g, b] = NV.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  NV.mixHex = (a, b, t) => { const A = NV.hexToRgb(a), B = NV.hexToRgb(b); return NV.rgbToHex(...A.map((v, i) => v + (B[i] - v) * t)); };
  NV.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  NV.lerp = (a, b, t) => a + (b - a) * t;
  NV.ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  NV.angLerp = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; };
  NV.pick = (a) => a[Math.floor(Math.random() * a.length)];
  NV.rand = (a, b) => a + Math.random() * (b - a);
  NV.DEG = Math.PI / 180;
  NV.cardinal = (deg) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];

  NV.$ = (s, r = document) => r.querySelector(s);
  NV.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  NV.el = (tag, attrs = {}, html) => { const e = document.createElement(tag); for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; };
  NV.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NV.text = (sel, v) => { const e = typeof sel === 'string' ? NV.$(sel) : sel; if (e && e.textContent !== v) e.textContent = v; };

  NV.toast = (msg, ms = 3800, opts = {}) => {
    const box = NV.$('#toasts'); if (!box) return;
    const t = NV.el('div', { class: 'toast' + (opts.cls ? ' ' + opts.cls : '') });
    if (opts.html) t.innerHTML = opts.html; else t.textContent = msg; box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  };
  NV.haptic = (p) => { if (!NV.settings.haptics || !navigator.vibrate) return; if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; try { navigator.vibrate(p); } catch (e) { /* unsupported */ } };

  NV.buildTicks = (g, n = 60, major = 5, r1 = 96, r2 = 92, r3 = 89) => {
    if (!g) return; let html = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, isMaj = i % major === 0, ri = isMaj ? r3 : r2;
      html += `<line class="tick${isMaj ? ' major' : ''}" x1="${100 + Math.cos(a) * r1}" y1="${100 + Math.sin(a) * r1}" x2="${100 + Math.cos(a) * ri}" y2="${100 + Math.sin(a) * ri}"/>`;
    }
    g.innerHTML = html;
  };
  NV.setRing = (el, frac) => { if (el) el.style.strokeDasharray = `${NV.clamp(frac, 0, 1) * 100} 100`; };
  NV.dpr = () => Math.min(window.devicePixelRatio || 1, 2.5);
  NV.osReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  NV.reducedMotion = NV.osReducedMotion || !!NV.settings.reducemotion;
  NV.onSetting((k, v) => { if (k === 'reducemotion') { NV.reducedMotion = NV.osReducedMotion || !!v; document.documentElement.classList.toggle('reduce-motion', NV.reducedMotion); } });

  // Tiny event bus + achievement helper (safe to call before badges.js loads)
  const bus = {};
  NV.on = (ev, fn) => (bus[ev] = bus[ev] || []).push(fn);
  NV.emit = (ev, d) => (bus[ev] || []).forEach((fn) => { try { fn(d); } catch (e) { /* keep going */ } });
  NV.award = (id) => { if (NV.badges) NV.badges.unlock(id); };
  NV.copy = async (text, label = 'Copied') => { try { await navigator.clipboard.writeText(text); NV.toast(label + ': ' + text, 2200); return true; } catch (e) { NV.toast('Clipboard unavailable here. Long-press to copy, Sir.'); return false; } };

  // High-DPI canvas helper with cached CSS size (ResizeObserver) to avoid per-frame layout reads.
  const ro = window.ResizeObserver ? new ResizeObserver((entries) => { for (const e of entries) { const r = e.contentRect; e.target._cw = r.width; e.target._ch = r.height; } }) : null;
  NV.fit = (cv) => {
    if (!cv) return null;
    if (!cv._obs) { cv._obs = 1; cv._ctx = cv.getContext('2d'); if (ro) ro.observe(cv); const r = cv.getBoundingClientRect(); cv._cw = r.width; cv._ch = r.height; }
    if (!ro) { const r = cv.getBoundingClientRect(); cv._cw = r.width; cv._ch = r.height; }
    const w = cv._cw, h = cv._ch; if (!w || !h) return null;
    const dpr = NV.dpr(cv._dprKind), tw = Math.round(w * dpr), th = Math.round(h * dpr);
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    const x = cv._ctx; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { x, w, h, dpr };
  };
  NV.visible = (el) => !!(el && el.offsetParent !== null);

  // Wake lock helper (reference counted)
  let wl = null; const wlHolders = new Set();
  NV.wake = async (holder, on) => {
    if (on) wlHolders.add(holder); else wlHolders.delete(holder);
    const want = wlHolders.size > 0;
    try {
      if (want && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
      else if (!want && wl) { await wl.release(); wl = null; }
    } catch (e) { wl = null; }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && wlHolders.size) { wl = null; NV.wake('__resume', false); } });
})();
