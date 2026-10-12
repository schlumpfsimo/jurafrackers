/* Jurafrackers 2.0 — the opposition. The referendum committee grows with the valley's anger: rumours to answer, banners in
   the gardens, manure blockades and burning barricades on the roads to the sites, camps that warn before they burn a site,
   marches from the town square to a rig. Police come from the gendarmerie; the CEO debates at the committee office. */
(function(){
'use strict';
const G = globalThis.G, {fmt, esc, clamp, lerp} = G;
const O = () => G.S.op;
const pn = h => G.placeName(h) || 'the valley';
const btn = (A, key, label, fn, cls, off) => '<button class="btn ' + (cls || '') + '" data-a="' + A(key, fn) + '"' + (off ? ' disabled' : '') + '>' + label + '</button>';
const bRole = r => G.world.buildings.find(b => b.role === r);
const site = id => G.geoById(id);
const idle = tr => G.S.staff.some(p => p.tr === tr && p.st === 'idle');
const avgMood = () => { let t = 0, w = 0; for (const h of G.homes()){ const P = G.pop(h); t += G.moodOf(h)*P; w += P; } return t/w; };
G.on('world', () => { const S = G.S; if (!S.op) S.op = {str:8, n:0, leader:G.personName(Math.random() < 0.5), rum:[], blocks:[], camps:[], marches:[], last:{}}; banners(); });
// ---- the committee's strength: how angry the valley is, how much the Company does, what went wrong lately
G.on('month', () => { const o = O(), S = G.S; if (!o || !S.geo || S.phase !== 'play') return; const active = S.geo.sites.filter(s => s.rig).length, quakes = S.geo.quakes.filter(q => q.M >= 2 && S.day - q.day < 180).length, dirty = G.geo.springs.filter(q => (q.lvl || 0) >= 2).length;
  const p = (55 - avgMood())*2.2 + 5*active + 10*quakes + 8*dirty, was = o.str; o.str = clamp(o.str + (p - o.str)*0.25, 0, 100);
  if (was < 25 && o.str >= 25 && !o.founded){ o.founded = true; G.news('The referendum committee opens its office in town. ' + o.leader + ' speaks for it: “Non au forage dans nos vallées.”', {paper:true}); }
  banners(); spawn(); });
G.oppStr = () => O() ? O().str : 0;
// ---- banners in the gardens of unhappy villages
let BAN = [];
function banners(){ const o = O(); if (!o || !G.R) return; for (const st of BAN) G.R.removeStatic(st); BAN = []; const W = G.world;
  for (const h of G.homes()){ const m = G.moodOf(h), n = m < 44 ? Math.min(8, Math.round((44 - m)/2.5)) : 0; if (!n) continue; const houses = W.buildings.filter(b => b.role === 'house' && b.home === h).sort((a, b) => ((a.id*7919) % 101) - ((b.id*7919) % 101));
    let k = 0; for (const b of houses){ if (k >= n) break; const r = W.nearestRoad(b.cx, b.cy); if (!r || r.d < 3) continue; const dx = (r.x - b.cx)/r.d, dy = (r.y - b.cy)/r.d, half = Math.max(b.x1 - b.x0, b.y1 - b.y0)/2;
      const x = b.cx + dx*(half + 2), y = b.cy + dy*(half + 2); if (W.probe(x, y, 0.8) || W.roadNear(x, y, 1.6) || W.inSite(x, y, 1)) continue; BAN.push(G.R.addStatic({kind:'p', m:ART.bannerModel(k % 3 === 2 ? 'STOP' : 'NON'), x, y, z:W.hb(x, y), view:W.view16(-dy, dx), noPad:true})); k++; } } }
// ---- rumours: a "?" at a house; answered by the liaison over coffee, by facts in La Feuille, or not at all
const RUM = ['They say the Company will drill under the school.', 'They say the water in {v} tastes of diesel since the trucks came.', 'They say the earthquakes are planned for Tuesdays.', 'They say the CEO’s car belongs to the canton.',
  'They say the cows’ milk will glow.', 'They say a well in the next valley caught fire and nobody was told.', 'They say the Company will leave the holes and go back to Zurich.', 'They say fracking means breaking the mountain with dynamite.',
  'They say the geologists are paid per earthquake.', 'They say the houses near the rigs will be worth nothing.', 'They say the Company bought the mayor of {v} a new car.', 'They say the hot water will be sold to the canton of Berne.'];
G.on('day', d => { const o = O(); if (!o || G.S.phase !== 'play' || d % 7) return; for (const r of o.rum.slice()) if (G.S.day > r.until){ dropRum(r); G.mood(r.home, -1.5, 'A rumour nobody answered'); }
  if (o.rum.length >= 2 || Math.random() > o.str/400) return; const hs = G.homes(), h = hs[Math.floor(Math.random()*hs.length)], houses = G.world.buildings.filter(b => b.role === 'house' && b.home === h); if (!houses.length) return;
  const b = houses[Math.floor(Math.random()*houses.length)], r = {id:'q' + (++o.n), home:h, bid:b.id, t:RUM[Math.floor(Math.random()*RUM.length)].replace('{v}', pn(h)), until:Math.round(G.S.day) + 45}; o.rum.push(r);
  G.S.marks.push({kind:'?', id:'mq' + r.id, at:[b.cx, b.cy, b.z + (b.zt || 7) + 2], ref:r.id}); });
const dropRum = r => { const o = O(); o.rum.splice(o.rum.indexOf(r), 1); G.S.marks = G.S.marks.filter(m => m.id !== 'mq' + r.id); };
G.on('mark', m => { if (m.id && m.id.startsWith('mq')){ const r = O().rum.find(q => q.id === m.ref); if (r) openRumour(r); } });
function openRumour(r){ const b = G.world.buildings.find(q => q.id === r.bid); G.openWin('rum' + r.id, {title:'A rumour in ' + pn(r.home), sub:'heard at the shop, repeated at the café', at:() => [b.cx, b.cy, b.z + (b.zt || 7) + 2], body:A =>
  '<p>“' + esc(r.t) + '”</p>' + (r.going ? '<p class="muted">The liaison is on the way with a box of croissants.</p>' : btn(A, 'liai', 'The liaison has coffee with the neighbours', () => { if (!idle('liaison')) return 'No idle community liaison at the Bureau.'; r.going = true; return G.visit('liaison', b, 2, 'rumour:' + r.id); }, 'main', !idle('liaison')) +
  btn(A, 'paper', 'Facts in La Feuille · ' + fmt(10), () => { if (!G.pay(10, 'Notices in La Feuille', 'La Feuille')) return 'That costs ' + fmt(10) + '.'; dropRum(r); G.mood(r.home, 1, 'Facts in La Feuille', {he:1, le:0.2, fa:0.2}); G.closeWin('rum' + r.id); return 'ok'; }))}); }
G.on('visitDone', (vi, b, h) => { if (!String(vi.k).startsWith('rumour:')) return; const r = O().rum.find(q => q.id === vi.k.slice(7)); if (r){ const p = G.S.staff.find(q => q.id === vi.p); dropRum(r); G.mood(h, 1.2*(p && (p.certs || []).includes('talk') ? 1.5 : 1), 'Coffee with the Company’s liaison', {he:0.8, le:1.2, fa:1}); } });
// ---- what the committee does next, now and then
function spawn(){ const o = O(), S = G.S, sites = S.geo.sites.filter(s => s.rig && !s.burnt); if (!sites.length) return;
  const town = G.homeCentre('town'), near = sites.slice().sort((a, b) => Math.hypot(a.x - town[0], a.y - town[1]) - Math.hypot(b.x - town[0], b.y - town[1]))[0];
  if (o.str >= 35 && !o.blocks.length && S.day - (o.last.block || -999) > 120 && Math.random() < 0.3) block(sites[Math.floor(Math.random()*sites.length)], o.str >= 60 && Math.random() < 0.5 ? 'fire' : 'manure');
  if (o.str >= 50 && !o.marches.length && S.day - (o.last.march || -999) > 120 + Math.random()*120) march(near);
  const angry = sites.filter(s => G.moodOf(s.home) < 38 && !o.camps.some(c => c.site === s.id)); if (o.str >= 70 && angry.length && !o.camps.length && S.day - (o.last.camp || -999) > 240 && Math.random() < 0.3) camp(angry[0]); }
// ---- road blocks: a tractor with manure, or a burning barricade, on the way to a site; the Company's vehicles wait there
const segD = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx*dx + dy*dy, t = L ? clamp(((px - a[0])*dx + (py - a[1])*dy)/L, 0, 1) : 0; return Math.hypot(px - a[0] - dx*t, py - a[1] - dy*t); };
G.hold = (v, dd) => { const o = O(); if (!o || !o.blocks.length || v.tag === 'police') return false; const a = G.vehPos(v), s0 = v.s; v.s = Math.min(v.len, v.s + v.speed*(dd || 0)); const b = G.vehPos(v); v.s = s0;
  for (const k of o.blocks) if (segD(k.x, k.y, a, b) < 6) return true; return false; };
function block(s, kind){ const o = O(), r = G.world.nearestRoad(s.x, s.y); if (!r) return; const d = Math.hypot(s.x - r.x, s.y - r.y), f = d > 12 ? Math.min(0.5, 8/d) : 0, x = r.x + (s.x - r.x)*f, y = r.y + (s.y - r.y)*f;
  const k = {id:'k' + (++o.n), kind, site:s.id, home:s.home, x, y, view:G.world.view16(s.x - r.x || 1, s.y - r.y), until:Math.round(G.S.day) + (kind === 'fire' ? 5 + Math.round(Math.random()*4) : 12 + Math.round(Math.random()*8))}; o.blocks.push(k); o.last.block = G.S.day;
  G.S.marks.push({kind:'!', id:'mb' + k.id, at:[x, y, G.world.hb(x, y) + 4], ref:k.id});
  G.news(kind === 'fire' ? 'A burning barricade on the road to ' + s.name + '. Tyres, pallets, a banner: “Ni ici ni ailleurs”.' : 'A tractor with a manure spreader stands across the road to ' + s.name + '. The farmer is having lunch in the cab.', {paper:kind === 'fire'}); }
const dropBlock = k => { const o = O(); o.blocks.splice(o.blocks.indexOf(k), 1); G.S.marks = G.S.marks.filter(m => m.id !== 'mb' + k.id); };
G.on('day', () => { const o = O(); if (!o) return; for (const k of o.blocks.slice()) if (G.S.day >= k.until){ dropBlock(k); G.news(k.kind === 'fire' ? 'The barricade on the road to ' + site(k.site).name + ' has burnt out.' : 'The tractor leaves the road to ' + site(k.site).name + '. The manure stays.', {quiet:true}); } });
G.on('mark', m => { if (m.id && m.id.startsWith('mb')){ const k = O().blocks.find(q => q.id === m.ref); if (k) openBlock(k); } });
function openBlock(k){ const s = site(k.site); G.openWin('blk' + k.id, {title:k.kind === 'fire' ? 'A burning barricade' : 'A manure blockade', sub:'on the road to ' + s.name, at:() => [k.x, k.y, G.world.hb(k.x, k.y) + 3], body:A => {
  let h = '<p>' + (k.kind === 'fire' ? 'Tyres and pallets burn across the road. Lorries for the site wait behind it.' : 'A tractor and a full manure spreader, parked across the road. Lorries for the site wait behind it.') + ' It goes away by itself in about ' + G.dur(Math.max(1, k.until - G.S.day)) + '.</p>';
  if (k.police) return h + '<p class="muted">The gendarmerie is on its way.</p>';
  h += k.kind === 'fire' ? btn(A, 'riot', 'Riot police clear it · ' + fmt(120), () => sendPolice('riot', k, 120), 'main') : btn(A, 'pol', 'The gendarmerie clears it · ' + fmt(20), () => sendPolice('car', k, 20), 'main') + btn(A, 'talk', 'The liaison talks to the farmer', () => { if (!idle('liaison')) return 'No idle community liaison at the Bureau.'; const f = G.world.buildings.filter(b => b.role === 'farm').sort((a, b) => Math.hypot(a.cx - k.x, a.cy - k.y) - Math.hypot(b.cx - k.x, b.cy - k.y))[0]; k.police = 'talk'; return G.visit('liaison', f, 2, 'block:' + k.id); }, '', !idle('liaison'));
  return h; }}); }
G.on('visitDone', (vi, b, h) => { if (!String(vi.k).startsWith('block:')) return; const k = O().blocks.find(q => q.id === vi.k.slice(6)); if (!k) return; k.police = null;
  if (G.moodOf(k.home) >= 35){ dropBlock(k); G.mood(k.home, 1, 'The liaison talked to the farmer', 'fa'); G.news('After two coffees and a schnapps the farmer moves the tractor.', {quiet:true}); } else G.news('The farmer listens to the liaison, nods, and stays where he is.', {quiet:true}); });
// ---- police from the gendarmerie: a car, a van or the riot police bus; they drive back afterwards
const PMOD = {car:'Police car', van:'Police van', riot:'Riot police bus'};
function sendPolice(kind, target, cost, task){ const gd = bRole('police'); if (!gd) return 'No gendarmerie.'; if (G.suitAt && G.suitAt('police')) cost = Math.round(cost*0.7); if (!G.pay(cost, 'Police operations', 'Gendarmerie')) return 'That costs ' + fmt(cost) + '.';
  target.police = kind; G.vehicle(PMOD[kind], [gd.cx, gd.cy], [target.x, target.y], {kind:'van', tag:'police', done:'policeIn', arg:{k:task || 'clear', id:target.id, kind}}); G.closeAll(); G.news('The gendarmerie sends ' + (kind === 'riot' ? 'the riot police' : 'a patrol') + '.', {quiet:true}); return 'ok'; }
const POL = {};
G.vehicleDone.policeIn = (a, v) => { const o = O(), gd = bRole('police'); if (POL[a.k]) POL[a.k](a); if (gd) G.vehicle(PMOD[a.kind], G.vehPos(v).slice(0, 2), [gd.cx, gd.cy], {kind:'van', tag:'police'}); };
POL.clear = a => { const o = O(), k = o.blocks.find(q => q.id === a.id); if (!k) return; dropBlock(k); if (a.kind === 'riot'){ G.mood(k.home, -4, 'Riot police on the road', {he:1.2, le:0.6, fa:1}); G.moodAll(-1, 'Riot police in the valley', {he:1.4, le:0.4, fa:0.8}); G.news('Riot police clear the barricade on the road to ' + site(k.site).name + '. Batons, smoke, a photographer.', {paper:true}); }
  else { G.mood(k.home, -2, 'The gendarmes towed a tractor', 'fa'); G.news('The gendarmes have the tractor towed. The farmer will remember.', {quiet:true}); } };
// ---- camps: tents beside a site; after a while a warning (the game pauses), two weeks later the site burns unless cleared
function camp(s){ const o = O(), m = G.world.model('Protest camp'); let at = null; for (let r = 26; r < 60 && !at; r += 6) for (let a = 0; a < 16; a++){ const x = s.x + Math.cos(a*0.39)*r, y = s.y + Math.sin(a*0.39)*r; if (typeof G.world.canBuild(x, y, m.W + 2, m.D + 2, 0) !== 'string'){ at = [x, y]; break; } } if (!at) return;
  const c = {id:'p' + (++o.n), site:s.id, home:s.home, x:at[0], y:at[1], warnAt:Math.round(G.S.day) + 10 + Math.round(Math.random()*10), burnAt:null}; o.camps.push(c); o.last.camp = G.S.day; G.S.marks.push({kind:'!', id:'mt' + c.id, at:[c.x, c.y, G.world.hb(c.x, c.y) + 5], ref:c.id});
  G.news('Tents go up beside ' + s.name + '. A camp: banners, a kitchen, a guitar.', {paper:true}); }
const dropCamp = c => { const o = O(); o.camps.splice(o.camps.indexOf(c), 1); G.S.marks = G.S.marks.filter(m => m.id !== 'mt' + c.id); };
G.on('day', () => { const o = O(); if (!o) return; for (const c of o.camps.slice()){ const s = site(c.site); if (!s){ dropCamp(c); continue; }
  if (!c.burnAt && G.S.day >= c.warnAt){ const sec = G.crewAt(s, 'security').length; c.burnAt = Math.round(G.S.day) + 14*(sec ? 2 : 1); G.news('The camp beside ' + s.name + ' gives the Company two weeks' + (sec ? ' (four, with the guards at the gate)' : '') + '. Then the site burns.', {paper:true}); G.setSpeed(0); G.toast('Warning: the camp beside ' + s.name + ' will burn the site in ' + (sec ? 'four' : 'two') + ' weeks.', 6000); }
  if (c.burnAt && G.S.day >= c.burnAt){ dropCamp(c); burnSite(s); } } });
G.on('mark', m => { if (m.id && m.id.startsWith('mt')){ const c = O().camps.find(q => q.id === m.ref); if (c) openCamp(c); } });
function openCamp(c){ const s = site(c.site); G.openWin('camp' + c.id, {title:'The camp beside ' + s.name, sub:'tents, banners, a guitar', at:() => [c.x, c.y, G.world.hb(c.x, c.y) + 5], body:A => {
  let h = '<p>' + (c.burnAt ? 'They have given the Company until ' + G.dateStr(c.burnAt) + '. Then the site burns.' : 'They cook, sing, and watch the rig. Nobody has said what comes next.') + '</p><p class="muted" style="font-size:12px">Security guards on the site make it last twice as long.</p>';
  if (c.police) return h + '<p class="muted">The riot police are on their way.</p>';
  return h + btn(A, 'riot', 'Riot police clear the camp · ' + fmt(180), () => sendPolice('riot', c, 180, 'camp'), 'main') + btn(A, 'talk', 'The liaison talks to them', () => { if (!idle('liaison')) return 'No idle community liaison at the Bureau.'; const b = G.world.buildings.filter(q => q.role === 'house' && q.home === c.home)[0] || G.world.buildings[0]; c.police = 'talk'; return G.visit('liaison', b, 3, 'camp:' + c.id); }, '', !idle('liaison')); }}); }
POL.camp = a => { const c = O().camps.find(q => q.id === a.id); if (!c) return; dropCamp(c); G.mood(c.home, -6, 'Riot police cleared the camp', {he:1.3, le:0.7, fa:1}); G.moodAll(-2, 'Riot police in the valley', {he:1.4, le:0.4, fa:0.8}); O().str = clamp(O().str + 4, 0, 100); G.news('At dawn the riot police clear the camp beside ' + site(c.site).name + '. By noon the tents are in a skip, by evening the photos are everywhere.', {paper:true}); };
G.on('visitDone', (vi, b, h) => { if (!String(vi.k).startsWith('camp:')) return; const c = O().camps.find(q => q.id === vi.k.slice(5)); if (!c) return; c.police = null;
  if (G.moodOf(c.home) >= 32){ dropCamp(c); G.mood(c.home, 1.5, 'The camp packed up after talks'); G.news('After three evenings of talks the camp beside ' + site(c.site).name + ' packs up. The guitar stays a little longer.', {paper:true}); } else G.news('The campers listen to the liaison politely and stay.', {quiet:true}); });
function burnSite(s){ const S = G.S, r = s.rig ? G.geoById(s.rig) : null; s.burnt = true; s.burning = S.day + 12;
  if (r){ if (r.own) G.book('Destroyed rig', 0, s.name); else G.book('Destroyed rig: the leasing company’s bill', -4000, s.name); S.geo.rigs.splice(S.geo.rigs.indexOf(r), 1); s.rig = null; }
  for (const id of s.wells){ const wl = G.geoById(id); if (wl && !wl.done){ wl.going = false; wl.burnt = true; } } for (const p of G.crewAt(s)){ p.st = 'idle'; p.at = null; }
  G.showSite(s); O().str = clamp(O().str - 12, 0, 100); G.moodAll(1, 'The camp went too far', {he:0.6, le:1.2, fa:0.4});
  G.news('Night fire at ' + s.name + '. The rig burns down to its frame; the crew got out in time. The committee says it had nothing to do with it.', {paper:true}); }
G.on('dyn', dyn => { const S = G.S; if (!S.geo) return; for (const s of S.geo.sites) if (s.burnt && !s.rig){ dyn.push({m:G.world.model('Destroyed rig'), view:s.view, x:s.x, y:s.y, z:G.world.hb(s.x, s.y)}); if (S.day < (s.burning || 0)){ dyn.push({m:G.world.model('Fire'), view:0, x:s.x + 2, y:s.y + 1, z:G.world.hb(s.x, s.y)}); dyn.push({m:G.world.model('Smoke column'), view:0, x:s.x, y:s.y, z:G.world.hb(s.x, s.y) + 6}); } } });
// ---- marches: from the town square to the nearest rig, slowly; work stops while they stand there
const WALK = 22;
function march(s){ const o = O(), sq = G.world.square || G.homeCentre('town'), pts = G.world.route([sq[0], sq[1]], [s.x, s.y]) || [[sq[0], sq[1]], [s.x, s.y]];
  const m = {id:'w' + (++o.n), site:s.id, home:'town', pts:pts.map(p => [p[0], p[1]]), s:0, n:10 + Math.round(o.str/6), stage:'walk', until:0}; o.marches.push(m); o.last.march = G.S.day;
  G.news('A march leaves the town square for ' + s.name + ': ' + m.n*12 + ' people, drums, a banner at the front.', {paper:true}); }
const mlen = m => { let L = 0; for (let i = 1; i < m.pts.length; i++) L += Math.hypot(m.pts[i][0] - m.pts[i - 1][0], m.pts[i][1] - m.pts[i - 1][1]); return L; };
const mAt = (m, s) => { const P = m.pts; for (let i = 1; i < P.length; i++){ const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s <= L || i === P.length - 1){ const t = L ? clamp(s/L, 0, 1) : 1; return [lerp(P[i - 1][0], P[i][0], t), lerp(P[i - 1][1], P[i][1], t), P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]]; } s -= L; } const p = P[P.length - 1]; return [p[0], p[1], 1, 0]; };
G.marchAt = s => (O() && O().marches || []).some(m => m.site === s.id && m.stage === 'stand');
G.on('tick', dd => { const o = O(); if (!o) return; for (const m of o.marches.slice()){ const L = mlen(m);
  if (m.stage === 'walk'){ m.s = Math.min(L, m.s + WALK*dd*(m.pushed ? 1.6 : 1)); if (m.s >= L){ m.stage = 'stand'; m.until = G.S.day + 5 + Math.round(Math.random()*5); const s = site(m.site); G.S.marks.push({kind:'!', id:'mw' + m.id, at:[s.x, s.y, G.world.hb(s.x, s.y) + 24], ref:m.id}); G.news('The march stands at ' + s.name + '. The rig is silent.', {paper:true}); G.mood('town', -1, 'The march to the rig', {he:1, le:0.5, fa:1}); } }
  else if (m.stage === 'stand' && G.S.day >= m.until) goBack(m);
  else if (m.stage === 'back'){ m.s = Math.max(0, m.s - WALK*dd*(m.pushed ? 1.6 : 1)); if (m.s <= 0){ o.marches.splice(o.marches.indexOf(m), 1); } } } });
const goBack = (m, why) => { m.stage = 'back'; G.S.marks = G.S.marks.filter(q => q.id !== 'mw' + m.id); if (!why) G.news('The march walks back to town, singing a little less.', {quiet:true}); };
G.on('mark', m => { if (m.id && m.id.startsWith('mw')){ const w = O().marches.find(q => q.id === m.ref); if (w) openMarch(w); } });
function openMarch(m){ const s = site(m.site); G.openWin('march' + m.id, {title:'The march at ' + s.name, sub:m.n*12 + ' people from town', at:() => [s.x, s.y, G.world.hb(s.x, s.y) + 10], body:A => {
  let h = '<p>They stand at the gate with drums and a banner. While they are here the rig does not turn. They mean to stay about ' + G.dur(Math.max(1, m.until - G.S.day)) + '.</p>';
  if (m.police) return h + '<p class="muted">' + (m.police === 'ceo' ? 'The CEO is on the way.' : 'The riot police are on their way.') + '</p>';
  return h + btn(A, 'riot', 'Riot police walk them back · ' + fmt(100), () => { const at = {id:m.id, x:s.x, y:s.y}; const r = sendPolice('riot', at, 100, 'march'); if (r === 'ok') m.police = 'riot'; return r; }, 'main') + btn(A, 'ceo', 'The CEO speaks to them', () => { const r = G.ceoGo(null, {kind:'march', id:m.id, where:'the march at ' + s.name}, [s.x, s.y]); if (r === 'ok') m.police = 'ceo'; return r; }, '', !!G.S.ceoTask); }}); }
POL.march = a => { const m = O().marches.find(q => q.id === a.id); if (!m) return; m.pushed = true; m.police = null; goBack(m, true); G.mood('town', -3, 'Riot police pushed the march back', {he:1.3, le:0.6, fa:1}); G.moodAll(-1, 'Riot police in the valley', {he:1.2, le:0.3, fa:0.8}); G.news('Riot police walk the march back to town, shield to shoulder. Nobody is hurt; everybody films it.', {paper:true}); };
G.CEO.march = t => { const m = O().marches.find(q => q.id === t.id); if (!m) return; m.police = null; if (G.moodOf('town') >= 40){ goBack(m, true); G.mood('town', 1.5, 'The CEO spoke to the march'); G.news('The CEO climbs on a crate and talks to the march for an hour. They walk back early, still disagreeing.', {paper:true}); }
  else { G.mood('town', -1, 'The CEO was booed'); G.news('The CEO tries to speak to the march and is drowned out by the drums.', {paper:true}); } };
// what the opposition looks like: tractors and barricades, camps, the march in two columns, riot police behind it
const PEOPLE = ['Protester with sign', 'Protester with sign (2)', 'Villager (woman)', 'Villager (man), elderly', 'Farmer', 'Protester with sign'];
G.on('dyn', dyn => { const o = O(); if (!o) return; const W = G.world, t = performance.now()/1000;
  for (const k of o.blocks){ const z = W.hb(k.x, k.y); if (k.kind === 'fire'){ dyn.push({m:W.model('Burning barricade'), view:k.view, x:k.x, y:k.y, z}); dyn.push({m:W.model('Smoke column'), view:0, x:k.x, y:k.y, z:z + 3}); for (let i = 0; i < 4; i++) dyn.push({m:W.model(PEOPLE[i]), view:k.view, x:k.x + (i - 1.5)*1.2, y:k.y + 2.5, z}); } else dyn.push({m:W.model('Tractor with manure spreader'), view:(k.view + 4) % 16, x:k.x, y:k.y, z}); }
  for (const c of o.camps) dyn.push({m:W.model('Protest camp'), view:0, x:c.x, y:c.y, z:W.hb(c.x, c.y)});
  for (const m of o.marches){ const L = mlen(m), back = m.stage === 'back', [lx, ly, dx, dy] = mAt(m, m.s), dl = Math.hypot(dx, dy) || 1, fx = dx/dl, fy = dy/dl, view = W.view16(back ? -fx : fx, back ? -fy : fy);
    for (let i = 0; i < m.n; i++){ let x, y; if (m.stage === 'stand'){ const row = Math.floor(i/5), col = i % 5; x = lx - fx*(row*1.3 + 6) + fy*(col - 2)*1.2; y = ly - fy*(row*1.3 + 6) - fx*(col - 2)*1.2; }
      else { const p = mAt(m, back ? Math.min(L, m.s + Math.floor(i/2)*1.4) : Math.max(0, m.s - Math.floor(i/2)*1.4)), q = Math.hypot(p[2], p[3]) || 1; x = p[0] + (i % 2 ? 0.6 : -0.6)*(-p[3]/q); y = p[1] + (i % 2 ? 0.6 : -0.6)*(p[2]/q); }
      const bob = m.stage === 'stand' ? 0 : Math.abs(Math.sin(t*6 + i))*0.08; dyn.push({m:W.model(i < 2 ? 'Drummers in the march' : PEOPLE[i % PEOPLE.length]), view, x, y, z:W.hb(x, y) + bob}); }
    if (m.pushed && back){ const p = mAt(m, Math.min(L, m.s + Math.ceil(m.n/2)*1.4 + 3)); dyn.push({m:W.model('Riot police line: advancing'), view, x:p[0], y:p[1], z:W.hb(p[0], p[1])}); } } });
// ---- the committee office: the leader, the strength in words, a public debate every half year
G.on('html:building:committee', (A, b) => { const o = O(); if (!o) return ''; const s = o.str, word = s < 20 ? 'a handful of people and a kettle' : s < 40 ? 'busy evenings, a mailing list' : s < 60 ? 'a full office, posters in every village' : s < 80 ? 'a movement' : 'the whole valley, it seems';
  let h = '<p>' + esc(o.leader) + ' runs it. Right now: ' + word + '.</p>'; const can = !o.lastDebate || G.S.day - o.lastDebate > 180;
  h += '<div class="sec"><h3>A public debate</h3>' + (can ? '<p class="muted">The CEO and ' + esc(o.leader) + ', on stage in the committee’s hall. What happened in the valley decides how it goes.</p>' + btn(A, 'deb', 'The CEO accepts', () => G.ceoGo(b.id, {kind:'debate', bid:b.id}), 'main', !!G.S.ceoTask) : '<p class="muted">The last one was ' + G.dur(G.S.day - o.lastDebate) + ' ago. Twice a year is plenty.</p>') + '</div>'; return h; });
G.CEO.debate = () => { const o = O(), S = G.S; o.lastDebate = S.day; let score = 0; score += (S.heat > 0 ? 3 : 0) - 3*S.geo.quakes.filter(q => q.M >= 2 && S.day - q.day < 365).length - 3*G.geo.springs.filter(q => (q.lvl || 0) >= 2).length;
  score += S.val.gifts.length*0.8 - (S.val.cris.filter(c => c.st === 'done' && S.day - c.day < 365).length) + (avgMood() - 50)/5;
  const d = clamp(score, -4, 4); G.moodAll(d*0.6, 'The public debate', {he:1.4, le:0.9, fa:0.6}); o.str = clamp(o.str - d*2, 0, 100);
  G.news(d > 1 ? 'The debate goes the Company’s way: the CEO has numbers, the committee has slogans. Even ' + o.leader + ' laughs once.' : d < -1 ? 'The debate is a disaster for the Company. ' + o.leader + ' reads the list of what went wrong; the hall applauds every line.' : 'The debate ends in a draw. Everybody claims victory in La Feuille.', {paper:true}); };
// ---- the gendarmerie: what the police are doing
G.opp = {block, camp, march, banners, burnSite};   // for tests
G.on('html:building:police', () => { const o = O(); if (!o) return ''; const n = G.S.vehicles.filter(v => v.tag === 'police').length; return n ? '<p class="muted">' + n + (n === 1 ? ' vehicle is' : ' vehicles are') + ' out for the Company.</p>' : ''; });
})();
