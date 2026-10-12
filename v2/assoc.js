/* Jurafrackers 2.0 — the association, Géothermie-Helvetica, in the Maison de la géothermie on the campus. Membership tiers;
   the Cycle Strates courses (the worker is away meanwhile; the class can be read at the Maison and stays in its archive);
   suits lent to the Company; polls; the information stand; the congress. */
(function(){
'use strict';
const G = globalThis.G, {fmt, esc, clamp} = G;
const A0 = () => G.S.assoc;
const btn = (A, key, label, fn, cls, off) => '<button class="btn ' + (cls || '') + '" data-a="' + A(key, fn) + '"' + (off ? ' disabled' : '') + '>' + label + '</button>';
G.on('world', () => { const S = G.S; if (!S.assoc) S.assoc = {tier:0, read:[], stand:null, congress:-999}; S.tierFee = TIERS[S.assoc.tier].fee; if (S.assoc.stand) showStand(); });
const TIERS = [{n:'Membre', fee:5, h:'Courses of the first two Strates. A newsletter.'}, {n:'Membre bienfaiteur', fee:15, h:'All the courses but the last, polls, the information stand, suits on loan.'}, {n:'Membre du comité', fee:40, h:'Everything, the congress, and the canton’s ear: its permits come faster.'}];
const tier = () => A0() ? A0().tier : 0;
G.assocTier = tier;
// ---- the Cycle Strates: one course per trade; a certificate at the end
const STRATES = G.STRATES = [
  {k:'pass2', n:'Strate 1 · Reading seismic sections', tr:['geologist'], days:20, cost:30, tier:0, h:'The second survey pass needs a geologist who has taken it.', cls:[
    'A seismic section is a picture of echoes. The vibro-trucks shake the ground for a few seconds; the waves go down, bounce off every boundary between harder and softer rock, and come back to thousands of geophones.',
    'Bright bands are strong echoes: a big jump in hardness, like soft marl on hard limestone. Broken bands are faults: the same layer, suddenly a little deeper on one side.',
    'The vertical scale is time, not depth. Converting it needs the speed of sound in each layer, which nobody knows until a well is drilled. Hence the cautious “probably”.',
    'The second pass: more geophones, closer together, listening longer. Faults sharpen; the top of the granite, five kilometres down, starts to show. It is still a picture of echoes.']},
  {k:'wc', n:'Strate 2 · Well control', tr:['driller', 'mudeng'], days:15, cost:20, tier:0, h:'Fewer gas kicks where someone certified is on the rig.', cls:[
    'The mud does three things: it carries the cuttings up, it cools the bit, and its weight holds back whatever is in the rock. Too light, and gas or water push into the well. Too heavy, and the mud pushes into the rock.',
    'A kick is the first sign: the pits gain mud, the returns flow faster than the pumps push. The preventer on the wellhead closes; the gas is circulated out through a choke.',
    'Coal and broken rock near faults carry gas. Heavy mud costs more and drills slower, and still loses the occasional argument with the rock.',
    'What the course teaches above all: watch the pits. Every blowout started as a small gain that somebody explained away.']},
  {k:'tl', n:'Strate 3 · Induced seismicity and the traffic light', tr:['seismo'], days:20, cost:40, tier:1, h:'A certified seismologist on the site halves the risk of a quake after the pumps stop.', cls:[
    'Water pressed into granite opens cracks that were already there, and lets them slip. Each slip is a micro-quake; thousands of them map the cracked volume.',
    'Their sizes follow a simple law: for every quake of magnitude 2 there are about ten of magnitude 1 and a hundred of magnitude 0. More pressure, more quakes, and a bigger largest one.',
    'The traffic light: green, carry on; yellow, lower the pressure or stop; red, stop and bleed the pressure off. The thresholds are chosen before pumping, not during.',
    'The largest quake often comes after the pumps stop, while the pressure spreads. Bleeding off quickly helps. Waiting and hoping does not.']},
  {k:'talk', n:'Strate 4 · Talking to villages', tr:['liaison', 'suit'], days:10, cost:15, tier:1, h:'Visits by certified staff count half again as much.', cls:[
    'People do not oppose drilling; they oppose surprises. The lorry at six in the morning, the flare nobody announced, the letter that arrived after the rumour.',
    'Go before you are asked. Bring the map, the plan, the noise figures, and someone who can answer the question about the water.',
    'Never say “no risk”. Say what could happen, what you will do if it does, and who to call. Then answer the phone.',
    'Coffee helps. Croissants help more. A promise you cannot keep is worse than no promise at all.']},
  {k:'karst', n:'Strate 5 · Protecting karst water', tr:['water'], days:10, cost:15, tier:2, h:'A certified water officer also catches bigger traces before they reach the tap.', cls:[
    'Limestone dissolves. Over thousands of years the Jura became a sponge of fissures and caves; rain runs through it in days and comes out at the springs.',
    'Anything that goes down a well — mud, cement, diesel — can come out at a spring kilometres away, sometimes within a week. Tracers show where.',
    'The rules: a clean top hole through the karst, casing cemented and checked, sealed pads near springs, and samples before, during and after.',
    'A cloudy spring is a warning. A boil-water notice is a crisis. A polluted spring is forever.']}];
const certOn = (s, k) => G.S.staff.some(p => p.at === s.id && p.st === 'site' && (p.certs || []).includes(k));
G.certAt = certOn;
G.certOf = (p, k) => (p.certs || []).includes(k);
function sendCourse(st, p){ if (st.tier > tier()) return 'This course needs the ' + TIERS[st.tier].n + ' tier.'; if (!G.pay(st.cost, 'Courses', 'Maison de la géothermie')) return 'The course costs ' + fmt(st.cost) + '.';
  p.st = 'course'; p.at = 'maison'; p.course = st.k; p.until = Math.round(G.S.day) + st.days; G.news(p.name + ' starts ' + st.n.replace(/^Strate \d · /, 'the course on ').toLowerCase() + ' at the Maison. Back in ' + G.dur(st.days) + '.', {quiet:true}); return 'ok'; }
G.on('day', () => { for (const p of G.S.staff) if (p.st === 'course' && G.S.day >= p.until){ const st = STRATES.find(q => q.k === p.course); p.st = 'idle'; p.at = null; p.course = null; p.certs = p.certs || []; if (st && !p.certs.includes(st.k)) p.certs.push(st.k); G.news(p.name + ' is back from the Maison with a certificate' + (st ? ': ' + st.n.replace(/^Strate \d · /, '').toLowerCase() : '') + '.'); } });
function readClass(st){ const a = A0(); if (!a.read.includes(st.k)) a.read.push(st.k); G.openWin('class' + st.k, {wide:true, title:st.n, sub:'Cycle Strates · ' + G.ASSOC, at:null, body:() => st.cls.map(p => '<p>' + esc(p) + '</p>').join('') + '<p class="muted" style="font-size:12px">The Maison keeps this class in its archive.</p>'}); return 'ok'; }
// ---- the Maison's window: membership, courses, classes, and what the higher tiers offer
G.windows['company:maison'] = c => ({wide:true, tabs:['Association', 'Courses', 'Classes'], body:(A, w) => { if (!c.done) return '<p>The builders are at work. Ready in about ' + G.dur(c.ready - G.S.day) + '.</p>'; const a = A0(), S = G.S;
  if (w.tab === 1){ let h = '<p class="muted">The worker is away for the course. Each class can be read here while they attend.</p>';
    for (const st of STRATES){ const ppl = S.staff.filter(p => st.tr.includes(p.tr)), on = ppl.filter(p => p.st === 'course' && p.course === st.k), can = ppl.filter(p => p.st === 'idle' && !(p.certs || []).includes(st.k)), done = ppl.filter(p => (p.certs || []).includes(st.k));
      h += '<div class="sec"><h3>' + st.n + '</h3><p style="font-size:13px">' + st.tr.map(t => G.TRADES[t].pl.toLowerCase()).join(' or ') + ' · ' + G.dur(st.days) + ' · ' + fmt(st.cost) + (st.tier ? ' · ' + TIERS[st.tier].n : '') + '. <span class="muted">' + st.h + '</span></p>';
      if (done.length) h += '<p class="muted" style="font-size:12px">Certified: ' + done.map(p => esc(p.name)).join(', ') + '</p>'; if (on.length) h += '<p style="font-size:13px">On the course now: ' + on.map(p => esc(p.name)).join(', ') + ' ' + btn(A, 'rd' + st.k, 'Read the class', () => readClass(st), 'small') + '</p>';
      h += st.tier > a.tier ? '<p class="muted" style="font-size:12px">Needs the ' + TIERS[st.tier].n + ' tier.</p>' : can.map(p => btn(A, 'c' + st.k + p.id, 'Send ' + esc(p.name), () => sendCourse(st, p), 'small')).join('') + (!can.length && !on.length ? '<p class="muted" style="font-size:12px">Nobody idle to send' + (ppl.length ? '' : ': hire one at the Bureau') + '.</p>' : ''); h += '</div>'; }
    return h; }
  if (w.tab === 2){ const rd = STRATES.filter(st => a.read.includes(st.k)); return rd.length ? rd.map(st => '<div class="row"><span class="grow">' + st.n + '</span>' + btn(A, 'ar' + st.k, 'Read', () => readClass(st), 'small') + '</div>').join('') : '<p class="muted">No classes read yet. They are read while a worker attends the course.</p>'; }
  let h = '<p>' + G.ASSOC + ': the association of the Swiss geothermal trade, with a desk, a coffee machine and opinions on the campus.</p><div class="sec"><h3>Membership</h3>';
  TIERS.forEach((t, i) => { h += '<div class="row"><span class="grow"><b>' + t.n + '</b> · ' + fmt(t.fee) + ' a month<br><span class="muted" style="font-size:12px">' + t.h + '</span></span>' + (a.tier === i ? '<span class="muted">yours</span>' : btn(A, 'tier' + i, i > a.tier ? 'Upgrade' : 'Step down', () => { a.tier = i; S.tierFee = t.fee; G.news('The Company is now ' + t.n + ' of ' + G.ASSOC + '.', {quiet:true}); return 'ok'; }, 'small')) + '</div>'; }); h += '</div>';
  if (a.tier >= 1){ const polled = G.S.val.poll > S.day; h += '<div class="sec"><h3>A poll</h3>' + (polled ? '<p>The last poll (' + G.dur(S.day - (G.S.val.poll - 180)) + ' ago) says <b>' + Math.round(G.S.val.yes) + '% yes</b>, give or take. The village figures are in each mairie.</p>' : '<p class="muted">Six hundred phone calls: the forecast narrows for six months, and the mairies show figures instead of words.</p>' + btn(A, 'poll', 'Commission a poll · ' + fmt(30), () => poll())) + '</div>';
    h += '<div class="sec"><h3>The information stand</h3>' + (a.stand ? '<p>The stand is in ' + esc(G.placeName(a.stand.home)) + ' for another ' + G.dur(Math.max(1, a.stand.until - S.day)) + '.</p>' : '<p class="muted">A presenter, leaflets, a model of a well, for a month in one village.</p>' + G.homes().map(h2 => btn(A, 'st' + h2, esc(G.placeName(h2)), () => placeStand(h2), 'small')).join('') + ' <span class="muted">' + fmt(20) + '</span>') + '</div>'; }
  if (a.tier >= 2){ const ok = S.day - a.congress > 330; h += '<div class="sec"><h3>The congress</h3>' + (ok ? '<p class="muted">Once a year: the trade, the canton, the press, three days of talks and a dinner in town.</p>' + btn(A, 'cong', 'Host it here · ' + fmt(150), () => congress()) : '<p class="muted">The last one was ' + G.dur(S.day - a.congress) + ' ago.</p>') + '</div>'; }
  return h; }});
function poll(){ if (!G.pay(30, 'Polls', 'Maison de la géothermie')) return 'A poll costs ' + fmt(30) + '.'; G.S.val.poll = G.S.day + 180; G.updFc(); G.news('The association’s poll: ' + Math.round(G.S.val.yes) + '% would vote yes today, give or take a few.', {}); return 'ok'; }
function congress(){ if (!G.pay(150, 'The congress', 'Maison de la géothermie')) return 'The congress costs ' + fmt(150) + '.'; A0().congress = G.S.day; G.moodAll(1, 'The geothermal congress', {he:2, le:0.6, fa:0.4}); G.S.flags.cantonEar = G.S.day + 365; G.news('The geothermal congress in town: three days of talks, a dinner, a speech by the canton’s minister. La Feuille calls it “cautiously warm”.', {paper:true}); return 'ok'; }
// ---- the information stand: a month on a village square; the presenter talks to whoever stops
function placeStand(h){ const a = A0(), c = G.homeCentre(h), m = G.world.model('Company information stand'); let at = null; for (let r = 4; r < 50 && !at; r += 3) for (let k = 0; k < 16; k++){ const x = c[0] + Math.cos(k*0.39)*r, y = c[1] + Math.sin(k*0.39)*r; if (typeof G.world.canBuild(x, y, m.W + 1, m.D + 1, 0, {roadOk:false}) !== 'string'){ at = [x, y]; break; } }
  if (!at) return 'No room on the square.'; if (!G.pay(20, 'The information stand', G.placeName(h))) return 'The stand costs ' + fmt(20) + '.'; a.stand = {home:h, x:at[0], y:at[1], until:Math.round(G.S.day) + 30}; showStand(); G.news('The association’s information stand opens in ' + G.placeName(h) + ': leaflets, a model of a well, coffee.', {quiet:true}); return 'ok'; }
let STAND = [];
function showStand(){ for (const st of STAND) G.R.removeStatic(st); STAND = []; const s = A0().stand; if (!s) return; const z = G.world.hb(s.x, s.y); STAND.push(G.R.addStatic({kind:'p', m:G.world.model('Company information stand'), x:s.x, y:s.y, z, view:0, noPad:true}), G.R.addStatic({kind:'p', m:G.world.model('Association presenter'), x:s.x + 1.2, y:s.y + 1.6, z, view:2, noPad:true})); }
G.on('day', () => { const a = A0(); if (!a || !a.stand) return; const s = a.stand; G.mood(s.home, 0.12, 'The association’s stand', {he:1, le:0.6, fa:0.3}); if (G.S.day >= s.until){ a.stand = null; showStand(); } });
// ---- suits: lent by the association; a month at a mairie (and its permits) or at the gendarmerie (cheaper police)
G.suitAt = (role, h) => (G.S.val && G.S.val.visits || []).some(v => { if (v.k !== 'suit') return false; const b = G.world.buildings.find(q => q.id === v.b); return b && b.role === role && (h === undefined || b.home === h); });
const suitBtn = (A, b) => { const idle = G.S.staff.some(p => p.tr === 'suit' && p.st === 'idle'), here = G.suitAt(b.role, b.home); if (!G.S.staff.some(p => p.tr === 'suit')) return '';
  return '<div class="sec"><h3>A suit</h3>' + (here ? '<p class="muted">A suit from the association is here, making themselves useful.</p>' : '<p class="muted">' + (b.role === 'police' ? 'A month at the gendarmerie: police operations cost less.' : 'A month at the mairie: lunches, handshakes, a faster permit.') + '</p>' + btn(A, 'suit' + b.id, 'Send a suit', () => G.visit('suit', b, 30, 'suit'), '', !idle)) + '</div>'; };
G.on('html:building:mairie', (A, b) => suitBtn(A, b)); G.on('html:building:police', (A, b) => suitBtn(A, b));
G.on('day', () => { const v = G.S.val; if (!v) return; for (const vi of v.visits) if (vi.k === 'suit'){ const b = G.world.buildings.find(q => q.id === vi.b); if (!b || b.role !== 'mairie') continue; G.mood(b.home, 0.06, 'A suit from the association', {he:0.6, le:1, fa:0.6});
  for (const s of (G.S.geo && G.S.geo.sites) || []) if (s.home === b.home && s.permit.mairie === 'wait') s.permitAt -= 1; }
  if (G.S.flags.cantonEar > G.S.day) for (const s of (G.S.geo && G.S.geo.sites) || []) if (s.permit.canton === 'wait' && G.S.day % 3 === 0) s.cantonAt -= 1; });
})();
