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
  const building = (name, x, y, recol) => { const m = K.M.find(q => q.n === name); if (!fits(x, y, m.W, m.D)) return false; placed.push([x, y, x + m.W, y + m.D]); const z = level(x - 1, y - 1, x + m.W + 1, y + m.D + 1); items.push(() => K.place(H, name, x, y, z, recol, true)); yard.push([x, y, x + m.W, y + m.D, name === 'Farm' ? '#c2b48a' : null]); const zt = Math.max(...m.parts.filter(q => q.t === 'blk').map(q => q.z + Math.max(...q.h)), 3); casters.push([x + 1, y + 1, x + m.W - 1, y + m.D - 1, zt*0.8]); return true; };
  const ROOFS = [null, {'#a8473a':'#b8553e'}, {'#a8473a':'#8e3f32'}, {'#a8473a':'#9a5a3a'}, {'#a8473a':'#c0624a'}];
  const village = (cx, cy, n, rad, extras) => { for (const [name, dx, dy] of extras) building(name, cx + dx, cy + dy);
    let tries = 0, k = 0; while (k < n && tries < 4000){ tries++; const a = r()*Math.PI*2, d = Math.sqrt(r())*rad, x = cx + Math.cos(a)*d - 5, y = cy + Math.sin(a)*d*0.8 - 5; if (building(r() < 0.45 ? 'House, two storeys' : 'House, small', x, y, ROOFS[Math.floor(r()*ROOFS.length)])) k++; } };
  // the town grows along its streets: buildings line both sides, a second row behind, dense in the middle and thinning out
  const frontage = (names, cx, cy, rx, ry, prob, rows) => { let k = 0; for (const pl of ROAD) for (let i = 0; i < pl.length - 1; i++){ const [ax, ay] = pl[i], [bx, by] = pl[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax)/L, uy = (by - ay)/L;
      for (let s = 3; s < L - 2; s += 3.5) for (const side of [-1, 1]) for (let row = 0; row < rows; row++){ const name = names[k % names.length], m = K.M.find(q => q.n === name), off = 5.2 + (row ? 12 : 0) + Math.max(m.W, m.D)/2;
        const px = ax + ux*s - uy*side*off, py = ay + uy*s + ux*side*off, d = Math.hypot((px - cx)/rx, (py - cy)/ry); if (d > 1 || r() > prob*(1.2 - d)) continue;
        if (building(name, px - m.W/2, py - m.D/2, ROOFS[Math.floor(r()*ROOFS.length)])) k++; } } return k; };
  for (const [name, x, y] of [['Church', 132, 120], ['Mairie', 156, 118], ['Fountain', 152, 132], ['Railway station', 150, 74]]) building(name, x, y);
  frontage(['Village shop', 'Bank', 'La Feuille de la Faille', 'Gendarmerie', 'Canton house', 'School'], 150, 125, 50, 34, 2.5, 1);
  frontage(['House, two storeys', 'House, small', 'House, two storeys', 'House, small', 'House, small'], 150, 128, 62, 46, 1.6, 2);
  for (let i = 0; i < 5000; i++){ const x = 150 + (r()*2 - 1)*58, y = 126 + (r()*2 - 1)*40, d = Math.hypot((x - 150)/58, (y - 126)/40); if (d < 1 && r() < 1.1 - d) building(r() < 0.5 ? 'House, two storeys' : 'House, small', x - 5, y - 5, ROOFS[Math.floor(r()*ROOFS.length)]); }
  village(64, 180, 9, 16, [['Chapel', 4, 4]]); village(252, 102, 8, 15, [['Chapel', -4, -2]]); village(214, 192, 6, 14, []);
  for (const [x, y] of [[20, 120], [96, 200], [276, 174], [292, 62], [30, 66], [120, 214]]) building('Farm', x, y);
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
  const inShadow = (x, y) => { for (const [a, b, c2, e, h] of casters){ if (x > c2 + 1 || y > e + 1 || x < a - h || y < b - h*1.9) continue; for (let t = 0.3; t <= h; t += 0.6){ const px = x + 0.345*t, py = y + 0.636*t; if (px > a && px < c2 && py > b && py < e) return true; } } return false; };
  const ground = (x, y, h, hx, hy, k, edgeK) => { let c = BASE[k];
    if (!c){ const i = +k.slice(1), p = plot(x, y); c = FIELD[i]; const ang = p.s.kind*40, u = x*Math.cos(ang) + y*Math.sin(ang);
      if ((i === 0 || i === 1 || i === 5 || i === 6) && (((u % 1.6) + 1.6) % 1.6) < 0.5) c = shade(c, 0.88); }
    if (k === 'rail' && segD(x, y, RAIL) < 0.8) c = '#5a5e62';
    // outlines where two kinds of ground meet, like the dark edges on the objects
    const edge = edgeK;
    const n = [-hx, -hy, 1], nl = Math.hypot(...n), lit = (n[0]*L[0] + n[1]*L[1] + n[2]*L[2])/(nl*Ln);
    let f = Math.round((0.78 + 0.3*lit)*10)/10; if (edge) f *= 0.82; if (inShadow(x, y)) f *= 0.78;
    if (k !== 'road' && k !== 'water' && hsh(Math.floor(x/2), Math.floor(y/2), 5) > 0.8) f *= 0.95;
    const haze = clamp((360 - (x + y))/360, 0, 1)*0.16, [R, G, B] = (c[0] === '#' ? c.match(/\w\w/g).map(v => parseInt(v, 16)) : c.match(/\d+/g).map(Number)), mix = (v, tt) => Math.round(Math.min(255, v*f)*(1 - haze) + tt*haze);
    return 'rgb(' + mix(R, 214) + ',' + mix(G, 224) + ',' + mix(B, 226) + ')'; };
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
  K.place(H, 'Post bus', 168, 136.2, height(172, 137)); K.place(H, 'Tractor with manure spreader', 84, 204, height(88, 205));
  K.VILL.slice(0, 10).forEach((o, i) => { const x = 140 + r()*30, y = 118 + r()*26; if (clear(x, y) || ROAD.some(pl => segD(x, y, pl) < 4)) K.figure(H, o, x, y, i % 2 ? K.POSE.walkA : null, height(x + 0.75, y + 0.75)); });
  // terrain: heights on a 1 m grid, a colour per cell (shading in tone steps, outlines between kinds of ground, shadows), traced per pixel
  const C1 = 1, nx = W/C1, ny = D/C1, CC = 0.5, cx = W/CC, cy = D/CC, heights = new Float32Array((nx + 1)*(ny + 1)), kinds = new Array(cx*cy), colours = new Array(cx*cy);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) heights[j*(nx + 1) + i] = height(i*C1, j*C1);
  for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) kinds[j*cx + i] = kindAt((i + 0.5)*CC, (j + 0.5)*CC);
  const KA = (i, j) => kinds[Math.min(cy - 1, Math.max(0, j))*cx + Math.min(cx - 1, Math.max(0, i))], hh = (q, r2) => heights[Math.min(ny, r2)*(nx + 1) + Math.min(nx, q)];
  for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++){ const x = (i + 0.5)*CC, y = (j + 0.5)*CC, k = kinds[j*cx + i], gi = Math.floor(x), gj = Math.floor(y);
    const hx = (hh(gi + 1, gj) + hh(gi + 1, gj + 1) - hh(gi, gj) - hh(gi, gj + 1))/2, hy = (hh(gi, gj + 1) + hh(gi + 1, gj + 1) - hh(gi, gj) - hh(gi + 1, gj))/2;
    const edge = [[1, 0], [0, 1], [-1, 0], [0, -1], [2, 0], [0, 2]].some(([dx, dy]) => { const k2 = KA(i + dx, j + dy); return k2 !== k && k !== 'bank' && k2 !== 'bank'; });
    colours[j*cx + i] = ground(x, y, 0, hx, hy, k, edge).match(/\d+/g).map(Number); }
  H.HF(W, D, C1, heights, colours, {base:6, ccell:CC});
});
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('bold 16px Silkscreen'), document.fonts.ready]) : Promise.resolve()).then(() => {
  const S = +(new URLSearchParams(location.search).get('s') || 2.5), c = document.getElementById('c'), pad = 40; c.width = Math.ceil((W + D)*S) + pad*2; c.height = Math.ceil((W + D)/2*S + 60*S) + pad*2;
  const g = c.getContext('2d'); const sky = g.createLinearGradient(0, 0, 0, c.height); sky.addColorStop(0, '#dfe6ec'); sky.addColorStop(1, '#eef0ea'); g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height);
  const t = Date.now(); const post = ART.draw(g, SCENE, 0, S, D*S + pad, 60*S + pad); post.forEach(f => f()); document.title += ' · ' + (Date.now() - t) + ' ms';
});
