/* Jurafrackers 2.0 — how it ends. The campaign in the last year and the vote in year ten (won or lost); the concession lapses
   if nothing was built; the Company can be wound up; bankruptcy; the lender's raid. And, if the valley is pushed far enough,
   something nobody mentions until it happens. */
(function(){
'use strict';
const G = globalThis.G, {fmt, esc, clamp, lerp} = G;
const E = () => G.S.end;
G.on('world', () => { if (!G.S.end) G.S.end = {low:0, stage:0, stageAt:0, broke:0, posters:0, halls:[], fete:false}; });
const avgMood = () => { let t = 0, w = 0; for (const h of G.homes()){ const P = G.pop(h); t += G.moodOf(h)*P; w += P; } return t/w; };
// ---- the end of a game: a front page of La Feuille, the numbers, a new valley
const PIC = {won:'Brass band (fanfare)', lost:'Protester with sign', lapsed:'Capped wellhead', wound:'Bureau', bankrupt:'Bank', raid:'The lender\'s men set a house ablaze', annexed:'F-35 formation (four, close)'};
const HEAD = {won:'OUI. The valley says yes to geothermal heat', lost:'NON. The valley says no', lapsed:'The concession lapses', wound:'Énergie-Géo winds itself up', bankrupt:'Énergie-Géo is bankrupt', raid:'Night of fire in the valley', annexed:'The valley joins the canton of Berne'};
const SUB = {won:'The heat stays; the pipes stay; the Company stays. The committee demands a recount and does not get one.', lost:'The rigs leave on low-loaders; the holes are plugged; the villages go back to heating oil and arguing about something else.',
  lapsed:'Ten years, and nothing delivers heat or power. The canton takes the concession back and frames the agreement for its corridor.', wound:'The shareholders get back what is left. The campus is sold to a coworking company, which adds a sushi bar.',
  bankrupt:'The administrators arrive on a Monday with clipboards. The rigs, the campus, the CEO’s old car: everything is for sale.', raid:'The lender’s men came in black vans after midnight. By morning the campus was ash, and the villa’s gate was locked.',
  annexed:'After the riots and the army, the canton of Jura hands the valley over. Four jets fly low over the church at noon; nobody asked whether anyone wanted that either.'};
G.end = (kind, why) => { const S = G.S; if (S.over) return; S.over = kind; G.setSpeed(0); G.closeAll(); try { localStorage.setItem('jurafrackers2', JSON.stringify({over:true})); } catch (e){}
  const geo = S.geo || {}, wells = (geo.wells || []).filter(w => w.drilled > 0), deepest = Math.max(0, ...wells.map(w => w.depth || 0)), years = (S.day/360).toFixed(1), v = S.val || {}, q = (geo.quakes || []).filter(x => x.M >= 2).length;
  const o = G.overlay('<div class="paper"><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px double var(--ink);padding-bottom:6px;margin-bottom:10px"><b style="font:700 22px var(--pix)">La Feuille de la Faille</b><span class="muted" style="font:10px var(--pix)">' + G.dateStr(S.day) + '</span></div>' +
    '<h1 style="font-size:20px;margin-bottom:6px">' + HEAD[kind] + '</h1><div id="endpic" style="text-align:center;margin:8px 0"></div><p>' + SUB[kind] + (why ? ' ' + esc(why) : '') + '</p>' +
    '<div class="kv" style="margin-top:10px"><span>Years</span><b>' + years + '</b><span>Cash</span><b>' + fmt(Math.round(S.cash)) + '</b><span>Wells drilled</span><b>' + wells.length + (deepest ? ', the deepest ' + G.M(deepest) : '') + '</b><span>Heat · power, last month</span><b>' + Math.round(S.heat || 0) + ' · ' + Math.round(S.power || 0) + ' MWh</b><span>Felt earthquakes</span><b>' + q + '</b>' + (S.voteYes !== undefined ? '<span>The vote</span><b>' + S.voteYes.toFixed(1) + '% yes</b>' : '') + '</div>' +
    '<div class="acts"><button class="btn main" data-a="again">A new valley</button></div></div>');
  const m = G.world.model(PIC[kind]); if (m){ const e = ART.sprite(m, 2, 7, {noPad:true}), c = document.createElement('canvas'), k = e.w > 300 ? 1 : 2; c.width = e.w*k; c.height = e.h*k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(ART.spriteCanvas(e), 0, 0, c.width, c.height); c.style.maxWidth = '100%'; c.style.imageRendering = 'pixelated'; o.querySelector('#endpic').appendChild(c); }
  o.querySelector('[data-a=again]').onclick = () => { location.href = location.pathname; }; G.emit('ended', kind); };
// ---- the vote: in the tenth year. Before it, a last year of campaigning
G.on('month', m => { const S = G.S; if (!S.val || S.over) return;
  if (m >= 120){ const built = (S.fin && S.fin.firstHeat) || (S.power || 0) > 0 || (S.geo.doublets || []).some(d => d.station && (d.line || (d.pipes || []).length));
    if (!built) return G.end('lapsed'); G.updFc(); const [a, b] = S.fc, mid = (a + b)/2, yes = clamp(mid + (Math.random() - 0.5)*(b - a)*0.8, 0, 100); S.voteYes = yes;
    return G.end(yes >= 50 ? 'won' : 'lost', 'The vote: ' + yes.toFixed(1) + '% yes.'); }
  if (m === 108) G.news('One year to the vote. The committee prints its posters; the association prints its own. La Feuille opens a letters page just for this.', {paper:true}); });
G.hooks['html:bureau:company'] = G.hooks['html:bureau:company'] || [];
G.hooks['html:bureau:company'].push(() => { const S = G.S, e = E(); if (!e) return ''; let h = '';
  if (G.month() >= 108){ h += '<div class="sec"><h3>The campaign</h3><p class="muted" style="font-size:12px">The vote is in ' + G.monthsLeft() + ' months.</p>' +
    '<button class="btn small" data-a="cposters">Posters in every village · ' + fmt(50) + '</button>' + (e.fete ? '' : '<button class="btn small" data-a="cfete">The fête de la géothermie · ' + fmt(200) + '</button>') +
    G.homes().filter(x => !e.halls.includes(x)).map(x => '<button class="btn small" data-a="chall' + x + '">An evening in ' + esc(G.placeName(x)) + ' (the CEO)</button>').join('') + '</div>'; }
  h += '<div class="sec"><h3>The end</h3>' + (e.wind ? '<p>Wind up the Company: sell what can be sold, give the shareholders what is left. There is no way back.</p><button class="btn" data-a="windyes">Wind it up</button><button class="btn small" data-a="windno">No</button>' : '<button class="btn small" data-a="wind">Wind up the Company…</button>') + '</div>'; return h; });
G.globalActs = G.globalActs || {};
Object.assign(G.globalActs, {
  cposters:() => { if (!G.pay(50, 'The campaign', 'Bureau')) return 'Posters cost ' + fmt(50) + '.'; E().posters++; G.moodAll(0.8/E().posters, 'Posters for the vote', {he:0.8, le:1, fa:0.6}); return 'ok'; },
  cfete:() => { if (!G.pay(200, 'The fête de la géothermie', 'Town')) return 'The fête costs ' + fmt(200) + '.'; E().fete = true; const warm = (G.S.heat || 0) > 0; G.moodAll(warm ? 3 : 1, 'The fête de la géothermie'); const c = G.homeCentre('town'); G.emit('ribbon', c[0], c[1], 'town');
    G.news('The fête de la géothermie on the town square: the brass band, sausages, ' + (warm ? 'and a fountain of warm water straight from the wells.' : 'and a model of a well that nobody understands.'), {paper:true}); return 'ok'; },
  wind:() => { E().wind = true; return 'ok'; }, windno:() => { E().wind = false; return 'ok'; }, windyes:() => { G.end('wound'); return 'ok'; }});
for (let i = -1; i < 6; i++){ const h = i < 0 ? 'town' : i; G.globalActs['chall' + h] = () => { const b = G.world.buildings.find(q => q.role === 'mairie' && q.home === h); if (!b) return 'No mairie.'; const r = G.ceoGo(b.id, {kind:'hall', bid:b.id, home:h}); if (r === 'ok') E().halls.push(h); return r; }; }
G.CEO.hall = t => { const ok = G.moodOf(t.home) >= 40; G.mood(t.home, ok ? 2.5 : -1, ok ? 'An evening with the CEO' : 'The CEO was heckled'); G.news(ok ? 'A full hall in ' + G.placeName(t.home) + ': the CEO answers questions until the caretaker turns off the lights.' : 'The CEO’s evening in ' + G.placeName(t.home) + ' ends early; someone brought a whistle.', {paper:true}); };
// ---- bankruptcy: deep in the red at two month-ends in a row
G.on('month', () => { const S = G.S, e = E(); if (!e || S.over) return; if (S.cash < -3000){ e.broke++; if (e.broke === 1) G.news('The Company’s account is deep in the red. The bank calls; then it calls again.', {paper:true}); if (e.broke >= 2) G.end('bankrupt'); } else e.broke = 0; });
// ---- the spiral: a valley pushed beyond anger. Riots, then the army, then the jets
G.on('month', () => { const S = G.S, e = E(); if (!e || S.over || S.phase !== 'play') return; const a = avgMood(); e.low = a < 18 ? e.low + 1 : 0;
  if (e.stage === 0 && (e.low >= 2 || (e.bigQuake && a < 30))){ e.stage = 1; e.stageAt = S.day; G.news('Riots in town after dark: masked groups, burning barricades, smashed windows at the bank. The committee says these are not its people.', {paper:true}); G.moodAll(-2, 'The riots'); return; }
  if (e.stage === 1){ if (a >= 25){ e.stage = 0; G.news('The town is quiet again. Glaziers have a good month.', {paper:true}); return; } if (S.day - e.stageAt >= 60){ e.stage = 2; e.stageAt = S.day; army(); } return; }
  if (e.stage === 2 && S.day - e.stageAt >= 30){ e.stage = 3; e.stageAt = S.day; jets(); } });
G.on('housesDown', () => { if (E()) E().bigQuake = true; });
function army(){ const W = G.world, sq = W.square, from = W.roads[0][0]; for (const [m, i] of [['Piranha (8×8)', 0], ['Army truck', 1], ['Army truck', 2], ['Piranha (8×8)', 3]]) G.vehicle(m, from, [sq[0] + i*6 - 9, sq[1] + 10], {kind:'lorry', keep:true, tag:'army'}).s = -i*10;
  G.news('The army rolls into the valley at dawn: armoured cars on the square, soldiers at the school. “An evacuation exercise,” says the canton.', {paper:true}); G.moodAll(-3, 'Soldiers in the valley'); }
let jet = null;
function jets(){ jet = {t0:performance.now()}; G.news('At noon four jets fly low over the valley, very low, very loud. In the afternoon the two cantons announce “a new arrangement”.', {paper:true}); setTimeout(() => G.end('annexed'), 6500); }
G.on('dyn', dyn => { const S = G.S, e = E(); if (!e) return; const W = G.world;
  if (e.stage >= 1){ const sq = W.square; dyn.push({m:W.model('Black bloc at a burning barricade'), view:4, x:sq[0] + 14, y:sq[1] - 12, z:W.hb(sq[0] + 14, sq[1] - 12)}, {m:W.model('Smoke column'), view:0, x:sq[0] + 14, y:sq[1] - 12, z:W.hb(sq[0], sq[1]) + 5}); if (e.stage >= 2) for (let i = 0; i < 4; i++) dyn.push({m:W.model('Soldier'), view:i*4, x:sq[0] - 6 + i*3, y:sq[1] + 4, z:W.hb(sq[0], sq[1])}); }
  if (jet){ const t = (performance.now() - jet.t0)/6000; if (t <= 1){ const x = lerp(-60, W.W + 60, t), y = lerp(W.D*0.7, W.D*0.2, t); dyn.push({m:W.model('F-35 formation (four, close)'), view:W.view16(1, -0.5), x, y, z:W.hb(clamp(x, 0, W.W), clamp(y, 0, W.D)) + 70, sky:true}, {x:x + 20, y:y + 16, z:W.hb(clamp(x + 20, 0, W.W), clamp(y + 16, 0, W.D)), flat:true, draw:(g, sx, sy, zz, S) => { g.fillStyle = 'rgba(30,34,30,.18)'; g.beginPath(); g.ellipse(sx, sy, 24*S*zz, 9*S*zz, -0.4, 0, Math.PI*2); g.fill(); }}); } } });
})();
