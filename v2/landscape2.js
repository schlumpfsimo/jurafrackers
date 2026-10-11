/* A sleepy Jura valley before the drilling: real topography, a patchwork of fields with hedgerows, forest on the ridge,
   one compact town in the valley and small hamlets and farms on the slopes. Composed from the locked assets. */
const W = 320, D = 240, CELL = 2;
const SCENE = ART.compose(W, D, (H, K) => {
  const r = K.rng(7), hsh = K.hsh;
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, s = t => t*t*(3 - 2*t), a = hsh(xi, yi, 3), b = hsh(xi + 1, yi, 3), c = hsh(xi, yi + 1, 3), d = hsh(xi + 1, yi + 1, 3);
    return a + (b - a)*s(fx) + (c - a)*s(fy) + (a - b - c + d)*s(fx)*s(fy); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // the land: a ridge at the back, the valley floor, rolling hills in front
  const base = (x, y) => 34*Math.pow(clamp((78 - y)/70, 0, 1), 1.25) + 9*Math.pow(clamp((y - 172)/68, 0, 1), 1.2) + 7*(vn(x/38, y/38) - 0.5) + 3*(vn(x/14 + 9, y/14) - 0.5) + 4*Math.sin(x/47)*clamp((y - 150)/90, 0, 1);
  const flats = []; const level = (x0, y0, x1, y1, m) => { const z = base((x0 + x1)/2, (y0 + y1)/2); flats.push([x0, y0, x1, y1, z, m || 3]); return z; };
  const height = (x, y) => { let h = base(x, y); for (const [x0, y0, x1, y1, z, m] of flats){ const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1), d = Math.hypot(dx, dy); if (d < m){ const t = d/m; h = z + (h - z)*t*t*(3 - 2*t); } } return h; };
  // paths: valley road, side roads, farm tracks, the railway, the stream
  const ROAD = [[[0, 150], [60, 146], [105, 139], [150, 142], [195, 134], [250, 122], [320, 116]], [[100, 106], [150, 102], [200, 97]], [[180, 98], [182, 137]], [[150, 102], [150, 84]], [[150, 142], [158, 175], [170, 205], [176, 240]], [[195, 134], [232, 112], [254, 96]], [[60, 146], [56, 172], [52, 200]]];
  const TRACK = [[[52, 200], [96, 214], [140, 222]], [[254, 96], [286, 82]], [[105, 139], [92, 118], [70, 104]], [[250, 122], [276, 168], [282, 200]]];
  const RAIL = [[0, 92], [120, 90], [210, 86], [320, 80]], STREAM = [[0, 166], [40, 160], [80, 168], [120, 158], [160, 163], [200, 152], [240, 146], [280, 138], [320, 134]];
  const segD = (x, y, pl) => { let best = 1e9; for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], vx = bx - ax, vy = by - ay, t = clamp(((x - ax)*vx + (y - ay)*vy)/(vx*vx + vy*vy), 0, 1); best = Math.min(best, Math.hypot(x - ax - vx*t, y - ay - vy*t)); } return best; };
  // settlements: one compact town, three hamlets, farms on the slopes
  const placed = []; const fits = (x, y, w, d) => placed.every(([a, b, c, e]) => x + w + 1 < a || x - 1 > c || y + d + 1 < b || y - 1 > e) && ROAD.every(pl => { for (let u = 0; u <= 1; u += 0.25) for (let v = 0; v <= 1; v += 0.25) if (segD(x + w*u, y + d*v, pl) < 3.0) return false; return true; }) && segD(x + w/2, y + d/2, STREAM) > 7;
  const items = [], yard = [], casters = [];
  const building = (name, x, y, recol) => { const m = K.M.find(q => q.n === name); if (!fits(x, y, m.W, m.D)) return false; placed.push([x, y, x + m.W, y + m.D]); const z = level(x - 1, y - 1, x + m.W + 1, y + m.D + 1); items.push(() => K.place(H, name, x, y, z, recol, true)); yard.push([x, y, x + m.W, y + m.D, name.startsWith('Farm') ? '#c2b48a' : null]); const zt = Math.max(...m.parts.filter(q => q.t === 'blk').map(q => q.z + Math.max(...q.h)), 3); casters.push([x + 1, y + 1, x + m.W - 1, y + m.D - 1, zt*0.8]); return true; };
  const HOUSES = ['House, two storeys', 'House, small', ...K.VARS.house], FARMS = ['Farm', ...K.VARS.farm], house = () => HOUSES[Math.floor(r()*HOUSES.length)];
  const ROOFS = [null, {'#a8473a':'#b8553e'}, {'#a8473a':'#8e3f32'}, {'#a8473a':'#9a5a3a'}, {'#a8473a':'#c0624a'}];
  const village = (cx, cy, n, rad, extras) => { for (const [name, dx, dy] of extras) building(name, cx + dx, cy + dy);
    let tries = 0, k = 0; while (k < n && tries < 4000){ tries++; const a = r()*Math.PI*2, d = Math.sqrt(r())*rad, x = cx + Math.cos(a)*d - 5, y = cy + Math.sin(a)*d*0.8 - 5; if (building(house(), x, y, ROOFS[Math.floor(r()*ROOFS.length)])) k++; } };
  // the town grows along its streets: buildings line both sides, a second row behind, dense in the middle and thinning out
  const frontage = (names, cx, cy, rx, ry, prob, rows) => { let k = 0; for (const pl of ROAD) for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax)/L, uy = (by - ay)/L;
      for (let s = 3; s < L - 2; s += 3.5) for (const side of [-1, 1]) for (let row = 0; row < rows; row++){ const name = names ? names[k % names.length] : house(), m = K.M.find(q => q.n === name), off = 5.2 + (row ? 12 : 0) + Math.max(m.W, m.D)/2;
        const px = ax + ux*s - uy*side*off, py = ay + uy*s + ux*side*off, d = Math.hypot((px - cx)/rx, (py - cy)/ry); if (d > 1 || r() > prob*(1.2 - d)) continue;
        if (building(name, px - m.W/2, py - m.D/2, ROOFS[Math.floor(r()*ROOFS.length)])) k++; } } return k; };
  for (const [name, x, y] of [['Church', 132, 120], ['Mairie', 156, 118], ['Fountain', 152, 132], ['Railway station', 150, 74]]) building(name, x, y);
  frontage(['Village shop', 'Bank', 'La Feuille de la Faille', 'Gendarmerie', 'Canton house', 'School'], 150, 125, 50, 34, 2.5, 1);
  frontage(null, 150, 128, 62, 46, 1.6, 2);
  for (let i = 0; i < 5000; i++){ const x = 150 + (r()*2 - 1)*58, y = 126 + (r()*2 - 1)*40, d = Math.hypot((x - 150)/58, (y - 126)/40); if (d < 1 && r() < 1.1 - d) building(house(), x - 5, y - 5, ROOFS[Math.floor(r()*ROOFS.length)]); }
  village(64, 180, 9, 16, [['Chapel', 4, 4]]); village(252, 102, 8, 15, [['Chapel', -4, -2]]); village(214, 192, 6, 14, []);
  for (const [x, y] of [[20, 120], [96, 200], [276, 174], [292, 62], [30, 66], [120, 214]]) building(FARMS[Math.floor(r()*FARMS.length)], x, y);
  // fields: a patchwork of plots; hedges where two plots meet; some plots are woods
  const seeds = Array.from({length:90}, () => ({x:r()*W, y:r()*D, kind:r()}));
  const FIELD = ['#dcc274', '#e6d08a', '#b8cb8c', '#a3c178', '#8fb862', '#b0946a', '#d6c99c', '#c2d39a'];
  const plot = (x, y) => { let a = null, b = null, da = 1e9, db = 1e9; for (const s of seeds){ const d = Math.hypot((x - s.x)*1.0, (y - s.y)*1.3); if (d < da){ db = da; b = a; da = d; a = s; } else if (d < db){ db = d; b = s; } } return {s:a, edge:db - da}; };
  const forestAt = (x, y, h) => h > 19 + 5*(vn(x/20, y/20) - 0.5) || (plot(x, y).s.kind > 0.86);
  // colour of a ground cell
  const L = [0.345, 0.636, 1], Ln = Math.hypot(...L);
  const kindAt = (x, y) => { const h = height(x, y);
    if (ROAD.some(pl => segD(x, y, pl) < 2.6)) return 'road'; if (segD(x, y, STREAM) < 2.2) return 'water'; if (segD(x, y, STREAM) < 3.4) return 'bank';
    if (segD(x, y, RAIL) < 1.6) return 'rail'; if (TRACK.some(pl => segD(x, y, pl) < 1.4)) return 'track';
    if (yard.some(([a, b, c2, e, col]) => col && x > a + 2 && x < c2 - 2 && y > b + 2 && y < e - 2)) return 'yard';
    if (placed.some(([a, b, c2, e]) => x > a - 1 && x < c2 + 1 && y > b - 1 && y < e + 1)) return 'garden';
    if (forestAt(x, y, h)) return 'forest'; const p = plot(x, y); return p.edge < 2.2 ? 'hedge' : 'f' + Math.floor(p.s.kind*FIELD.length*0.999); };
  const shade = (c, f) => '#' + c.match(/\w\w/g).map(v => Math.round(parseInt(v, 16)*f).toString(16).padStart(2, '0')).join('');
  const BASE = {road:'#6b7075', water:'#5f8fb0', bank:'#7d8f6a', rail:'#9e978a', track:'#b39d72', yard:'#bdb08a', garden:'#9db383', forest:'#4e7a42', hedge:'#5f8a48'};
  let CB = null; const bucket = () => { CB = new Map(); for (const q of casters){ const [a, b, c2, e, h] = q; for (let i = Math.floor((a - h)/8); i <= Math.floor((c2 + 1)/8); i++) for (let j = Math.floor((b - h*1.9)/8); j <= Math.floor((e + 1)/8); j++){ const k = i*1000 + j; if (!CB.has(k)) CB.set(k, []); CB.get(k).push(q); } } };
  const inShadow = (x, y) => { if (!CB) bucket(); for (const [a, b, c2, e, h] of CB.get(Math.floor(x/8)*1000 + Math.floor(y/8)) || []){ if (x > c2 + 1 || y > e + 1 || x < a - h || y < b - h*1.9) continue; for (let t = 0.3; t <= h; t += 0.6){ const px = x + 0.345*t, py = y + 0.636*t; if (px > a && px < c2 && py > b && py < e) return true; } } return false; };
  const ground = (x, y, h, hx, hy, k, edgeK) => { let c = BASE[k];
    if (!c){ const i = +k.slice(1), p = plot(x, y); c = FIELD[i]; const ang = p.s.kind*40, u = x*Math.cos(ang) + y*Math.sin(ang);
      if ((i === 0 || i === 1 || i === 5 || i === 6) && (((u % 1.6) + 1.6) % 1.6) < 0.5) c = shade(c, 0.88); }
    if (k === 'rail' && segD(x, y, RAIL) < 0.8) c = '#5a5e62';
    // outlines where two kinds of ground meet, like the dark edges on the objects
    const edge = edgeK;
    const n = [-hx, -hy, 1], nl = Math.hypot(...n), lit = (n[0]*L[0] + n[1]*L[1] + n[2]*L[2])/(nl*Ln);
    let f = Math.round((0.78 + 0.3*lit)*10)/10; if (edge) f *= 0.82; if (inShadow(x, y)) f *= 0.78;
    if (k !== 'road' && k !== 'water' && hsh(Math.floor(x/0.4), Math.floor(y/0.4), 5) > 0.8) f *= 0.95;
    const haze = clamp((360 - (x + y))/360, 0, 1)*0.16, [R, G, B] = (c[0] === '#' ? c.match(/\w\w/g).map(v => parseInt(v, 16)) : c.match(/\d+/g).map(Number)), mix = (v, tt) => Math.round(Math.min(255, v*f)*(1 - haze) + tt*haze);
    return [mix(R, 214), mix(G, 224), mix(B, 226)]; };
  items.forEach(f => f());
  // trees: forest on the ridge and in the woods, rows along hedges and the stream, fruit trees near the farms and hamlets
  const tree = (x, y, kind, s) => { const f = kind === 's' ? K.spruce : kind === 'f' ? K.fruitTree : K.beech, hh = (kind === 's' ? 10.5 : kind === 'f' ? 4.2 : 7.6)*s, z = height(x, y) - 0.2; casters.push([x - 1.2*s, y - 1.2*s, x + 1.2*s, y + 1.2*s, hh*0.85]);
    H.SD(x - 2.6*s, x + 2.6*s, y - 2.6*s, y + 2.6*s, 0, hh, (px, py, pz) => f(px - x, py - y, pz, s), {step:0.18, lift:z}); };
  const clear = (x, y) => !placed.some(([a, b, c, e]) => x > a - 3 && x < c + 3 && y > b - 3 && y < e + 3) && !ROAD.some(pl => segD(x, y, pl) < 4) && segD(x, y, STREAM) > 3.5 && segD(x, y, RAIL) > 3;
  for (let i = 0; i < 5200; i++){ const x = r()*W, y = r()*D, h = height(x, y); if (!forestAt(x, y, h) || !clear(x, y)) continue; tree(x, y, r() < 0.7 ? 's' : 'b', 0.75 + r()*0.4); }
  for (let i = 0; i < 1400; i++){ const x = r()*W, y = r()*D, h = height(x, y), p = plot(x, y); if (p.edge > 1.6 || forestAt(x, y, h) || !clear(x, y) || r() > 0.3) continue; tree(x, y, 'b', 0.6 + r()*0.35); }
  for (let i = 0; i < 70; i++){ const t = r()*(STREAM.length - 1), j = Math.floor(t), u = t - j, [ax, ay] = STREAM[j], [bx, by] = STREAM[j + 1], x = ax + (bx - ax)*u + (r() - 0.5)*10, y = ay + (by - ay)*u + (r() - 0.5)*10; if (clear(x, y) && segD(x, y, STREAM) > 4) tree(x, y, 'b', 0.65 + r()*0.3); }
  for (const [a, b, c, e] of placed) for (let i = 0; i < 3; i++){ const x = a - 4 + r()*(c - a + 8), y = b - 4 + r()*(e - b + 8); if (clear(x, y)) tree(x, y, 'f', 0.8); }
  // a little life: cows and sheep in pastures, a tractor, the post bus, villagers
  const pasture = []; for (let i = 0; i < 400 && pasture.length < 22; i++){ const x = r()*W, y = 100 + r()*(D - 100), p = plot(x, y), h = height(x, y); if (FIELD.indexOf(FIELD[Math.floor(p.s.kind*FIELD.length*0.999)]) === 3 && p.edge > 3 && !forestAt(x, y, h) && clear(x, y)) pasture.push([x, y, h]); }
  pasture.forEach(([x, y, h], i) => i % 3 ? H.SD(x, x + 2.8, y, y + 1, 0, 1.5, (px, py, pz) => K.cowM(i % 2 ? {graze:1} : {})(px - x, py - y, pz), {step:0.06, lift:h}) : H.SD(x, x + 1.4, y, y + 0.6, 0, 0.9, (px, py, pz) => K.sheepFn({graze:1})(px - x, py - y, pz), {step:0.05, lift:h}));
  K.place(H, 'Post bus', 108, 137.6, height(112, 138.5)); K.place(H, 'Tractor with manure spreader', 84, 204, height(88, 205));
  // people: a lot of them. Walkers on the pavements, more in the town, hikers on the tracks, farmers in the fields
  const inside = (x, y) => placed.some(([a, b, c2, e]) => x > a - 0.6 && x < c2 + 0.6 && y > b - 0.6 && y < e + 0.6);
  const person = (o, x, y, pose, flip) => { if (inside(x, y) || inside(x + 1.5, y + 1.5)) return; (flip ? K.turned : K.figure)(H, o, x, y, pose, height(x + 0.75, y + 0.75)); };
  const folk = () => { const o = K.VILL[Math.floor(r()*K.VILL.length)]; return r() < 0.15 ? Object.assign({}, o, {small:1, item:null}) : o; };
  const along = (pl, t) => { const j = Math.min(pl.length - 2, Math.floor(t)), u = t - j, [ax, ay] = pl[j], [bx, by] = pl[j + 1], L = Math.hypot(bx - ax, by - ay); return [ax + (bx - ax)*u, ay + (by - ay)*u, (bx - ax)/L, (by - ay)/L]; };
  const walkers = (pl, n, side) => { for (let i = 0; i < n; i++){ const [x, y, ux, uy] = along(pl, r()*(pl.length - 1)), sd = r() < 0.5 ? -1 : 1, off = side + r()*1.2, px = x - uy*sd*off - 0.75, py = y + ux*sd*off - 0.75, d = Math.hypot((px - 150)/62, (py - 128)/46);
      if (d > 1 && r() < 0.6) continue; person(folk(), px, py, r() < 0.7 ? (r() < 0.5 ? K.POSE.walkA : K.POSE.walkB) : null, ux > 0 ? sd > 0 : sd < 0); } };
  ROAD.forEach(pl => walkers(pl, 90, 2.2)); TRACK.forEach(pl => walkers(pl, 6, 0.4));
  for (let i = 0; i < 160; i++){ const x = 150 + (r()*2 - 1)*40, y = 126 + (r()*2 - 1)*26; if (kindAt(x + 0.75, y + 0.75) === 'garden' || ROAD.some(pl => segD(x, y, pl) < 3.2)) person(folk(), x, y, r() < 0.5 ? K.POSE.walkA : null, r() < 0.5); }
  for (let i = 0; i < 60; i++){ const x = r()*W, y = 100 + r()*(D - 100), h = height(x, y), p = plot(x, y); if (p.edge > 3 && !forestAt(x, y, h) && clear(x, y) && p.s.kind < 0.3) person(Object.assign({}, K.VILL[i % 20], {item:i % 3 ? 'fork' : null, hat:'cap', hatc:'#7a7468'}), x, y, i % 3 ? {armR:'forward', legs:['fwd', 'back']} : null, r() < 0.5); }
  // life in the town square: the café, the market, the band by the fountain, pensioners
  for (const [name, x, y] of [['Café terrace', 162, 125], ['Market stall with cheese seller', 140, 132], ['Market stall with cheese seller', 145, 134.5], ['Brass band (fanfare)', 128, 136], ['Pensioners on a bench', 158, 131], ['Kids playing', 120, 128], ['Woman with a pram', 106, 136], ['Dog walker', 196, 128], ['Cyclist', 70, 143.5], ['Road cyclist', 230, 121.5], ['Churchgoers', 136, 116]])
    K.place(H, name, x, y, height(x + 1.5, y + 1.5), null, true);
  // the protest: a corner of the main road east of the square. The crowd faces east, a barricade, the riot police line facing west
  const RD = [0.985, -0.175], NM = [0.175, 0.985], at = (u, v) => [150 + RD[0]*u + NM[0]*v, 142 + RD[1]*u + NM[1]*v];
  const HL = z => Object.assign(Object.create(H), {SD:(x0, x1, y0, y1, z0, z1, fn, o) => H.SD(x0, x1, y0, y1, z0, z1, fn, Object.assign({}, o, {lift:z}))});
  { const [bx, by] = at(30, 0); K.barricade(HL(height(bx, by)), bx, by - 3.6, by + 3.6, false); }
  for (let i = 0; i < 70; i++){ const u = 12 + r()*15.5, v = (r()*2 - 1)*(3 + (27.5 - u)*0.15), [x, y] = at(u, v), o = K.PROT[Math.floor(r()*20)]; person(o, x - 0.75, y - 0.75, o.item === 'sign' || o.item === 'flag' ? (r() < 0.5 ? {armR:'up'} : {armR:'up', legs:['fwd', 'back']}) : (r() < 0.5 ? {armR:'fist'} : null)); }
  for (let i = 0; i < 9; i++){ const [x, y] = at(32.4 + (i % 2)*0.2, -3.6 + i*0.9); person(K.RIOT, x - 0.75, y - 0.75, i % 4 === 2 ? {armR:'strike'} : {armR:'down'}, true); }
  for (let i = 0; i < 4; i++){ const [x, y] = at(34.6, -2.8 + i*1.9); person(K.RIOT, x - 0.75, y - 0.75, {armR:'strike'}, true); }
  { const [x, y] = at(38, -1.4); K.place(H, 'Police van', x, y - 1.1, height(x + 2.6, y)); const [x2, y2] = at(45, -1.2); K.place(H, 'Riot police bus', x2, y2 - 1.2, height(x2 + 4, y2)); }
  { const jo = K.M.find(q => q.n === 'Journalist (La Feuille)').o, [x, y] = at(24, 5.6); person(jo, x - 0.75, y - 0.75, {armR:'eye', armL:'eye'}, true); const [x3, y3] = at(36, 5.4); person(K.M.find(q => q.n === 'Police officer').o, x3 - 0.75, y3 - 0.75, {armR:'forward'}, true); }
  for (let i = 0; i < 12; i++){ const [x, y] = at(8 + r()*6, (r() < 0.5 ? -1 : 1)*(4 + r()*2)); person(folk(), x - 0.75, y - 0.75, null, false); }
  // terrain: heights on a 1 m grid; the colour is worked out for every pixel at 10 cm (the kind of ground is remembered per 10 cm cell)
  const C1 = 1, nx = W/C1, ny = D/C1, heights = new Float32Array((nx + 1)*(ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) heights[j*(nx + 1) + i] = height(i*C1, j*C1);
  const hh = (q, r2) => heights[Math.min(ny, Math.max(0, r2))*(nx + 1) + Math.min(nx, Math.max(0, q))];
  const KN = ['road', 'water', 'bank', 'rail', 'track', 'yard', 'garden', 'forest', 'hedge', ...FIELD.map((_, i) => 'f' + i)], FN = 0.1, fnx = Math.round(W/FN), fny = Math.round(D/FN), kc = new Uint8Array(fnx*fny);
  const kindF = (x, y) => { const i = clamp(Math.floor(x/FN), 0, fnx - 1), j = clamp(Math.floor(y/FN), 0, fny - 1), o = j*fnx + i; if (!kc[o]) kc[o] = KN.indexOf(kindAt((i + 0.5)*FN, (j + 0.5)*FN)) + 1; return KN[kc[o] - 1]; };
  const hb = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j; return hh(i, j)*(1 - u)*(1 - v) + hh(i + 1, j)*u*(1 - v) + hh(i, j + 1)*(1 - u)*v + hh(i + 1, j + 1)*u*v; };
  const colourAt = (x, y) => { const k = kindF(x, y), hx = hb(x + 0.5, y) - hb(x - 0.5, y), hy = hb(x, y + 0.5) - hb(x, y - 0.5);
    const edge = k !== 'bank' && [[0.15, 0], [0, 0.15], [-0.15, 0], [0, -0.15], [0.3, 0], [0, 0.3]].some(([dx, dy]) => { const k2 = kindF(x + dx, y + dy); return k2 !== k && k2 !== 'bank'; });
    return ground(x, y, 0, hx, hy, k, edge); };
  H.HF(W, D, C1, heights, null, {base:6, colourAt});

});
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('bold 16px Silkscreen'), document.fonts.ready]) : Promise.resolve()).then(() => {
  // the valley is drawn at one fixed resolution (s, pixels per metre); zooming (z) only enlarges the pixels
  const Q = new URLSearchParams(location.search), S = +(Q.get('s') || 2.5), Z = +(Q.get('z') || 1), c = document.getElementById('c'), win = Q.get('win') ? Q.get('win').split(',').map(Number) : null, n = document.createElement('canvas');
  let pad = 40, ox = D*S + pad, oy = 60*S + pad; n.width = Math.ceil((W + D)*S) + pad*2; n.height = Math.ceil((W + D)/2*S + 60*S) + pad*2;
  if (win){ const [x0, y0, x1, y1] = win, zt = 14; n.width = Math.ceil((x1 - y0 - x0 + y1)*S); n.height = Math.ceil(((x1 + y1 - x0 - y0)/2 + zt)*S); ox = -(x0 - y1)*S; oy = -((x0 + y0)/2 - zt - 4)*S; }
  const g = n.getContext('2d'); const sky = g.createLinearGradient(0, 0, 0, n.height); sky.addColorStop(0, '#dfe6ec'); sky.addColorStop(1, '#eef0ea'); g.fillStyle = sky; g.fillRect(0, 0, n.width, n.height);
  const t = Date.now(); ART.plates.length = 0; ART.texts.on = true; ART.texts.list.length = 0; const post = ART.draw(g, SCENE, 0, S, ox, oy); post.forEach(f => f());
  c.width = n.width*Z; c.height = n.height*Z; const gc = c.getContext('2d'); gc.imageSmoothingEnabled = false; gc.drawImage(n, 0, 0, c.width, c.height);
  // sign letters appear once the zoom gives them room, written where the board can be seen
  const px = g.getImageData(0, 0, n.width, n.height).data, hex = h => h.match(/\w\w/g).map(v => parseInt(v, 16));
  if (Z > 1) for (const p of ART.plates){ const cx = p.x0 + (p.w >> 1), cy = p.y0 + (p.h >> 1); if (cx < 0 || cy < 0 || cx >= n.width || cy >= n.height) continue; const i = (cy*n.width + cx)*4, b = hex(p.bg);
    if (Math.abs(px[i] - b[0]) + Math.abs(px[i + 1] - b[1]) + Math.abs(px[i + 2] - b[2]) < 30) ART.plateText(gc, p.x0*Z, p.y0*Z, p.w*Z, p.h*Z, p.text, p.fg); }
  gc.save(); gc.scale(Z, Z); for (const [m1, len, fs, skew, txt, tc] of ART.texts.list) ART.wallText(gc, m1, len, fs, skew, txt, tc); gc.restore();
  document.title += ' · ' + (Date.now() - t) + ' ms';
});
