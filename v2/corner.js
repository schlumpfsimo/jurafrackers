/* A test corner for realistic scenery: forest on the slope with a ragged edge and a logging track, a wooded pasture with
   lone spruces and a dry stone wall, limestone showing through, field strips along the slope, hedges with oaks, a meandering
   stream with gravel banks and a bridge, and a small hamlet with gardens. The ground is worked out for every pixel.
   Three levels of detail: s < 4 far (masses only), s < 8 middle (rows, fences, shrubs), s ≥ 8 close (tufts, flowers, stones). */
const Q = new URLSearchParams(location.search), S = +(Q.get('s') || 10), Z = +(Q.get('z') || 1), LOD = S >= 8 ? 3 : S >= 4 ? 2 : 1;
const W = 140, D = 100;
const SCENE = ART.compose(W, D, (H, K) => {
  const r = K.rng(11), hsh = K.hsh, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = t => t*t*(3 - 2*t), lerp = (a, b, t) => a + (b - a)*t;
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = hsh(xi, yi, s), b = hsh(xi + 1, yi, s), c = hsh(xi, yi + 1, s), d = hsh(xi + 1, yi + 1, s);
    return a + (b - a)*fx + (c - a)*fy + (a - b - c + d)*fx*fy; };
  const fbm = (x, y, s) => vn(x, y, s)*0.5 + vn(x*2.03 + 5.1, y*2.03, s + 1)*0.3 + vn(x*4.1, y*4.1 + 2.7, s + 2)*0.2;
  // paths: smooth curves through a few points, as polylines with a bounding box
  const curve = pts => { const out = []; for (let i = 0; i < pts.length - 1; i++){ const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
      for (let k = 0; k < n; k++){ const t = k/n, t2 = t*t, t3 = t2*t, f = (a, b, c, d) => 0.5*(2*b + (-a + c)*t + (2*a - 5*b + 4*c - d)*t2 + (-a + 3*b - 3*c + d)*t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
    out.push(pts[pts.length - 1]); const xs = out.map(p => p[0]), ys = out.map(p => p[1]); out.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; return out; };
  const near = (pl, x, y, lim) => { const [a, b, c, d] = pl.box; if (x < a - lim || x > c + lim || y < b - lim || y > d + lim) return 1e9; let best = 1e9;
    for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], vx = bx - ax, vy = by - ay, t = clamp(((x - ax)*vx + (y - ay)*vy)/(vx*vx + vy*vy || 1), 0, 1); best = Math.min(best, Math.hypot(x - ax - vx*t, y - ay - vy*t)); } return best; };
  const ROAD = curve([[-2, 59], [30, 56], [60, 58], [95, 53], [142, 50]]), LANE = curve([[95, 53], [99, 45], [103, 38], [112, 33]]);
  const TRACKS = [curve([[58, 58], [60, 70], [63, 85], [60, 102]]), curve([[24, 57], [28, 46], [42, 41], [62, 42]])], LOGWAY = curve([[62, 42], [66, 30], [72, 16], [78, -2]]);
  const WALL = curve([[14, 43], [32, 40], [50, 39], [64, 40.5], [82, 37]]), HEDGES = [curve([[0, 67], [22, 65], [44, 68]]), curve([[82, 60], [87, 72], [84, 88], [86, 102]]), curve([[108, 57], [126, 64], [142, 62]])];
  // the stream meanders across the front
  const ys = x => 79 + 6*Math.sin(x/17) + 2.5*Math.sin(x/6.5 + 1), ys2 = x => -6/289*Math.sin(x/17) - 2.5/42.25*Math.sin(x/6.5 + 1), hw = x => 1.9 + 0.5*Math.sin(x/11 + 2);
  const streamV = (x, y) => { const dy = 6/17*Math.cos(x/17) + 2.5/6.5*Math.cos(x/6.5 + 1); return (y - ys(x))/Math.sqrt(1 + dy*dy); };
  // the land: a forested slope at the back, the valley, a gentle rise in front
  const base0 = (x, y) => 17*sm(clamp((46 - y)/46, 0, 1)) + 3*sm(clamp((y - 88)/12, 0, 1)) + 5*(fbm(x/34, y/34, 3) - 0.5) + 1.6*(fbm(x/9, y/9, 4) - 0.5);
  const rock = (x, y) => { const s = Math.hypot(base0(x + 1, y) - base0(x - 1, y), base0(x, y + 1) - base0(x, y - 1))/2, n = fbm(x/7, y/7, 9); return s > 0.32 && y > 14 && y < 44 && x < 86 ? clamp((n - 0.62)*5, 0, 1) : 0; };
  const flats = []; const level = (x0, y0, x1, y1) => { const z = base0((x0 + x1)/2, (y0 + y1)/2); flats.push([x0, y0, x1, y1, z]); return z; };
  const ground = (x, y) => { let h = base0(x, y); for (const [x0, y0, x1, y1, z] of flats){ const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)); if (d < 4){ const t = sm(d/4); h = z + (h - z)*t; } }
    const v = Math.abs(streamV(x, y)), w = hw(x); if (v < w + 2.6) h -= 1.15*(v < w ? 1 : 1 - sm((v - w)/2.6));
    const rk = rock(x, y); if (rk) h += rk*0.9*fbm(x/1.6, y/1.6, 12); const dw = near(WALL, x, y, 1); if (dw < 0.45) h += 0.85*Math.sqrt(1 - (dw/0.45)**2);
    return h; };
  // the hamlet
  const placed = [], items = [], casters = [], yards = [];
  const fits = (x, y, w, d) => placed.every(([a, b, c, e]) => x + w + 2 < a || x - 2 > c || y + d + 2 < b || y - 2 > e) && [ROAD, LANE].every(pl => { for (let u = 0; u <= 1; u += 0.25) for (let v = 0; v <= 1; v += 0.25) if (near(pl, x + w*u, y + d*v, 4) < 3.2 || Math.abs(streamV(x + w*u, y + d*v)) < hw(x + w*u) + 3.5) return false; return true; });
  const building = (name, x, y, recol) => { const m = K.M.find(q => q.n === name); if (!fits(x, y, m.W, m.D)) return false; placed.push([x, y, x + m.W, y + m.D, name]); const z = level(x - 1, y - 1, x + m.W + 1, y + m.D + 1);
    items.push(() => K.place(H, name, x, y, z, recol, true)); const zt = Math.max(...m.parts.filter(q => q.t === 'blk').map(q => q.z + Math.max(...q.h)), 3); casters.push([x + 0.6, y + 0.6, x + m.W - 0.6, y + m.D - 0.6, zt*0.8]); return true; };
  const nearBy = (name, x, y, recol) => { for (let rad = 0; rad < 14; rad += 1) for (let a = 0; a < 8; a++) if (building(name, x + Math.cos(a*0.785)*rad, y + Math.sin(a*0.785)*rad, recol)) return; };
  nearBy('Farm', 108, 57); nearBy('Chapel', 92, 30); nearBy('House variant 2', 114, 26, {'#a8473a':'#9a5a3a'}); nearBy('House, two storeys', 124, 38); nearBy('House variant 5', 84, 40); nearBy('House, small', 88, 61);
  for (const [x0, y0, x1, y1, name] of placed) if (name.startsWith('Farm')) yards.push([x0 - 3, y0 + (y1 - y0) - 1, x1 + 2, y1 + 7]);
  const inBox = (x, y, [a, b, c, e], m) => x > a - m && x < c + m && y > b - m && y < e + m;
  // forest: closed crowns of spruce and beech on the slope; a ragged edge, clearings, the logging track; hedges of small crowns
  const forestM = (x, y) => (y < 20 + 9*fbm(x/16, y/16, 21) - 3 || (x < 20 + 8*fbm(x/12, y/12, 22) && y < 50)) && !(x > 86 && y > 4) && fbm(x/13, y/13, 23) < 0.7 && near(LOGWAY, x, y, 3) > 2.6 && near(TRACKS[1], x, y, 3) > 2.4;
  const hedgeM = (x, y) => HEDGES.some(pl => near(pl, x, y, 2.4) < 1.1 + 0.8*fbm(x/3, y/3, 24)) && fbm(x/9, y/9, 25) < 0.74;
  const CG = 3.5, crowns = new Map(), HG = 1.7, hcrowns = new Map();
  const crownAt = (i, j) => { const k = i*1000 + j; if (crowns.has(k)) return crowns.get(k); const cx = (i + 0.5 + 0.8*(hsh(i, j, 31) - 0.5))*CG, cy = (j + 0.5 + 0.8*(hsh(i, j, 32) - 0.5))*CG;
    const c = forestM(cx, cy) ? {cx, cy, sp:hsh(i, j, 33) < 0.35 + 0.5*clamp((30 - cy)/30, 0, 1), s:0.85 + 0.35*hsh(i, j, 34)} : null;
    if (c){ c.r = (c.sp ? 2.2 : 3.0)*c.s; c.ht = (c.sp ? 10.5 : 7.6)*c.s; const inMap = (x, y) => x > W || y > D || forestM(x, y); c.edge = !inMap(cx + 4.5, cy) || !inMap(cx, cy + 4.5) || !inMap(cx + 3.2, cy + 3.2); } crowns.set(k, c); return c; };
  const hcrownAt = (i, j) => { const k = i*1000 + j; if (hcrowns.has(k)) return hcrowns.get(k); const cx = (i + 0.5 + 0.7*(hsh(i, j, 41) - 0.5))*HG, cy = (j + 0.5 + 0.7*(hsh(i, j, 42) - 0.5))*HG;
    const c = hedgeM(cx, cy) ? {cx, cy, r:1.5 + 0.4*hsh(i, j, 43), ht:2.3 + 1.3*hsh(i, j, 44)} : null; hcrowns.set(k, c); return c; };
  // canopy over the ground: {h, kind, d (0 at the crown top, 1 at its rim)}
  const canopy = (x, y) => { let best = null, bh = 0;
    for (let i = Math.floor(x/CG) - 1; i <= Math.floor(x/CG) + 1; i++) for (let j = Math.floor(y/CG) - 1; j <= Math.floor(y/CG) + 1; j++){ const c = null; if (!c) continue; const d = Math.hypot(x - c.cx, y - c.cy)/c.r; if (d >= 1) continue;
      const h = c.sp ? c.ht*(1 - 0.62*d) - 0.5*((d*6.5) % 1) : c.ht - 2.6*d*d; if (h > bh){ bh = h; best = {h, kind:c.sp ? 'spruce' : 'beech', d}; } }
    for (let i = Math.floor(x/HG) - 1; i <= Math.floor(x/HG) + 1; i++) for (let j = Math.floor(y/HG) - 1; j <= Math.floor(y/HG) + 1; j++){ const c = hcrownAt(i, j); if (!c) continue; const d = Math.hypot(x - c.cx, y - c.cy)/c.r; if (d >= 1) continue;
      const h = c.ht - 1.3*d*d; if (h > bh){ bh = h; best = {h, kind:'hedge', d}; } }
    return best; };
  // fields: blocks of strips that follow the slope; each strip has its own crop
  const seeds = []; for (let i = 0; i < 400 && seeds.length < 11; i++){ const x = r()*W, y = 40 + r()*62; if (seeds.every(s => Math.hypot(s.x - x, s.y - y) > 20)){ const gx = base0(x + 2, y) - base0(x - 2, y), gy = base0(x, y + 2) - base0(x, y - 2), g = Math.hypot(gx, gy);
      const a = g > 0.6 ? Math.atan2(gx, -gy) : (r() - 0.5)*1.2; seeds.push({x, y, a:a + (r() - 0.5)*0.25, w:9 + r()*8, id:seeds.length}); } }
  const CROPS = ['wheat', 'wheat', 'wheat', 'barley', 'meadow', 'meadow', 'mown', 'mown', 'plough', 'maize'];
  const plot = (x, y) => { let a = null, b = null, da = 1e9, db = 1e9; for (const s of seeds){ const d = Math.hypot(x - s.x, (y - s.y)*1.2); if (d < da){ db = da; b = a; da = d; a = s; } else if (d < db){ db = d; b = s; } }
    const ca = Math.cos(a.a), sa = Math.sin(a.a), u = (x - a.x)*ca + (y - a.y)*sa, v = -(x - a.x)*sa + (y - a.y)*ca, k = Math.floor(v/a.w), f = v/a.w - k;
    return {s:a, edge:(db - da)/2, u, v, k, f, crop:CROPS[Math.floor(hsh(a.id, k, 51)*CROPS.length)]}; };
  // what lies at a point
  const pastureM = (x, y) => (y < 41 && y > 16 && x < 86) || (x < 46 && y > 68 && y < 96);
  const kindAt = (x, y) => {
    const dr = near(ROAD, x, y, 4); if (dr < 2.7) return ['road', dr]; const dl = near(LANE, x, y, 3); if (dl < 1.9) return ['road', dl + 0.8];
    const v = streamV(x, y), w = hw(x); if (Math.abs(v) < w) return ['water', Math.abs(v)/w, v]; if (Math.abs(v) < w + 1.3 && v*ys2(x) > 0 && Math.abs(v) < w + 1.3*(0.4 + 0.6*vn(x/5, 0, 52))) return ['gravel', 0]; if (Math.abs(v) < w + 2.4) return ['bank', Math.abs(v) - w];
    for (const pl of TRACKS) { const dt = near(pl, x, y, 2); if (dt < 1.45) return ['track', dt, x, y]; } const dg = near(LOGWAY, x, y, 2); if (dg < 1.3) return ['track', dg, x, y];
    if (near(WALL, x, y, 1) < 0.45) return ['wall', 0]; if (dr < 4.2 || dl < 3.2) return ['verge', Math.min(dr - 2.7, dl - 1.9)];
    for (const p of placed) if (inBox(x, y, p, 0)) return ['pad', 0]; for (const yd of yards) if (inBox(x, y, yd, 0)) return ['yard', 0]; for (const p of placed) if (!p[4].startsWith('Farm') && !p[4].startsWith('Chapel') && inBox(x, y, p, 4.5)) return ['garden', 0, p];
    if (forestM(x, y)) return ['floor', 0];
    if (rock(x, y) > 0.35) return ['rock', 0]; if (pastureM(x, y)) return ['pasture', 0];
    const p = plot(x, y); if (p.edge < 0.9) return ['margin', p.edge]; if (Math.min(p.f, 1 - p.f)*p.s.w < 0.35) return ['margin', 0.5]; return [p.crop, 0, p]; };
  // shadows and contact shading from buildings and trees
  let CB = null; const bucket = () => { CB = new Map(); for (const q of casters){ const [a, b, c2, e, h] = q; for (let i = Math.floor((a - h - 2)/8); i <= Math.floor((c2 + 2)/8); i++) for (let j = Math.floor((b - h*1.9 - 2)/8); j <= Math.floor((e + 2)/8); j++){ const k = i*1000 + j; if (!CB.has(k)) CB.set(k, []); CB.get(k).push(q); } } };
  const objShade = (x, y) => { if (!CB) bucket(); let sh = false, d = 1e9; for (const [a, b, c2, e, h] of CB.get(Math.floor(x/8)*1000 + Math.floor(y/8)) || []){ d = Math.min(d, Math.hypot(Math.max(a - x, 0, x - c2), Math.max(b - y, 0, y - e)));
      if (!sh && !(x > c2 + 1 || y > e + 1 || x < a - h || y < b - h*1.9)) for (let t = 0.3; t <= h; t += 0.5){ const px = x + 0.345*t, py = y + 0.636*t; if (px > a && px < c2 && py > b && py < e){ sh = true; break; } } } return [sh, d]; };
  // the colour of each kind of ground, with more texture the closer we are
  const hex = c => c.match(/\w\w/g).map(v => parseInt(v, 16)), C = {};
  const col = c => C[c] || (C[c] = hex(c)), mul = (c, f) => [c[0]*f, c[1]*f, c[2]*f], mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const speck = (x, y, q, s) => hsh(Math.floor(x/q), Math.floor(y/q), s);
  const surface = (x, y, k) => { const [kind, a, b] = k, n1 = fbm(x/14, y/14, 61), n2 = fbm(x/3, y/3, 62);
    switch (kind){
      case 'road': { let c = mul(col('#6d7176'), 0.94 + 0.1*n2); if (LOD >= 2 && fbm(x/4, y/4, 63) > 0.72) c = mul(c, 0.9); if (a > 2.3) c = mixC(c, col('#a59b86'), clamp((a - 2.3)/0.4, 0, 1)*(0.5 + 0.5*speck(x, y, 0.2, 64)));
        if (LOD >= 3 && speck(x, y, 0.1, 65) > 0.93) c = mul(c, 0.88); if (LOD >= 3 && Math.abs(fbm(x/2.5, y/2.5, 66) - 0.5) < 0.012) c = mul(c, 0.75); return c; }
      case 'track': { const pl = [...TRACKS, LOGWAY].reduce((m, p) => near(p, x, y, 2) < m.d ? {p, d:near(p, x, y, 2)} : m, {p:null, d:1e9}); const rut = Math.abs(a - 0.72) < 0.28;
        let c = rut ? mul(col('#9a8361'), 0.92 + 0.12*n2) : a < 0.42 ? mixC(col('#8fae62'), col('#a89470'), 0.3*n2) : mixC(col('#a89470'), col('#8fae62'), clamp((a - 1.0)/0.45, 0, 1));
        if (LOD >= 3 && rut && fbm(x/3, y/3, 67) > 0.74) c = mixC(c, col('#7f8f99'), 0.7); if (LOD >= 3 && !rut && speck(x, y, 0.1, 68) > 0.85) c = mul(c, 1.08); return c; }
      case 'water': { let c = mixC(col('#6b9ab8'), col('#4a7896'), sm(1 - a)); if (LOD >= 2 && Math.abs(Math.sin(x*1.3 + fbm(x/4, y/2, 69)*6)) > 0.97 && fbm(x/2, y/2, 70) > 0.5) c = mixC(c, col('#cfe2ec'), 0.6); return c; }
      case 'gravel': return mul(col('#bcae94'), LOD >= 3 ? 0.88 + 0.22*speck(x, y, 0.12, 71) : 0.95 + 0.1*n2);
      case 'bank': { let c = mixC(col('#6f8d55'), col('#87a65c'), clamp(a/2.4, 0, 1)); if (LOD >= 3 && a < 1.4 && speck(x, y, 0.1, 72) > 0.7) c = mixC(c, speck(x, y, 0.1, 73) > 0.5 ? col('#b8b06a') : col('#4f6e3c'), 0.7); return c; }
      case 'wall': { let c = mul(col('#b4ada0'), 0.92 + 0.1*n2); if (LOD >= 3){ const row = Math.floor(y*5 + x*0.6), u = x*3.6 + row*0.5; if ((u % 1 + 1) % 1 < 0.13 || ((y*5 + x*0.6) % 1 + 1) % 1 < 0.16) c = mul(c, 0.7); else c = mul(c, 0.9 + 0.2*hsh(Math.floor(u), row, 74)); } return c; }
      case 'rock': { let c = mul(col('#c3bcae'), 0.9 + 0.15*n2); if (LOD >= 2 && Math.abs(fbm(x/2, y/2, 75) - 0.5) < 0.02) c = mul(c, 0.72); if (LOD >= 3 && speck(x, y, 0.15, 76) > 0.8) c = mixC(c, col('#7e9a5a'), 0.6); return c; }
      case 'verge': { let c = mixC(col('#90b064'), col('#9fba70'), n1); if (LOD >= 3 && speck(x, y, 0.1, 77) > 0.88) c = mul(c, 0.86); return c; }
      case 'floor': { let c = mixC(col('#4c6a3a'), col('#5e5a3c'), fbm(x/5, y/5, 98)); if (LOD >= 3 && speck(x, y, 0.1, 99) > 0.85) c = mul(c, 1.15); return mul(c, 0.85); }
      case 'pad': return mul(col('#b5a98c'), 0.93 + 0.1*n2);
      case 'yard': { let c = mul(col('#b5a98c'), 0.93 + 0.1*n2); if (LOD >= 2 && Math.abs(Math.sin((x + 3*Math.sin(y/4))*0.9)) > 0.94) c = mul(c, 0.86); if (LOD >= 3 && speck(x, y, 0.1, 78) > 0.9) c = mul(c, 1.1); return c; }
      case 'garden': { const p = b, bed = y > p[3] + 0.8 && y < p[3] + 3.8 && x > p[0] && x < p[0] + 5; if (bed){ let c = col('#8a6a4a'); if (LOD >= 2 && ((y*2) % 1 + 1) % 1 < 0.45) c = mixC(c, col('#5f8a3c'), LOD >= 3 ? 0.6 + 0.4*speck(x, y, 0.15, 79) : 0.5); return c; }
        let c = mixC(col('#8fba68'), col('#9cc472'), n1); if (LOD >= 3 && speck(x, y, 0.1, 80) > 0.97) c = [[240, 240, 235], [232, 200, 70], [200, 90, 110]][Math.floor(speck(x, y, 0.1, 81)*3)]; return c; }
      case 'pasture': { let c = mixC(col('#7aa652'), col('#8db55e'), n1); c = mul(c, 0.94 + 0.1*n2);
        const ph = base0(x, y)*1.4 + fbm(x/10, y/10, 82)*2; if (LOD >= 2 && Math.abs((ph % 1 + 1) % 1 - 0.5) < 0.035) c = mixC(c, col('#a8996e'), 0.55);
        if (LOD >= 3){ const t = speck(x, y, 0.1, 83); if (t > 0.86) c = mul(c, 0.84); else if (t < 0.05) c = mul(c, 1.12); if (speck(x, y, 0.3, 84) > 0.996) c = Math.hypot(((x/0.3) % 1 + 1) % 1 - 0.5, ((y/0.3) % 1 + 1) % 1 - 0.5) < 0.38 ? col('#7a5a3e') : c; if (speck(x, y, 0.1, 85) > 0.992) c = [236, 236, 230]; } return c; }
      case 'margin': { let c = mixC(col('#8ab260'), col('#a3bf72'), n2); if (LOD >= 3 && speck(x, y, 0.1, 86) > 0.93) c = speck(x, y, 0.1, 87) > 0.5 ? [228, 220, 120] : [214, 214, 220]; return c; }
      default: { const p = b, u = p.u, v = p.v, wv = fbm(x/9, y/9, 88), row = (q, w) => ((v/q) % 1 + 1) % 1 < w; let c;
        if (kind === 'wheat' || kind === 'barley'){ c = mixC(col(kind === 'wheat' ? '#dcbf68' : '#d4c886'), col(kind === 'wheat' ? '#e8d48e' : '#e0d6a0'), wv); c = mul(c, 0.95 + 0.08*n2);
          if (LOD >= 2 && Math.abs(((v % 12) + 12) % 12 - 6) < (LOD >= 3 ? 0.25 : 0.4)) c = mul(c, 0.88); if (LOD >= 3 && row(0.3, 0.3)) c = mul(c, 0.94); if (LOD >= 3 && speck(x, y, 0.1, 89) > 0.995) c = [200, 60, 50]; }
        else if (kind === 'meadow'){ c = mixC(col('#86b45c'), col('#9cc26a'), wv); c = mul(c, 0.94 + 0.1*n2); if (LOD >= 3){ const t = speck(x, y, 0.1, 90); if (t > 0.9) c = mul(c, 0.86); if (t > 0.985) c = [[240, 240, 232], [236, 206, 70], [176, 120, 190]][Math.floor(speck(x, y, 0.1, 91)*3)]; } }
        else if (kind === 'mown'){ const sw = ((v/1.8) % 2 + 2) % 2 < 1; c = mixC(col('#b2c67c'), col('#c4d08e'), wv); if (LOD >= 2) c = mul(c, sw ? 1.04 : 0.95); if (LOD >= 2 && Math.abs(((v % 7.2) + 7.2) % 7.2 - 3.6) < 0.45) c = mixC(c, col('#d8c68a'), 0.7); if (LOD >= 3 && speck(x, y, 0.1, 92) > 0.9) c = mul(c, 0.92); }
        else if (kind === 'plough'){ c = mul(col('#8f6e4e'), 0.92 + 0.12*wv); if (LOD >= 2 && row(0.45, 0.4)) c = mul(c, LOD >= 3 ? 0.84 : 0.92); if (LOD >= 3 && speck(x, y, 0.1, 93) > 0.9) c = mul(c, 1.12); }
        else { c = mul(col('#94744f'), 0.95 + 0.08*wv); if (LOD >= 2 && row(0.75, LOD >= 3 ? 0.35 : 0.5)) c = mixC(c, col('#6f9a48'), LOD >= 3 ? 0.85 : 0.5); }
        return mul(c, 0.96 + 0.06*n1); } } };
  const canopyCol = (x, y, cp) => { let c = cp.kind === 'spruce' ? col('#3d6a3e') : cp.kind === 'beech' ? col('#6b9a4a') : cp.kind === 'hedge' ? col('#5e8a44') : col('#3e5a34');
    c = mul(c, 0.92 + 0.14*fbm(x/6, y/6, 94)); if (cp.kind === 'beech' && fbm(x/20, y/20, 95) > 0.6) c = mixC(c, col('#88aa52'), 0.35);
    if (LOD >= 2){ const t = speck(x, y, LOD >= 3 ? 0.25 : 0.5, 96); if (t > 0.8) c = mul(c, 1.1); else if (t < 0.18) c = mul(c, 0.86); } return c; };
  items.forEach(f => f());
  // heights on a 0.5 m grid: the ground with crowns on top; a blurred copy for the shading of hollows
  const G = 0.5, nx = W/G, ny = D/G, gh = new Float32Array((nx + 1)*(ny + 1)), cp = new Array((nx + 1)*(ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++){ const x = i*G, y = j*G, c = canopy(x, y), o = j*(nx + 1) + i; cp[o] = c; gh[o] = ground(x, y) + (c ? c.h : 0); }
  const hh = (i, j) => gh[clamp(j, 0, ny)*(nx + 1) + clamp(i, 0, nx)];
  const hb = (x, y) => { const fx = x/G, fy = y/G, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return hh(i, j)*(1 - u)*(1 - v) + hh(i + 1, j)*u*(1 - v) + hh(i, j + 1)*(1 - u)*v + hh(i + 1, j + 1)*u*v; };
  const B2 = 2, bx = W/B2, by = D/B2, blur = new Float32Array((bx + 1)*(by + 1)); for (let j = 0; j <= by; j++) for (let i = 0; i <= bx; i++){ let s = 0, n = 0; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++){ s += hb((i + a)*B2, (j + b)*B2); n++; } blur[j*(bx + 1) + i] = s/n; }
  const blurAt = (x, y) => { const fx = clamp(x/B2, 0, bx - 1e-6), fy = clamp(y/B2, 0, by - 1e-6), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, q = (a, b) => blur[b*(bx + 1) + a];
    return q(i, j)*(1 - u)*(1 - v) + q(i + 1, j)*u*(1 - v) + q(i, j + 1)*(1 - u)*v + q(i + 1, j + 1)*u*v; };
  // trees and things that stand on the ground (not in the forest: that is the canopy)
  const tree = (x, y, kind, s) => { const f = kind === 's' ? K.spruce : kind === 'f' ? K.fruitTree : K.beech, ht = (kind === 's' ? 10.5 : kind === 'f' ? 4.2 : 7.6)*s, z = ground(x, y) - 0.15; casters.push([x - 1.1*s, y - 1.1*s, x + 1.1*s, y + 1.1*s, ht*0.85]);
    H.SD(x - 2.6*s, x + 2.6*s, y - 2.6*s, y + 2.6*s, 0, ht, (px, py, pz) => f(px - x, py - y, pz, s), {step:0.18, lift:z}); };
  const free = (x, y, m) => !placed.some(p => inBox(x, y, p, m)) && near(ROAD, x, y, 5) > 4 && near(LANE, x, y, 4) > 3 && Math.abs(streamV(x, y)) > hw(x) + 0.5 && !TRACKS.some(pl => near(pl, x, y, 3) > 0 && near(pl, x, y, 3) < 2.2) && !canopy(x, y);
  for (let i = 0; i < 300; i++){ const x = 4 + r()*82, y = 18 + r()*24; if (pastureM(x, y) && free(x, y, 3) && near(WALL, x, y, 3) > 2 && r() < 0.06) tree(x, y, 's', 0.8 + r()*0.45); }
  for (const pl of HEDGES) for (let i = 0; i < 3; i++){ const p = pl[Math.floor(r()*pl.length)]; if (p[0] > 2 && p[0] < W - 2 && p[1] < D - 2 && hedgeM(p[0], p[1])) tree(p[0], p[1], 'b', 1.15 + r()*0.25); }
  for (let i = 0; i < 26; i++){ const x = r()*W, v = (r() < 0.5 ? -1 : 1)*(hw(x) + 1.6 + r()*1.2), y = ys(x) + v; if (y < D - 3 && free(x, y, 3) && near(TRACKS[0], x, y, 4) > 3) tree(x, y, 'b', 0.6 + r()*0.25); }
  for (const [x0, y0, x1, y1, name] of placed) if (!name.startsWith('Farm') && !name.startsWith('Chapel')) for (let i = 0; i < 2; i++){ const x = x0 - 3 + r()*(x1 - x0 + 6), y = y0 - 3 + r()*(y1 - y0 + 6); if (free(x, y, 1)) tree(x, y, 'f', 0.85); }
  for (let i = 0; i <= W/CG; i++) for (let j = 0; j <= D/CG; j++){ const c = crownAt(i, j); if (c && c.cx > 0.5 && c.cy > 0.5 && c.cx < W - 0.5 && c.cy < D - 0.5) tree(c.cx, c.cy, c.sp ? 's' : 'b', c.s*(c.sp ? 1.05 : 1.1)); }
  if (LOD >= 2){ // shrubs along the forest edge
    for (let i = 0; i < 2500; i++){ const x = r()*W, y = r()*60; if (!forestM(x, y) && [[-2.5, 0], [0, -2.5]].some(([dx, dy]) => forestM(x + dx, y + dy)) && free(x, y, 2) && r() < 0.15){ const s = 0.32 + r()*0.18, z = ground(x, y) - 0.1;
      H.SD(x - 1.6*s*2.6, x + 1.6*s*2.6, y - 1.6*s*2.6, y + 1.6*s*2.6, 0, 8*s, (px, py, pz) => K.beech((px - x)/1.6, (py - y)/1.6, pz + 1.2*s*1.6, s), {step:0.12, lift:z}); } } }
  // the bridge where the farm track crosses the stream
  { let bxp = 0, bd = 1e9; for (let x = 50; x < 70; x += 0.1){ const d = near(TRACKS[0], x, ys(x), 3); if (d < bd){ bd = d; bxp = x; } } const yc = ys(bxp), w = hw(bxp), zb = base0(bxp, yc - w - 3) - 0.1, zf = base0(bxp, yc + w + 3) - 0.1, z = Math.max(zb, zf);
    H.B(bxp - 1.6, yc - w - 2.2, z - 0.2, 3.2, 2*w + 4.4, 0.32, '#8a6a4a'); for (const sx of [-1.6, 1.5]){ H.B(bxp + sx, yc - w - 2.2, z + 0.12, 0.1, 2*w + 4.4, 0.08, '#6a4a32'); if (LOD >= 2) for (let t = 0; t <= 2*w + 4.4; t += 1.1) H.B(bxp + sx, yc - w - 2.2 + t, z + 0.12, 0.1, 0.1, 0.9, '#6a4a32'); H.B(bxp + sx, yc - w - 2.2, z + 0.95, 0.1, 2*w + 4.4, 0.08, '#7a5a3a'); } }
  if (LOD >= 2){
    // logs stacked by the logging track; fences and a washing line in the gardens; a bench
    { const x = 70, y = 33, z = ground(x + 2, y + 1); for (let k = 0; k < 3; k++) for (let m = 0; m < 3 - k; m++) H.SD(x, x + 6, y + m*0.55 + k*0.27, y + m*0.55 + k*0.27 + 0.55, 0, 0.6, ((yy, zz) => (px, py, pz) => { const d = Math.hypot(py - yy, pz - zz); return d < 0.26 ? (px < x + 0.06 || px > x + 5.94 ? '#c9a070' : '#6a5038') : null; })(y + m*0.55 + k*0.27 + 0.27, 0.27 + k*0.46), {step:0.04, lift:z}); casters.push([x, y, x + 6, y + 1.6, 1.2]); }
    for (const [x0, y0, x1, y1, name] of placed){ if (name.startsWith('Farm') || name.startsWith('Chapel')) continue; const a = x0 - 4.5, b = y0 - 4.5, c = x1 + 4.5, e = y1 + 4.5, z = ground((a + c)/2, (b + e)/2);
      const side = (p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])/1.6); for (let i = 0; i <= n; i++){ const x = lerp(p[0], q[0], i/n), y = lerp(p[1], q[1], i/n); if (near(ROAD, x, y, 3) < 2.8 || near(LANE, x, y, 3) < 2.4) continue; H.B(x - 0.05, y - 0.05, ground(x, y), 0.1, 0.1, 0.95, '#7a5a3a'); if (i < n){ const x2 = lerp(p[0], q[0], (i + 1)/n), y2 = lerp(p[1], q[1], (i + 1)/n); if (near(ROAD, x2, y2, 3) < 2.8 || near(LANE, x2, y2, 3) < 2.4) continue; for (const zz of [0.4, 0.8]) H.L([[x, y, ground(x, y) + zz], [x2, y2, ground(x2, y2) + zz]], '#8a6a4a', 0.45); } } };
      side([a, e], [c, e]); side([c, b], [c, e]); side([a, b], [a, e]);
      const wx = c - 4, wy = e - 2.2, wz = ground(wx, wy); for (const px of [wx, wx + 3.4]) H.B(px, wy, wz, 0.08, 0.08, 1.8, '#7a5a3a'); H.L([[wx, wy, wz + 1.75], [wx + 3.4, wy, wz + 1.75]], '#d9d4c8', 0.3);
      [['#f4f2ec', 0.3], ['#c63a2c', 1.0], ['#2c5f93', 1.6], ['#e8b730', 2.3], ['#f4f2ec', 2.8]].forEach(([cc, t]) => H.B(wx + t, wy - 0.02, wz + 1.2, 0.45, 0.04, 0.55, cc));
      H.B(x0 + 1, y1 + 0.2, z, 2.4, 0.7, 1.1, '#a87a4c', {top:'#6a4a32'}); }
  }
  // animals and a few people
  for (let i = 0; i < 7; i++){ const x = 6 + r()*34, y = 72 + r()*20; if (!free(x, y, 2) || !pastureM(x, y)) continue; const z = ground(x + 1.4, y + 0.5); H.SD(x, x + 2.8, y, y + 1, 0, 1.5, (px, py, pz) => K.cowM(i % 2 ? {graze:1} : {})(px - x, py - y, pz), {step:0.06, lift:z}); casters.push([x + 0.3, y + 0.2, x + 2.5, y + 0.8, 1.3]); }
  for (let i = 0; i < 5; i++){ const x = 30 + r()*40, y = 22 + r()*14; if (free(x, y, 2) && pastureM(x, y)){ const z = ground(x + 0.7, y + 0.3); H.SD(x, x + 1.4, y, y + 0.6, 0, 0.9, (px, py, pz) => K.sheepFn({graze:1})(px - x, py - y, pz), {step:0.05, lift:z}); } }
  [[44, 56.2, K.VILL[2], K.POSE.walkA], [47, 56.6, K.VILL[7], K.POSE.walkB], [61, 66, K.VILL[11], K.POSE.walkA], [104, 44, K.VILL[4], null], [109, 33, K.VILL[9], {armR:'wave'}], [36, 74, K.VILL[14], {armR:'forward', legs:['fwd', 'back']}]].forEach(([x, y, o, p]) => K.figure(H, o, x, y, p, ground(x + 0.75, y + 0.75)));
  K.place(H, 'Tractor with manure spreader', 40, 58.3, ground(44, 59));
  // light: the sun's direction, soft shade on slopes, hollows and the feet of things darker, shadows of crowns and the slope, warm sun, cool shade, haze
  const L = [0.345, 0.636, 1], Ln = Math.hypot(...L), sx = 0.345/0.723, sy = 0.636/0.723, rise = 1/0.723*1;
  const colourAt = (x, y) => { const h = hb(x, y), o = clamp(Math.round(y/G), 0, ny)*(nx + 1) + clamp(Math.round(x/G), 0, nx), cpy = cp[o] && h - ground(x, y) > 0.3 ? cp[o] : null;
    let c = cpy ? canopyCol(x, y, cpy) : surface(x, y, kindAt(x, y));
    const steep = Math.hypot(hb(x + 0.25, y) - hb(x - 0.25, y), hb(x, y + 0.25) - hb(x, y - 0.25))/0.5;
    if (cpy && (steep > 1.6 || cpy.kind === 'under')) c = mul(cpy.kind === 'hedge' ? col('#3f5e33') : col('#2c4630'), 0.9 + 0.15*fbm(x/2, y/2, 97));
    const e = 0.3, gx = (hb(x + e, y) - hb(x - e, y))/(2*e), gy = (hb(x, y + e) - hb(x, y - e))/(2*e), n = [-gx, -gy, 1], lit = (n[0]*L[0] + n[1]*L[1] + n[2]*L[2])/(Math.hypot(...n)*Ln);
    let f = 0.6 + 0.48*lit; const step = LOD >= 3 ? 0.035 : 0.05; f = Math.round(f/step)*step;
    f *= 1 - clamp((blurAt(x, y) - h)/6, 0, 1)*0.28;
    let shade = false; for (let t = 0.6; t < 24; t += LOD >= 3 ? 0.5 : 0.9){ if (hb(x + sx*t, y + sy*t) > h + rise*t + 0.15){ shade = true; break; } }
    const [os, od] = objShade(x, y); if (os) shade = true; if (!cpy) f *= 1 - 0.3*Math.exp(-od/0.6);
    if (shade) f *= 0.74; const warm = clamp((f - 0.9)*3, 0, 1), cool = shade ? 1 : clamp((0.82 - f)*3, 0, 1);
    c = [c[0]*f*(1 + 0.05*warm - 0.05*cool), c[1]*f*(1 + 0.01*warm - 0.01*cool), c[2]*f*(1 - 0.07*warm + 0.09*cool)];
    const lum = (c[0] + c[1] + c[2])/3; c = c.map(v => lum + (v - lum)*1.18);
    const hz = clamp((150 - (x + y))/150, 0, 1)*0.14 + clamp(h/40, 0, 1)*0.06; return c.map((v, i) => Math.round(clamp(lerp(v, [208, 220, 228][i], hz), 0, 255))); };
  H.HF(W, D, G, gh, null, {base:6, colourAt});
});
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('bold 16px Silkscreen'), document.fonts.ready]) : Promise.resolve()).then(() => {
  // drawn at one resolution (s px per metre); zoom (z) only enlarges the pixels
  const c = document.getElementById('c'), win = Q.get('win') ? Q.get('win').split(',').map(Number) : null, n = document.createElement('canvas');
  let pad = 20, ox = D*S + pad, oy = 40*S + pad; n.width = Math.ceil((W + D)*S) + pad*2; n.height = Math.ceil((W + D)/2*S + 40*S) + pad*2;
  if (win){ const [x0, y0, x1, y1] = win, zt = 24; n.width = Math.ceil((x1 - y0 - x0 + y1)*S); n.height = Math.ceil(((x1 + y1 - x0 - y0)/2 + zt)*S); ox = -(x0 - y1)*S; oy = -((x0 + y0)/2 - zt - 2)*S; }
  const g = n.getContext('2d'); const sky = g.createLinearGradient(0, 0, 0, n.height); sky.addColorStop(0, '#dfe6ec'); sky.addColorStop(1, '#eef0ea'); g.fillStyle = sky; g.fillRect(0, 0, n.width, n.height);
  const t = Date.now(); ART.plates.length = 0; ART.texts.on = true; ART.texts.list.length = 0; const post = ART.draw(g, SCENE, 0, S, ox, oy); post.forEach(f => f());
  c.width = n.width*Z; c.height = n.height*Z; const gc = c.getContext('2d'); gc.imageSmoothingEnabled = false; gc.drawImage(n, 0, 0, c.width, c.height);
  gc.save(); gc.scale(Z, Z); for (const [m1, len, fs, skew, txt, tc] of ART.texts.list) ART.wallText(gc, m1, len, fs, skew, txt, tc); gc.restore();
  document.title += ' · ' + (Date.now() - t) + ' ms';
});
