/* Jurafrackers 2.0 — the reservoir. Doublets (a production well and an injection well), stimulation of the granite with its
   traffic light and the micro-quake cloud, circulation tests, heat stations and power plants built by the builders, and
   earthquakes, induced and natural, with what they do to the valley. */
(function(){
'use strict';
const G = globalThis.G, {fmt, esc, clamp, lerp} = G;
const COST = G.COST, byId = id => G.geoById(id), M = d => G.M(d);
const RK = () => G.geo.ROCK;
G.on('world', () => { const g = G.S.geo; g.doublets = g.doublets || []; g.quakes = g.quakes || []; });
// ---- wells as the reservoir sees them: where the bottom is (underground metres), what the open hole is in
const bottom = wl => { const P = G.wellWorld(wl); return P[P.length - 1]; };
const kindOf = wl => { if (!wl.done || wl.plugged || wl.blown) return null; const o = G.openRocks(byId(wl.site), wl), R = RK(); return (o[R.GRANITE] || 0) >= 50 ? 'granite' : (o[R.WARM] || 0) >= 20 ? 'aq' : null; };
G.kindOf = kindOf;
const wellName = wl => { const s = byId(wl.site); return 'well ' + (s.wells.indexOf(wl.id) + 1) + ' at ' + s.name; };
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const doubletOf = wl => (G.S.geo.doublets || []).find(d => d.prod === wl.id || d.inj === wl.id);
G.doubletOf = doubletOf;
// ---- pairing two finished wells open in the same layer
function pair(prod, inj){ const k = kindOf(prod); if (!k || kindOf(inj) !== k) return 'Both wells have to be finished and open in the same layer.';
  if (doubletOf(prod) || doubletOf(inj)) return 'One of them is already part of a doublet.';
  const d = dist3(bottom(prod), bottom(inj)); if (d < 300) return 'The bottoms are only ' + M(d) + ' apart: the cold water would come straight back.'; if (d > 2500) return 'The bottoms are ' + M(d) + ' apart: too far for the water to find its way.';
  const db = {id:G.nid('d'), prod:prod.id, inj:inj.id, kind:k, dist:Math.round(d), station:null}; G.S.geo.doublets.push(db);
  G.news('A doublet: ' + wellName(prod) + ' brings the water up, ' + wellName(inj) + ' sends it back down. The bottoms are ' + M(d) + ' apart.'); return 'ok'; }
function unpair(db){ if (db.station || db.job) return 'A station stands on it.'; G.S.geo.doublets.splice(G.S.geo.doublets.indexOf(db), 1); return 'ok'; }
// what a doublet gives: the aquifer by its flow tests; the granite by how well the stimulated rock around the two wells connects
function output(db){ const p = byId(db.prod), i = byId(db.inj), sp = byId(p.site), si = byId(i.site), fp = G.flowOf(sp, p), fi = G.flowOf(si, i), T = fp.T;
  let flow; if (db.kind === 'aq') flow = Math.min(fp.flow, fi.flow*1.3);
  else { const r1 = p.stim ? p.stim.r : 0, r2 = i.stim ? i.stim.r : 0, c = clamp((r1 + r2 - db.dist)/300 + 0.6, 0, 1); flow = (1.5 + 40*c)*(0.7 + 0.6*clamp(fp.perm, 0, 1)); db.link = Math.round(c*100); }
  const heat = flow*4.18*Math.max(0, T - 35)/1000, eff = T < 110 ? 0 : clamp(0.06 + (T - 110)*0.0012, 0, 0.14), power = flow*4.18*Math.max(0, T - 70)/1000*eff;
  return {flow, T, heat, power}; }
G.doubletOutput = output;
// ---- the circulation test: water pumped down one well and up the other for a month
function circTest(db){ if (db.kind !== 'granite') return 'The flow tests already tell what the aquifer gives.'; if (db.circ || db.circAt) return 'Already done.'; if (!G.pay(COST.circ, 'Circulation tests', byId(byId(db.prod).site).name)) return 'A circulation test costs ' + fmt(COST.circ) + '.';
  db.circAt = G.S.day + 30; G.news('A circulation test starts: water goes down ' + wellName(byId(db.inj)) + ' and should come up ' + wellName(byId(db.prod)) + '. A month.'); return 'ok'; }
G.on('day', () => { const g = G.S.geo; if (!g || !g.doublets) return; for (const db of g.doublets) if (db.circAt && G.S.day >= db.circAt){ db.circAt = null; const o = output(db); db.circ = {flow:o.flow, T:o.T};
  G.news('Circulation test: ' + (o.flow < 4 ? 'the water goes down and hardly anything comes back. The two wells barely talk to each other.' : Math.round(o.flow) + ' litres a second come back up at ' + o.T + ' °C.' + (o.power > 0.3 ? ' Enough for a small power plant.' : ''))); G.emit('circTest', db, o); } });
// ---- stations: a heat station for any doublet, a power plant for hot granite; the builders put them up
const STN = {heat:{n:'Heat station', cost:'station', days:120}, plant:{n:'Power plant', cost:'plant', days:240}};
function buildStation(db, kind){ const p = byId(db.prod), s = byId(p.site), o = output(db);
  if (db.station || db.job) return 'There is already a station on this doublet.';
  if (kind === 'plant'){ if (db.kind !== 'granite') return 'A power plant needs hot granite.'; if (!db.circ) return 'A circulation test first: nobody builds a plant on hope.'; if (o.T < 110) return 'At ' + o.T + ' °C the water is not hot enough for power.'; if (!G.company('centre')) return 'A power plant needs the Centre de compétences.'; }
  const spot = stationSpot(s, kind); if (typeof spot === 'string') return spot;
  const c = COST[STN[kind].cost]; if (!G.pay(c, 'Building: ' + STN[kind].n.toLowerCase() + 's', s.name)) return 'A ' + STN[kind].n.toLowerCase() + ' costs ' + fmt(c) + '.';
  db.job = kind; s.stAt = spot; G.contract('build', {what:STN[kind].n.toLowerCase() + ' at ' + s.name, days:STN[kind].days, db:db.id, kind, start:'stationStart', done:'stationDone'}); return 'ok'; }
// a free spot beside the pad, turned like it; the ground is cleared and levelled when the builders arrive
function stationSpot(s, kind){ const m = G.world.model(STN[kind].n), [pw, pd] = [G.RIGS.light.pad[0] + 8, G.RIGS.light.pad[1] + 4], ca = Math.cos(s.a), sa = Math.sin(s.a);
  for (const gap of [6, 14]) for (const [u, v] of [[-(pw/2 + m.W/2 + gap), 0], [pw/2 + m.W/2 + gap, 0], [0, -(pd/2 + m.D/2 + gap)], [0, pd/2 + m.D/2 + gap], [-(pw/2 + m.W/2 + gap), pd/2], [pw/2 + m.W/2 + gap, -pd/2]]){ const x = s.x + u*ca - v*sa, y = s.y + u*sa + v*ca, r = G.world.canBuild(x, y, m.W + 4, m.D + 4, s.a); if (typeof r !== 'string') return [x, y]; }
  for (let r = Math.max(pw, pd)/2 + m.W/2 + 10; r < 90; r += 5) for (let k = 0; k < 32; k++){ const t = k*Math.PI/16, x = s.x + Math.cos(t)*r, y = s.y + Math.sin(t)*r; if (typeof G.world.canBuild(x, y, m.W + 4, m.D + 4, s.a) !== 'string') return [x, y]; }   // further out: a longer pipe
  return 'No room near the pad for a ' + STN[kind].n.toLowerCase() + '.'; }
G.JOB.stationStart = j => { const db = (G.S.geo.doublets || []).find(d => d.id === j.db); if (!db) return; const s = byId(byId(db.prod).site), m = G.world.model(STN[j.kind].n), [x, y] = s.stAt; G.world.addSite(x, y, m.W + 4, m.D + 4, s.a, {station:true}); G.S.changes.push({t:'site', cx:x, cy:y, w:m.W + 4, d:m.D + 4, a:s.a, extra:{station:true}}); G.vehicle('Tipper (builders)', G.world.roads[0][0], [s.x, s.y], {kind:'lorry'}); G.vehicle('Excavator', G.world.roads[0][0], [s.x, s.y], {kind:'lorry'}); };
G.JOB.stationDone = j => { const db = (G.S.geo.doublets || []).find(d => d.id === j.db); if (!db) return; const s = byId(byId(db.prod).site); db.station = j.kind; db.job = null; s.station = j.kind; G.showSite(s); G.emit('ribbon', s.stAt ? s.stAt[0] : s.x, s.stAt ? s.stAt[1] : s.y, s.home);
  G.news('The ' + STN[j.kind].n.toLowerCase() + ' at ' + s.name + ' is finished. ' + (j.kind === 'heat' ? 'It waits for heat pipes to a village.' : 'It waits for a power line to the utility’s substation.')); G.emit('stationDone', db, s); };
// ---- stimulation: water pressed into the granite stage by stage until it cracks; the micro-quakes show where
const PSTEP = 40, PMIN = 120, PMAX = 320, DAYS = 4;
const openStretch = (s, wl) => { const shoe = Math.max(0, ...wl.phases.filter(p => p.st === 'done' && !p.open).map(p => p.to)), s0 = G.sAtDepth(wl.plan, shoe), s1 = wl.drilled; return [Math.min(s0, s1 - 20), s1]; };
function stimPlan(wl){ const s = byId(wl.site), [a, b] = openStretch(s, wl), n = 5, st = []; for (let i = 0; i < n; i++) st.push({at:lerp(a, b, (i + 0.5)/n), P:200}); return {stages:st, y:1.4, r:2.0, auto:true, cur:-1, day:0, ev:[], maxM:-9, inj:0, r0:0}; }
const reStage = (wl, n) => { const s = byId(wl.site), [a, b] = openStretch(s, wl), old = wl.run.stages; wl.run.stages = []; for (let i = 0; i < n; i++) wl.run.stages.push({at:lerp(a, b, (i + 0.5)/n), P:(old[i] || old[old.length - 1]).P}); };
const seismo = s => G.crewAt(s, 'seismo').length > 0;
function stimCheck(s, wl){ if (G.S.val && G.S.val.noPump > G.S.day) return 'The CEO promised: no pumping for another ' + G.dur(G.S.val.noPump - G.S.day) + '.'; if (!G.company('centre')) return 'Stimulation needs the Centre de compétences.'; if (kindOf(wl) !== 'granite') return 'Only granite is stimulated: the open hole has to be in it.'; if (wl.stim) return 'This well is already stimulated.'; if (s.wells.some(id => { const w = byId(id); return w && w.going; })) return 'A rig is drilling on this pad.'; return true; }
function stimStart(s, wl){ const ok = stimCheck(s, wl); if (ok !== true) return ok; const run = wl.run; if (run.cur >= 0) return 'Already pumping.';
  if (!G.pay(COST.stage, 'Stimulation', s.name)) return 'Each stage costs ' + fmt(COST.stage) + '.'; run.cur = 0; run.day = 0; run.plan = seismo(s) && run.auto; run.light = seismo(s) ? 'g' : null; G.emit('stimStart', s, wl, run);
  G.news('The pumps start at ' + s.name + ': stage 1 of ' + run.stages.length + ' at ' + run.stages[0].P + ' bar.' + (seismo(s) ? ' The seismologist watches the traffic light.' : ' Nobody watches the seismometers.')); return 'ok'; }
// a stage's events: Gutenberg–Richter, more and bigger with pressure, near faults and as the rock fills with water
function stimDay(s, wl){ const run = wl.run, st = run.stages[run.cur], P = st.P, Pn = P/200, g = G.lineGeom(G.lineOf(s)), [u, d] = G.pathPt(wl.plan, st.at), X = g.ax + g.ex*u, Y = g.ay + g.ey*u;
  const nearF = G.geo.faultNear(X, Y, d, 300), b = nearF ? 0.8 : 1.05, lam = 8*Pn*Pn*Pn*(1 + run.inj/80), n = Math.round(lam*(0.6 + 0.8*Math.random()));
  run.inj += Pn; st.days = (st.days || 0) + 1; const rad = 40 + 22*st.days*Pn; let top = -9;
  for (let k = 0; k < n; k++){ const m = Math.min(4.6, -0.8 - Math.log10(1 - Math.random()*0.99999)/b), a = Math.random()*Math.PI*2, rr = rad*Math.sqrt(Math.random()); run.ev.push([Math.round(u + Math.cos(a)*rr*1.3), Math.round(d + Math.sin(a)*rr*0.7), Math.round(m*10)/10, G.S.day]); top = Math.max(top, m); }
  if (run.ev.length > 900) run.ev.splice(0, run.ev.length - 900);
  run.maxM = Math.max(run.maxM, top); run.r0 = 80 + 45*run.stages.reduce((t, q) => t + (q.days || 0)/DAYS*Math.pow(q.P/200, 1.5), 0);
  run.flow = 1 + 30*(1 - Math.exp(-run.r0/400))*Pn;
  if (top >= 2) G.quake(X/G.geo.K, Y/G.geo.K, top, true, 'The pumps at ' + s.name + ' set off an earthquake.', {plan:!!run.plan && seismo(s)});
  if (seismo(s)){ if (run.light === null){ run.light = 'g'; run.plan = run.auto; G.news('The seismologist at ' + s.name + ' switches the traffic light on.', {quiet:true}); } const was = run.light; run.light = top >= run.r ? 'r' : top >= run.y ? 'y' : run.light === 'y' ? 'y' : 'g';
    if (run.light === 'r'){ if (run.plan){ G.news('Red at ' + s.name + ': magnitude ' + top.toFixed(1) + '. As planned, the pumps stop and the well is bled off.'); return stimEnd(s, wl, true); } else if (was !== 'r') G.news('Red at ' + s.name + ': magnitude ' + top.toFixed(1) + '. No automatic stop was planned; the pumps keep going.'); }
    else if (run.light === 'y' && was === 'g') G.news('Yellow at ' + s.name + ': magnitude ' + top.toFixed(1) + '. Lower the pressure or stop.'); }
  if (st.days >= DAYS){ run.cur++; if (run.cur >= run.stages.length) return stimEnd(s, wl, false);
    if (!G.pay(COST.stage, 'Stimulation', s.name)){ G.news('The money runs out at ' + s.name + ' after stage ' + run.cur + '. The pumps stop.'); return stimEnd(s, wl, false); } } }
// the end: shut in (or bled off). Water left under pressure can still let the rock slip, days later
function stimEnd(s, wl, bled){ const run = wl.run; run.cur = -2; if (bled) G.book('Stimulation', -COST.bleed, s.name);
  wl.stim = {r:Math.round(run.r0), flow:Math.round(run.flow*10)/10, maxM:Math.round(run.maxM*10)/10, stages:run.stages.filter(q => q.days).length};
  const pTrail = clamp((run.maxM - 1.2)*0.25, 0, 0.5)*(bled ? 0.35 : 1)*(G.certAt && G.certAt(s, 'tl') ? 0.5 : 1); if (Math.random() < pTrail) run.trail = {at:G.S.day + 1 + Math.round(Math.random()*9), M:run.maxM - 0.1 + Math.random()*0.6};
  G.news('The stimulation at ' + s.name + ' is over: the micro-quakes outline about ' + M(wl.stim.r) + ' of cracked granite around the hole; at the end the well took ' + wl.stim.flow + ' litres a second.'); }
G.on('day', () => { const g = G.S.geo; if (!g) return; for (const wl of g.wells){ const run = wl.run; if (!run) continue; const s = byId(wl.site); if (run.cur >= 0) stimDay(s, wl);
  if (run.trail && G.S.day >= run.trail.at){ const t = run.trail; run.trail = null; const g2 = G.lineGeom(G.lineOf(s)), [u, d] = G.pathPt(wl.plan, wl.drilled); G.quake((g2.ax + g2.ex*u)/G.geo.K, (g2.ay + g2.ey*u)/G.geo.K, t.M, true, 'Days after the pumps stopped at ' + s.name + ', the rock slips.', {plan:!!run.plan}); } } });
G.stopAllPumps = () => { for (const wl of G.S.geo.wells) if (wl.run && wl.run.cur >= 0) stimEnd(G.geoById(wl.site), wl, true); };
const lower = (wl, s) => { const run = wl.run; for (let i = Math.max(0, run.cur); i < run.stages.length; i++) run.stages[i].P = Math.max(PMIN, run.stages[i].P - PSTEP); G.news('The pressure at ' + s.name + ' goes down to ' + run.stages[Math.max(0, run.cur)].P + ' bar.', {quiet:true}); return 'ok'; };
// ---- the stimulation window: a cutaway of the granite, the stages, the cloud, the traffic light and the flow meter
const CW = 460, CH = 300;
function openStim(s, wl){ if (!wl.run) wl.run = stimPlan(wl); G.openWin('stim' + wl.id, {xwide:true, title:'Stimulation · ' + wellName(wl), sub:'granite from ' + M(G.pathPt(wl.plan, openStretch(s, wl)[0])[1]) + ' to ' + M(wl.depth), at:null, body:A => {
  setTimeout(() => paintStim(s, wl), 0); const run = wl.run, going = run.cur >= 0, over = run.cur === -2, sm = seismo(s), L = run.light;
  const light = c => '<i style="display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:4px;border:1px solid #2a2d33;background:' + (L === null || !sm ? '#cfcac0' : L === c ? {g:'#3d9a4a', y:'#e8b020', r:'#c83a2a'}[c] : '#efeadf') + '"></i>';
  let h = '<div style="display:flex;gap:14px;flex-wrap:wrap"><canvas class="stimc" width="' + CW + '" height="' + CH + '" style="width:' + CW + 'px;max-width:100%;image-rendering:pixelated;border:1px solid var(--line)"></canvas><div style="flex:1;min-width:200px">';
  h += '<h3>Traffic light</h3><div>' + light('g') + light('y') + light('r') + '</div>' + (sm ? '' : '<p class="muted" style="font-size:12px">Grey: no seismologist on the site, nobody reads the seismometers.</p>');
  h += '<div class="row"><span class="grow">Yellow from magnitude <b>' + run.y.toFixed(1) + '</b></span>' + (going || over ? '' : '<button class="btn small" data-a="' + A('y-', () => { run.y = Math.max(0.6, run.y - 0.2); return 'ok'; }) + '">−</button><button class="btn small" data-a="' + A('y+', () => { run.y = Math.min(run.r - 0.2, run.y + 0.2); return 'ok'; }) + '">+</button>') + '</div>';
  h += '<div class="row"><span class="grow">Red from magnitude <b>' + run.r.toFixed(1) + '</b></span>' + (going || over ? '' : '<button class="btn small" data-a="' + A('r-', () => { run.r = Math.max(run.y + 0.2, run.r - 0.2); return 'ok'; }) + '">−</button><button class="btn small" data-a="' + A('r+', () => { run.r = Math.min(3.4, run.r + 0.2); return 'ok'; }) + '">+</button>') + '</div>';
  h += '<label style="display:block;font-size:13px;padding:4px 0"><input type="checkbox" data-a="' + A('auto', () => { if (!going && !over) run.auto = !run.auto; return 'ok'; }) + '"' + (run.auto ? ' checked' : '') + (going || over ? ' disabled' : '') + '> Stop the pumps automatically at red</label>';
  const fl = run.flow || 0; h += '<h3 style="margin-top:8px">Flow meter</h3><div style="height:12px;border:1px solid var(--line2);background:var(--soft);position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:' + clamp(fl/35*100, 0, 100) + '%;background:#2c5f93"></i></div><p style="margin:2px 0 6px;font-size:13px"><b>' + fl.toFixed(1) + '</b> litres a second into the rock' + (going ? ' at ' + run.stages[run.cur].P + ' bar' : '') + '</p>';
  h += '<p style="font-size:13px;margin:0">Largest so far: <b>' + (run.maxM > -9 ? 'M ' + run.maxM.toFixed(1) : '—') + '</b> · events: ' + run.ev.length + '</p></div></div>';
  if (over) h += '<div class="sec"><p>Done: about ' + M(wl.stim.r) + ' of cracked granite around the hole; ' + wl.stim.flow + ' L/s at the end; largest M ' + wl.stim.maxM.toFixed(1) + '.</p></div>';
  else if (going) h += '<div class="sec"><p>Stage <b>' + (run.cur + 1) + '</b> of ' + run.stages.length + ', day ' + ((run.stages[run.cur].days || 0) + 1) + ' of ' + DAYS + '.</p><button class="btn" data-a="' + A('low', () => lower(wl, s)) + '">Lower the pressure (−' + PSTEP + ' bar)</button><button class="btn" data-a="' + A('stop', () => { stimEnd(s, wl, true); return 'ok'; }) + '">Stop and bleed off · ' + fmt(COST.bleed) + '</button></div>';
  else { h += '<div class="sec"><h3>Stages</h3><div class="row"><span class="grow">' + run.stages.length + ' stages along the open hole, ' + DAYS + ' days each</span><button class="btn small" data-a="' + A('n-', () => { if (run.stages.length > 3) reStage(wl, run.stages.length - 1); return 'ok'; }) + '">−</button><button class="btn small" data-a="' + A('n+', () => { if (run.stages.length < 8) reStage(wl, run.stages.length + 1); return 'ok'; }) + '">+</button></div>';
    run.stages.forEach((q, i) => { h += '<div class="row"><span class="grow">Stage ' + (i + 1) + ' at ' + M(G.pathPt(wl.plan, q.at)[1]) + ': <b>' + q.P + ' bar</b></span><button class="btn small" data-a="' + A('p-' + i, () => { q.P = Math.max(PMIN, q.P - PSTEP); return 'ok'; }) + '">−</button><button class="btn small" data-a="' + A('p+' + i, () => { q.P = Math.min(PMAX, q.P + PSTEP); return 'ok'; }) + '">+</button></div>'; });
    const ok = stimCheck(s, wl); h += ok === true ? '<button class="btn main" data-a="' + A('go', () => stimStart(s, wl)) + '">Start pumping · ' + fmt(COST.stage) + ' a stage</button>' : '<p class="muted">' + ok + '</p>'; h += '</div>'; }
  return h; }}); }
G.openStim = openStim;
function paintStim(s, wl){ const cv = document.querySelector('.stimc'); if (!cv) return; const c = cv.getContext('2d'), run = wl.run, g = G.lineGeom(G.lineOf(s)), R = RK();
  const [sa, sb] = openStretch(s, wl), p0 = G.pathPt(wl.plan, sa), p1 = G.pathPt(wl.plan, sb), uc = (p0[0] + p1[0])/2, d0 = p0[1] - 350, d1 = p1[1] + 250, sc = CH/(d1 - d0), x = u => CW/2 + (u - uc)*sc, y = d => (d - d0)*sc;
  // the rock, a column every 4 pixels
  for (let i = 0; i < CW; i += 4) for (let j = 0; j < CH; j += 4){ const u = uc + (i - CW/2)/sc, d = d0 + j/sc, t = G.geo.rockAt(g.ax + g.ex*u, g.ay + g.ey*u, d), n = ((i*7 + j*13) % 11)/11*10;
    c.fillStyle = t === R.GRANITE ? 'rgb(' + (196 + n) + ',' + (168 + n) + ',' + (160 + n) + ')' : t === R.FAULT ? '#8a7f74' : 'rgb(' + (178 + n) + ',' + (170 + n) + ',' + (150 + n) + ')'; c.fillRect(i, j, 4, 4); }
  // the cracked rock (soft), the events (newest brightest), the partner well
  if (run.r0){ c.fillStyle = 'rgba(70,120,190,.16)'; c.beginPath(); c.ellipse(x(uc), y((p0[1] + p1[1])/2), run.r0*1.3*sc, Math.max(run.r0*0.7, (p1[1] - p0[1])/2 + 40)*sc, 0, 0, Math.PI*2); c.fill(); }
  const today = G.S.day; for (const [u, d, m, day] of run.ev){ const age = clamp((today - day)/30, 0, 1), r = Math.max(1.5, 1.5 + m*1.6); c.fillStyle = m >= run.r ? 'rgba(200,58,42,' + (1 - age*0.6) + ')' : m >= run.y ? 'rgba(232,176,32,' + (1 - age*0.6) + ')' : 'rgba(40,40,46,' + (0.75 - age*0.5) + ')'; c.beginPath(); c.arc(x(u), y(d), r, 0, Math.PI*2); c.fill(); }
  const db = doubletOf(wl); if (db){ const o = byId(db.prod === wl.id ? db.inj : db.prod); if (o){ const P = G.wellWorld(o); c.strokeStyle = '#2c5f93'; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); P.forEach(([X, Y, d], i) => { const u = (X - g.ax)*g.ex + (Y - g.ay)*g.ey; i ? c.lineTo(x(u), y(d)) : c.moveTo(x(u), y(d)); }); c.stroke(); c.setLineDash([]); } }
  // the well: casing thick, open hole thin; the stages
  const pts = wl.path; c.strokeStyle = '#2a2d33'; c.lineWidth = 4; c.beginPath(); let first = true; for (let t = 0; t <= sa; t += 10){ const [u, d] = G.pathPt(wl.plan, t); if (d < d0) continue; first ? c.moveTo(x(u), y(d)) : c.lineTo(x(u), y(d)); first = false; } c.stroke();
  c.lineWidth = 2; c.beginPath(); c.moveTo(x(p0[0]), y(p0[1])); for (let t = sa; t <= sb; t += 10){ const [u, d] = G.pathPt(wl.plan, t); c.lineTo(x(u), y(d)); } c.stroke();
  run.stages.forEach((q, i) => { const [u, d] = G.pathPt(wl.plan, q.at); c.fillStyle = i === run.cur ? '#e07a2c' : q.days ? '#9a8a7a' : '#fffdf8'; c.strokeStyle = '#2a2d33'; c.lineWidth = 1; c.fillRect(x(u) - 5, y(d) - 5, 10, 10); c.strokeRect(x(u) - 5, y(d) - 5, 10, 10); c.fillStyle = '#2a2d33'; c.font = '9px Silkscreen, monospace'; c.fillText(String(i + 1), x(u) + 9, y(d) + 3); });
  c.font = '9px Silkscreen, monospace'; for (let d = Math.ceil(d0/100)*100; d < d1; d += 100){ c.fillStyle = 'rgba(42,45,51,.5)'; c.fillRect(0, y(d), d % 500 ? 4 : 8, 1); if (d % 500 === 0){ c.fillStyle = '#2a2d33'; c.fillText(M(d), 10, y(d) + 3); } }
  c.fillStyle = 'rgba(255,253,248,.85)'; c.fillRect(4, 4, 150, 16); c.fillStyle = '#2a2d33'; c.font = '9px Silkscreen, monospace'; c.fillText('cutaway along ' + G.lineOf(s).name + ' · ' + Math.round((d1 - d0)/100)/10 + ' km', 8, 15); }
// the section shows the cracked rock and the events of every stimulated well near the line
G.on('paintSection', (c, sec, g) => { for (const wl of G.S.geo.wells){ const run = wl.run; if (!run || !run.ev.length) continue; const s = byId(wl.site), l = G.lineOf(s), g2 = G.lineGeom(l);
  for (const [u, d, m] of run.ev){ const X = g2.ax + g2.ex*u, Y = g2.ay + g2.ey*u, uu = (X - g.ax)*g.ex + (Y - g.ay)*g.ey, off = Math.abs((X - g.ax)*(-g.ey) + (Y - g.ay)*g.ex); if (off > 600) continue; c.fillStyle = m >= 2 ? 'rgba(200,58,42,.9)' : 'rgba(40,90,170,.55)'; c.fillRect(sec.xOf(uu) - 1, sec.yOf(d) - 1, m >= 1 ? 3 : 2, m >= 1 ? 3 : 2); } } });
// ---- the well's block in the site window: doublet, stimulation, circulation, stations
G.on('html:well', (A, s, wl) => { if (!wl.done || wl.plugged) return ''; const k = kindOf(wl), db = doubletOf(wl); let h = '';
  if (k === 'granite'){ const ok = stimCheck(s, wl); h += '<div style="margin-top:6px">' + (wl.stim ? '<span class="muted" style="font-size:13px">Stimulated: about ' + M(wl.stim.r) + ' of cracked granite, largest M ' + wl.stim.maxM.toFixed(1) + '.</span> ' : '') + '<button class="btn small" data-a="' + A('stim' + wl.id, () => { openStim(s, wl); return 'ok'; }) + '"' + (ok === true || wl.run ? '' : ' disabled title="' + esc(ok) + '"') + '>' + (wl.run && wl.run.cur >= 0 ? 'Stimulation running…' : wl.stim ? 'The stimulation' : 'Stimulate the granite') + '</button>' + (ok !== true && !wl.run && !wl.stim ? ' <span class="muted" style="font-size:12px">' + esc(ok) + '</span>' : '') + '</div>'; }
  if (db){ const o = output(db), other = byId(db.prod === wl.id ? db.inj : db.prod), mine = db.prod === wl.id;
    h += '<div class="sec"><h3>Doublet · ' + (mine ? 'production' : 'injection') + ' well</h3><p style="font-size:13px">With ' + wellName(other) + ', bottoms ' + M(db.dist) + ' apart.';
    if (db.kind === 'aq') h += ' Muschelkalk water: about ' + Math.round(o.flow) + ' L/s at ' + o.T + ' °C, ' + o.heat.toFixed(1) + ' MW of heat.'; else h += db.circ ? ' Circulation: ' + Math.round(db.circ.flow) + ' L/s at ' + db.circ.T + ' °C, ' + o.heat.toFixed(1) + ' MW of heat' + (o.power > 0.05 ? ' or ' + o.power.toFixed(1) + ' MW of power.' : '.') : ' Granite: only a circulation test tells what comes back.'; if (db.kind === 'granite' && !db.circ) h += ' Cracked rock around them so far: ' + (byId(db.prod).stim ? 'about ' + M(byId(db.prod).stim.r) : 'none') + ' and ' + (byId(db.inj).stim ? 'about ' + M(byId(db.inj).stim.r) : 'none') + '.';
    h += '</p>'; if (mine){ if (db.kind === 'granite' && !db.circ) h += db.circAt ? '<p class="muted">The circulation test is running.</p>' : '<button class="btn" data-a="' + A('circ' + db.id, () => circTest(db)) + '">Circulation test · ' + fmt(COST.circ) + '</button>';
      h += db.station ? '<p><b>' + STN[db.station].n + '</b> stands.</p>' : db.job ? '<p class="muted">The builders are on the ' + STN[db.job].n.toLowerCase() + '.</p>' : '<button class="btn" data-a="' + A('hs' + db.id, () => buildStation(db, 'heat')) + '">Heat station · ' + fmt(COST.station) + (db.kind === 'aq' || db.circ ? ' · about ' + o.heat.toFixed(1) + ' MW' : '') + '</button>' + (db.kind === 'granite' && db.circ ? '<button class="btn" data-a="' + A('pp' + db.id, () => buildStation(db, 'plant')) + '">Power plant · ' + fmt(COST.plant) + ' · about ' + o.power.toFixed(1) + ' MW</button>' : ''); }
    if (!db.station && !db.job) h += '<button class="btn small" data-a="' + A('unp' + db.id, () => unpair(db)) + '">Undo the pairing</button>'; h += '</div>'; }
  else if (k){ const cands = G.S.geo.wells.filter(o => o !== wl && kindOf(o) === k && !doubletOf(o)); h += '<div class="sec"><h3>Doublet</h3>' + (cands.length ? '<p class="muted" style="font-size:13px">This well brings the water up; the other sends it back down.</p>' + cands.map(o => '<button class="btn small" data-a="' + A('pair' + o.id, () => pair(wl, o)) + '">With ' + esc(wellName(o)) + ' · ' + M(dist3(bottom(wl), bottom(o))) + ' apart</button>').join('') : '<p class="muted" style="font-size:13px">A second well open in the same layer makes a doublet: one brings the water up, the other sends it back down.</p>') + '</div>'; }
  return h; });
// ---- earthquakes: claims, the mood, the newspaper; the church at magnitude 4; houses beyond
const FELT = [[2.5, 'a bang, a rattle of cups'], [3, 'pictures fall off walls, plaster cracks'], [3.5, 'chimneys crack, people run into the street'], [4, 'tiles fall, walls crack across the valley'], [9, 'the ground rolls; old walls come down']];
G.quake = (x, y, Mw, induced, text, o) => { o = o || {}; const S = G.S, q = {day:Math.round(S.day), x:Math.round(x), y:Math.round(y), M:Math.round(Mw*10)/10, induced:!!induced}; S.geo.quakes.push(q); if (S.geo.quakes.length > 300) S.geo.quakes.shift();
  const home = G.nearestHome(x, y), place = G.placeName(home) || 'the valley';
  if (q.M < 2){ G.emit('quake', q); return q; }
  shake(q.M); rings.push({x, y, M:q.M, t:performance.now()});
  const claims = Math.round(q.M < 2.5 ? 20 + 60*Math.random() : q.M < 3 ? 150 + 250*Math.random() : q.M < 3.5 ? 800 + 1200*Math.random() : q.M < 4 ? 3000 + 3000*Math.random() : 10000 + 8000*Math.random());
  G.book('Earthquake claims', -claims, place); S.geo.claims = (S.geo.claims || 0) + claims;
  G.mood && G.mood(home, -Math.round(2 + (q.M - 2)*6), 'Earthquake'); if (q.M >= 3) G.moodAll && G.moodAll(-Math.round((q.M - 2.5)*4), 'Earthquake');
  G.news((text ? text + ' ' : '') + 'Magnitude ' + q.M.toFixed(1) + ' under ' + place + ': ' + FELT.find(f => q.M < f[0])[1] + '. Claims so far: ' + fmt(claims) + '.' + (induced ? '' : ' The seismological service says it was natural. Not everyone believes it.'), {paper:true});
  if (q.M >= 4) collapseChurch(x, y); if (q.M >= 4.4) collapseHouses(x, y, q.M);
  G.crisis && G.crisis({kind:'quake', M:q.M, home, induced:q.induced, plan:o.plan}); G.emit('quake', q); return q; };
// natural quakes: rare and mostly small; the Jura moves a little every few years
G.on('month', () => { if (Math.random() < 0.015){ const f = G.geo.faults[Math.floor(Math.random()*G.geo.faults.length)], K = G.geo.K, x = clamp(f.X0/K + (Math.random() - 0.5)*200, 10, G.world.W - 10), y = clamp(f.Y0/K + (Math.random() - 0.5)*200, 10, G.world.D - 10);
  G.quake(x, y, 1.2 + 2.0*Math.random()*Math.random(), false, 'The ground shakes without anyone pumping.'); } });
const setModel = (b, name) => { b.name = name; G.S.changes.push({t:'model', id:b.id, name}); G.world.touch(b.x0 - 4, b.y0 - 4, b.x1 + 4, b.y1 + 4); };
function collapseChurch(x, y){ const ch = G.world.buildings.filter(b => b.role === 'church' && b.name === 'Church').sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0]; if (!ch || Math.hypot(ch.cx - x, ch.cy - y) > 400) return;
  setModel(ch, 'Church after a quake'); G.S.geo.church = ch.id; smoke(ch); G.news('The church tower in ' + (G.placeName(ch.home) || 'the valley') + ' has fallen into the square. The priest stands in front of it and says nothing.', {paper:true}); G.mood && G.mood(ch.home, -15, 'The church fell'); G.emit('churchDown', ch); }
function collapseHouses(x, y, Mw){ const R = (Mw - 4.2)*260, out = []; for (const b of G.world.buildings){ if (b.role !== 'house' && b.role !== 'farm') continue; const d = Math.hypot(b.cx - x, b.cy - y); if (d > R || Math.random() > 0.55*(1 - d/R)) continue;
    const n = b.farm || /^Farm/.test(b.name) ? 'Farm, collapsed' : /two|storeys|2/.test(b.name) ? 'House, two storeys, collapsed' : 'House, collapsed'; if (!G.world.model(n)) continue; setModel(b, n); smoke(b); out.push(b); }
  if (out.length){ G.news(out.length + (out.length === 1 ? ' house' : ' houses') + ' collapsed. Smoke over the valley for days.', {paper:true}); G.moodAll && G.moodAll(-12, 'Houses collapsed'); G.emit('housesDown', out); } }
// smoke over ruins for ten days; the screen shakes and a ring spreads from the epicentre
const smoke = b => { G.S.geo.smoke = G.S.geo.smoke || []; G.S.geo.smoke.push({x:b.cx, y:b.cy, until:G.S.day + 10}); };
G.on('dyn', dyn => { const sm = G.S.geo && G.S.geo.smoke; if (!sm || !sm.length) return; const m = G.world.model('Smoke column'); for (const o of sm) if (G.S.day < o.until) dyn.push({m, view:0, x:o.x, y:o.y, z:G.world.hb(o.x, o.y) + 2});
  if (sm.some(o => G.S.day >= o.until)) G.S.geo.smoke = sm.filter(o => G.S.day < o.until); });
const shake = Mw => { const a = Math.min(14, (Mw - 1.6)*4), el = document.querySelector('#map'); if (el && el.animate) el.animate([0, 1, 2, 3, 4, 5, 6, 7].map(i => ({transform:'translate(' + (i % 2 ? a : -a)*(1 - i/8) + 'px,' + ((i % 3) - 1)*a*0.5*(1 - i/8) + 'px)'})), {duration:700}); };
const rings = [];
G.on('draw', g => { const now = performance.now(); for (let i = rings.length - 1; i >= 0; i--){ const r = rings[i], t = (now - r.t)/2600; if (t > 1){ rings.splice(i, 1); continue; } const [sx, sy] = G.R.toScreen(r.x, r.y, G.world.hb(r.x, r.y)), rad = t*(60 + r.M*40)*G.R.scr();
  g.strokeStyle = 'rgba(200,58,42,' + (1 - t)*0.8 + ')'; g.lineWidth = 2; for (const k of [1, 0.6]){ g.beginPath(); g.ellipse(sx, sy, rad*k, rad*k/2, 0, 0, Math.PI*2); g.stroke(); } } });
})();
