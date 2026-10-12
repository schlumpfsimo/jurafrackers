/* Jurafrackers 2.0 — the valley. Every game a new one from a seed (the same seed gives the same valley): terrain, the stream and
   the side stream, the valley road and the railway, a town and three villages with every type of house, farms, the villa,
   forests, hedges and fields. The world answers what the ground looks like at any point (for the terrain tiles), keeps the trees
   and the street things, a road graph for the vehicles, and changes when the Company builds: sites and roads are levelled and
   cleared, the trees there are gone. Coordinates in metres: x east, y south, z up. */
(function(){
'use strict';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, sm = t => t*t*(3 - 2*t), lerp = (a, b, t) => a + (b - a)*t;
const ih = (a, b, c) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0)/4294967296; };
const FRONT = {0:[0, 1], 4:[-1, 0], 8:[0, -1], 12:[1, 0]};   // a model's front looks to +y; a view turns it
const viewFacing = (fx, fy) => { let best = 0, bd = -9; for (const v of [0, 4, 8, 12]){ const d = FRONT[v][0]*fx + FRONT[v][1]*fy; if (d > bd){ bd = d; best = v; } } return best; };
const view16 = (dx, dy) => (Math.round(Math.atan2(dy, dx)/(Math.PI/8)) % 16 + 16) % 16;    // the view that points a model's +x along (dx, dy)

function create(seed, opts){ opts = opts || {};
  const ART = globalThis.ART, K = ART.KIT, W = 640, D = 480, SEED = seed >>> 0, SI = (SEED % 99991) | 0;
  const r = K.rng(SEED + 7), rr = (a, b) => a + r()*(b - a), hsh = (a, b, c) => ih(a, b, Math.imul(c | 0, 7919) + SI);
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = hsh(xi, yi, s), b = hsh(xi + 1, yi, s), c = hsh(xi, yi + 1, s), d = hsh(xi + 1, yi + 1, s);
    return a + (b - a)*fx + (c - a)*fy + (a - b - c + d)*fx*fy; };
  const fbm = (x, y, s) => vn(x, y, s)*0.5 + vn(x*2.03 + 5.1, y*2.03, s + 1)*0.3 + vn(x*4.1, y*4.1 + 2.7, s + 2)*0.2;
  // ---- paths: smooth curves with a bounding box, their length along; the nearest point (distance, point, distance along, side)
  let PID = 0;
  const curve = (pts, w, kind) => { const out = []; for (let i = 0; i < pts.length - 1; i++){ const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])/2));
      for (let k = 0; k < n; k++){ const t = k/n, t2 = t*t, t3 = t2*t, f = (a, b, c, d) => 0.5*(2*b + (-a + c)*t + (2*a - 5*b + 4*c - d)*t2 + (-a + 3*b - 3*c + d)*t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
    out.push(pts[pts.length - 1].slice(0, 2)); return finish(out, w, kind); };
  const finish = (out, w, kind) => { out.cum = [0]; for (let i = 1; i < out.length; i++) out.cum.push(out.cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    const xs = out.map(p => p[0]), ys = out.map(p => p[1]); out.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; out.w = w || 2.7; out.kind = kind || 'road'; out.id = ++PID; out.len = out.cum[out.cum.length - 1]; return out; };
  const segNear = (pl, i, x, y) => { const [ax, ay] = pl[i], [qx, qy] = pl[i + 1], vx = qx - ax, vy = qy - ay, L2 = vx*vx + vy*vy || 1, t = clamp(((x - ax)*vx + (y - ay)*vy)/L2, 0, 1), px = ax + vx*t, py = ay + vy*t;
    return [Math.hypot(x - px, y - py), px, py, pl.cum[i] + t*Math.sqrt(L2), vx*(y - ay) - vy*(x - ax) > 0 ? 1 : -1]; };
  const nearP = (pl, x, y, lim) => { const [a, b, c, d] = pl.box; if (x < a - lim || x > c + lim || y < b - lim || y > d + lim) return null; let best = null; for (let i = 0; i < pl.length - 1; i++){ const q = segNear(pl, i, x, y); if (!best || q[0] < best[0]) best = q; } return best; };
  const near = (pl, x, y, lim) => { const q = nearP(pl, x, y, lim); return q ? q[0] : 1e9; };
  const yOn = (pl, x) => { for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1]; if ((x - ax)*(x - bx) <= 0 && ax !== bx) return ay + (by - ay)*(x - ax)/(bx - ax); } return pl[0][1]; };
  const atRoad = (pl, sl, off) => { let i = 1; while (i < pl.cum.length - 1 && pl.cum[i] < sl) i++; const [ax, ay] = pl[i - 1], [bx, by] = pl[i], L = Math.hypot(bx - ax, by - ay) || 1, t = clamp((sl - pl.cum[i - 1])/L, 0, 1), ux = (bx - ax)/L, uy = (by - ay)/L;
    return [ax + (bx - ax)*t - uy*(off || 0), ay + (by - ay)*t + ux*(off || 0), ux, uy]; };
  // ---- the shape of the valley
  const PH = Array.from({length:8}, () => r()*6.283), AX = rr(235, 268), TILT = rr(-0.045, 0.045), axis = x => AX + TILT*(x - 320), RID = x => 120 + 12*Math.sin(x/90 + PH[4]);
  const ys = x => axis(x) + 34 + 10*Math.sin(x/45 + PH[0]) + 4*Math.sin(x/13 + PH[1]), dys = x => TILT + 10/45*Math.cos(x/45 + PH[0]) + 4/13*Math.cos(x/13 + PH[1]);
  const ys2 = x => -10/2025*Math.sin(x/45 + PH[0]) - 4/169*Math.sin(x/13 + PH[1]), hw = x => 2.4 + 0.6*Math.sin(x/23 + PH[2]), streamV = (x, y) => (y - ys(x))/Math.sqrt(1 + dys(x)**2);
  const SVX = r() < 0.5 ? rr(70, 150) : rr(490, 570), sv = y => SVX + 14*Math.sin(y/37 + PH[3]);
  const SIDE = curve([[sv(-2), -2], ...[60, 120, 180].map(y => [sv(y), y]), [sv(axis(SVX) - 30), axis(SVX) - 30], [SVX + 8, ys(SVX + 8)]], 1.3, 'stream');
  const HX = rr(90, 550), PX = HX < 320 ? 430 : 210;
  const base0 = (x, y) => 30*sm(clamp((RID(x) - y)/120, 0, 1)) + 16*Math.exp(-((x - HX)**2/95**2 + (y - 455)**2/70**2)) + 9*sm(clamp((y - 330)/130, 0, 1))*sm(clamp((HX < 320 ? x - PX : PX - x)/160 + 0.5, 0, 1))
    - 16*Math.exp(-((x - sv(y))**2)/34**2)*sm(clamp((axis(SVX) - 10 - y)/120, 0, 1)) + 8*(fbm(x/60, y/60, 3) - 0.5) + 2.5*(fbm(x/16, y/16, 4) - 0.5);
  const slope = (x, y) => Math.hypot(base0(x + 1, y) - base0(x - 1, y), base0(x, y + 1) - base0(x, y - 1))/2;
  // ---- the valley road, the railway along the foot of the slope
  const MAIN = curve(Array.from({length:9}, (_, i) => { const x = i === 0 ? -2 : i === 8 ? 642 : i*80 + rr(-10, 10); return [x, axis(x) - 8 + 6*Math.sin(x/70 + PH[5]) + rr(-3, 3)]; }), 2.8, 'main');
  const RAIL = curve(Array.from({length:7}, (_, i) => { const x = i === 0 ? -2 : i === 6 ? 642 : i*107; return [x, axis(x) - 46 + 5*Math.sin(x/110 + PH[6])]; }), 1.6, 'rail');
  // ---- settlements: one town on the valley road, a village on the slope, one in the side valley, one across the stream
  const far = (p, list, d) => list.every(q => !q || Math.hypot(p[0] - q[0], p[1] - q[1]) > d);
  let TX = 320; for (let i = 0; i < 200; i++){ TX = rr(200, 440); if (Math.abs(TX - SVX) > 120) break; }
  const TYR = yOn(MAIN, TX), TOWN = [TX, TYR - 12, 72, 52];
  let VA = null, VB = null, VC = null;
  for (let i = 0; i < 400 && !VA; i++){ const x = rr(50, 590), y = RID(x) + rr(5, 30); if (Math.abs(x - TX) > 170 && Math.abs(x - SVX) > 80 && slope(x, y) < 0.5) VA = [x, y, 32]; }
  for (let i = 0; i < 400 && !VB; i++){ const y = rr(80, 125), x = sv(y) + 16; if (far([x, y], [VA, TOWN], 150)) VB = [x, y, 28]; }
  for (let i = 0; i < 400 && !VC; i++){ const x = rr(60, 580), y = rr(350, 405); if (Math.abs(x - TX) > 150 && Math.abs(x - HX) > 130 && far([x, y], [VA, VB, TOWN], 150)) VC = [x, y, 32]; }
  VA = VA || [100, 140, 32]; VB = VB || [sv(100) + 16, 100, 28]; VC = VC || [560, 380, 32];
  const VILLAGES = [VA, VB, VC];
  // ---- town streets and the lanes to the villages
  const NX = TX + rr(-6, 6), SQ = [NX, TYR - 16];
  const NORTH = curve([[NX, TYR], [NX + rr(-3, 3), TYR - 24], [NX + rr(-6, 6), TYR - 48], [NX + rr(-12, 12), TYR - 64]], 2.3, 'street');
  const PAR = curve([[TX - 58, TYR - 31 + rr(-3, 3)], [TX - 20, TYR - 32], [NX, TYR - 32], [TX + 30, TYR - 31], [TX + 54, TYR - 28 + rr(-3, 3)]], 2.2, 'street');
  const WEST = curve([[TX - 70, yOn(MAIN, TX - 70)], [TX - 64, TYR - 22], [TX - 58, PAR[0][1]]], 2.2, 'street');
  const SX = TX + rr(16, 30), SOUTH = curve([[SX, yOn(MAIN, SX)], [SX + rr(-4, 4), yOn(MAIN, SX) + 14], [SX + rr(-6, 6), ys(SX) - 9]], 2.2, 'street');
  const zig = (x0, y0, x1, y1, amp) => { const n = Math.max(2, Math.ceil(Math.abs(y1 - y0)/28)), pts = [[x0, y0]]; for (let k = 1; k < n; k++) pts.push([lerp(x0, x1, k/n) + (k % 2 ? amp : -amp), lerp(y0, y1, k/n)]); pts.push([x1, y1]); return pts; };
  const xa = clamp(VA[0] + rr(-30, 30), 10, 630), ROAD_A = curve([...zig(xa, yOn(MAIN, xa), VA[0], VA[1], 20), [VA[0] + rr(-25, 25), VA[1] - 24]], 2.1, 'lane');
  const xb = sv(axis(SVX)) + 16, ROAD_B = curve([[xb, yOn(MAIN, xb)], ...[0.25, 0.5, 0.75].map(t => { const y = lerp(yOn(MAIN, xb), VB[1], t); return [sv(y) + 16, y]; }), [VB[0], VB[1]], [sv(VB[1] - 26) + 16, VB[1] - 26]], 2.1, 'lane');
  const xc = clamp(VC[0] + rr(-40, 40), 10, 630), ROAD_C = curve([[xc, yOn(MAIN, xc)], [lerp(xc, VC[0], 0.3), ys(lerp(xc, VC[0], 0.3)) - 10], [lerp(xc, VC[0], 0.4), ys(lerp(xc, VC[0], 0.4)) + 12], [VC[0], VC[1]], [VC[0] + rr(-20, 20), VC[1] + 24]], 2.2, 'lane');
  const LANES = VILLAGES.map(([vx, vy]) => { const dir = r() < 0.5 ? 1 : -1; return curve([[vx, vy], [vx + dir*14, vy + rr(-6, 6)], [vx + dir*30, vy + rr(-10, 10)]], 1.9, 'lane'); });
  const ROADS = [MAIN, NORTH, PAR, WEST, SOUTH, ROAD_A, ROAD_B, ROAD_C, ...LANES], NEWROADS = [], TRACKS = [];
  const allRoads = () => [...ROADS, ...NEWROADS];
  // ---- settlements as areas
  const inSettle = (x, y, m) => Math.hypot((x - TOWN[0])/(TOWN[2] + m), (y - TOWN[1])/(TOWN[3] + m)) < 1 || VILLAGES.some(([cx, cy, rad]) => Math.hypot(x - cx, y - cy) < rad + m);
  const inTown = (x, y) => Math.hypot((x - TOWN[0])/(TOWN[2] - 6), (y - TOWN[1])/(TOWN[3] - 6)) < 1;
  const SITES = [];   // the Company's pads: {cx, cy, w, d, a (angle), z}
  const inSiteBox = (s, x, y, m) => { const dx = x - s.cx, dy = y - s.cy, ca = Math.cos(s.a), sa = Math.sin(s.a), u = dx*ca + dy*sa, v = -dx*sa + dy*ca; return Math.abs(u) <= s.w/2 + m && Math.abs(v) <= s.d/2 + m; };
  const inSite = (x, y, m) => SITES.some(s => inSiteBox(s, x, y, m));
  const rock = (x, y) => (y < RID(x) + 55 || (Math.abs(x - SVX) < 70 && y < axis(SVX))) && !inSettle(x, y, 10) ? clamp((fbm(x/8, y/8, 9) - 0.6)*5, 0, 1)*clamp((slope(x, y) - 0.3)*4, 0, 1) : 0;
  // ---- levelled ground: building plots and pads; roads and the railway are cut into the slope (flat across, smooth along)
  const flats = [], FB = new Map(); const addFlat = f => { flats.push(f); const [x0, y0, x1, y1, , m] = f; for (let i = Math.floor((x0 - m)/16); i <= Math.floor((x1 + m)/16); i++) for (let j = Math.floor((y0 - m)/16); j <= Math.floor((y1 + m)/16); j++){ const k = i*1000 + j; if (!FB.has(k)) FB.set(k, []); FB.get(k).push(f); } return f; };
  const level = (x0, y0, x1, y1, m, z) => addFlat([x0, y0, x1, y1, z ?? base0((x0 + x1)/2, (y0 + y1)/2), m || 4])[4];
  const levelled = () => [...allRoads(), RAIL];
  const roadLevel = (x, y, h) => { for (const pl of levelled()){ const q = nearP(pl, x, y, pl.w + 4); if (!q || q[0] > pl.w + 4) continue; const zc = base0(q[1], q[2]), t = q[0] < pl.w + 0.6 ? 0 : sm((q[0] - pl.w - 0.6)/3.4); h = zc + (h - zc)*t; } return h; };
  const onLevelled = (x, y, m) => levelled().some(pl => near(pl, x, y, pl.w + m) < pl.w + m);
  const ground = (x, y) => { let h = roadLevel(x, y, base0(x, y)); for (const [x0, y0, x1, y1, z, m] of FB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || []){ const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)); if (d < m){ const t = sm(d/m); h = z + (h - z)*t; } }
    for (const s of SITES){ if (Math.abs(x - s.cx) > s.w + s.d + 8 || Math.abs(y - s.cy) > s.w + s.d + 8) continue; const dx = x - s.cx, dy = y - s.cy, ca = Math.cos(s.a), sa = Math.sin(s.a), u = Math.abs(dx*ca + dy*sa) - s.w/2, v = Math.abs(-dx*sa + dy*ca) - s.d/2, d = Math.hypot(Math.max(u, 0), Math.max(v, 0)); if (d < 5){ const t = sm(d/5); h = s.z + (h - s.z)*t; } }
    const v = Math.abs(streamV(x, y)), w = hw(x); if (v < w + 3) h -= 1.3*(v < w ? 1 : 1 - sm((v - w)/3)); const ds = near(SIDE, x, y, 4); if (ds < 3.5 && !onLevelled(x, y, 1.2)) h -= 0.9*(ds < 1.3 ? 1 : 1 - sm((ds - 1.3)/2.2));
    const rk = rock(x, y); if (rk) h += rk*1.1*fbm(x/1.8, y/1.8, 12); return h; };
  // ---- buildings. Rule 1: every type of house is on the map. Rule 2: each stands where its function puts it (public buildings in the
  // town, a mairie, chapel and shop in every village, ordinary houses in the town and the villages; farms, the villa and the substation
  // freestanding). Public buildings face the nearest road; ordinary houses and farms are turned more freely.
  const MD = new Map(), model = n => { let m = MD.get(n); if (!m){ m = ART.models.find(q => q.n === n); MD.set(n, m); } return m; };
  const FOOT = {'Railway station':[0, 0.4, 22, 4.6]};   // the part that stands (the platform is the railway's)
  const footOf = (m, view) => { const f = FOOT[m.n] || [0, 0, m.W, m.D], cx = m.W/2, cy = m.D/2, th = view*Math.PI/8, ca = Math.round(Math.cos(th)), sa = Math.round(Math.sin(th)), pts = [[f[0], f[1]], [f[2], f[3]]].map(([x, y]) => [ca*(x - cx) - sa*(y - cy), sa*(x - cx) + ca*(y - cy)]);
    return [Math.min(pts[0][0], pts[1][0]), Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][0], pts[1][0]), Math.max(pts[0][1], pts[1][1])]; };   // relative to the model's centre
  const placed = [], PB = new Map(); let BID = 0;
  const PROBE = (x, y, m) => { for (const p of PB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || []) if (x > p.x0 - m && x < p.x1 + m && y > p.y0 - m && y < p.y1 + m) return p; return null; };
  const indexB = p => { for (let i = Math.floor((p.x0 - 8)/16); i <= Math.floor((p.x1 + 8)/16); i++) for (let j = Math.floor((p.y0 - 8)/16); j <= Math.floor((p.y1 + 8)/16); j++){ const k = i*1000 + j; if (!PB.has(k)) PB.set(k, []); PB.get(k).push(p); } };
  const unindexB = p => { for (const v of PB.values()){ const k = v.indexOf(p); if (k >= 0) v.splice(k, 1); } };
  const roadNear = (x, y, m) => allRoads().some(pl => near(pl, x, y, pl.w + m) < pl.w + m) || near(RAIL, x, y, RAIL.w + m) < RAIL.w + m;
  const forestRaw = (x, y) => (y < RID(x) - 54 + 30*fbm(x/50, y/50, 21) && !(Math.abs(x - sv(y)) < 34 + 10*fbm(y/30, 1, 27) && y > 18))
    || Math.hypot((x - HX)/(90 + 25*fbm(x/30, y/30, 28)), (y - 470)/60) < 1 || (fbm(x/48, y/48, 26) > 0.72 && y > RID(x) - 30);
  const fits = (x, y, w, d, name, gap) => { gap = gap ?? 2; if (x < 4 || y < 4 || x + w > W - 4 || y + d > D - 4) return false; for (const p of placed) if (!(x + w + gap < p.x0 || x - gap > p.x1 || y + d + gap < p.y0 || y - gap > p.y1)) return false;
    for (let u = 0; u <= 1; u += 0.25) for (let v = 0; v <= 1; v += 0.25){ const px = x + w*u, py = y + d*v; if (allRoads().some(pl => near(pl, px, py, pl.w + 1) < pl.w + 0.8) || near(RAIL, px, py, 4) < RAIL.w + (name === 'Railway station' ? 0.3 : 2.5)
      || Math.abs(streamV(px, py)) < hw(px) + 4 || near(SIDE, px, py, 4) < 4 || inSite(px, py, 3) || TRACKS.some(pl => near(pl, px, py, 2) < pl.w + 0.5)) return false; } return slope(x + w/2, y + d/2) < 0.45; };
  const building = (name, cx, cy, view, recol, role) => { const m = model(name); if (!m) return null; const f = footOf(m, view), x0 = cx + f[0], y0 = cy + f[1], x1 = cx + f[2], y1 = cy + f[3]; if (!fits(x0, y0, x1 - x0, y1 - y0, name)) return null;
    const z = level(x0 - 1, y0 - 1, x1 + 1, y1 + 1), zt = Math.max(3, ...m.parts.filter(q => q.t === 'blk').map(q => q.z + Math.max(...q.h)));
    const p = {id:++BID, name, cx, cy, x0, y0, x1, y1, view, recol:recol || null, z, zt, role:role || null, farm:name.startsWith('Farm'), func:FUNC.includes(name)}; placed.push(p); indexB(p); return p; };
  const unplace = p => { placed.splice(placed.indexOf(p), 1); unindexB(p); const i = flats.findIndex(f => Math.abs(f[0] - p.x0 + 1) < 1e-9 && Math.abs(f[1] - p.y0 + 1) < 1e-9); if (i >= 0){ const f = flats[i]; flats.splice(i, 1); for (const v of FB.values()){ const k = v.indexOf(f); if (k >= 0) v.splice(k, 1); } } };
  const nearestRoadDir = (x, y) => { let best = null; for (const pl of allRoads()){ const q = nearP(pl, x, y, 80); if (q && (!best || q[0] < best[0])) best = q; } return best ? [best[1] - x, best[2] - y] : [0, 1]; };
  const nearBy = (name, x, y, recol, reach, role, view) => { for (let rad = 0; rad < (reach || 24); rad += 1.5) for (let a = 0; a < 16; a++){ const cx = x + Math.cos(a*0.3927)*rad, cy = y + Math.sin(a*0.3927)*rad, v = view ?? viewFacing(...nearestRoadDir(cx, cy)), p = building(name, cx, cy, v, recol, role); if (p) return p; } return null; };
  const HOUSES = ['House, two storeys', 'House, small', ...ART.VARS.house], house = () => HOUSES[Math.floor(r()*HOUSES.length)], FARMS = ['Farm', ...ART.VARS.farm];
  const ROOFS = [null, {'#a8473a':'#b8553e'}, {'#a8473a':'#8e3f32'}, {'#a8473a':'#9a5a3a'}, {'#a8473a':'#c0624a'}], roof = () => ROOFS[Math.floor(r()*ROOFS.length)];
  const FUNC = ['Church', 'Mairie', 'Fountain', 'Village shop', 'Bank', 'Bourse du Jura', 'La Feuille de la Faille', 'Gendarmerie', 'Canton house', 'School', 'Chapel', 'Committee office', 'Utility office', 'Railway station', 'Substation (utility)'];
  // the town: the square with the fountain, the mairie and church on it, the institutions around, the station on the railway, the substation outside
  nearBy('Fountain', SQ[0] + 9, SQ[1], null, 24, 'fountain', 0);
  { const sx = NX + rr(14, 24); nearBy('Railway station', sx, yOn(RAIL, sx) - RAIL.w - 3.0, null, 30, 'station', 0); }
  for (const [name, dx, dy, role] of [['Mairie', 14, -10, 'mairie'], ['Church', -22, -8, 'church'], ['Village shop', 16, 8, 'shop'], ['Bank', -24, 10, 'bank'], ['La Feuille de la Faille', 40, -6, 'newspaper'], ['Gendarmerie', 38, 22, 'police'], ['Canton house', -48, -8, 'canton'],
    ['Bourse du Jura', -50, 18, 'bourse'], ['School', -12, 30, 'school'], ['Committee office', 60, 10, 'committee'], ['Utility office', 58, -22, 'utility']]) nearBy(name, SQ[0] + dx, SQ[1] + dy, null, 30, role);
  for (const dx of [96, -96, 110, -110]){ const x = TX + dx; if (nearBy('Substation (utility)', x, yOn(MAIN, x) + 16, null, 14, 'substation') || nearBy('Substation (utility)', x, yOn(MAIN, x) - 18, null, 14, 'substation')) break; }
  // houses line the streets, a second row behind, thinning out at the edge; most face the street, some are turned
  const frontage = (cx, cy, rx, ry, prob, rows, nmax, pick, home) => { let k = 0; for (const pl of ROADS) for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax)/L, uy = (by - ay)/L;
      for (let s = 0; s < L; s += 1.2) for (const side of [-1, 1]) for (let row = 0; row < rows; row++){ if (k >= nmax) return k; const name = pick ? pick() : house(), m = model(name), off = pl.w + 3.2 + (row ? 13 : 0) + Math.max(m.W, m.D)/2;
        const px = ax + ux*s - uy*side*off, py = ay + uy*s + ux*side*off, d = Math.hypot((px - cx)/rx, (py - cy)/ry); if (d > 1 || r() > prob*(1.25 - d)) continue;
        const v = r() < 0.65 ? viewFacing(uy*side, -ux*side) : [0, 4, 8, 12][Math.floor(r()*4)], p = building(name, px, py, v, roof(), 'house'); if (p){ p.home = home; k++; } } } return k; };
  frontage(TOWN[0], TOWN[1], TOWN[2], TOWN[3], 1.4, 2, 90, null, 'town');
  // each village: mairie, chapel and shop near the middle, houses along the lanes; the largest village also has a school
  VILLAGES.forEach(([cx, cy, rad], i) => { for (const [name, dx, dy, role] of [['Mairie', 8, -10, 'mairie'], ['Chapel', -10, -12, 'church'], ['Village shop', 12, 10, 'shop'], ...(i === 0 ? [['School', -14, 12, 'school']] : [])]){ const p = nearBy(name, cx + dx, cy + dy, null, 34, role) || nearBy(name, cx, cy, null, 60, role); if (p) p.home = i; }
    frontage(cx, cy, rad, rad, 0.8, 2, [12, 10, 11][i], null, i); });
  for (const name of FUNC) if (!placed.some(p => p.name === name)) nearBy(name, SQ[0], SQ[1], null, 80);
  // rule 1: any type of house still missing goes into a village or the town
  for (const name of HOUSES) if (!placed.some(p => p.name === name)) for (const [cx, cy, rad, home] of [...VILLAGES.map((v, i) => [...v, i]), [TOWN[0], TOWN[1], 60, 'town']]){ if (frontage(cx, cy, rad + 8, rad + 8, 3, 2, 1, () => name, home)) break; }
  for (const p of placed) if (p.home === undefined) p.home = inTown(p.cx, p.cy) || Math.hypot(p.cx - TX, p.cy - TOWN[1]) < 90 ? 'town' : VILLAGES.reduce((b, v, i) => Math.hypot(p.cx - v[0], p.cy - v[1]) < Math.hypot(p.cx - VILLAGES[b][0], p.cy - VILLAGES[b][1]) ? i : b, 0);
  // farms stand in the open, each with a track to the nearest road; every type of farm at least once
  const trackTo = (x, y) => { let best = null; for (const pl of ROADS){ const q = nearP(pl, x, y, 400); if (q && (!best || q[0] < best[0])) best = q; } if (!best) return null; const mx = lerp(x, best[1], 0.5) + rr(-8, 8), my = lerp(y, best[2], 0.5) + rr(-8, 8);
    const pl = curve([[x, y], [mx, my], [best[1], best[2]]], 1.45, 'track'); for (let t = 0; t < pl.length; t += 2) if (PROBE(pl[t][0], pl[t][1], 1.5) && Math.hypot(pl[t][0] - x, pl[t][1] - y) > 3) return null; return pl; };
  const farmOrder = [...FARMS, ...Array.from({length:6}, () => FARMS[Math.floor(r()*FARMS.length)])], farmsAt = [], yards = [];
  for (const name of farmOrder){ const m = model(name); for (let t = 0; t < 600; t++){ const v = [0, 4, 8, 12][Math.floor(r()*4)], f = footOf(m, v), x = rr(24, W - 24), y = rr(RID(x) - 10, D - 28), c = [x, y];
      if (inSettle(x, y, 40) || !far(c, farmsAt, 80) || slope(x, y) > 0.3 || forestRaw(x, y) || Math.abs(streamV(x, y)) < 16) continue;
      const p = building(name, x, y, v, roof(), 'farm'); if (!p) continue; const yd = [p.x0 - 3, p.y1 - 1, p.x1 + 2, p.y1 + 7], tr = trackTo(p.cx, p.y1 + 7); if (tr){ TRACKS.push(tr); farmsAt.push(c); yards.push(yd); p.yard = yd; break; } unplace(p); } }
  // the lender's villa: alone on the slope above the valley, near the forest, with its own drive
  for (let t = 0; t < 800; t++){ const x = rr(30, 600), y = RID(x) - rr(-5, 25); if (Math.abs(x - TX) > 220 || !far([x, y], VILLAGES, 80) || slope(x, y) > 0.45 || inSettle(x, y, 30)) continue;
    const p = building('Villa', x, y, 0, null, 'villa'); if (p){ const tr = trackTo(p.cx, p.y1 + 1); if (tr){ TRACKS.push(tr); break; } unplace(p); } }
  for (const p of placed) if (p.role === 'farm' || p.role === 'villa') p.home = null;
  const SQUARE = (() => { const f = placed.find(p => p.name === 'Fountain'); return f ? [f.cx, f.cy] : SQ; })();
  // checks for the tests: what is missing (nothing) and what overlaps (nothing)
  const REQUIRED = [...HOUSES, ...FARMS, 'Villa', ...FUNC], MISSING = REQUIRED.filter(n => !placed.some(p => p.name === n));
  let OVERLAPS = 0; placed.forEach((p, i) => placed.forEach((q, j) => { if (j > i && !(p.x1 <= q.x0 || p.x0 >= q.x1 || p.y1 <= q.y0 || p.y0 >= q.y1)) OVERLAPS++; }));
  placed.forEach(p => { for (let u = 0.1; u < 1; u += 0.2) for (let v = 0.1; v < 1; v += 0.2){ const x = lerp(p.x0, p.x1, u), y = lerp(p.y0, p.y1, v); if (allRoads().some(pl => near(pl, x, y, pl.w) < pl.w) || near(RAIL, x, y, 2) < RAIL.w){ OVERLAPS++; return; } } });
  // ---- forest, woods, hedges, pastures, fields
  const cleared = (x, y) => inSite(x, y, 4) || NEWROADS.some(pl => near(pl, x, y, 6) < pl.w + 4.5);
  const HEDGES = []; for (let i = 0; i < 400 && HEDGES.length < 8; i++){ let x = rr(20, 620), y = rr(RID(x) - 10, 450), a = r()*6.283; const pts = [[x, y]]; for (let k = 0; k < 3; k++){ a += rr(-0.5, 0.5); x += Math.cos(a)*rr(35, 50); y += Math.sin(a)*rr(35, 50); pts.push([x, y]); }
    if (pts.every(([px, py]) => px > 0 && py > 0 && px < W && py < D && !inSettle(px, py, 20) && !forestRaw(px, py))) HEDGES.push(curve(pts, 1, 'hedge')); }
  const seeds = []; for (let i = 0; i < 3000 && seeds.length < 80; i++){ const x = r()*W, y = r()*D; if (seeds.every(s => Math.hypot(s.x - x, s.y - y) > 36)){ const gx = base0(x + 3, y) - base0(x - 3, y), gy = base0(x, y + 3) - base0(x, y - 3), g = Math.hypot(gx, gy);
      const a = g > 0.8 ? Math.atan2(gx, -gy) : (r() - 0.5)*1.4; seeds.push({x, y, a:a + (r() - 0.5)*0.25, w:10 + r()*10, id:seeds.length, past:r() < 0.18, ca:0, sa:0}); } }
  for (const s of seeds){ s.ca = Math.cos(s.a); s.sa = Math.sin(s.a); }
  // the nearest seeds of every 4 m cell, so a point only compares a few
  const SG = 4, sgx = Math.ceil(W/SG) + 1, sgy = Math.ceil(D/SG) + 1, seedNear = new Array(sgx*sgy);
  for (let j = 0; j < sgy; j++) for (let i = 0; i < sgx; i++){ const x = i*SG + SG/2, y = j*SG + SG/2; seedNear[j*sgx + i] = seeds.map(s => [Math.hypot(x - s.x, (y - s.y)*1.15), s]).sort((a, b) => a[0] - b[0]).slice(0, 7).map(q => q[1]); }
  const CROPS = ['wheat', 'wheat', 'wheat', 'barley', 'meadow', 'meadow', 'meadow', 'mown', 'mown', 'plough', 'maize'];
  const plot = (x, y) => { let a = null, da = 1e9, db = 1e9; for (const s of seedNear[clamp(Math.floor(y/SG), 0, sgy - 1)*sgx + clamp(Math.floor(x/SG), 0, sgx - 1)]){ const d = Math.hypot(x - s.x, (y - s.y)*1.15); if (d < da){ db = da; da = d; a = s; } else if (d < db) db = d; }
    const u = (x - a.x)*a.ca + (y - a.y)*a.sa, v = -(x - a.x)*a.sa + (y - a.y)*a.ca, k = Math.floor(v/a.w), f = v/a.w - k;
    return {s:a, edge:(db - da)/2, u, v, k, f, crop:a.past ? 'pasture' : CROPS[Math.floor(hsh(a.id, k, 51)*CROPS.length)]}; };
  const pastureM = (x, y) => { const fe = RID(x) - 54 + 30*fbm(x/50, y/50, 21); return (y > fe && y < fe + 46 && fbm(x/70, 3, 29) > 0.42) || (Math.abs(x - sv(y)) < 44 && y < 230 && y > 20); };
  // ---- the lines near every 8 m cell (roads, tracks, rail, side stream, hedges), so a point only measures what is close
  const BIN = 8, bx = Math.ceil(W/BIN) + 1, byN = Math.ceil(D/BIN) + 1; let bins = null;
  const rebin = () => { bins = Array.from({length:bx*byN}, () => []); const add = (pl, reach) => { for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [qx, qy] = pl[i + 1];
      for (let gi = Math.max(0, Math.floor((Math.min(ax, qx) - reach)/BIN)); gi <= Math.min(bx - 1, Math.floor((Math.max(ax, qx) + reach)/BIN)); gi++) for (let gj = Math.max(0, Math.floor((Math.min(ay, qy) - reach)/BIN)); gj <= Math.min(byN - 1, Math.floor((Math.max(ay, qy) + reach)/BIN)); gj++){ const b = bins[gj*bx + gi]; let e = b.find(q => q.pl === pl); if (!e){ e = {pl, segs:[]}; b.push(e); } e.segs.push(i); } } };
    for (const pl of allRoads()) add(pl, pl.w + 6.5); add(RAIL, 6); for (const pl of TRACKS) add(pl, pl.w + 4); add(SIDE, 4); for (const pl of HEDGES) add(pl, 3); };
  rebin();
  const nearIn = (e, x, y) => { let best = null; for (const i of e.segs){ const q = segNear(e.pl, i, x, y); if (!best || q[0] < best[0]) best = q; } return best; };
  const binAt = (x, y) => bins[clamp(Math.floor(y/BIN), 0, byN - 1)*bx + clamp(Math.floor(x/BIN), 0, bx - 1)];
  // forest: on the ridge, the hill and in woods; never on roads, tracks, water, building plots or what the Company cleared
  const forestAt = (x, y, b) => { if (!forestRaw(x, y) || inSettle(x, y, 14) || fbm(x/14, y/14, 23) >= 0.74 || Math.abs(streamV(x, y)) <= hw(x) + 2.5 || PROBE(x, y, 6)) return false;
    for (const e of b || binAt(x, y)){ const k = e.pl.kind; if (k === 'hedge' || k === 'stream') continue; const q = nearIn(e, x, y); if (k === 'track' ? q[0] < 3.6 : k === 'new' ? q[0] < e.pl.w + 4.5 : q[0] < e.pl.w + 2.5) return false; }
    return !inSite(x, y, 4); };
  // ---- what lies at a point
  const SITE_K = ['site', 'earth'];
  const kindAt = (x, y) => {
    for (const s of SITES){ if (inSiteBox(s, x, y, 0)) return s.look ? [s.look, 0] : ['site', 0]; if (!s.look && inSiteBox(s, x, y, 1.4)) return ['earth', 0]; }
    const b = binAt(x, y); let qr = null, qRoad = null, eRoad = null, qTrack = null, qSide = null, qNew = null, eNew = null;
    for (const e of b){ const k = e.pl.kind; if (k === 'hedge') continue; const q = nearIn(e, x, y);
      if (k === 'rail'){ qr = q; continue; } if (k === 'track'){ if (!qTrack || q[0] - e.pl.w < qTrack[0] - qTrack.w){ qTrack = q; qTrack.w = e.pl.w; } continue; } if (k === 'stream'){ qSide = q; continue; }
      if (k === 'new'){ if (!qNew || q[0] - e.pl.w < qNew[0] - eNew.pl.w){ qNew = q; eNew = e; } continue; }
      if (!qRoad || q[0] - e.pl.w < qRoad[0] - eRoad.pl.w){ qRoad = q; eRoad = e; } }
    if (qNew){ const d = qNew[0], w = eNew.pl.w; if (d < w) return ['newroad', d, w]; if (d < w + 1.3) return ['earth', 0]; if (d < w + 4.5 && forestRaw(x, y)) return ['stumps', d]; }
    const onRail = qr && qr[0] < RAIL.w, railLine = onRail && Math.abs(qr[0] - 0.72) < 0.07;
    if (qRoad){ const pl = eRoad.pl, town = inTown(x, y); if (railLine && qRoad[0] < pl.w + 1.7) return ['rail', qr[0], qr[3]]; if (qRoad[0] < pl.w) return ['road', qRoad[0], pl.w, qRoad[3], qRoad[4], pl, town, Math.hypot(qRoad[1] - SQUARE[0], qRoad[2] - SQUARE[1])];
      if (town && qRoad[0] < pl.w + 1.7) return ['pavement', qRoad[0] - pl.w, 0, qRoad[3]]; }
    if (onRail) return ['rail', qr[0], qr[3]]; if (qr && qr[0] < RAIL.w + 0.8) return ['verge', 0];
    const pb = PROBE(x, y, 0);
    if (Math.hypot(x - SQUARE[0], y - SQUARE[1]) < 16 && !pb) return ['square', 0];
    const v = streamV(x, y), w = hw(x); if (Math.abs(v) < w) return ['water', Math.abs(v)/w]; if (Math.abs(v) < w + 1.4 && v*ys2(x) > 0 && Math.abs(v) < w + 1.4*(0.4 + 0.6*vn(x/5, 0, 52))) return ['gravel', 0]; if (Math.abs(v) < w + 2.6) return ['bank', Math.abs(v) - w];
    if (qSide){ const ds = qSide[0]; if (ds < 1.3) return ['water', ds/1.3]; if (ds < 2.6) return ['bank', ds - 1.3]; }
    if (qTrack && qTrack[0] < qTrack.w) return ['track', qTrack[0]];
    if (qRoad && qRoad[0] < eRoad.pl.w + 1.4) return ['verge', qRoad[0] - eRoad.pl.w];
    if (pb) return pb.func ? ['square', 0] : pb.farm ? ['yard', 0] : ['garden', 0, pb]; for (const yd of yards) if (x > yd[0] && x < yd[2] && y > yd[1] && y < yd[3]) return ['yard', 0];
    const pg = PROBE(x, y, 4.5); if (pg && !pg.func && !pg.farm) return ['garden', 0, pg];
    if (forestAt(x, y, b)) return ['floor', 0]; if (rock(x, y) > 0.35) return ['rock', 0]; if (inSettle(x, y, 6)) return ['verge', 0]; if (pastureM(x, y)) return ['pasture', 0];
    const p = plot(x, y); if (p.edge < 1.0) return ['margin', p.edge]; if (p.crop !== 'pasture' && Math.min(p.f, 1 - p.f)*p.s.w < 0.35) return ['margin', 0.5]; return [p.crop, 0, p]; };
  // ---- heights on a 1 m grid; a blurred copy for the shading of hollows; light on the slopes and the shadows of the slopes
  const nx = W, ny = D, gh = new Float32Array((nx + 1)*(ny + 1));
  const relevel = (x0, y0, x1, y1) => { for (let j = Math.max(0, Math.floor(y0)); j <= Math.min(ny, Math.ceil(y1)); j++) for (let i = Math.max(0, Math.floor(x0)); i <= Math.min(nx, Math.ceil(x1)); i++) gh[j*(nx + 1) + i] = ground(i, j); };
  relevel(0, 0, W, D);
  const hh = (i, j) => gh[clamp(j, 0, ny)*(nx + 1) + clamp(i, 0, nx)];
  const hb = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j; return hh(i, j)*(1 - u)*(1 - v) + hh(i + 1, j)*u*(1 - v) + hh(i, j + 1)*(1 - u)*v + hh(i + 1, j + 1)*u*v; };
  let zmin = 1e9, zmax = -1e9; for (const v of gh){ if (v < zmin) zmin = v; if (v > zmax) zmax = v; }
  const B2 = 4, bbx = W/B2, bby = D/B2, blur = new Float32Array((bbx + 1)*(bby + 1));
  const reblur = (x0, y0, x1, y1) => { for (let j = Math.max(0, Math.floor(y0/B2) - 4); j <= Math.min(bby, Math.ceil(y1/B2) + 4); j++) for (let i = Math.max(0, Math.floor(x0/B2) - 4); i <= Math.min(bbx, Math.ceil(x1/B2) + 4); i++){ let s = 0, n = 0; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++){ s += hb(clamp((i + a)*B2, 0, W), clamp((j + b)*B2, 0, D)); n++; } blur[j*(bbx + 1) + i] = s/n; } };
  reblur(0, 0, W, D);
  const blurAt = (x, y) => { const fx = clamp(x/B2, 0, bbx - 1e-6), fy = clamp(y/B2, 0, bby - 1e-6), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, q = (a, b) => blur[b*(bbx + 1) + a];
    return q(i, j)*(1 - u)*(1 - v) + q(i + 1, j)*u*(1 - v) + q(i, j + 1)*(1 - u)*v + q(i + 1, j + 1)*u*v; };
  const SUN = [0.345, 0.636, 1], SL = Math.hypot(...SUN), sux = 0.345/0.723, suy = 0.636/0.723, rise = 1/0.723;
  const lightG = new Float32Array((nx + 1)*(ny + 1)), shadeG = new Uint8Array((nx + 1)*(ny + 1));
  const relight = (x0, y0, x1, y1) => { for (let j = Math.max(0, Math.floor(y0) - 1); j <= Math.min(ny, Math.ceil(y1) + 1); j++) for (let i = Math.max(0, Math.floor(x0) - 1); i <= Math.min(nx, Math.ceil(x1) + 1); i++){ const h = hh(i, j), gx = (hh(i + 1, j) - hh(i - 1, j))/2, gy = (hh(i, j + 1) - hh(i, j - 1))/2;
      const lit = (-gx*SUN[0] - gy*SUN[1] + SUN[2])/(Math.hypot(gx, gy, 1)*SL); let f = 0.6 + 0.48*lit; f *= 1 - clamp((blurAt(i, j) - h)/7, 0, 1)*0.28; lightG[j*(nx + 1) + i] = f;
      let sh = 0; for (let t = 1; t < 40; t += 1.5){ if (hb(i + sux*t, j + suy*t) > h + rise*t + 0.2){ sh = 1; break; } } shadeG[j*(nx + 1) + i] = sh; } };
  relight(0, 0, W, D);
  // ---- trees: the forest close together, hedges of shrubs with oaks, trees by the water, lone spruces in the pastures, fruit trees in gardens
  const trees = [], TB = new Map(); const treeAdd = (x, y, kind, s) => { const t = {x, y, z:hb(x, y) - (kind === 'h' ? 0.1 : 0.15), kind, s:Math.round(s*20)/20}; trees.push(t); const k = Math.floor(x/16)*1000 + Math.floor(y/16); if (!TB.has(k)) TB.set(k, []); TB.get(k).push(t); return t; };
  const free = (x, y, m) => { if (PROBE(x, y, m) || inSite(x, y, 2) || cleared(x, y) || Math.abs(streamV(x, y)) <= hw(x) + 0.6) return false; for (const e of binAt(x, y)){ const k = e.pl.kind; if (k === 'hedge') continue; const q = nearIn(e, x, y); if (k === 'stream' ? q[0] < 1.8 : k === 'track' ? q[0] < 2.2 : q[0] < e.pl.w + 1.5) return false; } return !forestAt(x, y); };
  const CG = 3.6; for (let i = 0; i <= W/CG; i++) for (let j = 0; j <= D/CG; j++){ const x = (i + 0.5 + 0.8*(hsh(i, j, 31) - 0.5))*CG, y = (j + 0.5 + 0.8*(hsh(i, j, 32) - 0.5))*CG; if (x < 1 || y < 1 || x > W - 1 || y > D - 1 || !forestAt(x, y)) continue;
    const sp = hsh(i, j, 33) < 0.35 + 0.5*clamp((90 - y)/90, 0, 1), s = 0.85 + 0.35*hsh(i, j, 34); treeAdd(x, y, sp ? 's' : 'b', s*(sp ? 1.05 : 1.1)); }
  const hedgeM = (x, y) => HEDGES.some(pl => near(pl, x, y, 2.4) < 1.0 + 0.6*fbm(x/3, y/3, 24)) && fbm(x/9, y/9, 25) < 0.74 && !roadNear(x, y, 1) && !cleared(x, y) && !PROBE(x, y, 2);
  for (const pl of HEDGES) for (let t = 0; t < pl.length; t += 1){ const [px, py] = pl[t], x = px + (hsh(t, pl.length, 35) - 0.5)*1.2, y = py + (hsh(t, 1, 36) - 0.5)*1.2; if (hedgeM(x, y) && free(x, y, 1)){ if (hsh(t, pl.length, 37) < 0.06) treeAdd(x, y, 'b', 1.15 + 0.3*hsh(t, 2, 38)); else treeAdd(x, y, 'h', 0.42 + 0.14*hsh(t, 3, 39)).hedge = 1; } }
  for (let i = 0; i < 120; i++){ const x = r()*W, v = (r() < 0.5 ? -1 : 1)*(hw(x) + 1.8 + r()*1.4), y = ys(x) + v; if (y < D - 3 && free(x, y, 3)) treeAdd(x, y, 'b', 0.6 + r()*0.3); }
  for (let i = 0; i < 40; i++){ const t = Math.floor(r()*SIDE.length), [px, py] = SIDE[t], x = px + (r() < 0.5 ? -1 : 1)*(2.6 + r()*1.5), y = py; if (free(x, y, 3)) treeAdd(x, y, r() < 0.5 ? 'b' : 's', 0.6 + r()*0.3); }
  for (let i = 0; i < 2500; i++){ const x = r()*W, y = r()*D; if (pastureM(x, y) && !inSettle(x, y, 8) && free(x, y, 3) && r() < 0.03) treeAdd(x, y, r() < 0.8 ? 's' : 'b', 0.8 + r()*0.45); }
  for (const p of placed) if (p.role === 'house') for (let i = 0; i < 2; i++){ const x = p.x0 - 3 + r()*(p.x1 - p.x0 + 6), y = p.y0 - 3 + r()*(p.y1 - p.y0 + 6); if (free(x, y, 1)) treeAdd(x, y, 'f', 0.85); }
  for (const p of placed) if (p.farm) for (let i = 0; i < 5; i++){ const x = p.x0 - 8 + r()*(p.x1 - p.x0 + 16), y = p.y0 - 8 + r()*(p.y1 - p.y0 + 16); if (free(x, y, 2.5)) treeAdd(x, y, 'f', 0.9); }
  for (let i = 0; i < 30000; i++){ const x = r()*W, y = r()*D; if (!forestAt(x, y) && (forestAt(x - 2.5, y) || forestAt(x, y - 2.5)) && free(x, y, 2) && r() < 0.12) treeAdd(x, y, 'h', 0.32 + r()*0.18).edge = 1; }
  // ---- street things: lamps in town, garden fences, washing lines, woodpiles, bridges, parked cars, life on the square
  const props = []; let PRID = 0; const prop = (m, x, y, view, extra) => { const p = Object.assign({id:++PRID, m, x, y, z:hb(x, y), view:view || 0}, extra || {}); props.push(p); return p; };
  for (const pl of ROADS){ for (let sl = 6, k = 0; sl < pl.len; sl += 24, k++){ const [x, y] = atRoad(pl, sl, (k % 2 ? 1 : -1)*(pl.w + 1.4)); if (!inTown(x, y) || PROBE(x, y, 0.4)) continue; prop(ART.lampModel(), x, y, 0, {lamp:1}); } }
  for (const p of placed){ if (p.role !== 'house' || p.home === 'town') continue; const a = p.x0 - 4.5, b = p.y0 - 4.5, c = p.x1 + 4.5, e = p.y1 + 4.5;
    const side = (P, Q2, view) => { const L = Math.hypot(Q2[0] - P[0], Q2[1] - P[1]), n = Math.max(1, Math.round(L/1.6)), sl = L/n; for (let i = 0; i < n; i++){ const t0 = i/n, t1 = (i + 1)/n, x = lerp(P[0], Q2[0], (t0 + t1)/2), y = lerp(P[1], Q2[1], (t0 + t1)/2); if (roadNear(x, y, 0.4) || PROBE(x, y, 0.2)) continue; prop(ART.fenceModel(sl), x, y, view); } };
    side([a, e], [c, e], 0); side([c, b], [c, e], 4); side([a, b], [a, e], 4);
    if (r() < 0.6){ const x = c - 2.2, y = e - 2.2; if (!PROBE(x, y, 0.3)) prop(ART.washingModel(), x, y, 0); }
    { const x = p.x0 + 2.2, y = p.y1 + 0.6; if (!PROBE(x, y, 0.1) && !roadNear(x, y, 0.5)) prop(ART.woodpileModel(), x, y, 0); } }
  const bridges = []; for (const pl of [...ROADS, ...TRACKS]) for (let t = 0; t < pl.length - 1; t++){ const [x, y] = pl[t], [x2, y2] = pl[t + 1]; if (Math.sign(streamV(x, y)) !== Math.sign(streamV(x2, y2))){ const w = hw(x) + 2.4, yc = ys(x), z = Math.max(base0(x, yc - w - 1), base0(x, yc + w + 1)) - 0.2, ux = x2 - x, uy = y2 - y;
      const v = view16(ux, uy), m = ART.bridgeModel(2*w + 1, 2*(pl.w + 0.2), pl.kind !== 'track'); const bp = prop(m, x, yc, v, {bridge:1}); bp.z = z - 0.25; bridges.push(bp); } }
  for (const pl of ROADS) for (let sl = 4; sl < pl.len; sl += 7){ const side = r() < 0.5 ? 1 : -1, [x, y, ux, uy] = atRoad(pl, sl, (pl.w - 1.05)*side); if (r() > (inTown(x, y) ? 0.3 : 0.015)) continue;
    if (ROADS.some(o => o !== pl && near(o, x, y, o.w + 6) < o.w + 6) || PROBE(x, y, 1) || x < 3 || y < 3 || x > W - 3 || y > D - 3) continue; const nm = ART.VARS.car[Math.floor(r()*ART.VARS.car.length)]; prop(model(nm), x, y, view16(ux*side, uy*side), {car:1, road:pl.id}); }
  const life = []; for (const [name, dx, dy] of [['Café terrace', -2, -14], ['Market stall with cheese seller', -14, 4], ['Market stall with cheese seller', -9, 8], ['Pensioners on a bench', 8, 6], ['Kids playing', 2, 7]]){ const m = model(name); if (!m) continue;
    search: for (let rad = 0; rad < 14; rad += 1) for (let a = 0; a < 8; a++){ const px = SQUARE[0] + dx + Math.cos(a*0.785)*rad, py = SQUARE[1] + dy + Math.sin(a*0.785)*rad;
      if ([[-m.W/2, -m.D/2], [m.W/2, -m.D/2], [-m.W/2, m.D/2], [m.W/2, m.D/2], [0, 0]].every(([u, v]) => !roadNear(px + u, py + v, 0.3) && !PROBE(px + u, py + v, 0.5))){ life.push(prop(m, px, py, 0, {life:1})); break search; } } }
  // ---- shadows and contact shade of buildings, trees and things, on a 25 cm grid
  const OG = 4, onx = W*OG, ony = D*OG, objShade = new Uint8Array((onx + 1)*(ony + 1)).fill(255), objDark = new Uint8Array((onx + 1)*(ony + 1));
  const casters = () => [...placed.map(p => [p.x0 + 0.6, p.y0 + 0.6, p.x1 - 0.6, p.y1 - 0.6, p.zt*0.8]), ...trees.map(t => { const s = t.kind === 'h' ? 1.5*t.s*1.6 : 1.1*t.s; return [t.x - s, t.y - s, t.x + s, t.y + s, ART.TREE_H[t.kind]*t.s*0.85]; }), ...SITES.filter(s => s.rig).map(s => [s.cx - 4, s.cy - 4, s.cx + 4, s.cy + 4, 18])];
  const reshade = (x0, y0, x1, y1) => { const i0 = Math.max(0, Math.floor(x0*OG)), i1 = Math.min(onx, Math.ceil(x1*OG)), j0 = Math.max(0, Math.floor(y0*OG)), j1 = Math.min(ony, Math.ceil(y1*OG));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ objShade[j*(onx + 1) + i] = 255; objDark[j*(onx + 1) + i] = 0; }
    for (const [a, b, c, e, h] of casters()){ if (c + 2 < x0 || a - h - 2 > x1 || e + 2 < y0 || b - h*1.9 - 2 > y1) continue;
      for (let j = Math.max(j0, Math.floor((b - 2)*OG)); j <= Math.min(j1, Math.ceil((e + 2)*OG)); j++) for (let i = Math.max(i0, Math.floor((a - 2)*OG)); i <= Math.min(i1, Math.ceil((c + 2)*OG)); i++){ const x = i/OG, y = j/OG, d = Math.hypot(Math.max(a - x, 0, x - c), Math.max(b - y, 0, y - e)), q = Math.min(254, Math.round(d*100)), o = j*(onx + 1) + i; if (q < objShade[o]) objShade[o] = q; }
      for (let j = Math.max(j0, Math.floor((b - h*0.636)*OG)); j <= Math.min(j1, Math.ceil(e*OG)); j++) for (let i = Math.max(i0, Math.floor((a - h*0.345)*OG)); i <= Math.min(i1, Math.ceil(c*OG)); i++){ const x = i/OG, y = j/OG;
        // in shadow if the way toward the sun meets the caster within its height
        let t0 = 0.3, t1 = h; for (const [p, d, lo, hi] of [[x, 0.345, a, c], [y, 0.636, b, e]]){ const ta = (lo - p)/d, tb = (hi - p)/d; t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb)); } if (t0 <= t1) objDark[j*(onx + 1) + i] = 1; } } };
  reshade(0, 0, W, D);
  // ---- the colour of the ground at a point: the kind of ground, its texture (more of it the closer the view), light, shadow, haze
  const C = new Map(), col = c => { let v = C.get(c); if (!v){ v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; C.set(c, v); } return v; };
  const mul = (c, f) => [c[0]*f, c[1]*f, c[2]*f], mixC = (a, b, t) => [a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t];
  const colourAt = (x, y, LOD, S) => {
    const speck = (q, s) => { q = Math.max(q, 1/S); return hsh(Math.floor(x/q), Math.floor(y/q), s); }, per = q => Math.max(q, 3/S);
    const k = kindAt(x, y), kind = k[0], a = k[1], b = k[2], n1 = fbm(x/14, y/14, 61), n2 = fbm(x/3, y/3, 62); let c;
    switch (kind){
      case 'road': { const [, d, w, sl, side, pl, town, dsq] = k; c = mul(col('#6d7176'), 0.94 + 0.1*n2); if (LOD >= 2 && fbm(x/4, y/4, 63) > 0.72) c = mul(c, 0.92);
        if (LOD >= 2 && Math.abs(d - w*0.5) < 0.45) c = mul(c, 0.95);
        if (!town && d > w - 0.4) c = mixC(c, col('#a59b86'), clamp((d - w + 0.4)/0.4, 0, 1)*(0.5 + 0.5*speck(0.2, 64)));
        if (!town && pl.kind === 'main' && LOD >= 2){ if (d > w - 0.5 && d < w - 0.32) c = col('#e4e2da'); if (d < 0.09 && ((sl % 9) + 9) % 9 < 3) c = col('#e4e2da'); }
        if (town){ if (d > w - 0.22) c = mul(c, 0.86); if (LOD >= 2 && ((sl % 16) + 16) % 16 < 0.55 && d > w - 0.45) c = mul(col('#3a3d40'), 1 + 0.3*(((sl*8) % 1 + 1) % 1 < 0.5));
          if (LOD >= 2){ const mh = Math.hypot(((sl % 27) + 27) % 27 - 13, side*d - 0.9); if (mh < 0.36) c = mh > 0.27 ? col('#45484b') : col('#5a5d60'); }
          if (dsq > 16.5 && dsq < 19.5 && (((side*d + w)/0.5) % 2 + 2) % 2 < 1) c = col('#e8e6de'); }
        if (LOD >= 3 && speck(0.1, 65) > 0.93) c = mul(c, 0.9); if (LOD >= 3 && Math.abs(fbm(x/2.5, y/2.5, 66) - 0.5) < 0.006 && fbm(x/12, y/12, 107) > 0.55) c = mul(c, 0.88); break; }
      case 'rail': { if (Math.abs(a - 0.72) < 0.07){ c = col('#5a5e62'); break; } c = mul(col('#9e978a'), 0.9 + 0.15*(LOD >= 3 ? speck(0.12, 109) : n2)); if (LOD >= 2 && a < 1.15 && ((b/per(0.6)) % 1 + 1) % 1 < 0.38) c = col('#6e5a44'); break; }
      case 'pavement': { const [, d, , sl] = k; c = mul(col('#b9b5ab'), 0.95 + 0.06*n2); if (d < 0.18) c = col('#cfcbc1');
        else if (LOD >= 2){ const q = per(0.6); if (((sl/q) % 1 + 1) % 1 < 0.12 || (((d - 0.18)/q) % 1 + 1) % 1 < 0.12) c = mul(c, 0.88); else if (LOD >= 3) c = mul(c, 0.96 + 0.08*hsh(Math.floor(sl/q), Math.floor(d/q), 108)); } break; }
      case 'newroad': c = mul(col('#5e6266'), 0.97 + 0.05*n2); if (a > b - 0.4) c = mixC(c, col('#9a9282'), 0.6); if (LOD >= 3 && speck(0.1, 100) > 0.95) c = mul(c, 1.1); break;
      case 'site': c = mul(col('#b3ab9c'), 0.93 + 0.1*n2); if (LOD >= 2 && Math.abs(Math.sin((x + 4*Math.sin(y/6))*0.7)) > 0.95) c = mul(c, 0.88); if (LOD >= 3 && speck(0.1, 101) > 0.85) c = mul(c, speck(0.1, 102) > 0.5 ? 1.1 : 0.88); break;
      case 'earth': c = mul(col('#8a6a48'), 0.9 + 0.15*n2*(LOD >= 3 ? speck(0.15, 103) + 0.5 : 1)); break;
      case 'stumps': c = mixC(col('#7a8a4e'), col('#8a7a52'), n2); if (LOD >= 2 && speck(0.6, 104) > 0.9 && Math.hypot(((x/0.6) % 1 + 1) % 1 - 0.5, ((y/0.6) % 1 + 1) % 1 - 0.5) < 0.32) c = col(LOD >= 3 ? '#c9a878' : '#a08868'); break;
      case 'square': { c = mul(col('#b9b1a2'), 0.94 + 0.08*n1); if (LOD >= 2){ const cq = 1/per(0.38), u = x*cq, v = y*cq + (Math.floor(x*cq) % 2)*0.5; if ((u % 1 + 1) % 1 < (LOD >= 3 ? 0.12 : 0.2) || (v % 1 + 1) % 1 < (LOD >= 3 ? 0.12 : 0.2)) c = mul(c, 0.86); else if (LOD >= 3) c = mul(c, 0.94 + 0.12*hsh(Math.floor(u), Math.floor(v), 105)); } break; }
      case 'track': { const rut = Math.abs(a - 0.72) < 0.28; c = rut ? mul(col('#9a8361'), 0.92 + 0.12*n2) : a < 0.42 ? mixC(col('#8fae62'), col('#a89470'), 0.3*n2) : mixC(col('#a89470'), col('#8fae62'), clamp((a - 1.0)/0.45, 0, 1));
        if (LOD >= 3 && rut && fbm(x/3, y/3, 67) > 0.74) c = mixC(c, col('#7f8f99'), 0.7); if (LOD >= 3 && !rut && speck(0.1, 68) > 0.85) c = mul(c, 1.08); break; }
      case 'water': c = mixC(col('#6b9ab8'), col('#4a7896'), sm(1 - a)); if (LOD >= 2 && Math.abs(Math.sin(x*1.3 + y*0.4 + fbm(x/4, y/2, 69)*6)) > 0.97 && fbm(x/2, y/2, 70) > 0.5) c = mixC(c, col('#cfe2ec'), 0.6); break;
      case 'gravel': c = mul(col('#bcae94'), LOD >= 3 ? 0.88 + 0.22*speck(0.12, 71) : 0.95 + 0.1*n2); break;
      case 'bank': c = mixC(col('#6f8d55'), col('#87a65c'), clamp(a/2.6, 0, 1)); if (LOD >= 3 && a < 1.4 && speck(0.1, 72) > 0.7) c = mixC(c, speck(0.1, 73) > 0.5 ? col('#b8b06a') : col('#4f6e3c'), 0.7); break;
      case 'rock': c = mul(col('#c3bcae'), 0.9 + 0.15*n2); if (LOD >= 2 && Math.abs(fbm(x/2, y/2, 75) - 0.5) < 0.02) c = mul(c, 0.72); if (LOD >= 3 && speck(0.15, 76) > 0.8) c = mixC(c, col('#7e9a5a'), 0.6); break;
      case 'verge': c = mixC(col('#90b064'), col('#9fba70'), n1); if (LOD >= 3 && speck(0.1, 77) > 0.88) c = mul(c, 0.86); break;
      case 'floor': c = mixC(col('#4c6a3a'), col('#5e5a3c'), fbm(x/5, y/5, 98)); if (LOD >= 3 && speck(0.1, 99) > 0.85) c = mul(c, 1.15); c = mul(c, 0.85); break;
      case 'yard': c = mul(col('#b5a98c'), 0.93 + 0.1*n2); if (LOD >= 2 && Math.abs(Math.sin((x + 3*Math.sin(y/4))*0.9)) > 0.94) c = mul(c, 0.86); if (LOD >= 3 && speck(0.1, 78) > 0.9) c = mul(c, 1.1); break;
      case 'garden': { const p = b, bed = y > p.y1 + 0.8 && y < p.y1 + 3.8 && x > p.x0 && x < p.x0 + 5; if (bed){ c = col('#8a6a4a'); if (LOD >= 2 && ((y/per(0.5)) % 1 + 1) % 1 < 0.45) c = mixC(c, col('#5f8a3c'), LOD >= 3 ? 0.6 + 0.4*speck(0.15, 79) : 0.5); break; }
        c = mixC(col('#8fba68'), col('#9cc472'), n1); if (LOD >= 3 && speck(0.1, 80) > 0.97) c = [[240, 240, 235], [232, 200, 70], [200, 90, 110]][Math.floor(speck(0.1, 81)*3)]; break; }
      case 'pasture': { c = mul(mixC(col('#7aa652'), col('#8db55e'), n1), 0.94 + 0.1*n2); const ph = base0(x, y)*1.4 + fbm(x/10, y/10, 82)*2; if (LOD >= 3 && fbm(x/30, y/30, 106) > 0.6 && Math.abs((ph % 1 + 1) % 1 - 0.5) < 0.03) c = mixC(c, col('#a8996e'), 0.55);
        if (LOD >= 3){ const t = speck(0.1, 83); if (t > 0.86) c = mul(c, 0.84); else if (t < 0.05) c = mul(c, 1.12); if (speck(0.3, 84) > 0.996) c = col('#7a5a3e'); if (speck(0.1, 85) > 0.992) c = [236, 236, 230]; } break; }
      case 'margin': c = mixC(col('#8ab260'), col('#a3bf72'), n2); if (LOD >= 3 && speck(0.1, 86) > 0.93) c = speck(0.1, 87) > 0.5 ? [228, 220, 120] : [214, 214, 220]; break;
      default: { const p = b, v = p.v, wv = fbm(x/9, y/9, 88), row = (q, w) => ((v/per(q)) % 1 + 1) % 1 < w;
        if (kind === 'wheat' || kind === 'barley'){ c = mixC(col(kind === 'wheat' ? '#dcbf68' : '#d4c886'), col(kind === 'wheat' ? '#e8d48e' : '#e0d6a0'), wv); c = mul(c, 0.95 + 0.08*n2);
          if (LOD >= 2 && Math.abs(((v % 12) + 12) % 12 - 6) < (LOD >= 3 ? 0.25 : 0.4)) c = mul(c, 0.88); if (LOD >= 3 && row(0.3, 0.3)) c = mul(c, 0.94); if (LOD >= 3 && speck(0.1, 89) > 0.995) c = [200, 60, 50]; }
        else if (kind === 'meadow'){ c = mul(mixC(col('#86b45c'), col('#9cc26a'), wv), 0.94 + 0.1*n2); if (LOD >= 3){ const t = speck(0.1, 90); if (t > 0.9) c = mul(c, 0.86); if (t > 0.985) c = [[240, 240, 232], [236, 206, 70], [176, 120, 190]][Math.floor(speck(0.1, 91)*3)]; } }
        else if (kind === 'mown'){ const sw = ((v/1.8) % 2 + 2) % 2 < 1; c = mixC(col('#b2c67c'), col('#c4d08e'), wv); if (LOD >= 2) c = mul(c, sw ? 1.04 : 0.95); if (LOD >= 2 && Math.abs(((v % 7.2) + 7.2) % 7.2 - 3.6) < 0.45) c = mixC(c, col('#d8c68a'), 0.7); if (LOD >= 3 && speck(0.1, 92) > 0.9) c = mul(c, 0.92); }
        else if (kind === 'plough'){ c = mul(col('#8f6e4e'), 0.92 + 0.12*wv); if (LOD >= 2 && row(0.45, 0.4)) c = mul(c, LOD >= 3 ? 0.84 : 0.92); if (LOD >= 3 && speck(0.1, 93) > 0.9) c = mul(c, 1.12); }
        else { c = mul(col('#94744f'), 0.95 + 0.08*wv); if (LOD >= 2 && row(0.75, LOD >= 3 ? 0.35 : 0.5)) c = mixC(c, col('#6f9a48'), LOD >= 3 ? 0.85 : 0.5); }
        c = mul(c, 0.96 + 0.06*n1); } }
    // light: the slope's light and hollows (1 m grid), the slope's shadow, the shadows and feet of things (25 cm grid)
    const i = clamp(Math.floor(x), 0, nx - 1), j = clamp(Math.floor(y), 0, ny - 1), u = x - i, v = y - j, o = j*(nx + 1) + i, L = (q) => lightG[q];
    let f = L(o)*(1 - u)*(1 - v) + L(o + 1)*u*(1 - v) + L(o + nx + 1)*(1 - u)*v + L(o + nx + 2)*u*v; const step = LOD >= 3 ? 0.035 : 0.05; f = Math.round(f/step)*step;
    let shade = shadeG[(v < 0.5 ? j : j + 1)*(nx + 1) + (u < 0.5 ? i : i + 1)] === 1; const oi = clamp(Math.round(x*OG), 0, onx), oj = clamp(Math.round(y*OG), 0, ony), oo = oj*(onx + 1) + oi;
    if (objDark[oo]) shade = true; if (objShade[oo] < 255 && !PROBE(x, y, -0.4)) f *= 1 - 0.3*Math.exp(-(objShade[oo]/100)/0.6);
    if (shade) f *= 0.74; const warm = clamp((f - 0.9)*3, 0, 1), cool = shade ? 1 : clamp((0.82 - f)*3, 0, 1);
    let R = c[0]*f*(1 + 0.05*warm - 0.05*cool), G = c[1]*f*(1 + 0.01*warm - 0.01*cool), B = c[2]*f*(1 - 0.07*warm + 0.09*cool); const lum = (R + G + B)/3; R = lum + (R - lum)*1.18; G = lum + (G - lum)*1.18; B = lum + (B - lum)*1.18;
    const h = hb(x, y), hz = clamp((560 - (x + y))/560, 0, 1)*0.16 + clamp(h/60, 0, 1)*0.05;
    return [clamp(R + (208 - R)*hz, 0, 255) | 0, clamp(G + (220 - G)*hz, 0, 255) | 0, clamp(B + (228 - B)*hz, 0, 255) | 0]; };
  // ---- the road graph: every road and track, joined where they meet. Vehicles drive along its edges.
  const graph = {nodes:[], edges:[]};
  const rebuildGraph = () => { graph.nodes = []; graph.edges = []; const lines = [...allRoads(), ...TRACKS], cuts = new Map(lines.map(pl => [pl, [0, pl.len]]));
    const nodeAt = (x, y) => { for (const n of graph.nodes) if (Math.hypot(n.x - x, n.y - y) < 3.2) return n; const n = {id:graph.nodes.length, x, y, e:[]}; graph.nodes.push(n); return n; };
    for (const pl of lines) for (const end of [pl[0], pl[pl.length - 1]]) for (const o of lines){ if (o === pl) continue; const q = nearP(o, end[0], end[1], 3); if (q && q[0] < 3) cuts.get(o).push(q[3]); }
    // roads that cross each other join where they cross
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++){ const P = lines[a], Q2 = lines[b]; if (P.box[2] < Q2.box[0] || Q2.box[2] < P.box[0] || P.box[3] < Q2.box[1] || Q2.box[3] < P.box[1]) continue;
      for (let i = 0; i < P.length - 1; i++){ const [ax, ay] = P[i], [bx2, by2] = P[i + 1]; for (let j = 0; j < Q2.length - 1; j++){ const [cx, cy] = Q2[j], [dx, dy] = Q2[j + 1], rx = bx2 - ax, ry = by2 - ay, sx = dx - cx, sy = dy - cy, den = rx*sy - ry*sx; if (Math.abs(den) < 1e-9) continue;
        const t = ((cx - ax)*sy - (cy - ay)*sx)/den, u = ((cx - ax)*ry - (cy - ay)*rx)/den; if (t < 0 || t > 1 || u < 0 || u > 1) continue; cuts.get(P).push(P.cum[i] + t*Math.hypot(rx, ry)); cuts.get(Q2).push(Q2.cum[j] + u*Math.hypot(sx, sy)); } } }
    for (const pl of lines){ const cs = [...new Set(cuts.get(pl).map(v => Math.round(v*10)/10))].sort((a, b) => a - b); for (let i = 0; i < cs.length - 1; i++){ if (cs[i + 1] - cs[i] < 0.5) continue; const A = atRoad(pl, cs[i]), B = atRoad(pl, cs[i + 1]), na = nodeAt(A[0], A[1]), nb = nodeAt(B[0], B[1]);
      const e = {id:graph.edges.length, a:na.id, b:nb.id, pl, s0:cs[i], s1:cs[i + 1], len:cs[i + 1] - cs[i], kind:pl.kind}; graph.edges.push(e); na.e.push(e.id); nb.e.push(e.id); } } };
  rebuildGraph();
  // the nearest point on any road or track: edge, distance along its line
  const nearestRoad = (x, y, tracksToo) => { let best = null; for (const e of graph.edges){ if (!tracksToo && e.kind === 'track') continue; const pl = e.pl; for (let i = 0; i < pl.length - 1; i++){ if (pl.cum[i + 1] < e.s0 || pl.cum[i] > e.s1) continue; const q = segNear(pl, i, x, y); if (q[3] < e.s0 - 1e-6 || q[3] > e.s1 + 1e-6) continue; if (!best || q[0] < best.d) best = {d:q[0], x:q[1], y:q[2], e, s:q[3]}; } } return best; };
  // a route from one road point to another: a polyline in metres (Dijkstra; the valley is small)
  const route = (from, to, tracksToo) => { const A = nearestRoad(from[0], from[1], tracksToo), B = nearestRoad(to[0], to[1], tracksToo); if (!A || !B) return null;
    const pts = (e, s0, s1) => { const out = [], dir = s1 >= s0 ? 1 : -1, pl = e.pl; out.push(atRoad(pl, s0).slice(0, 2)); if (dir > 0){ for (let i = 0; i < pl.length; i++) if (pl.cum[i] > s0 && pl.cum[i] < s1) out.push(pl[i].slice(0, 2)); } else { for (let i = pl.length - 1; i >= 0; i--) if (pl.cum[i] < s0 && pl.cum[i] > s1) out.push(pl[i].slice(0, 2)); } out.push(atRoad(pl, s1).slice(0, 2)); return out; };
    if (A.e === B.e) return pts(A.e, A.s, B.s);
    const dist = new Map(), prev = new Map(), Q = [], na = graph.nodes[A.e.a], nb = graph.nodes[A.e.b], push = (n, d, p) => { if (d < (dist.get(n) ?? 1e18)){ dist.set(n, d); prev.set(n, p); Q.push([d, n]); } };
    push(A.e.a, A.s - A.e.s0, null); push(A.e.b, A.e.s1 - A.s, null);
    while (Q.length){ Q.sort((p, q) => p[0] - q[0]); const [d, n] = Q.shift(); if (d > (dist.get(n) ?? 1e18)) continue; for (const ei of graph.nodes[n].e){ const e = graph.edges[ei]; if (!tracksToo && e.kind === 'track' && e !== B.e) continue; const m = e.a === n ? e.b : e.a; push(m, d + e.len, ei); } }
    const ends = [[B.e.a, B.s - B.e.s0], [B.e.b, B.e.s1 - B.s]].filter(([n]) => dist.has(n)).map(([n, add]) => [n, dist.get(n) + add]).sort((p, q) => p[1] - q[1]); if (!ends.length) return null;
    const chain = []; let n = ends[0][0]; while (prev.get(n) !== null && prev.get(n) !== undefined){ const ei = prev.get(n), e = graph.edges[ei]; chain.unshift([e, n]); n = e.a === n ? e.b : e.a; }
    let out = n === A.e.a ? pts(A.e, A.s, A.e.s0) : pts(A.e, A.s, A.e.s1); for (const [e, to2] of chain){ const seg = to2 === e.b ? pts(e, e.s0, e.s1) : pts(e, e.s1, e.s0); out = out.concat(seg.slice(1)); }
    const last = ends[0][0] === B.e.a ? pts(B.e, B.e.s0, B.s) : pts(B.e, B.e.s1, B.s); out = out.concat(last.slice(1)); return out; };
  // ---- changes made by the Company: a pad is levelled and cleared, a road is cut; trees there are gone. Returns the area that changed.
  const listeners = []; const changed = (x0, y0, x1, y1) => { for (const f of listeners) f(x0, y0, x1, y1); };
  const dropTrees = test => { const gone = []; for (let i = trees.length - 1; i >= 0; i--){ const t = trees[i]; if (test(t.x, t.y)){ gone.push(t); trees.splice(i, 1); const k = Math.floor(t.x/16)*1000 + Math.floor(t.y/16), v = TB.get(k); if (v) v.splice(v.indexOf(t), 1); } } return gone; };
  const dropProps = test => { for (let i = props.length - 1; i >= 0; i--) if (!props[i].bridge && test(props[i].x, props[i].y)) props.splice(i, 1); };
  const refresh = (x0, y0, x1, y1) => { x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(D, y1); relevel(x0, y0, x1, y1); reblur(x0, y0, x1, y1); relight(x0 - 40, y0 - 40, x1 + 4, y1 + 4); for (const t of trees) if (t.x > x0 - 4 && t.x < x1 + 4 && t.y > y0 - 4 && t.y < y1 + 4) t.z = hb(t.x, t.y) - 0.15; for (const p of props) if (!p.bridge && p.x > x0 - 4 && p.x < x1 + 4 && p.y > y0 - 4 && p.y < y1 + 4) p.z = hb(p.x, p.y); reshade(x0 - 25, y0 - 25, x1 + 4, y1 + 4); changed(x0 - 25, y0 - 25, x1 + 4, y1 + 4); };
  const addSite = (cx, cy, w, d, a, extra) => { const s = Object.assign({cx, cy, w, d, a:a || 0, z:base0(cx, cy)}, extra || {}); SITES.push(s); const R = (w + d)/2 + 6; dropTrees((x, y) => inSiteBox(s, x, y, 4)); dropProps((x, y) => inSiteBox(s, x, y, 1)); rebin(); refresh(cx - R, cy - R, cx + R, cy + R); return s; };
  const removeSite = s => { const i = SITES.indexOf(s); if (i < 0) return; SITES.splice(i, 1); const R = (s.w + s.d)/2 + 6; refresh(s.cx - R, s.cy - R, s.cx + R, s.cy + R); };
  const addRoad = (pts, w) => { const pl = finish(pts.map(p => p.slice(0, 2)), w || 2.6, 'new'); NEWROADS.push(pl); dropTrees((x, y) => near(pl, x, y, 6) < pl.w + 4.5); dropProps((x, y) => near(pl, x, y, 3) < pl.w + 1); rebin(); rebuildGraph(); const [a, b, c, d] = pl.box; refresh(a - 8, b - 8, c + 8, d + 8); return pl; };
  // can something of this size stand here (a pad, a building)? why not, in a few words
  const canBuild = (cx, cy, w, d, a, opt) => { opt = opt || {}; if (cx - w/2 < 6 || cy - d/2 < 6 || cx + w/2 > W - 6 || cy + d/2 > D - 6) return 'Too close to the edge of the valley.';
    const ca = Math.cos(a || 0), sa = Math.sin(a || 0), pts = []; for (let u = -0.5; u <= 0.5; u += 0.125) for (let v = -0.5; v <= 0.5; v += 0.125) pts.push([cx + u*w*ca - v*d*sa, cy + u*w*sa + v*d*ca]);
    for (const [x, y] of pts){ if (PROBE(x, y, 1)) return 'A building stands there.'; if (Math.abs(streamV(x, y)) < hw(x) + 2 || near(SIDE, x, y, 3) < 2.5) return 'Not in the stream.'; if (near(RAIL, x, y, 4) < RAIL.w + 1.5) return 'Not on the railway.';
      if (!opt.roadOk && allRoads().some(pl => near(pl, x, y, pl.w + 1) < pl.w + 0.5)) return 'Not on the road.'; if (inSite(x, y, 2) && !opt.siteOk) return 'Something of the Company stands there.'; }
    const z0 = base0(cx, cy); let worst = 0; for (const [x, y] of pts) worst = Math.max(worst, Math.abs(base0(x, y) - z0)); if (worst > 6) return 'Too steep: the ground drops ' + Math.round(worst) + ' m across.';
    return {cut:worst, area:w*d}; };
  return {seed:SEED, W, D, get zmin(){ return zmin; }, get zmax(){ return zmax; }, hb, base0, slope, kindAt, colourAt, forestAt, inTown, inSettle, nearP, near, atRoad, curve, finish, yOn, view16, viewFacing,
    roads:ROADS, newRoads:NEWROADS, tracks:TRACKS, rail:RAIL, side:SIDE, hedges:HEDGES, stream:{ys, hw, streamV}, town:TOWN, villages:VILLAGES, square:SQUARE, sites:SITES, inSite, inSiteBox,
    buildings:placed, probe:PROBE, trees, treesNear:(x, y) => TB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || [], props, bridges, life, graph, route, nearestRoad, roadNear,
    addSite, removeSite, addRoad, canBuild, refresh, onChange:f => listeners.push(f), touch:changed, model, missing:MISSING, overlaps:OVERLAPS, tx:TX, svx:SVX, hx:HX, rid:RID, axis}; }
globalThis.World = {create, view16, viewFacing};
})();
