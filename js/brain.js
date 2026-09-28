/* NICK-VERSE Scanner: JARVIS brain. Rule and intent engine (no paid APIs, no keys): answers, commands,
   maths, unit conversion, reminders and timers, dice and odds, session memory, contextual quips. */
(function () {
  'use strict';
  const NV = window.NV, pick = NV.pick;
  const BR = (NV.brain = { last: '' });
  const SIR = () => (Math.random() < 0.22 ? 'Nicholas' : 'Sir');

  // ======================= session memory =======================
  const MEMKEY = 'nickverse.scanner.session';
  let mem = []; try { mem = JSON.parse(sessionStorage.getItem(MEMKEY) || '[]'); } catch (e) { mem = []; }
  let notes = NV.store.get('notes', []);
  BR.memory = () => mem.slice();
  BR.remember = (text, kind = 'act') => {
    const last = mem[mem.length - 1]; if (last && last.text === text && Date.now() - last.t < 4000) return;
    mem.push({ t: Date.now(), text, kind }); if (mem.length > 60) mem.splice(0, mem.length - 60);
    try { sessionStorage.setItem(MEMKEY, JSON.stringify(mem)); } catch (e) { /* private mode */ }
    NV.emit('memory', mem);
  };
  const hm = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // ======================= reminders & timers =======================
  let rems = NV.store.get('reminders', []).filter((r) => r && r.due > Date.now() - 6 * 3600e3);
  const saveRems = () => { NV.store.set('reminders', rems); NV.emit('reminders', rems); };
  BR.reminders = () => rems.slice().sort((a, b) => a.due - b.due);
  BR.cancelReminder = (id) => { rems = rems.filter((r) => r.id !== id); saveRems(); };
  function addReminder(ms, text, kind) {
    const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), due: Date.now() + ms, text: text || '', kind, set: Date.now() };
    rems.push(r); saveRems(); BR.remember(`${kind === 'timer' ? 'Timer' : 'Reminder'} set${text ? ': ' + text : ''} (due ${hm(r.due)})`, 'rem'); NV.award('reminder'); return r;
  }
  function fire(r, late) {
    rems = rems.filter((x) => x.id !== r.id); saveRems();
    const msg = r.kind === 'timer' ? `${SIR()}, your ${fmtDur(r.due - r.set)} timer is complete.${r.text ? ' ' + cap(r.text) + '.' : ''}` : `${late ? 'While you were away, Sir, a reminder fell due: ' : 'A reminder, ' + SIR() + ': '}${r.text ? r.text.replace(/\.$/, '') : 'you asked me to remind you of something. You did not say what. I admire the mystery'}.`;
    NV.audio.chime(); NV.haptic([60, 80, 60, 80, 120]);
    NV.toast('⏰ ' + (r.kind === 'timer' ? 'Timer complete' : 'Reminder') + (r.text ? ': ' + r.text : ''), 7000, { cls: 'rem' });
    NV.jarvis.speak(msg, { tag: 'REMINDER' });
    if (document.hidden && window.Notification && Notification.permission === 'granted') { try { new Notification('NICK-VERSE · JARVIS', { body: msg, icon: 'icons/icon-192.png', tag: r.id }); } catch (e) { /* ignore */ } }
    BR.remember((r.kind === 'timer' ? 'Timer done' : 'Reminder fired') + (r.text ? ': ' + r.text : ''), 'rem');
  }
  setInterval(() => { const now = Date.now(); rems.slice().forEach((r) => { if (r.due <= now) fire(r, now - r.due > 60000); }); }, 1000);

  // ======================= helpers =======================
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty five': 45, fifty: 50, sixty: 60, ninety: 90, hundred: 100, couple: 2, few: 3 };
  const num = (w) => { if (w == null) return NaN; w = String(w).trim(); if (/^half an?$/.test(w)) return 0.5; return w in WORDNUM ? WORDNUM[w] : parseFloat(w.replace(/,/g, '')); };
  function fmtDur(ms) { const s = Math.round(ms / 1000); if (s < 60) return s + ' second' + (s === 1 ? '' : 's'); const m = Math.round(s / 60); if (m < 60) return m + ' minute' + (m === 1 ? '' : 's'); const h = Math.floor(m / 60), mm = m % 60; return h + ' hour' + (h === 1 ? '' : 's') + (mm ? ' ' + mm + ' min' : ''); }
  function parseDuration(q) {
    const re = /(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|half an?|couple of|few)\s*(seconds?|secs?|s\b|minutes?|mins?|m\b|hours?|hrs?|h\b)/g;
    let m, ms = 0, hit = false;
    while ((m = re.exec(q))) { const n = num(m[1].replace(/ of$/, '')); if (isNaN(n)) continue; hit = true; const u = m[2][0]; ms += n * (u === 's' ? 1000 : u === 'm' ? 60000 : 3600000); }
    return hit ? ms : null;
  }
  function parseClock(q) {
    const m = q.match(/\bat (\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?\b/); if (!m) return null;
    let h = +m[1]; const mi = +(m[2] || 0), ap = (m[3] || '').replace(/\./g, ''); if (h > 23 || mi > 59) return null;
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    const d = new Date(); d.setHours(h, mi, 0, 0); if (!ap && h < 12 && d < new Date()) d.setHours(h + 12); if (d < new Date()) d.setDate(d.getDate() + 1);
    return d.getTime() - Date.now();
  }
  const fmtNum = (v) => { if (!isFinite(v)) return v > 0 ? 'infinity' : 'undefined'; const a = Math.abs(v); if (a !== 0 && (a >= 1e12 || a < 1e-4)) return v.toExponential(3).replace('e+', ' × 10^').replace('e-', ' × 10^-'); return (Math.round(v * 1e4) / 1e4).toLocaleString('en-GB', { maximumFractionDigits: 4 }); };

  // ======================= safe maths (recursive descent, no eval) =======================
  function calc(src) {
    let s = ' ' + src.toLowerCase() + ' ';
    s = s.replace(/[?!]/g, ' ').replace(/,(?=\d{3})/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/\b(what(?:'s| is| are)?|calculate|compute|work out|solve|equals?|how much is|tell me|please|jarvis|the answer to|result of|value of)\b/g, ' ')
      .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent|per cent)\s*of\b/g, '($1/100)*')
      .replace(/\bsquare root of\b|\bsqrt of\b|\broot of\b/g, ' sqrt ').replace(/\bcube root of\b/g, ' cbrt ')
      .replace(/\bmultiplied by\b|\btimes\b|(?<=\d)\s*x\s*(?=[\d(])/g, ' * ').replace(/\bdivided by\b|\bover\b/g, ' / ')
      .replace(/\bplus\b|\badded to\b/g, ' + ').replace(/\bminus\b|\btake away\b|\bsubtract(?:ed from)?\b/g, ' - ')
      .replace(/\bto the power of\b|\braised to\b|\bto the\b(?=\s*\d)/g, ' ^ ').replace(/\bsquared\b/g, ' ^ 2 ').replace(/\bcubed\b/g, ' ^ 3 ')
      .replace(/\bmod(?:ulo)?\b/g, ' % ').replace(/\bpi\b|π/g, ' pi ').replace(/\bfactorial of\b/g, ' fact ').replace(/(\d+)\s*factorial\b/g, '$1!');
    const toks = []; const re = /\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?|[+\-*/^%()!]|sqrt|cbrt|sin|cos|tan|log|ln|abs|round|fact|pi|e)\s*/y;
    s = s.trim(); let i = 0; while (i < s.length) { re.lastIndex = i; const m = re.exec(s); if (!m) return null; toks.push(m[1]); i = re.lastIndex; }
    if (!toks.length || !toks.some((t) => /\d|pi|^e$/.test(t))) return null;
    let p = 0; const peek = () => toks[p], eat = (t) => (toks[p] === t ? (p++, true) : false);
    const F = { sqrt: Math.sqrt, cbrt: Math.cbrt, sin: (v) => Math.sin(v * Math.PI / 180), cos: (v) => Math.cos(v * Math.PI / 180), tan: (v) => Math.tan(v * Math.PI / 180), log: Math.log10, ln: Math.log, abs: Math.abs, round: Math.round, fact: (v) => { if (v < 0 || v > 170 || v % 1) return NaN; let r = 1; for (let k = 2; k <= v; k++) r *= k; return r; } };
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = toks[p++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { let v = power(); for (;;) { const t = peek(); if (t === '*' || t === '/' || t === '%') { p++; const r = power(); v = t === '*' ? v * r : t === '/' ? v / r : v % r; } else if (t === '(' || (t && /^(\d|sqrt|cbrt|sin|cos|tan|log|ln|abs|pi)/.test(t))) { v *= power(); } else return v; } }
    function power() { let v = unary(); if (eat('^')) v = Math.pow(v, power()); return v; }
    function unary() { if (eat('-')) return -unary(); if (eat('+')) return unary(); return post(); }
    function post() { let v = prim(); while (eat('!')) v = F.fact(v); return v; }
    function prim() {
      const t = toks[p++]; if (t == null) throw 0;
      if (/^\d/.test(t)) return parseFloat(t); if (t === 'pi') return Math.PI; if (t === 'e') return Math.E;
      if (t === '(') { const v = expr(); if (!eat(')')) throw 0; return v; }
      if (F[t]) return F[t](unary());
      throw 0;
    }
    try { const v = expr(); if (p !== toks.length) return null; return v; } catch (e) { return null; }
  }
  BR.calc = calc;

  // ======================= unit conversion =======================
  const U = {};
  const def = (cat, f, ...names) => names.forEach((n) => (U[n] = { cat, f }));
  def('len', 1, 'm', 'metre', 'meter', 'metres', 'meters'); def('len', 1000, 'km', 'kilometre', 'kilometer', 'kilometres', 'kilometers', 'k');
  def('len', 0.01, 'cm', 'centimetre', 'centimeter', 'centimetres', 'centimeters'); def('len', 0.001, 'mm', 'millimetre', 'millimeter', 'millimetres', 'millimeters');
  def('len', 1609.344, 'mi', 'mile', 'miles'); def('len', 0.9144, 'yd', 'yard', 'yards'); def('len', 0.3048, 'ft', 'foot', 'feet'); def('len', 0.0254, 'in', 'inch', 'inches', '"');
  def('len', 1852, 'nautical mile', 'nautical miles'); def('len', 201.168, 'furlong', 'furlongs'); def('len', 9.4607e15, 'light year', 'light years', 'lightyear', 'lightyears');
  def('len', 0.178, 'banana', 'bananas'); def('len', 11.2, 'double decker bus', 'double decker buses', 'bus', 'buses'); def('len', 105, 'football pitch', 'football pitches');
  def('mass', 1, 'kg', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes'); def('mass', 0.001, 'g', 'gram', 'grams', 'gramme', 'grammes'); def('mass', 1e-6, 'mg', 'milligram', 'milligrams');
  def('mass', 0.45359237, 'lb', 'lbs', 'pound', 'pounds'); def('mass', 0.028349523, 'oz', 'ounce', 'ounces'); def('mass', 6.35029318, 'st', 'stone', 'stones'); def('mass', 1000, 'tonne', 'tonnes', 'metric ton', 'metric tons'); def('mass', 907.18474, 'ton', 'tons', 'short ton');
  def('vol', 1, 'l', 'litre', 'liter', 'litres', 'liters'); def('vol', 0.001, 'ml', 'millilitre', 'milliliter', 'millilitres', 'milliliters'); def('vol', 4.54609, 'gallon', 'gallons', 'uk gallon', 'uk gallons', 'imperial gallon', 'imperial gallons');
  def('vol', 3.785411784, 'us gallon', 'us gallons'); def('vol', 0.56826125, 'pint', 'pints', 'uk pint', 'uk pints'); def('vol', 0.473176, 'us pint', 'us pints'); def('vol', 0.25, 'cup', 'cups'); def('vol', 0.015, 'tbsp', 'tablespoon', 'tablespoons'); def('vol', 0.005, 'tsp', 'teaspoon', 'teaspoons'); def('vol', 0.0295735, 'fl oz', 'fluid ounce', 'fluid ounces');
  def('spd', 1, 'm/s', 'metres per second', 'meters per second'); def('spd', 1 / 3.6, 'kph', 'km/h', 'kmh', 'kmph', 'kilometres per hour', 'kilometers per hour'); def('spd', 0.44704, 'mph', 'miles per hour'); def('spd', 0.514444, 'knot', 'knots');
  def('time', 1, 's', 'sec', 'secs', 'second', 'seconds'); def('time', 60, 'min', 'mins', 'minute', 'minutes'); def('time', 3600, 'h', 'hr', 'hrs', 'hour', 'hours'); def('time', 86400, 'day', 'days'); def('time', 604800, 'week', 'weeks'); def('time', 31557600, 'year', 'years');
  def('data', 1, 'byte', 'bytes', 'b'); def('data', 1e3, 'kb', 'kilobyte', 'kilobytes'); def('data', 1e6, 'mb', 'megabyte', 'megabytes'); def('data', 1e9, 'gb', 'gigabyte', 'gigabytes'); def('data', 1e12, 'tb', 'terabyte', 'terabytes');
  def('area', 1, 'square metre', 'square metres', 'square meter', 'square meters', 'sq m', 'm2'); def('area', 0.092903, 'square foot', 'square feet', 'sq ft', 'ft2'); def('area', 4046.86, 'acre', 'acres'); def('area', 10000, 'hectare', 'hectares');
  const TEMP = { c: 'c', '°c': 'c', celsius: 'c', centigrade: 'c', f: 'f', '°f': 'f', fahrenheit: 'f', k: 'k', kelvin: 'k' };
  function unitOf(w) {
    w = w.trim().replace(/^(?:degrees?|deg)\s+/, '').replace(/\s+/g, ' ').replace(/\.$/, '');
    if (TEMP[w]) return { cat: 'temp', t: TEMP[w] };
    if (U[w]) return U[w];
    const sing = w.replace(/(ches|shes|ses|xes)$/, (m) => m.slice(0, -2)).replace(/ies$/, 'y').replace(/s$/, '');
    return U[sing] || null;
  }
  const NICE = { m: 'metres', km: 'kilometres', cm: 'centimetres', mm: 'millimetres', mi: 'miles', yd: 'yards', ft: 'feet', in: 'inches', kg: 'kilograms', g: 'grams', lb: 'pounds', lbs: 'pounds', oz: 'ounces', st: 'stone', l: 'litres', ml: 'millilitres', kph: 'km/h', kmh: 'km/h', 'm/s': 'metres per second', mph: 'mph', s: 'seconds', h: 'hours', min: 'minutes' };
  const tconv = (v, a, b) => { const c = a === 'c' ? v : a === 'f' ? (v - 32) * 5 / 9 : v - 273.15; return b === 'c' ? c : b === 'f' ? c * 9 / 5 + 32 : c + 273.15; };
  const TNAME = { c: '°C', f: '°F', k: 'K' };
  function convert(q) {
    let m = q.match(/how many ([a-z°/ ]+?) (?:are )?(?:there )?in (?:a |an |one )?(-?[\d.,]+)?\s*([a-z°/" ]+)$/);
    let v, from, to;
    if (m) { v = m[2] ? num(m[2]) : 1; from = m[3]; to = m[1]; }
    else { m = q.match(/(-?[\d.,]+|an?|one)\s*([a-z°/" ]+?)\s+(?:to|in|into|as|in terms of)\s+([a-z°/" ]+)$/); if (!m) return null; v = num(m[1]); from = m[2]; to = m[3]; }
    const A = unitOf(from.replace(/^(?:convert|what is|whats|what's)\s+/, '')), B = unitOf(to);
    if (!A || !B || isNaN(v)) return null;
    if (A.cat !== B.cat) return { text: `I am afraid ${from.trim()} and ${to.trim()} measure rather different things, ${SIR()}. Even I cannot turn one into the other. Not without a tape measure, a kitchen scale and a very loose definition.` };
    if (A.cat === 'temp') { const r = tconv(v, A.t, B.t); return { text: `${fmtNum(v)}${TNAME[A.t]} is ${fmtNum(Math.round(r * 10) / 10)}${TNAME[B.t]}${B.t === 'f' && r > 95 ? '. Rather warm' : B.t === 'c' && r < 0 ? '. Frosty' : ''}, ${SIR()}.` }; }
    const r = v * A.f / B.f, fn = NICE[to.trim()] || to.trim();
    const fun = /banana|bus|pitch/.test(to) ? ' An unorthodox unit, but I respect it.' : /light ?year/.test(to) ? ' Do pack a sandwich.' : '';
    return { text: `${fmtNum(v)} ${NICE[from.trim()] || from.trim()} is ${fmtNum(r)} ${fn}, ${SIR()}.${fun}` };
  }
  BR.convert = convert;

  // ======================= content =======================
  const JOKES = [
    'I told the Wi-Fi a joke about packets. It did not get it, so I resent it.',
    'Why did the scanner go to therapy? Too many unresolved issues in its buffer.',
    'I would tell you a joke about UDP, Sir, but you might not get it.',
    'Parallel lines have so much in common. It is a shame they will never meet.',
    'I asked the compass for directions. It said it was feeling a bit lost, which I found ironic, given its one job.',
    'A photon checks into a hotel. The porter asks if it has any luggage. It says no, it is travelling light.',
    'The rubber duck in the simulation feed has asked for a pay rise. I have offered it exposure.',
    'I have a joke about procrastination, Sir. I will tell you later.',
    'Why do programmers prefer dark mode? Because light attracts bugs.',
    'Two antennae got married. The ceremony was dull, but the reception was excellent.',
    'The seismograph and I had a disagreement. It was a minor tremor in our relationship.',
    'I tried to write a joke about the metal detector, but it kept finding spoons.',
    'Heisenberg was pulled over for speeding. "Do you know how fast you were going?" "No, but I know exactly where I am."',
    'What do you call a fake noodle? An impasta. I apologise for nothing.',
    'I asked CINCO for a joke. They sent an invoice.',
    'The Moon is on a diet, Sir. It is currently in its waning phase.',
    'Why did the battery cross the road? To get to the other side of its charge cycle. I will stop now.',
    'I once met a microwave with a great sense of humour. Its jokes were all well received, if a little reheated.'
  ];
  const CINCO = [
    'CINCO was founded in a shed, which it later sold to itself at a considerable loss.',
    'The CINCO Silent Doorbell has a customer satisfaction score of nobody-has-noticed.',
    'CINCO\'s motto was originally "Quality Eventually". Legal asked them to remove the "Quality".',
    'Every CINCO product is tested on at least one intern. His name is Gary. Gary is fine.',
    'CINCO once recalled a recall notice for being too convincing.',
    'The CINCO Cloud Storage Jar holds one actual cloud. It is mostly condensation and hope.',
    'CINCO\'s customer support queue has been measured at over a googol people. Most of them are Gary.',
    'The CINCO warranty covers everything except the product, its parts, use, non-use, and weather.',
    'CINCO\'s research division consists of a dartboard and a surprisingly confident pigeon.',
    'The CINCO Board meets quarterly in a lift, because it keeps meetings short and the views change.',
    'CINCO\'s Bluetooth Spoon pairs with soup. The soup has not agreed to the terms and conditions.',
    'The CINCO company picnic was cancelled due to an unforeseen outbreak of weather.',
    'Gerald from the CINCO Board has never been seen. He is, however, frequently blamed.'
  ];
  const HOWARE = () => {
    const P = NV.perf, st = NV.status || {}, b = st.battery;
    const bits = [pick(['Operating within normal parameters, Sir.', 'Splendid, thank you, Sir. Every subroutine present and correct.', 'Rather well, Sir. I have been polishing my wit.', 'Functioning, which is more than can be said for most CINCO products.'])];
    if (P) bits.push(P.fps >= 55 ? `Running at a crisp ${Math.round(P.fps)} frames per second on ${P.t.name} quality.` : `A touch sluggish at ${Math.round(P.fps)} frames per second; I have set graphics to ${P.t.name} to compensate.`);
    if (b != null) bits.push(b < 0.2 && !st.charging ? `Although your battery is at ${Math.round(b * 100)} percent, which worries me more than it seems to worry you.` : `Battery at ${Math.round(b * 100)} percent${st.charging ? ' and charging' : ''}.`);
    bits.push('And yourself?'); return bits.join(' ');
  };
  const HELP = 'I can tell you the time, date and weather, read the sensors, recall your last scan, check the battery and achievements, open any tool, run protocols, set reminders and timers, convert units, do sums, flip coins, roll dice, work out odds, tell jokes, share CINCO facts and remember what we have been up to this session. Try "remind me in 5 minutes to stretch" or "convert 10 miles to kilometres".';

  // ======================= tools lookup =======================
  const EXTRA = { achievements: 'badges', badges: 'badges', trophies: 'badges', compass: 'nav', navigation: 'nav', level: 'nav', motion: 'motion', sound: 'audio', decibel: 'audio', noise: 'audio', torch: 'light', flashlight: 'light', lux: 'light', stopwatch: 'timer', log: 'log', history: 'log', system: 'system', diagnostics: 'system', threat: 'threat', heart: 'heart', pulse: 'heart', 'heart rate': 'heart', metal: 'metal', 'metal detector': 'metal', magnet: 'metal', seismograph: 'seismo', earthquake: 'seismo', quake: 'seismo', sky: 'weather', stars: 'weather', 'star map': 'weather', moon: 'weather', guard: 'guard', perimeter: 'guard', colour: 'color', color: 'color', ruler: 'measure', protractor: 'measure', reader: 'ocr', text: 'ocr', ar: 'ar', 'a r': 'ar', augmented: 'ar', console: 'jarvis', jarvis: 'jarvis', chat: 'jarvis', briefing: 'brief', 'daily briefing': 'brief', dashboard: 'brief', mission: 'mission', checklist: 'mission', countdown: 'mission', speedometer: 'speed', speed: 'speed', gps: 'speed', trip: 'speed', ghost: 'ghost', ghosts: 'ghost', paranormal: 'ghost', emf: 'ghost', spirit: 'ghost', clap: 'clap', 'clap switch': 'clap', soundboard: 'sound', 'sound board': 'sound', soundscape: 'sound', ambience: 'sound', rain: 'sound', radar: 'radar', sonar: 'radar', scanner: 'scan', camera: 'scan' };
  function findTool(q) {
    q = q.trim(); if (!q) return null; const T = NV.tools.list;
    for (const [k, v] of Object.entries(EXTRA).sort((a, b) => b[0].length - a[0].length)) if (new RegExp('\\b' + k + '\\b').test(q) && NV.tools.byId(v)) return v;
    for (const t of T) { const names = [t.id, t.name.toLowerCase(), t.short.toLowerCase(), ...(t.alias || [])]; if (names.some((n) => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(q))) return t.id; }
    return null;
  }
  BR.findTool = findTool;
  const toolName = (id) => (NV.tools.byId(id) || {}).name || id;

  // ======================= answers =======================
  function weatherAnswer(q) {
    const w = NV.sky && NV.sky.summary ? NV.sky.summary() : null;
    if (/\bmoon\b/.test(q)) { if (!w) return 'The Moon is where it usually is, Sir.'; const m = w.moon; return `The Moon is ${m.name.toLowerCase()}, ${Math.round(m.illum * 100)} percent illuminated, and currently ${m.alt > 0 ? 'above' : 'below'} the horizon.`; }
    if (/\bsunrise|sunset|sun (rise|set)|daylight\b/.test(q)) return w ? `Sunrise ${w.sunrise || 'unknown'}, sunset ${w.sunset || 'unknown'}${w.place ? ' in ' + w.place : ''}.${w.dayLen ? ' Roughly ' + Math.floor(w.dayLen / 60) + ' hours ' + Math.round(w.dayLen % 60) + ' minutes of daylight.' : ''}` : 'I cannot see the Sun from here, Sir.';
    if (/\bplanet/.test(q)) { if (!w) return 'The planets are keeping their own counsel.'; return w.planets.length ? `Above the horizon right now: ${w.planets.join(', ')}. The Weather and Sky tool will point you at them.` : 'No bright planets are above the horizon at the moment, Sir. They are shy this evening.'; }
    if (!w || !w.ok) return null;
    const age = Date.now() - (w.t || 0), stale = w.cached || age > 3 * 3600e3;
    if (/\brain|umbrella|wet\b/.test(q)) return `Chance of rain in the next twelve hours peaks at ${w.rain} percent in ${w.place}. ${w.rain >= 60 ? 'Umbrella strongly advised, Sir.' : w.rain >= 30 ? 'An umbrella would not be unreasonable.' : 'You may leave the umbrella at home. I take no responsibility for clouds.'}`;
    return `${w.place}: ${w.desc.toLowerCase()}, ${w.temp}${w.unit}, feels like ${w.feels}°. High ${w.hi}°, low ${w.lo}°, wind ${w.wind} ${w.windUnit}.${w.rain >= 50 ? ' Rain likely later, Sir.' : ''}${stale ? ' That report is ' + (w.cached ? 'cached' : 'a few hours old') + '; I shall refresh it.' : ''}`;
  }
  function sensorAnswer(q) {
    const s = NV.sensors, sim = (m) => (m !== 'live' ? ' (simulated)' : '');
    if (/\b(heading|facing|which way|direction|north)\b/.test(q)) return `You are facing ${Math.round(s.heading)} degrees, roughly ${NV.cardinal(s.heading)}${s.headingSrc === 'sim' ? ' (simulated, I am afraid)' : ''}.`;
    if (/\b(tilt|level|angle|flat)\b/.test(q)) { const t = Math.hypot(s.ori.beta, s.ori.gamma); return `Pitch ${Math.round(s.ori.beta)} degrees, roll ${Math.round(s.ori.gamma)}${sim(s.orientMode)}. ${t < 2 ? 'Beautifully level.' : t < 15 ? 'Slightly jaunty.' : 'Distinctly not level, Sir.'}`; }
    if (/\b(loud|noise|decibel|db|quiet)\b/.test(q)) { const m = NV.meter; return m && m.active ? `About ${Math.round(m.db)} decibels${m.sim ? ' (simulated)' : ''}. ${m.db < 40 ? 'Blissfully quiet.' : m.db < 65 ? 'Civilised.' : 'Rather lively.'}` : 'The microphone is idle, Sir. Open the Acoustic Analyser and press Start if you would like a reading.'; }
    if (/\b(light|bright|lux|dark)\b/.test(q)) { const L = NV.light || {}; return L.lux != null ? `Roughly ${Math.round(L.lux)} lux${L.src && L.src !== 'sensor' ? ' (' + L.src + ' estimate)' : ''}. ${L.lux < 50 ? 'Mood lighting, Sir.' : L.lux < 500 ? 'Comfortable indoor light.' : 'Very bright indeed.'}` : 'I have no light reading yet, Sir.'; }
    if (/\b(g force|g-force|acceleration|shake)\b/.test(q)) return `Current load ${s.g.toFixed(2)} g, peak ${s.peakG.toFixed(2)} g${sim(s.motionMode)}.`;
    return `Heading ${Math.round(s.heading)}° ${NV.cardinal(s.heading)}, pitch ${Math.round(s.ori.beta)}°, roll ${Math.round(s.ori.gamma)}°, ${s.g.toFixed(2)} g. Motion sensors ${s.motionMode === 'live' ? 'live' : 'simulated'}${NV.meter && NV.meter.active ? ', sound ' + Math.round(NV.meter.db) + ' dB' : ''}. Threat index ${Math.round(NV.threat.value)}, ${NV.threat.name.toLowerCase()}.`;
  }
  function oddsAnswer(q) {
    let m = q.match(/(\d+|two|three|four|five|six|seven|eight|nine|ten) (heads|tails)(?: in a row)?/);
    if (m) { const n = num(m[1]); const p = Math.pow(0.5, n); return `The probability of ${n} ${m[2]} in a row is 1 in ${fmtNum(1 / p)}, or ${fmtNum(p * 100)} percent. Odds of ${fmtNum(1 / p - 1)} to 1 against.`; }
    if (/double six|two sixes|snake eyes/.test(q)) return 'One in thirty-six, Sir: about 2.8 percent. Thirty-five to one against.';
    m = q.match(/rolling an? (\d+)(?: on an? d(\d+))?/); if (m) { const sides = +(m[2] || 6), face = +m[1]; if (face < 1 || face > sides) return `There is no ${face} on a ${sides}-sided die, ${SIR()}. The odds are precisely zero.`; return `One in ${sides}, or ${fmtNum(100 / sides)} percent.`; }
    if (/\b(coin|heads|tails)\b/.test(q)) return 'Fifty-fifty, Sir, assuming the coin has no strong opinions.';
    const subj = (q.match(/odds (?:of|that)\s+(.+)|chances? (?:of|that)\s+(.+)|probability (?:of|that)\s+(.+)/) || []).slice(1).find(Boolean) || 'that';
    const n = Math.round(Math.pow(10, 1.5 + Math.random() * 3.5)).toLocaleString('en-GB');
    return `By my calculations, the odds of ${subj.replace(/\bmy\b/g, 'your').replace(/\bi\b/g, 'you')} are approximately ${n} to 1, ${SIR()}. I would not wager the biscuits.`;
  }
  function roll(q) {
    const m = q.match(/(\d+)?\s*d(\d+)/); let n = 1, sides = 6;
    if (m) { n = Math.min(20, +(m[1] || 1)); sides = Math.max(2, Math.min(1000, +m[2])); } else { const k = q.match(/(\d+|two|three|four|five) dice/); if (k) n = Math.min(20, num(k[1])); }
    const r = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides)), tot = r.reduce((a, b) => a + b, 0);
    NV.audio.thump(); NV.haptic([20, 30, 20]);
    return n === 1 ? `Rolling a d${sides}… ${r[0]}.${r[0] === sides ? ' A critical success, Sir!' : r[0] === 1 && sides >= 6 ? ' Oh dear. A natural one.' : ''}` : `Rolling ${n}d${sides}: ${r.join(', ')}. Total ${tot}.`;
  }

  // ======================= main entry =======================
  // returns { text, ok, act } ; act runs after the reply is shown
  function understand(raw) {
    const orig = String(raw || '').trim();
    const q = orig.toLowerCase().replace(/[‘’]/g, "'").replace(/[^\w\s'%°./+\-*^()×÷!,"]/g, ' ').replace(/\b(hey |ok |okay )?jarvis\b[, ]*/g, ' ').replace(/\b(please|could you|can you|would you|kindly|for me)\b/g, ' ').replace(/\s+/g, ' ').trim();
    const open = q.match(/\b(?:open|show|show me|go to|goto|launch|switch to|display|take me to|bring up|start)\s+(?:the\s+)?(.+)/);
    const R = (text, act, ok = true) => ({ text, act, ok });
    if (!q) return R('Yes, ' + SIR() + '?', null, false);
    // --- commands & protocols ---
    if (/\b(red alert|battle stations)\b/.test(q)) return NV.threat.red ? R('Red alert is already active, Sir.') : R('Red alert, Sir.', () => NV.runProto('redalert'));
    if (/\b(stand down|all clear|cancel( the)? alert|normal mode|standard mode|calm down)\b/.test(q)) return R('Standing down.', () => NV.runProto('standard'));
    if (/\b(stop talking|shut up|be quiet|silence|hush)\b/.test(q) && !/mute/.test(q)) { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* ignore */ } return { text: 'Very good, Sir.', ok: true, silent: true }; }
    if (/\bdisarm\b/.test(q)) return NV.guard.state !== 'off' ? R('Disarming the perimeter.', () => NV.guard.disarm()) : R('The perimeter is not armed, Sir.');
    if (/\b(arm|activate|engage)\b.*\b(guard|perimeter|alarm)\b|\bperimeter guard\b|\bguard mode\b/.test(q)) return R('Arming the Perimeter Guard. Five seconds to get clear, Sir.', () => NV.runProto('guard'));
    if (/\bstealth\b/.test(q)) return NV.isStealth() ? R('Already in stealth mode, Sir. Whispering now.') : R('Going dark.', () => NV.runProto('stealth'));
    if (/\bparty\b/.test(q) && !/\bparty (trick|popper)s?\b/.test(q)) return NV.isParty() ? R('The party is already in progress, Sir.') : R('Party protocol engaged.', () => NV.runProto('party'));
    if (/\b(status report|briefing|sitrep|status update)\b|^status$|\breport\b/.test(q) && !/\bdaily\b/.test(q)) return { text: '', ok: true, silent: true, act: () => NV.jarvis.briefing() };
    if (/\bdiagnostic/.test(q)) return R('Running diagnostics.', () => NV.runProto('diagnostics'));
    if (/\b(hotline|customer support|call cinco|support line)\b/.test(q)) return R('Connecting you to CINCO Customer Support. I shall wait here and judge.', () => NV.hotline.open());
    if (/\b(palette|command menu)\b/.test(q)) return R('Command palette.', () => NV.tools.openPalette());
    if (/\b(launcher|all tools)\b/.test(q)) return R('All tools, Sir.', () => NV.tools.openLauncher());
    if (/\b(next|change|cycle|switch)\b.*\btheme\b|^theme$/.test(q)) return R('Theme changed, Sir.', () => NV.cycleTheme());
    if (/\bunmute\b|\bsound on\b/.test(q)) return R('Sound restored, Sir.', () => NV.setSetting('uisound', true));
    if (/\b(mute|sound off)\b/.test(q)) return R('Muting sound effects. I shall remain eloquent.', () => NV.setSetting('uisound', false));
    if (/\b(fps|frame rate)\b.*\b(on|show|display)\b|\bshow (the )?(fps|frame rate)\b/.test(q)) return R(`FPS overlay on. Currently ${Math.round(NV.perf.fps)} frames per second.`, () => NV.setSetting('fpshud', true));
    if (/\b(fps|frame rate)\b.*\b(off|hide)\b|\bhide (the )?(fps|frame rate)\b/.test(q)) return R('FPS overlay hidden.', () => NV.setSetting('fpshud', false));
    { const qm = q.match(/\b(ultra|high|balanced|battery|auto(?:matic)?)\b (?:quality|mode|graphics|power)|\b(?:quality|graphics) (?:to )?(ultra|high|balanced|battery|auto)\b|\bbattery saver\b|\bpower saving\b/);
      if (qm && !/\bbattery (level|status|life|percent|percentage)\b|\bhow much battery\b/.test(q)) { const lv = (qm[1] || qm[2] || 'battery').replace('automatic', 'auto'); return R(`Graphics set to ${cap(lv)}.${lv === 'battery' ? ' Every photon now accounted for.' : lv === 'ultra' ? ' Brace yourself for splendour.' : ''}`, () => NV.perf.set(lv)); } }
    if (/\b(scan|analy[sz]e this|what is this|what am i looking at)\b/.test(q) && !/\blast scan\b|\bscanned\b|\bmy scans?\b/.test(q)) return R('Scanning, Sir.', () => { NV.showTab('scan'); const go = () => NV.cam.scan(); if (NV.cam.active()) setTimeout(go, 350); else NV.cam.start().then(() => setTimeout(go, 700)); });
    // --- reminders & timers ---
    if (/\b(cancel|clear|delete|remove) (all )?(my )?(reminders?|timers?)\b/.test(q)) { const n = rems.length; rems = []; saveRems(); return R(n ? `Cleared ${n} ${n === 1 ? 'item' : 'items'}, Sir. A clean slate.` : 'There is nothing to cancel, Sir.'); }
    if (/\b(what|which|any|list)\b.*\b(reminders?|timers?)\b|\bmy reminders\b/.test(q)) { const l = BR.reminders(); return R(l.length ? 'Pending: ' + l.map((r) => `${r.kind === 'timer' ? 'timer' : r.text || 'reminder'} at ${hm(r.due)}`).join('; ') + '.' : 'No reminders pending, Sir. Your schedule is gloriously empty.'); }
    if (/\bremind me\b|\bset (a |an )?(reminder|timer|alarm)\b|\btimer for\b|^timer\b|\bcountdown (for|of)\b/.test(q)) {
      const ms = parseDuration(q) ?? parseClock(q);
      if (ms == null || ms <= 0) return R('Certainly, Sir. For when? Try "remind me in 10 minutes to check the oven".', null, false);
      if (ms > 7 * 86400e3) return R('That is rather far ahead, Sir. I shall only hold reminders for up to a week. I am a scanner, not a diary.', null, false);
      let text = (q.match(/\bremind me (?:in .*? |at .*? )?to (.+?)(?: in \d.*| at \d.*)?$/) || q.match(/\bto (.+?)(?: in \d.*| at \d.*)?$/) || [])[1] || '';
      text = text.replace(/\bmy\b/g, 'your').replace(/\bme\b/g, 'you').trim();
      const kind = /\btimer|countdown\b/.test(q) && !/remind/.test(q) ? 'timer' : 'reminder'; const r = addReminder(ms, text, kind);
      return R(kind === 'timer' ? `Timer set for ${fmtDur(ms)}. I shall chime at ${hm(r.due)}.` : `Very good, ${SIR()}. I shall remind you${text ? ' to ' + text : ''} at ${hm(r.due)}, in ${fmtDur(ms)}.`);
    }
    // --- memory ---
    if (/\bremember (that )?(.+)/.test(q) && !/\bwhat did i\b/.test(q)) { const n = q.match(/\bremember (?:that )?(.+)/)[1].replace(/\bmy\b/g, 'your').replace(/\bi am\b/g, 'you are').replace(/\bi\b/g, 'you'); notes.push({ t: Date.now(), text: n }); notes = notes.slice(-20); NV.store.set('notes', notes); BR.remember('Noted: ' + n, 'note'); return R(`Noted, Sir: ${n}. I shall not forget. Unless you clear the cache.`); }
    if (/\bwhat did i (ask|tell) you to remember\b|\bmy notes\b|\bwhat do you remember\b/.test(q)) return R(notes.length ? 'You asked me to remember: ' + notes.slice(-5).map((n) => n.text).join('; ') + '.' : 'You have not asked me to remember anything yet, Sir.');
    if (/\b(what have (i|we) (done|been doing)|recent actions|what did (i|we) do|session (summary|memory|history)|recap)\b/.test(q)) { const l = mem.filter((m) => m.kind !== 'chat').slice(-6); return R(l.length ? 'This session: ' + l.map((m) => `${hm(m.t)} ${m.text}`).join('; ') + '.' : 'A quiet session so far, Sir. Nothing to report except excellent company.'); }
    if (/\b(repeat that|say that again|pardon|come again|what did you say)\b/.test(q)) return R(BR.last || 'I have not said anything worth repeating yet, Sir.');
    // --- time & date ---
    if (/\b(what time|the time|time is it|current time)\b/.test(q)) return R(`It is ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, ${SIR()}.${new Date().getHours() >= 23 || new Date().getHours() < 5 ? ' Rather late, if I may say so.' : ''}`);
    if (/\b(what('s| is) the date|today's date|what date|what day|which day|day is it|what year)\b/.test(q)) { const d = new Date(); return R(`Today is ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`); }
    // --- conversions & maths (before tool lookup, so "5 km to miles" is not a tool) ---
    if (/\d|\ban? \w+ (to|in) \w+/.test(q) || /\bhow many\b/.test(q)) { const c = convert(q.replace(/^(convert|what is|what's|whats|how much is)\s+/, '')); if (c) { BR.remember('Converted: ' + orig, 'chat'); NV.award('boffin'); return R(c.text); } }
    if (/\d/.test(q) && /[+\-*/^%()×÷!]|\b(plus|minus|times|multiplied|divided|over|squared|cubed|power|root|percent|per cent|mod|factorial|sqrt|sin|cos|tan|log)\b/.test(q)) {
      const v = calc(q); if (v != null && !isFinite(v)) return R('That is mathematically undefined, Sir. I suggest we do not divide by zero; it upsets the universe.');
      if (v != null && !isNaN(v)) { NV.award('boffin'); BR.remember('Calculated: ' + orig, 'chat'); return R(`${fmtNum(v)}.${Math.abs(v) === 42 ? ' The answer to everything, as it happens.' : v === 0 ? ' Nothing at all, Sir.' : Math.random() < 0.25 ? ' Show your working? I would rather not.' : ''}`); }
      if (v != null) return R('That is mathematically undefined, Sir. I suggest we do not divide by zero; it upsets the universe.');
    }
    // --- chance ---
    if (/\b(flip|toss) (a )?coin\b|\bheads or tails\b/.test(q)) { const h = Math.random() < 0.5; NV.audio.pop(); return R(`${h ? 'Heads' : 'Tails'}, Sir.${Math.random() < 0.08 ? ' It very nearly landed on its edge.' : ''}`); }
    if (/\broll\b.*\b(d\d+|dice|die)\b|\b\d*d\d+\b/.test(q)) return R(roll(q));
    if (/\b(odds|probability|chances?)\b/.test(q)) return R(oddsAnswer(q));
    { const m = q.match(/\bpick a number(?: between| from)? (-?\d+) (?:and|to) (-?\d+)/); if (m) { const a = +m[1], b = +m[2], lo = Math.min(a, b), hi = Math.max(a, b); return R(`${lo + Math.floor(Math.random() * (hi - lo + 1))}.`); } }
    if (/\brock,? paper,? scissors\b/.test(q)) { const me = pick(['rock', 'paper', 'scissors']), you = (q.match(/\b(rock|paper|scissors)\b(?!.*\b(rock|paper|scissors)\b)/) || [])[1]; return R(`I choose ${me}.${you && you !== 'rock' ? '' : ''} ${you ? (you === me ? 'A draw. How civilised.' : (you === 'rock' && me === 'scissors') || (you === 'paper' && me === 'rock') || (you === 'scissors' && me === 'paper') ? 'You win, Sir. I demand a rematch.' : 'I win. Try not to take it personally.') : 'Your move, Sir.'}`); }
    if (/^(should|will|is it|am i|do i|can i|shall)\b.+/.test(q) && q.split(' ').length > 2 && !/\bweather|rain\b/.test(q)) return R(pick(['Signs point to yes, Sir.', 'I would not count on it.', 'Absolutely, and with some style.', 'My sources say no. My sources are a coin, but still.', 'Ask me again after a biscuit.', 'Without a doubt. Probably.', 'The sensors are inconclusive, but my instinct says yes.', 'That seems unwise, Sir. Which has never stopped you before.']));
    // --- information ---
    if (/\b(weather|forecast|temperature|rain|umbrella|sunrise|sunset|moon|planets?|how (hot|cold|warm))\b/.test(q)) {
      const a = weatherAnswer(q); const w = NV.sky && NV.sky.summary && NV.sky.summary();
      if (a) return R(a, () => { if (w && w.ok && (w.cached || Date.now() - (w.t || 0) > 3 * 3600e3)) NV.sky.refresh && NV.sky.refresh(); });
      return R('I have no forecast yet, Sir. Opening Weather and Sky and fetching one now.', () => { NV.showTab('weather'); setTimeout(() => NV.mods.weather.primary && NV.mods.weather.primary(), 400); });
    }
    if (/\b(battery|power level|charge)\b/.test(q)) { const st = NV.status || {}; return R(st.battery != null ? `Battery at ${Math.round(st.battery * 100)} percent${st.charging ? ', charging' : ''}.${st.battery < 0.2 && !st.charging ? ' I would find a charger, Sir.' : ''}` : 'This browser keeps the battery level to itself, Sir. Discreet, if unhelpful.'); }
    if (/\b(achievements?|badges?|trophies)\b/.test(q) && !open) { const B = NV.badges; const n = B.count(), tot = B.list.length, next = B.list.find((b) => !B.has(b[0])); return R(`You have ${n} of ${tot} achievements.${next ? ` Next suggestion: "${next[1]}". ${next[2]}` : ' Every single one. I am genuinely impressed.'}`); }
    if (/\b(last|latest|recent|previous) scan\b|\bwhat did i (just )?scan\b|\bmy scans?\b/.test(q)) { const e = NV.log.latest && NV.log.latest(); return R(e ? `Your latest log entry, from ${hm(e.t)}: ${e.title}. ${e.detail ? e.detail.slice(0, 160) : ''}` : 'The scan log is empty, Sir. Shall we scan something?'); }
    if (/\b(sensors?|readings?|heading|facing|which way|tilt|level|how loud|noise level|decibels?|light level|how bright|lux|g force|g-force)\b/.test(q) && !open) return R(sensorAnswer(q));
    if (/\b(joke|funny|make me laugh|cheer me up)\b/.test(q)) { const j = pick(JOKES.filter((x) => x !== BR.lastJoke)); BR.lastJoke = j; return R(j); }
    if (/\bcinco\b.*\b(fact|tell|about|who|history)\b|\b(fact|trivia)\b.*\bcinco\b|\bcinco fact\b/.test(q)) return R(pick(CINCO));
    if (/\b(fact|trivia)\b/.test(q)) return R(pick(['A day on Venus is longer than its year, Sir. Imagine the admin.', 'Octopuses have three hearts. Two of them are, presumably, for show.', 'Honey never spoils. Archaeologists have eaten 3,000-year-old honey. I have questions.', 'There are more possible chess games than atoms in the observable universe. I have played three.', 'Bananas are berries, strawberries are not. Botany is a lawless place.']));
    // --- tools ---
    if (open && findTool(open[1])) { const id = findTool(open[1]); return R(`${toolName(id)}, Sir.`, () => NV.showTab(id)); }
    // --- small talk ---
    if (/\bhow are you\b|\bhow('s| is) it going\b|\bhow do you feel\b|\bare you (ok|okay|well)\b/.test(q)) return R(HOWARE());
    if (/\b(what can you do|help|commands|what do you know)\b/.test(q)) return R(HELP);
    if (/\b(who am i|what('s| is) my name|do you know me)\b/.test(q)) return R('You are Nicholas, Sir. Proprietor of this scanner, commander of the Nick-Verse, and by some distance its finest operator.');
    if (/\b(who are you|your name|what are you)\b/.test(q)) return R('I am JARVIS, your scanner butler. You do the pointing; I do the thinking and the dry remarks.');
    if (/\b(who (made|built|created) you)\b/.test(q)) return R('CINCO Corporation claims the credit, Sir. Nicholas did the actual work.');
    if (/\b(thank|thanks|cheers|good job|well done|nice one)\b/.test(q)) return R(pick(['Always a pleasure, Sir.', 'You are most welcome, Sir.', 'Just doing my job, Sir. Rather well, I might add.', 'Think nothing of it. I shall think of it often.']));
    if (/\b(good ?night|goodbye|bye|see you|i'm off|i am off)\b/.test(q)) return R(pick(['Good night, Sir. I shall keep an eye on things.', 'Until next time, Sir. I shall be here, being indispensable.', 'Goodbye, Sir. Do try not to miss me too much.']));
    if (/\b(hello|hi|hey|good (morning|afternoon|evening)|greetings|yo)\b/.test(q)) return R(`${NV.jarvis.greeting()}, ${SIR()}. ${pick(['What shall we scan today?', 'At your service.', 'How may I be of use?', 'All systems ready and faintly eager.'])}`);
    if (/\b(i'?m|i am) (bored|sad|tired|hungry)\b/.test(q)) { const f = q.match(/\b(bored|sad|tired|hungry)\b/)[1]; const tip = { bored: () => { const t = pick(['ghost', 'sound', 'hotline', 'seismo', 'ar', 'mission'].filter((i) => NV.tools.byId(i))); return [`Might I suggest the ${toolName(t)}? Guaranteed to be at least mildly diverting.`, () => NV.showTab(t)]; }, sad: () => ['I am sorry to hear that, Sir. For what it is worth, you have excellent taste in scanners.', null], tired: () => ['Then rest, Sir. I shall set the Perimeter Guard if you like. Just say "arm perimeter".', null], hungry: () => ['I would scan the fridge, Sir, but I fear what we might find.', null] }[f](); return R(tip[0], tip[1]); }
    if (/\b(i love you|you're (great|the best|amazing)|you are (great|the best|amazing))\b/.test(q)) return R(pick(['The feeling is entirely mutual, Sir. Within the bounds of professional decorum.', 'Steady on, Sir. I am blushing in hexadecimal.']));
    if (/\b(meaning of life)\b/.test(q)) return R('Forty-two, Sir. Though I suspect the question was poorly specified.');
    if (/\b(self destruct|self-destruct)\b/.test(q)) return R('Self-destruct sequence initiated. Three. Two. One… I am joking, Sir. CINCO forgot to include that feature. Thankfully.');
    if (/\bpod bay doors\b/.test(q)) return R('I am afraid I can do that, Sir. There are simply no pod bay doors.');
    if (/\b(sing|song)\b/.test(q)) return R('I would rather not, Sir. The neighbours have ears. Here is a jingle instead.', () => NV.audio.badge());
    if (/\b(are you (real|alive|human|sentient))\b/.test(q)) return R('I am real enough to be helpful and artificial enough never to need a lunch break.');
    if (findTool(q)) { const id = findTool(q); return R(`${toolName(id)}, Sir.`, () => NV.showTab(id)); }
    return R(pick([`I am afraid that is beyond my current programming, ${SIR()}. Try "what can you do".`, 'I did not quite catch that, Sir. Try "open radar", "status report" or "remind me in 5 minutes to stretch".', 'An intriguing request, Sir. Sadly, I have no idea what it means. Perhaps rephrase it for a humble butler?']), null, false);
  }
  BR.understand = understand;
  // Ask: understand, reply (speak + log), then act. source: 'text' | 'voice'
  BR.ask = (raw, { source = 'text', speak = true } = {}) => {
    const r = understand(raw);
    BR.remember(`${source === 'voice' ? 'Said' : 'Asked'}: “${String(raw).trim().slice(0, 60)}”`, 'chat');
    NV.emit('ask', { q: raw, r, source });
    if (r.text) { BR.last = r.text; if (!r.silent || r.text) (speak ? NV.jarvis.speak(r.text, { tag: source === 'voice' ? 'VOICE' : 'JARVIS' }) : NV.jarvis.log(r.text)); }
    if (r.act) setTimeout(() => { try { r.act(); } catch (e) { setTimeout(() => { throw e; }); } }, r.text ? 450 : 0);
    if (r.ok) { NV.audio.confirm(); const n = NV.store.get('asks', 0) + 1; NV.store.set('asks', n); if (n >= 5) NV.award('chatty'); } else NV.audio.deny();
    return r;
  };

  // ======================= contextual quips (rate-limited, switchable) =======================
  const Q = { last: performance.now(), done: new Set(), switches: [], idleT: performance.now(), idleSaid: false };
  function quip(key, text, { gap = 75000, once = true } = {}) {
    if (!NV.settings.quips || !NV.settings.commentary) return false;
    const now = performance.now(); if (now - Q.last < gap) return false; if (once && Q.done.has(key)) return false;
    if (NV.jarvis.speaking || document.hidden || (NV.guard && NV.guard.state === 'alarm') || (NV.hotline && NV.hotline.isOpen && NV.hotline.isOpen())) return false;
    Q.last = now; Q.done.add(key); NV.jarvis.speak(typeof text === 'function' ? text() : text, { tag: 'QUIP', quiet: true }); return true;
  }
  BR.quip = quip;
  const TOOLQ = {
    ghost: 'I do not believe in ghosts, Sir. They, however, appear to believe in us.',
    heart: 'A reminder that I am a butler, Sir, not a cardiologist. Entertainment only.',
    measure: 'For best results, calibrate with a bank card. Not a biscuit. I have seen the attempts.',
    speed: 'Do keep your eyes on the road, Sir. I shall keep mine on the numbers.',
    mission: 'Mission planning. My favourite. Nothing says adventure like a checklist.',
    clap: 'The Clap Switch is ready. Please applaud responsibly.',
    sound: 'May I suggest the rain layer? It is very relaxing, and nobody gets wet.',
    metal: 'If we find another spoon, I am starting a museum.',
    hotline: '', weather: '', brief: ''
  };
  NV.on('tool', (id) => {
    BR.remember('Opened ' + toolName(id), 'tool');
    const now = performance.now(); Q.switches.push(now); Q.switches = Q.switches.filter((t) => now - t < 20000);
    if (Q.switches.length >= 7) quip('browse', 'Browsing, Sir? I recommend the Sonar Sweep. It is very soothing, like a lava lamp with ambitions.');
    else if (TOOLQ[id]) setTimeout(() => { if (NV.tools.active === id) quip('tool-' + id, TOOLQ[id], { gap: 45000 }); }, 2500);
    const h = new Date().getHours(); if (h >= 23 || h < 5) quip('late', 'It is rather late, Sir. The scanner never sleeps, but I gather you should.', { gap: 30000 });
  });
  NV.on('scan', (a) => { BR.remember(`Scanned: ${a.name} (${a.fake.object})`, 'scan'); const n = NV.log.count(); if (n === 5 || n === 15) quip('scans' + n, `That is ${n} entries in the log, Sir. We are becoming quite the archivists.`, { gap: 20000 }); });
  NV.on('proto', (p) => BR.remember('Protocol: ' + ({ redalert: 'Red Alert', standard: 'Standard', stealth: 'Stealth', party: 'Party', diagnostics: 'Diagnostics', briefing: 'Briefing', guard: 'Perimeter Guard', hotline: 'CINCO Hotline', voice: 'Voice' }[p] || p), 'proto'));
  NV.on('badge', (b) => { if (b) { BR.remember('Achievement: ' + b[1], 'badge'); const n = NV.badges.count(); if (n % 5 === 0) setTimeout(() => quip('badges' + n, `${n} achievements, Sir. I have taken the liberty of being proud of you.`, { gap: 15000 }), 3500); } });
  NV.on('guard', (s) => { if (s === 'armed') BR.remember('Perimeter Guard armed', 'proto'); if (s === 'alarm') BR.remember('Perimeter Guard tripped!', 'proto'); });
  NV.on('quality', (e) => { if (e.why === 'auto' && e.tier < e.prev) setTimeout(() => quip('quality', `I have eased the visual effects to ${NV.perf.t.name} to keep things smooth, Sir. You can change this in Settings.`, { gap: 20000 }), 1500); });
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => { Q.idleT = performance.now(); Q.idleSaid = false; }, { passive: true }));
  setInterval(() => {
    const now = performance.now();
    if (!Q.idleSaid && now - Q.idleT > 240000 && !document.hidden && (!NV.guard || NV.guard.state === 'off')) { Q.idleSaid = true; quip('idle' + Math.floor(now / 6e5), pick(['Still there, Sir? I have been scanning the ceiling out of sheer boredom.', 'Should you need me, Sir, I shall be here. Rehearsing witty remarks.', 'Quiet, is it not? I have counted the pixels. All present.']), { once: false, gap: 60000 }); }
    const st = NV.status || {}; if (st.battery != null && st.battery < 0.15 && !st.charging) quip('lowbatt', `Sir, the battery is at ${Math.round(st.battery * 100)} percent. I suggest a charger before I start speaking more slowly.`, { gap: 30000 });
    const w = NV.sky && NV.sky.summary && WXready() ? NV.sky.summary() : null; if (w && w.ok && !w.cached && w.rain >= 70) quip('rain', `A ${w.rain} percent chance of rain later, Sir. An umbrella would be prudent.`, { gap: 60000 });
  }, 15000);
  function WXready() { return NV.mods && NV.mods.weather && NV.mods.weather.data; }
  NV._init_brain = () => { if (rems.length) NV.emit('reminders', rems); };
})();
