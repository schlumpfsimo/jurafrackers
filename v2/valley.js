/* Jurafrackers 2.0 — the valley. The town and each village have a mood per voter group (the higher educated, the lower
   educated, the farmers); the vote forecast comes from them. Every public building has its window. Buildings ask for things
   now and then; promises fall due without a reminder; gifts are placed on the map. Crises are answered at La Feuille de la
   Faille or at the mairie, by the CEO in person. */
(function(){
'use strict';
const G = globalThis.G, {fmt, esc, clamp} = G;
const GR = ['he', 'le', 'fa'], GRN = {he:'the higher educated', le:'the lower educated', fa:'the farmers'};
const V = () => G.S.val;
const homes = () => ['town', ...G.world.villages.map((v, i) => i)];
const SHARE = h => h === 'town' ? {he:0.38, le:0.52, fa:0.10} : {he:0.2, le:0.5, fa:0.3};
const centre = h => h === 'town' ? G.world.town : G.world.villages[h];
const homeOf = b => b.home !== null && b.home !== undefined ? b.home : G.nearestHome(b.cx, b.cy);
const bById = id => G.world.buildings.find(b => b.id === id);
const bOf = (role, h) => G.world.buildings.find(b => b.role === role && b.home === h);
const pn = h => G.placeName(h) || 'the valley';
const btn = (A, key, label, fn, cls, off) => '<button class="btn ' + (cls || '') + '" data-a="' + A(key, fn) + '"' + (off ? ' disabled' : '') + '>' + label + '</button>';
let POP = null;
const pop = h => { if (!POP){ POP = {}; for (const b of G.world.buildings){ if (b.role !== 'house' && b.role !== 'farm') continue; const k = homeOf(b); POP[k] = (POP[k] || 0) + (b.role === 'farm' ? 5 : 3); } POP.town = (POP.town || 0)*1.6 + 60; } return POP[h] || 40; };
G.pop = pop;
const FARMS = ['Ferme du Crêt-Moisi', 'Ferme des Longues-Raies', 'Ferme de la Bouse-Dorée', 'Ferme du Pré-Tondu', 'Ferme des Trois-Bornes', 'Ferme de la Combe-Grasse', 'Ferme du Gros-Caillou', 'Ferme des Fourches', 'Ferme du Champ-Sec', 'Ferme de la Vache-Pensive', 'Ferme du Bas-Mouillé', 'Ferme des Orties'];
// ---- the state, made once per game
G.on('world', () => { POP = null; const S = G.S; let k = 0; for (const b of G.world.buildings) if (b.role === 'farm') b.farmName = FARMS[(k++ + S.seed) % FARMS.length];
  if (!S.val){ const r = ART.KIT.rng(S.seed + 7), v = S.val = {mood:{}, base:{}, why:{}, eng:{}, noise:{}, req:[], prom:[], cris:[], gifts:[], visits:[], ask:{}, n:0, local:false, poll:0, mayors:{}, priest:G.personName(false), editor:G.personName(true)};
    for (const h of homes()){ const t = h === 'town', m = {he:(t ? 56 : 51) + r()*8 - 4, le:(t ? 50 : 48) + r()*8 - 4, fa:(t ? 41 : 45) + r()*8 - 4}; v.mood[h] = m; v.base[h] = Object.assign({}, m); v.why[h] = []; v.eng[h] = 0; v.noise[h] = 0; v.mayors[h] = G.personName(r() < 0.5); } }
  for (const g of V().gifts) showGift(g); updFc(); });
// ---- moods: per home and group, 0..100; the log of what people talk about
G.mood = (h, d, why, grp) => { if (h === null || h === undefined) return G.moodAll(d, why, grp); const v = V(); if (!v || !v.mood[h]) return; const m = v.mood[h];
  for (const g of GR){ const k = grp ? (typeof grp === 'string' ? (g === grp ? 1 : 0) : (grp[g] || 0)) : 1; if (k) m[g] = clamp(m[g] + d*k, 0, 100); }
  if (why){ const w = v.why[h], last = w.find(q => q.t === why && G.S.day - q.day < 45); if (last){ last.d = Math.round((last.d + d)*10)/10; last.day = Math.round(G.S.day); } else { w.unshift({t:why, d:Math.round(d*10)/10, day:Math.round(G.S.day)}); if (w.length > 6) w.pop(); } } };
G.moodAll = (d, why, grp) => { for (const h of homes()) G.mood(h, d, why, grp); };
G.moodOf = h => { const v = V(); if (!v || !v.mood[h]) return 50; const m = v.mood[h], sh = SHARE(h); return GR.reduce((t, g) => t + m[g]*sh[g], 0); };
const yesOf = m => 1/(1 + Math.exp(-(m - 50)/12));
const forecast = () => { let y = 0, t = 0; for (const h of homes()){ const P = pop(h), sh = SHARE(h), m = V().mood[h]; for (const g of GR){ y += P*sh[g]*yesOf(m[g]); t += P*sh[g]; } } return 100*y/t; };
const updFc = () => { const y = forecast(), w = (V().poll > G.S.day ? 2.5 : 6) + 6*G.monthsLeft()/120; V().yes = y; G.S.fc = [Math.round(clamp(y - w, 0, 100)), Math.round(clamp(y + w, 0, 100))]; };
G.forecast = forecast; G.updFc = updFc; G.homes = homes; G.SHARE = SHARE; G.homeCentre = centre;
G.on('month', () => { const v = V(); if (!v) return; for (const h of homes()){ const m = v.mood[h], b = v.base[h]; for (const g of GR) m[g] += (b[g] - m[g])*0.04; if (v.eng[h] <= -2) G.mood(h, -0.3, 'Nobody from the Company listens'); v.noise[h] = 0; }
  const n = G.S.staff.length; if (n) G.moodAll(Math.min(0.8, n*0.04), 'Jobs at the Company', 'le'); if (v.local) G.moodAll(0.3, 'Crews buy in the village shops', {le:1, fa:0.5}); updFc(); });
G.monthly.push(() => V() && V().local ? [{line:'Local suppliers', who:'Village shops', k:-15}] : []);
// what the work does to the villages: heavy lorries through them, rigs working through the night nearby
const HEAVY = {lorry:1, lowloader:1.5, vibro:1.2};
G.on('day', d => { const v = V(); if (!v || d % 2) return; const hs = homes();
  for (const veh of G.S.vehicles){ const k = HEAVY[veh.kind]; if (!k || veh.s < 0 || veh.s >= veh.len) continue; const [x, y] = G.vehPos(veh);
    for (const h of hs){ const c = centre(h); if (Math.hypot(x - c[0], y - c[1]) < (h === 'town' ? 90 : 60) && v.noise[h] < 3){ v.noise[h] += 0.12*k; G.mood(h, -0.12*k, h === 'town' ? 'Lorries through town' : 'Lorries through the village', {he:0.7, le:1, fa:1.3}); } } }
  for (const s of (G.S.geo && G.S.geo.sites) || []){ if (!s.wells.some(id => { const w = G.geoById(id); return w && w.going; })) continue; for (const h of hs){ const c = centre(h); if (Math.hypot(s.x - c[0], s.y - c[1]) < 170) G.mood(h, -0.1, 'The rig works through the night'); } } });
// ---- the mood shown: words and a bar; numbers only with a recent poll
const WORD = m => m < 30 ? 'against it' : m < 44 ? 'wary' : m < 56 ? 'undecided' : m < 70 ? 'curious' : 'warm';
const bar = m => '<span style="display:inline-block;width:90px;height:8px;border:1px solid var(--line2);background:var(--soft);position:relative;vertical-align:middle"><i style="position:absolute;left:0;top:0;bottom:0;width:' + clamp(m, 0, 100) + '%;background:' + (m < 44 ? '#c9826e' : m < 56 ? '#c9b26e' : '#8fb27a') + '"></i></span>';
const moodHtml = h => { const v = V(), m = v.mood[h], polled = v.poll > G.S.day; let s = '<div class="kv"><span>' + esc(pn(h)) + '</span><span>' + bar(G.moodOf(h)) + ' ' + WORD(G.moodOf(h)) + '</span>';
  for (const g of GR) s += '<span class="muted">' + GRN[g] + '</span><span>' + bar(m[g]) + ' ' + (polled ? Math.round(yesOf(m[g])*100) + '% yes' : WORD(m[g])) + '</span>'; s += '</div>';
  const w = v.why[h].filter(q => Math.abs(q.d) >= 0.5); if (w.length) s += '<p class="muted" style="font-size:12px;margin:6px 0 0">People talk about: ' + w.map(q => esc(q.t[0].toLowerCase() + q.t.slice(1)) + (q.d > 0 ? ' (+)' : ' (−)')).join(' · ') + '</p>'; return s; };
G.moodHtml = moodHtml;
// ---- gifts: chosen at a mairie or the school, placed in the village on paving
const GIFTS = G.GIFTS = {
  benches:{n:'Benches on the square', model:'Pensioners on a bench', cost:30, mood:2, grp:{he:0.6, le:1, fa:0.8}, h:'Somewhere to sit and count the lorries.'},
  busstop:{n:'A bus stop', model:'Bus stop', cost:60, mood:2.5, grp:{he:1, le:1.2, fa:0.8}, road:true, h:'The post bus stops; the children stop walking on the valley road.'},
  fountain:{n:'A fountain', model:'Fountain', cost:200, mood:4, grp:{he:1, le:1, fa:1}, village:true, h:'Water from the spring, in stone.'},
  hall:{n:'A sports hall', model:'Sports hall (gift)', cost:2500, mood:7, grp:{he:0.8, le:1.4, fa:0.8}, h:'Gym lessons, the gymnastics club, the fête when it rains.'},
  uni:{n:'A university field station', model:'University field station (gift)', cost:1200, mood:3, grp:{he:2, le:0.5, fa:0.3}, flag:'university', once:true, h:'Seismometers and students. Seismologists come with it.'}};
const giftOk = (k, h) => { const Gf = GIFTS[k], v = V(); if (Gf.once && v.gifts.some(g => g.kind === k)) return 'There is one already.'; if (Gf.village && h === 'town') return 'The town has its fountain.'; if (v.gifts.some(g => g.kind === k && g.home === h)) return pn(h) + ' has one already.'; return true; };
function placeGift(k, h){ const Gf = GIFTS[k], c = centre(h), ok = giftOk(k, h); if (ok !== true) return ok; G.closeAll();
  G.tool({model:Gf.model, view:0, turn:4, hint:Gf.n + ' for ' + esc(pn(h)) + '. Arrow keys turn it; Esc cancels.',
    check:(x, y, v) => { if (Math.hypot(x - c[0], y - c[1]) > (h === 'town' ? 110 : 80)) return 'In ' + pn(h) + ', please.'; if (Gf.road){ const rd = G.world.nearestRoad(x, y); if (!rd || rd.d > 9) return 'By the road.'; } const [w, d] = G.footprint(Gf.model, v); return G.world.canBuild(x, y, w + 2, d + 2, 0); },
    label:(x, y, v, chk) => Gf.n + ' · ' + fmt(Gf.cost + G.flattenCost(chk)),
    place:(x, y, v) => { const chk = G.getTool().check(x, y, v); if (typeof chk === 'string') return chk; const cost = Gf.cost + G.flattenCost(chk); if (!G.pay(cost, 'Gifts to the valley', pn(h))) return 'That costs ' + fmt(cost) + '.'; const [w, d] = G.footprint(Gf.model, v);
      G.world.addSite(x, y, w + 2, d + 2, 0, {gift:k, look:'square'}); G.S.changes.push({t:'site', cx:x, cy:y, w:w + 2, d:d + 2, a:0, extra:{gift:k, look:'square'}}); const g = {kind:k, home:h, x, y, view:v, day:Math.round(G.S.day)}; V().gifts.push(g); showGift(g); G.tool(null); given(g); return 'ok'; }}); return 'ok'; }
G.placeGift = placeGift;
const showGift = g => { const st = G.R.addStatic({kind:'p', m:G.world.model(GIFTS[g.kind].model), x:g.x, y:g.y, z:G.world.hb(g.x, g.y), view:g.view, noPad:true, pickable:true, ref:{open:() => G.openWin('gift' + g.kind + g.home, {title:GIFTS[g.kind].n, sub:'from the Company, ' + G.dur(G.S.day - g.day) + ' ago', at:() => [g.x, g.y, G.world.hb(g.x, g.y) + 4], body:() => '<p>' + GIFTS[g.kind].h + '</p>'})}}); };
function given(g){ const Gf = GIFTS[g.kind], v = V(); G.mood(g.home, Gf.mood, 'A gift: ' + Gf.n.toLowerCase(), Gf.grp); if (Gf.cost >= 1000) G.moodAll(1, 'The Company’s gifts'); if (Gf.flag) G.S.flags[Gf.flag] = true;
  G.news('Ribbon cut in ' + pn(g.home) + ': ' + Gf.n.toLowerCase() + ', from the Company. ' + (v.mayors[g.home] ? v.mayors[g.home] + ' makes a short speech and a long one.' : ''), {paper:true});
  for (const r of v.req.filter(q => REQ[q.k].gift === g.kind && q.home === g.home)) closeReq(r, 'done'); keep(p => REQ[p.k].gift === g.kind && p.home === g.home); }
// ---- requests: each building asks now and then; 1–2 open at a time; ignored villages stop asking and turn sour
const REQ = G.REQ = {
  benches:{who:['mairie'], gift:'benches', ask:'The council would like benches on the square, from the Company. The pensioners would sit on them and count the lorries.', p:'benches on the square'},
  busstop:{who:['mairie'], gift:'busstop', ask:'The post bus passes without stopping. A shelter on the valley road would change that.', p:'a bus stop'},
  fountain:{who:['mairie'], gift:'fountain', ask:'The village has no fountain. The council has a spot in mind, and no money.', p:'a fountain'},
  hall:{who:['mairie', 'school'], gift:'hall', ask:'The gymnastics club trains in a barn. A sports hall would be remembered for a long time.', p:'a sports hall'},
  evening:{who:['mairie'], staff:'liaison', days:3, ask:'The council wants someone from the Company in the village hall, answering questions. All of them.', p:'an information evening'},
  lesson:{who:['school'], staff:'geologist', days:7, ask:'The headteacher asks for a geologist for a week of lessons. The children want to see rocks older than their grandparents.', p:'a week of geology lessons'},
  bells:{who:['church'], pay:80, ask:'The bells ring flat since the lorries started. The parish asks CHF 80k to have them retuned.'},
  water:{who:['farm'], staff:'water', days:2, ask:'The farmer wants the well water tested. Properly, by someone who knows what they are looking at.', p:'a test of the well water'},
  cows:{who:['farm'], pay:25, ask:'The trucks frightened the cows and the milk dropped. CHF 25k would settle it.', need:() => G.S.geo && G.S.geo.lines.some(l => l.done)},
  local:{who:['shop'], toggle:'local', ask:'Your crews drive to town for lunch. The shops would make sandwiches, at a price: CHF 15k a month for all the shops in the valley.'},
  overtime:{who:['police'], pay:40, ask:'Escorting your convoys means overtime. The gendarmerie asks CHF 40k for the year.', need:() => G.S.geo && G.S.geo.sites.length > 0},
  interview:{who:['newspaper'], ceo:'interview', ask:'La Feuille de la Faille wants an interview with the CEO. In person, in the editorial office, with coffee.'}};
const okReq = (k, b) => { const R = REQ[k], v = V(), h = homeOf(b); if (R.need && !R.need()) return false; if (R.gift && giftOk(R.gift, h) !== true) return false; if (R.toggle && v[R.toggle]) return false;
  if (v.req.some(r => r.k === k && r.home === h) || v.prom.some(p => p.k === k && p.home === h)) return false; return true; };
const hash = n => { let x = Math.sin(n*12.9898)*43758.5453; return x - Math.floor(x); };
G.on('day', d => { const v = V(); if (!v || G.S.phase !== 'play' || d % 7 || G.S.day < 60) return;
  for (const r of v.req.slice()) if (G.S.day > r.until){ closeReq(r); G.mood(r.home, -2, 'No answer from the Company'); v.eng[r.home] = (v.eng[r.home] || 0) - 1; }
  if (v.req.length >= 2 || Math.random() > 0.25) return; const byRole = {};
  for (const b of G.world.buildings){ const ks = Object.keys(REQ).filter(k => REQ[k].who.includes(b.role) && okReq(k, b)); if (!ks.length) continue; const h = homeOf(b), eng = v.eng[h] || 0; if (eng <= -2) continue;
    const gap = (180 + 90*hash(b.id))*(b.home === 'town' ? 1.4 : 1) - 25*Math.max(0, eng); if (G.S.day - (v.ask[b.id] ?? 0) < gap) continue; (byRole[b.role] = byRole[b.role] || []).push([b, ks]); }
  const roles = Object.keys(byRole); if (!roles.length) return; const list = byRole[roles[Math.floor(Math.random()*roles.length)]], [b, ks] = list[Math.floor(Math.random()*list.length)];
  const r = {id:'r' + (++v.n), k:ks[Math.floor(Math.random()*ks.length)], bid:b.id, home:homeOf(b), day:Math.round(G.S.day), until:Math.round(G.S.day) + 60}; v.req.push(r); v.ask[b.id] = G.S.day;
  G.S.marks.push({kind:'!', id:'mr' + r.id, at:[b.cx, b.cy, b.z + (b.zt || 8) + 3], ref:'b' + b.id}); G.news('A letter from ' + where(b) + '.', {quiet:true}); });
G.askReq = (b, k) => { const v = V(), r = {id:'r' + (++v.n), k, bid:b.id, home:homeOf(b), day:Math.round(G.S.day), until:Math.round(G.S.day) + 60}; v.req.push(r); v.ask[b.id] = G.S.day; G.S.marks.push({kind:'!', id:'mr' + r.id, at:[b.cx, b.cy, b.z + (b.zt || 8) + 3], ref:'b' + b.id}); return r; };
G.on('mark', m => { if (m.ref && typeof m.ref === 'string' && m.ref[0] === 'b' && /^b\d+$/.test(m.ref)){ const b = bById(+m.ref.slice(1)); if (b) G.openBuilding(b); } });
const closeReq = (r, how) => { const v = V(); v.req.splice(v.req.indexOf(r), 1); G.S.marks = G.S.marks.filter(m => m.id !== 'mr' + r.id); if (how === 'done'){ v.eng[r.home] = (v.eng[r.home] || 0) + 1; } };
// promises: due 6–18 months later, no reminder on the map; kept when carried out, broken when the day passes
const keep = test => { const v = V(); for (const p of v.prom.filter(test)){ v.prom.splice(v.prom.indexOf(p), 1); G.mood(p.home, 3, 'A promise kept'); v.eng[p.home] = (v.eng[p.home] || 0) + 1; G.news('The Company keeps its word in ' + pn(p.home) + ': ' + REQ[p.k].p + '.', {paper:true}); } };
G.on('day', () => { const v = V(); if (!v) return; for (const p of v.prom.slice()) if (G.S.day >= p.due){ v.prom.splice(v.prom.indexOf(p), 1); G.mood(p.home, -8, 'A broken promise'); G.moodAll(-1.5, 'The Company’s promises'); for (const g of GR) v.base[p.home][g] -= 2;
  G.news(pn(p.home) + ' is still waiting for ' + REQ[p.k].p + '. The Company promised it ' + G.dur(G.S.day - p.made) + ' ago.', {paper:true}); } });
function answer(r, how){ const v = V(), R = REQ[r.k], h = r.home, b = bById(r.bid), who = G.buildingTitle(b);
  if (how === 'no'){ closeReq(r); G.mood(h, -1.5, 'The Company said no'); v.eng[h] = (v.eng[h] || 0) - 0.5; return 'ok'; }
  if (how === 'pay'){ if (!G.pay(R.pay, 'Requests from the valley', who)) return 'That costs ' + fmt(R.pay) + '.'; closeReq(r, 'done'); G.mood(h, 2, 'The Company paid up', b.role === 'farm' ? {he:0.5, le:0.8, fa:2} : null); return 'ok'; }
  if (how === 'toggle'){ v[R.toggle] = true; closeReq(r, 'done'); G.mood(h, 1.5, 'Sandwiches from the shop'); G.news('The crews buy their lunch in the village shops now.', {quiet:true}); return 'ok'; }
  if (how === 'promise'){ v.prom.push({id:'p' + (++v.n), k:r.k, home:h, bid:r.bid, made:Math.round(G.S.day), due:Math.round(G.S.day + 180 + Math.random()*360)}); closeReq(r, 'done'); G.mood(h, 1, 'A promise from the Company'); return 'ok'; }
  if (how === 'now'){ if (R.gift) return placeGift(R.gift, h); if (R.staff) return visit(R.staff, b, R.days, r.k); if (R.ceo) return G.ceoGo(b.id, {kind:R.ceo, bid:b.id, req:r.id}); } return 'ok'; }
// visits: a geologist for lessons, a liaison for an evening, the water officer at a farm
function visit(tr, b, days, k){ const p = G.S.staff.find(q => q.tr === tr && q.st === 'idle'); if (!p) return 'No idle ' + G.TRADES[tr].n.toLowerCase() + ' at the Bureau.'; const base = G.company('bureau'); if (!base) return 'The Bureau comes first.';
  p.st = 'travel'; p.at = 'b' + b.id; G.vehicle(tr === 'liaison' ? 'Post bus' : 'Geologist\'s pickup', [base.cx, base.cy], [b.cx, b.cy], {kind:tr === 'liaison' ? 'bus' : 'pickup', done:'visitIn', arg:{p:p.id, b:b.id, days, k}}); G.news(p.name + ' goes to ' + where(b) + '.', {quiet:true}); return 'ok'; }
G.vehicleDone.visitIn = a => { const p = G.S.staff.find(q => q.id === a.p); if (!p) return; p.st = 'visit'; V().visits.push({p:a.p, b:a.b, k:a.k, until:G.S.day + a.days}); };
G.on('day', () => { const v = V(); if (!v) return; for (const vi of v.visits.slice()) if (G.S.day >= vi.until){ v.visits.splice(v.visits.indexOf(vi), 1); const p = G.S.staff.find(q => q.id === vi.p), b = bById(vi.b), h = homeOf(b), base = G.company('bureau');
  if (p){ p.st = 'travel'; if (base){ const bus = p.tr === 'liaison'; G.vehicle(bus ? 'Post bus' : 'Geologist\'s pickup', [b.cx, b.cy], [base.cx, base.cy], {kind:bus ? 'bus' : 'pickup', done:'backHome', arg:p.id}); } }
  const eff = {evening:[3, {he:1.2, le:1, fa:0.8}, 'An evening of questions'], lesson:[2.5, {he:1.5, le:1, fa:0.7}, 'Geology lessons at the school'], water:[2, {he:0.5, le:0.7, fa:2}, 'The well water was tested']}[vi.k];
  if (eff) G.mood(h, eff[0]*(p && (p.certs || []).includes('talk') ? 1.5 : 1), eff[2], eff[1]); for (const r of v.req.filter(q => q.k === vi.k && q.home === h)) closeReq(r, 'done'); keep(q => q.k === vi.k && q.home === h); G.emit('visitDone', vi, b, h); } });
G.visit = visit;
// ---- the CEO in the company car: interviews, crises, debates; one trip at a time
const CEO = G.CEO = {};
G.ceoGo = (bid, task, at) => { const S = G.S, b = bid !== null ? bById(bid) : {cx:at[0], cy:at[1], role:'spot'}, car = S.vehicles.find(v => v.id === S.car), base = G.company('bureau'); if (!b || !base) return 'The Bureau comes first.'; if (S.ceoTask) return 'The CEO is out already.';
  const from = car ? G.vehPos(car).slice(0, 2) : [base.cx, base.cy]; if (car) S.vehicles.splice(S.vehicles.indexOf(car), 1);
  const v = G.vehicle('Company car (old 911)', from, [b.cx, b.cy], {kind:'car', keep:true, done:'ceoAt', arg:null}); v.name = 'Company car'; v.tag = 'car'; S.car = v.id; S.ceoTask = task; G.closeAll(); G.news('The CEO drives to ' + (b.role === 'spot' ? task.where || 'the site' : where(b)) + '.', {quiet:true}); return 'ok'; };
// a building named in a sentence: “to the mairie of X”, “to La Feuille de la Faille”, “to the committee office”
const where = b => b.role === 'mairie' ? 'the mairie of ' + pn(b.home) : b.role === 'newspaper' ? 'La Feuille de la Faille' : b.role === 'house' || b.role === 'farm' ? G.buildingTitle(b).replace(/^A /, 'a ') : 'the ' + G.buildingTitle(b)[0].toLowerCase() + G.buildingTitle(b).slice(1);
G.where = where;
G.vehicleDone.ceoAt = () => { const S = G.S, t = S.ceoTask; S.ceoTask = null; if (t && CEO[t.kind]) CEO[t.kind](t); const car = S.vehicles.find(v => v.id === S.car), base = G.company('bureau'); if (!car || !base) return;
  S.vehicles.splice(S.vehicles.indexOf(car), 1); const v = G.vehicle('Company car (old 911)', G.vehPos(car).slice(0, 2), [base.cx + 6, base.cy + 8], {kind:'car', keep:true}); v.name = 'Company car'; v.tag = 'car'; S.car = v.id; };
const recentQuake = () => (G.S.geo && G.S.geo.quakes || []).some(q => q.M >= 2 && G.S.day - q.day < 90);
CEO.interview = t => { const v = V(), bad = recentQuake() || (G.S.geo && G.geo && G.geo.springs.some(q => (q.lvl || 0) >= 2)) || v.cris.some(c => c.st === 'open'); const r = t.req && v.req.find(q => q.id === t.req); if (r) closeReq(r, 'done');
  if (bad){ G.moodAll(-1, 'The CEO’s interview', {he:1.2, le:0.8, fa:0.8}); G.news('La Feuille prints the interview under the headline “Nothing to worry about”. Readers worry.', {paper:true}); }
  else { G.moodAll(1.5, 'The CEO’s interview', {he:1.2, le:0.8, fa:0.6}); G.news('La Feuille prints a long interview with the CEO. The photo is flattering, the questions less so. Readers are curious.', {paper:true}); } v.lastInterview = G.S.day; };
// ---- crises: quakes, spills, blowouts, swelling ground. Answered at La Feuille or at the mairie, by the CEO in person
const CRIS = {
  quake:{t:c => 'The earthquake, magnitude ' + (c.M || 0).toFixed(1), st:[
    {k:'sorry', t:'We are sorry. No pumping for four months, until independent experts have looked.', d:{he:3, le:3, fa:2}, act:'pause'},
    {k:'claims', t:'Every claim is paid, quickly and without quibbling.', d:{he:1, le:4, fa:3}, cost:() => Math.max(50, Math.round((G.S.geo.claims || 0)*0.2))},
    {k:'plan', t:'The traffic light worked exactly as planned.', d:{he:2, le:0, fa:0}, truth:c => !!c.plan},
    {k:'nature', t:'The Jura has always had earthquakes.', d:{he:-3, le:0, fa:1}, truth:c => !c.induced},
    {k:'evening', t:'An open evening with the seismological service.', d:{he:4, le:1, fa:0}, cost:() => 20}]},
  water:{t:() => 'The spring', st:[
    {k:'bottles', t:'Bottled water for every household until the spring runs clean.', d:{he:1, le:3, fa:3}, cost:() => 60},
    {k:'pipe', t:'A new pipe from the next clean spring, paid by the Company.', d:{he:3, le:4, fa:4}, cost:() => 800},
    {k:'harmless', t:'The traces are harmless.', d:{he:-2, le:1, fa:-2}, truth:() => false},
    {k:'samples', t:'Weekly samples, published in La Feuille.', d:{he:3, le:1, fa:2}, need:'water'}]},
  blowout:{t:() => 'The blowout', st:[
    {k:'sorry', t:'We apologise, and we pay every franc of the damage.', d:{he:2, le:3, fa:3}, cost:() => 300},
    {k:'inquiry', t:'An independent inquiry, published in full.', d:{he:4, le:1, fa:1}, cost:() => 100},
    {k:'nobody', t:'Nobody was hurt.', d:{he:-1, le:1, fa:-1}}]},
  swell:{t:() => 'The cracked houses', st:[
    {k:'repair', t:'Every crack is repaired by the Company, with a local builder.', d:{he:2, le:4, fa:3}, cost:() => 1000},
    {k:'unknown', t:'Nobody could have known the anhydrite was there.', d:{he:-2, le:-1, fa:-1}, truth:() => false},
    {k:'experts', t:'Geologists measure the rise every month, in public.', d:{he:3, le:1, fa:1}, need:'geologist'}]}};
G.crisis = c => { const v = V(); if (!v || !CRIS[c.kind]) return; const home = c.home ?? null, old = v.cris.find(q => q.st === 'open' && q.kind === c.kind && q.home === home);
  if (old){ old.until = Math.round(G.S.day) + 30; if (c.M) old.M = Math.max(old.M || 0, c.M); return old; }
  const cr = {id:'c' + (++v.n), kind:c.kind, home, M:c.M, induced:c.induced !== false, plan:c.plan, day:Math.round(G.S.day), until:Math.round(G.S.day) + 30, st:'open', pick:[]}; v.cris.push(cr);
  const nb = G.world.buildings.find(b => b.role === 'newspaper'), mb = home !== null ? bOf('mairie', home) : null;
  for (const [b, x] of [[nb, 'n'], [mb, 'm']]) if (b) G.S.marks.push({kind:'!', id:'mc' + cr.id + x, at:[b.cx, b.cy, b.z + (b.zt || 8) + 3], ref:'b' + b.id}); return cr; };
const closeCris = cr => { cr.st = 'done'; G.S.marks = G.S.marks.filter(m => !m.id.startsWith('mc' + cr.id)); };
G.on('day', () => { const v = V(); if (!v) return; for (const cr of v.cris) if (cr.st === 'open' && G.S.day > cr.until && G.S.ceoTask?.cr !== cr.id){ closeCris(cr); G.mood(cr.home, -4, 'The Company kept quiet'); G.moodAll(-1.5, 'The Company kept quiet');
  G.news('The Company says nothing about ' + CRIS[cr.kind].t(cr).toLowerCase() + '. La Feuille notices, and says so.', {paper:true}); }
  if (v.cris.length > 40) v.cris = v.cris.filter(c => c.st === 'open' || G.S.day - c.day < 400);
  for (const x of (v.exposed || []).slice()) if (G.S.day >= x.at){ v.exposed.splice(v.exposed.indexOf(x), 1); G.mood(x.home, -4, 'The Company’s word', {he:1.4, le:0.8, fa:1}); G.moodAll(-1.5, 'The Company’s word'); G.news('La Feuille checks what the CEO said about ' + x.what + ': “' + x.t + '” It was not true.', {paper:true}); } });
const crisHtml = (A, b) => { const v = V(), here = b.role === 'newspaper' ? v.cris.filter(c => c.st === 'open') : v.cris.filter(c => c.st === 'open' && c.home === b.home); let h = '';
  for (const cr of here){ const C = CRIS[cr.kind]; h += '<div class="sec"><h3 class="neg">Crisis: ' + esc(C.t(cr)) + '</h3><p class="muted" style="font-size:12px">Up to two statements. The CEO comes here to make them' + (b.role === 'newspaper' ? '; the whole valley reads them.' : '; the village hears them first.') + '</p>';
    for (const s of C.st){ const off = s.need && !G.S.staff.some(p => p.tr === s.need), c = s.cost ? s.cost() : 0; h += '<label style="display:block;font-size:13px;padding:2px 0' + (off ? ';opacity:.5' : '') + '"><input type="checkbox" data-a="' + A('st' + cr.id + s.k, () => { if (off) return 'That needs a ' + G.TRADES[s.need].n.toLowerCase() + '.'; const i = cr.pick.indexOf(s.k); if (i >= 0) cr.pick.splice(i, 1); else if (cr.pick.length < 2) cr.pick.push(s.k); else return 'Two statements at most.'; return 'ok'; }) + '"' + (cr.pick.includes(s.k) ? ' checked' : '') + (off ? ' disabled' : '') + '> “' + s.t + '”' + (c ? ' <span class="muted">' + fmt(c) + '</span>' : '') + '</label>'; }
    h += btn(A, 'go' + cr.id, G.S.ceoTask ? 'The CEO is out' : 'The CEO comes and says it', () => cr.pick.length ? G.ceoGo(b.id, {kind:'crisis', cr:cr.id, bid:b.id}) : 'Choose what to say.', 'main', !!G.S.ceoTask) + '</div>'; }
  return h; };
CEO.crisis = t => { const v = V(), cr = v.cris.find(c => c.id === t.cr), b = bById(t.bid); if (!cr || cr.st !== 'open') return; const C = CRIS[cr.kind], local = b.role === 'mairie';
  for (const k of cr.pick){ const s = C.st.find(q => q.k === k); if (!s) continue; const c = s.cost ? s.cost() : 0; if (c) G.book('Crisis: ' + C.t(cr).toLowerCase(), -c, b.role === 'newspaper' ? 'La Feuille' : G.buildingTitle(b));
    for (const h of homes()){ const f = local ? (h === cr.home ? 1.5 : 0.4) : 1; for (const g of GR) G.mood(h, s.d[g]*f*0.6, 'What the CEO said', g); }
    if (s.act === 'pause'){ v.noPump = G.S.day + 120; G.stopAllPumps && G.stopAllPumps(); } if (s.truth && !s.truth(cr)){ v.exposed = v.exposed || []; v.exposed.push({at:G.S.day + 60 + Math.round(Math.random()*140), home:cr.home, t:s.t, what:C.t(cr).toLowerCase()}); } }
  closeCris(cr); G.news('The CEO at ' + (b.role === 'newspaper' ? 'La Feuille de la Faille' : 'the mairie of ' + pn(b.home)) + ' about ' + C.t(cr).toLowerCase() + ': ' + cr.pick.map(k => '“' + C.st.find(q => q.k === k).t + '”').join(' '), {paper:true}); };
// ---- the windows of the valley's buildings
const reqHtml = (A, b) => { const v = V(); let h = '';
  for (const r of v.req.filter(q => q.bid === b.id)){ const R = REQ[r.k], idle = R.staff && G.S.staff.some(p => p.tr === R.staff && p.st === 'idle');
    h += '<div class="sec"><h3>A request</h3><p>' + R.ask + '</p>';
    if (R.pay) h += btn(A, 'pay' + r.id, 'Pay ' + fmt(R.pay), () => answer(r, 'pay'), 'main');
    if (R.gift) h += btn(A, 'now' + r.id, 'Yes, now · ' + fmt(GIFTS[R.gift].cost), () => answer(r, 'now'), 'main') + btn(A, 'pr' + r.id, 'Promise it', () => answer(r, 'promise'));
    if (R.staff) h += btn(A, 'now' + r.id, 'Send a ' + G.TRADES[R.staff].n.toLowerCase() + ' now', () => answer(r, 'now'), 'main', !idle) + btn(A, 'pr' + r.id, 'Promise it', () => answer(r, 'promise'));
    if (R.toggle) h += btn(A, 'yes' + r.id, 'Yes', () => answer(r, 'toggle'), 'main');
    if (R.ceo) h += btn(A, 'now' + r.id, 'The CEO goes', () => answer(r, 'now'), 'main', !!G.S.ceoTask);
    h += btn(A, 'no' + r.id, 'No', () => answer(r, 'no')) + '</div>'; }
  for (const p of v.prom.filter(q => q.bid === b.id)){ const R = REQ[p.k]; h += '<div class="sec"><p class="muted">The Company promised ' + R.p + ', ' + G.dur(G.S.day - p.made) + ' ago.</p>' +
    (R.gift ? btn(A, 'pg' + p.id, 'Place it · ' + fmt(GIFTS[R.gift].cost), () => placeGift(R.gift, p.home)) : R.staff ? btn(A, 'ps' + p.id, 'Send a ' + G.TRADES[R.staff].n.toLowerCase(), () => visit(R.staff, b, R.days, p.k), '', !G.S.staff.some(q => q.tr === R.staff && q.st === 'idle')) : '') + '</div>'; }
  return h; };
const giftsHtml = (A, h, only) => '<div class="sec"><h3>Gifts</h3>' + Object.keys(GIFTS).filter(k => !only || only.includes(k)).map(k => { const ok = giftOk(k, h); return '<div class="row"><span class="grow">' + GIFTS[k].n + ' <span class="muted">· ' + GIFTS[k].h + '</span></span>' + (ok === true ? btn(A, 'gift' + k, fmt(GIFTS[k].cost), () => placeGift(k, h), 'small') : '<span class="muted" style="font-size:12px">' + esc(ok) + '</span>') + '</div>'; }).join('') + '</div>';
const W = G.windows, emit = (b, A) => G.emitHtml('building:' + b.role, A, b);
W.mairie = b => ({wide:true, body:A => { const h = b.home, v = V(); let s = '<p>' + esc(v.mayors[h]) + ', ' + (h === 'town' ? 'mayor of the town' : 'mayor of the village') + ', receives you between two council meetings.</p>' + moodHtml(h) + reqHtml(A, b) + crisHtml(A, b);
  const waiting = ((G.S.geo && G.S.geo.sites) || []).filter(q => q.home === h && q.permit.mairie === 'wait'); if (waiting.length) s += '<div class="sec"><h3>Permits</h3>' + waiting.map(q => '<p>' + esc(q.name) + ': the council decides in about ' + G.dur(Math.max(1, q.permitAt - G.S.day)) + '.</p>').join('') + '</div>';
  return s + giftsHtml(A, h, h === 'town' ? ['benches', 'busstop', 'hall', 'uni'] : null) + emit(b, A); }});
W.church = b => ({body:A => { const v = V(), ruined = b.name === 'Church after a quake', repairing = b.name === 'Church under repair', chapel = b.name === 'Chapel';
  let s = '<p>' + (ruined ? 'The tower lies in the square. ' + esc(v.priest) + ' holds mass in the school gym.' : repairing ? 'Scaffolding, a crane, the bells in a shed. ' + esc(v.priest) + ' visits the builders daily.' : chapel ? 'Mass once a month. The bell is older than the canton.' : 'The bells ring on the hour. ' + esc(v.priest) + ', the priest, has views on drilling and keeps most of them to himself.') + '</p>' + reqHtml(A, b);
  if (ruined) s += '<div class="sec"><h3>Rebuilding</h3><p>Stone by stone, with the old bells: about six months.</p>' + btn(A, 'rebuild', 'Pay for it · ' + fmt(2500), () => rebuild(b), 'main') + '</div>'; return s + emit(b, A); }});
function rebuild(b){ if (b.name !== 'Church after a quake') return 'ok'; if (!G.pay(2500, 'Rebuilding the church', pn(b.home))) return 'That costs ' + fmt(2500) + '.'; setModel(b, 'Church under repair'); V().churchAt = {id:b.id, at:G.S.day + 180}; G.mood(b.home, 4, 'The Company rebuilds the church'); G.news('Scaffolding goes up around the church in ' + pn(b.home) + '. The Company pays.', {paper:true}); return 'ok'; }
G.on('day', () => { const c = V() && V().churchAt; if (c && G.S.day >= c.at){ const b = bById(c.id); V().churchAt = null; if (b){ setModel(b, 'Church'); G.mood(b.home, 5, 'The church stands again'); G.news('The church in ' + pn(b.home) + ' stands again. The bells ring flat, as before.', {paper:true}); } } });
const setModel = (b, name) => { b.name = name; G.S.changes.push({t:'model', id:b.id, name}); G.world.touch(b.x0 - 4, b.y0 - 4, b.x1 + 4, b.y1 + 4); };
W.shop = b => ({body:A => '<p>' + (b.home === 'town' ? 'The épicerie: cheese, absinthe for the tourists, and every opinion in town.' : 'Bread in the morning, the newspaper, the gossip about your rigs.') + '</p>' + (V().local ? '<p class="muted">The crews buy their lunch here. ' + btn(A, 'loc0', 'Stop it', () => { V().local = false; G.mood(b.home, -1, 'The crews stopped coming'); return 'ok'; }, 'small') + '</p>' : '<p class="muted">The crews drive to town for lunch.</p>' + btn(A, 'loc1', 'Crews buy here · ' + fmt(15) + ' a month', () => { V().local = true; G.mood(b.home, 1, 'Sandwiches from the shop'); return 'ok'; }, 'small')) + reqHtml(A, b) + emit(b, A)});
W.school = b => ({body:A => '<p>Children, a playground, a headteacher with views on what the children should know about the ground under them.</p>' + reqHtml(A, b) + giftsHtml(A, homeOf(b), ['hall', 'uni']) + emit(b, A)});
W.farm = b => ({body:A => { const h = homeOf(b), m = V().mood[h]; return '<p>' + ['Cows, a tractor, the smell of manure. The farmer counts every truck that passes.', 'The farmer waves, or does not, depending on the week.', 'Hay drying, a dog, a sign: “Pas de forage chez nous”.'][b.id % 3] + '</p><div class="kv"><span>Farmers around ' + esc(pn(h)) + '</span><span>' + bar(m.fa) + ' ' + WORD(m.fa) + '</span></div>' + reqHtml(A, b) + emit(b, A); }});
W.newspaper = b => ({wide:true, body:A => { const v = V(), paper = G.S.news.filter(n => n.paper).slice(0, 5); let s = '<p>' + esc(v.editor) + ', editor in chief, writes everything down.</p>' + (paper.length ? '<div class="news">' + paper.map(n => '<p><i>' + G.dateStr(n.d) + '</i>' + esc(n.t) + '</p>').join('') + '</div>' : '<p class="muted">Nothing about the Company yet.</p>');
  s += reqHtml(A, b) + crisHtml(A, b); if (!v.req.some(r => r.bid === b.id) && (!v.lastInterview || G.S.day - v.lastInterview > 90)) s += '<div class="sec">' + btn(A, 'intv', 'Offer an interview with the CEO', () => G.ceoGo(b.id, {kind:'interview', bid:b.id}), '', !!G.S.ceoTask) + '</div>'; return s + emit(b, A); }});
W.police = b => ({body:A => '<p>The gendarmerie: three cars, a van, and a riot police bus that comes from the capital when asked.</p>' + reqHtml(A, b) + emit(b, A)});
W.canton = b => ({body:A => '<p>The canton’s offices, and on the second floor the federal office. Permits, grants, the concession, the geology office.</p>' + emit(b, A)});
W.committee = b => ({body:A => '<p>The office of the referendum committee: posters, a kettle, a photocopier that works.</p>' + emit(b, A)});
W.station = b => ({body:A => '<p>Trains to the capital every hour, to the other villages twice a day.</p>' + emit(b, A)});
W.fountain = b => ({body:A => { const sp = G.geo && G.geo.springs.find(q => q.home === 'town'); return '<p>The town’s fountain. The water comes from the spring above the town' + (sp && sp.lvl >= 2 ? ': a sign says not to drink it.' : sp && sp.lvl === 1 ? ': a little cloudy this month.' : '.') + '</p>' + emit(b, A); }});
W.house = b => ({body:A => { const h = homeOf(b); return '<p>' + ['Somebody lives here. They will have an opinion.', 'Geraniums, a cat, a satellite dish.', 'Curtains move as you pass.', 'Washing on the line; somebody works shifts.'][b.id % 4] + '</p><p class="muted">' + esc(pn(h)) + ' is ' + WORD(G.moodOf(h)) + '.</p>' + emit(b, A); }});
})();
