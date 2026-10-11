/* The game map, 640 × 480 m: a forested ridge at the back, the main valley with its stream, a side valley, a wooded hill in
   front. One town in the valley, three villages (on the slope, in the side valley, at the far end), farms, and a lot of open
   land in between. Built like the test corner: the ground is worked out for every pixel, the trees are the locked ones.
   ?s= resolution (px per metre), ?z= pixel enlargement, ?d= detail (default from the screen scale s·z: <8 far, <20 middle,
   ≥20 close), ?win=x0,y0,x1,y1 draws one part, ?works=1 adds a test drill site, a site in the forest and their new roads. */
const Q = new URLSearchParams(location.search), S = Math.min(7, +(Q.get('s') || 2.5)), Z = +(Q.get('z') || 1), SCR = S*Z, LOD = +(Q.get('d') || (SCR >= 20 ? 3 : SCR >= 8 ? 2 : 1)), WORKS = Q.get('works') === '1';
const W = 640, D = 480;
const SCENE = ART.compose(W, D, (H, K) => {
  // every game is a new valley: everything random comes from one seed (?seed= repeats a valley)
  const SEED = +(Q.get('seed') || Math.floor(Math.random()*1e6)), SO = (SEED % 9973)*0.731;
  const r = K.rng(SEED), hsh = (a, b, c) => K.hsh(a, b, c + SO), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = t => t*t*(3 - 2*t), lerp = (a, b, t) => a + (b - a)*t, rr = (a, b) => a + r()*(b - a);
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = hsh(xi, yi, s), b = hsh(xi + 1, yi, s), c = hsh(xi, yi + 1, s), d = hsh(xi + 1, yi + 1, s);
    return a + (b - a)*fx + (c - a)*fy + (a - b - c + d)*fx*fy; };
  const fbm = (x, y, s) => vn(x, y, s)*0.5 + vn(x*2.03 + 5.1, y*2.03, s + 1)*0.3 + vn(x*4.1, y*4.1 + 2.7, s + 2)*0.2;
  // ---- paths: smooth curves, with a bounding box; nearest point on them (distance, point, distance along, side)
  const curve = (pts, w) => { const out = []; for (let i = 0; i < pts.length - 1; i++){ const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])/2);
      for (let k = 0; k < n; k++){ const t = k/n, t2 = t*t, t3 = t2*t, f = (a, b, c, d) => 0.5*(2*b + (-a + c)*t + (2*a - 5*b + 4*c - d)*t2 + (-a + 3*b - 3*c + d)*t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
    out.push(pts[pts.length - 1]); out.cum = [0]; for (let i = 1; i < out.length; i++) out.cum.push(out.cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1])); const xs = out.map(p => p[0]), ys = out.map(p => p[1]); out.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; out.w = w || 2.7; return out; };
  const nearP = (pl, x, y, lim) => { const [a, b, c, d] = pl.box; if (x < a - lim || x > c + lim || y < b - lim || y > d + lim) return null; let best = 1e9, bx = 0, by = 0, bs = 0, bside = 1;
    for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [qx, qy] = pl[i + 1], vx = qx - ax, vy = qy - ay, t = clamp(((x - ax)*vx + (y - ay)*vy)/(vx*vx + vy*vy || 1), 0, 1), px = ax + vx*t, py = ay + vy*t, d2 = Math.hypot(x - px, y - py); if (d2 < best){ best = d2; bx = px; by = py; bs = pl.cum[i] + t*Math.hypot(vx, vy); bside = vx*(y - ay) - vy*(x - ax) > 0 ? 1 : -1; } }
    return [best, bx, by, bs, bside]; };
  const near = (pl, x, y, lim) => { const q = nearP(pl, x, y, lim); return q ? q[0] : 1e9; };
  const yOn = (pl, x) => { for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1]; if ((x - ax)*(x - bx) <= 0 && ax !== bx) return ay + (by - ay)*(x - ax)/(bx - ax); } return pl[0][1]; };
  // ---- the shape of the valley: a forested ridge at the back, the main valley and its stream, a side valley, a hill in front
  const PH = Array.from({length:8}, () => r()*6.283), AX = rr(235, 268), TILT = rr(-0.045, 0.045), axis = x => AX + TILT*(x - 320), RID = x => 120 + 12*Math.sin(x/90 + PH[4]);
  const ys = x => axis(x) + 34 + 10*Math.sin(x/45 + PH[0]) + 4*Math.sin(x/13 + PH[1]), dys = x => TILT + 10/45*Math.cos(x/45 + PH[0]) + 4/13*Math.cos(x/13 + PH[1]);
  const ys2 = x => -10/2025*Math.sin(x/45 + PH[0]) - 4/169*Math.sin(x/13 + PH[1]), hw = x => 2.4 + 0.6*Math.sin(x/23 + PH[2]), streamV = (x, y) => (y - ys(x))/Math.sqrt(1 + dys(x)**2);
  const SVX = r() < 0.5 ? rr(70, 150) : rr(490, 570), sv = y => SVX + 14*Math.sin(y/37 + PH[3]);
  const SIDE = curve([[sv(-2), -2], ...[60, 120, 180].map(y => [sv(y), y]), [sv(axis(SVX) - 30), axis(SVX) - 30], [SVX + 8, ys(SVX + 8)]], 1.3);
  const HX = rr(90, 550), PX = HX < 320 ? 430 : 210;
  const base0 = (x, y) => 30*sm(clamp((RID(x) - y)/120, 0, 1)) + 16*Math.exp(-((x - HX)**2/95**2 + (y - 455)**2/70**2)) + 9*sm(clamp((y - 330)/130, 0, 1))*sm(clamp((HX < 320 ? x - PX : PX - x)/160 + 0.5, 0, 1))
    - 16*Math.exp(-((x - sv(y))**2)/34**2)*sm(clamp((axis(SVX) - 10 - y)/120, 0, 1)) + 8*(fbm(x/60, y/60, 3) - 0.5) + 2.5*(fbm(x/16, y/16, 4) - 0.5);
  const slope = (x, y) => Math.hypot(base0(x + 1, y) - base0(x - 1, y), base0(x, y + 1) - base0(x, y - 1))/2;
  // ---- the valley road, the railway along the foot of the slope
  const MAIN = curve(Array.from({length:9}, (_, i) => { const x = i === 0 ? -2 : i === 8 ? 642 : i*80 + rr(-10, 10); return [x, axis(x) - 8 + 6*Math.sin(x/70 + PH[5]) + rr(-3, 3)]; }), 2.8);
  const RAIL = curve(Array.from({length:7}, (_, i) => { const x = i === 0 ? -2 : i === 6 ? 642 : i*107; return [x, axis(x) - 46 + 5*Math.sin(x/110 + PH[6])]; }), 1.6);
  // ---- where the settlements are: one town on the valley road, a village on the slope, one in the side valley, one across the stream
  const far = (p, list, d) => list.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > d);
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
  const NORTH = curve([[NX, TYR], [NX + rr(-3, 3), TYR - 24], [NX + rr(-6, 6), TYR - 48], [NX + rr(-12, 12), TYR - 64]], 2.3);
  const PAR = curve([[TX - 58, TYR - 31 + rr(-3, 3)], [TX - 20, TYR - 32], [NX, TYR - 32], [TX + 30, TYR - 31], [TX + 54, TYR - 28 + rr(-3, 3)]], 2.2);
  const WEST = curve([[TX - 70, yOn(MAIN, TX - 70)], [TX - 64, TYR - 22], [TX - 58, PAR[0][1]]], 2.2);
  const SX = TX + rr(16, 30), SOUTH = curve([[SX, yOn(MAIN, SX)], [SX + rr(-4, 4), yOn(MAIN, SX) + 14], [SX + rr(-6, 6), ys(SX) - 9]], 2.2);
  const zig = (x0, y0, x1, y1, amp) => { const n = Math.max(2, Math.ceil(Math.abs(y1 - y0)/28)), pts = [[x0, y0]]; for (let k = 1; k < n; k++) pts.push([lerp(x0, x1, k/n) + (k % 2 ? amp : -amp), lerp(y0, y1, k/n)]); pts.push([x1, y1]); return pts; };
  const xa = clamp(VA[0] + rr(-30, 30), 10, 630), ROAD_A = curve([...zig(xa, yOn(MAIN, xa), VA[0], VA[1], 20), [VA[0] + rr(-25, 25), VA[1] - 24]], 2.1);
  const xb = sv(axis(SVX)) + 16, ROAD_B = curve([[xb, yOn(MAIN, xb)], ...[0.25, 0.5, 0.75].map(t => { const y = lerp(yOn(MAIN, xb), VB[1], t); return [sv(y) + 16, y]; }), [VB[0], VB[1]], [sv(VB[1] - 26) + 16, VB[1] - 26]], 2.1);
  const xc = clamp(VC[0] + rr(-40, 40), 10, 630), ROAD_C = curve([[xc, yOn(MAIN, xc)], [lerp(xc, VC[0], 0.3), ys(lerp(xc, VC[0], 0.3)) - 10], [lerp(xc, VC[0], 0.4), ys(lerp(xc, VC[0], 0.4)) + 12], [VC[0], VC[1]], [VC[0] + rr(-20, 20), VC[1] + 24]], 2.2);
  const LANES = VILLAGES.map(([vx, vy]) => { const dir = r() < 0.5 ? 1 : -1; return curve([[vx, vy], [vx + dir*14, vy + rr(-6, 6)], [vx + dir*30, vy + rr(-10, 10)]], 1.9); });
  const ROADS = [MAIN, NORTH, PAR, WEST, SOUTH, ROAD_A, ROAD_B, ROAD_C, ...LANES];
  // works: a test drill site in a field, one in the forest, and the new roads to them (they cut through whatever is there)
  const SITES = [], NEWROADS = [];
  if (WORKS){ for (let i = 0; i < 300 && SITES.length < 1; i++){ const x = rr(40, 560), y = rr(axis(x) - 40, axis(x) + 20); if (Math.abs(x - TX) > 110 && far([x, y], VILLAGES, 80) && Math.abs(streamV(x, y)) > 20){ SITES.push([x, y - 30, x + 40, y]); NEWROADS.push(curve([[x + 20, yOn(MAIN, x + 20)], [x + 20, y]], 2.6)); } }
    for (let i = 0; i < 300 && SITES.length < 2; i++){ const x = rr(40, 560), y = RID(x) - rr(70, 90); if (y > 8 && Math.abs(x - SVX) > 70 && far([x, y], VILLAGES, 90)){ SITES.push([x, y, x + 34, y + 24]); const x2 = x + 17, y2 = axis(x2) - 8; NEWROADS.push(curve([[x2 + 30, yOn(MAIN, x2 + 30)], [x2 + 20, lerp(y2, y, 0.4)], [x2 + 8, lerp(y2, y, 0.75)], [x2, y + 24]], 2.6)); } } }
  const ALLROADS = [...ROADS, ...NEWROADS], LEVELLED = [...ALLROADS, RAIL];
  // ---- settlements
  const inSettle = (x, y, m) => Math.hypot((x - TOWN[0])/(TOWN[2] + m), (y - TOWN[1])/(TOWN[3] + m)) < 1 || VILLAGES.some(([cx, cy, rad]) => Math.hypot(x - cx, y - cy) < rad + m);
  const inTown = (x, y) => Math.hypot((x - TOWN[0])/(TOWN[2] - 6), (y - TOWN[1])/(TOWN[3] - 6)) < 1;
  const inSite = (x, y, m) => SITES.some(([a, b, c, e]) => x > a - m && x < c + m && y > b - m && y < e + m);
  const rock = (x, y) => (y < RID(x) + 55 || (Math.abs(x - SVX) < 70 && y < axis(SVX))) && !inSettle(x, y, 10) && !inSite(x, y, 4) ? clamp((fbm(x/8, y/8, 9) - 0.6)*5, 0, 1)*clamp((slope(x, y) - 0.3)*4, 0, 1) : 0;
  // levelled ground: building plots, sites; roads and the railway are cut into the slope (flat across, smooth along); culverts where they cross the side stream
  const flats = [], FB = new Map(); const level = (x0, y0, x1, y1, m) => { const z = base0((x0 + x1)/2, (y0 + y1)/2), f = [x0, y0, x1, y1, z, m || 4]; flats.push(f);
    for (let i = Math.floor((x0 - 8)/16); i <= Math.floor((x1 + 8)/16); i++) for (let j = Math.floor((y0 - 8)/16); j <= Math.floor((y1 + 8)/16); j++){ const k = i*1000 + j; if (!FB.has(k)) FB.set(k, []); FB.get(k).push(f); } return z; };
  for (const s of SITES) level(...s, 5);
  const roadLevel = (x, y, h) => { for (const pl of LEVELLED){ const q = nearP(pl, x, y, pl.w + 4); if (!q || q[0] > pl.w + 4) continue; const zc = base0(q[1], q[2]), t = q[0] < pl.w + 0.6 ? 0 : sm((q[0] - pl.w - 0.6)/3.4); h = zc + (h - zc)*t; } return h; };
  const onLevelled = (x, y, m) => LEVELLED.some(pl => near(pl, x, y, pl.w + m) < pl.w + m);
  const ground = (x, y) => { let h = roadLevel(x, y, base0(x, y)); for (const [x0, y0, x1, y1, z, m] of FB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || []){ const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)); if (d < m){ const t = sm(d/m); h = z + (h - z)*t; } }
    const v = Math.abs(streamV(x, y)), w = hw(x); if (v < w + 3) h -= 1.3*(v < w ? 1 : 1 - sm((v - w)/3)); const ds = near(SIDE, x, y, 4); if (ds < 3.5 && !onLevelled(x, y, 1.2)) h -= 0.9*(ds < 1.3 ? 1 : 1 - sm((ds - 1.3)/2.2));
    const rk = rock(x, y); if (rk) h += rk*1.1*fbm(x/1.8, y/1.8, 12); return h; };
  // ---- buildings. Rule 1: every type of house is on the map. Rule 2: each stands where its function puts it (public buildings in the
  // town, a mairie, chapel and shop in every village, ordinary houses in the town and villages, farms, the villa and the substation freestanding)
  const placed = [], items = [], casters = [], yards = [], PB = new Map(), TRACKS = [];
  const roadNear = (x, y, m) => ALLROADS.some(pl => near(pl, x, y, pl.w + m) < pl.w + m) || near(RAIL, x, y, RAIL.w + m) < RAIL.w + m;
  const fits = (x, y, w, d, name) => { if (x < 4 || y < 4 || x + w > W - 4 || y + d > D - 4) return false; for (const [a, b, c, e] of placed) if (!(x + w + 2 < a || x - 2 > c || y + d + 2 < b || y - 2 > e)) return false;
    for (let u = 0; u <= 1; u += 0.25) for (let v = 0; v <= 1; v += 0.25){ const px = x + w*u, py = y + d*v; if (ALLROADS.some(pl => near(pl, px, py, pl.w + 1) < pl.w + 0.8) || near(RAIL, px, py, 4) < RAIL.w + (name === 'Railway station' ? 0.3 : 2.5)
      || Math.abs(streamV(px, py)) < hw(px) + 4 || near(SIDE, px, py, 4) < 4 || inSite(px, py, 3) || TRACKS.some(pl => near(pl, px, py, 2) < pl.w + 0.5)) return false; } return slope(x + w/2, y + d/2) < 0.45; };
  const building = (name, x, y, recol) => { const m = K.M.find(q => q.n === name); if (!m || !fits(x, y, m.W, m.D, name)) return false; const p = [x, y, x + m.W, y + m.D, name]; placed.push(p);
    for (let i = Math.floor((x - 6)/16); i <= Math.floor((x + m.W + 6)/16); i++) for (let j = Math.floor((y - 6)/16); j <= Math.floor((y + m.D + 6)/16); j++){ const k = i*1000 + j; if (!PB.has(k)) PB.set(k, []); PB.get(k).push(p); }
    const z = level(x - 1, y - 1, x + m.W + 1, y + m.D + 1); items.push(() => K.place(H, name, x, y, z, recol, true)); const zt = Math.max(...m.parts.filter(q => q.t === 'blk').map(q => q.z + Math.max(...q.h)), 3); casters.push([x + 0.6, y + 0.6, x + m.W - 0.6, y + m.D - 0.6, zt*0.8]);
    if (name.startsWith('Farm')) yards.push([x - 3, y + m.D - 1, x + m.W + 2, y + m.D + 7]); return true; };
  const PROBE = (x, y, m) => (PB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || []).find(p => x > p[0] - m && x < p[2] + m && y > p[1] - m && y < p[3] + m);
  const forestRaw = (x, y) => (y < RID(x) - 54 + 30*fbm(x/50, y/50, 21) && !(Math.abs(x - sv(y)) < 34 + 10*fbm(y/30, 1, 27) && y > 18))
    || Math.hypot((x - HX)/(90 + 25*fbm(x/30, y/30, 28)), (y - 470)/60) < 1 || (fbm(x/48, y/48, 26) > 0.72 && y > RID(x) - 30);
  const nearBy = (name, x, y, recol, reach) => { const m = K.M.find(q => q.n === name); for (let rad = 0; rad < (reach || 24); rad += 1.5) for (let a = 0; a < 16; a++) if (building(name, x + Math.cos(a*0.3927)*rad - m.W/2, y + Math.sin(a*0.3927)*rad - m.D/2, recol)) return true; return false; };
  const HOUSES = ['House, two storeys', 'House, small', ...K.VARS.house], house = () => HOUSES[Math.floor(r()*HOUSES.length)], FARMS = ['Farm', ...K.VARS.farm];
  const ROOFS = [null, {'#a8473a':'#b8553e'}, {'#a8473a':'#8e3f32'}, {'#a8473a':'#9a5a3a'}, {'#a8473a':'#c0624a'}], roof = () => ROOFS[Math.floor(r()*ROOFS.length)];
  const FUNC = ['Church', 'Mairie', 'Fountain', 'Village shop', 'Bank', 'Bourse du Jura', 'La Feuille de la Faille', 'Gendarmerie', 'Canton house', 'School', 'Chapel', 'Committee office', 'Utility office', 'Railway station', 'Substation (utility)'];
  // the town: the square with the fountain, the mairie and church on it, the institutions around, the station on the railway, the substation outside
  nearBy('Fountain', SQ[0] + 9, SQ[1]); nearBy('Railway station', NX + rr(14, 24), yOn(RAIL, NX + 20) - RAIL.w - 8.6, null, 30);
  for (const [name, dx, dy] of [['Mairie', 14, -10], ['Church', -22, -8], ['Village shop', 16, 8], ['Bank', -24, 10], ['La Feuille de la Faille', 40, -6], ['Gendarmerie', 38, 22], ['Canton house', -48, -8],
    ['Bourse du Jura', -50, 18], ['School', -12, 30], ['Committee office', 60, 10], ['Utility office', 58, -22]]) nearBy(name, SQ[0] + dx, SQ[1] + dy, null, 30);
  for (const dx of [96, -96, 110, -110]){ const x = TX + dx; if (nearBy('Substation (utility)', x, yOn(MAIN, x) + 14, null, 14) || nearBy('Substation (utility)', x, yOn(MAIN, x) - 16, null, 14)) break; }
  // houses line the streets, a second row behind, thinning out at the edge
  const frontage = (cx, cy, rx, ry, prob, rows, nmax, pick) => { let k = 0; for (const pl of ROADS) for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax)/L, uy = (by - ay)/L;
      for (let s = 0; s < L; s += 1.2) for (const side of [-1, 1]) for (let row = 0; row < rows; row++){ if (k >= nmax) return k; const name = pick ? pick() : house(), m = K.M.find(q => q.n === name), off = pl.w + 3.2 + (row ? 13 : 0) + Math.max(m.W, m.D)/2;
        const px = ax + ux*s - uy*side*off, py = ay + uy*s + ux*side*off, d = Math.hypot((px - cx)/rx, (py - cy)/ry); if (d > 1 || r() > prob*(1.25 - d)) continue;
        if (building(name, px - m.W/2, py - m.D/2, roof())) k++; } } return k; };
  frontage(TOWN[0], TOWN[1], TOWN[2], TOWN[3], 1.4, 2, 90);
  // each village: mairie, chapel and shop near the middle, houses along the lanes; the largest village also has a school
  VILLAGES.forEach(([cx, cy, rad], i) => { for (const [name, dx, dy] of [['Mairie', 8, -10], ['Chapel', -10, -12], ['Village shop', 12, 10], ...(i === 0 ? [['School', -14, 12]] : [])]) nearBy(name, cx + dx, cy + dy, null, 34) || nearBy(name, cx, cy, null, 60);
    frontage(cx, cy, rad, rad, 0.8, 2, [12, 10, 11][i]); });
  for (const name of FUNC) if (!placed.some(p => p[4] === name)) nearBy(name, SQ[0], SQ[1], null, 80);
  // rule 1: any type of house still missing goes into a village or the town
  for (const name of HOUSES) if (!placed.some(p => p[4] === name)) for (const [cx, cy, rad] of [...VILLAGES, [TOWN[0], TOWN[1], 60]]){ if (frontage(cx, cy, rad + 8, rad + 8, 3, 2, 1, () => name)) break; }
  // farms stand in the open, each with a track to the nearest road; every type of farm at least once
  const trackTo = (x, y) => { let best = null; for (const pl of ROADS){ const q = nearP(pl, x, y, 400); if (q && (!best || q[0] < best[0])) best = q; } if (!best) return null; const mx = lerp(x, best[1], 0.5) + rr(-8, 8), my = lerp(y, best[2], 0.5) + rr(-8, 8);
    const pl = curve([[x, y], [mx, my], [best[1], best[2]]], 1.45); for (let t = 0; t < pl.length; t += 2) if (PROBE(pl[t][0], pl[t][1], 1.5) && Math.hypot(pl[t][0] - x, pl[t][1] - y) > 3) return null; return pl; };
  const farmOrder = [...FARMS, ...Array.from({length:6}, () => FARMS[Math.floor(r()*FARMS.length)])], farmsAt = [];
  for (const name of farmOrder){ const m = K.M.find(q => q.n === name); for (let t = 0; t < 600; t++){ const x = rr(20, W - 20 - m.W), y = rr(RID(x) - 20, D - 30 - m.D), c = [x + m.W/2, y + m.D/2];
      if (inSettle(c[0], c[1], 40) || !far(c, farmsAt, 80) || slope(c[0], c[1]) > 0.3 || forestRaw(c[0], c[1]) || Math.abs(streamV(c[0], c[1])) < 16) continue;
      if (!building(name, x, y, roof())) continue; const tr = trackTo(c[0], y + m.D + 7); if (tr){ TRACKS.push(tr); farmsAt.push(c); break; } const p = placed.pop(); PB.forEach(v => { const k = v.indexOf(p); if (k >= 0) v.splice(k, 1); }); items.pop(); casters.pop(); yards.pop(); flats.pop(); } }
  // the lender's villa: alone on the slope above the valley, near the forest, with its own drive
  for (let t = 0; t < 800; t++){ const x = rr(30, 600), y = RID(x) - rr(-5, 25); if (Math.abs(x - TX) > 220 || !far([x, y], VILLAGES, 80) || slope(x, y) > 0.45 || inSettle(x, y, 30)) continue;
    if (building('Villa', x, y, null)){ const tr = trackTo(x + 9, y + 16); if (tr){ TRACKS.push(tr); break; } const p = placed.pop(); PB.forEach(v => { const k = v.indexOf(p); if (k >= 0) v.splice(k, 1); }); items.pop(); casters.pop(); flats.pop(); } }
  const inBox = (x, y, [a, b, c, e], m) => x > a - m && x < c + m && y > b - m && y < e + m;
  const SQUARE = (() => { const f = placed.find(p => p[4] === 'Fountain'); return f ? [(f[0] + f[2])/2, (f[1] + f[3])/2] : SQ; })();
  // what is missing (should be nothing) and any overlap (should be none): shown in the page title for the tests
  const REQUIRED = [...HOUSES, ...FARMS, 'Villa', ...FUNC], MISSING = REQUIRED.filter(n => !placed.some(p => p[4] === n));
  let OVERLAPS = 0; placed.forEach((p, i) => placed.forEach((q, j) => { if (j > i && !(p[2] <= q[0] || p[0] >= q[2] || p[3] <= q[1] || p[1] >= q[3])) OVERLAPS++; }));
  placed.forEach(p => { for (let u = 0.1; u < 1; u += 0.2) for (let v = 0.1; v < 1; v += 0.2){ const x = lerp(p[0], p[2], u), y = lerp(p[1], p[3], v); if (ALLROADS.some(pl => near(pl, x, y, pl.w) < pl.w) || near(RAIL, x, y, 2) < RAIL.w) { OVERLAPS++; return; } } });
  window.WORLD = {seed:SEED, missing:MISSING, overlaps:OVERLAPS, buildings:placed.length};
  // ---- forest, woods, hedges
  const cleared = (x, y) => inSite(x, y, 4) || NEWROADS.some(pl => near(pl, x, y, 6) < pl.w + 4.5);
  const forestM = (x, y) => forestRaw(x, y) && !inSettle(x, y, 14) && fbm(x/14, y/14, 23) < 0.74 && !roadNear(x, y, 2.5) && !TRACKS.some(pl => near(pl, x, y, 4) < 3.6) && Math.abs(streamV(x, y)) > hw(x) + 2.5 && !cleared(x, y) && !PROBE(x, y, 6);
  const HEDGES = []; for (let i = 0; i < 400 && HEDGES.length < 8; i++){ let x = rr(20, 620), y = rr(RID(x) - 10, 450), a = r()*6.283; const pts = [[x, y]]; for (let k = 0; k < 3; k++){ a += rr(-0.5, 0.5); x += Math.cos(a)*rr(35, 50); y += Math.sin(a)*rr(35, 50); pts.push([x, y]); }
    if (pts.every(([px, py]) => px > 0 && py > 0 && px < W && py < D && !inSettle(px, py, 20) && !forestRaw(px, py))) HEDGES.push(curve(pts)); }
  const hedgeM = (x, y) => HEDGES.some(pl => near(pl, x, y, 2.4) < 1.0 + 0.6*fbm(x/3, y/3, 24)) && fbm(x/9, y/9, 25) < 0.74 && !roadNear(x, y, 1) && !cleared(x, y) && !PROBE(x, y, 2);
  // ---- fields: blocks of strips along the slope
  const seeds = []; for (let i = 0; i < 3000 && seeds.length < 80; i++){ const x = r()*W, y = r()*D; if (seeds.every(s => Math.hypot(s.x - x, s.y - y) > 36)){ const gx = base0(x + 3, y) - base0(x - 3, y), gy = base0(x, y + 3) - base0(x, y - 3), g = Math.hypot(gx, gy);
      const a = g > 0.8 ? Math.atan2(gx, -gy) : (r() - 0.5)*1.4; seeds.push({x, y, a:a + (r() - 0.5)*0.25, w:10 + r()*10, id:seeds.length, past:r() < 0.18}); } }
  const CROPS = ['wheat', 'wheat', 'wheat', 'barley', 'meadow', 'meadow', 'meadow', 'mown', 'mown', 'plough', 'maize'];
  const plot = (x, y) => { let a = null, b = null, da = 1e9, db = 1e9; for (const s of seeds){ const d = Math.hypot(x - s.x, (y - s.y)*1.15); if (d < da){ db = da; b = a; da = d; a = s; } else if (d < db){ db = d; b = s; } }
    const ca = Math.cos(a.a), sa = Math.sin(a.a), u = (x - a.x)*ca + (y - a.y)*sa, v = -(x - a.x)*sa + (y - a.y)*ca, k = Math.floor(v/a.w), f = v/a.w - k;
    return {s:a, edge:(db - da)/2, u, v, k, f, crop:a.past ? 'pasture' : CROPS[Math.floor(hsh(a.id, k, 51)*CROPS.length)]}; };
  const pastureM = (x, y) => { const fe = RID(x) - 54 + 30*fbm(x/50, y/50, 21); return (y > fe && y < fe + 46 && fbm(x/70, 3, 29) > 0.42) || (Math.abs(x - sv(y)) < 44 && y < 230 && y > 20); };
  // ---- what lies at a point
  const kindAt = (x, y) => {
    if (inSite(x, y, 0)) return ['site', Math.min(x - SITES.find(s => inBox(x, y, s, 0))[0], 99)]; if (inSite(x, y, 1.4)) return ['earth', 0];
    for (const pl of NEWROADS){ const d = near(pl, x, y, 6); if (d < pl.w) return ['newroad', d]; if (d < pl.w + 1.3) return ['earth', 0]; if (d < pl.w + 4.5 && forestRaw(x, y)) return ['stumps', d]; }
    const qr = nearP(RAIL, x, y, 3), onRail = qr && qr[0] < RAIL.w, railLine = onRail && Math.abs(qr[0] - 0.72) < 0.07;
    for (const pl of ROADS){ const q = nearP(pl, x, y, pl.w + 2); if (!q) continue; const town = inTown(x, y); if (railLine && q[0] < pl.w + 1.7) return ['rail', qr[0], qr[3]]; if (q[0] < pl.w) return ['road', q[0], pl.w, q[3], q[4], pl, town, Math.hypot(q[1] - SQUARE[0], q[2] - SQUARE[1])];
      if (town && q[0] < pl.w + 1.7) return ['pavement', q[0] - pl.w, 0, q[3]]; }
    if (onRail) return ['rail', qr[0], qr[3]]; if (qr && qr[0] < RAIL.w + 0.8) return ['verge', 0];
    if (Math.hypot(x - SQUARE[0], y - SQUARE[1]) < 16 && !PROBE(x, y, 0)) return ['square', 0];
    const v = streamV(x, y), w = hw(x); if (Math.abs(v) < w) return ['water', Math.abs(v)/w]; if (Math.abs(v) < w + 1.4 && v*ys2(x) > 0 && Math.abs(v) < w + 1.4*(0.4 + 0.6*vn(x/5, 0, 52))) return ['gravel', 0]; if (Math.abs(v) < w + 2.6) return ['bank', Math.abs(v) - w];
    const ds = near(SIDE, x, y, 3); if (ds < 1.3) return ['water', ds/1.3]; if (ds < 2.6) return ['bank', ds - 1.3];
    for (const pl of TRACKS){ const d = near(pl, x, y, 2); if (d < pl.w) return ['track', d]; }
    for (const pl of ROADS){ const d = near(pl, x, y, 2); if (d < pl.w + 1.4) return ['verge', d - pl.w]; }
    const pb = PROBE(x, y, 0); if (pb) return FUNC.includes(pb[4]) ? ['square', 0] : pb[4].startsWith('Farm') ? ['yard', 0] : ['garden', 0, pb]; for (const yd of yards) if (inBox(x, y, yd, 0)) return ['yard', 0];
    const pg = PROBE(x, y, 4.5); if (pg && !FUNC.includes(pg[4]) && !pg[4].startsWith('Farm')) return ['garden', 0, pg];
    if (forestM(x, y)) return ['floor', 0]; if (rock(x, y) > 0.35) return ['rock', 0]; if (inSettle(x, y, 6)) return ['verge', 0]; if (pastureM(x, y)) return ['pasture', 0];
    const p = plot(x, y); if (p.edge < 1.0) return ['margin', p.edge]; if (p.crop !== 'pasture' && Math.min(p.f, 1 - p.f)*p.s.w < 0.35) return ['margin', 0.5]; return [p.crop, 0, p]; };
  // ---- shadows and contact shading from buildings and trees
  let CB = null; const bucket = () => { CB = new Map(); for (const q of casters){ const [a, b, c2, e, h] = q; for (let i = Math.floor((a - h - 2)/8); i <= Math.floor((c2 + 2)/8); i++) for (let j = Math.floor((b - h*1.9 - 2)/8); j <= Math.floor((e + 2)/8); j++){ const k = i*1000 + j; if (!CB.has(k)) CB.set(k, []); CB.get(k).push(q); } } };
  const objShade = (x, y) => { if (!CB) bucket(); let sh = false, d = 1e9; for (const [a, b, c2, e, h] of CB.get(Math.floor(x/8)*1000 + Math.floor(y/8)) || []){ d = Math.min(d, Math.hypot(Math.max(a - x, 0, x - c2), Math.max(b - y, 0, y - e)));
      if (!sh && !(x > c2 + 1 || y > e + 1 || x < a - h || y < b - h*1.9)) for (let t = 0.3; t <= h; t += 0.5){ const px = x + 0.345*t, py = y + 0.636*t; if (px > a && px < c2 && py > b && py < e){ sh = true; break; } } } return [sh, d]; };
  // ---- the colour of each kind of ground; more texture the closer we are
  const hex = c => c.match(/\w\w/g).map(v => parseInt(v, 16)), C = {};
  const col = c => C[c] || (C[c] = hex(c)), mul = (c, f) => [c[0]*f, c[1]*f, c[2]*f], mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const speck = (x, y, q, s) => { q = Math.max(q, 1/S); return hsh(Math.floor(x/q), Math.floor(y/q), s); }, per = q => Math.max(q, 3/S);
  const surface = (x, y, k) => { const [kind, a, b] = k, n1 = fbm(x/14, y/14, 61), n2 = fbm(x/3, y/3, 62);
    switch (kind){
      case 'road': { const [, d, w, sl, side, pl, town, dsq] = k; let c = mul(col('#6d7176'), 0.94 + 0.1*n2); if (LOD >= 2 && fbm(x/4, y/4, 63) > 0.72) c = mul(c, 0.92);
        if (LOD >= 2 && Math.abs(d - w*0.5) < 0.45) c = mul(c, 0.95);                                                                     // where the wheels run
        if (!town && d > w - 0.4) c = mixC(c, col('#a59b86'), clamp((d - w + 0.4)/0.4, 0, 1)*(0.5 + 0.5*speck(x, y, 0.2, 64)));          // crumbly edge in the country
        if (!town && pl === MAIN && LOD >= 2){ if (d > w - 0.5 && d < w - 0.32) c = col('#e4e2da'); if (d < 0.09 && ((sl % 9) + 9) % 9 < 3) c = col('#e4e2da'); }   // edge lines, dashed centre line
        if (town){ if (d > w - 0.22) c = mul(c, 0.86); if (LOD >= 2 && ((sl % 16) + 16) % 16 < 0.55 && d > w - 0.45) c = mul(col('#3a3d40'), 1 + 0.3*(((sl*8) % 1 + 1) % 1 < 0.5));
          if (LOD >= 2){ const mh = Math.hypot(((sl % 27) + 27) % 27 - 13, side*d - 0.9); if (mh < 0.36) c = mh > 0.27 ? col('#45484b') : mul(col('#5a5d60'), 1 + 0.12*(((x + y)*6 % 1 + 1) % 1 < 0.5)); }
          if (dsq > 16.5 && dsq < 19.5 && (((side*d + w)/0.5) % 2 + 2) % 2 < 1) c = col('#e8e6de'); }                                      // the zebra crossing by the square
        if (LOD >= 3 && speck(x, y, 0.1, 65) > 0.93) c = mul(c, 0.9); if (LOD >= 3 && Math.abs(fbm(x/2.5, y/2.5, 66) - 0.5) < 0.006 && fbm(x/12, y/12, 107) > 0.55) c = mul(c, 0.88); return c; }
      case 'rail': { const sl = b; if (Math.abs(a - 0.72) < 0.07) return col('#5a5e62'); let c = mul(col('#9e978a'), 0.9 + 0.15*(LOD >= 3 ? speck(x, y, 0.12, 109) : n2));
        if (LOD >= 2 && a < 1.15 && ((sl/per(0.6)) % 1 + 1) % 1 < 0.38) c = col('#6e5a44'); return c; }
      case 'pavement': { const [, d, , sl] = k; let c = mul(col('#b9b5ab'), 0.95 + 0.06*n2); if (d < 0.18) c = col('#cfcbc1');
        else if (LOD >= 2){ const q = per(0.6); if (((sl/q) % 1 + 1) % 1 < 0.12 || (((d - 0.18)/q) % 1 + 1) % 1 < 0.12) c = mul(c, 0.88); else if (LOD >= 3) c = mul(c, 0.96 + 0.08*hsh(Math.floor(sl/q), Math.floor(d/q), 108)); } return c; }
      case 'newroad': { let c = mul(col('#5e6266'), 0.97 + 0.05*n2); if (a > 2.2) c = mixC(c, col('#9a9282'), 0.6); if (LOD >= 3 && speck(x, y, 0.1, 100) > 0.95) c = mul(c, 1.1); return c; }
      case 'site': { let c = mul(col('#b3ab9c'), 0.93 + 0.1*n2); if (LOD >= 2 && Math.abs(Math.sin((x + 4*Math.sin(y/6))*0.7)) > 0.95) c = mul(c, 0.88); if (LOD >= 3 && speck(x, y, 0.1, 101) > 0.85) c = mul(c, speck(x, y, 0.1, 102) > 0.5 ? 1.1 : 0.88); return c; }
      case 'earth': return mul(col('#8a6a48'), 0.9 + 0.15*n2*(LOD >= 3 ? speck(x, y, 0.15, 103) + 0.5 : 1));
      case 'stumps': { let c = mixC(col('#7a8a4e'), col('#8a7a52'), n2); if (LOD >= 2 && speck(x, y, 0.6, 104) > 0.9 && Math.hypot(((x/0.6) % 1 + 1) % 1 - 0.5, ((y/0.6) % 1 + 1) % 1 - 0.5) < 0.32) c = col(LOD >= 3 ? '#c9a878' : '#a08868'); return c; }
      case 'square': { let c = mul(col('#b9b1a2'), 0.94 + 0.08*n1); if (LOD >= 2){ const cq = 1/per(0.38), u = x*cq, v = y*cq + (Math.floor(x*cq) % 2)*0.5; if ((u % 1 + 1) % 1 < (LOD >= 3 ? 0.12 : 0.2) || (v % 1 + 1) % 1 < (LOD >= 3 ? 0.12 : 0.2)) c = mul(c, 0.86); else if (LOD >= 3) c = mul(c, 0.94 + 0.12*hsh(Math.floor(u), Math.floor(v), 105)); } return c; }
      case 'track': { const rut = Math.abs(a - 0.72) < 0.28; let c = rut ? mul(col('#9a8361'), 0.92 + 0.12*n2) : a < 0.42 ? mixC(col('#8fae62'), col('#a89470'), 0.3*n2) : mixC(col('#a89470'), col('#8fae62'), clamp((a - 1.0)/0.45, 0, 1));
        if (LOD >= 3 && rut && fbm(x/3, y/3, 67) > 0.74) c = mixC(c, col('#7f8f99'), 0.7); if (LOD >= 3 && !rut && speck(x, y, 0.1, 68) > 0.85) c = mul(c, 1.08); return c; }
      case 'water': { let c = mixC(col('#6b9ab8'), col('#4a7896'), sm(1 - a)); if (LOD >= 2 && Math.abs(Math.sin(x*1.3 + y*0.4 + fbm(x/4, y/2, 69)*6)) > 0.97 && fbm(x/2, y/2, 70) > 0.5) c = mixC(c, col('#cfe2ec'), 0.6); return c; }
      case 'gravel': return mul(col('#bcae94'), LOD >= 3 ? 0.88 + 0.22*speck(x, y, 0.12, 71) : 0.95 + 0.1*n2);
      case 'bank': { let c = mixC(col('#6f8d55'), col('#87a65c'), clamp(a/2.6, 0, 1)); if (LOD >= 3 && a < 1.4 && speck(x, y, 0.1, 72) > 0.7) c = mixC(c, speck(x, y, 0.1, 73) > 0.5 ? col('#b8b06a') : col('#4f6e3c'), 0.7); return c; }
      case 'rock': { let c = mul(col('#c3bcae'), 0.9 + 0.15*n2); if (LOD >= 2 && Math.abs(fbm(x/2, y/2, 75) - 0.5) < 0.02) c = mul(c, 0.72); if (LOD >= 3 && speck(x, y, 0.15, 76) > 0.8) c = mixC(c, col('#7e9a5a'), 0.6); return c; }
      case 'verge': { let c = mixC(col('#90b064'), col('#9fba70'), n1); if (LOD >= 3 && speck(x, y, 0.1, 77) > 0.88) c = mul(c, 0.86); return c; }
      case 'floor': { let c = mixC(col('#4c6a3a'), col('#5e5a3c'), fbm(x/5, y/5, 98)); if (LOD >= 3 && speck(x, y, 0.1, 99) > 0.85) c = mul(c, 1.15); return mul(c, 0.85); }
      case 'pad': return mul(col('#b5a98c'), 0.93 + 0.1*n2);
      case 'yard': { let c = mul(col('#b5a98c'), 0.93 + 0.1*n2); if (LOD >= 2 && Math.abs(Math.sin((x + 3*Math.sin(y/4))*0.9)) > 0.94) c = mul(c, 0.86); if (LOD >= 3 && speck(x, y, 0.1, 78) > 0.9) c = mul(c, 1.1); return c; }
      case 'garden': { const p = b, bed = y > p[3] + 0.8 && y < p[3] + 3.8 && x > p[0] && x < p[0] + 5; if (bed){ let c = col('#8a6a4a'); if (LOD >= 2 && ((y/per(0.5)) % 1 + 1) % 1 < 0.45) c = mixC(c, col('#5f8a3c'), LOD >= 3 ? 0.6 + 0.4*speck(x, y, 0.15, 79) : 0.5); return c; }
        let c = mixC(col('#8fba68'), col('#9cc472'), n1); if (LOD >= 3 && speck(x, y, 0.1, 80) > 0.97) c = [[240, 240, 235], [232, 200, 70], [200, 90, 110]][Math.floor(speck(x, y, 0.1, 81)*3)]; return c; }
      case 'pasture': { let c = mixC(col('#7aa652'), col('#8db55e'), n1); c = mul(c, 0.94 + 0.1*n2);
        const ph = base0(x, y)*1.4 + fbm(x/10, y/10, 82)*2; if (LOD >= 3 && fbm(x/30, y/30, 106) > 0.6 && Math.abs((ph % 1 + 1) % 1 - 0.5) < 0.03) c = mixC(c, col('#a8996e'), 0.55);
        if (LOD >= 3){ const t = speck(x, y, 0.1, 83); if (t > 0.86) c = mul(c, 0.84); else if (t < 0.05) c = mul(c, 1.12); if (speck(x, y, 0.3, 84) > 0.996 && Math.hypot(((x/0.3) % 1 + 1) % 1 - 0.5, ((y/0.3) % 1 + 1) % 1 - 0.5) < 0.38) c = col('#7a5a3e'); if (speck(x, y, 0.1, 85) > 0.992) c = [236, 236, 230]; } return c; }
      case 'margin': { let c = mixC(col('#8ab260'), col('#a3bf72'), n2); if (LOD >= 3 && speck(x, y, 0.1, 86) > 0.93) c = speck(x, y, 0.1, 87) > 0.5 ? [228, 220, 120] : [214, 214, 220]; return c; }
      default: { const p = b, v = p.v, wv = fbm(x/9, y/9, 88), row = (q, w) => ((v/per(q)) % 1 + 1) % 1 < w; let c;
        if (kind === 'wheat' || kind === 'barley'){ c = mixC(col(kind === 'wheat' ? '#dcbf68' : '#d4c886'), col(kind === 'wheat' ? '#e8d48e' : '#e0d6a0'), wv); c = mul(c, 0.95 + 0.08*n2);
          if (LOD >= 2 && Math.abs(((v % 12) + 12) % 12 - 6) < (LOD >= 3 ? 0.25 : 0.4)) c = mul(c, 0.88); if (LOD >= 3 && row(0.3, 0.3)) c = mul(c, 0.94); if (LOD >= 3 && speck(x, y, 0.1, 89) > 0.995) c = [200, 60, 50]; }
        else if (kind === 'meadow'){ c = mixC(col('#86b45c'), col('#9cc26a'), wv); c = mul(c, 0.94 + 0.1*n2); if (LOD >= 3){ const t = speck(x, y, 0.1, 90); if (t > 0.9) c = mul(c, 0.86); if (t > 0.985) c = [[240, 240, 232], [236, 206, 70], [176, 120, 190]][Math.floor(speck(x, y, 0.1, 91)*3)]; } }
        else if (kind === 'mown'){ const sw = ((v/1.8) % 2 + 2) % 2 < 1; c = mixC(col('#b2c67c'), col('#c4d08e'), wv); if (LOD >= 2) c = mul(c, sw ? 1.04 : 0.95); if (LOD >= 2 && Math.abs(((v % 7.2) + 7.2) % 7.2 - 3.6) < 0.45) c = mixC(c, col('#d8c68a'), 0.7); if (LOD >= 3 && speck(x, y, 0.1, 92) > 0.9) c = mul(c, 0.92); }
        else if (kind === 'plough'){ c = mul(col('#8f6e4e'), 0.92 + 0.12*wv); if (LOD >= 2 && row(0.45, 0.4)) c = mul(c, LOD >= 3 ? 0.84 : 0.92); if (LOD >= 3 && speck(x, y, 0.1, 93) > 0.9) c = mul(c, 1.12); }
        else { c = mul(col('#94744f'), 0.95 + 0.08*wv); if (LOD >= 2 && row(0.75, LOD >= 3 ? 0.35 : 0.5)) c = mixC(c, col('#6f9a48'), LOD >= 3 ? 0.85 : 0.5); }
        return mul(c, 0.96 + 0.06*n1); } } };
  items.forEach(f => f());
  // ---- heights on a 1 m grid; a blurred copy for the shading of hollows
  const G = 1, nx = W/G, ny = D/G, gh = new Float32Array((nx + 1)*(ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) gh[j*(nx + 1) + i] = ground(i*G, j*G);
  const hh = (i, j) => gh[clamp(j, 0, ny)*(nx + 1) + clamp(i, 0, nx)];
  const hb = (x, y) => { const fx = x/G, fy = y/G, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return hh(i, j)*(1 - u)*(1 - v) + hh(i + 1, j)*u*(1 - v) + hh(i, j + 1)*(1 - u)*v + hh(i + 1, j + 1)*u*v; };
  const B2 = 4, bx = W/B2, by = D/B2, blur = new Float32Array((bx + 1)*(by + 1)); for (let j = 0; j <= by; j++) for (let i = 0; i <= bx; i++){ let s = 0, n = 0; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++){ s += hb(clamp((i + a)*B2, 0, W), clamp((j + b)*B2, 0, D)); n++; } blur[j*(bx + 1) + i] = s/n; }
  const blurAt = (x, y) => { const fx = clamp(x/B2, 0, bx - 1e-6), fy = clamp(y/B2, 0, by - 1e-6), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, q = (a, b) => blur[b*(bx + 1) + a];
    return q(i, j)*(1 - u)*(1 - v) + q(i + 1, j)*u*(1 - v) + q(i, j + 1)*(1 - u)*v + q(i + 1, j + 1)*u*v; };
  // ---- trees: the forest (close together), hedges of shrubs with oaks, trees by the water, lone spruces in the pastures, fruit trees in the gardens
  const tree = (x, y, kind, s) => { const f = kind === 's' ? K.spruce : kind === 'f' ? K.fruitTree : K.beech, ht = (kind === 's' ? 10.5 : kind === 'f' ? 4.2 : 7.6)*s, z = hb(x, y) - 0.15; casters.push([x - 1.1*s, y - 1.1*s, x + 1.1*s, y + 1.1*s, ht*0.85]);
    H.SD(x - 2.6*s, x + 2.6*s, y - 2.6*s, y + 2.6*s, 0, ht, (px, py, pz) => f(px - x, py - y, pz, s), {step:0.18, lift:z}); };
  const shrub = (x, y, s) => { const z = hb(x, y) - 0.1; casters.push([x - 0.8*s*2, y - 0.8*s*2, x + 0.8*s*2, y + 0.8*s*2, 3*s]); H.SD(x - 1.6*s*2.6, x + 1.6*s*2.6, y - 1.6*s*2.6, y + 1.6*s*2.6, 0, 8*s, (px, py, pz) => K.beech((px - x)/1.6, (py - y)/1.6, pz + 1.2*s*1.6, s), {step:0.12, lift:z}); };
  const CG = 3.6; for (let i = 0; i <= W/CG; i++) for (let j = 0; j <= D/CG; j++){ const x = (i + 0.5 + 0.8*(hsh(i, j, 31) - 0.5))*CG, y = (j + 0.5 + 0.8*(hsh(i, j, 32) - 0.5))*CG; if (x < 1 || y < 1 || x > W - 1 || y > D - 1 || !forestM(x, y)) continue;
    const sp = hsh(i, j, 33) < 0.35 + 0.5*clamp((90 - y)/90, 0, 1), s = 0.85 + 0.35*hsh(i, j, 34); tree(x, y, sp ? 's' : 'b', s*(sp ? 1.05 : 1.1)); }
  const free = (x, y, m) => !PROBE(x, y, m) && !roadNear(x, y, 1.5) && Math.abs(streamV(x, y)) > hw(x) + 0.6 && near(SIDE, x, y, 3) > 1.8 && !TRACKS.some(pl => near(pl, x, y, 3) < 2.2) && !forestM(x, y) && !inSite(x, y, 2) && !cleared(x, y);
  for (const pl of HEDGES) for (let t = 0; t < pl.length; t += 1){ const [px, py] = pl[t], x = px + (hsh(t, pl.length, 35) - 0.5)*1.2, y = py + (hsh(t, 1, 36) - 0.5)*1.2; if (hedgeM(x, y) && free(x, y, 1)){ if (hsh(t, pl.length, 37) < 0.06) tree(x, y, 'b', 1.15 + 0.3*hsh(t, 2, 38)); else if (LOD >= 2 || t % 2 === 0) shrub(x, y, 0.42 + 0.14*hsh(t, 3, 39)); } }
  for (let i = 0; i < 120; i++){ const x = r()*W, v = (r() < 0.5 ? -1 : 1)*(hw(x) + 1.8 + r()*1.4), y = ys(x) + v; if (y < D - 3 && free(x, y, 3)) tree(x, y, 'b', 0.6 + r()*0.3); }
  for (let i = 0; i < 40; i++){ const t = Math.floor(r()*SIDE.length), [px, py] = SIDE[t], x = px + (r() < 0.5 ? -1 : 1)*(2.6 + r()*1.5), y = py; if (free(x, y, 3)) tree(x, y, r() < 0.5 ? 'b' : 's', 0.6 + r()*0.3); }
  for (let i = 0; i < 2500; i++){ const x = r()*W, y = r()*D; if (pastureM(x, y) && !inSettle(x, y, 8) && free(x, y, 3) && r() < 0.03) tree(x, y, r() < 0.8 ? 's' : 'b', 0.8 + r()*0.45); }
  for (const [x0, y0, x1, y1, name] of placed) if (!FUNC.includes(name) && !name.startsWith('Farm')) for (let i = 0; i < 2; i++){ const x = x0 - 3 + r()*(x1 - x0 + 6), y = y0 - 3 + r()*(y1 - y0 + 6); if (free(x, y, 1)) tree(x, y, 'f', 0.85); }
  for (const [x0, y0, x1, y1, name] of placed) if (name.startsWith('Farm')) for (let i = 0; i < 5; i++){ const x = x0 - 8 + r()*(x1 - x0 + 16), y = y0 - 8 + r()*(y1 - y0 + 16); if (free(x, y, 2.5)) tree(x, y, 'f', 0.9); }
  if (LOD >= 2) for (let i = 0; i < 30000; i++){ const x = r()*W, y = r()*D; if (!forestM(x, y) && [[-2.5, 0], [0, -2.5]].some(([dx, dy]) => forestM(x + dx, y + dy)) && free(x, y, 2) && r() < 0.12) shrub(x, y, 0.32 + r()*0.18); }
  // ---- things in the villages (middle and close detail): fences, washing lines, woodpiles
  if (LOD >= 2) for (const [x0, y0, x1, y1, name] of placed){ if (FUNC.includes(name) || name.startsWith('Farm') || Math.hypot((x0 - TOWN[0])/TOWN[2], (y0 - TOWN[1])/TOWN[3]) < 0.75) continue; const a = x0 - 4.5, b = y0 - 4.5, c = x1 + 4.5, e = y1 + 4.5;
    const side = (p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])/1.6); for (let i = 0; i <= n; i++){ const x = lerp(p[0], q[0], i/n), y = lerp(p[1], q[1], i/n); if (roadNear(x, y, 0.4)) continue; H.B(x - 0.05, y - 0.05, hb(x, y), 0.1, 0.1, 0.95, '#7a5a3a');
      if (i < n){ const x2 = lerp(p[0], q[0], (i + 1)/n), y2 = lerp(p[1], q[1], (i + 1)/n); if (roadNear(x2, y2, 0.4)) continue; for (const zz of [0.4, 0.8]) H.L([[x, y, hb(x, y) + zz], [x2, y2, hb(x2, y2) + zz]], '#8a6a4a', 0.45); } } };
    side([a, e], [c, e]); side([c, b], [c, e]); side([a, b], [a, e]);
    if (r() < 0.6){ const wx = c - 4, wy = e - 2.2, wz = hb(wx, wy); for (const px of [wx, wx + 3.4]) H.B(px, wy, wz, 0.08, 0.08, 1.8, '#7a5a3a'); H.L([[wx, wy, wz + 1.75], [wx + 3.4, wy, wz + 1.75]], '#d9d4c8', 0.3);
      [['#f4f2ec', 0.3], ['#c63a2c', 1.0], ['#2c5f93', 1.6], ['#e8b730', 2.3], ['#f4f2ec', 2.8]].forEach(([cc, t]) => H.B(wx + t, wy - 0.02, wz + 1.2, 0.45, 0.04, 0.55, cc)); }
    H.B(x0 + 1, y1 + 0.2, hb(x0 + 2, y1 + 0.5), 2.4, 0.7, 1.1, '#a87a4c', {top:'#6a4a32'}); }
  // ---- bridges where roads and tracks cross the main stream
  for (const pl of [...ROADS, ...TRACKS]) for (let t = 0; t < pl.length - 1; t++){ const [x, y] = pl[t], [x2, y2] = pl[t + 1]; if (Math.sign(streamV(x, y)) !== Math.sign(streamV(x2, y2))){ const w = hw(x) + 2.4, z = Math.max(base0(x, ys(x) - w - 1), base0(x, ys(x) + w + 1)) - 0.2, bw = pl.w + 0.4, yc = ys(x);
      H.B(x - bw, yc - w, z - 0.25, 2*bw, 2*w, 0.4, pl.w > 2 ? '#9a958a' : '#8a6a4a'); for (const sx of [-bw, bw - 0.12]) H.B(x + sx, yc - w, z + 0.15, 0.12, 2*w, 0.75, pl.w > 2 ? '#b0aba0' : '#6a4a32'); } }
  // ---- a little life: cows and sheep, a few people, the post bus, a tractor
  for (let i = 0; i < 40; i++){ const x = r()*W, y = r()*D; if (!pastureM(x, y) || inSettle(x, y, 10) || !free(x, y, 3)) continue; const z = hb(x + 1.4, y + 0.5);
    if (i % 3) { H.SD(x, x + 2.8, y, y + 1, 0, 1.5, (px, py, pz) => K.cowM(i % 2 ? {graze:1} : {})(px - x, py - y, pz), {step:0.06, lift:z}); casters.push([x + 0.3, y + 0.2, x + 2.5, y + 0.8, 1.3]); }
    else H.SD(x, x + 1.4, y, y + 0.6, 0, 0.9, (px, py, pz) => K.sheepFn({graze:1})(px - x, py - y, pz), {step:0.05, lift:z}); }
  // ---- streets: lamps, parked and passing cars, people on the pavements, groups chatting, life on the square
  const atRoad = (pl, sl, off) => { let i = 1; while (i < pl.cum.length - 1 && pl.cum[i] < sl) i++; const [ax, ay] = pl[i - 1], [bx2, by2] = pl[i], L = Math.hypot(bx2 - ax, by2 - ay) || 1, t = clamp((sl - pl.cum[i - 1])/L, 0, 1), ux = (bx2 - ax)/L, uy = (by2 - ay)/L;
    return [ax + (bx2 - ax)*t - uy*off, ay + (by2 - ay)*t + ux*off, ux, uy]; };
  const okSpot = (x, y, m) => !PROBE(x, y, m) && x > 2 && y > 2 && x < W - 3 && y < D - 3;
  for (const pl of ROADS){ const len = pl.cum[pl.cum.length - 1];
    for (let sl = 6, k = 0; sl < len; sl += 24, k++){ const [x, y] = atRoad(pl, sl, (k % 2 ? 1 : -1)*(pl.w + 1.4)); if (!inTown(x, y) || !okSpot(x, y, 0.4)) continue; const z = hb(x, y); H.B(x - 0.06, y - 0.06, z, 0.12, 0.12, 4.2, '#3a3f45'); H.B(x - 0.25, y - 0.12, z + 4.1, 0.5, 0.24, 0.14, '#4a4f55', {top:'#5a5f65'}); H.B(x - 0.2, y - 0.08, z + 4.02, 0.4, 0.16, 0.08, '#fff4c8'); }
    for (let sl = 4; sl < len; sl += 7){ const [x, y, ux] = atRoad(pl, sl, (pl.w - 1.05)*(r() < 0.5 ? 1 : -1)); if (Math.abs(ux) < 0.9 || r() > (inTown(x, y) ? 0.3 : 0.015) || ROADS.some(o => o !== pl && near(o, x, y, o.w + 6) < o.w + 6)) continue; const nm = K.VARS.car[Math.floor(r()*K.VARS.car.length)], m = K.M.find(q => q.n === nm); if (okSpot(x, y, 1)) K.place(H, nm, x - m.W/2, y - m.D/2, hb(x, y)); }
    for (let sl = 3; sl < len; sl += 2.2){ const side = r() < 0.5 ? 1 : -1, [x, y, ux] = atRoad(pl, sl, side*(pl.w + 0.4 + r()*1.0)); if (!inTown(x, y) || r() > 0.32 || !okSpot(x, y, 0.3)) continue; const z = hb(x + 0.75, y + 0.75), fwd = (ux > 0) === (side > 0), o = K.VILL[Math.floor(r()*20)];
      if (r() < 0.22){ K.figure(H, o, x - 0.75, y - 0.75, null, z); K.turned(H, K.VILL[Math.floor(r()*20)], x + 0.35, y - 0.75, null, z); }      // two people stopped for a chat
      else (fwd ? K.figure : K.turned)(H, r() < 0.15 ? Object.assign({}, o, {small:1, item:null}) : o, x - 0.75, y - 0.75, r() < 0.5 ? K.POSE.walkA : K.POSE.walkB, z); } }
  for (const [name, dx, dy] of [['Café terrace', -2, -14], ['Market stall with cheese seller', -14, 4], ['Market stall with cheese seller', -9, 8], ['Pensioners on a bench', 8, 6], ['Kids playing', 2, 7], ['Dog walker', 24, -2], ['Woman with a pram', -24, 6], ['Cyclist', -30, 15]]){ const x = SQUARE[0] + dx, y = SQUARE[1] + dy, m = K.M.find(q => q.n === name);
    search: for (let rad = 0; rad < 14; rad += 1) for (let a = 0; a < 8; a++){ const px = x + Math.cos(a*0.785)*rad, py = y + Math.sin(a*0.785)*rad;
      if ([[0, 0], [m.W, 0], [0, m.D], [m.W, m.D], [m.W/2, m.D/2]].every(([u, v]) => !roadNear(px + u, py + v, 0.3) && okSpot(px + u, py + v, 0.5))){ K.place(H, name, px, py, hb(px + m.W/2, py + m.D/2), null, true); break search; } } }
  for (const pl of [MAIN, ROAD_C, ROAD_A]) for (let sl = 30; sl < pl.cum[pl.cum.length - 1]; sl += 90){ const [x, y, ux] = atRoad(pl, sl, -pl.w*0.5); if (inTown(x, y) || Math.abs(ux) < 0.85 || !okSpot(x, y, 1)) continue; const nm = K.VARS.car[Math.floor(r()*K.VARS.car.length)], m = K.M.find(q => q.n === nm); K.place(H, nm, x - m.W/2, y - m.D/2, hb(x, y)); }
  { const q = nearP(MAIN, TX + 45, TYR, 60), [x, y] = atRoad(MAIN, q[3], -1.4); if (okSpot(x, y, 2)) K.place(H, 'Post bus', x - 4.5, y - 1.25, hb(x, y)); const [tx, ty] = atRoad(ROAD_A, 40, 0); K.place(H, 'Tractor with manure spreader', tx - 4.3, ty - 1.3, hb(tx, ty)); }
  // ---- light: sun direction, soft shade on slopes, darker hollows and feet of things, shadows, warm sun and cool shade, haze
  const L = [0.345, 0.636, 1], Ln = Math.hypot(...L), sx = 0.345/0.723, sy = 0.636/0.723, rise = 1/0.723;
  const colourAt = (x, y) => { const h = hb(x, y); let c = surface(x, y, kindAt(x, y));
    const e = 0.5, gx = (hb(x + e, y) - hb(x - e, y))/(2*e), gy = (hb(x, y + e) - hb(x, y - e))/(2*e), n = [-gx, -gy, 1], lit = (n[0]*L[0] + n[1]*L[1] + n[2]*L[2])/(Math.hypot(...n)*Ln);
    let f = 0.6 + 0.48*lit; const step = LOD >= 3 ? 0.035 : 0.05; f = Math.round(f/step)*step; f *= 1 - clamp((blurAt(x, y) - h)/7, 0, 1)*0.28;
    let shade = false; for (let t = 1; t < 40; t += LOD >= 2 ? 1 : 2){ if (hb(x + sx*t, y + sy*t) > h + rise*t + 0.2){ shade = true; break; } }
    const [os, od] = objShade(x, y); if (os) shade = true; if (!PROBE(x, y, -0.4)) f *= 1 - 0.3*Math.exp(-od/0.6);
    if (shade) f *= 0.74; const warm = clamp((f - 0.9)*3, 0, 1), cool = shade ? 1 : clamp((0.82 - f)*3, 0, 1);
    c = [c[0]*f*(1 + 0.05*warm - 0.05*cool), c[1]*f*(1 + 0.01*warm - 0.01*cool), c[2]*f*(1 - 0.07*warm + 0.09*cool)];
    const lum = (c[0] + c[1] + c[2])/3; c = c.map(v => lum + (v - lum)*1.18);
    const hz = clamp((560 - (x + y))/560, 0, 1)*0.16 + clamp(h/60, 0, 1)*0.05; return c.map((v, i) => Math.round(clamp(lerp(v, [208, 220, 228][i], hz), 0, 255))); };
  H.HF(W, D, G, gh, null, {base:8, colourAt});
});
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('bold 16px Silkscreen'), document.fonts.ready]) : Promise.resolve()).then(() => {
  // drawn at one resolution (s px per metre); zoom (z) only enlarges the pixels; wall writing is written in screen pixels
  const c = document.getElementById('c'), win = Q.get('win') ? Q.get('win').split(',').map(Number) : null, n = document.createElement('canvas');
  let pad = 20, ox = D*S + pad, oy = 50*S + pad; n.width = Math.ceil((W + D)*S) + pad*2; n.height = Math.ceil((W + D)/2*S + 50*S) + pad*2;
  if (win){ const [x0, y0, x1, y1] = win, zt = 30; n.width = Math.ceil((x1 - y0 - x0 + y1)*S); n.height = Math.ceil(((x1 + y1 - x0 - y0)/2 + zt)*S); ox = -(x0 - y1)*S; oy = -((x0 + y0)/2 - zt - 2)*S; }
  const g = n.getContext('2d'); const sky = g.createLinearGradient(0, 0, 0, n.height); sky.addColorStop(0, '#dfe6ec'); sky.addColorStop(1, '#eef0ea'); g.fillStyle = sky; g.fillRect(0, 0, n.width, n.height);
  const t = Date.now(); ART.plates.length = 0; ART.texts.on = true; ART.texts.list.length = 0; const post = ART.draw(g, SCENE, 0, S, ox, oy); post.forEach(f => f());
  c.width = n.width*Z; c.height = n.height*Z; const gc = c.getContext('2d'); gc.imageSmoothingEnabled = false; gc.drawImage(n, 0, 0, c.width, c.height);
  if (Z > 1) for (const p of ART.plates){ const cx = p.x0 + (p.w >> 1), cy = p.y0 + (p.h >> 1); if (cx < 0 || cy < 0 || cx >= n.width || cy >= n.height) continue; const px = g.getImageData(cx, cy, 1, 1).data, b = p.bg.match(/\w\w/g).map(v => parseInt(v, 16));
    if (Math.abs(px[0] - b[0]) + Math.abs(px[1] - b[1]) + Math.abs(px[2] - b[2]) < 30) ART.plateText(gc, p.x0*Z, p.y0*Z, p.w*Z, p.h*Z, p.text, p.fg); }
  gc.save(); gc.scale(Z, Z); for (const [m1, len, fs, skew, txt, tc] of ART.texts.list) ART.wallText(gc, m1, len, fs, skew, txt, tc); gc.restore();
  document.title += ' · ' + (Date.now() - t) + ' ms';
});
