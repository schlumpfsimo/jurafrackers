/* Jurafrackers 2.0 — life in the valley, and its sound. People walk the roads near the villages, cars drive between them,
   the regional train runs along the valley; churchgoers on Sundays, the brass band at openings when the mood is good, road
   workers on new roads, firefighters and a TV crew when it gets ugly. None of it is clickable. Sound is made on the fly. */
(function(){
'use strict';
const G = globalThis.G, {clamp, lerp} = G;
const WALKERS = ['Hiker', 'Hiker (woman)', 'Dog walker', 'Jogger', 'Woman with a pram', 'Postman', 'Villager (woman)', 'Villager (man), elderly', 'School children', 'Cyclist', 'Road cyclist', 'Child'];
const SPEED = {Jogger:5, Cyclist:12, 'Road cyclist':16, 'School children':2, 'Woman with a pram':2.2, 'Villager (man), elderly':1.6};
let L = null;
const along = (pts, s) => { for (let i = 1; i < pts.length; i++){ const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= d || i === pts.length - 1){ const t = d ? clamp(s/d, 0, 1) : 1; return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t), pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; } s -= d; } const p = pts[pts.length - 1]; return [p[0], p[1], 1, 0]; };
const plen = pts => { let d = 0; for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return d; };
// a walk: somewhere within reach of home, by the roads and tracks, then back again
function trip(o){ const c = G.homeCentre(o.home), a = Math.random()*Math.PI*2, r = 30 + Math.random()*(o.car ? 260 : 110), to = [clamp(c[0] + Math.cos(a)*r, 8, G.world.W - 8), clamp(c[1] + Math.sin(a)*r, 8, G.world.D - 8)];
  const from = o.from || [c[0] + (Math.random() - 0.5)*30, c[1] + (Math.random() - 0.5)*30], pts = G.world.route(from, to, !o.car); if (!pts || pts.length < 2){ o.pts = null; o.wait = 2; return; }
  o.pts = pts.map(p => [p[0], p[1]]); o.s = 0; o.len = plen(o.pts); o.wait = 0; }
function init(){ L = {walk:[], cars:[], train:{s:-1, next:1}}; const hs = G.homes(); let k = 0;
  for (const h of hs) for (let i = 0; i < (h === 'town' ? 6 : 3); i++){ const m = WALKERS[k++ % WALKERS.length], o = {m, home:h, side:Math.random() < 0.5 ? 1.5 : -1.5, sp:SPEED[m] || 3, ph:Math.random()*6}; trip(o); o.s = Math.random()*(o.len || 0); L.walk.push(o); }
  for (let i = 0; i < 7; i++){ const o = {m:'Car ' + (1 + i % 8), home:hs[i % hs.length], car:true, side:1.2, sp:20}; trip(o); o.s = Math.random()*(o.len || 0); L.cars.push(o); } }
G.on('world', () => { L = null; });
G.on('tick', dd => { if (!G.world || G.S.phase === 'drive' && !G.S.started) return; if (!L) init();
  for (const o of [...L.walk, ...L.cars]){ if (!o.pts){ o.wait -= dd; if (o.wait <= 0) trip(o); continue; } o.s += o.sp*dd; if (o.s >= o.len){ o.from = o.pts[o.pts.length - 1]; o.pts = null; o.wait = o.car ? 0.3 : 1 + Math.random()*3; } }
  const T = L.train; if (T.s < 0){ T.next -= dd; if (T.next <= 0){ T.s = 0; T.dir = Math.random() < 0.5 ? 1 : -1; } } else { T.s += 60*dd; if (T.s > plen(G.world.rail) + 60){ T.s = -1; T.next = 2 + Math.random()*3; } } });
G.on('dyn', dyn => { const W = G.world, S = G.S; if (!L || !W) return; const t = performance.now()/1000;
  for (const o of L.walk){ if (!o.pts) continue; const [x0, y0, dx, dy] = along(o.pts, o.s), d = Math.hypot(dx, dy) || 1, x = x0 - dy/d*o.side, y = y0 + dx/d*o.side; dyn.push({m:W.model(o.m), view:W.view16(dx, dy), x, y, z:W.hb(x, y) + Math.abs(Math.sin(t*5 + o.ph))*0.05}); }
  for (const o of L.cars){ if (!o.pts) continue; const [x0, y0, dx, dy] = along(o.pts, o.s), d = Math.hypot(dx, dy) || 1, x = x0 - dy/d*o.side, y = y0 + dx/d*o.side; dyn.push({m:W.model(o.m), view:W.view16(dx, dy), x, y, z:W.hb(x, y) + 0.05}); }
  const T = L.train; if (T.s >= 0){ const R = W.rail, len = plen(R), s = T.dir > 0 ? T.s - 30 : len - T.s + 30; if (s > -30 && s < len + 30){ const [x, y, dx, dy] = along(R, clamp(s, 0, len)); dyn.push({m:W.model('Regional train'), view:W.view16(dx*T.dir, dy*T.dir), x, y, z:W.hb(x, y) + 0.3}); } }
  // Sundays: churchgoers in front of every church that stands; the brass band at an opening when the mood is good
  if (Math.floor(S.day) % 7 === 6) for (const b of W.buildings) if (b.role === 'church' && b.name !== 'Church after a quake'){ const r = W.nearestRoad(b.cx, b.cy); if (!r) continue; const x = lerp(b.cx, r.x, 0.65), y = lerp(b.cy, r.y, 0.65); dyn.push({m:W.model('Churchgoers'), view:W.view16(b.cx - x, b.cy - y), x, y, z:W.hb(x, y)}); }
  for (const f of (S.life && S.life.band) || []) if (S.day < f.until) dyn.push({m:W.model('Brass band (fanfare)'), view:2, x:f.x, y:f.y, z:W.hb(f.x, f.y)});
  // road workers on access roads being built
  for (const s of (S.geo && S.geo.sites) || []) if (s.road && s.road.state === 'building'){ const r = W.nearestRoad(s.x, s.y); if (!r) continue; const x = lerp(s.x, r.x, 0.5), y = lerp(s.y, r.y, 0.5), v = W.view16(r.x - s.x, r.y - s.y); dyn.push({m:W.model('Road worker with jackhammer'), view:v, x:x + 1, y, z:W.hb(x, y)}, {m:W.model('Road worker'), view:(v + 8) % 16, x:x - 1.5, y:y + 1, z:W.hb(x, y)}); }
  // firefighters at a burning site; a TV crew at camps and marches
  for (const s of (S.geo && S.geo.sites) || []) if (s.burnt && S.day < (s.burning || 0)){ const x = s.x + 9, y = s.y + 7; dyn.push({m:W.model('Fire engine'), view:6, x:x + 4, y:y + 3, z:W.hb(x, y)}, {m:W.model('Firefighters with a hose'), view:W.view16(s.x - x, s.y - y), x, y, z:W.hb(x, y)}); }
  for (const c of (S.op && S.op.camps) || []) dyn.push({m:W.model('TV camera operator'), view:W.view16(c.x - (c.x + 6), 0) || 12, x:c.x + 6, y:c.y + 5, z:W.hb(c.x + 6, c.y + 5)});
  for (const m of (S.op && S.op.marches) || []) if (m.stage === 'stand'){ const s = G.geoById(m.site); if (!s) continue; const x = s.x - 10, y = s.y + 8; dyn.push({m:W.model('TV camera operator'), view:W.view16(s.x - x, s.y - y), x, y, z:W.hb(x, y)}, {m:W.model('Sound engineer with boom'), view:W.view16(s.x - x, s.y - y), x:x - 1.2, y:y + 0.8, z:W.hb(x, y)}); } });
// the band plays at openings (gifts, stations) when the village is in a good mood
G.on('ribbon', (x, y, h) => { if (G.moodOf(h) < 55) return; const S = G.S; S.life = S.life || {}; S.life.band = (S.life.band || []).filter(f => S.day < f.until); const r = G.world.nearestRoad(x, y); const bx = r ? lerp(x, r.x, 0.6) : x + 4, by = r ? lerp(y, r.y, 0.6) : y + 4; S.life.band.push({x:bx, y:by, until:S.day + 2}); });
// ---- sound: made with Web Audio; wind and birds near the ground, rigs, lorries, drums, quakes. Off until the first click.
let AC = null, master = null, on = true, wind = null, last = 0;
try { on = localStorage.getItem('jf2sound') !== 'off'; } catch (e){}
const start = () => { if (AC || !on) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination); windOn(); } catch (e){ AC = null; } };
addEventListener('pointerdown', start);
const noiseBuf = () => { const b = AC.createBuffer(1, AC.sampleRate*2, AC.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++){ l = (l + 0.02*(Math.random()*2 - 1))/1.02; d[i] = l*3.5; } return b; };
function windOn(){ const src = AC.createBufferSource(); src.buffer = noiseBuf(); src.loop = true; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; const g = AC.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(master); src.start(); wind = {g, f}; }
const tone = (freq, dur, type, vol, slide) => { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); };
const rumble = (dur, vol) => { if (!AC) return; const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime; s.buffer = noiseBuf(); f.type = 'lowpass'; f.frequency.value = 90; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.1); };
G.on('quake', q => { if (q.M >= 2) rumble(1.5 + q.M*0.6, Math.min(0.9, 0.2 + (q.M - 2)*0.3)); });
// what is near the middle of the screen decides what is heard, a few times a second
G.on('draw', () => { if (!AC || !G.R || !G.S) return; const now = performance.now(); if (now - last < 250) return; last = now; const R = G.R, W = G.world, c = R.pickGround(innerWidth/2, innerHeight/2); if (!c) return; const z = R.scr(), near = clamp((z - 2)/10, 0, 1), paused = !G.S.speed;
  wind.g.gain.setTargetAtTime(paused ? 0.01 : 0.03 + 0.05*near, AC.currentTime, 0.5);
  if (!paused && near > 0.3 && Math.random() < 0.18) tone(2400 + Math.random()*1800, 0.08 + Math.random()*0.08, 'sine', 0.025*near, 3000 + Math.random()*1500);
  const dist = (x, y) => Math.hypot(x - c[0], y - c[1]); if (paused) return;
  for (const s of (G.S.geo && G.S.geo.sites) || []){ const d = dist(s.x, s.y); if (d > 160) continue; if (s.wells.some(id => { const w = G.geoById(id); return w && w.going; })) tone(55 + Math.random()*4, 0.3, 'sawtooth', 0.04*(1 - d/160)*(0.4 + near), 52); }
  for (const v of G.S.vehicles){ if (!/lorry|lowloader|vibro/.test(v.kind) || v.s >= v.len) continue; const [x, y] = G.vehPos(v), d = dist(x, y); if (d < 90) tone(40 + Math.random()*10, 0.28, 'triangle', 0.05*(1 - d/90), 35); }
  for (const m of (G.S.op && G.S.op.marches) || []){ const s = G.geoById(m.site); if (s && dist(s.x, s.y) < 200 && Math.random() < 0.7) tone(90, 0.12, 'sine', 0.12, 50); } });
// the speaker button beside the speed buttons
const sbtn = () => { const ctl = document.querySelector('#ctl'); if (!ctl || ctl.querySelector('[data-snd]')) return; const b = document.createElement('button'); b.dataset.snd = '1'; b.title = 'Sound'; b.textContent = on ? '♪' : '–'; ctl.appendChild(b);
  b.addEventListener('click', e => { e.stopPropagation(); on = !on; b.textContent = on ? '♪' : '–'; try { localStorage.setItem('jf2sound', on ? 'on' : 'off'); } catch (x){} if (!on && AC){ AC.close(); AC = null; } else start(); }); };
G.on('world', sbtn);
})();
