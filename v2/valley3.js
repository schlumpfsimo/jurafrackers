/* The game map, 640 × 480 m: a forested ridge at the back, the main valley with its stream, a side valley, a wooded hill in
   front. One town in the valley, three villages (on the slope, in the side valley, at the far end), farms, and a lot of open
   land in between. Built like the test corner: the ground is worked out for every pixel, the trees are the locked ones.
   ?s= resolution (px per metre), ?z= pixel enlargement, ?d= detail (default from the screen scale s·z: <8 far, <20 middle,
   ≥20 close), ?win=x0,y0,x1,y1 draws one part, ?works=1 adds a test drill site, a site in the forest and their new roads. */
const Q = new URLSearchParams(location.search), S = +(Q.get('s') || 2.5), Z = +(Q.get('z') || 1), SCR = S*Z, LOD = +(Q.get('d') || (SCR >= 20 ? 3 : SCR >= 8 ? 2 : 1)), WORKS = Q.get('works') === '1';
const W = 640, D = 480;
const SCENE = ART.compose(W, D, (H, K) => {
  const r = K.rng(23), hsh = K.hsh, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = t => t*t*(3 - 2*t), lerp = (a, b, t) => a + (b - a)*t;
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = hsh(xi, yi, s), b = hsh(xi + 1, yi, s), c = hsh(xi, yi + 1, s), d = hsh(xi + 1, yi + 1, s);
    return a + (b - a)*fx + (c - a)*fy + (a - b - c + d)*fx*fy; };
  const fbm = (x, y, s) => vn(x, y, s)*0.5 + vn(x*2.03 + 5.1, y*2.03, s + 1)*0.3 + vn(x*4.1, y*4.1 + 2.7, s + 2)*0.2;
  // ---- paths: smooth curves, with a bounding box; nearest point on them
  const curve = (pts, w) => { const out = []; for (let i = 0; i < pts.length - 1; i++){ const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])/2);
      for (let k = 0; k < n; k++){ const t = k/n, t2 = t*t, t3 = t2*t, f = (a, b, c, d) => 0.5*(2*b + (-a + c)*t + (2*a - 5*b + 4*c - d)*t2 + (-a + 3*b - 3*c + d)*t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
    out.push(pts[pts.length - 1]); const xs = out.map(p => p[0]), ys = out.map(p => p[1]); out.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; out.w = w || 2.7; return out; };
  const nearP = (pl, x, y, lim) => { const [a, b, c, d] = pl.box; if (x < a - lim || x > c + lim || y < b - lim || y > d + lim) return null; let best = 1e9, bx = 0, by = 0;
    for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [qx, qy] = pl[i + 1], vx = qx - ax, vy = qy - ay, t = clamp(((x - ax)*vx + (y - ay)*vy)/(vx*vx + vy*vy || 1), 0, 1), px = ax + vx*t, py = ay + vy*t, d2 = Math.hypot(x - px, y - py); if (d2 < best){ best = d2; bx = px; by = py; } }
    return [best, bx, by]; };
  const near = (pl, x, y, lim) => { const q = nearP(pl, x, y, lim); return q ? q[0] : 1e9; };
  // roads (half widths): the valley road, town streets, village lanes; farm tracks
  const MAIN = curve([[-2, 250], [80, 246], [160, 253], [240, 241], [300, 237], [360, 239], [440, 232], [520, 226], [642, 231]], 2.8);
  const ROADS = [MAIN,
    curve([[300, 237], [302, 214], [298, 190], [290, 176]], 2.3), curve([[262, 216], [300, 212], [338, 216], [352, 224]], 2.3), curve([[240, 241], [250, 222], [262, 216]], 2.2),
    curve([[300, 237], [310, 262], [328, 296], [396, 326], [480, 345], [548, 352], [600, 340]], 2.4),                       // over the stream to the village at the far end
    curve([[160, 253], [150, 222], [176, 196], [152, 168], [142, 142], [128, 124]], 2.1),                                    // up the slope to the hill village
    curve([[520, 226], [530, 196], [517, 160], [526, 124], [520, 96]], 2.1)];                                                // into the side valley
  const TRACKS = [curve([[80, 246], [72, 210], [90, 176], [70, 140]], 1.45), curve([[420, 234], [430, 200], [410, 168], [420, 130], [404, 96]], 1.45), curve([[200, 245], [210, 290], [190, 330], [215, 380]], 1.45),
    curve([[396, 326], [380, 380], [400, 430], [380, 482]], 1.45), curve([[600, 340], [620, 300], [608, 262]], 1.45), curve([[142, 142], [190, 120], [240, 104], [300, 100]], 1.45)];
  // works: a drill site in a field, one in the forest, and the new roads to them (they cut through whatever is there)
  const SITES = WORKS ? [[392, 140, 432, 170], [222, 20, 256, 44]] : [];
  const NEWROADS = WORKS ? [curve([[420, 234], [418, 200], [412, 170]], 2.6), curve([[176, 196], [196, 150], [214, 112], [228, 70], [238, 44]], 2.6)] : [];
  const ALLROADS = [...ROADS, ...NEWROADS];
  // streams: the main stream meanders along the valley; a side stream comes down the side valley
  const ys = x => 286 + 10*Math.sin(x/45) + 4*Math.sin(x/13 + 1), ys2 = x => -10/2025*Math.sin(x/45) - 4/169*Math.sin(x/13 + 1), hw = x => 2.4 + 0.6*Math.sin(x/23 + 2);
  const streamV = (x, y) => { const dy = 10/45*Math.cos(x/45) + 4/13*Math.cos(x/13 + 1); return (y - ys(x))/Math.sqrt(1 + dy*dy); };
  const sv = y => 548 + 14*Math.sin(y/37);
  const SIDE = curve([[sv(0), -2], [sv(60), 60], [sv(120), 120], [sv(180), 180], [sv(230), 230], [565, ys(565)]], 1.3);
  // ---- the land
  const base0 = (x, y) => 30*sm(clamp((120 - y)/120, 0, 1)) + 16*Math.exp(-((x - 110)**2/95**2 + (y - 455)**2/70**2)) + 9*sm(clamp((y - 330)/130, 0, 1))*sm(clamp((x - 380)/160, 0, 1))
    - 16*Math.exp(-((x - sv(y))**2)/34**2)*sm(clamp((240 - y)/120, 0, 1)) + 8*(fbm(x/60, y/60, 3) - 0.5) + 2.5*(fbm(x/16, y/16, 4) - 0.5);
  const slope = (x, y) => Math.hypot(base0(x + 1, y) - base0(x - 1, y), base0(x, y + 1) - base0(x, y - 1))/2;
  // settlements
  const TOWN = [300, 222, 72, 52], VILLAGES = [[134, 130, 34], [524, 112, 30], [578, 352, 34]];
  const inSettle = (x, y, m) => Math.hypot((x - TOWN[0])/(TOWN[2] + m), (y - TOWN[1])/(TOWN[3] + m)) < 1 || VILLAGES.some(([cx, cy, rr]) => Math.hypot(x - cx, y - cy) < rr + m);
  const inSite = (x, y, m) => SITES.some(([a, b, c, e]) => x > a - m && x < c + m && y > b - m && y < e + m);
  const rock = (x, y) => (y < 175 || (x > 500 && y < 240)) && !inSettle(x, y, 10) && !inSite(x, y, 4) ? clamp((fbm(x/8, y/8, 9) - 0.6)*5, 0, 1)*clamp((slope(x, y) - 0.3)*4, 0, 1) : 0;
  // levelled ground: building plots, sites; roads are cut into the slope (flat across, smooth along)
  const flats = [], FB = new Map(); const level = (x0, y0, x1, y1, m) => { const z = base0((x0 + x1)/2, (y0 + y1)/2), f = [x0, y0, x1, y1, z, m || 4]; flats.push(f);
    for (let i = Math.floor((x0 - 8)/16); i <= Math.floor((x1 + 8)/16); i++) for (let j = Math.floor((y0 - 8)/16); j <= Math.floor((y1 + 8)/16); j++){ const k = i*1000 + j; if (!FB.has(k)) FB.set(k, []); FB.get(k).push(f); } return z; };
  const roadLevel = (x, y, h) => { for (const pl of ALLROADS){ const q = nearP(pl, x, y, pl.w + 4); if (!q || q[0] > pl.w + 4) continue; const zc = base0(q[1], q[2]), t = q[0] < pl.w + 0.6 ? 0 : sm((q[0] - pl.w - 0.6)/3.4); h = zc + (h - zc)*t; } return h; };
  const ground = (x, y) => { let h = roadLevel(x, y, base0(x, y)); for (const [x0, y0, x1, y1, z, m] of FB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || []){ const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)); if (d < m){ const t = sm(d/m); h = z + (h - z)*t; } }
    const v = Math.abs(streamV(x, y)), w = hw(x); if (v < w + 3) h -= 1.3*(v < w ? 1 : 1 - sm((v - w)/3)); const ds = near(SIDE, x, y, 4); if (ds < 3.5) h -= 0.9*(ds < 1.3 ? 1 : 1 - sm((ds - 1.3)/2.2));
    const rk = rock(x, y); if (rk) h += rk*1.1*fbm(x/1.8, y/1.8, 12); return h; };
  // ---- buildings: functional ones first (they keep their orientation), then houses along the streets, farms in the open
  const placed = [], items = [], casters = [], yards = [], PB = new Map();
  const roadNear = (x, y, m) => ALLROADS.some(pl => near(pl, x, y, pl.w + m) < pl.w + m);
  const fits = (x, y, w, d) => { if (x < 4 || y < 4 || x + w > W - 4 || y + d > D - 4) return false; for (const [a, b, c, e] of placed) if (!(x + w + 2 < a || x - 2 > c || y + d + 2 < b || y - 2 > e)) return false;
    for (let u = 0; u <= 1; u += 0.25) for (let v = 0; v <= 1; v += 0.25){ const px = x + w*u, py = y + d*v; if (roadNear(px, py, 0.8) || Math.abs(streamV(px, py)) < hw(px) + 4 || near(SIDE, px, py, 4) < 4 || inSite(px, py, 3)) return false; } return slope(x + w/2, y + d/2) < 0.45; };
  const building = (name, x, y, recol) => { const m = K.M.find(q => q.n === name); if (!m || !fits(x, y, m.W, m.D)) return false; const p = [x, y, x + m.W, y + m.D, name]; placed.push(p);
    for (let i = Math.floor((x - 6)/16); i <= Math.floor((x + m.W + 6)/16); i++) for (let j = Math.floor((y - 6)/16); j <= Math.floor((y + m.D + 6)/16); j++){ const k = i*1000 + j; if (!PB.has(k)) PB.set(k, []); PB.get(k).push(p); }
    const z = level(x - 1, y - 1, x + m.W + 1, y + m.D + 1); items.push(() => K.place(H, name, x, y, z, recol, true)); const zt = Math.max(...m.parts.filter(q => q.t === 'blk').map(q => q.z + Math.max(...q.h)), 3); casters.push([x + 0.6, y + 0.6, x + m.W - 0.6, y + m.D - 0.6, zt*0.8]);
    if (name.startsWith('Farm')) yards.push([x - 3, y + m.D - 1, x + m.W + 2, y + m.D + 7]); return true; };
  const nearBy = (name, x, y, recol) => { for (let rad = 0; rad < 18; rad += 1.5) for (let a = 0; a < 12; a++) if (building(name, x + Math.cos(a*0.524)*rad, y + Math.sin(a*0.524)*rad, recol)) return true; return false; };
  const HOUSES = ['House, two storeys', 'House, small', ...K.VARS.house], house = () => HOUSES[Math.floor(r()*HOUSES.length)], FARMS = ['Farm', ...K.VARS.farm];
  const ROOFS = [null, {'#a8473a':'#b8553e'}, {'#a8473a':'#8e3f32'}, {'#a8473a':'#9a5a3a'}, {'#a8473a':'#c0624a'}], roof = () => ROOFS[Math.floor(r()*ROOFS.length)];
  const FUNC = ['Church', 'Mairie', 'Fountain', 'Village shop', 'Bank', 'La Feuille de la Faille', 'Gendarmerie', 'Canton house', 'School', 'Chapel'];
  // the town: the square by the fountain, the church and the mairie, the other public buildings along the streets
  nearBy('Fountain', 304, 222); nearBy('Mairie', 312, 198); nearBy('Church', 276, 196); nearBy('Village shop', 318, 224); nearBy('Bank', 270, 225);
  nearBy('La Feuille de la Faille', 336, 196); nearBy('Gendarmerie', 336, 244); nearBy('Canton house', 252, 192); nearBy('School', 280, 250);
  // houses line the streets, a second row behind, thinning out at the edge of town; villages along their lanes
  const frontage = (cx, cy, rx, ry, prob, rows, nmax) => { let k = 0; for (const pl of ROADS) for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax)/L, uy = (by - ay)/L;
      for (let s = 0; s < L; s += 1.2) for (const side of [-1, 1]) for (let row = 0; row < rows; row++){ if (k >= nmax) return k; const name = house(), m = K.M.find(q => q.n === name), off = pl.w + 3.2 + (row ? 13 : 0) + Math.max(m.W, m.D)/2;
        const px = ax + ux*s - uy*side*off, py = ay + uy*s + ux*side*off, d = Math.hypot((px - cx)/rx, (py - cy)/ry); if (d > 1 || r() > prob*(1.25 - d)) continue;
        if (building(name, px - m.W/2, py - m.D/2, roof())) k++; } } return k; };
  frontage(TOWN[0], TOWN[1], TOWN[2], TOWN[3], 0.9, 2, 75);
  VILLAGES.forEach(([cx, cy, rr], i) => { nearBy('Chapel', cx + [6, -4, 2][i], cy + [-6, 4, -8][i]); frontage(cx, cy, rr, rr, 0.8, 2, [11, 9, 10][i]); nearBy(FARMS[(i + 1) % FARMS.length], cx + [30, -32, 26][i], cy + [16, 24, 20][i]); });
  for (const [x, y] of [[40, 180], [220, 300], [250, 160], [450, 280], [420, 410], [610, 190], [70, 330], [330, 420]]) nearBy(FARMS[Math.floor(r()*FARMS.length)], x, y, roof());
  const PROBE = (x, y, m) => (PB.get(Math.floor(x/16)*1000 + Math.floor(y/16)) || []).find(p => x > p[0] - m && x < p[2] + m && y > p[1] - m && y < p[3] + m);
  const inBox = (x, y, [a, b, c, e], m) => x > a - m && x < c + m && y > b - m && y < e + m;
  const SQUARE = (() => { const f = placed.find(p => p[4] === 'Fountain'); return f ? [(f[0] + f[2])/2, (f[1] + f[3])/2] : [304, 222]; })();
  // ---- forest, woods, hedges
  const cleared = (x, y) => inSite(x, y, 4) || NEWROADS.some(pl => near(pl, x, y, 6) < pl.w + 4.5);
  const forestRaw = (x, y) => (y < 66 + 30*fbm(x/50, y/50, 21) - 12 && !(Math.abs(x - sv(y)) < 34 + 10*fbm(y/30, 1, 27) && y > 18))
    || Math.hypot((x - 105)/(90 + 25*fbm(x/30, y/30, 28)), (y - 470)/60) < 1 || (fbm(x/48, y/48, 26) > 0.72 && y > 90);
  const forestM = (x, y) => forestRaw(x, y) && !inSettle(x, y, 14) && fbm(x/14, y/14, 23) < 0.74 && !roadNear(x, y, 2.5) && !TRACKS.some(pl => near(pl, x, y, 4) < 3.6) && Math.abs(streamV(x, y)) > hw(x) + 2.5 && !cleared(x, y) && !PROBE(x, y, 6);
  const HEDGES = [curve([[30, 262], [70, 270], [120, 266], [150, 282]]), curve([[230, 330], [262, 352], [256, 400], [272, 450]]), curve([[440, 250], [470, 262], [500, 252]]), curve([[350, 120], [380, 150], [372, 196]]),
    curve([[470, 400], [520, 410], [560, 440], [620, 430]]), curve([[20, 200], [60, 190], [100, 205]]), curve([[440, 300], [452, 330], [470, 360]])];
  const hedgeM = (x, y) => HEDGES.some(pl => near(pl, x, y, 2.4) < 1.0 + 0.6*fbm(x/3, y/3, 24)) && fbm(x/9, y/9, 25) < 0.74 && !roadNear(x, y, 1) && !cleared(x, y);
  // ---- fields: blocks of strips along the slope
  const seeds = []; for (let i = 0; i < 3000 && seeds.length < 80; i++){ const x = r()*W, y = r()*D; if (seeds.every(s => Math.hypot(s.x - x, s.y - y) > 36)){ const gx = base0(x + 3, y) - base0(x - 3, y), gy = base0(x, y + 3) - base0(x, y - 3), g = Math.hypot(gx, gy);
      const a = g > 0.8 ? Math.atan2(gx, -gy) : (r() - 0.5)*1.4; seeds.push({x, y, a:a + (r() - 0.5)*0.25, w:10 + r()*10, id:seeds.length, past:r() < 0.18}); } }
  const CROPS = ['wheat', 'wheat', 'wheat', 'barley', 'meadow', 'meadow', 'meadow', 'mown', 'mown', 'plough', 'maize'];
  const plot = (x, y) => { let a = null, b = null, da = 1e9, db = 1e9; for (const s of seeds){ const d = Math.hypot(x - s.x, (y - s.y)*1.15); if (d < da){ db = da; b = a; da = d; a = s; } else if (d < db){ db = d; b = s; } }
    const ca = Math.cos(a.a), sa = Math.sin(a.a), u = (x - a.x)*ca + (y - a.y)*sa, v = -(x - a.x)*sa + (y - a.y)*ca, k = Math.floor(v/a.w), f = v/a.w - k;
    return {s:a, edge:(db - da)/2, u, v, k, f, crop:a.past ? 'pasture' : CROPS[Math.floor(hsh(a.id, k, 51)*CROPS.length)]}; };
  const pastureM = (x, y) => { const fe = 66 + 30*fbm(x/50, y/50, 21) - 12; return (y > fe && y < fe + 46 && fbm(x/70, 3, 29) > 0.42) || (Math.abs(x - sv(y)) < 44 && y < 230 && y > 20); };
  // ---- what lies at a point
  const kindAt = (x, y) => {
    if (inSite(x, y, 0)) return ['site', Math.min(x - SITES.find(s => inBox(x, y, s, 0))[0], 99)]; if (inSite(x, y, 1.4)) return ['earth', 0];
    for (const pl of NEWROADS){ const d = near(pl, x, y, 6); if (d < pl.w) return ['newroad', d]; if (d < pl.w + 1.3) return ['earth', 0]; if (d < pl.w + 4.5 && forestRaw(x, y)) return ['stumps', d]; }
    for (const pl of ROADS){ const d = near(pl, x, y, 4); if (d < pl.w) return ['road', d, pl.w]; }
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
  const speck = (x, y, q, s) => hsh(Math.floor(x/q), Math.floor(y/q), s);
  const surface = (x, y, k) => { const [kind, a, b] = k, n1 = fbm(x/14, y/14, 61), n2 = fbm(x/3, y/3, 62);
    switch (kind){
      case 'road': { let c = mul(col('#6d7176'), 0.94 + 0.1*n2); if (LOD >= 2 && fbm(x/4, y/4, 63) > 0.72) c = mul(c, 0.9); if (a > b - 0.4) c = mixC(c, col('#a59b86'), clamp((a - b + 0.4)/0.4, 0, 1)*(0.5 + 0.5*speck(x, y, 0.2, 64)));
        if (LOD >= 3 && speck(x, y, 0.1, 65) > 0.93) c = mul(c, 0.88); if (LOD >= 3 && Math.abs(fbm(x/2.5, y/2.5, 66) - 0.5) < 0.006 && fbm(x/12, y/12, 107) > 0.55) c = mul(c, 0.86); return c; }
      case 'newroad': { let c = mul(col('#5e6266'), 0.97 + 0.05*n2); if (a > 2.2) c = mixC(c, col('#9a9282'), 0.6); if (LOD >= 3 && speck(x, y, 0.1, 100) > 0.95) c = mul(c, 1.1); return c; }
      case 'site': { let c = mul(col('#b3ab9c'), 0.93 + 0.1*n2); if (LOD >= 2 && Math.abs(Math.sin((x + 4*Math.sin(y/6))*0.7)) > 0.95) c = mul(c, 0.88); if (LOD >= 3 && speck(x, y, 0.1, 101) > 0.85) c = mul(c, speck(x, y, 0.1, 102) > 0.5 ? 1.1 : 0.88); return c; }
      case 'earth': return mul(col('#8a6a48'), 0.9 + 0.15*n2*(LOD >= 3 ? speck(x, y, 0.15, 103) + 0.5 : 1));
      case 'stumps': { let c = mixC(col('#7a8a4e'), col('#8a7a52'), n2); if (LOD >= 2 && speck(x, y, 0.6, 104) > 0.9 && Math.hypot(((x/0.6) % 1 + 1) % 1 - 0.5, ((y/0.6) % 1 + 1) % 1 - 0.5) < 0.32) c = col(LOD >= 3 ? '#c9a878' : '#a08868'); return c; }
      case 'square': { let c = mul(col('#b9b1a2'), 0.94 + 0.08*n1); if (LOD >= 2){ const u = x*2.6, v = y*2.6 + (Math.floor(x*2.6) % 2)*0.5; if ((u % 1 + 1) % 1 < (LOD >= 3 ? 0.12 : 0.2) || (v % 1 + 1) % 1 < (LOD >= 3 ? 0.12 : 0.2)) c = mul(c, 0.86); else if (LOD >= 3) c = mul(c, 0.94 + 0.12*hsh(Math.floor(u), Math.floor(v), 105)); } return c; }
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
      case 'garden': { const p = b, bed = y > p[3] + 0.8 && y < p[3] + 3.8 && x > p[0] && x < p[0] + 5; if (bed){ let c = col('#8a6a4a'); if (LOD >= 2 && ((y*2) % 1 + 1) % 1 < 0.45) c = mixC(c, col('#5f8a3c'), LOD >= 3 ? 0.6 + 0.4*speck(x, y, 0.15, 79) : 0.5); return c; }
        let c = mixC(col('#8fba68'), col('#9cc472'), n1); if (LOD >= 3 && speck(x, y, 0.1, 80) > 0.97) c = [[240, 240, 235], [232, 200, 70], [200, 90, 110]][Math.floor(speck(x, y, 0.1, 81)*3)]; return c; }
      case 'pasture': { let c = mixC(col('#7aa652'), col('#8db55e'), n1); c = mul(c, 0.94 + 0.1*n2);
        const ph = base0(x, y)*1.4 + fbm(x/10, y/10, 82)*2; if (LOD >= 3 && fbm(x/30, y/30, 106) > 0.6 && Math.abs((ph % 1 + 1) % 1 - 0.5) < 0.03) c = mixC(c, col('#a8996e'), 0.55);
        if (LOD >= 3){ const t = speck(x, y, 0.1, 83); if (t > 0.86) c = mul(c, 0.84); else if (t < 0.05) c = mul(c, 1.12); if (speck(x, y, 0.3, 84) > 0.996 && Math.hypot(((x/0.3) % 1 + 1) % 1 - 0.5, ((y/0.3) % 1 + 1) % 1 - 0.5) < 0.38) c = col('#7a5a3e'); if (speck(x, y, 0.1, 85) > 0.992) c = [236, 236, 230]; } return c; }
      case 'margin': { let c = mixC(col('#8ab260'), col('#a3bf72'), n2); if (LOD >= 3 && speck(x, y, 0.1, 86) > 0.93) c = speck(x, y, 0.1, 87) > 0.5 ? [228, 220, 120] : [214, 214, 220]; return c; }
      default: { const p = b, v = p.v, wv = fbm(x/9, y/9, 88), row = (q, w) => ((v/q) % 1 + 1) % 1 < w; let c;
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
  for (let i = 0; i < 26; i++){ const pl = ROADS[Math.floor(r()*ROADS.length)], [px, py] = pl[Math.floor(r()*pl.length)], x = px + (r() - 0.5)*2*(pl.w + 1.2), y = py + (r() - 0.5)*2; if (PROBE(x, y, 0.5) || x < 2 || y < 2 || x > W - 3 || y > D - 3) continue; K.figure(H, K.VILL[i % 20], x, y, i % 2 ? K.POSE.walkA : null, hb(x + 0.75, y + 0.75)); }
  K.place(H, 'Post bus', 352, 236.6, hb(356, 238)); K.place(H, 'Tractor with manure spreader', 104, 247, hb(108, 248));
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
