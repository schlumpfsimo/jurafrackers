/* Jurafrackers 2.0 — the game: time in days and money by the month, the header, pop-up windows at buildings, vehicles on the
   roads, the start (the concession, the company car, the Bureau) and placing things on the ground. Later parts (geology,
   the valley, financing) plug in through G.on(...) and G.windows. Money is kept in thousands of francs. */
(function(){
'use strict';
const $ = s => document.querySelector(s), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a)*t;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
const CFG = {MONTH_SEC:40, DAYS:30, START_CASH:30000, SHARES:3000, START_YEAR:2027, END:120, SAVE:'jurafrackers2', V:2};   // V: the save format and the valley generator (an older save would come back in another valley)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COMPANY = 'Énergie-Géo Switzerland SA', ASSOC = 'Géothermie-Helvetica', PAPER = 'La Feuille de la Faille';
const fmt = k => { const a = Math.abs(k); if (a < 0.5) return 'CHF 0'; return (k < 0 ? '−' : '') + 'CHF ' + (a >= 1000 ? (a/1000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/, '') + ' M' : Math.round(a) + 'k'); };
const fmtNum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '’');
// invented names only
const TOWN_N = ['Grand-Fracas','Montchaleur','Bourg-Granit','Porte-Vapeur','Val-Fumant','Roche-Brûlée','Saint-Calorie','Bourg-Basalte','Pierre-Chaude','Fond-de-Faille','Haut-Magma','Villars-Vapeur','Clos-Gneiss','Rive-Bouillante','Saint-Sondeur','Mont-Foreur','Belle-Faille','Fontaine-Chaude','Champ-Thermal','Bas-Calcaire','Grande-Strate','Malmont','Doggerville','Cuvette-Chaude','Puits-Profond','Bourg-Tubage','Roche-Fendue','Port-Pression','Val-Sismique','Mont-Richter','Saint-Carottier','Les Geysers','Chaux-Brûlante','Haute-Pression','Saint-Trépan','Mont-Soufre','Val-Granitique','Grand-Trépan','Pré-Fumerolle','Bourg-Saumure','Combe-Chaude','Les Fissures','Roche-Moutonnée','Val-Anhydrite','Mont-Muschel','Saint-Gypse','Combe-Brasier','Mont-Étuve','Val-Tisane','Saint-Radiateur','Clos-Thermos','Bourg-Bouilloire','Pont-Vapeur','Les Étuves'];
const VIL_N = ['Les Trois-Sapins','Pré-Prunier','Bois-Fumé','Vache-Haute','Saint-Forage','Petit-Fracas','Roche-Tiède','Sous-la-Faille','Fontaine-Brune','Champ-Vibreur','Mont-Tiède','Les Bouillottes','Clos-Fondu','Combe-Tonnerre','Val-Grelottant','Pied-de-Puits'];
const FIRST = ['Marcel','Josiane','Gérard','Lucienne','Raymond','Odile','Bernard','Mireille','Jean-Pierre','Colette','Fernand','Ginette','Hubert','Simone','Laurent','Nadine','René','Yvette','Patrice','Agnès','Denis','Monique','Alain','Huguette','Claude','Sylvie','Roger','Paulette','Thierry','Chantal','Didier','Brigitte','Pascal','Martine','Yves','Nicole','Olivier','Isabelle','Christophe','Sandrine','Nicolas','Valérie','Julien','Céline','Mathieu','Aurélie','Sébastien','Laetitia','Luca','Elena','Marco','Giulia','Ardit','Arta','Mehmet','Ayşe','João','Ana','Kevin','Jessica','Loïc','Mélanie','Fabrice','Nathalie','Grégory','Stéphanie','Joël','Corinne','Damien','Émilie'];
const LAST = ['Froidevache','Grosjean','Tièche','Boillat','Chapatte','Vuilleumier','Montavon','Rérat','Stadelmann','Cerf','Sautebin','Fleury','Gigandet','Beuchat','Juillerat','Maître','Hêche','Nussbaumer','Rossé','Comment','Chételat','Willemin','Frund','Girardin','Queloz','Varin','Schaller','Membrez','Crevoisier','Joliat','Riat','Bourquard','Hulmann','Jobin','Prêtre','Voirol','Paupe','Erard','Cuenat','Schindelholz','Saucy','Theurillat','Lachat','Seuret','Charmillot','Bandelier','Wermeille','Choffat','Gerber','Koller','Steullet','Gogniat','Lovis','Rebetez','Ferreira','Da Silva','Rossi','Berisha','Yilmaz','Marchand','Gindrat','Kohler','Bilat','Bouverat','Maillard','Noirjean','Pheulpin','Vallat','Wicht','Zuber'];
// ---- the game object every part plugs into
const G = globalThis.G = {CFG, fmt, fmtNum, esc, clamp, lerp, MONTHS, COMPANY, ASSOC, PAPER, TOWN_N, VIL_N, hooks:{}, windows:{}, monthly:[], S:null, world:null, R:null};
G.on = (ev, fn) => (G.hooks[ev] = G.hooks[ev] || []).push(fn);
G.emit = (ev, ...a) => { for (const fn of G.hooks[ev] || []) fn(...a); };
// ---- the calendar: days inside, months on screen
const month = () => Math.floor(G.S.day/CFG.DAYS), dateStr = d => { const m = Math.floor(d/CFG.DAYS); return MONTHS[m % 12] + ' ' + (CFG.START_YEAR + Math.floor(m/12)); };
G.month = month; G.dateStr = dateStr; G.monthsLeft = () => Math.max(0, CFG.END - month());
G.dur = days => days < 10 ? Math.max(1, Math.round(days)) + (Math.round(days) === 1 ? ' day' : ' days') : days < 45 ? Math.round(days/7) + ' weeks' : Math.round(days/30) + ' months';
// ---- state
function newState(seed){ return {v:CFG.V, seed, day:0, speed:1, paused:false, cash:CFG.START_CASH, shares:CFG.SHARES, price:10, priceHist:[10], debt:0, loans:[], grants:[], contracts:[],
  ledger:{cur:{}, last:{}, hist:[]}, news:[], phase:'drive', staff:[], staffN:0, vehicles:[], vehN:0, company:[], compN:0, changes:[], tips:{}, marks:[], heat:0, power:0, fc:[38, 52], names:null, flags:{}}; }
// ---- names of the town, the villages and their buildings (from the seed)
function nameValley(){ const r = ART.KIT.rng(G.S.seed + 99), pick = a => a[Math.floor(r()*a.length)], used = new Set(), uniq = a => { for (let i = 0; i < 50; i++){ const n = pick(a); if (!used.has(n)){ used.add(n); return n; } } return pick(a); };
  G.S.names = {town:uniq(TOWN_N), villages:G.world.villages.map(() => uniq(VIL_N))}; }
const placeName = h => h === 'town' ? G.S.names.town : h === null || h === undefined ? null : G.S.names.villages[h];
G.placeName = placeName;
const ROLE = {mairie:'Mairie', church:'Church', shop:'Village shop', bank:'Bank', newspaper:PAPER, police:'Gendarmerie', canton:'Canton house', bourse:'Bourse du Jura', school:'School', committee:'Committee office', utility:'Utility office', substation:'Substation', station:'Railway station', fountain:'Fountain', farm:'Farm', villa:'Villa', house:'House'};
G.buildingTitle = b => { const pn = placeName(b.home), base = b.name === 'Chapel' ? 'Chapel' : b.role === 'shop' ? (b.home === 'town' ? 'Épicerie' : 'Village shop') : ROLE[b.role] || b.name;
  if (b.role === 'house') return 'A house in ' + (pn || 'the valley'); if (b.role === 'farm') return b.farmName || 'A farm'; if (b.role === 'villa') return 'The villa on the hill'; if (b.role === 'mairie') return 'Mairie de ' + pn;
  if (['bank', 'newspaper', 'canton', 'bourse', 'committee', 'utility', 'substation', 'station'].includes(b.role)) return base; return base + (pn ? ', ' + pn : ''); };
// ---- money: one-off payments are booked at once; monthly items are booked at the end of each month, prorated live in the header
G.book = (line, k, who) => { G.S.cash += k; const L = G.S.ledger.cur, key = line + (who ? ' (' + who + ')' : ''); L[key] = (L[key] || 0) + k; };
G.canPay = k => G.S.cash >= k;
G.pay = (k, line, who) => { if (!G.canPay(k)) return false; G.book(line, -k, who); return true; };
const monthlyLines = () => { const out = []; for (const f of G.monthly) for (const l of f() || []) if (l && l.k) out.push(l); return out; };
G.monthly.push(() => G.S.company.filter(c => c.done && c.upkeep).map(c => ({line:c.acc || 'Upkeep', who:c.title, k:-c.upkeep, at:c.id})));
G.monthly.push(() => { const by = {}; for (const p of G.S.staff) if (p.st !== 'leaving' || true){ const wage = (TRADES[p.tr] || {wage:12}).wage; by[p.tr] = (by[p.tr] || 0) + wage; } return Object.keys(by).map(tr => ({line:'Salaries: ' + TRADES[tr].pl.toLowerCase(), who:'Bureau', k:-by[tr], at:'bureau'})); });
G.monthly.push(() => G.S.started ? [{line:'Membership', who:ASSOC, k:-(G.S.tierFee || 5), at:'maison'}, {line:'The CEO', who:'Bureau', k:-22, at:'bureau'}] : []);
function closeMonth(){ const S = G.S; for (const l of monthlyLines()) G.book(l.line, l.k, l.who);
  S.ledger.last = S.ledger.cur; S.ledger.hist.push({m:month() - 1, lines:S.ledger.cur, cash:S.cash}); if (S.ledger.hist.length > 24) S.ledger.hist.shift(); S.ledger.cur = {};
  const gone = S.staff.filter(p => p.st === 'leaving'); if (gone.length){ S.staff = S.staff.filter(p => p.st !== 'leaving'); G.moodAll && G.moodAll(-0.2*gone.length, 'Jobs lost at the Company', 'le'); }
  G.emit('month', month()); save(); }
const liveNet = () => { const S = G.S, frac = (S.day % CFG.DAYS)/CFG.DAYS, oneOff = Object.values(S.ledger.cur).reduce((a, b) => a + b, 0), rate = monthlyLines().reduce((a, l) => a + l.k, 0); return oneOff + rate*frac; };
// ---- staff
const TRADES = G.TRADES = {
  driller:{n:'Driller', pl:'Drillers', wage:12, h:'A rig crew needs three for a light rig, five for a deep rig.'},
  geologist:{n:'Geologist', pl:'Geologists', wage:16, h:'Reads the cuttings: warns before salt and faults. Plants prospect flags.'},
  mudeng:{n:'Mud engineer', pl:'Mud engineers', wage:15, h:'Fewer mud losses and gas kicks.'},
  cementer:{n:'Cementer', pl:'Cementers', wage:14, h:'Casing cemented properly: far fewer gaps behind the steel.'},
  water:{n:'Water officer', pl:'Water officers', wage:13, h:'Samples every spring; small traces are caught before anyone notices.'},
  liaison:{n:'Community liaison', pl:'Community liaisons', wage:12, h:'Coffee with the neighbours of a site. The village nearby warms a little.'},
  security:{n:'Security', pl:'Security guards', wage:10, h:'A guard at the gate: a camp needs twice as long to burn a site.'},
  suit:{n:'Suit', pl:'Suits', wage:15, req:'maison', h:'Lent by the association. Goes to a village, a mairie or the gendarmerie.'},
  seismo:{n:'Seismologist', pl:'Seismologists', wage:18, req:'university', h:'Reads the seismometers during stimulation: the traffic light works only with one on the site.'},
  operator:{n:'Plant operator', pl:'Plant operators', wage:14, h:'A power plant runs only with two.'}};
const personName = fem => { for (let i = 0; i < 80; i++){ const k = Math.floor(Math.random()*FIRST.length); if ((k % 2 === 1) !== !!fem) continue; const n = FIRST[k] + ' ' + LAST[Math.floor(Math.random()*LAST.length)]; if (!G.S.staff.some(p => p.name === n)) return n; } return 'Staff ' + (G.S.staffN + 1); };
G.personName = fem => personName(fem);
G.hire = (tr, quiet) => { const T = TRADES[tr]; const fem = Math.random() < 0.6, p = {id:++G.S.staffN, f:fem, name:tr === 'suit' ? 'Suit no. ' + (G.S.suitN = (G.S.suitN || 0) + 1) : personName(fem), tr, st:'idle', certs:[], since:G.S.day}; G.S.staff.push(p); if (!quiet) G.news(T.n + ' hired: ' + p.name + '.'); return p; };
G.pron = p => p.tr === 'suit' ? 'they' : p.f ? 'she' : 'he';
// ---- news (La Feuille de la Faille and the wire)
G.news = (text, o) => { o = o || {}; G.S.news.unshift({d:G.S.day, t:text, paper:!!o.paper}); if (G.S.news.length > 120) G.S.news.pop(); if (!o.quiet) G.toast(text.length > 110 ? text.slice(0, 107) + '…' : text, 4200); };
let toastT = 0; G.toast = (t, ms) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), ms || 2600); };
// ---- the header: information only. Clicking it opens the expanded header, which pauses the game.
let hdrLogo = null;
function header(){ const S = G.S, h = $('#hdr'); if (!S){ h.innerHTML = ''; return; } if (!hdrLogo){ hdrLogo = ART.logos.word(1); }
  const net = liveNet(), mv = S.price*S.shares, fc = S.fc;
  h.innerHTML = '<div class="logo"></div>' +
    f('Cash', fmt(S.cash), S.cash < 0 ? 'neg' : '') + f('Share price', 'CHF ' + S.price.toFixed(2), '', 'opt') + f('Market value', fmt(mv), '', 'opt') + f('Debt', fmt(S.debt), '', 'opt') +
    '<div class="f live"><span>This month</span><b class="' + (net < 0 ? 'neg' : 'pos') + '">' + (net < 0 ? '−' : '+') + 'CHF ' + fmtNum(Math.abs(net)*1000) + '</b></div>' +
    f('Heat · power', Math.round(S.heat) + ' · ' + Math.round(S.power) + ' MWh', '', 'opt') + f(dateStr(S.day), G.monthsLeft() + (innerWidth < 520 ? ' mo. left' : ' months to the vote')) +
    '<div class="f opt"><span>Vote forecast</span><div class="band"><i style="left:' + fc[0] + '%;right:' + (100 - fc[1]) + '%"></i><em></em></div></div>' +
    '<div class="f grow"></div><div class="more">' + ($('#hdrx').classList.contains('open') ? '▲ close' : '▼ details') + '</div>';
  h.firstChild.appendChild(hdrLogo); hdrLogo.style.height = innerWidth < 520 ? '16px' : '26px'; hdrLogo.style.width = 'auto'; }
const f = (lab, val, cls, opt) => '<div class="f ' + (opt || '') + '"><span>' + lab + '</span><b class="' + (cls || '') + '">' + val + '</b></div>';
function headerX(){ const S = G.S, x = $('#hdrx'); if (!x.classList.contains('open')) return;
  const lines = monthlyLines(), cur = S.ledger.cur, last = S.ledger.last;
  const row = (name, k, at) => '<tr' + (at ? ' class="click" data-at="' + at + '"' : '') + '><td>' + esc(name) + '</td><td class="n ' + (k < 0 ? 'neg' : 'pos') + '">' + fmt(k) + '</td></tr>';
  let html = '<div class="paused">Paused while this is open.</div><div class="cols">';
  html += '<div><h3>Every month</h3><table class="lines">' + lines.map(l => row(l.line + (l.who ? ' (' + l.who + ')' : ''), l.k, l.at)).join('') + '<tr class="tot"><td>Net, every month</td><td class="n">' + fmt(lines.reduce((a, l) => a + l.k, 0)) + '</td></tr></table>';
  const one = Object.entries(cur); if (one.length) html += '<h3 style="margin-top:12px">This month so far</h3><table class="lines">' + one.map(([n, k]) => row(n, k)).join('') + '</table>';
  const lo = Object.entries(last); if (lo.length) html += '<h3 style="margin-top:12px">Last month</h3><table class="lines">' + lo.map(([n, k]) => row(n, k)).join('') + '<tr class="tot"><td>Net</td><td class="n">' + fmt(lo.reduce((a, [, k]) => a + k, 0)) + '</td></tr></table>';
  html += '</div><div><h3>Loans, grants and contracts</h3>' + (S.loans.length || S.grants.length || S.contracts.length ? G.emitHtml('finance') : '<p class="muted">None yet.</p>') + '<h3 style="margin-top:12px">Shares</h3>' + sharesChart() + '</div>';
  html += '<div class="news"><h3>News</h3>' + (S.news.length ? S.news.slice(0, 40).map(n => '<p><i>' + dateStr(n.d) + '</i>' + esc(n.t) + '</p>').join('') : '<p class="muted">Nothing yet.</p>') + '</div></div>';
  x.innerHTML = html; }
G.emitHtml = (ev, ...a) => (G.hooks['html:' + ev] || []).map(fn => fn(...a)).join('');
function sharesChart(){ const h = G.S.priceHist, w = 280, hh = 70, mx = Math.max(...h) * 1.1, mn = Math.min(...h)*0.9; const pts = h.map((v, i) => (i/(Math.max(1, h.length - 1))*w).toFixed(1) + ',' + (hh - (v - mn)/(mx - mn || 1)*hh).toFixed(1)).join(' ');
  return '<svg width="' + w + '" height="' + (hh + 14) + '" style="display:block"><polyline points="' + pts + '" fill="none" stroke="#2c5f93" stroke-width="1.5"/><text x="0" y="' + (hh + 12) + '" font-size="10" fill="#6f6a60">' + G.S.shares + 'k shares · CHF ' + G.S.price.toFixed(2) + '</text></svg>'; }
$('#hdr').addEventListener('click', () => { const x = $('#hdrx'); x.classList.toggle('open'); G.S && (G.S.hdrPause = x.classList.contains('open')); headerX(); header(); });
$('#hdrx').addEventListener('click', e => { const tr = e.target.closest('tr.click'); if (!tr) return; const at = tr.dataset.at; $('#hdrx').classList.remove('open'); G.S.hdrPause = false; header(); G.focus(at); });
// ---- pop-up windows: one per thing, opened at the thing on the map; the body is drawn again when the game changes
const WINS = new Map();
G.openWin = (key, def) => { let w = WINS.get(key); if (!w){ const el = document.createElement('div'); el.className = 'win' + (def.wide ? ' wide' : '') + (def.xwide ? ' xwide' : ''); $('#wins').appendChild(el); w = {key, el, def, tab:def.tab || 0, placed:false}; WINS.set(key, w);
    el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('wheel', e => e.stopPropagation());
    el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled){ const fn = (w.acts && w.acts[b.dataset.a]) || (G.globalActs || {})[b.dataset.a]; if (fn){ const r = fn(b.dataset.v, b); if (typeof r === 'string' && r !== 'ok') G.toast(r); G.refresh(); } } const t = e.target.closest('[data-tab]'); if (t){ w.tab = +t.dataset.tab; draw(w); } if (e.target.closest('.x')) G.closeWin(key); });
    dragWin(w); } else w.def = def;
  for (const [k, o] of WINS) if (k !== key && !o.def.keep && !def.keep && WINS.size > 3) G.closeWin(k);
  draw(w); if (!w.placed) placeWin(w); w.el.style.zIndex = ++zTop; return w; };
let zTop = 1;
const draw = w => { const d = w.def, acts = {}; const A = (name, fn) => { acts[name] = fn; return name; }; let body = ''; try { body = d.body(A, w) || ''; } catch (e){ body = '<p class="neg">' + esc(e.message) + '</p>'; console.error(e); }
  const tabs = d.tabs ? '<div class="tabs">' + d.tabs.map((t, i) => '<b data-tab="' + i + '" class="' + (i === w.tab ? 'on' : '') + '">' + t + '</b>').join('') + '</div>' : '';
  w.acts = acts; w.el.innerHTML = '<div class="tb"><div class="t">' + esc(typeof d.title === 'function' ? d.title() : d.title) + (d.sub ? '<small>' + esc(typeof d.sub === 'function' ? d.sub() : d.sub) + '</small>' : '') + '</div><button class="x">×</button></div><div class="bd">' + tabs + body + '</div>'; };
const placeWin = w => { w.placed = true; const at = w.def.at && w.def.at(); let x = innerWidth/2 - 170, y = 70; if (at){ const [sx, sy] = G.R.toScreen(at[0], at[1], at[2]); x = sx + 40; y = sy - 120; if (x + w.el.offsetWidth > innerWidth - 8) x = sx - w.el.offsetWidth - 40; }
  x = clamp(x, 8, innerWidth - w.el.offsetWidth - 8); y = clamp(y, 54, innerHeight - w.el.offsetHeight - 8); w.el.style.left = x + 'px'; w.el.style.top = y + 'px'; };
const dragWin = w => { let d = null; w.el.addEventListener('pointerdown', e => { if (!e.target.closest('.tb') || e.target.closest('.x')) return; d = [e.clientX - w.el.offsetLeft, e.clientY - w.el.offsetTop]; w.el.setPointerCapture(e.pointerId); w.el.style.zIndex = ++zTop; });
  w.el.addEventListener('pointermove', e => { if (d){ w.el.style.left = clamp(e.clientX - d[0], 0, innerWidth - 60) + 'px'; w.el.style.top = clamp(e.clientY - d[1], 46, innerHeight - 30) + 'px'; } }); w.el.addEventListener('pointerup', () => d = null); };
G.closeWin = key => { const w = WINS.get(key); if (w){ w.el.remove(); WINS.delete(key); if (w.def.onClose) w.def.onClose(); } };
G.closeAll = () => { for (const k of [...WINS.keys()]) G.closeWin(k); };
G.refresh = () => { for (const w of WINS.values()){ const scr = w.el.querySelector('.bd') ? w.el.querySelector('.bd').scrollTop : 0; draw(w); const bd = w.el.querySelector('.bd'); if (bd) bd.scrollTop = scr; } header(); headerX(); };
G.isOpen = key => WINS.has(key);
// a building's window: its own content from the part of the game that owns that kind of place
G.openBuilding = b => { const role = b.role, key = 'b' + b.id, def = G.windows[role] || G.windows.default;
  G.openWin(key, Object.assign({title:() => G.buildingTitle(b), sub:() => placeName(b.home) ? (b.home === 'town' ? 'in town' : 'village of ' + placeName(b.home)) : '', at:() => [b.cx, b.cy, b.z + (b.zt || 6)]}, def(b))); tip(role); };
const TIPS = {};
G.tipText = (role, text) => TIPS[role] = text;
const tip = role => { if (!TIPS[role] || G.S.tips[role]) return; G.S.tips[role] = 1; };
G.tipFor = role => TIPS[role] && G.S.tips[role] === 1 ? (G.S.tips[role] = 2, '<div class="tip">' + TIPS[role] + '</div>') : '';
G.windows.default = b => ({body:() => '<p>' + esc(DESCR[b.role] || 'People live here.') + '</p>' + G.emitHtml('building:' + b.role) });
const DESCR = {house:'Somebody lives here. They will have an opinion.', farm:'Cows, a tractor, the smell of manure. The farmer counts every truck that passes.', fountain:'The town’s fountain. The water comes from the spring above the town.',
  station:'Trains to the capital every hour, to the other villages twice a day.', substation:'Transformers humming behind a fence. Power from a plant would join the grid here.', church:'The bells ring on the hour.', school:'Children, a playground, a headteacher with views.'};
G.DESCR = DESCR;
// ---- vehicles: drive along the roads (then across the fields to the last point); speed in metres per day
const VSPEED = {car:15, pickup:14, lorry:10, lowloader:7, bus:12, van:14, vibro:45, offroad:40};   // metres per game day: a car at 1x is a brisk drive, not a dart
G.vehicle = (model, from, to, o) => { o = o || {}; const W = G.world, road = W.route(from, to, !!o.tracks); let pts = road ? road.slice() : [from.slice(0, 2), to.slice(0, 2)];
  if (road){ if (Math.hypot(pts[0][0] - from[0], pts[0][1] - from[1]) > 1) pts.unshift(from.slice(0, 2)); if (Math.hypot(pts[pts.length - 1][0] - to[0], pts[pts.length - 1][1] - to[1]) > 1) pts.push(to.slice(0, 2)); }
  const v = {id:++G.S.vehN, model, pts, s:0, speed:o.speed || VSPEED[o.kind || 'car'] || 70, kind:o.kind || 'car', done:o.done || null, arg:o.arg ?? null, name:o.name || null, keep:!!o.keep, tag:o.tag || null}; v.len = pathLen(pts); G.S.vehicles.push(v); return v; };
const pathLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const along = (pts, s) => { for (let i = 1; i < pts.length; i++){ const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= L || i === pts.length - 1){ const t = L ? clamp(s/L, 0, 1) : 1; return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t), pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; } s -= L; } const p = pts[pts.length - 1]; return [p[0], p[1], 1, 0]; };
G.vehPos = v => along(v.pts, v.s);
const DONE = G.vehicleDone = {};
function moveVehicles(dd){ for (const v of G.S.vehicles.slice()){ if (v.s >= v.len){ continue; } if (v.s >= 0 && G.hold && G.hold(v, dd)) continue; v.s = Math.min(v.len, v.s + v.speed*dd); if (v.s >= v.len){ const fn = DONE[v.done]; if (!v.keep) G.S.vehicles.splice(G.S.vehicles.indexOf(v), 1); if (fn) fn(v.arg, v); } } }
// ---- company buildings: placed by the player, built by the builders, then they stand on the map
const CB = G.CB = {
  bureau:{model:'Bureau', title:'Bureau', cost:300, upkeep:20, days:20, acc:'Rent and phones'},
  depot:{model:'Depot', title:'Depot', cost:0, upkeep:10, days:20, acc:'Yard and forklift'},
  maison:{model:'Maison de la géothermie', title:'Maison de la géothermie', cost:400, upkeep:30, days:60, acc:'The association’s wing'},
  centre:{model:'Centre de compétences', title:'Centre de compétences', cost:900, upkeep:40, days:90, acc:'Engineers and the lab'},
  atelier:{model:'Atelier', title:'Atelier', cost:1500, upkeep:35, days:120, acc:'Workshop and spares'}};
G.company = k => G.S.company.find(c => c.kind === k && c.done && !c.burnt);
G.companyAny = k => G.S.company.find(c => c.kind === k && !c.burnt);
const FOOTVIEW = v => v % 8 === 4;
G.footprint = (model, view) => { const m = G.world.model(model); return FOOTVIEW(view) ? [m.D, m.W] : [m.W, m.D]; };
G.addCompany = (kind, cx, cy, view, o) => { o = o || {}; const def = CB[kind], [w, d] = G.footprint(def.model, view), site = G.world.addSite(cx, cy, w + 3, d + 3, 0, {company:kind});
  const c = {id:'c' + (++G.S.compN), kind, model:def.model, title:def.title, cx, cy, view, z:site.z, upkeep:def.upkeep, acc:def.acc, done:!!o.done, ready:G.S.day + (o.done ? 0 : def.days), site:{cx, cy, w:w + 3, d:d + 3}};
  G.S.company.push(c); G.S.changes.push({t:'site', cx, cy, w:w + 3, d:d + 3, a:0, company:kind}); showCompany(c); return c; };
const showCompany = c => { const m = G.world.model(c.model); if (c.stat) G.R.removeStatic(c.stat); if (c.dyn){ const i = G.R.dyn.indexOf(c.dyn); if (i >= 0) G.R.dyn.splice(i, 1); c.dyn = null; }
  if (c.done) c.stat = G.R.addStatic({kind:'c', ref:c, m, x:c.cx, y:c.cy, z:c.z, view:c.view, noPad:true, pickable:true});
  else { c.dyn = {m, view:c.view, x:c.cx, y:c.cy, z:c.z, alpha:0.45, depth:c.cx + c.cy, pickable:true, ref:c}; G.R.dyn.push(c.dyn); } };
G.showCompany = showCompany;
// ---- placing things: a ghost follows the pointer; the arrow keys turn it; a click places it where the ground allows
let tool = null;
G.tool = t => { tool = t; $('#map').classList.toggle('tool', !!t); if (t && t.hint) hint(t.hint); else if (!t) hint(G.S && G.S.phase === 'drive' ? null : null); };
G.getTool = () => tool;
const hint = h => { const e = $('#hint'); if (h){ e.innerHTML = h; e.classList.add('on'); } else e.classList.remove('on'); };
G.hint = hint;
let pointer = null;
const ghostDraw = (g) => { if (!tool || !pointer || !(tool.model || tool.m)) return; const p = G.R.pickGround(pointer[0], pointer[1]); if (!p) return; let [x, y] = p; if (tool.snap) [x, y] = tool.snap(x, y); const view = tool.view || 0, m = tool.model ? G.world.model(tool.model) : tool.m;
  const chk = tool.check(x, y, view), ok = typeof chk !== 'string', e = ART.sprite(m, view, G.R.lv().S, {noPad:true}), z = G.R.zf(), [sx, sy] = G.R.toScreen(x, y, G.world.hb(x, y));
  const [w, d] = tool.size ? tool.size(view) : G.footprint(tool.model, view), ca = Math.cos(tool.ang || 0), sa = Math.sin(tool.ang || 0), cs = [[-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]].map(([u, v]) => { const px = x + u*ca - v*sa, py = y + u*sa + v*ca; return G.R.toScreen(px, py, G.world.hb(px, py)); });
  g.save(); g.beginPath(); cs.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fillStyle = ok ? 'rgba(80,160,90,.25)' : 'rgba(190,60,50,.25)'; g.fill(); g.strokeStyle = ok ? '#3d7a4a' : '#b8322a'; g.lineWidth = 2; g.stroke();
  g.globalAlpha = 0.6; g.imageSmoothingEnabled = false; g.drawImage(ART.spriteCanvas(e), Math.round(sx - e.ax*z), Math.round(sy - e.ay*z), e.w*z, e.h*z); g.restore();
  if (tool.extra) tool.extra(g, x, y, view, ok);
  g.font = '11px Silkscreen, monospace'; const label = ok ? (tool.label ? tool.label(x, y, view, chk) : '') : chk; if (label){ const tw = g.measureText(label).width; g.fillStyle = 'rgba(255,253,248,.92)'; g.fillRect(sx - tw/2 - 5, sy + 10, tw + 10, 18); g.fillStyle = ok ? '#2a2d33' : '#b8322a'; g.textAlign = 'center'; g.fillText(label, sx, sy + 23); g.textAlign = 'left'; } };
// ---- input: drag to pan, wheel or pinch to zoom, click to pick
function input(){ const c = $('#map'); let down = null, moved = false, pinch = null; const pts = new Map();
  c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2){ const [a, b] = [...pts.values()]; pinch = {d:Math.hypot(a[0] - b[0], a[1] - b[1]), step:G.R.cam.step}; } down = [e.clientX, e.clientY]; moved = false; });
  c.addEventListener('pointermove', e => { pointer = [e.clientX, e.clientY]; if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch){ const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), st = pinch.step + Math.round(Math.log2(d/pinch.d)*1.5); if (st !== G.R.cam.step) G.R.setStep(st, (a[0] + b[0])/2, (a[1] + b[1])/2); moved = true; return; }
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) moved = true; if (moved){ c.classList.add('drag'); G.R.panBy(dx, dy); } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; c.classList.remove('drag'); if (down && !moved && e.type === 'pointerup') click(e.clientX, e.clientY); if (!pts.size) down = null; };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  c.addEventListener('wheel', e => { e.preventDefault(); wheelAcc += e.deltaY; if (Math.abs(wheelAcc) > 60){ G.R.setStep(G.R.cam.step + (wheelAcc < 0 ? 1 : -1), e.clientX, e.clientY); wheelAcc = 0; } }, {passive:false});
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === ' '){ setSpeed(G.S.speed === 0 ? (G.S.lastSpeed || 1) : 0); e.preventDefault(); }
    if (e.key === '1') setSpeed(1); if (e.key === '2') setSpeed(2); if (e.key === '3') setSpeed(4);
    if (e.key === 'Escape'){ if (tool){ if (tool.cancel) tool.cancel(); G.tool(null); } else G.closeAll(); }
    if (e.key === '+' || e.key === '=') G.R.setStep(G.R.cam.step + 1, innerWidth/2, innerHeight/2); if (e.key === '-') G.R.setStep(G.R.cam.step - 1, innerWidth/2, innerHeight/2);
    if (tool && tool.turn && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')){ tool.view = ((tool.view || 0) + (e.key === 'ArrowLeft' ? -tool.turn : tool.turn) + 16) % 16; e.preventDefault(); return; }
    const pan = 60; if (e.key === 'ArrowLeft') G.R.panBy(pan, 0); if (e.key === 'ArrowRight') G.R.panBy(-pan, 0); if (e.key === 'ArrowUp') G.R.panBy(0, pan); if (e.key === 'ArrowDown') G.R.panBy(0, -pan); });
  $('#ctl').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s !== undefined) setSpeed(+b.dataset.s); if (b.dataset.z) G.R.setStep(G.R.cam.step + +b.dataset.z, innerWidth/2, innerHeight/2); if (b.dataset.t && tool && tool.turn) tool.view = ((tool.view || 0) + +b.dataset.t*tool.turn + 16) % 16; }); }
let wheelAcc = 0;
function click(sx, sy){ if (!G.S || !G.world) return;
  if (tool){ const p = G.R.pickGround(sx, sy); if (!p) return; let [x, y] = p; if (tool.snap) [x, y] = tool.snap(x, y); const r = tool.place(x, y, tool.view || 0); if (typeof r === 'string' && r !== 'ok') G.toast(r); G.refresh(); return; }
  for (const m of G.markHits || []) if (Math.hypot(m.sx - sx, m.sy - sy) < 14){ m.open(); return; }
  const o = G.R.pick(sx, sy); if (o){ if (o.ref && o.ref.role !== undefined && o.kind === 'b') return G.openBuilding(o.ref); if (o.ref && o.ref.open) return o.ref.open(); if (o.ref && o.ref.kind && CB[o.ref.kind]) return G.openCompany(o.ref); if (o.open) return o.open(); }
  const g = G.R.pickGround(sx, sy); G.emit('ground', g, sx, sy); }
G.focus = at => { const S = G.S; if (!at) return; const c = S.company.find(q => q.id === at || q.kind === at); if (c){ G.R.centreOn(c.cx, c.cy); G.openCompany(c); return; } const b = G.world.buildings.find(q => 'b' + q.id === at); if (b){ G.R.centreOn(b.cx, b.cy); G.openBuilding(b); } G.emit('focus', at); };
function setSpeed(s){ const S = G.S; if (!S) return; if (s === 0 && S.speed) S.lastSpeed = S.speed; S.speed = s; for (const b of document.querySelectorAll('#ctl [data-s]')) b.classList.toggle('on', +b.dataset.s === s); }
G.setSpeed = setSpeed;
// ---- markers over things: ! waits for an answer, ? is something to look into
G.marks = () => G.S.marks;
const drawMarks = (g) => { G.markHits = []; for (const m of G.S.marks){ const at = typeof m.at === 'function' ? m.at() : m.at; if (!at) continue; const [sx, sy] = G.R.toScreen(at[0], at[1], at[2]); const k = m.kind === '?' ? '#2c5f93' : '#b8322a';
    g.fillStyle = 'rgba(255,253,248,.95)'; g.strokeStyle = k; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy - 14, 9, 0, Math.PI*2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(sx - 4, sy - 6); g.lineTo(sx, sy); g.lineTo(sx + 4, sy - 6); g.fillStyle = k; g.fill();
    g.fillStyle = k; g.font = '700 12px Silkscreen, monospace'; g.textAlign = 'center'; g.fillText(m.kind, sx, sy - 9); g.textAlign = 'left'; G.markHits.push({sx, sy:sy - 14, open:() => G.emit('mark', m)}); } };
// ---- the loop: real time becomes days; the map is drawn every frame, tiles are drawn while there is time
let last = 0, dayAcc = 0;
const advance = dd => { const S = G.S, d0 = Math.floor(S.day); S.day += dd; moveVehicles(dd); G.emit('tick', dd); for (let d = d0 + 1; d <= Math.floor(S.day); d++){ G.emit('day', d); if (d % CFG.DAYS === 0) closeMonth(); } };
// fast-forward (for testing): days of game time at once, in quarter days
G.ff = days => { for (let i = 0; i < days*4 && !G.S.over; i++) advance(0.25); G.refresh(); };
function loop(now){ requestAnimationFrame(loop); const S = G.S; if (!S || !G.R) return; const dt = Math.min(0.1, (now - (last || now))/1000); last = now;
  const paused = S.speed === 0 || S.hdrPause || G.overlayPause || S.over; if (!paused){ const d0 = Math.floor(S.day); advance(dt*S.speed*CFG.DAYS/CFG.MONTH_SEC); if (Math.floor(S.day) !== d0){ dayAcc++; if (dayAcc % 2 === 0) G.refresh(); else header(); } }
  // what moves on the map
  const R = G.R; R.dyn.length = 0; for (const c of S.company) if (c.dyn) R.dyn.push(c.dyn);
  for (const v of S.vehicles){ const [x, y, dx, dy] = along(v.pts, v.s); R.dyn.push({m:G.world.model(v.model), view:G.world.view16(dx, dy), x, y, z:G.world.hb(x, y) + 0.05, pickable:true, ref:v, pickR:2}); }
  G.emit('dyn', R.dyn);
  R.frame(); const g = R.canvas || $('#map').getContext('2d'); drawMarks(g); ghostDraw(g); G.emit('draw', g);
  R.work(14); }
// ---- save and load: the seed makes the valley; what the Company changed is replayed
function save(){ try { const S = G.S; if (!S || S.over) return; const keep = Object.assign({}, S, {vehicles:S.vehicles.map(v => Object.assign({}, v)), company:S.company.map(c => Object.assign({}, c, {stat:undefined, dyn:undefined}))}); localStorage.setItem(CFG.SAVE, JSON.stringify(keep)); } catch (e){ console.warn('save', e); } }
G.save = save;
function load(){ try { const t = localStorage.getItem(CFG.SAVE), s = t ? JSON.parse(t) : null; return s && s.v === CFG.V ? s : null; } catch (e){ return null; } }
// ---- start: the logo, the concession, the car, the Bureau
function overlay(html, pause){ const o = $('#ovl'); o.innerHTML = html; o.classList.add('on'); G.overlayPause = pause !== false; return o; }
G.overlay = overlay;
function closeOverlay(){ $('#ovl').classList.remove('on'); $('#ovl').innerHTML = ''; G.overlayPause = false; }
G.closeOverlay = closeOverlay;
function titleScreen(){ const saved = load(); const o = overlay('<div class="paper" id="title"><div id="logo"></div><div class="blurb">A geothermal concession in a valley of the Jura. Ten years, then the valley votes.</div><div class="acts"><button class="btn main" data-a="new">New concession</button>' + (saved && !saved.over ? '<button class="btn" data-a="cont">Continue</button>' : '') + '</div><div class="blurb" style="margin-top:22px">Every valley is new. Valley no. <span id="seedv"></span></div></div>');
  const logo = ART.logos.game(3); logo.style.maxWidth = '420px'; logo.style.width = '100%'; logo.style.height = 'auto'; o.querySelector('#logo').appendChild(logo);
  const seed = +(new URLSearchParams(location.search).get('seed')) || Math.floor(Math.random()*900000) + 100000; o.querySelector('#seedv').textContent = seed;
  o.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'new') concession(seed); if (b.dataset.a === 'cont') startFrom(saved); }; }
function concession(seed){ const o = overlay('<div class="paper"><h1>Concession agreement</h1><div class="sub">for the use of deep geothermal energy · between the Republic and Canton of Jura and ' + COMPANY + ' · ref. ' + seed + '</div>' +
    '<p><b>Preamble.</b> The Canton wants to heat its villages with heat from underground instead of heating oil. Under the valley lie, from the top: Malm limestone, full of karst channels that feed the village springs; marls; the Muschelkalk, which holds warm water at about one kilometre; salt and anhydrite; and from about two kilometres down, granite, hot enough for electricity from about four kilometres. Nobody has drilled here. A petroleum campaign in the 1970s left seismic sections on paper, with gaps.</p>' +
    '<ol><li><b>Object.</b> The Company may survey, drill and operate geothermal wells in the valley, sell heat to the villages and electricity to the grid.</li>' +
    '<li><b>Term.</b> Ten years. On the last day the valley votes. With 50.1% yes the concession is extended; otherwise the Company removes its installations and fills its wells with cement, at its own cost.</li>' +
    '<li><b>Capital.</b> The Company starts with CHF 30 M of its own, in 3 million shares, listed on the Bourse du Jura. Banks lend against what is built, not against what is hoped for. The Confederation contributes to deep wells, under conditions. Eight months without money end this agreement.</li>' +
    '<li><b>The Canton’s review.</b> By January of year 8 the Canton expects a well at least 3,000 m deep into the granite. Reached: CHF 15 M from the Canton. Missed: CHF 5 M to the Canton.</li>' +
    '<li><b>Water.</b> Springs and their protection zones are protected by federal law. The Company is liable for any pollution, and the Canton may stop work.</li>' +
    '<li><b>Earthquakes.</b> Drilling and injection are monitored. The Company pays for damage from felt earthquakes; the Canton may order a stop.</li></ol>' +
    '<div class="stamp">SIGNED AND SEALED</div><p>You are the managing director. The Company owns one car. Drive it into the valley and choose where the Bureau goes; a small depot comes with it, and so does membership of the industry association ' + ASSOC + '.</p>' +
    '<div class="acts"><button class="btn main" data-a="sign">Countersign</button></div></div>');
  o.onclick = e => { const b = e.target.closest('[data-a]'); if (b && b.dataset.a === 'sign') begin(seed); }; }
function busy(on){ $('#busy').classList.toggle('on', on); }
function begin(seed){ closeOverlay(); busy(true); setTimeout(() => { G.S = newState(seed); makeWorld(); nameValley(); G.S.started = false; G.S.phase = 'drive';
  // the company car waits at one end of the valley road
  const W = G.world, pts = Math.random() < 0.5 ? W.roads[0] : W.roads[0].slice().reverse(), end = pts[0]; let inner = pts[Math.min(6, pts.length - 1)];
  { // it stops where the Bureau and the depot find open ground close by (the first stretch of road can be crowded)
    const [w, d] = G.footprint('Bureau', 0), [w2, d2] = G.footprint('Depot', 0), tw = (FOOTVIEW(0) ? Math.max(w, w2) : w + w2 + 4) + 4, td = (FOOTVIEW(0) ? d + d2 + 4 : Math.max(d, d2)) + 4;
    const room = ([x, y]) => { for (let r = 15; r < 80; r += 10) for (let a = 0; a < 12; a++){ const px = x + Math.cos(a*0.5236)*r, py = y + Math.sin(a*0.5236)*r; if (typeof W.canBuild(px, py, tw, td, 0) !== 'string'){ const q = W.nearestRoad(px, py); if (q && q.d <= 70) return true; } } return false; };
    for (let i = 1, s = 0, next = 30; i < pts.length && s < 320; i++){ s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s < next) continue; next = s + 20; if (room(pts[i])){ inner = pts[i]; break; } } }
  const car = G.vehicle('Company car (old 911)', end, inner, {kind:'car', keep:true, done:'carStop'}); car.name = 'Company car'; car.tag = 'car'; G.S.car = car.id;
  G.R.cam.step = 3; G.R.centreOn(inner[0], inner[1]); setSpeed(1); busy(false); hint('The Company car drives into the valley. Click a road where the Bureau should stand: the car drives there.'); G.emit('begin'); save(); }, 30); }
function makeWorld(){ const S = G.S; G.world = World.create(S.seed); const c = $('#map'); G.R = Render.create(G.world, c); G.R.canvas = c.getContext('2d'); resize();
  for (const ch of S.changes){ if (ch.t === 'site') G.world.addSite(ch.cx, ch.cy, ch.w, ch.d, ch.a, {company:ch.company, ...(ch.extra || {})}); if (ch.t === 'road') G.world.addRoad(ch.pts, ch.w); if (ch.t === 'model'){ const b = G.world.buildings.find(q => q.id === ch.id); if (b) b.name = ch.name; } }
  for (const c2 of S.company) showCompany(c2); G.emit('world'); }
function startFrom(saved){ closeOverlay(); busy(true); setTimeout(() => { G.S = saved; makeWorld(); setSpeed(saved.speed || 1); const b = G.company('bureau') || G.S.company[0]; if (b) G.R.centreOn(b.cx, b.cy); G.R.cam.step = 3; busy(false); G.emit('load'); if (G.S.phase === 'drive') hint('Click a road where the Bureau should stand: the car drives there.'); }, 30); }
// the car: it drives to where the player clicks; once it stands, its window offers to build the Bureau there
DONE.carStop = () => { if (G.S.phase === 'drive') openCar(); };
G.on('ground', (g) => { const S = G.S; if (S.phase !== 'drive' || !g) return; const car = S.vehicles.find(v => v.id === S.car); if (!car) return; const [x, y] = along(car.pts, car.s), r = G.world.nearestRoad(g[0], g[1]); if (!r) return;
  car.pts = (G.world.route([x, y], [r.x, r.y]) || [[x, y], [r.x, r.y]]); car.s = 0; car.len = pathLen(car.pts); car.done = 'carStop'; hint(null); G.closeWin('car'); });
const openCar = () => { const S = G.S, car = S.vehicles.find(v => v.id === S.car); if (!car) return; G.openWin('car', {title:'The Company car', sub:'an old silver coupé', at:() => { const [x, y] = along(car.pts, car.s); return [x, y, G.world.hb(x, y) + 1.5]; },
  body:A => S.phase === 'drive' ? '<p>The car stands by the road. The Bureau and a small depot can go here, on open ground close by.</p><button class="btn main" data-a="' + A('place', () => placeBureau()) + '">Build the Bureau here</button><p class="muted" style="margin-top:8px">Or click another road on the map to drive on.</p>' : '<p>Parked at the Bureau. It drives by itself when someone has to go somewhere in person.</p>'}); };
G.openCar = openCar;
function placeBureau(){ const S = G.S, car = S.vehicles.find(v => v.id === S.car), [cx0, cy0] = along(car.pts, car.s); G.closeWin('car');
  G.tool({model:'Bureau', view:0, turn:4, hint:'Place the Bureau near the car. The depot goes next to it. Arrow keys turn it; Esc cancels.',
    size:v => { const [w, d] = G.footprint('Bureau', v), [w2, d2] = G.footprint('Depot', v); return FOOTVIEW(v) ? [Math.max(w, w2), d + d2 + 4] : [w + w2 + 4, Math.max(d, d2)]; },
    check:(x, y, v) => { if (Math.hypot(x - cx0, y - cy0) > 90) return 'Closer to the car, please.'; const [w, d] = G.footprint('Bureau', v), [w2, d2] = G.footprint('Depot', v), tw = FOOTVIEW(v) ? Math.max(w, w2) : w + w2 + 4, td = FOOTVIEW(v) ? d + d2 + 4 : Math.max(d, d2);
      const r = G.world.canBuild(x, y, tw + 4, td + 4, 0); if (typeof r === 'string') return r; const road = G.world.nearestRoad(x, y); if (!road || road.d > 70) return 'Too far from a road: the lorries have to reach the depot.'; return r; },
    label:(x, y, v, chk) => 'Bureau ' + fmt(CB.bureau.cost) + ' · ground ' + fmt(flattenCost(chk)) + ' · access road ' + fmt(accessCost(x, y)),
    place:(x, y, v) => { const chk = tool.check(x, y, v); if (typeof chk === 'string') return chk; const total = CB.bureau.cost + flattenCost(chk) + accessCost(x, y); if (!G.pay(total, 'Bureau, depot and ground', 'Bureau')) return 'Not enough money.';
      const [w, d] = G.footprint('Bureau', v), [w2, d2] = G.footprint('Depot', v); let b, dp;
      if (FOOTVIEW(v)){ const tdep = d + d2 + 4; b = G.addCompany('bureau', x, y - tdep/2 + d/2, v); dp = G.addCompany('depot', x, y + tdep/2 - d2/2, v); } else { const tw = w + w2 + 4; b = G.addCompany('bureau', x - tw/2 + w/2, y, v); dp = G.addCompany('depot', x + tw/2 - w2/2, y, v); }
      accessRoad(x, y, Math.max(w, d)); G.tool(null); S.phase = 'building'; S.started = true; S.startDay = S.day;
      for (let i = 0; i < 3; i++) G.hire('driller', true); G.news('The Company stakes out its Bureau near ' + (placeName(nearestHome(x, y)) || 'the valley road') + ', with a depot in the yard. Three drillers sign on. ' + ASSOC + ' welcomes a new member and sends a calendar and the first invoice.');
      // the car parks at the Bureau
      const car2 = S.vehicles.find(q => q.id === S.car); if (car2){ car2.pts = [along(car2.pts, car2.s).slice(0, 2), [b.cx + 6, b.cy + 8]]; car2.s = 0; car2.len = pathLen(car2.pts); car2.done = null; }
      slides(); return 'ok'; }}); }
const flattenCost = chk => typeof chk === 'object' ? Math.round(chk.area*(0.006 + 0.02*chk.cut)) : 0;
G.flattenCost = flattenCost;
const accessCost = (x, y) => { const r = G.world.nearestRoad(x, y); return r && r.d > 14 ? Math.round((r.d - 10)*1.0) : 0; };
G.accessCost = accessCost;
// a gravel road from a new building to the nearest road (only if it is not right by one)
const accessRoad = (x, y, R) => { const r = G.world.nearestRoad(x, y); if (!r || r.d < 14) return null; const dx = r.x - x, dy = r.y - y, L = Math.hypot(dx, dy), sx = x + dx/L*(R*0.6), sy = y + dy/L*(R*0.6);
  const pts = G.world.planRoad(x, y, (px, py) => G.world.inSite(px, py, 3) && Math.hypot(px - x, py - y) < R + 12) || [[sx, sy], [r.x, r.y]];   // round what stands in the way
  G.world.addRoad(pts, 2.4); G.S.changes.push({t:'road', pts, w:2.4}); return pts; };
G.accessRoad = accessRoad;
const nearestHome = (x, y) => { const W = G.world; if (W.inTown(x, y) || Math.hypot(x - W.town[0], y - W.town[1]) < 120) return 'town'; let best = 0; W.villages.forEach((v, i) => { if (Math.hypot(x - v[0], y - v[1]) < Math.hypot(x - W.villages[best][0], y - W.villages[best][1])) best = i; }); return best; };
G.nearestHome = nearestHome;
// the association's slide show while the Bureau is built: the basics only
const SLIDES = [
  {h:'Bienvenue chez ' + ASSOC, p:'The association of the Swiss geothermal trade welcomes its newest member. Four slides, then the coffee. The rest you will find out yourself.', pic:'assoc'},
  {h:'1 · Listen to the ground', p:'Vibroseis trucks shake the ground along a straight line; the echoes from the layers below come back up and draw a section. A section is a guess, not a promise: nothing is certain until it is drilled.', pic:'Vibro-truck'},
  {h:'2 · Drill', p:'A rig drills in phases, each closed with steel casing and cement. Warm water lies in the Muschelkalk at about one kilometre: enough for heat. Hot granite from about four kilometres: enough for electricity, once its cracks are opened with water.', pic:'Light rig on its pad'},
  {h:'3 · Heat or power', p:'Two wells make a doublet: one brings hot water up, the other sends it back down. A heat station feeds pipes to the villages; a power plant feeds a line to the utility’s substation. Both are sold month by month.', pic:'Heat station'},
  {h:'4 · The valley votes', p:'In ten years the valley votes on the concession. Every village has its own mood, and long memories. Good luck. Membership fees are due on the first of the month.', pic:'Mairie'}];
function slides(i){ i = i || 0; const s = SLIDES[i], o = overlay('<div class="paper slide"><h1>' + s.h + '</h1><div class="sub">' + ASSOC + ' · introductory course</div><div id="pic"></div><p>' + s.p + '</p><div class="dots">' + SLIDES.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div><div class="acts" style="text-align:right">' + (i < SLIDES.length - 1 ? '<button class="btn main" data-a="next">Next</button>' : '<button class="btn main" data-a="done">To work</button>') + '</div></div>');
  const pic = o.querySelector('#pic'); if (s.pic === 'assoc'){ const c = ART.logos.association(3); c.style.maxWidth = '100%'; pic.appendChild(c); } else { const m = G.world.model(s.pic); if (m){ const e = ART.sprite(m, 2, 7, {noPad:true}), c = document.createElement('canvas'); c.width = e.w*2; c.height = e.h*2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(ART.spriteCanvas(e), 0, 0, c.width, c.height); c.style.maxHeight = '220px'; pic.appendChild(c); } }
  o.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'next') slides(i + 1); else { closeOverlay(); hint(null); G.S.flags.slides = 1; } }; }
// buildings finish
G.on('day', () => { const S = G.S; for (const c of S.company) if (!c.done && S.day >= c.ready){ c.done = true; showCompany(c); G.news('The ' + c.title + ' is finished.' + (c.kind === 'bureau' ? ' The phones work, mostly.' : '')); if (c.kind === 'bureau'){ S.phase = 'play'; G.emit('bureauReady', c); } } });
// ---- company windows
G.openCompany = c => { const fn = G.windows['company:' + c.kind] || G.windows['company:default']; G.openWin(c.id, Object.assign({title:c.title, sub:c.done ? COMPANY : 'being built, ready in about ' + G.dur(c.ready - G.S.day), at:() => [c.cx, c.cy, c.z + 8]}, fn(c))); };
G.windows['company:default'] = c => ({body:() => c.done ? '<p>' + esc(c.title) + '.</p>' : '<p>The builders are at work. Ready in about ' + G.dur(c.ready - G.S.day) + '.</p>'});
G.windows['company:bureau'] = c => ({wide:true, tabs:['Staff', 'Company'], body:(A, w) => { if (!c.done) return '<p>The builders are at work. Ready in about ' + G.dur(c.ready - G.S.day) + '.</p><p>Meanwhile the staff wait in the café.</p>';
  if (w.tab === 0){ const S = G.S; let h = '<h3>Staff</h3>'; for (const p of S.staff) h += '<div class="row"><span class="grow"><b>' + esc(p.name) + '</b> · ' + TRADES[p.tr].n.toLowerCase() + '</span><span class="muted">' + staffWhere(p) + '</span>' + (p.st === 'idle' ? '<button class="btn small" data-a="' + A('go_' + p.id, () => { p.st = 'leaving'; G.news(p.name + ' leaves the Company at the end of the month.', {quiet:true}); return 'ok'; }) + '">Let go</button>' : p.st === 'leaving' ? '<button class="btn small" data-a="' + A('stay_' + p.id, () => { p.st = 'idle'; return 'ok'; }) + '">Keep</button>' : '') + '</div>';
    h += '<div class="sec"><h3>Hire</h3>' + Object.keys(TRADES).filter(tr => !TRADES[tr].req || G.company(TRADES[tr].req) || G.S.flags[TRADES[tr].req]).map(tr => '<button class="btn small" data-a="' + A('hire_' + tr, () => { G.hire(tr); }) + '" title="' + esc(TRADES[tr].h) + '">' + TRADES[tr].n + ' · ' + fmt(TRADES[tr].wage) + '/mo</button>').join('') + '</div>';
    h += '<div class="sec"><h3>The CEO</h3><p class="muted">Travels in the company car for things done in person: debates, interviews, crises at the newspaper or a mairie.</p></div>'; return h + G.emitHtml('bureau:staff'); }
  let h = '<h3>Company buildings</h3>'; for (const k of ['maison', 'centre', 'atelier']){ const def = CB[k], ex = G.companyAny(k); h += '<div class="row"><span class="grow"><b>' + def.title + '</b><br><span class="muted">' + esc(CBH[k]) + '</span></span>' + (ex ? '<span class="muted">' + (ex.done ? 'stands' : 'ready in ' + G.dur(ex.ready - G.S.day)) + '</span>' : '<button class="btn small" data-a="' + A('build_' + k, () => placeCampus(k)) + '">' + fmt(def.cost) + '</button>') + '</div>'; }
  return h + G.emitHtml('bureau:company'); }});
const CBH = {maison:'The association on campus: membership tiers, courses, suits, polls, the congress.', centre:'Deep rigs and deep drilling, stimulation, the second survey pass, the traffic-light plan.', atelier:'Directional drilling, owned rigs and their maintenance.'};
G.CBH = CBH;
const staffWhere = p => p.st === 'leaving' ? 'leaving at the end of the month' : p.st === 'idle' ? 'at the Bureau' : p.st === 'site' ? 'on site' : p.st === 'travel' ? 'on the road' : p.st === 'course' ? 'on a course' : p.st === 'visit' ? 'on a visit' : p.st;
G.staffWhere = staffWhere;
function placeCampus(k){ const b = G.company('bureau'); if (!b) return 'The Bureau comes first.'; const def = CB[k]; G.closeAll();
  G.tool({model:def.model, view:b.view, turn:4, hint:'Place the ' + def.title + ' next to the Bureau. Arrow keys turn it; Esc cancels.',
    check:(x, y, v) => { if (Math.hypot(x - b.cx, y - b.cy) > 70) return 'Next to the Bureau, please.'; const [w, d] = G.footprint(def.model, v), r = G.world.canBuild(x, y, w + 4, d + 4, 0); if (typeof r === 'string') return r; return r; },
    label:(x, y, v, chk) => def.title + ' ' + fmt(def.cost) + ' · ground ' + fmt(flattenCost(chk)),
    place:(x, y, v) => { const chk = tool.check(x, y, v); if (typeof chk === 'string') return chk; const total = def.cost + flattenCost(chk); if (!G.pay(total, 'Building: ' + def.title, 'Bureau')) return 'Not enough money.'; G.addCompany(k, x, y, v); G.tool(null); G.news('The builders start on the ' + def.title + '.'); return 'ok'; }}); return 'ok'; }
G.placeCampus = placeCampus;
// ---- boot
function resize(){ const c = $('#map'); c.width = innerWidth; c.height = innerHeight; if (G.R) G.R.resize(innerWidth, innerHeight); }
addEventListener('resize', resize); addEventListener('beforeunload', save);
G.start = () => { resize(); input(); requestAnimationFrame(loop); const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('12px Silkscreen'), document.fonts.ready]) : Promise.resolve(); fonts.then(() => { if (G.autostart) G.autostart(); else titleScreen(); }); };
setTimeout(() => G.start(), 0);
})();
