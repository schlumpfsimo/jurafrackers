/* Jurafrackers 2.0 — exploration and drilling. Prospect flags planted by a geologist; seismic lines through a flag in any of
   eight directions (the arrow keys turn them), shot by the survey company's vibro-trucks; the 1970s lines on paper; sections
   2 km wide along any line; sites projected on a line and aligned with it; rigs, crews and supplies; wells drawn by hand in
   the section and drilled phase by phase with options chosen before each phase starts; flow tests, doublets, stimulation. */
(function(){
'use strict';
const G = globalThis.G, {fmt, esc, clamp, lerp} = G;
const RIGS = G.RIGS = {
  light:{n:'Light rig', model:'Light rig on its pad', lease:800, idle:250, day:20, buy:6000, keep:60, dayOwn:8, crew:3, maxD:2200, pad:[20, 20]},
  deep:{n:'Deep rig', model:'Deep rig on its pad', lease:1800, idle:300, day:40, buy:15000, keep:90, dayOwn:16, crew:5, maxD:5000, pad:[28, 28], need:'centre'}};
const OPT = G.OPT = {
  clean:{n:'Clean top hole', c:180, h:'protects groundwater in the karst', top:1},
  heavy:{n:'Heavy mud', c:0, h:'holds back gas (coal, faults); slower and dearer per metre'},
  salt:{n:'Salt-saturated mud', c:150, h:'crossing salt and anhydrite safely'},
  lcm:{n:'Lost-circulation material on standby', c:80, h:'seals mud losses'},
  cbl:{n:'Cement bond log', c:150, h:'proves the casing is sealed', cased:1}};
const COST = G.COST = {casing:110, flowTest:400, plug:250, survey:40, pass2:120, roadM:1.0, pad:120, container:120, sealed:200, squeeze:200, stage:300, circ:200, bleed:100, station:3000, plant:15000, archive:60};
let GEO = null; const K = () => GEO.K;
G.on('world', () => { GEO = G.geo = Geo.create(G.S.seed, G.world); const S = G.S; if (!S.geo) S.geo = {lines:[], flags:[], sites:[], wells:[], rigs:[], archive:false, sup:0, supLvl:800, contr:{survey:{free:0, jobs:[]}, road:{free:0, jobs:[]}, build:{free:0, jobs:[]}}, micro:[], quakes:[], swell:[], n:0};
  for (const f of S.geo.flags) showFlag(f); for (const s of S.geo.sites) showSite(s); for (const l of S.geo.lines) if (l.done) showStation(l); for (const sp of GEO.springs) G.R.addStatic({kind:'p', m:ART.springModel(), x:sp.x, y:sp.y, z:G.world.hb(sp.x, sp.y), view:0, noPad:true, pickable:true, ref:{open:() => openSpring(sp)}}); });
const nid = G.nid = p => p + (++G.S.geo.n);
const byId = id => { const g = G.S.geo; return g.sites.find(q => q.id === id) || g.wells.find(q => q.id === id) || g.lines.find(q => q.id === id) || g.flags.find(q => q.id === id) || g.rigs.find(q => q.id === id); };
G.geoById = byId;
const homeName = (x, y) => G.placeName(G.nearestHome(x, y)) || 'the valley';
const M = d => Math.round(d).toLocaleString('en-US').replace(/,/g, '’') + ' m';
G.M = M;
// ---- lines: own surveys and the 1970s. A line on the map from a to b; underground it is K times longer.
const lineGeom = l => { const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L = Math.hypot(dx, dy); return {ax:l.a[0]*K(), ay:l.a[1]*K(), ex:dx/L, ey:dy/L, len:L*K(), mapLen:L}; };
G.lineGeom = lineGeom;
const allLines = () => [...G.S.geo.lines.filter(l => l.done), ...(G.S.geo.archive ? GEO.legacy : [])];
// the stretch of a line through (x, y) in direction dir (0..7, steps of 22.5°), clipped to the map
const lineThrough = (x, y, dir) => { const a = dir*Math.PI/8, ex = Math.cos(a), ey = Math.sin(a), W = G.world.W, D = G.world.D; let t0 = -1e9, t1 = 1e9;
  for (const [p, e, lo, hi] of [[x, ex, 4, W - 4], [y, ey, 4, D - 4]]){ if (Math.abs(e) < 1e-9) continue; let a1 = (lo - p)/e, b1 = (hi - p)/e; if (a1 > b1){ const s = a1; a1 = b1; b1 = s; } t0 = Math.max(t0, a1); t1 = Math.min(t1, b1); }
  return {a:[x + ex*t0, y + ey*t0], b:[x + ex*t1, y + ey*t1], dir}; };
// the nearest line to a map point (own or 1970s), with the distance along it (underground metres)
const lineAt = (x, y, maxD) => { let best = null; for (const l of allLines()){ const g = lineGeom(l), X = x*K(), Y = y*K(), u = (X - g.ax)*g.ex + (Y - g.ay)*g.ey, d = Math.abs((X - g.ax)*(-g.ey) + (Y - g.ay)*g.ex)/K(); if (u < 0 || u > g.len) continue; if (d < (maxD || 5) && (!best || d < best.d)) best = {l, u, d}; } return best; };
// what is known along a line: the survey's pass, the 1970s paper (with gaps), nothing
const knownOn = l => u => { if (l.legacy){ const f = u/lineGeom(l).len; return {q:1, gap:l.gaps.some(([a, b]) => f >= a && f <= b) || f < 0 || f > 1}; } const L = lineGeom(l).len; return u >= 0 && u <= L ? {q:(l.pass || 1) + 1} : {q:0}; };
// ---- drawing on the map: the lines, the flags' lines while choosing, the protection zones while placing
G.on('draw', g => { if (!G.S.geo) return; const W = G.world, R = G.R, z = R.scr();
  const seg = (a, b, col, w, dash) => { const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])/3)); g.beginPath(); let pen = false; for (let i = 0; i <= n; i++){ const x = lerp(a[0], b[0], i/n), y = lerp(a[1], b[1], i/n); if (W.inSite(x, y, 1)){ pen = false; continue; } const [sx, sy] = R.toScreen(x, y, W.hb(clamp(x, 0, W.W), clamp(y, 0, W.D)) + 0.2); pen ? g.lineTo(sx, sy) : g.moveTo(sx, sy); pen = true; } g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
  const label = (l, txt, col) => { const m = [lerp(l.a[0], l.b[0], 0.12), lerp(l.a[1], l.b[1], 0.12)], [sx, sy] = R.toScreen(m[0], m[1]); g.font = '10px Silkscreen, monospace'; const tw = g.measureText(txt).width; g.fillStyle = 'rgba(255,253,248,.85)'; g.fillRect(sx - 3, sy - 11, tw + 6, 14); g.fillStyle = col; g.fillText(txt, sx, sy); };
  if (G.S.geo.archive) for (const l of GEO.legacy){ seg(l.a, l.b, 'rgba(120,96,60,.55)', Math.max(1, z*0.3), [6, 5]); if (z > 1.5) label(l, l.name, '#6a5432'); }
  for (const l of G.S.geo.lines){ if (!l.done && !l.going) continue; seg(l.a, l.b, l.done ? 'rgba(224,122,44,.85)' : 'rgba(224,122,44,.45)', Math.max(1.5, z*0.35), l.done ? [] : [4, 4]); if (z > 1.5) label(l, l.name, '#a8521a'); }
  const t = G.getTool(); if (t && t.lineDir !== undefined){ const L = lineThrough(t.fx, t.fy, t.lineDir); seg(L.a, L.b, 'rgba(224,122,44,.9)', Math.max(2, z*0.4), [8, 6]); }
  if (t && t.zones) for (const sp of GEO.springs){ for (const [r, c] of [[75, 'rgba(60,120,190,.10)'], [30, 'rgba(60,120,190,.22)']]){ g.beginPath(); for (let i = 0; i <= 32; i++){ const a = i/32*Math.PI*2, x = sp.x + Math.cos(a)*r, y = sp.y + Math.sin(a)*r, [sx, sy] = R.toScreen(x, y, W.hb(clamp(x, 0, W.W), clamp(y, 0, W.D))); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); } g.fillStyle = c; g.fill(); } } });
// ---- flags: picked up at the Bureau, planted by a geologist who drives there in the pickup
G.on('html:bureau:staff', () => '');
G.hooks['html:bureau:company'] = G.hooks['html:bureau:company'] || [];
const flagAct = () => { const geo = G.S.staff.find(p => p.tr === 'geologist' && p.st === 'idle'); if (!geo) return 'A geologist plants the flags: hire one first, or wait until one is back.'; G.closeAll();
  G.tool({m:ART.flagModel(), model:null, view:0, zones:true, hint:'Click where the flag goes. The blue rings are the springs’ protection zones. Esc cancels.', size:() => [2, 2],
    check:(x, y) => { if (x < 8 || y < 8 || x > G.world.W - 8 || y > G.world.D - 8) return 'Too close to the edge.'; if (G.world.probe(x, y, 1)) return 'Not on a building.'; if (Math.abs(G.world.stream.streamV(x, y)) < G.world.stream.hw(x) + 1) return 'Not in the stream.'; return {}; },
    label:() => 'Prospect flag', place:(x, y) => { const c = G.getTool().check(x, y); if (typeof c === 'string') return c; plantFlag(geo, x, y); G.tool(null); return 'ok'; }}); return 'ok'; };
G.flagAct = flagAct;
G.tool.models = G.tool.models || {};
function plantFlag(p, x, y){ const S = G.S, b = G.company('bureau'), f = {id:nid('f'), x, y, by:p.id, planted:false, name:'Flag near ' + homeName(x, y)}; S.geo.flags.push(f); p.st = 'travel'; p.at = f.id;
  G.vehicle('Geologist\'s pickup', [b.cx, b.cy], [x, y], {kind:'pickup', done:'flagIn', arg:f.id, name:p.name}); G.news(p.name + ' drives out in the pickup to plant a flag near ' + homeName(x, y) + '.', {quiet:true}); }
G.vehicleDone.flagIn = id => { const f = byId(id); if (!f) return; f.planted = true; showFlag(f); const p = G.S.staff.find(q => q.id === f.by), b = G.company('bureau'); if (p && b){ G.vehicle('Geologist\'s pickup', [f.x, f.y], [b.cx, b.cy], {kind:'pickup', done:'backHome', arg:p.id}); }
  G.news('A prospect flag stands near ' + homeName(f.x, f.y) + '.'); G.S.marks.push({kind:'?', id:'mf' + f.id, at:[f.x, f.y, G.world.hb(f.x, f.y) + 3], ref:f.id}); };
G.vehicleDone.backHome = id => { const p = G.S.staff.find(q => q.id === id); if (p && p.st === 'travel'){ p.st = 'idle'; p.at = null; } };
const showFlag = f => { if (!f.planted || f.removed) return; if (f.stat) G.R.removeStatic(f.stat); f.stat = undefined; const st = G.R.addStatic({kind:'p', m:ART.flagModel(), x:f.x, y:f.y, z:G.world.hb(f.x, f.y), view:0, noPad:true, pickable:true, ref:{open:() => openFlag(f)}}); Object.defineProperty(f, 'stat', {value:st, enumerable:false, writable:true, configurable:true}); };
G.on('mark', m => { if (m.ref){ const o = byId(m.ref); if (o && o.id[0] === 'f') openFlag(o); else if (o && o.id[0] === 's') openSite(o); else if (o && o.id[0] === 'w') openSite(byId(o.site)); } });
function openFlag(f){ G.S.marks = G.S.marks.filter(m => m.id !== 'mf' + f.id); const W = G.world, road = W.nearestRoad(f.x, f.y), z = GEO.zoneAt(f.x, f.y), near = allLines().map(l => { const g = lineGeom(l), X = f.x*K(), Y = f.y*K(); return {l, d:Math.abs((X - g.ax)*(-g.ey) + (Y - g.ay)*g.ex)}; }).filter(q => q.d < 900).sort((a, b) => a.d - b.d);
  G.openWin(f.id, {title:'Prospect flag', sub:'near ' + homeName(f.x, f.y), at:() => [f.x, f.y, W.hb(f.x, f.y) + 3], body:A => {
    let h = '<div class="kv"><span>Nearest road</span><b>' + (road ? Math.round(road.d) + ' m' : '—') + '</b><span>Springs</span><b>' + (z === 2 ? 'inside a protection zone: no drilling here' : z === 1 ? 'outer protection zone: a sealed pad' : 'none close') + '</b><span>Lines nearby</span><b>' + (near.length ? near.slice(0, 3).map(q => q.l.name + ' (' + Math.round(q.d) + ' m)').join(', ') : 'none') + '</b></div>';
    const going = G.S.geo.lines.find(l => l.flag === f.id && !l.done);
    h += '<div class="sec"><h3>Seismic survey</h3>' + (going ? '<p>The survey company is on it: ' + (going.going ? 'the trucks are out.' : 'waiting for its trucks.') + '</p>' : '<p>A line through the flag, in any of eight directions. Vibroseis trucks drive it; the villages along it hear them.</p><button class="btn main" data-a="' + A('survey', () => surveyTool(f)) + '">Choose the line</button>') + '</div>';
    h += '<div class="sec"><button class="btn small" data-a="' + A('pull', () => { f.removed = true; if (f.stat) G.R.removeStatic(f.stat); G.S.geo.flags.splice(G.S.geo.flags.indexOf(f), 1); G.closeWin(f.id); }) + '">Pull the flag out</button></div>'; return h; }}); }
// ---- seismic surveys: choose the direction with the arrow keys, then the survey company comes
function surveyTool(f){ G.closeAll(); const t = {m:ART.flagModel(), view:0, fx:f.x, fy:f.y, lineDir:G.S.geo.lastDir || 0, turn:1, hint:'Turn the line with the arrow keys (or the ⟲ ⟳ buttons). Click to order the survey. Esc cancels.', size:() => [1, 1],
    check:() => { const L = lineThrough(f.x, f.y, t.lineDir), km = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1])*K()/1000; return {km}; },
    label:() => { const L = lineThrough(f.x, f.y, t.lineDir), km = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1])*K()/1000; return km.toFixed(1) + ' km · ' + fmt(km*COST.survey) + ' · ' + Math.round(km*15) + ' days'; },
    snap:() => [f.x, f.y], place:() => orderSurvey(f, t.lineDir)};
  // the arrow keys turn the line (eight directions); the ghost stays on the flag
  Object.defineProperty(t, 'view', {get:() => 0, set:v => { t.lineDir = ((t.lineDir + (v === 15 ? -1 : 1)) + 8) % 8; }});
  G.tool(t); turnButtons(true); return 'ok'; }
const turnButtons = on => { let e = document.querySelector('#turnbtns'); if (on && !e){ e = document.createElement('span'); e.id = 'turnbtns'; e.innerHTML = '<button data-t="-1" title="Turn left">⟲</button><button data-t="1" title="Turn right">⟳</button>'; document.querySelector('#ctl').prepend(e); } if (!on && e) e.remove(); };
G.turnButtons = turnButtons;
G.on('tick', () => { const t = G.getTool(); if (!t) turnButtons(false); });
function orderSurvey(f, dir){ const L = lineThrough(f.x, f.y, dir), km = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1])*K()/1000, cost = Math.round(km*COST.survey);
  if (!G.pay(cost, 'Seismic surveys', 'Survey company')) return 'The survey costs ' + fmt(cost) + '.'; G.S.geo.lastDir = dir;
  const l = {id:nid('l'), name:'EG-' + String(G.S.geo.lines.length + 1).padStart(2, '0'), a:L.a, b:L.b, dir, flag:f.id, pass:1, done:false, going:false, km};
  G.S.geo.lines.push(l); contract('survey', {what:'seismic line ' + l.name + ' (' + km.toFixed(1) + ' km)', days:Math.round(km*15), line:l.id, start:'surveyStart', done:'surveyDone'}); G.tool(null); return 'ok'; }
// ---- contractors: one job at a time each, in the order booked
const CONTR = G.CONTR = {survey:{n:'Survey company', who:'Vibro-Sond'}, road:{n:'Road builder', who:'Graviers Réunis'}, build:{n:'Builders', who:'Constructions Générales'}};
function contract(k, job){ const C = G.S.geo.contr[k], start = Math.max(G.S.day, C.free); job.k = k; job.from = start; job.end = start + job.days; job.id = nid('j'); C.free = job.end; C.jobs.push(job);
  G.news(CONTR[k].who + ' (' + CONTR[k].n.toLowerCase() + '): ' + job.what + (start > G.S.day + 1 ? ', starting in about ' + G.dur(start - G.S.day) : '') + ', done in about ' + G.dur(job.end - G.S.day) + '.'); return job; }
G.contract = contract;
const JOB = G.JOB = {};
G.on('day', () => { const S = G.S; if (!S.geo) return; for (const k in S.geo.contr){ const C = S.geo.contr[k]; for (const j of C.jobs.slice()){ if (!j.started && S.day >= j.from){ j.started = true; if (JOB[j.start]) JOB[j.start](j); }
      if (j.started && S.day >= j.end){ C.jobs.splice(C.jobs.indexOf(j), 1); if (JOB[j.done]) JOB[j.done](j); } } } });
JOB.surveyStart = j => { const l = byId(j.line); if (!l) return; l.going = true; const W = G.world, start = W.roads[0][0];
  for (let i = 0; i < 3; i++) G.vehicle('Vibro-truck', start, l.a, {kind:'vibro', done:'vibroAt', arg:{l:l.id, i}, speed:60}).s = -i*14; };
G.vehicleDone.vibroAt = a => { const l = byId(a.l); if (!l) return; const job = G.S.geo.contr.survey.jobs.find(j => j.line === l.id); const days = job ? Math.max(1, job.end - G.S.day) : 10, len = Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]);
  const v = G.vehicle('Vibro-truck', [l.a[0] - a.i*8*(l.b[0] - l.a[0])/len, l.a[1] - a.i*8*(l.b[1] - l.a[1])/len], l.b, {kind:'vibro', done:'vibroOff', arg:{l:l.id, i:a.i}, speed:Math.max(4, len/days)}); v.pts = [v.pts[0], l.b]; v.len = Math.hypot(l.b[0] - v.pts[0][0], l.b[1] - v.pts[0][1]); };
G.vehicleDone.vibroOff = a => { const l = byId(a.l); if (!l) return; const W = G.world, end = W.roads[0][W.roads[0].length - 1]; G.vehicle('Vibro-truck', l.b, end, {kind:'vibro'}); };
JOB.surveyDone = j => { const l = byId(j.line); if (!l) return; l.done = true; l.going = false; showStation(l); const hint = firstHint(l);
  G.news('Seismic line ' + l.name + ' is shot. Its section waits at the survey station: ' + hint); G.S.marks.push({kind:'?', id:'ml' + l.id, at:stationAt(l), ref:l.id}); G.emit('surveyed', l); };
const stationAt = l => { const x = l.b[0] - (l.b[0] - l.a[0])*0.04, y = l.b[1] - (l.b[1] - l.a[1])*0.04; return [x, y, G.world.hb(x, y) + 4]; };
const showStation = l => { const [x, y] = stationAt(l), m = G.world.model('Survey station'); if (l.stat) G.R.removeStatic(l.stat); const st = G.R.addStatic({kind:'p', m, x, y, z:G.world.hb(x, y), view:G.world.view16(l.b[0] - l.a[0], l.b[1] - l.a[1]), noPad:true, pickable:true, ref:{open:() => openStation(l)}});
  Object.defineProperty(l, 'stat', {value:st, enumerable:false, writable:true, configurable:true}); };
G.on('mark', m => { if (m.id && m.id.startsWith('ml')){ const l = byId(m.ref); if (l) openStation(l); } });
// one cautious hint per section: the strongest reflector, named with a "probably"
function firstHint(l){ const g = lineGeom(l), u = g.len/2, X = g.ax + g.ex*u, Y = g.ay + g.ey*u, st = GEO.strata(X, Y);
  return 'a strong reflector at about ' + (Math.round(st.marl/100)/10).toFixed(1) + ' km, probably the top of the Muschelkalk' + (st.gran - st.sand > 300 ? '; something bright and patchy deeper down, perhaps coal' : '') + '.'; }
function openStation(l){ G.S.marks = G.S.marks.filter(m => m.id !== 'ml' + l.id); const job2 = G.S.geo.contr.survey.jobs.find(j => j.line === l.id && j.pass2);
  G.openWin('st' + l.id, {title:'Survey station ' + l.name, sub:(l.pass >= 2 ? 'second pass' : 'first pass') + ' · ' + l.km.toFixed(1) + ' km', at:() => stationAt(l), body:A => {
    let h = '<p>The recorder, the antenna, the section in a drawer.</p><button class="btn main" data-a="' + A('sec', () => openSection(l, lineGeom(l).len/2)) + '">Open the section</button>';
    if (l.pass < 2) h += '<div class="sec"><h3>Second pass</h3>' + (job2 ? '<p>The geologists are booked: ' + G.dur(job2.end - G.S.day) + '.</p>' : (pass2Ok() === true ? '<p>More geophones, closer together, longer listening: faults and the depth to the granite become clearer.</p><button class="btn" data-a="' + A('p2', () => orderPass2(l)) + '">' + fmt(l.km*COST.pass2) + '</button>' : '<p class="muted">' + pass2Ok() + '</p>')) + '</div>';
    return h; }}); }
const pass2Ok = () => { if (!G.company('centre')) return 'A second pass needs the Centre de compétences.'; if (!G.S.staff.some(p => p.tr === 'geologist' && (p.certs || []).includes('pass2')) && !G.S.flags.pass2any) return 'A second pass needs a geologist who has taken the association’s course on it.'; return true; };
function orderPass2(l){ const c = Math.round(l.km*COST.pass2); if (!G.pay(c, 'Seismic surveys', 'Survey company')) return 'The second pass costs ' + fmt(c) + '.'; contract('survey', {what:'second pass on ' + l.name, days:Math.round(l.km*20), line:l.id, pass2:true, start:'p2Start', done:'p2Done'}); return 'ok'; }
JOB.p2Start = j => { const l = byId(j.line), b = G.company('bureau'); if (l && b) G.vehicle('Geologist\'s pickup', [b.cx, b.cy], l.a, {kind:'pickup'}); };
JOB.p2Done = j => { const l = byId(j.line); if (!l) return; l.pass = 2; secCache.clear(); G.news('The second pass on ' + l.name + ' is processed: the faults show, and so does the depth to the granite.'); };
// ---- the 1970s archive: bought at the canton house
G.buyArchive = () => { if (G.S.geo.archive) return 'Already bought.'; if (!G.pay(COST.archive, 'The 1970s archive', 'Canton house')) return 'The archive costs ' + fmt(COST.archive) + '.'; G.S.geo.archive = true; G.news('The canton’s geology office hands over the 1970s petroleum lines: ' + GEO.legacy.map(l => l.name).join(', ') + '. Paper, folded, coffee rings, gaps.'); return 'ok'; };
// ---- clicking a line on the map: open the section, or project a site there
G.on('ground', g => { if (!g || !G.S.geo || G.S.phase !== 'play' && G.S.phase !== 'building') return; const W = G.world, R = G.R, tol = Math.max(3, 8/R.scr()); const hit = lineAt(g[0], g[1], tol); if (!hit) return;
  G.openWin('line', {title:'Line ' + hit.l.name, sub:hit.l.legacy ? 'the 1970s, on paper' : 'seismic survey' + (hit.l.pass >= 2 ? ', second pass' : ''), at:() => [g[0], g[1], g[2] + 1], body:A => '<button class="btn main" data-a="' + A('s', () => { G.closeWin('line'); openSection(hit.l, hit.u); }) + '">Open the section</button><button class="btn" data-a="' + A('p', () => { G.closeWin('line'); siteTool(hit.l, hit.u); }) + '">Project a site here</button>'}); });
// ---- sections: 2 km wide along the line; the wells near it drawn in, with the layers they found
const secCache = new Map();
function openSection(l, uc, draw){ const g = lineGeom(l), half = 1000, u0 = uc - half, u1 = uc + half, key = l.id + ':' + Math.round(u0/50)*50 + ':' + (l.pass || 0) + ':' + (G.S.geo.archive ? 1 : 0);
  let sec = secCache.get(key); if (!sec){ sec = Geo.sectionCanvas(GEO, g, Math.round(u0/50)*50, Math.round(u0/50)*50 + 2*half, knownOn(l), {W:G.world.W, D:G.world.D, hb:G.world.hb, things:surfaceThings(g)}); secCache.set(key, sec); }
  G.secDraw = draw || null; G.secCur = sec; const wkey = 'sec'; G.openWin(wkey, {xwide:true, keep:true, title:'Section along ' + l.name, sub:(l.legacy ? 'the 1970s paper' : l.pass >= 2 ? 'second pass' : 'first pass') + ' · 2 km wide · 5 km deep', at:null, body:(A, w) => {
    setTimeout(() => paintSection(w, sec, l, g, draw), 0); return '<canvas class="secc" width="' + sec.W + '" height="' + sec.H + '" style="width:100%;image-rendering:pixelated;cursor:' + (draw ? 'crosshair' : 'default') + '"></canvas><div class="secinfo" style="font-size:12px;min-height:34px"></div>' + (draw ? drawPanel(A, draw) : legendHtml(l)); }, onClose:() => { if (draw) draw.cancel && draw.cancel(); }}); }
G.openSection = openSection;
const surfaceThings = g => { const out = []; for (const b of G.world.buildings){ const X = b.cx*K(), Y = b.cy*K(), u = (X - g.ax)*g.ex + (Y - g.ay)*g.ey, d = Math.abs((X - g.ax)*(-g.ey) + (Y - g.ay)*g.ex); if (d < 90) out.push({u, w:3, h:b.farm ? 4 : 5, c:'#efe6d4', roof:'#a8473a'}); }
  for (const s of G.S.geo.sites){ const X = s.x*K(), Y = s.y*K(), u = (X - g.ax)*g.ex + (Y - g.ay)*g.ey, d = Math.abs((X - g.ax)*(-g.ey) + (Y - g.ay)*g.ex); if (d < 90) out.push({u, w:3, h:s.rig ? 14 : 3, c:s.rig ? '#e07a2c' : '#9aa3ab'}); } return out; };
const legendHtml = l => '<div class="muted" style="font-size:12px">' + (l.legacy ? 'The 1970s drawing: hand-drawn boundaries, gaps where the paper is torn. ' : 'Raw seismic: bright and dark bands are boundaries between rocks of different hardness; broken bands are faults. Nothing is certain until drilled. ') + 'Wells near the line show the layers they passed.</div>';
function paintSection(w, sec, l, g, draw){ const cv = w.el.querySelector('.secc'); if (!cv) return; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(sec.canvas, 0, 0);
  // wells: their paths, and the layers they found as labels that spread sideways, fading with distance from the line
  for (const wl of G.S.geo.wells){ const s = byId(wl.site); if (!s) continue; const pts = wellWorld(wl); let any = false;
    const proj = pts.map(([X, Y, d]) => { const u = (X - g.ax)*g.ex + (Y - g.ay)*g.ey, off = Math.abs((X - g.ax)*(-g.ey) + (Y - g.ay)*g.ex); if (off < 300) any = true; return [sec.xOf(u), sec.yOf(d), off]; });
    if (!any) continue; c.strokeStyle = wl.plugged ? '#6a6a6a' : '#1c1f22'; c.lineWidth = 2; c.beginPath(); proj.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    if (wl.plan && wl.plan.length > 1 && !wl.done){ c.setLineDash([4, 3]); c.strokeStyle = '#a8521a'; c.beginPath(); planWorld(wl).forEach(([X, Y, d], i) => { const u = (X - g.ax)*g.ex + (Y - g.ay)*g.ey, x = sec.xOf(u), y = sec.yOf(d); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]); }
    for (const [rk, d] of Object.entries(wl.tops || {})){ const P = pointAtDepth(wl, d); if (!P) continue; const u = (P[0] - g.ax)*g.ex + (P[1] - g.ay)*g.ey, off = Math.abs((P[0] - g.ax)*(-g.ey) + (P[1] - g.ay)*g.ex), fade = clamp(1 - off/600, 0, 1); if (fade <= 0) continue;
      const x = sec.xOf(u), y = sec.yOf(d), spread = 40 + 80*(1 - fade); c.strokeStyle = 'rgba(255,253,248,' + (0.9*fade) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - spread, y); c.lineTo(x + spread, y); c.stroke();
      c.font = '9px Silkscreen, monospace'; c.fillStyle = 'rgba(28,31,34,' + fade + ')'; c.fillText(GEO.RSHORT[+rk] + ' ' + M(d) + ' · ' + GEO.tempAt(P[0], P[1], d) + ' °C', x + 6, y - 3); } }
  if (draw && draw.pts.length){ c.strokeStyle = '#e07a2c'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); draw.pts.forEach(([u, d], i) => { const x = sec.xOf(u), y = sec.yOf(d); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]); for (const [u, d] of draw.pts){ c.fillStyle = '#e07a2c'; c.fillRect(sec.xOf(u) - 2, sec.yOf(d) - 2, 5, 5); } }
  G.emit('paintSection', c, sec, g, l);
  const info = w.el.querySelector('.secinfo');
  cv.onmousemove = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left)/r.width*sec.W, y = (e.clientY - r.top)/r.height*sec.H, d = sec.dOf(y), u = sec.uOf(x); if (info) info.textContent = d < 0 ? 'surface' : 'depth ' + M(d) + ' · ' + (u/1000).toFixed(2) + ' km along ' + l.name + (draw ? ' · click to add a point' : ''); };
  cv.onclick = e => { if (!draw) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left)/r.width*sec.W, y = (e.clientY - r.top)/r.height*sec.H; const res = draw.add(sec.uOf(x), sec.dOf(y)); if (typeof res === 'string') G.toast(res); G.refresh(); }; }
// ---- sites: projected on a line, the pad turned along it; a container, a mairie permit, an access road
function siteTool(l, u){ if (!G.company('bureau')) return 'The Bureau comes first.'; const g = lineGeom(l), view = (Math.round(Math.atan2(g.ey, g.ex)/(Math.PI/8)) % 16 + 16) % 16, [w, d] = RIGS.light.pad;
  const snap = (x, y) => { const X = x*K(), Y = y*K(), uu = clamp((X - g.ax)*g.ex + (Y - g.ay)*g.ey, 60, g.len - 60); return [(g.ax + g.ex*uu)/K(), (g.ay + g.ey*uu)/K()]; };
  const a = view*Math.PI/8; G.tool({m:G.world.model('Site container'), model:null, view, ang:a, zones:true, snap, hint:'Slide the pad along the line and click. Esc cancels.', size:() => [w + 8, d + 4],
    check:(x, y) => { const z = GEO.zoneAt(x, y); if (z === 2) return 'Inside a spring’s protection zone: no drilling.'; const r = G.world.canBuild(x, y, w + 8, d + 4, a); if (typeof r === 'string') return r; r.zone = z; return r; },
    label:(x, y, v, chk) => 'Pad ' + fmt(COST.pad + COST.container + G.flattenCost(chk) + (chk.zone ? COST.sealed : 0)) + (chk.zone ? ' (sealed)' : '') + ' · road ' + fmt(G.accessCost(x, y)),
    place:(x, y) => { const chk = G.getTool().check(x, y); if (typeof chk === 'string') return chk; const cost = COST.pad + COST.container + G.flattenCost(chk) + (chk.zone ? COST.sealed : 0); if (!G.pay(cost, 'Sites: pads and containers', 'Sites')) return 'The pad costs ' + fmt(cost) + '.';
      const X = x*K(), Y = y*K(), uu = (X - g.ax)*g.ex + (Y - g.ay)*g.ey; makeSite(l, uu, x, y, view, chk.zone); G.tool(null); return 'ok'; }}); return 'ok'; }
G.siteTool = siteTool;
function makeSite(l, u, x, y, view, zone){ const S = G.S, home = G.nearestHome(x, y), [w, d] = RIGS.light.pad, a = view*Math.PI/8, ws = G.world.addSite(x, y, w + 8, d + 4, a, {pad:true});
  const s = {id:nid('s'), name:'Site ' + (S.geo.sites.length + 1) + ' near ' + homeName(x, y), x, y, z:ws.z, view, a, line:l.id, legacy:!!l.legacy, u, zone, home, rig:null, crew:[], wells:[], sup:0, permit:{mairie:null, canton:null}, road:null, built:S.day};
  S.geo.sites.push(s); S.changes.push({t:'site', cx:x, cy:y, w:w + 8, d:d + 4, a, extra:{pad:true}}); showSite(s);
  // the mairie's permit: the Company's first site outside the zones is signed at once; later ones take months
  const first = !S.geo.sites.some(q => q !== s && q.permit.mairie === 'ok'); s.permit.mairie = first && !zone ? 'ok' : 'wait'; s.permitAt = s.permit.mairie === 'ok' ? S.day : S.day + (zone ? 120 : 60) + Math.round(Math.random()*60);
  // the access road, unless the pad is on a road
  const road = G.world.nearestRoad(x, y); if (road && road.d > 16){ const len = road.d, cost = Math.round(len*COST.roadM); G.book('Access roads', -cost, 'Road builder'); s.road = {state:'booked', len}; contract('road', {what:'access road to ' + s.name + ' (' + Math.round(len) + ' m)', days:Math.max(5, Math.round(len/8)), site:s.id, start:'roadStart', done:'roadDone'}); } else s.road = {state:'ok'};
  G.news('A pad is staked out: ' + s.name + ', on ' + l.name + '.' + (s.permit.mairie === 'ok' ? ' The mairie signs the permit the same day.' : ' The mairie will take its time with the permit.')); G.emit('siteNew', s); return s; }
JOB.roadStart = j => { const s = byId(j.site); if (!s) return; s.road.state = 'building'; const W = G.world, e = W.roads[0][0]; G.vehicle('Excavator', e, [s.x, s.y], {kind:'lorry'}); G.vehicle('Tipper (builders)', e, [s.x, s.y], {kind:'lorry'}); };
JOB.roadDone = j => { const s = byId(j.site); if (!s) return; const r = G.world.nearestRoad(s.x, s.y); if (r){ const pts = [[s.x, s.y], [r.x, r.y]]; G.world.addRoad(pts, 2.4); G.S.changes.push({t:'road', pts, w:2.4}); } s.road.state = 'ok'; G.news('The access road to ' + s.name + ' is finished.'); };
const showSite = s => { const W = G.world; if (s.stats) for (const o of s.stats) G.R.removeStatic(o); const out = [], mk = (m, x, y, view) => out.push(G.R.addStatic({kind:'p', m, x, y, z:W.hb(x, y), view, noPad:true, pickable:true, ref:{open:() => openSite(s)}}));
  const ca = Math.cos(s.a), sa = Math.sin(s.a), at = (u, v) => [s.x + u*ca - v*sa, s.y + u*sa + v*ca];
  const rig = s.rig ? byId(s.rig) : null; if (rig && rig.at === s.id && rig.up) mk(W.model(RIGS[rig.kind].model), s.x, s.y, s.view); else if (s.wells.some(id => { const w = byId(id); return w && w.drilled > 0; })) mk(W.model('Capped wellhead'), s.x, s.y, s.view);
  mk(W.model('Site container'), ...at(0, (RIGS.light.pad[1] + 4)/2 - 1.2), s.view); if (s.station) mk(W.model(s.station === 'plant' ? 'Power plant' : 'Heat station'), ...(s.stAt || at(-(RIGS.light.pad[0]/2 + 14), 0)), s.view);
  Object.defineProperty(s, 'stats', {value:out, enumerable:false, writable:true, configurable:true}); };
G.showSite = showSite;
// ---- rigs: leased (they come on a low-loader from outside) or owned (kept at the depot)
G.on('month', () => { const S = G.S; if (!S.geo) return; for (const r of S.geo.rigs){ const R0 = RIGS[r.kind]; if (r.own){ G.book('Rig maintenance', -R0.keep, 'Atelier'); continue; } if (!r.drillingMonth) G.book('Rigs on standby: ' + R0.n.toLowerCase(), -R0.idle, r.at && r.at[0] === 's' ? byId(r.at).name : 'Depot'); r.drillingMonth = false; } });
function bringRig(s, kind){ const R0 = RIGS[kind]; if (kind === 'deep' && !G.company('centre')) return 'A deep rig needs the Centre de compétences.'; if (s.rig) return 'There is already a rig on its way or on the pad.';
  const owned = G.S.geo.rigs.find(r => r.own && r.kind === kind && r.at === 'depot');
  if (!owned && !G.pay(R0.lease, 'Rig mobilisation', s.name)) return 'Bringing in a ' + R0.n.toLowerCase() + ' costs ' + fmt(R0.lease) + '.';
  const r = owned || {id:nid('r'), kind, own:false, at:null}; if (!owned) G.S.geo.rigs.push(r); r.at = 'moving'; s.rig = r.id; r.to = s.id;
  const from = owned ? [G.company('depot').cx, G.company('depot').cy] : G.world.roads[0][0]; G.vehicle('Low-loader with rig', from, [s.x, s.y], {kind:'lowloader', done:'rigIn', arg:{r:r.id, s:s.id}});
  G.news('A ' + R0.n.toLowerCase() + (owned ? ' leaves the depot' : ' is leased; it comes on a low-loader') + ' for ' + s.name + '.'); return 'ok'; }
G.vehicleDone.rigIn = a => { const r = byId(a.r), s = byId(a.s); if (!r || !s) return; r.at = s.id; r.upAt = G.S.day + 5; G.news('The rig arrives at ' + s.name + '. Setting up takes about a week.', {quiet:true}); };
G.on('day', () => { const S = G.S; if (!S.geo) return; for (const r of S.geo.rigs) if (r.at && r.at[0] === 's' && !r.up && S.day >= r.upAt){ r.up = true; const s = byId(r.at); if (s){ showSite(s); G.news('The rig stands on ' + s.name + '.'); } } });
function releaseRig(s){ const r = byId(s.rig); if (!r) return 'No rig here.'; if (s.wells.some(id => { const w = byId(id); return w && w.going; })) return 'It is drilling.'; r.up = false; r.at = 'moving'; s.rig = null; showSite(s);
  if (r.own){ const d = G.company('depot'); G.vehicle('Low-loader with rig', [s.x, s.y], [d.cx, d.cy], {kind:'lowloader', done:'rigHome', arg:r.id}); } else { G.vehicle('Low-loader with rig', [s.x, s.y], G.world.roads[0][G.world.roads[0].length - 1], {kind:'lowloader'}); G.S.geo.rigs.splice(G.S.geo.rigs.indexOf(r), 1); }
  G.news('The rig on ' + s.name + ' is taken down. A capped wellhead stays.'); return 'ok'; }
G.vehicleDone.rigHome = id => { const r = byId(id); if (r) r.at = 'depot'; };
// ---- crews: sent from the Bureau to a site, by bus
const crewAt = (s, tr) => G.S.staff.filter(p => p.at === s.id && p.st === 'site' && (!tr || p.tr === tr));
G.crewAt = crewAt;
function sendCrew(s, tr){ const p = G.S.staff.find(q => q.tr === tr && q.st === 'idle'); if (!p) return 'No idle ' + G.TRADES[tr].n.toLowerCase() + ' at the Bureau. Hire one there.'; const b = G.company('bureau'); p.st = 'travel'; p.at = s.id; G.vehicle('Post bus', [b.cx, b.cy], [s.x, s.y], {kind:'bus', done:'crewIn', arg:p.id}); return 'ok'; }
G.vehicleDone.crewIn = id => { const p = G.S.staff.find(q => q.id === id); if (p && p.st === 'travel') p.st = 'site'; };
function recallCrew(s, tr){ const p = crewAt(s, tr)[0]; if (!p) return 'Nobody to call back.'; const b = G.company('bureau'); p.st = 'travel'; G.vehicle('Post bus', [s.x, s.y], [b.cx, b.cy], {kind:'bus', done:'backHome', arg:p.id}); return 'ok'; }
// ---- supplies: one stock at the depot (casing, mud, bits, cement); lorries take it to the sites; the depot reorders by itself
G.on('day', d => { const S = G.S; if (!S.geo || !G.company('depot')) return; const g = S.geo; if (d % 5 === 0 && g.sup + (g.supComing || 0) < g.supLvl && S.cash > 600){ const n = g.supLvl - g.sup - (g.supComing || 0); G.book('Supplies bought', -n, 'Depot'); g.supComing = (g.supComing || 0) + n; const dp = G.company('depot'); G.vehicle('Supply lorry', G.world.roads[0][0], [dp.cx, dp.cy], {kind:'lorry', done:'supIn', arg:n}); }
  if (d % 3 === 0) for (const s of g.sites){ const need = s.wells.some(id => { const w = byId(id); return w && (w.going || w.next); }); if (!need || s.sup >= 250 || s.supComing || g.sup < 50) continue; const n = Math.min(400 - s.sup, g.sup); g.sup -= n; s.supComing = n; const dp = G.company('depot'); G.vehicle('Supply lorry', [dp.cx, dp.cy], [s.x, s.y], {kind:'lorry', done:'supSite', arg:{s:s.id, n}}); } });
G.vehicleDone.supIn = n => { G.S.geo.sup += n; G.S.geo.supComing = Math.max(0, (G.S.geo.supComing || 0) - n); };
G.vehicleDone.supSite = a => { const s = byId(a.s); if (s){ s.sup += a.n; s.supComing = 0; } };
// ---- permits: the mairie (months, unless it is the first site), the canton for deep wells, stimulation and plants
G.on('day', () => { const S = G.S; if (!S.geo) return; for (const s of S.geo.sites){ if (s.permit.mairie === 'wait' && S.day >= s.permitAt){ const mood = G.moodOf ? G.moodOf(s.home) : 50; if (mood < 25 && Math.random() < 0.5){ s.permit.mairie = 'no'; G.news('The mairie of ' + G.placeName(s.home) + ' refuses the permit for ' + s.name + '. The village is against it.'); } else { s.permit.mairie = 'ok'; G.news('The mairie of ' + G.placeName(s.home) + ' signs the permit for ' + s.name + '.'); } }
    if (s.permit.canton === 'wait' && S.day >= s.cantonAt){ s.permit.canton = 'ok'; G.news('The canton grants the permit for deep drilling at ' + s.name + '.'); } } });
const askCanton = s => { if (s.permit.canton) return; s.permit.canton = 'wait'; s.cantonAt = G.S.day + 90 + Math.round(Math.random()*90); G.news('The application for a deep well at ' + s.name + ' goes to the canton. These things take months.'); };
// ---- wells: drawn by hand in the section of the site's line, from the pad down; straight unless the Atelier can bend them (30° at most)
const wellWorld = wl => { const s = byId(wl.site), l = byId(s.line) || GEO.legacy.find(q => q.id === s.line), g = lineGeom(l); return (wl.path || [[wl.u0, 0]]).map(([u, d]) => [g.ax + g.ex*u, g.ay + g.ey*u, d]); };
const planWorld = wl => { const s = byId(wl.site), l = byId(s.line) || GEO.legacy.find(q => q.id === s.line), g = lineGeom(l); return wl.plan.map(([u, d]) => [g.ax + g.ex*u, g.ay + g.ey*u, d]); };
const pointAtDepth = (wl, d) => { const P = wellWorld(wl); for (let i = 1; i < P.length; i++) if (d >= P[i - 1][2] && d <= P[i][2]){ const t = (d - P[i - 1][2])/((P[i][2] - P[i - 1][2]) || 1); return [lerp(P[i - 1][0], P[i][0], t), lerp(P[i - 1][1], P[i][1], t), d]; } return null; };
const lineOf = G.lineOf = s => byId(s.line) || GEO.legacy.find(q => q.id === s.line);
G.wellWorld = wl => wellWorld(wl); G.pointAtDepth = (wl, d) => pointAtDepth(wl, d);
const maxBend = () => G.company('atelier') ? 30 : 0;
function drawWell(s, wl){ const l = lineOf(s), rig = byId(s.rig), maxD = rig ? RIGS[rig.kind].maxD : 5000; wl = wl || {id:nid('w'), site:s.id, u0:s.u, plan:null, path:[[s.u, 0]], drilled:0, phases:null, tops:{}, hits:{}, cost:0};
  const start = wl.path[wl.path.length - 1], draw = {pts:[start.slice()], add:(u, d) => { const p = draw.pts[draw.pts.length - 1]; if (d <= p[1] + 20) return 'Wells only go down.'; if (d > maxD) return 'This rig reaches ' + M(maxD) + ' at most.';
      const ang = Math.atan2(Math.abs(u - p[0]), d - p[1])*180/Math.PI; if (ang > maxBend() + 0.01){ if (!maxBend()) u = p[0]; else return 'Too steep a bend: 30 degrees at most.'; } draw.pts.push([u, d]); return 'ok'; },
    commit:() => { if (draw.pts.length < 2) return 'Click in the section to draw the well.'; wl.plan = draw.pts.slice(); wl.phases = planPhases(wl); if (!s.wells.includes(wl.id)){ s.wells.push(wl.id); G.S.geo.wells.push(wl); } if (wl.plan[wl.plan.length - 1][1] > 2000) askCanton(s); G.closeWin('sec'); openSite(s); return 'ok'; },
    undo:() => { if (draw.pts.length > 1) draw.pts.pop(); return 'ok'; }, cancel:null, s, wl};
  openSection(l, s.u, draw); return 'ok'; }
const drawPanel = (A, draw) => { const est = draw.pts.length > 1 ? estimate(draw.pts) : null; return '<div class="row"><span class="grow">' + (est ? 'About ' + M(est.len) + ' of hole, ' + Math.round(est.days) + ' days at the bit, ' + fmt(est.cost) + ' with casing (typical rock: the section cannot name it).' : 'Click down the section from the pad to draw the well' + (maxBend() ? ' (bends up to 30°).' : ' (straight down: bending needs the Atelier).')) + '</span></div>' +
  '<button class="btn main" data-a="' + A('ok', () => draw.commit()) + '">Plan this well</button><button class="btn" data-a="' + A('undo', () => draw.undo()) + '">Undo a point</button>'; };
const typical = d => d < 450 ? 1 : d < 950 ? 3 : d < 1250 ? 5 : d < 1650 ? 9 : d < 2200 ? 10 : 7;
function estimate(pts, rigKind){ let len = 0, days = 0, cons = 0; for (let i = 1; i < pts.length; i++){ const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); for (let s = 0; s < L; s += 25){ const d = lerp(pts[i - 1][1], pts[i][1], s/L), t = typical(d); days += 25/(GEO.RSPEED[t]/30); cons += GEO.PERM[t]/100*25*(1 + d/1600); } len += L; }
  const deepest = pts[pts.length - 1][1], rate = deepest > 2200 ? RIGS.deep.day : RIGS.light.day; return {len, days, cost:Math.round(cons + days*rate + deepest*0.7*COST.casing/100)}; }
// phases: top hole below the karst, intermediate above the target, reservoir open
function planPhases(wl){ const D = wl.plan[wl.plan.length - 1][1], top = Math.min(D - 50, 650), mid = D > 1300 ? D - 250 : null, out = [{n:'Top hole', to:top, opts:{clean:true}, st:'plan'}];
  if (mid && mid > top + 200) out.push({n:'Intermediate', to:mid, opts:{}, st:'plan'}); out.push({n:'Reservoir', to:D, opts:{}, st:'plan', open:true}); return out; }
const phaseCost = (wl, ph, i) => { let c = 0; for (const k in ph.opts) if (ph.opts[k] && OPT[k]) c += OPT[k].c; if (!ph.open){ const from = i ? wl.phases[i - 1].to : 0; c += Math.round((ph.to - from)/100*COST.casing); } return c; };
function startPhase(s, wl){ const S = G.S, i = wl.phases.findIndex(p => p.st !== 'done'), ph = wl.phases[i], rig = byId(s.rig); if (!ph) return 'All phases are done.';
  if (!rig || !rig.up) return 'The rig is not up yet.'; if (s.permit.mairie !== 'ok') return 'The mairie’s permit is not signed yet.'; if (s.road && s.road.state !== 'ok') return 'The access road is not finished yet.';
  if (ph.to > 2000 && s.permit.canton !== 'ok'){ askCanton(s); return 'Deeper than 2 km needs the canton’s permit.' + (s.cantonAt ? ' Expected in about ' + G.dur(s.cantonAt - S.day) + '.' : ''); }
  if (ph.to > RIGS[rig.kind].maxD) return 'This rig reaches ' + M(RIGS[rig.kind].maxD) + ' at most.'; if (crewAt(s, 'driller').length < RIGS[rig.kind].crew) return 'This rig needs ' + RIGS[rig.kind].crew + ' drillers on the site.';
  const c = phaseCost(wl, ph, i); if (!G.pay(c, 'Casing, cement and phase options', s.name)) return 'This phase needs ' + fmt(c) + ' up front.'; wl.cost += c; ph.st = 'go'; ph.day0 = S.day; wl.going = true; wl.ph = i; S.marks = S.marks.filter(m => m.id !== 'mp' + wl.id);
  G.news('Drilling starts at ' + s.name + ': ' + ph.n.toLowerCase() + ' to about ' + M(ph.to) + (Object.keys(ph.opts).filter(k => ph.opts[k]).length ? ', with ' + Object.keys(ph.opts).filter(k => ph.opts[k]).map(k => OPT[k].n.toLowerCase()).join(', ') : ', plain water mud') + '.'); return 'ok'; }
// the path as a polyline in (u, d); the bit's position after s metres along it
const pathPt = (pts, s) => { for (let i = 1; i < pts.length; i++){ const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= L || i === pts.length - 1){ const t = L ? clamp(s/L, 0, 1) : 1; return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]; } s -= L; } return pts[pts.length - 1]; };
const sAtDepth = (pts, d) => { let acc = 0; for (let i = 1; i < pts.length; i++){ const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= pts[i][1]) return acc + L*clamp((d - pts[i - 1][1])/((pts[i][1] - pts[i - 1][1]) || 1), 0, 1); acc += L; } return acc; };
G.pathPt = (pts, s) => pathPt(pts, s); G.sAtDepth = (pts, d) => sAtDepth(pts, d); G.flowOf = (s, wl) => flowOf(s, wl);
const pathLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const rockAtWell = (s, u, d) => { const g = lineGeom(lineOf(s)); return GEO.rockAt(g.ax + g.ex*u, g.ay + g.ey*u, d); };
// one day of drilling: the bit advances by the rock's speed; supplies and the day rate are paid; the rock decides what happens
G.on('day', () => { const S = G.S; if (!S.geo) return; for (const wl of S.geo.wells) if (wl.going) drillDay(wl); });
function drillDay(wl){ const S = G.S, s = byId(wl.site), rig = s && byId(s.rig), ph = wl.phases[wl.ph]; if (!s || !rig || !ph) return;
  if (wl.halt && S.day < wl.halt) return; if (G.marchAt && G.marchAt(s)) return;
  if (crewAt(s, 'driller').length < RIGS[rig.kind].crew){ if (!wl.noCrew){ wl.noCrew = true; G.news('The rig at ' + s.name + ' stands still: it needs ' + RIGS[rig.kind].crew + ' drillers.'); } return; } wl.noCrew = false;
  if (S.cash < 0){ if (!wl.noCash){ wl.noCash = true; G.news('Drilling stops at ' + s.name + ': the account is empty.'); } return; } wl.noCash = false;
  const day = rig.own ? RIGS[rig.kind].dayOwn : RIGS[rig.kind].day; G.book('Rig day rates', -day, s.name); wl.cost += day; rig.drillingMonth = true;
  const pts = wl.plan, total = pathLen(pts), stop = Math.min(total, sAtDepth(pts, ph.to)); let s0 = wl.drilled, budget = 1;
  while (budget > 0 && wl.drilled < stop - 0.01){ const [u, d] = pathPt(pts, wl.drilled), t = rockAtWell(s, u, d), sp = GEO.RSPEED[t]/30*(ph.opts.heavy ? 0.9 : 1), step = Math.min(10, budget*sp, stop - wl.drilled);
    const c = GEO.PERM[t]/100*step*(1 + d/1600)*(ph.opts.heavy ? 1.3 : 1); if (s.sup < c){ if (!wl.noSup){ wl.noSup = true; G.news('The rig at ' + s.name + ' waits for supplies from the depot.'); } break; } wl.noSup = false; s.sup -= c; wl.cost += c;
    wl.drilled += step; budget -= step/sp; const [u2, d2] = pathPt(pts, wl.drilled); wl.path = pathUpTo(pts, wl.drilled); const t2 = rockAtWell(s, u2, d2);
    if (!(t2 in wl.hits)){ wl.hits[t2] = d2; wl.tops[t2] = d2; onRock(s, wl, t2, d2); }
    if (G.crewAt(s, 'geologist').length) lookAhead(s, wl, u2, d2);
    if (wl.drilled >= stop - 0.01) break;
    if (event(s, wl, ph, t2, u2, d2)) break; }
  if (wl.going && wl.drilled >= stop - 0.01) endPhase(s, wl, ph, wl.drilled >= total - 0.5);
  if (wl.drilled > s0) showSiteIf(s); }
const showSiteIf = s => { if (!s.shown){ s.shown = 1; showSite(s); } };
const pathUpTo = (pts, sAt) => { const out = [pts[0].slice()]; let acc = 0; for (let i = 1; i < pts.length; i++){ const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + L <= sAt){ out.push(pts[i].slice()); acc += L; } else { out.push(pathPt(pts, sAt)); break; } } return out; };
function onRock(s, wl, t, d){ const R = GEO.ROCK, T = GEO.tempAt(...wellAt(s, wl, d), d), here = s.name;
  const txt = t === R.WARM ? 'porous Muschelkalk limestone at ' + M(d) + ', water at about ' + T + ' °C. Only a flow test will tell how much water it gives.' : t === R.GRANITE ? 'crystalline basement at ' + M(d) + ', about ' + T + ' °C.' : t === R.COAL ? 'coal fragments in the cuttings at ' + M(d) + '. The mud logger watches the gas readings.' : t === R.WATER ? 'karst water at ' + M(d) + '.' + (d < 700 ? ' This is the drinking water.' : '') : t === R.SALT ? 'salt and anhydrite at ' + M(d) + '.' : t === R.FAULT ? 'broken rock at ' + M(d) + ': a fault zone.' : null;
  if (txt) G.news('At ' + here + ': ' + txt, {quiet:t !== R.WARM && t !== R.GRANITE}); }
const wellAt = (s, wl, d) => { const P = pointAtDepth(wl, d); return P ? [P[0], P[1]] : [s.x*K(), s.y*K()]; };
// a geologist on the site reads what comes: salt and faults are announced before the bit gets there
function lookAhead(s, wl, u, d){ const R = GEO.ROCK; for (const dd of [40, 80]){ const [u2, d2] = pathPt(wl.plan, wl.drilled + dd), t = rockAtWell(s, u2, d2); if ((t === R.SALT || t === R.FAULT || t === R.COAL) && !(wl.warned || {})[t]){ wl.warned = wl.warned || {}; wl.warned[t] = 1; G.news('The geologist at ' + s.name + ' expects ' + GEO.RNAME[t] + ' about ' + M(d2) + ' down.', {}); } } }
// what the rock does: decided once per stretch of rock; a started phase cannot be stopped, so the consequence simply follows
function event(s, wl, ph, t, u, d){ const R = GEO.ROCK, key = t + ':' + Math.floor(d/50); wl.seen = wl.seen || {}; if (wl.seen[key]) return false; wl.seen[key] = 1; const mudE = crewAt(s, 'mudeng').length > 0, rnd = Math.random;
  if (t === R.SALT && !ph.opts.salt && !wl.seen.salt){ wl.seen.salt = 1; if (rnd() < 0.6){ G.S.geo.swell.push({site:s.id, at:G.S.day + 300 + Math.round(rnd()*240)}); } warn(s, 'Salt and anhydrite on water mud', 'The cuttings show salt and anhydrite at ' + M(d) + '. The mud dissolves the salt and lets the anhydrite take on water. The crew drills on, as planned. Anhydrite that swells lifts the ground, sometimes years later.'); return false; }
  if ((t === R.WATER || (t === R.FAULT && d < 1000)) && rnd() < (t === R.WATER ? (ph.opts.heavy ? 0.75 : 0.5) : (ph.opts.heavy ? 0.45 : 0.15))*(mudE ? 0.5 : 1)){
    if (ph.opts.lcm){ wl.halt = G.S.day + 2; G.news('Mud losses at ' + s.name + ', ' + M(d) + ': the lost-circulation material seals them. Two days lost.'); return true; }
    const sev = (ph.opts.clean && wl.ph === 0 ? 1 : 2) + (s.zone ? 1 : 0); warn(s, 'Mud losses', 'Returns dropped at ' + M(d) + ': mud flows into ' + (t === R.WATER ? 'cavities in the limestone' : 'open fractures') + '. With no sealing material on site the crew drills on, and the mud goes into the ground.'); G.contaminate && G.contaminate(s, sev, 'mud losses at ' + s.name); return false; }
  if ((t === R.COAL || (t === R.FAULT && d >= 1300)) && rnd() < (ph.opts.heavy ? 0.07 : 0.4)*(mudE ? 0.6 : 1)){ kick(s, wl, d); return false; }
  if (t === R.FAULT && rnd() < (ph.opts.heavy ? 0.1 : 0.3)){ const days = 3 + Math.round(rnd()*5), c = 100 + Math.round(rnd()*200); wl.halt = G.S.day + days; G.book('Bits, mud and fishing', -c, s.name); wl.cost += c; G.news('Broken rock at ' + s.name + ', ' + M(d) + ': the pipe sticks and is worked free. ' + days + ' days and ' + fmt(c) + '.'); return true; }
  if (t === R.FAULT && d > 1500 && rnd() < 0.06){ G.quake && G.quake(s.x, s.y, 2.0 + rnd()*0.7, true, 'Drilling through the fault zone at ' + s.name + ' sets off a small earthquake.'); }
  return false; }
// a gas kick: drilling goes on; the one choice is to flare the gas (the village is angry) or not (a blowout can follow)
function kick(s, wl, d){ const it = {id:nid('k'), site:s.id, well:wl.id, d, day:G.S.day}; G.S.geo.kick = it; G.S.marks.push({kind:'!', id:'mk' + it.id, at:[s.x, s.y, G.world.hb(s.x, s.y) + 22], ref:s.id}); G.news('Gas kick at ' + s.name + ', ' + M(d) + '. The preventer holds; drilling goes on. Flare it or not?'); openSite(s); }
function kickAnswer(s, flare){ const it = G.S.geo.kick; if (!it) return; G.S.geo.kick = null; G.S.marks = G.S.marks.filter(m => m.id !== 'mk' + it.id);
  if (flare){ G.book('Gas flare', -60, s.name); G.mood && G.mood(s.home, -3, 'Gas flare at night'); s.flare = G.S.day + 12; G.news('A gas flare burns over ' + s.name + ' for days. It smells of eggs.'); return 'ok'; }
  if (Math.random() < 0.35) blowout(s); else G.news('The gas at ' + s.name + ' is circulated out with the mud. This time nothing happens.'); return 'ok'; }
function blowout(s){ const wl = byId(s.wells[s.wells.length - 1]); if (wl){ wl.going = false; wl.blown = true; } G.book('Blowout: wild well control', -2500, s.name); s.burning = G.S.day + 20; G.contaminate && G.contaminate(s, 2, 'the blowout at ' + s.name); G.mood && G.mood(s.home, -12, 'Blowout'); G.moodAll && G.moodAll(-4, 'A blowout in the valley');
  G.news('Blowout at ' + s.name + '. Mud and gas shoot out of the well, then fire. A wild-well team from abroad caps it after days. CHF 2.5 M.'); G.crisis && G.crisis({kind:'blowout', site:s.id, home:s.home}); }
const warn = (s, title, text) => { G.S.geo.warnings = G.S.geo.warnings || []; G.S.geo.warnings.unshift({site:s.id, title, text, day:G.S.day}); G.news(title + ' at ' + s.name + '. ' + text.split('.')[0] + '.'); };
// end of a phase: casing is run and cemented (the bond log proves it, or the gaps stay hidden); at the end of the well the result
function endPhase(s, wl, ph, last){ const S = G.S; ph.st = 'done'; wl.going = false; const d = pathPt(wl.plan, wl.drilled)[1];
  if (!ph.open){ const cav = Object.keys(wl.hits).map(Number).includes(GEO.ROCK.WATER), cem = crewAt(s, 'cementer').length > 0, gap = Math.random() < (cav ? 0.65 : 0.15)*(cem ? 0.25 : 1);
    if (gap && ph.opts.cbl){ G.book('Cement squeeze', -COST.squeeze, s.name); wl.halt = S.day + 3; G.news('The bond log at ' + s.name + ' shows gaps behind the casing. A cement squeeze closes them: ' + fmt(COST.squeeze) + '.'); } else if (gap) wl.gaps = true;
    wl.halt = Math.max(wl.halt || 0, S.day + 3); G.news('Casing run to ' + M(ph.to) + ' at ' + s.name + ' and cemented' + (ph.opts.cbl ? ', bond log checked.' : '.')); }
  if (last || wl.phases.every(p => p.st === 'done')){ wl.done = true; const [X, Y] = wellAt(s, wl, d), T = GEO.tempAt(X, Y, d), R = GEO.ROCK, open = openRocks(s, wl), aq = open[R.WARM] || 0, gr = open[R.GRANITE] || 0; wl.T = T; wl.depth = d;
    G.news('Well finished at ' + s.name + ', ' + M(d) + ': ' + (gr ? 'granite at the bottom, about ' + T + ' °C.' : aq ? 'open in the Muschelkalk, the water comes at about ' + GEO.tempAt(X, Y, wl.hits[R.WARM]) + ' °C.' : 'no water-bearing layer is open; rock at about ' + T + ' °C.') + ' It cost ' + fmt(wl.cost) + '.');
    if (gr && d >= 3000) S.granite3000 = true; if (gr && T >= 120 && !S.hotProven){ S.hotProven = true; G.news('Hot granite is proven: ' + T + ' °C at ' + M(d) + '.'); G.emit('hotProven'); } G.emit('wellDone', wl, s); }
  else G.S.marks.push({kind:'!', id:'mp' + wl.id, at:[s.x, s.y, G.world.hb(s.x, s.y) + 22], ref:wl.id, once:1}); }
// what the open hole (below the last casing) is in, metre by metre
const openRocks = (s, wl) => { const shoe = Math.max(0, ...wl.phases.filter(p => p.st === 'done' && !p.open).map(p => p.to)), out = {}; for (let s1 = 0; s1 < wl.drilled; s1 += 10){ const [u, d] = pathPt(wl.plan, s1); if (d <= shoe) continue; const t = rockAtWell(s, u, d); out[t] = (out[t] || 0) + 10; } return out; };
G.openRocks = openRocks;
// ---- flow test: pumped for two weeks; the flow and the temperature
function flowTest(s, wl){ if (!wl.done) return 'Finish the well first.'; if (wl.flow) return 'Already tested.'; if (!G.pay(COST.flowTest, 'Flow tests', s.name)) return 'A flow test costs ' + fmt(COST.flowTest) + '.'; wl.testing = G.S.day + 14; G.news('A flow test starts at ' + s.name + '. Two weeks.'); return 'ok'; }
G.on('day', () => { const S = G.S; if (!S.geo) return; for (const wl of S.geo.wells) if (wl.testing && S.day >= wl.testing){ wl.testing = null; const s = byId(wl.site), r = flowOf(s, wl); wl.flow = r; G.news('Flow test at ' + s.name + ': ' + (r.flow < 1 ? 'almost nothing comes up.' : Math.round(r.flow) + ' litres a second at ' + r.T + ' °C' + (r.mw ? ', about ' + r.mw.toFixed(1) + ' MW of heat from a doublet.' : '.'))); G.emit('flowTest', wl, s, r); } });
function flowOf(s, wl){ const R = GEO.ROCK, open = openRocks(s, wl), aq = open[R.WARM] || 0, gr = open[R.GRANITE] || 0, [u, d] = pathPt(wl.plan, wl.drilled), g = lineGeom(lineOf(s)), X = g.ax + g.ex*u, Y = g.ay + g.ey*u, perm = GEO.permAt(X, Y, d);
  if (aq){ const flow = (4 + 40*perm)*Math.min(1, aq/120), T = GEO.tempAt(X, Y, wl.hits[R.WARM] || d); return {flow, T, perm, rock:'aq', mw:flow*4.18*(T - 15)/1000}; }
  if (gr){ const flow = (1 + 4*perm)*Math.min(1, gr/400), T = GEO.tempAt(X, Y, d); return {flow, T, perm, rock:'granite', mw:0}; } return {flow:0.3*perm, T:GEO.tempAt(X, Y, d), perm, rock:'dry', mw:0}; }
// ---- plugging: cement from the bottom up; an abandoned hole has to be plugged too
function plug(s, wl){ if (wl.going) return 'It is drilling.'; const c = COST.plug + Math.round((wl.depth || 0)/1000*80); if (!G.pay(c, 'Plugging wells', s.name)) return 'Plugging costs ' + fmt(c) + '.'; wl.plugged = true; G.news('The well at ' + s.name + ' is filled with cement from the bottom up.'); return 'ok'; }
// ---- the site's window: permits and road, the rig, the crew, supplies, the wells and their phases
function openSite(s){ G.S.marks = G.S.marks.filter(m => !(m.once && s.wells.includes(m.ref))); G.openWin(s.id, {wide:true, title:s.name, sub:'on ' + (lineOf(s) || {}).name, at:() => [s.x, s.y, G.world.hb(s.x, s.y) + 12], tabs:['Site', 'Wells'], body:(A, w) => w.tab === 0 ? siteTab(A, s) : wellsTab(A, s)}); }
G.openSite = openSite;
function siteTab(A, s){ const S = G.S, rig = byId(s.rig), st = v => v === 'ok' ? '<b class="pos">signed</b>' : v === 'wait' ? 'waiting' + (s.permitAt ? ', about ' + G.dur(Math.max(1, (v === s.permit.canton ? s.cantonAt : s.permitAt) - S.day)) : '') : v === 'no' ? '<b class="neg">refused</b>' : '—';
  let h = '<div class="kv"><span>Mairie permit</span><span>' + st(s.permit.mairie) + '</span><span>Canton permit</span><span>' + (s.permit.canton ? (s.permit.canton === 'ok' ? '<b class="pos">granted</b>' : 'waiting, about ' + G.dur(Math.max(1, s.cantonAt - S.day))) : 'only for wells deeper than 2 km') + '</span>';
  h += '<span>Access road</span><span>' + (!s.road || s.road.state === 'ok' ? 'ready' : s.road.state === 'building' ? 'being built' : 'booked with the road builder') + '</span><span>Supplies on site</span><span>' + fmt(s.sup) + (s.supComing ? ' (a lorry is coming)' : '') + '</span>' + (s.zone ? '<span>Protection zone</span><span>outer zone: sealed pad</span>' : '') + '</div>';
  h += '<div class="sec"><h3>Rig</h3>' + (rig ? '<p>' + RIGS[rig.kind].n + (rig.own ? ', owned' : ', leased') + ': ' + (rig.up ? 'standing on the pad.' : rig.at === 'moving' ? 'on its way.' : 'setting up.') + '</p>' + (rig.up ? '<button class="btn small" data-a="' + A('rel', () => releaseRig(s)) + '">Take the rig down</button>' : '') :
    '<p class="muted">No rig. Leased rigs cost a monthly standby while not drilling and a day rate while drilling.</p>' + Object.keys(RIGS).map(k => '<button class="btn small" data-a="' + A('rig' + k, () => bringRig(s, k)) + '">' + RIGS[k].n + ': ' + fmt(RIGS[k].lease) + ' to bring, ' + fmt(RIGS[k].day) + '/day drilling</button>').join('')) + '</div>';
  h += '<div class="sec"><h3>Crew on site</h3>'; for (const tr of ['driller', 'geologist', 'mudeng', 'cementer', 'water', 'liaison', 'security', 'seismo']){ const n = crewAt(s, tr).length, idle = S.staff.filter(p => p.tr === tr && p.st === 'idle').length; if (!n && !idle && tr !== 'driller') continue;
    h += '<div class="row"><span class="grow">' + G.TRADES[tr].pl + ': <b>' + n + '</b>' + (tr === 'driller' && rig ? ' of ' + RIGS[rig.kind].crew : '') + '</span><button class="btn small" data-a="' + A('add' + tr, () => sendCrew(s, tr)) + '"' + (idle ? '' : ' disabled') + '>+ ' + idle + ' idle</button><button class="btn small" data-a="' + A('rem' + tr, () => recallCrew(s, tr)) + '"' + (n ? '' : ' disabled') + '>−</button></div>'; }
  h += '</div>'; if (S.geo.kick && S.geo.kick.site === s.id) h += '<div class="sec"><h3 class="neg">Gas kick at ' + M(S.geo.kick.d) + '</h3><p>The preventer holds; the crew drills on. The gas has to go somewhere.</p><button class="btn" data-a="' + A('flare', () => kickAnswer(s, true)) + '">Flare it (' + fmt(60) + '; the village will see it)</button><button class="btn" data-a="' + A('noflare', () => kickAnswer(s, false)) + '">Circulate it out and hope</button></div>';
  return h + G.emitHtml('site', A, s); }
function wellsTab(A, s){ const S = G.S, rig = byId(s.rig); let h = '';
  for (const id of s.wells){ const wl = byId(id); if (!wl) continue; const i = wl.phases ? wl.phases.findIndex(p => p.st !== 'done') : -1, D = wl.plan ? wl.plan[wl.plan.length - 1][1] : 0;
    h += '<div class="sec"><h3>Well ' + (s.wells.indexOf(id) + 1) + (wl.plugged ? ' · plugged' : wl.done ? ' · finished, ' + M(wl.depth) : wl.going ? ' · drilling, ' + M(pathPt(wl.plan, wl.drilled)[1]) : ' · planned to ' + M(D)) + '</h3>';
    if (wl.phases) for (let k = 0; k < wl.phases.length; k++){ const ph = wl.phases[k]; h += '<div class="row"><span class="grow"><b>' + ph.n + '</b> to ' + M(ph.to) + (ph.open ? ', open hole' : ', cased') + ' · <span class="muted">' + (ph.st === 'done' ? 'done' : ph.st === 'go' ? 'drilling' : 'planned') + '</span></span>' +
      (ph.st === 'plan' && k === i ? '<button class="btn small" data-a="' + A('dn' + id + k, () => { ph.to = Math.max((k ? wl.phases[k - 1].to : 0) + 100, ph.to - 50); return 'ok'; }) + '">−50 m</button><button class="btn small" data-a="' + A('up' + id + k, () => { ph.to = Math.min(D, ph.to + 50); return 'ok'; }) + '">+50 m</button>' : '') + '</div>';
      if (ph.st === 'plan' && k === i){ h += '<div style="padding:4px 0 6px 8px">' + Object.keys(OPT).filter(o => (!OPT[o].top || k === 0) && (!OPT[o].cased || !ph.open)).map(o => '<label style="display:block;font-size:13px"><input type="checkbox" data-a="' + A('o' + id + k + o, () => { ph.opts[o] = !ph.opts[o]; return 'ok'; }) + '"' + (ph.opts[o] ? ' checked' : '') + '> ' + OPT[o].n + (OPT[o].c ? ' · ' + fmt(OPT[o].c) : '') + ' <span class="muted">— ' + OPT[o].h + '</span></label>').join('') +
        '<p class="muted" style="margin:4px 0">Geologist or mud engineer on site: earlier warnings, fewer losses and kicks. A started phase cannot be stopped.</p><button class="btn main" data-a="' + A('go' + id, () => startPhase(s, wl)) + '">Start the ' + ph.n.toLowerCase() + ' · ' + fmt(phaseCost(wl, ph, k)) + ' now, ' + fmt(rig ? (rig.own ? RIGS[rig.kind].dayOwn : RIGS[rig.kind].day) : 20) + ' a day while drilling</button>' +
        (k > 0 ? '<button class="btn small" data-a="' + A('redraw' + id, () => drawWell(s, wl)) + '">Redraw the rest</button>' : '') + '</div>'; } }
    if (wl.done){ h += wl.flow ? '<p>Flow test: ' + (wl.flow.flow < 1 ? 'almost nothing.' : Math.round(wl.flow.flow) + ' L/s at ' + wl.flow.T + ' °C.') + '</p>' : (wl.testing ? '<p>The flow test is running.</p>' : '<button class="btn" data-a="' + A('ft' + id, () => flowTest(s, wl)) + '">Flow test · ' + fmt(COST.flowTest) + '</button>');
      if (!wl.plugged) h += '<button class="btn small" data-a="' + A('pl' + id, () => plug(s, wl)) + '">Plug it</button>'; h += G.emitHtml('well', A, s, wl); }
    if (!wl.phases) h += '<button class="btn" data-a="' + A('dr' + id, () => drawWell(s, wl)) + '">Draw the well</button>'; h += '</div>'; }
  const busy = s.wells.some(id => { const w = byId(id); return w && !w.done && !w.plugged; });
  if (!busy) h += '<div class="sec"><button class="btn main" data-a="' + A('new', () => drawWell(s)) + '">' + (s.wells.length ? 'Draw another well from this pad' : 'Draw the well') + '</button>' + (rig ? '' : '<p class="muted">The rig decides how deep: light to 2.2 km, deep to 5 km.</p>') + '</div>';
  return h + G.emitHtml('wells', A, s); }
// ---- springs: their windows
function openSpring(sp){ G.openWin('sp' + sp.home, {title:'Spring of ' + G.placeName(sp.home), sub:'karst water, drinking water', at:() => [sp.x, sp.y, G.world.hb(sp.x, sp.y) + 2], body:() => '<p>' + ['Clear and cold. The water comes out of the limestone after travelling through it for weeks.', 'Cloudy since the drilling. It should clear in a few months.', 'Boil-water notice. The Company pays for bottled water.', 'Polluted for good.'][sp.lvl || 0] + '</p><p class="muted">A protection zone surrounds it: no drilling inside the inner rings; a sealed pad in the outer one.</p>'}); }
G.openSpring = openSpring;
// contamination travels through the karst: the nearest spring and others linked to the site
G.contaminate = (s, sev, why) => { const sp = GEO.springs.map(q => ({q, d:Math.hypot(q.x - s.x, q.y - s.y)})).filter(o => o.d < 130 || (o.d < 320 && GEO.h(Math.round(s.x/12), Math.round(s.y/12), 40 + o.q.x) < 1.2 - o.d/320)).sort((a, b) => a.d - b.d);
  sp.forEach((o, i) => spoil(o.q, Math.max(1, sev - (i ? 1 : 0)), why)); };
function spoil(sp, sev, why){ const before = sp.lvl || 0; if (before === 3) return; let lvl = Math.max(before, sev); if (before >= 2 && sev >= 2) lvl = 3; sp.lvl = Math.min(3, lvl); if (sp.lvl === before) return;
  if (sp.lvl === 1 && G.S.staff.some(p => p.tr === 'water')){ sp.lvl = before; G.news('The water officer finds traces in the spring of ' + G.placeName(sp.home) + ' after ' + why + ' and has it flushed. Nobody notices.'); return; }
  const hit = [0, -3, -12, -20][sp.lvl] - [0, -3, -12, -20][before]; G.mood && G.mood(sp.home, hit, ['', 'Cloudy spring', 'Boil-water notice', 'Polluted spring'][sp.lvl]);
  G.news(['', 'The spring of ' + G.placeName(sp.home) + ' runs cloudy after ' + why + '.', 'Boil-water notice in ' + G.placeName(sp.home) + ' after ' + why + '. The Company pays for bottled water.', 'The spring of ' + G.placeName(sp.home) + ' is polluted for good after ' + why + '. The canton fines the Company ' + fmt(500) + '.'][sp.lvl]);
  if (sp.lvl === 3) G.book('Fines and compensation', -500, 'Canton'); if (sp.lvl >= 2) G.crisis && G.crisis({kind:'water', home:sp.home}); sp.until = G.S.day + (sp.lvl === 1 ? 90 : 540); G.S.geo.springLvl = GEO.springs.map(q => [q.lvl || 0, q.until || 0]); }
G.monthly.push(() => GEO ? GEO.springs.filter(q => q.lvl === 2).map(q => ({line:'Bottled water', who:G.placeName(q.home), k:-30})) : []);
G.on('month', () => { if (!GEO) return; for (const q of GEO.springs) if (q.lvl && q.lvl < 3 && G.S.day >= (q.until || 0)){ q.lvl = 0; G.news('The spring of ' + G.placeName(q.home) + ' runs clear again.'); } G.S.geo.springLvl = GEO.springs.map(q => [q.lvl || 0, q.until || 0]); });
G.on('world', () => { const L = G.S.geo && G.S.geo.springLvl; if (L) GEO.springs.forEach((q, i) => { if (L[i]){ q.lvl = L[i][0]; q.until = L[i][1]; } }); });
// swelling anhydrite: the ground rises under the houses near the site, months or years later
G.on('day', () => { const g = G.S.geo; if (!g) return; for (const sw of g.swell.slice()) if (G.S.day >= sw.at){ g.swell.splice(g.swell.indexOf(sw), 1); const s = byId(sw.site); if (!s) continue; G.book('Damage: swelling ground', -1500, s.name); G.mood && G.mood(s.home, -10, 'Cracked houses'); G.news('The ground under ' + G.placeName(s.home) + ' is rising: the anhydrite below ' + s.name + ' has taken on water. Cracks in walls and roads. The Company pays CHF 1.5 M for repairs, so far.'); G.crisis && G.crisis({kind:'swell', home:s.home}); } });
// ---- the Bureau: flags and the supplies level
G.hooks['html:bureau:company'].push(() => '<div class="sec"><h3>Exploration</h3><button class="btn" data-a="flag">Pick up a prospect flag</button><p class="muted">A geologist drives out and plants it.</p><h3 style="margin-top:8px">Supplies at the depot</h3><p>' + fmt(G.S.geo.sup) + ' in stock; reordered below ' + fmt(G.S.geo.supLvl) + '.</p><button class="btn small" data-a="supdn">− 200k</button><button class="btn small" data-a="supup">+ 200k</button></div>');
G.on('html:building:canton', () => '<div class="sec"><h3>Geology office</h3>' + (G.S.geo && G.S.geo.archive ? '<p>The 1970s petroleum lines are yours: on the map in brown, dashed.</p>' : '<p>The 1970s petroleum survey: a few lines across the valley, on paper.</p><button class="btn" data-a="archive">Buy the archive · ' + fmt(COST.archive) + '</button>') + '</div>');
// the Bureau window's buttons for these (registered as global actions)
G.globalActs = G.globalActs || {}; Object.assign(G.globalActs, {archive:() => G.buyArchive(), flag:() => flagAct(), supdn:() => { G.S.geo.supLvl = Math.max(0, G.S.geo.supLvl - 200); return 'ok'; }, supup:() => { G.S.geo.supLvl += 200; return 'ok'; }});
})();
