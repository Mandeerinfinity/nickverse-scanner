/* NICK-VERSE Scanner: Weather & Sky. Open-Meteo (no key), cached. Approximate sky dome computed on-device
   (Paul Schlyter's orbital elements for Sun, Moon and planets, plus bright stars). */
(function () {
  'use strict';
  const NV = window.NV, $ = NV.$, TAU = Math.PI * 2, RAD = Math.PI / 180, DEG = 180 / Math.PI;
  const txt = (...a) => NV.draw.txt(...a);
  const mods = (NV.mods = NV.mods || {});
  const rev = (x) => ((x % 360) + 360) % 360;
  const sind = (x) => Math.sin(x * RAD), cosd = (x) => Math.cos(x * RAD), atan2d = (y, x) => Math.atan2(y, x) * DEG;

  // ---------- astronomy ----------
  const dayNum = (date) => date.getTime() / 86400000 + 2440587.5 - 2451543.5;
  function kepler(M, e) { let E = M + e * DEG * sind(M) * (1 + e * cosd(M)); for (let i = 0; i < 6; i++) E = E - (E - e * DEG * sind(E) - M) / (1 - e * cosd(E)); return E; }
  function sunPos(d) {
    const w = 282.9404 + 4.70935e-5 * d, e = 0.016709 - 1.151e-9 * d, M = rev(356.047 + 0.9856002585 * d);
    const E = kepler(M, e), xv = cosd(E) - e, yv = Math.sqrt(1 - e * e) * sind(E), v = atan2d(yv, xv), r = Math.hypot(xv, yv), lon = rev(v + w);
    return { lon, r, x: r * cosd(lon), y: r * sind(lon), L: rev(M + w) };
  }
  const ELEM = {
    Mercury: [48.3313, 3.24587e-5, 7.0047, 5e-8, 29.1241, 1.01444e-5, 0.387098, 0.205635, 5.59e-10, 168.6562, 4.0923344368, -0.36],
    Venus: [76.6799, 2.4659e-5, 3.3946, 2.75e-8, 54.891, 1.38374e-5, 0.72333, 0.006773, -1.302e-9, 48.0052, 1.6021302244, -4.34],
    Mars: [49.5574, 2.11081e-5, 1.8497, -1.78e-8, 286.5016, 2.92961e-5, 1.523688, 0.093405, 2.516e-9, 18.6021, 0.5240207766, -1.51],
    Jupiter: [100.4542, 2.76854e-5, 1.303, -1.557e-7, 273.8777, 1.64505e-5, 5.20256, 0.048498, 4.469e-9, 19.895, 0.0830853001, -9.25],
    Saturn: [113.6634, 2.3898e-5, 2.4886, -1.081e-7, 339.3939, 2.97661e-5, 9.55475, 0.055546, -9.499e-9, 316.967, 0.0334442282, -9.0]
  };
  const PCOL = { Mercury: '#c9c2b8', Venus: '#fff4d6', Mars: '#ff7a4d', Jupiter: '#ffd9a8', Saturn: '#f0dc9a' };
  function eclToEq(x, y, z, d) { const ecl = 23.4393 - 3.563e-7 * d; const xe = x, ye = y * cosd(ecl) - z * sind(ecl), ze = y * sind(ecl) + z * cosd(ecl); return { ra: rev(atan2d(ye, xe)), dec: atan2d(ze, Math.hypot(xe, ye)), dist: Math.hypot(xe, ye, ze) }; }
  function planet(name, d, sun) {
    const [N0, N1, i0, i1, w0, w1, a, e0, e1, M0, M1, H] = ELEM[name]; const N = N0 + N1 * d, i = i0 + i1 * d, w = w0 + w1 * d, e = e0 + e1 * d, M = rev(M0 + M1 * d);
    const E = kepler(M, e), xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E), v = atan2d(yv, xv), r = Math.hypot(xv, yv);
    const xh = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i)), yh = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i)), zh = r * sind(v + w) * sind(i);
    const xg = xh + sun.x, yg = yh + sun.y, zg = zh; const eq = eclToEq(xg, yg, zg, d);
    const R = eq.dist, s = sun.r, FV = Math.acos(NV.clamp((r * r + R * R - s * s) / (2 * r * R), -1, 1)) * DEG;
    let mag = H + 5 * Math.log10(r * R); if (name === 'Mercury') mag += 0.038 * FV - 0.000273 * FV * FV + 2e-6 * FV * FV * FV; else if (name === 'Venus') mag += 0.013 * FV + 4.2e-7 * FV * FV * FV; else if (name === 'Mars') mag += 0.016 * FV; else if (name === 'Jupiter') mag += 0.005 * FV;
    return Object.assign(eq, { name, mag, kind: 'planet', col: PCOL[name] });
  }
  function moonPos(d, sun) {
    const N = rev(125.1228 - 0.0529538083 * d), i = 5.1454, w = rev(318.0634 + 0.1643573223 * d), a = 60.2666, e = 0.0549, M = rev(115.3654 + 13.0649929509 * d);
    const E = kepler(M, e), xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E), v = atan2d(yv, xv), r = Math.hypot(xv, yv);
    const xh = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i)), yh = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i)), zh = r * sind(v + w) * sind(i);
    let lon = atan2d(yh, xh), lat = atan2d(zh, Math.hypot(xh, yh));
    const Ms = rev(356.047 + 0.9856002585 * d), Lm = rev(N + w + M), Ls = sun.L, D = Lm - Ls, F = Lm - N;
    lon += -1.274 * sind(M - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms) - 0.059 * sind(2 * M - 2 * D) - 0.057 * sind(M - 2 * D + Ms) + 0.053 * sind(M + 2 * D) + 0.046 * sind(2 * D - Ms) + 0.041 * sind(M - Ms) - 0.035 * sind(D) - 0.031 * sind(M + Ms);
    lat += -0.173 * sind(F - 2 * D) - 0.055 * sind(M - F - 2 * D) - 0.046 * sind(M + F - 2 * D) + 0.033 * sind(F + 2 * D);
    const x = cosd(lon) * cosd(lat), y = sind(lon) * cosd(lat), z = sind(lat); const eq = eclToEq(x, y, z, d);
    const elong = rev(lon - sun.lon); // 0 new, 180 full
    return Object.assign(eq, { name: 'Moon', lon, r, phase: elong / 360, illum: (1 - cosd(elong)) / 2, kind: 'moon', mag: -12 });
  }
  function altAz(ra, dec, lst, lat) { const ha = rev(lst - ra); const x = cosd(ha) * cosd(dec), y = sind(ha) * cosd(dec), z = sind(dec); const xh = x * sind(lat) - z * cosd(lat), zh = x * cosd(lat) + z * sind(lat); return { az: rev(atan2d(y, xh) + 180), alt: atan2d(zh, Math.hypot(xh, y)) }; }
  // bright stars: name, RA (h), Dec (°), mag
  const STARS = [['Sirius', 6.752, -16.716, -1.46], ['Canopus', 6.399, -52.696, -0.74], ['Arcturus', 14.261, 19.182, -0.05], ['Vega', 18.616, 38.784, 0.03], ['Capella', 5.278, 45.998, 0.08], ['Rigel', 5.242, -8.202, 0.13], ['Procyon', 7.655, 5.225, 0.34], ['Betelgeuse', 5.919, 7.407, 0.5], ['Achernar', 1.629, -57.237, 0.46], ['Hadar', 14.064, -60.373, 0.61], ['Altair', 19.846, 8.868, 0.76], ['Acrux', 12.443, -63.099, 0.76], ['Aldebaran', 4.599, 16.509, 0.86], ['Antares', 16.49, -26.432, 0.96], ['Spica', 13.42, -11.161, 0.97], ['Pollux', 7.755, 28.026, 1.14], ['Fomalhaut', 22.961, -29.622, 1.16], ['Deneb', 20.69, 45.28, 1.25], ['Mimosa', 12.795, -59.689, 1.25], ['Regulus', 10.14, 11.967, 1.35], ['Castor', 7.577, 31.888, 1.58], ['Bellatrix', 5.419, 6.35, 1.64], ['Gacrux', 12.519, -57.113, 1.64], ['Alnilam', 5.604, -1.202, 1.69], ['Alnitak', 5.679, -1.943, 1.77], ['Mintaka', 5.533, -0.299, 2.23], ['Saiph', 5.796, -9.67, 2.06], ['Polaris', 2.53, 89.264, 1.98], ['Dubhe', 11.062, 61.751, 1.79], ['Merak', 11.031, 56.382, 2.37], ['Phecda', 11.897, 53.695, 2.44], ['Megrez', 12.257, 57.033, 3.31], ['Alioth', 12.9, 55.96, 1.77], ['Mizar', 13.399, 54.925, 2.27], ['Alkaid', 13.792, 49.313, 1.86], ['Caph', 0.153, 59.15, 2.27], ['Schedar', 0.675, 56.537, 2.24], ['Navi', 0.945, 60.717, 2.47], ['Ruchbah', 1.43, 60.235, 2.68], ['Segin', 1.907, 63.67, 3.37], ['Imai', 12.252, -58.749, 2.79]].map(([n, ra, dec, mag]) => ({ name: n, ra: ra * 15, dec, mag, kind: 'star' }));
  const SIDX = Object.fromEntries(STARS.map((s, i) => [s.name, i]));
  const LINES = [['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Betelgeuse', 'Alnitak'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel'], ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'], ['Caph', 'Schedar'], ['Schedar', 'Navi'], ['Navi', 'Ruchbah'], ['Ruchbah', 'Segin'], ['Acrux', 'Gacrux'], ['Mimosa', 'Imai'], ['Vega', 'Deneb'], ['Deneb', 'Altair'], ['Altair', 'Vega']];
  const FAINT = (() => { let s = 1337; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); const a = []; for (let i = 0; i < 360; i++) a.push({ ra: rnd() * 360, dec: Math.asin(rnd() * 2 - 1) * DEG, mag: 3.4 + rnd() * 2, tw: rnd() * TAU }); return a; })();
  const MILKY = (() => { const aG = 192.85948, dG = 27.12825, lN = 122.93192, a = []; for (let l = 0; l < 360; l += 4) { const sd = cosd(dG) * cosd(lN - l); a.push({ ra: rev(aG + atan2d(sind(lN - l), -sind(dG) * cosd(lN - l))), dec: Math.asin(sd) * DEG, w: 1 - 0.55 * Math.abs(Math.sin((l / 2) * RAD)) }); } return a; })();

  function computeSky(date, lat, lon) {
    const d = dayNum(date), sun = sunPos(d), ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const lst = rev(sun.L + 180 + ut * 15 + lon);
    const sEq = eclToEq(sun.x, sun.y, 0, d), sH = altAz(sEq.ra, sEq.dec, lst, lat);
    const moon = moonPos(d, sun), mH = altAz(moon.ra, moon.dec, lst, lat); mH.alt -= Math.asin(1 / moon.r) * DEG * cosd(mH.alt);
    const bodies = [Object.assign({ name: 'Sun', kind: 'sun', mag: -26.7 }, sEq, sH), Object.assign(moon, mH)];
    Object.keys(ELEM).forEach((n) => { const p = planet(n, d, sun); Object.assign(p, altAz(p.ra, p.dec, lst, lat)); bodies.push(p); });
    const stars = STARS.map((s) => Object.assign({}, s, altAz(s.ra, s.dec, lst, lat)));
    return { lst, lat, lon, sun: bodies[0], moon: bodies[1], bodies, stars, d };
  }
  function sunAlt(date, lat, lon) { const d = dayNum(date), sun = sunPos(d), ut = date.getUTCHours() + date.getUTCMinutes() / 60; const lst = rev(sun.L + 180 + ut * 15 + lon), eq = eclToEq(sun.x, sun.y, 0, d); return altAz(eq.ra, eq.dec, lst, lat).alt; }
  function sunTimes(lat, lon) { // device-local sunrise/sunset, used when no forecast data is available
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); let prev = null, rise = null, set = null; const H0 = -0.833;
    for (let m = 0; m <= 1440; m += 5) { const t = new Date(d0.getTime() + m * 60000), a = sunAlt(t, lat, lon); if (prev != null) { const f = (H0 - prev) / (a - prev), at = new Date(t.getTime() - (1 - f) * 300000); if (prev < H0 && a >= H0 && !rise) rise = at; if (prev >= H0 && a < H0 && !set) set = at; } prev = a; }
    const hm = (x) => (x ? NV.pad(x.getHours()) + ':' + NV.pad(x.getMinutes()) : null); return { rise: hm(rise), set: hm(set), len: rise && set ? (set - rise) / 60000 : null };
  }
  NV.sky = { compute: computeSky, sunTimes };
  const PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  const phaseName = (p) => PHASES[Math.floor(((p + 1 / 16) % 1) * 8)];
  const dirName = (az) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(az / 22.5) % 16];

  // ---------- weather ----------
  const WX = (mods.weather = { place: NV.store.get('wxPlace', null), data: null, t: 0, cached: false, busy: false, sky: null, skyT: 0, sel: null });
  const CITIES = { 'America/Chicago': ['Chicago', 'United States', 41.8781, -87.6298], 'America/New_York': ['New York', 'United States', 40.7128, -74.006], 'America/Los_Angeles': ['Los Angeles', 'United States', 34.0522, -118.2437], 'America/Denver': ['Denver', 'United States', 39.7392, -104.9903], 'America/Phoenix': ['Phoenix', 'United States', 33.4484, -112.074], 'America/Toronto': ['Toronto', 'Canada', 43.6532, -79.3832], 'Europe/London': ['London', 'United Kingdom', 51.5074, -0.1278], 'Europe/Dublin': ['Dublin', 'Ireland', 53.3498, -6.2603], 'Europe/Paris': ['Paris', 'France', 48.8566, 2.3522], 'Europe/Berlin': ['Berlin', 'Germany', 52.52, 13.405], 'Australia/Sydney': ['Sydney', 'Australia', -33.8688, 151.2093], 'Asia/Tokyo': ['Tokyo', 'Japan', 35.6762, 139.6503], 'Asia/Kolkata': ['Mumbai', 'India', 19.076, 72.8777] };
  function fallbackPlace() { let tz = 'Europe/London'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* ignore */ } const c = CITIES[tz] || CITIES['Europe/London']; return { name: c[0], country: c[1], lat: c[2], lon: c[3], src: 'fallback' }; }
  const KIND = (c) => c === 0 ? 'clear' : c <= 2 ? 'partly' : c === 3 ? 'cloudy' : c <= 48 ? 'fog' : c <= 57 ? 'drizzle' : c <= 67 ? 'rain' : c <= 77 ? 'snow' : c <= 82 ? 'rain' : c <= 86 ? 'snow' : 'storm';
  const DESC = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail' };
  const QUIPS = { clear: ['Clear skies, Sir. Suspiciously pleasant.', 'Not a cloud in sight. I have checked twice.'], clearN: ['A clear night. Excellent for stargazing, poor for excuses.', 'Clear and dark. The stars are showing off.'], partly: ['Partly cloudy. Or partly sunny, if you are an optimist. I am, today.', 'A few clouds, Sir. Decorative, mostly.'], cloudy: ['Overcast. Very British of the sky.', 'Grey skies. The clouds appear to be in a meeting.'], fog: ['Fog, Sir. Visibility is low, much like CINCO quality control.', 'Foggy. Ideal for dramatic entrances.'], drizzle: ['Drizzle. The weather equivalent of a passive-aggressive note.', 'A light drizzle, Sir. Not quite committed to raining.'], rain: ['Rain, Sir. An umbrella is advised. The CINCO one is just a hat.', 'Rain. Excellent weather for staying in and scanning things.'], snow: ['Snow! Kindly do not attempt to build a snow-JARVIS.', 'Snow, Sir. Wrap up warm.'], storm: ['Thunderstorms. Please do not hold the phone aloft dramatically.', 'Storm conditions. I recommend indoors and a biscuit.'] };
  const F = () => NV.settings.units === 'f';
  function url(p) { const u = F() ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '&wind_speed_unit=kmh'; return `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(4)}&longitude=${p.lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=2${u}`; }
  function badge(t, cls) { const b = $('#wx-badge'); b.textContent = t; b.className = 'badge' + (cls ? ' ' + cls : ''); }
  async function fetchWx(p, { speak = false } = {}) {
    if (WX.busy) return; WX.busy = true; badge('FETCHING…', 'warn'); $('#wx-refresh').classList.add('spin');
    try {
      if (navigator.onLine === false) throw new Error('offline');
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(url(p), { signal: ctl.signal, cache: 'no-store' }); clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      const data = await r.json(); if (!data.current) throw new Error('bad data');
      WX.place = p; WX.data = data; WX.t = Date.now(); WX.cached = false; WX.units = NV.settings.units;
      NV.store.set('wxPlace', p); NV.store.set('wx', { place: p, data, t: WX.t, units: WX.units });
      WX.failT = 0; render(); badge('LIVE', 'live'); NV.award('weather');
      const c = data.current, k = KIND(c.weather_code), line = `${p.name}: ${Math.round(c.temperature_2m)} degrees and ${(DESC[c.weather_code] || 'unclassified').toLowerCase()}. ${quip(k, c.is_day)}`;
      if (speak) NV.jarvis.speak(line, { tag: 'WX' }); else NV.jarvis.log(line, 'WX');
    } catch (e) {
      WX.failT = Date.now(); const c = NV.store.get('wx', null);
      if (c && c.data) { WX.place = c.place; WX.data = c.data; WX.t = c.t; WX.cached = true; WX.units = c.units; render(); badge('CACHED', 'warn'); NV.toast(`Weather service unreachable, Sir. Showing the cached report from ${ago(c.t)}.`, 3200); }
      else { WX.place = p; badge('OFFLINE', 'bad'); NV.text('#wx-place', p.name); NV.text('#wx-desc', 'No atmospheric data yet. Connect to the internet and press refresh.'); NV.text('#wx-quip', 'The sky map below still works offline, Sir.'); }
    } finally { WX.busy = false; $('#wx-refresh').classList.remove('spin'); WX.skyT = 0; NV.emit('weather', { ok: !!WX.data, cached: WX.cached }); }
  }
  const quip = (k, day) => NV.pick(QUIPS[k === 'clear' && !day ? 'clearN' : k]);
  function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; }
  const hhmm = (iso) => (iso || '').slice(11, 16);
  function icon(k, day = true, size = 64) {
    const sun = `<g class="wi-sun"><circle cx="32" cy="28" r="10"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${32 + Math.cos(a * RAD) * 15}" y1="${28 + Math.sin(a * RAD) * 15}" x2="${32 + Math.cos(a * RAD) * 20}" y2="${28 + Math.sin(a * RAD) * 20}"/>`).join('')}</g>`;
    const moon = '<path class="wi-moon" d="M38 14a13 13 0 1 0 10 20A11 11 0 0 1 38 14z"/>';
    const cloud = (x = 0, y = 0, cls = 'wi-cloud') => `<path class="${cls}" transform="translate(${x} ${y})" d="M20 48h26a10 10 0 0 0 0-20 14 14 0 0 0-27-3A11 11 0 0 0 20 48z"/>`;
    const drops = (n, cls = 'wi-rain') => new Array(n).fill(0).map((_, i) => `<line class="${cls}" x1="${22 + i * 9}" y1="${52}" x2="${19 + i * 9}" y2="${60}"/>`).join('');
    const flakes = new Array(3).fill(0).map((_, i) => `<circle class="wi-snow" cx="${22 + i * 10}" cy="${56 + (i % 2) * 3}" r="2.2"/>`).join('');
    const body = { clear: day ? sun : moon, partly: (day ? `<g transform="translate(-8 -6) scale(.9)">${sun}</g>` : `<g transform="translate(-6 -4) scale(.85)">${moon}</g>`) + cloud(4, 4), cloudy: cloud(-6, -4, 'wi-cloud back') + cloud(4, 2), fog: cloud(0, -6) + '<g class="wi-fog"><line x1="12" y1="50" x2="52" y2="50"/><line x1="16" y1="57" x2="48" y2="57"/></g>', drizzle: cloud(0, -6) + drops(3, 'wi-rain thin'), rain: cloud(0, -6) + drops(4), snow: cloud(0, -6) + flakes, storm: cloud(0, -6, 'wi-cloud dark') + '<path class="wi-bolt" d="M33 44l-7 11h6l-3 9 10-13h-6l4-7z"/>' }[k];
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="wi wi-${k}">${body}</svg>`;
  }
  function render() {
    const d = WX.data, p = WX.place; if (!d || !p) return; const c = d.current, k = KIND(c.weather_code), u = (d.current_units && d.current_units.temperature_2m) || (F() ? '°F' : '°C'), wu = (d.current_units && d.current_units.wind_speed_10m) || '';
    NV.text('#wx-place', p.name + (p.country ? ', ' + p.country : '')); NV.text('#wx-updated', (WX.cached ? 'cached · ' : '') + 'updated ' + ago(WX.t));
    $('#wx-icon').innerHTML = icon(k, !!c.is_day, 72); NV.text('#wx-temp', Math.round(c.temperature_2m) + u);
    NV.text('#wx-desc', DESC[c.weather_code] || 'Unclassified'); NV.text('#wx-quip', quip(k, c.is_day));
    const dl = d.daily || {}, items = [['Feels like', Math.round(c.apparent_temperature) + '°'], ['Humidity', c.relative_humidity_2m + '%'], ['Wind', `${Math.round(c.wind_speed_10m)} ${wu} ${dirName(c.wind_direction_10m || 0)}`], ['Cloud', c.cloud_cover + '%'], ['High / Low', dl.temperature_2m_max ? `${Math.round(dl.temperature_2m_max[0])}° / ${Math.round(dl.temperature_2m_min[0])}°` : '--'], ['UV max', dl.uv_index_max ? String(Math.round(dl.uv_index_max[0])) : '--'], ['Pressure', c.pressure_msl ? Math.round(c.pressure_msl) + ' hPa' : '--'], ['Sunrise / set', dl.sunrise ? `${hhmm(dl.sunrise[0])} / ${hhmm(dl.sunset[0])}` : '--']];
    $('#wx-meta').innerHTML = items.map(([a, b]) => `<div><span>${a}</span><b class="mono">${NV.esc(b)}</b></div>`).join('');
    if (dl.sunrise) { const sr = Date.parse(dl.sunrise[0]), ss = Date.parse(dl.sunset[0]), m = Math.round((ss - sr) / 60000); NV.text('#wx-daylen', `${Math.floor(m / 60)}h ${m % 60}m of daylight`); }
    WX.drawnHourly = 0;
  }
  function locNow() { const d = WX.data; if (!d) return null; return new Date(Date.now() + (d.utc_offset_seconds || 0) * 1000); } // shifted so getUTC* = location-local time
  function glyph(x, k, cx, cy, s, day) {
    const c = NV.colors; x.save(); x.translate(cx, cy); x.lineWidth = 1.4; x.lineCap = 'round';
    const cloud = (col) => { x.fillStyle = col; x.beginPath(); x.arc(-s * 0.3, s * 0.1, s * 0.32, 0, TAU); x.arc(s * 0.05, -s * 0.12, s * 0.42, 0, TAU); x.arc(s * 0.4, s * 0.12, s * 0.3, 0, TAU); x.fill(); x.fillRect(-s * 0.3, s * 0.05, s * 0.7, s * 0.37); };
    if (k === 'clear' || k === 'partly') { if (day) { x.fillStyle = '#ffd35a'; x.shadowColor = '#ffb547'; x.shadowBlur = 6; x.beginPath(); x.arc(k === 'partly' ? -s * 0.2 : 0, k === 'partly' ? -s * 0.2 : 0, s * 0.36, 0, TAU); x.fill(); x.shadowBlur = 0; } else { x.fillStyle = '#e8ecff'; x.beginPath(); x.arc(-s * 0.1, -s * 0.1, s * 0.34, 0, TAU); x.fill(); x.fillStyle = NV.colors.bg1; x.beginPath(); x.arc(s * 0.05, -s * 0.2, s * 0.3, 0, TAU); x.fill(); } }
    if (k !== 'clear') cloud(k === 'storm' ? '#8a93a8' : k === 'partly' ? 'rgba(220,232,255,.9)' : '#c8d4ea');
    if (k === 'rain' || k === 'drizzle') { x.strokeStyle = '#5fb6ff'; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * s * 0.3, s * 0.55); x.lineTo(i * s * 0.3 - 2, s * 0.8); x.stroke(); } }
    if (k === 'snow') { x.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { x.beginPath(); x.arc(i * s * 0.3, s * 0.7, 1.6, 0, TAU); x.fill(); } }
    if (k === 'storm') { x.fillStyle = '#ffd35a'; x.beginPath(); x.moveTo(0, s * 0.4); x.lineTo(-s * 0.18, s * 0.75); x.lineTo(0, s * 0.7); x.lineTo(-s * 0.08, s * 1.0); x.lineTo(s * 0.18, s * 0.6); x.lineTo(0, s * 0.62); x.closePath(); x.fill(); }
    if (k === 'fog') { x.strokeStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.moveTo(-s * 0.5, s * 0.6); x.lineTo(s * 0.5, s * 0.6); x.moveTo(-s * 0.35, s * 0.8); x.lineTo(s * 0.4, s * 0.8); x.stroke(); }
    x.restore(); void c;
  }
  function drawHourly() {
    const f = NV.fit($('#wx-hourly')); if (!f) return; const { x, w, h } = f, c = NV.colors; x.clearRect(0, 0, w, h);
    const d = WX.data; if (!d || !d.hourly) { x.strokeStyle = NV.rgba(c.primary, 0.12); x.setLineDash([3, 5]); x.beginPath(); for (let i = 1; i < 4; i++) { const gy = Math.round(h * i / 4) + 0.5; x.moveTo(0, gy); x.lineTo(w, gy); } x.stroke(); x.setLineDash([]); txt(x, WX.busy ? 'CONTACTING OPEN-METEO…' : 'NO FORECAST YET · PRESS ↻ WHEN ONLINE', w / 2, h / 2, NV.rgba(c.secondary, 0.7), 11, 'center'); return; }
    const H = d.hourly, now = hhmmIdx(H.time); const n = 24, T = H.temperature_2m.slice(now, now + n), P = H.precipitation_probability.slice(now, now + n), K = H.weather_code.slice(now, now + n), D = (H.is_day || []).slice(now, now + n), times = H.time.slice(now, now + n);
    const top = 34, bot = h - 18, lo = Math.min(...T) - 1, hi = Math.max(...T) + 1, px = (i) => 12 + i * (w - 24) / (n - 1), py = (v) => bot - (v - lo) / (hi - lo) * (bot - top - 12);
    x.fillStyle = NV.rgba('#5fb6ff', 0.35); P.forEach((p, i) => { const bh = (p || 0) / 100 * (bot - top); x.fillRect(px(i) - 3, bot - bh, 6, bh); });
    const pts = T.map((v, i) => [px(i), py(v)]); const g = x.createLinearGradient(0, top, 0, bot); g.addColorStop(0, NV.rgba(c.tertiary, 0.35)); g.addColorStop(1, NV.rgba(c.tertiary, 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(pts[0][0], bot); pts.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(pts[pts.length - 1][0], bot); x.fill();
    NV.draw.glowLine(x, pts, c.tertiary, 2, 8);
    const step = w < 500 ? 4 : 3;
    for (let i = 0; i < n; i += step) { txt(x, i === 0 ? 'NOW' : times[i].slice(11, 13) + 'h', px(i), h - 7, NV.rgba(c.secondary, 0.75), 10, 'center'); txt(x, Math.round(T[i]) + '°', px(i), pts[i][1] - 9, '#fff', 10.5, 'center'); glyph(x, KIND(K[i]), px(i), 12, 11, D.length ? D[i] : 1); x.fillStyle = '#fff'; x.beginPath(); x.arc(pts[i][0], pts[i][1], 2.4, 0, TAU); x.fill(); }
  }
  function hhmmIdx(times) { const ln = locNow(); if (!ln) return 0; const key = ln.toISOString().slice(0, 13); const i = times.findIndex((t) => t.slice(0, 13) === key); return Math.max(0, i); }
  function drawSunArc(sky) {
    const f = NV.fit($('#wx-sunarc')); if (!f) return; const { x, w, h } = f, c = NV.colors; x.clearRect(0, 0, w, h);
    const d = WX.data, base = h - 22, L = 26, Rr = w - 26;
    let sr = null, ss = null; if (d && d.daily && d.daily.sunrise) { sr = hhmm(d.daily.sunrise[0]); ss = hhmm(d.daily.sunset[0]); }
    else { const o = obs(); if (!WX.st || Date.now() - WX.stT > 600000) { WX.st = sunTimes(o.lat, o.lon); WX.stT = Date.now(); } sr = WX.st.rise; ss = WX.st.set; if (WX.st.len) NV.text('#wx-daylen', `${Math.floor(WX.st.len / 60)}h ${Math.round(WX.st.len % 60)}m of daylight (computed)`); }
    const toMin = (s) => (s ? +s.slice(0, 2) * 60 + +s.slice(3, 5) : null); const ln = locNow() || new Date(); const nowMin = d ? ln.getUTCHours() * 60 + ln.getUTCMinutes() : ln.getHours() * 60 + ln.getMinutes();
    const a = toMin(sr) ?? 390, b = toMin(ss) ?? 1110;
    x.strokeStyle = NV.rgba(c.primary, 0.35); x.setLineDash([4, 5]); x.beginPath(); for (let i = 0; i <= 60; i++) { const tt = i / 60, px = L + tt * (Rr - L), py = base - Math.sin(tt * Math.PI) * (h - 44); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.setLineDash([]);
    x.strokeStyle = NV.rgba(c.secondary, 0.4); x.beginPath(); x.moveTo(8, base + 0.5); x.lineTo(w - 8, base + 0.5); x.stroke();
    const tt = (nowMin - a) / (b - a);
    if (tt >= 0 && tt <= 1) { const px = L + tt * (Rr - L), py = base - Math.sin(tt * Math.PI) * (h - 44); x.strokeStyle = NV.rgba('#ffd35a', 0.9); x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40 * tt, qx = L + u * (Rr - L), qy = base - Math.sin(u * Math.PI) * (h - 44); i ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.stroke(); const gg = x.createRadialGradient(px, py, 0, px, py, 18); gg.addColorStop(0, 'rgba(255,220,120,.9)'); gg.addColorStop(1, 'rgba(255,200,80,0)'); x.fillStyle = gg; x.beginPath(); x.arc(px, py, 18, 0, TAU); x.fill(); x.fillStyle = '#ffe07a'; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.fill(); }
    else txt(x, sky ? `SUN ${Math.abs(sky.sun.alt).toFixed(0)}° BELOW THE HORIZON` : 'NIGHT', w / 2, base - 20, NV.rgba(c.secondary, 0.6), 10.5, 'center');
    txt(x, '↑ ' + (sr || '--:--'), L, h - 9, '#ffd35a', 10.5, 'center'); txt(x, '↓ ' + (ss || '--:--'), Rr, h - 9, '#ff9a5a', 10.5, 'center');
    if (sky) txt(x, `ALT ${sky.sun.alt.toFixed(1)}° · AZ ${sky.sun.az.toFixed(0)}°`, w / 2, h - 9, NV.rgba(c.secondary, 0.7), 10, 'center');
  }
  function paintMoon(x, cx, cy, R, phase, lat, detail) {
    let p = phase; const waning = p > 0.5; if (waning) p = 1 - p;
    x.save(); x.translate(cx, cy); if (waning !== lat < 0) x.scale(-1, 1);
    const k = Math.cos(p * TAU), rx = Math.abs(k) * R;
    x.beginPath(); x.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); if (k > 0) x.ellipse(0, 0, rx, R, 0, Math.PI / 2, -Math.PI / 2, true); else x.ellipse(0, 0, rx, R, 0, Math.PI / 2, Math.PI * 1.5, false); x.closePath();
    const lg = x.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R); lg.addColorStop(0, '#fbfbf2'); lg.addColorStop(1, '#c9ccd6'); x.fillStyle = lg; x.shadowColor = 'rgba(240,240,255,.6)'; x.shadowBlur = detail ? 14 : 6; x.fill(); x.shadowBlur = 0;
    if (detail) { x.clip(); x.fillStyle = 'rgba(90,96,120,.28)'; [[-0.3, -0.25, 0.22], [0.2, -0.35, 0.16], [0.25, 0.15, 0.24], [-0.15, 0.35, 0.14], [-0.45, 0.1, 0.1]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a * R, b * R, r * R, 0, TAU); x.fill(); }); }
    x.restore();
  }
  function drawMoon(m, lat) {
    const f = NV.fit($('#moon-cv')); if (!f) return; const { x, w, h } = f, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6; x.clearRect(0, 0, w, h);
    const glow = x.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.4); glow.addColorStop(0, 'rgba(230,235,255,.18)'); glow.addColorStop(1, 'rgba(230,235,255,0)'); x.fillStyle = glow; x.beginPath(); x.arc(cx, cy, R * 1.4, 0, TAU); x.fill();
    x.fillStyle = '#1b2030'; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    paintMoon(x, cx, cy, R, m.phase, lat, true);
    x.restore(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
  }
  function drawDome(sky, t) {
    const f = NV.fit($('#sky-dome')); if (!f) return; const { x, w, h } = f, c = NV.colors, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 18; x.clearRect(0, 0, w, h);
    const sa = sky.sun.alt, day = NV.clamp((sa + 8) / 14, 0, 1); // 0 night .. 1 day
    const bg = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k)); const zen = mix([6, 10, 28], [58, 120, 200], day), hor = mix([18, 24, 52], [150, 190, 230], day);
    bg.addColorStop(0, `rgb(${zen})`); bg.addColorStop(1, `rgb(${hor})`); x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    const P = (alt, az) => { const r = R * (90 - alt) / 90; return [cx - r * sind(az), cy - r * cosd(az)]; };
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.clip();
    const starA = NV.clamp(1 - day * 1.15, 0.12, 1);
    // milky way
    x.globalCompositeOperation = 'lighter';
    MILKY.forEach((m) => { const hz = altAz(m.ra, m.dec, sky.lst, sky.lat); if (hz.alt < -12) return; const [px, py] = P(hz.alt, hz.az); [[0.24, 0.028], [0.11, 0.045]].forEach(([k, a]) => { const rr = R * k * (0.6 + 0.4 * m.w); const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, `rgba(175,195,255,${a * starA * m.w})`); g.addColorStop(0.6, `rgba(175,195,255,${a * 0.35 * starA * m.w})`); g.addColorStop(1, 'rgba(175,195,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); }); });
    x.globalCompositeOperation = 'source-over';
    // alt rings + cardinal lines
    x.strokeStyle = NV.rgba(c.primary, 0.16); x.lineWidth = 1; [30, 60].forEach((a) => { x.beginPath(); x.arc(cx, cy, R * (90 - a) / 90, 0, TAU); x.stroke(); }); x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    // faint decorative stars
    const tw = t / 1000;
    FAINT.forEach((s) => { const hz = altAz(s.ra, s.dec, sky.lst, sky.lat); if (hz.alt < 0) return; const [px, py] = P(hz.alt, hz.az); x.globalAlpha = starA * (0.35 + 0.25 * Math.sin(tw * 1.7 + s.tw)) * (5.6 - s.mag) / 2.2; x.fillStyle = '#dfe8ff'; x.fillRect(px, py, 1.2, 1.2); }); x.globalAlpha = 1;
    // constellation lines
    x.strokeStyle = NV.rgba(c.secondary, 0.28 * starA + 0.05); x.lineWidth = 1;
    LINES.forEach(([a, b]) => { const A = sky.stars[SIDX[a]], B = sky.stars[SIDX[b]]; if (A.alt < -2 || B.alt < -2) return; const [x1, y1] = P(A.alt, A.az), [x2, y2] = P(B.alt, B.az); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); });
    // bright stars
    sky.stars.forEach((s) => { if (s.alt < 0) return; const [px, py] = P(s.alt, s.az), r = NV.clamp(2.6 - s.mag * 0.55, 0.8, 3.4); x.globalAlpha = starA; x.fillStyle = '#fff'; x.shadowColor = '#bcd4ff'; x.shadowBlur = r * 3; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); x.shadowBlur = 0; if (s.mag < 0.9 && R > 110) txt(x, s.name, px + 5, py - 6, NV.rgba('#dce6ff', 0.75 * starA + 0.1), 9.5); }); x.globalAlpha = 1;
    // planets, moon, sun
    sky.bodies.slice(2).forEach((p) => { if (p.alt < 0) return; const [px, py] = P(p.alt, p.az); x.fillStyle = p.col; x.shadowColor = p.col; x.shadowBlur = 10; x.beginPath(); x.arc(px, py, NV.clamp(3.4 - p.mag * 0.35, 2, 5), 0, TAU); x.fill(); x.shadowBlur = 0; txt(x, p.name, px + 6, py + 8, p.col, 10); });
    const m = sky.moon; if (m.alt > -1) { const [px, py] = P(m.alt, m.az); const g = x.createRadialGradient(px, py, 0, px, py, 22); g.addColorStop(0, 'rgba(240,240,255,.55)'); g.addColorStop(1, 'rgba(240,240,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, 22, 0, TAU); x.fill(); x.fillStyle = 'rgba(30,34,50,.9)'; x.beginPath(); x.arc(px, py, 7, 0, TAU); x.fill(); paintMoon(x, px, py, 7, m.phase, sky.lat, false); txt(x, 'Moon', px + 10, py - 8, '#f4f4ea', 10.5); }
    const s = sky.sun; if (s.alt > -1) { const [px, py] = P(s.alt, s.az); const g = x.createRadialGradient(px, py, 0, px, py, 34); g.addColorStop(0, 'rgba(255,230,140,.95)'); g.addColorStop(0.3, 'rgba(255,200,90,.35)'); g.addColorStop(1, 'rgba(255,190,80,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, 34, 0, TAU); x.fill(); x.fillStyle = '#fff3c4'; x.beginPath(); x.arc(px, py, 8, 0, TAU); x.fill(); txt(x, 'Sun', px + 12, py - 10, '#ffe07a', 10.5); }
    x.restore();
    // rim + cardinals
    x.strokeStyle = NV.rgba(c.primary, 0.7); x.lineWidth = 1.5; x.shadowColor = c.primary; x.shadowBlur = 10; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke(); x.shadowBlur = 0;
    for (let a = 0; a < 360; a += 10) { const r1 = R + 2, r2 = R + (a % 90 === 0 ? 9 : a % 30 === 0 ? 6 : 4); x.strokeStyle = NV.rgba(c.secondary, a % 30 === 0 ? 0.7 : 0.35); x.beginPath(); x.moveTo(cx - r1 * sind(a), cy - r1 * cosd(a)); x.lineTo(cx - r2 * sind(a), cy - r2 * cosd(a)); x.stroke(); }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([l, a]) => txt(x, l, cx - (R + 13) * sind(a) * 0.93, cy - (R + 13) * cosd(a) * 0.93 + (a === 0 ? -1 : a === 180 ? 2 : 0), a === 0 ? c.tertiary : c.secondary, 11, 'center', 'Orbitron, sans-serif', '700'));
    // selection
    if (WX.sel) { const o = [...sky.bodies, ...sky.stars].find((b) => b.name === WX.sel); if (o && o.alt > -1) { const [px, py] = P(o.alt, o.az); x.strokeStyle = c.tertiary; x.lineWidth = 1.5; const r = 11; x.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { x.moveTo(px + sx * r, py + sy * (r - 5)); x.lineTo(px + sx * r, py + sy * r); x.lineTo(px + sx * (r - 5), py + sy * r); }); x.stroke(); const label = `${o.name} · ${o.alt.toFixed(0)}° ${dirName(o.az)}`; x.font = '10.5px ShareTech, monospace'; const tw2 = x.measureText(label).width + 12; const bx = NV.clamp(px - tw2 / 2, 4, w - tw2 - 4), by = py + 16 > h - 24 ? py - 34 : py + 16; x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(bx, by, tw2, 18); x.strokeStyle = NV.rgba(c.tertiary, 0.7); x.strokeRect(bx + 0.5, by + 0.5, tw2 - 1, 17); txt(x, label, bx + 6, by + 9.5, '#fff', 10.5); } }
    txt(x, day > 0.6 ? 'DAYLIGHT · STARS SHOWN FAINT' : day > 0.05 ? 'TWILIGHT' : 'NIGHT SKY', 8, h - 8, NV.rgba(c.secondary, 0.7), 9.5);
    txt(x, 'LOOKING UP · N TOP · E LEFT', w - 8, h - 8, NV.rgba(c.secondary, 0.55), 9.5, 'right');
    WX.P = P; WX.R = R;
  }
  function skyList(sky) {
    const list = [...sky.bodies.filter((b) => b.alt > 0), ...sky.stars.filter((s) => s.alt > 5 && s.mag < 1.3)].sort((a, b) => a.mag - b.mag).slice(0, 9);
    const dot = (b) => b.kind === 'sun' ? '#ffd35a' : b.kind === 'moon' ? '#f4f4ea' : b.col || '#dfe8ff';
    $('#sky-list').innerHTML = list.length ? list.map((b) => `<li data-obj="${NV.esc(b.name)}"><i style="--c:${dot(b)}"></i><span>${NV.esc(b.name)}</span><span class="mono">${b.alt.toFixed(0)}° ${dirName(b.az)}</span><em>${b.kind === 'star' ? 'star' : b.kind}</em></li>`).join('') : '<li class="li-empty"><span>Nothing bright above the horizon. Most irregular.</span></li>';
  }
  function obs() { const p = WX.place || fallbackPlace(); return { lat: p.lat, lon: p.lon }; }
  function updateSky(t) {
    const o = obs(), sky = computeSky(new Date(), o.lat, o.lon); WX.sky = sky;
    drawDome(sky, t); drawMoon(sky.moon, o.lat); drawSunArc(sky);
    if (!WX.listT || t - WX.listT > 5000) { WX.listT = t; skyList(sky); const m = sky.moon; NV.text('#moon-name', phaseName(m.phase)); NV.text('#moon-sub', `${Math.round(m.illum * 100)}% lit · age ${(m.phase * 29.53).toFixed(1)} d · ${m.alt > 0 ? 'up ' + m.alt.toFixed(0) + '° ' + dirName(m.az) : 'below horizon'}`); }
  }
  WX.enter = () => {
    WX.skyT = 0; WX.drawnHourly = 0;
    if (!WX.data) { const c = NV.store.get('wx', null); if (c && c.data) { WX.place = c.place; WX.data = c.data; WX.t = c.t; WX.cached = true; WX.units = c.units; render(); badge('CACHED', 'warn'); } }
    const stale = !WX.data || Date.now() - WX.t > 30 * 60000 || WX.units !== NV.settings.units;
    if (stale && !WX.busy && !(WX.failT && Date.now() - WX.failT < 120000)) fetchWx(WX.place || fallbackPlace());
  };
  WX.frame = (t) => {
    if (!WX.drawnHourly || t - WX.drawnHourly > 1000) { WX.drawnHourly = t; drawHourly(); }
    if (!WX.skyT || t - WX.skyT > (NV.reducedMotion ? 5000 : 500)) { WX.skyT = t; updateSky(t); }
    if (!WX.agoT || t - WX.agoT > 30000) { WX.agoT = t; if (WX.data) NV.text('#wx-updated', (WX.cached ? 'cached · ' : '') + 'updated ' + ago(WX.t)); }
  };
  WX.primary = () => fetchWx(WX.place || fallbackPlace(), { speak: true });
  // Summary for JARVIS / Daily Briefing (uses live data, else the cached report; sky maths works offline)
  NV.sky.summary = () => {
    let d = WX.data, place = WX.place, t = WX.t, cached = WX.cached;
    if (!d) { const c = NV.store.get('wx', null); if (c && c.data) { d = c.data; place = c.place; t = c.t; cached = true; } }
    const o = place || fallbackPlace(), sky = computeSky(new Date(), o.lat, o.lon), m = sky.moon, st = sunTimes(o.lat, o.lon);
    const out = { place: o.name || 'your location', moon: { phase: m.phase, illum: m.illum, name: phaseName(m.phase), alt: m.alt }, sunrise: st.rise, sunset: st.set, dayLen: st.len, planets: sky.bodies ? sky.bodies.filter((b) => b.kind === 'planet' && b.alt > 0).map((b) => b.name) : [] };
    if (d && d.current) {
      const c = d.current, dl = d.daily || {}, u = (d.current_units && d.current_units.temperature_2m) || (F() ? '°F' : '°C');
      const hp = (d.hourly && d.hourly.precipitation_probability) || [], hi = (d.hourly && d.hourly.time) || [], now = Date.now();
      let rain = 0; for (let i = 0; i < hi.length; i++) { const tt = Date.parse(hi[i]); if (tt >= now - 3600e3 && tt <= now + 12 * 3600e3) rain = Math.max(rain, hp[i] || 0); }
      Object.assign(out, { ok: true, cached, t, temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), unit: u, desc: DESC[c.weather_code] || 'Unclassified', kind: KIND(c.weather_code), code: c.weather_code, isDay: !!c.is_day,
        wind: Math.round(c.wind_speed_10m), windUnit: (d.current_units && d.current_units.wind_speed_10m) || '', humidity: c.relative_humidity_2m,
        hi: dl.temperature_2m_max ? Math.round(dl.temperature_2m_max[0]) : null, lo: dl.temperature_2m_min ? Math.round(dl.temperature_2m_min[0]) : null, uv: dl.uv_index_max ? dl.uv_index_max[0] : null, rain,
        sunrise: dl.sunrise ? String(dl.sunrise[0]).slice(11, 16) : st.rise, sunset: dl.sunset ? String(dl.sunset[0]).slice(11, 16) : st.set });
    }
    return out;
  };
  NV.sky.paintMoon = paintMoon; NV.sky.phaseName = phaseName; NV.sky.refresh = () => fetchWx(WX.place || fallbackPlace(), {});
  WX.useLocation = () => {
    if (!navigator.geolocation) { NV.toast('Geolocation is not available here, Sir. Search for a city instead.'); return; }
    badge('LOCATING…', 'warn');
    navigator.geolocation.getCurrentPosition((pos) => { const { latitude: lat, longitude: lon } = pos.coords; fetchWx({ name: 'My location', country: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`, lat, lon, src: 'geo' }, { speak: true }); },
      (err) => { badge(WX.data ? (WX.cached ? 'CACHED' : 'LIVE') : 'STANDBY', WX.data ? 'warn' : ''); NV.toast(err.code === 1 ? 'Location permission declined, Sir. I shall use ' + (WX.place || fallbackPlace()).name + ' instead.' : 'Could not get a location fix. Using ' + (WX.place || fallbackPlace()).name + '.', 3000); if (!WX.data) fetchWx(WX.place || fallbackPlace()); }, { timeout: 10000, maximumAge: 600000 });
  };
  async function search(q) {
    const ul = $('#wx-results'); ul.hidden = false; ul.innerHTML = '<li class="li-empty"><span>Searching…</span></li>';
    try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`); const d = await r.json(); const res = d.results || [];
      ul.innerHTML = res.length ? res.map((p, i) => `<li><button type="button" data-i="${i}"><b>${NV.esc(p.name)}</b><span>${NV.esc([p.admin1, p.country].filter(Boolean).join(', '))}</span></button></li>`).join('') : '<li class="li-empty"><span>No such place, Sir. Perhaps it is fictional.</span></li>';
      ul.querySelectorAll('button').forEach((b) => b.onclick = () => { const p = res[+b.dataset.i]; ul.hidden = true; $('#wx-q').value = ''; fetchWx({ name: p.name, country: p.country || '', lat: p.latitude, lon: p.longitude, src: 'search' }, { speak: true }); });
    } catch (e) { ul.innerHTML = '<li class="li-empty"><span>City search needs an internet connection.</span></li>'; }
  }
  NV._init_sky = () => {
    $('#wx-geo').onclick = WX.useLocation;
    $('#wx-refresh').onclick = () => fetchWx(WX.place || fallbackPlace(), { speak: true });
    const setU = () => NV.text('#wx-units', F() ? '°F → °C' : '°C → °F'); setU();
    $('#wx-units').onclick = () => { NV.setSetting('units', F() ? 'c' : 'f'); setU(); NV.audio.click(1.1); fetchWx(WX.place || fallbackPlace()); };
    $('#wx-search').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#wx-q').value.trim(); if (q.length > 1) search(q); });
    $('#wx-q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#wx-results').hidden = true; e.stopPropagation(); } });
    $('#sky-dome').addEventListener('pointerdown', (e) => {
      if (!WX.sky || !WX.P) return; const r = e.currentTarget.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 28;
      [...WX.sky.bodies, ...WX.sky.stars].forEach((b) => { if (b.alt < -1) return; const [px, py] = WX.P(b.alt, b.az), dd = Math.hypot(px - mx, py - my); if (dd < bd) { bd = dd; best = b; } });
      WX.sel = best ? best.name : null; WX.skyT = 0; if (best) { NV.audio.lock(); NV.award('sky'); } else NV.audio.click(0.8);
    });
    $('#sky-list').addEventListener('click', (e) => { const li = e.target.closest('[data-obj]'); if (!li) return; WX.sel = li.dataset.obj; WX.skyT = 0; NV.audio.lock(); NV.award('sky'); });
    if (WX.place) NV.text('#wx-place', WX.place.name);
  };
})();
