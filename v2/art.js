/* Jurafrackers 2.0 — art. Buildings and vehicles are built from parts (blocks, roofs, cylinders, lines, decals)
   in local coordinates (1 unit ≈ 1 m) and drawn isometrically in any of four orientations. People are drawn in four facings. */
(function(){
'use strict';
const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const sh = (c, f) => { if (c[0] !== '#') return c; const [r, g, b] = hex(c), k = v => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v)*(f - 1) : v*f))); return 'rgb(' + k(r) + ',' + k(g) + ',' + k(b) + ')'; };
const FACES = ['E', 'S', 'W', 'N'];
const PAL = {wall:'#efe9dc', wall2:'#e2d8c4', stone:'#cfc8b8', roof:'#a8473a', roof2:'#7d4d3c', slate:'#59606a', metal:'#9aa3ab', glass:'#8fb7cf', dark:'#2b3036',
  co:'#2c5f93', co2:'#e07a2c', wood:'#8a5a3a', green:'#5d8a4a', gravel:'#b9b2a2', asphalt:'#5c6166', red:'#b8322a', white:'#f4f2ec', yellow:'#e8b730'};

/* ---------------------------------------------------------------- model builder */
function build(fn){
  const parts = [];
  const push = p => (parts.push(p), p);
  const H = {
    // block; h is one height or four corner heights [x0y0, x1y0, x1y1, x0y1]
    B:(x, y, z, w, d, h, c, o) => push(Object.assign({t:'blk', x, y, z, w, d, h:Array.isArray(h) ? h : [h, h, h, h], c}, o || {})),
    // gable roof on a w×d footprint; ridge along x ('x') or y ('y'); side = gable wall colour
    R(x, y, z, w, d, h, c, ax, side, ov){ ov = ov ?? 0.4; const o = {side:side || c, roof:1, kx:x + w/2, ky:y + d/2};
      if ((ax || 'x') === 'x'){ push(Object.assign({t:'blk', x:x - 0.1, y:y - ov, z, w:w + 0.2, d:d/2 + ov, h:[0, 0, h, h], c}, o)); push(Object.assign({t:'blk', x:x - 0.1, y:y + d/2, z, w:w + 0.2, d:d/2 + ov, h:[h, h, 0, 0], c}, o)); }
      else { push(Object.assign({t:'blk', x:x - ov, y:y - 0.1, z, w:w/2 + ov, d:d + 0.2, h:[0, h, h, 0], c}, o)); push(Object.assign({t:'blk', x:x + w/2, y:y - 0.1, z, w:w/2 + ov, d:d + 0.2, h:[h, 0, 0, h], c}, o)); } },
    W:(x, y, r, w, o) => push(Object.assign({t:'whl', x, y, r, w:w || r*0.6}, o || {})),              // wheel, axle along y
    Y:(x, y, z, w, d, h, c, o) => push(Object.assign({t:'pyr', x, y, z, w, d, h, c}, o || {})),       // pyramid (spires, hip caps)
    C:(x, y, z, r, h, c, o) => push(Object.assign({t:'cyl', x, y, z, r, h, c}, o || {})),          // vertical cylinder centred on x,y
    L:(pts, c, lw, o) => push(Object.assign({t:'ln', pts, c, lw:lw || 1}, o || {})),                 // 3D polyline
    F:(pts, c, o) => push(Object.assign({t:'flat', pts, c}, o || {})),                                // ground decal
    T:(x, y, z, txt, o) => push(Object.assign({t:'txt', x, y, z, txt}, o || {})),                     // floating label (screen-aligned)
    // a row of windows on a face: face, from, to, step, z, w, h
    row:(f, a0, a1, step, z, w, h, c) => { const r = []; for (let a = a0; a <= a1 + 1e-6; a += step) r.push([f, a, z, w, h, c]); return r; },
  };
  fn(H, PAL);
  return parts;
}

/* ---------------------------------------------------------------- renderer */
function draw(g, model, rot, S, ox, oy, post){
  post = post || [];
  const W = model.W, D = model.D, rp = (x, y) => rot === 0 ? [x, y] : rot === 1 ? [D - y, x] : rot === 2 ? [W - x, D - y] : [y, W - x];
  const P = (x, y, z) => [ox + (x - y)*S, oy + (x + y)*S/2 - z*S];
  const poly = (pts, fill, line) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = fill; g.fill(); if (line){ g.strokeStyle = line; g.lineWidth = Math.max(0.6, S*0.12); g.stroke(); } };
  const rf = f => FACES[(FACES.indexOf(f) + rot) % 4];
  const items = [];
  model.parts.forEach((p, i) => {
    if (p.t === 'blk'){
      const L = [[p.x, p.y, p.h[0]], [p.x + p.w, p.y, p.h[1]], [p.x + p.w, p.y + p.d, p.h[2]], [p.x, p.y + p.d, p.h[3]]].map(([x, y, h]) => { const q = rp(x, y); return [q[0], q[1], h]; });
      const xs = L.map(q => q[0]), ys = L.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const hAt = (x, y) => L.find(q => Math.abs(q[0] - x) < 1e-6 && Math.abs(q[1] - y) < 1e-6)[2];
      const kc = p.kx !== undefined ? rp(p.kx, p.ky) : [(x0 + x1)/2, (y0 + y1)/2];
      items.push({k:kc[0] + kc[1] + p.z*1.2 + (p.k || 0) + ((x0 + x1)/2 + (y0 + y1)/2)*0.001, i, f(){
        const z = p.z, c = p.c, line = p.noline ? null : 'rgba(20,24,28,.38)';
        const h00 = hAt(x0, y0), h10 = hAt(x1, y0), h11 = hAt(x1, y1), h01 = hAt(x0, y1);
        const sideS = p.side || c, sideE = p.side || c;
        if (p.bv){ const b = p.bv, zt = z + h00, zb = zt - b;
          poly([P(x0, y0, zb), P(x1, y0, zb), P(x1 - b, y0 + b, zt), P(x0 + b, y0 + b, zt)], sh(c, 0.95), null);
          poly([P(x0, y0, zb), P(x0, y1, zb), P(x0 + b, y1 - b, zt), P(x0 + b, y0 + b, zt)], sh(c, 1.0), null);
          poly([P(x0, y1, z), P(x1, y1, z), P(x1, y1, zb), P(x0, y1, zb)], sh(c, 0.9), line);
          poly([P(x1, y0, z), P(x1, y1, z), P(x1, y1, zb), P(x1, y0, zb)], sh(c, 0.74), line);
          poly([P(x0, y1, zb), P(x1, y1, zb), P(x1 - b, y1 - b, zt), P(x0 + b, y1 - b, zt)], sh(c, 1.02), line);
          poly([P(x1, y0, zb), P(x1, y1, zb), P(x1 - b, y1 - b, zt), P(x1 - b, y0 + b, zt)], sh(c, 0.86), line);
          poly([P(x0 + b, y0 + b, zt), P(x1 - b, y0 + b, zt), P(x1 - b, y1 - b, zt), P(x0 + b, y1 - b, zt)], p.top || sh(c, 1.14), line); }
        else {
        if (h01 > 0 || h11 > 0) poly([P(x0, y1, z), P(x1, y1, z), P(x1, y1, z + h11), P(x0, y1, z + h01)], sh(sideS, 0.9), line);
        if (h10 > 0 || h11 > 0) poly([P(x1, y0, z), P(x1, y1, z), P(x1, y1, z + h11), P(x1, y0, z + h10)], sh(sideE, 0.74), line);
        const sx = (h10 + h11) - (h00 + h01), sy = (h01 + h11) - (h00 + h10), top = p.top || (sx + sy < -1e-6 ? sh(c, 1.1) : sx + sy > 1e-6 ? sh(c, 0.72) : sh(c, 1.1));
        poly([P(x0, y0, z + h00), P(x1, y0, z + h10), P(x1, y1, z + h11), P(x0, y1, z + h01)], top, line);
        if (p.roof){ g.strokeStyle = sh(c, 0.55); g.lineWidth = Math.max(1, S*0.22); const lo = [[x0, y0, h00], [x1, y0, h10], [x1, y1, h11], [x0, y1, h01]].filter(q => q[2] < 1e-6); if (lo.length === 2){ g.beginPath(); const a = P(lo[0][0], lo[0][1], z), b = P(lo[1][0], lo[1][1], z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
        }
        for (const wv of p.win || []){ const [f, a, wz, ww, wh, wc, txt, tc] = wv, fr = rf(f); if (fr !== 'E' && fr !== 'S') continue;
          const lp = f === 'E' ? [[p.x + p.w, p.y + a], [p.x + p.w, p.y + a + ww]] : f === 'W' ? [[p.x, p.y + p.d - a], [p.x, p.y + p.d - a - ww]] : f === 'S' ? [[p.x + a, p.y + p.d], [p.x + a + ww, p.y + p.d]] : [[p.x + p.w - a, p.y], [p.x + p.w - a - ww, p.y]];
          const A = rp(...lp[0]), Bq = rp(...lp[1]), col = wc || PAL.glass, base = z + wz;
          poly([P(A[0], A[1], base), P(Bq[0], Bq[1], base), P(Bq[0], Bq[1], base + wh), P(A[0], A[1], base + wh)], fr === 'E' ? sh(col, 0.85) : col, txt ? 'rgba(20,24,28,.5)' : null);
          if (txt){ const m1 = P((A[0] + Bq[0])/2, (A[1] + Bq[1])/2, base + wh/2), len = Math.hypot(Bq[0] - A[0], Bq[1] - A[1])*S*1.12, fs = Math.max(6, Math.round(S*wh*0.8)), skew = fr === 'S' ? 0.5 : -0.5;
            post.push(() => { g.save(); g.fillStyle = tc || '#fff'; g.font = fs + 'px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(txt).width, fit = Math.min(1, (len*0.9)/tw);
              g.translate(m1[0], m1[1]); g.transform(1, skew, 0, 1, 0, 0); g.scale(fit, 1); g.fillText(txt, 0, 0.5); g.restore(); }); } }
      }});
    } else if (p.t === 'cyl'){
      const q = rp(p.x, p.y); items.push({k:q[0] + q[1] + p.z*1.2 + (p.k || 0), i, f(){
        const b = P(q[0], q[1], p.z), t = P(q[0], q[1], p.z + p.h), rx = p.r*S*1.41, ry = rx/2;
        g.fillStyle = sh(p.c, 0.85); g.fillRect(b[0] - rx, t[1], rx*2, b[1] - t[1]); g.beginPath(); g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); g.fill();
        g.fillStyle = sh(p.c, 0.72); g.fillRect(b[0] + rx*0.35, t[1], rx*0.65, b[1] - t[1]);
        g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI*2); g.fillStyle = p.top || sh(p.c, 1.12); g.fill(); g.strokeStyle = 'rgba(20,24,28,.35)'; g.lineWidth = Math.max(0.6, S*0.12); g.stroke();
      }});
    } else if (p.t === 'ln'){
      const pts = p.pts.map(([x, y, z]) => { const q = rp(x, y); return [q[0], q[1], z]; }), ax = pts.reduce((a, q) => a + q[0] + q[1], 0)/pts.length;
      items.push({k:ax + Math.min(...pts.map(q => q[2]))*1.2 + (p.k || 0), i, f(){ g.beginPath(); pts.forEach((q, j) => { const s = P(q[0], q[1], q[2]); j ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.strokeStyle = p.c; g.lineWidth = Math.max(0.8, S*0.18*p.lw); g.stroke(); }});
    } else if (p.t === 'pyr'){
      const cs = [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.d], [p.x, p.y + p.d]].map(q => rp(q[0], q[1])), ap = rp(p.x + p.w/2, p.y + p.d/2);
      const xs = cs.map(q => q[0]), ys = cs.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), A = P(ap[0], ap[1], p.z + p.h);
      items.push({k:ap[0] + ap[1] + p.z*1.2 + (p.k || 0), i, f(){ const ln = 'rgba(20,24,28,.38)';
        poly([P(x0, y0, p.z), P(x1, y0, p.z), A], sh(p.c, 0.8), ln); poly([P(x0, y0, p.z), P(x0, y1, p.z), A], sh(p.c, 0.95), ln);
        poly([P(x0, y1, p.z), P(x1, y1, p.z), A], sh(p.c, 1.08), ln); poly([P(x1, y0, p.z), P(x1, y1, p.z), A], sh(p.c, 0.78), ln); }});
    } else if (p.t === 'whl'){
      const q = rp(p.x, p.y), alongX = rot % 2 === 0;   // disk plane: x–z before rotation, y–z after an odd turn
      items.push({k:q[0] + q[1] + (p.k || 0), i, f(){ const ring = (rr, dy, col) => { g.beginPath(); for (let t = 0; t <= 24; t++){ const a = t/24*Math.PI*2, cx = Math.cos(a)*rr, cz = Math.sin(a)*rr + p.r; const s2 = alongX ? P(q[0] + cx, q[1] + dy, cz) : P(q[0] + dy, q[1] + cx, cz); t ? g.lineTo(s2[0], s2[1]) : g.moveTo(s2[0], s2[1]); } g.closePath(); g.fillStyle = col; g.fill(); };
        ring(p.r, 0, '#1f2226'); ring(p.r*0.5, 0.01, '#9aa3ab'); ring(p.r*0.2, 0.02, '#5a6066'); }});
    } else if (p.t === 'flat'){
      const pts = p.pts.map(([x, y]) => rp(x, y)); items.push({k:-1e4 + i, i, f(){ poly(pts.map(q => P(q[0], q[1], p.z || 0)), p.c, p.line || null); }});
    } else if (p.t === 'txt'){
      const q = rp(p.x, p.y); items.push({k:1e4 + i, i, f(){ const s = P(q[0], q[1], p.z); g.font = (p.size || 7) + 'px "Silkscreen", monospace'; g.textAlign = 'center'; const tw = g.measureText(p.txt).width;
        if (p.bg){ g.fillStyle = p.bg; g.fillRect(s[0] - tw/2 - 2, s[1] - (p.size || 7) + 1, tw + 4, (p.size || 7) + 2); } g.fillStyle = p.color || '#1c2225'; g.fillText(p.txt, s[0], s[1]); }});
    }
  });
  items.sort((a, b) => a.k - b.k || a.i - b.i).forEach(it => it.f());
  return post;
}

/* ---------------------------------------------------------------- models */
const M = [];
const def = (cat, n, W, D, fn, note) => M.push({cat, n, W, D, parts:build(fn), note});
const gravelPad = (F, W, D, c) => F([[0, 0], [W, 0], [W, D], [0, D]], c || PAL.gravel);

/* Company */
def('b', 'Bureau', 18, 14, ({B, R, F, L, row}, c) => { gravelPad(F, 18, 14, '#c9c4b6');
  F([[1, 9.5], [9, 9.5], [9, 13.5], [1, 13.5]], PAL.asphalt); for (let i = 2; i < 9; i += 2.4) F([[i, 9.7], [i + 0.15, 9.7], [i + 0.15, 13.3], [i, 13.3]], '#e9e6dc');
  B(2, 1.5, 0, 14, 7.5, 7, '#eceae4', {win:[...row('S', 0.8, 12.6, 1.6, 1.2, 1.1, 1.8), ...row('S', 0.8, 12.6, 1.6, 4.4, 1.1, 1.8), ...row('E', 0.8, 6, 1.6, 1.2, 1.1, 1.8), ...row('E', 0.8, 6, 1.6, 4.4, 1.1, 1.8), ['S', 5.6, 0, 2.6, 2.6, '#41505c'], ['S', 3.2, 7.1, 7.5, 1.2, c.co, 'ÉNERGIE-GÉO', '#fff']]});
  B(2, 1.5, 7, 14, 7.5, 0.5, '#d9d6cc'); B(3, 2.5, 7.5, 3, 2.5, 1.2, c.metal); B(10, 3, 7.5, 2, 2, 0.9, c.metal);
  B(7.2, 9, 2.7, 4, 1.4, 0.2, c.co2); L([[15.2, 11.5, 0], [15.2, 11.5, 9]], '#c9ccd0', 1.2); B(15.25, 11.4, 7.4, 0.08, 2.2, 1.4, c.co, {noline:1});
}, 'Two storeys, the company plate over the door, a parking with five spaces, the flag.');
def('b', 'Depot', 22, 16, ({B, R, F, C, row}, c) => { gravelPad(F, 22, 16);
  B(1, 1, 0, 14, 10, 6, '#c4ccd2', {win:[['S', 1.5, 0, 4, 4.6, '#7d8790'], ['S', 7.5, 0, 4, 4.6, '#7d8790'], ...row('E', 1, 8, 2.5, 4.4, 1.6, 0.8), ['S', 1, 5, 6, 0.8, c.co, 'DÉPÔT', '#fff']]});
  R(1, 1, 6, 14, 10, 1.6, '#8e979f', 'x', '#c4ccd2', 0.3);
  for (let i = 0; i < 4; i++) B(16.5, 1.5 + i*1.6, 0, 4.5, 0.5, 0.5, '#6d7880', {k:1}); for (let i = 0; i < 4; i++) B(16.5, 1.7 + i*1.6, 0.5, 4.5, 0.4, 0.4, '#7c8890', {k:1});
  for (let i = 0; i < 3; i++) B(16.5 + i*1.6, 9, 0, 1.2, 1.2, 1, c.wood, {k:1}); B(16.5, 11.5, 0, 4, 1.4, 1.4, '#b5893e');
  C(18.5, 14, 0, 0.8, 1.6, '#5a6b3a'); C(20.3, 14, 0, 0.8, 1.6, '#5a6b3a');
}, 'Storage hall with two roller doors; casing on racks, pallets of mud and bits, drums.');
def('b', 'Maison de la géothermie', 14, 12, ({B, R, F, row}, c) => { gravelPad(F, 14, 12, '#a7b98b');
  B(2, 2, 0, 9, 7, 3.4, '#d9c39d', {win:[...row('S', 0.8, 7.2, 2.2, 1, 1.2, 1.5), ['S', 3.8, 0, 1.4, 2.4, c.wood], ...row('E', 1, 5, 2.4, 1, 1.2, 1.5)]});
  B(2, 2, 3.4, 9, 7, 2.2, '#c9ac7c', {win:[...row('S', 1.4, 6.4, 2.5, 0.5, 1, 1.1), ['S', 0.6, 0.2, 7.8, 0.9, '#3d6b45', 'MAISON DE LA GÉOTHERMIE', '#fff']]});
  R(2, 2, 5.6, 9, 7, 3.2, c.roof2, 'x', '#c9ac7c', 0.9);
  B(11.5, 7, 0, 1.6, 0.3, 2.2, '#3d6b45', {win:[['S', 0.1, 0.6, 1.4, 1.2, '#f4f2ec', 'G-H', '#3d6b45']]});
}, 'The association on campus: a timber chalet, courses upstairs, a stand by the door.');
def('b', 'Centre de compétences', 18, 14, ({B, R, F, C, L, row}, c) => { gravelPad(F, 18, 14, '#c9c4b6');
  B(1.5, 2, 0, 9, 9, 8, '#e8ecef', {win:[...row('S', 0.6, 7.6, 1.4, 0.8, 0.9, 6.4), ...row('E', 0.6, 7.6, 1.4, 0.8, 0.9, 6.4)]});
  B(10.5, 4, 0, 6, 7, 4, '#d4dbe0', {win:[...row('S', 0.8, 4.4, 1.8, 1.2, 1.2, 1.6), ['S', 0.4, 2.9, 5.2, 0.8, c.co, 'CENTRE', '#fff']]});
  B(1.5, 2, 8, 9, 9, 0.4, '#c5ccd2'); L([[4, 4, 8.4], [4, 4, 15]], '#8d949b', 1); L([[3, 4, 8.4], [4, 4, 13], [5, 4, 8.4]], '#8d949b', 0.6);
  C(7.5, 6, 8.4, 1.3, 0.5, '#f0f2f4'); C(7.5, 6, 8.9, 0.3, 0.8, '#9aa3ab'); B(12, 5.5, 4, 2, 2, 0.8, c.metal);
}, 'Deep drilling, stimulation and the second survey pass. A mast with the seismometer link on the roof.');
def('b', 'Atelier', 18, 14, ({B, R, F, L, row}, c) => { gravelPad(F, 18, 14);
  B(1, 1.5, 0, 13, 10, 7, '#b6bdc3', {win:[['S', 1.2, 0, 5, 5.5, '#3a4148'], ['S', 7.5, 2, 4, 1.4], ...row('E', 1.5, 8, 2.2, 4.8, 1.6, 1), ['S', 7.5, 4.6, 4.5, 0.9, c.co2, 'ATELIER', '#fff']]});
  R(1, 1.5, 7, 13, 10, 1.4, '#7f888f', 'x', '#b6bdc3', 0.3); L([[2, 9, 5.8], [12, 9, 5.8]], '#d9a23a', 1.4);
  B(14.8, 6, 0, 2.4, 2.4, 1.6, '#e07a2c'); B(14.8, 9.5, 0, 2.6, 1, 1, '#555c63'); B(15, 2, 0, 1.6, 2.6, 2.2, '#c2552c');
}, 'Directional kit and maintenance: a high door, a crane rail, a BOP on the yard.');
def('b', 'Site container', 7, 4, ({B, F}, c) => { gravelPad(F, 7, 4);
  B(0.5, 0.8, 0, 6, 2.5, 2.6, c.co, {win:[['S', 0.6, 0, 0.9, 2.1, '#1f3f62'], ['S', 2.4, 1.1, 1.4, 0.9], ['S', 4.2, 1.1, 1.4, 0.9], ['E', 0.6, 1.1, 1.2, 0.9]]});
  B(0.5, 0.8, 2.6, 6, 2.5, 0.15, '#234c76');
}, 'Office, changing room and supplies at each site.');
def('b', 'Survey station', 8, 5, ({B, C, L, F}, c) => { gravelPad(F, 8, 5, '#a7b98b');
  B(1, 1.2, 0.5, 5, 2.4, 2.2, '#f2efe6', {win:[['S', 0.6, 0.9, 1.5, 0.8], ['S', 2.8, 0, 0.9, 1.7, '#9a9384']]}); B(0.4, 2.2, 0.4, 0.8, 0.3, 0.2, c.dark);
  for (const x of [2.2, 4.4]){ B(x, 1, 0, 0.6, 0.25, 0.7, c.dark); B(x, 3.5, 0, 0.6, 0.25, 0.7, c.dark); }
  B(3, 1.6, 2.7, 2.4, 1.6, 0.1, '#2b4a7a', {h:[0.1, 0.6, 0.6, 0.1]}); L([[1.6, 1.8, 2.7], [1.6, 1.8, 6]], '#8d949b', 0.8); L([[1.1, 1.8, 6], [2.1, 1.8, 6]], '#8d949b', 0.6);
}, 'A trailer at the end of a survey line: recorder, antenna, solar panel. Its window holds the section.');
const rigModel = (big) => ({B, R, F, C, L, T}, c) => { const s = big ? 1.5 : 1, W = 16*s, Dd = 16*s; F([[0, 0], [W, 0], [W, Dd], [0, Dd]], '#bdb5a3'); F([[1, 1], [W - 1, 1], [W - 1, Dd - 1], [1, Dd - 1]], '#a9a191');
  const mx = W*0.42, my = Dd*0.42, b = 2.2*s, top = (big ? 42 : 26);
  B(mx - b, my - b, 0, b*2, b*2, 3*s, '#6c737a'); B(mx - b - 0.5, my - b - 0.5, 3*s, b*2 + 1, b*2 + 1, 0.4, '#545b62');
  for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L([[mx + dx*b*0.9, my + dy*b*0.9, 3.4*s], [mx + dx*0.35, my + dy*0.35, top]], c.co2, 1.6, {k:3});
  for (let z = 3.4*s + 3; z < top - 1; z += 3.2){ const f = 1 - (z - 3.4*s)/(top - 3.4*s), r = 0.35 + (b*0.9 - 0.35)*f; L([[mx - r, my - r, z], [mx + r, my - r, z], [mx + r, my + r, z], [mx - r, my + r, z], [mx - r, my - r, z]], c.co2, 0.7, {k:3}); }
  B(mx - 0.8, my - 0.8, top - 0.2, 1.6, 1.6, 1.2, '#c9622a', {k:3});
  B(mx + b + 1, my - b, 0, 5*s, 2.6*s, 2.4*s, '#d9dde0', {win:[['S', 0.6, 1, 1.2, 0.9], ['S', 2.4, 0, 0.9, 2, '#6b7680']]});
  for (let i = 0; i < (big ? 3 : 2); i++) B(1.5 + i*3.2*s, Dd - 4.5*s, 0, 2.8*s, 3.4*s, 2.2*s, '#7a8f6e', {win:[['S', 0.3, 0.3, 2.2*s, 0.5, '#5b6f52']]});
  for (let i = 0; i < 4; i++) B(W - 6*s, Dd - 2.8*s + i*0.45*s, 0, 4.8*s, 0.35*s, 0.35*s, '#6d7880');
  if (big){ B(W - 6.5, 2, 0, 4.5, 2.4, 2.6, '#3d5b74', {win:[['S', 0.4, 1.8, 3.6, 0.6, '#2b4459', 'GEN', '#fff']]}); B(W - 6.5, 5, 0, 4.5, 2.4, 2.6, '#3d5b74'); }
};
def('b', 'Light rig on its pad', 16, 16, rigModel(false), 'To about 2,200 m. Mast, doghouse, mud tanks, pipe rack.');
def('b', 'Deep rig on its pad', 24, 24, rigModel(true), 'To 5,000 m. Taller mast, generators, three mud tanks. Needs the Centre.');
def('b', 'Capped wellhead', 8, 8, ({B, C, L, F}, c) => { F([[0, 0], [8, 0], [8, 8], [0, 8]], '#bdb5a3'); F([[2.5, 2.5], [5.5, 2.5], [5.5, 5.5], [2.5, 5.5]], '#8f887a');
  C(4, 4, 0, 0.6, 0.8, '#7a828a'); B(3.5, 3.5, 0.8, 1, 1, 0.6, '#b8322a'); C(4, 4, 1.4, 0.35, 0.8, '#7a828a'); B(3.2, 3.8, 1.5, 1.6, 0.4, 0.3, '#b8322a'); C(4, 4, 2.2, 0.45, 0.25, '#2c5f93');
  for (const p of [[1, 1], [7, 1], [7, 7], [1, 7]]) L([[p[0], p[1], 0], [p[0], p[1], 1.4]], '#9aa3ab', 0.6); L([[1, 1, 1.2], [7, 1, 1.2], [7, 7, 1.2], [1, 7, 1.2], [1, 1, 1.2]], '#9aa3ab', 0.5);
}, 'What stays when the rig leaves: valves on a concrete cellar, a fence.');
def('b', 'Heat station', 16, 12, ({B, R, F, C, L, row}, c) => { gravelPad(F, 16, 12, '#c9c4b6');
  B(1.5, 1.5, 0, 10, 7, 5, '#e4e7e2', {win:[...row('S', 1, 8, 2.4, 2.8, 1.4, 1.2), ['S', 3.5, 0, 2.8, 3, '#6b7680'], ['S', 0.6, 4, 8.8, 0.8, c.co, 'CHAUFFERIE', '#fff']]});
  B(1.5, 1.5, 5, 10, 7, 0.4, '#c8ccc8'); for (let i = 0; i < 3; i++){ B(2.5 + i*3, 3, 5.4, 2.4, 2.2, 1.2, '#b9c0c6'); C(3.7 + i*3, 4.1, 6.6, 0.8, 0.1, '#5a6066'); }
  L([[11.5, 6, 1.5], [14.5, 6, 1.5], [14.5, 11.5, 1.5]], '#c9622a', 1.8); L([[11.5, 7, 1], [15.2, 7, 1], [15.2, 11.5, 1]], '#3c7bbf', 1.8);
}, 'Heat exchanger and heat pumps; hot pipe out (red), cooled water back (blue).');
def('b', 'Power plant', 30, 22, ({B, R, F, C, L, row}, c) => { gravelPad(F, 30, 22, '#c9c4b6');
  B(2, 2, 0, 12, 10, 9, '#dfe3e6', {win:[...row('S', 1, 10, 1.6, 5.6, 1, 2.2), ['S', 4, 0, 3.4, 4, '#6b7680'], ['S', 0.6, 7.6, 10.8, 1, c.co, 'CENTRALE', '#fff']]});
  R(2, 2, 9, 12, 10, 1.2, '#9aa3ab', 'x', '#dfe3e6', 0.2);
  for (const [x, y] of [[16, 2], [20, 2], [24, 2]]){ for (const lx of [x, x + 3.4]) for (const ly of [y, y + 7.4]) L([[lx, ly, 0], [lx, ly, 5]], '#7f888f', 0.8); }
  B(16, 2, 5, 11.4, 7.8, 1.6, '#c6cdd2'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) C(17.8 + i*3.8, 4 + j*3.6, 6.6, 1.4, 0.15, '#5a6066');
  C(5, 16, 0, 1.6, 7, '#e8ecef'); C(9, 16, 0, 1.6, 7, '#e8ecef'); L([[14, 7, 3], [16, 7, 3]], '#c9622a', 1.6); L([[5, 14.4, 6], [5, 12, 6]], '#8d949b', 1.2);
  B(18, 13, 0, 7, 6, 3.4, '#7f8a92', {win:[['S', 0.6, 2.4, 5.8, 0.7, '#e8b730', 'TURBINE', '#1c2225']]});
}, 'Turbine hall, the air cooler on stilts with six fans, working-fluid tanks. Electricity, 10 % of the heat.');
def('b', 'Substation (utility)', 18, 14, ({B, F, C, L}, c) => { F([[0, 0], [18, 0], [18, 14], [0, 14]], '#a7a296');
  for (const p of [[1, 1], [17, 1], [17, 13], [1, 13]]) L([[p[0], p[1], 0], [p[0], p[1], 2]], '#7f888f', 0.5); L([[1, 1, 1.8], [17, 1, 1.8], [17, 13, 1.8], [1, 13, 1.8], [1, 1, 1.8]], '#7f888f', 0.5);
  for (let i = 0; i < 2; i++){ B(3 + i*6, 3, 0, 3.4, 2.6, 2.8, '#7a8288'); for (let j = 0; j < 3; j++) C(3.6 + i*6 + j*1.1, 4.3, 2.8, 0.25, 1.2, '#c9b38b'); }
  B(3, 9, 0, 4, 3, 3, '#e4e1d8', {win:[['S', 1.2, 0, 1.2, 2.2, '#5a6066'], ['S', 0.3, 2.3, 3.4, 0.6, '#e8b730', 'EDV', '#1c2225']]});
  for (const x of [13, 16]){ L([[x, 5, 0], [x, 5, 12]], '#8d949b', 1); L([[x - 2, 5, 10], [x + 2, 5, 10]], '#8d949b', 0.8); L([[x - 1.5, 5, 8], [x + 1.5, 5, 8]], '#8d949b', 0.8); }
  L([[11, 4.3, 3.8], [13, 5, 10], [16, 5, 10], [19, 5, 9.2]], '#2b3036', 0.4);
}, 'Where the power line enters the grid. Without it, a plant cannot sell.');
def('b', 'Utility office', 14, 10, ({B, R, F, row}, c) => { gravelPad(F, 14, 10, '#c9c4b6');
  B(1.5, 1.5, 0, 11, 6.5, 6.4, '#f0ead8', {win:[...row('S', 0.8, 9.4, 1.8, 1, 1.1, 1.6), ...row('S', 0.8, 9.4, 1.8, 4, 1.1, 1.6), ['S', 4.6, 0, 1.8, 2.4, '#5a6066'], ['S', 1, 2.8, 9, 0.8, '#e8b730', 'ÉLECTRICITÉ DU VALLON', '#1c2225']]});
  R(1.5, 1.5, 6.4, 11, 6.5, 2.4, c.slate, 'x', '#f0ead8', 0.4);
}, 'Contracts and prices: heat per station, electricity for all plants.');

/* Valley: houses and village */
def('b', 'House, small', 10, 9, ({B, R, F, row}, c) => { F([[0, 0], [10, 0], [10, 9], [0, 9]], '#9db383');
  B(1.5, 1.5, 0, 7, 5.5, 3.2, c.wall, {win:[['S', 1, 1, 1.1, 1.3], ['S', 3, 0, 1, 2.2, c.wood], ['S', 4.9, 1, 1.1, 1.3], ['E', 1.5, 1, 1.1, 1.3], ['E', 3.5, 1, 1.1, 1.3]]});
  R(1.5, 1.5, 3.2, 7, 5.5, 2.6, c.roof, 'x', c.wall, 0.6); B(6, 3, 4.6, 0.7, 0.7, 2, '#8d6e5a');
}, 'Variations: wall colour, roof colour, shutters.');
def('b', 'House, two storeys', 10, 10, ({B, R, F, row}, c) => { F([[0, 0], [10, 0], [10, 10], [0, 10]], '#9db383');
  B(1.5, 1.5, 0, 7, 6.5, 5.6, '#e6dccb', {win:[...row('S', 0.8, 5, 2.1, 1, 1.1, 1.4), ...row('S', 0.8, 5, 2.1, 3.6, 1.1, 1.4), ...row('E', 1, 4.6, 2, 1, 1.1, 1.4), ...row('E', 1, 4.6, 2, 3.6, 1.1, 1.4)]});
  R(1.5, 1.5, 5.6, 7, 6.5, 3, '#7d4d3c', 'y', '#e6dccb', 0.6);
}, 'Village house with the gable to the street.');
def('b', 'Mairie', 14, 12, ({B, R, F, L, C, row}, c) => { F([[0, 0], [14, 0], [14, 12], [0, 12]], '#c9c4b6');
  B(2, 2, 0, 10, 7, 6.4, '#efe4cf', {win:[...row('S', 0.8, 8.4, 1.9, 1, 1.1, 1.7), ...row('S', 0.8, 8.4, 1.9, 4, 1.1, 1.7), ...row('E', 1, 5, 2, 1, 1.1, 1.7), ...row('E', 1, 5, 2, 4, 1.1, 1.7), ['S', 4.2, 0, 1.6, 2.5, c.wood], ['S', 3, 2.8, 4, 0.8, '#2c4f7c', 'MAIRIE', '#fff']]});
  R(2, 2, 6.4, 10, 7, 2.8, c.slate, 'x', '#efe4cf', 0.5); B(6, 5, 8.6, 1.6, 1.6, 2, '#efe4cf', {win:[['S', 0.3, 0.6, 1, 1, '#f4f2ec']]}); R(6, 5, 10.6, 1.6, 1.6, 1.2, c.slate, 'x', '#efe4cf', 0.2);
  L([[12.6, 10, 0], [12.6, 10, 8]], '#c9ccd0', 1); B(12.65, 9.9, 6.6, 0.06, 1.6, 1.1, '#b8322a', {noline:1}); B(12.67, 10.4, 6.9, 0.04, 0.6, 0.5, '#f4f2ec', {noline:1});
}, 'Gifts, wishes, promises, the fête. A clock turret and the flag.');
def('b', 'Village shop', 11, 9, ({B, R, F, row}, c) => { F([[0, 0], [11, 0], [11, 9], [0, 9]], '#c9c4b6');
  B(1.5, 1.5, 0, 8, 5.5, 3.4, '#f1e7d2', {win:[['S', 0.8, 0.4, 3, 1.8], ['S', 4.3, 0, 1.3, 2.4, '#5a6066'], ['S', 6, 0.4, 1.4, 1.8], ['S', 0.6, 2.4, 6.8, 0.8, '#3d6b45', 'ÉPICERIE', '#fff']]});
  B(1.5, 7, 2.2, 8, 0.9, 0.1, '#c94c3a', {h:[0.3, 0.3, 0, 0]}); R(1.5, 1.5, 3.4, 8, 5.5, 2.4, c.roof, 'x', '#f1e7d2', 0.5); B(9.6, 6, 0, 0.8, 1.2, 1.6, '#3a4148', {win:[['S', 0.05, 0.2, 0.7, 1.2, '#f4f2ec']]});
}, 'Rumours pinned to the board outside; leaflets against them.');
const church = (state) => ({B, R, F, L, Y}, c) => { F([[0, 0], [18, 0], [18, 12], [0, 12]], '#a7b98b'); const wall = '#f2efe8';
  B(5, 3, 0, 11, 7, 6.5, wall, {win:[...[1.5, 4, 6.5, 9].map(a => ['S', a, 2, 1, 3, '#7fa6c4']), ...[1.5, 4.5].map(a => ['E', a, 2, 1, 3, '#7fa6c4'])]});
  if (state === 'broken'){ R(5, 3, 6.5, 6, 7, 4.5, c.roof2, 'x', wall, 0.4); B(11.2, 3.2, 6.5, 1.2, 3.4, [0.6, 1.8, 0.9, 0.2], c.roof2); B(12.6, 6.2, 6.5, 1.4, 3.6, [0.4, 0.1, 1.2, 2.2], c.roof2);
    L([[9, 10, 6.4], [9.6, 10, 4.6], [9.1, 10, 3.2], [9.8, 10, 1.6]], '#3a3a3a', 1); L([[14.5, 10, 6.4], [14, 10, 4.2], [14.6, 10, 2.6]], '#3a3a3a', 1); L([[16, 5, 6.4], [16, 6, 4], [16, 5.4, 2.4]], '#3a3a3a', 1);
    B(1.5, 4, 0, 4, 4, 9, wall, {win:[['S', 1.4, 0, 1.2, 2.6, c.wood], ['S', 1.2, 6, 1.6, 1.6, '#f4f2ec']]}); B(1.5, 4, 9, 2.4, 4, [1.6, 0.4, 0.2, 2.2], wall); B(3.9, 4, 9, 1.6, 2, [0.8, 0.2, 0.6, 1.2], wall);
    L([[3.5, 8, 8.8], [3, 8, 6.5], [3.6, 8, 4.4]], '#3a3a3a', 1);
    for (const [x, y, w, h] of [[6.5, 10.6, 1.2, 0.6], [8.4, 10.8, 0.9, 0.5], [12.6, 10.6, 1.4, 0.7], [0.6, 9, 1.2, 0.8], [14.6, 11, 0.8, 0.4], [7.6, 11.2, 1.2, 0.3]]) B(x, y, 0, w, w*0.8, h, '#cfc8b8', {bv:0.12});
    for (const p of [[4.5, 11.5], [17, 11.5]]) L([[p[0], p[1], 0], [p[0], p[1], 1]], '#e8b730', 0.5); L([[4.5, 11.5, 0.8], [17, 11.5, 0.8]], '#e8b730', 0.6); }
  else { R(5, 3, 6.5, 11, 7, 4.5, c.roof2, 'x', wall, 0.4);
    B(1.5, 4, 0, 4, 4, 13, wall, {win:[['S', 1.4, 0, 1.2, 2.6, c.wood], ['S', 1.5, 9.5, 1, 1.4, '#3a3a3a'], ['E', 1.5, 9.5, 1, 1.4, '#3a3a3a'], ['S', 1.2, 7, 1.6, 1.6, '#f4f2ec']]});
    Y(1.3, 3.8, 13, 4.4, 4.4, 6.5, c.slate); L([[3.5, 6, 19.5], [3.5, 6, 21.2]], '#c9a23a', 0.7); L([[3.1, 6, 20.6], [3.9, 6, 20.6]], '#c9a23a', 0.6);
    if (state === 'repair'){ for (const x of [0.8, 3.5, 6.2]) L([[x, 8.8, 0], [x, 8.8, 15]], '#c98b3a', 0.7, {k:4}); for (const y of [3.3, 6, 8.8]) L([[6.2, y, 0], [6.2, y, 15]], '#c98b3a', 0.7, {k:4});
      for (let z = 2.5; z < 15; z += 2.5){ L([[0.8, 8.8, z], [6.2, 8.8, z], [6.2, 3.3, z]], '#c98b3a', 0.6, {k:4}); B(0.8, 8.4, z - 0.1, 5.4, 0.4, 0.1, '#a87a4a', {k:4, noline:1}); }
      B(13, 10.4, 0, 2, 1.4, 1.2, '#9aa3ab', {bv:0.15}); } } };
def('b', 'Church', 18, 12, church('ok'), 'Nave and bell tower.');
def('b', 'Church after a quake', 18, 12, church('broken'), 'Cracked walls, half the nave roof and the top of the tower gone, rubble, tape around it.');
def('b', 'Church under repair', 18, 12, church('repair'), 'Scaffolding around the tower while it is rebuilt.');
def('b', 'Chapel', 9, 7, ({B, R, F, L}, c) => { F([[0, 0], [9, 0], [9, 7], [0, 7]], '#a7b98b');
  B(1.5, 1.5, 0, 6, 4, 3.4, '#f2efe8', {win:[['S', 2.5, 0, 1, 2, c.wood], ['E', 1.5, 1.2, 0.8, 1.4]]}); R(1.5, 1.5, 3.4, 6, 4, 2.6, c.roof2, 'x', '#f2efe8', 0.3);
  B(6.4, 3.1, 6, 0.9, 0.9, 1.6, '#f2efe8'); L([[6.85, 3.55, 7.6], [6.85, 3.55, 8.8]], '#3a3a3a', 0.6); L([[6.45, 3.55, 8.3], [7.25, 3.55, 8.3]], '#3a3a3a', 0.6);
}, 'In the villages.');
def('b', 'School', 18, 12, ({B, R, F, L, row}, c) => { F([[0, 0], [18, 0], [18, 12], [0, 12]], '#c9c4b6'); F([[11, 7], [17, 7], [17, 11], [11, 11]], '#d9c9a2');
  B(1.5, 1.5, 0, 9, 7, 6, '#f3e9d0', {win:[...row('S', 0.8, 7, 2, 1, 1.3, 1.6), ...row('S', 0.8, 7, 2, 3.8, 1.3, 1.6), ['S', 2.6, 2.7, 3.8, 0.8, '#8a5a3a', 'ÉCOLE', '#fff']]}); R(1.5, 1.5, 6, 9, 7, 2.6, c.roof, 'x', '#f3e9d0', 0.5);
  L([[12, 8, 0], [12, 8, 3]], '#555', 0.6); L([[16, 10, 0], [16, 10, 3]], '#555', 0.6); B(13.5, 8.5, 0, 1.2, 0.5, 1.2, '#c94c3a');
}, 'Education shifts the vote over the years. A gift: the sports hall next door.');
def('b', 'Sports hall (gift)', 16, 12, ({B, F, row}, c) => { gravelPad(F, 16, 12, '#c9c4b6');
  B(1.5, 1.5, 0, 13, 9, 7, '#d8e2ea', {win:[...row('S', 0.6, 11.4, 1.6, 4.2, 1.2, 2.2), ['S', 5.4, 0, 2.2, 2.6, '#5a6066'], ['S', 2, 1.5, 9, 0.9, c.co, 'SALLE DE SPORT · ÉNERGIE-GÉO', '#fff']]}); B(1.5, 1.5, 7, 13, 9, 0.6, '#b9c6d1', {h:[0, 0.6, 0.6, 0]});
}, 'The company name on the wall. Some like it, some call it buying children.');
def('b', 'Farm', 24, 18, ({B, R, F, C, L, row}, c) => { F([[0, 0], [24, 0], [24, 18], [0, 18]], '#b3a77f');
  B(2, 3, 0, 14, 9, 4, '#efe6d4', {win:[...row('S', 1, 4, 1.8, 1, 1.1, 1.4), ['S', 6.5, 0, 3.6, 3.4, c.wood], ['S', 10.8, 0, 2.4, 3, c.wood], ...row('E', 1, 6.5, 2.2, 1, 1.1, 1.4)]});
  R(2, 3, 4, 14, 9, 6.5, '#6e4b38', 'x', '#a07a55', 1.4); C(19.5, 5, 0, 1.8, 9, '#cfd3d6', {top:'#9aa3ab'}); B(17.5, 13, 0, 4, 3, 1, '#5a4632', {h:[1, 1.4, 0.8, 0.6]});
  for (let i = 0; i < 6; i++) L([[2 + i*2.2, 16.5, 0], [2 + i*2.2, 16.5, 1.1]], '#7a5a3a', 0.5); L([[2, 16.5, 0.9], [13, 16.5, 0.9]], '#7a5a3a', 0.4);
}, 'A Jura farmhouse under one huge roof, a silo, the manure heap. Farmers vote as a block.');

/* Town */
def('b', 'Bank', 14, 12, ({B, R, F, L, row}, c) => { F([[0, 0], [14, 0], [14, 12], [0, 12]], '#c9c4b6');
  B(2, 2, 0, 10, 8, 8, '#d8d0bd', {win:[...row('S', 1, 8.4, 1.85, 1.2, 1, 2), ...row('S', 1, 8.4, 1.85, 4.6, 1, 2), ...row('E', 1, 6.4, 1.8, 1.2, 1, 2), ...row('E', 1, 6.4, 1.8, 4.6, 1, 2), ['S', 4, 0, 2, 2.8, '#3a3125'], ['S', 2.8, 7, 4.4, 0.7, '#1f3a5a', 'BANQUE', '#f2c230']]});
  B(1.8, 1.8, 8, 10.4, 8.4, 0.6, '#bfb6a2'); for (let i = 0; i < 4; i++) L([[3.2 + i*1.2, 10.4, 0], [3.2 + i*1.2, 10.4, 3.2]], '#efe9dc', 1.4); B(2.6, 10, 3.2, 5, 0.8, 0.5, '#bfb6a2');
}, 'Company credit, project loans after a flow test, mortgages.');
def('b', 'Bourse du Jura', 14, 10, ({B, F, L, row}, c) => { F([[0, 0], [14, 0], [14, 10], [0, 10]], '#d6d3cb');
  B(2, 2, 0, 9, 6, 9, '#7fb6da', {top:'#e9ecef', win:[...row('S', 0.2, 8.2, 1, 0.3, 0.06, 8.4, '#e9ecef'), ['S', 0.4, 6.2, 8.2, 0.9, '#121417', '▲ 10.40  ▼ 2.1%', '#45d16a']]});
  B(11.5, 6, 0, 1.4, 0.3, 2, '#c9a23a', {win:[['S', 0.1, 0.8, 1.2, 0.8, '#d8b54a', 'OFS', '#3a2c0a']]});
}, 'A glass cube with an LED ticker in the new quarter. Shares, announcements, buybacks. The federal office plate is next door.');
def('b', 'La Feuille de la Faille', 14, 11, ({B, R, F, L, row}, c) => { F([[0, 0], [14, 0], [14, 11], [0, 11]], '#c9c4b6');
  B(2, 2, 0, 10, 7, 7, '#e9e2d2', {win:[...row('S', 0.8, 8.4, 1.9, 1, 1.1, 1.6), ...row('S', 0.8, 8.4, 1.9, 4, 1.1, 1.6), ['S', 4.4, 0, 1.4, 2.4, '#3a3a3a'], ['S', 0.8, 5.9, 8.4, 0.9, '#1c2225', 'LA FEUILLE DE LA FAILLE', '#f4f1e8']]});
  R(2, 2, 7, 10, 7, 2, c.slate, 'x', '#e9e2d2', 0.3); B(12, 8.4, 0, 1.2, 0.8, 1.4, '#2c5f93', {win:[['S', 0.1, 0.5, 1, 0.6, '#f4f2ec']]});
}, 'The valley paper. Crises are answered here; the CEO comes in person.');
def('b', 'Gendarmerie', 14, 12, ({B, R, F, L, row}, c) => { F([[0, 0], [14, 0], [14, 12], [0, 12]], '#c9c4b6');
  B(2, 2, 0, 10, 7, 6, '#ece8e0', {win:[...row('S', 0.8, 8.4, 1.9, 1, 1.1, 1.5), ...row('S', 0.8, 8.4, 1.9, 3.8, 1.1, 1.5), ['S', 4.4, 0, 1.4, 2.4, '#2a4fa0'], ['S', 3, 2.6, 4, 0.8, '#1f4fa0', 'POLICE', '#fff']]});
  R(2, 2, 6, 10, 7, 2.2, c.slate, 'x', '#ece8e0', 0.4); F([[1, 9.5], [13, 9.5], [13, 11.5], [1, 11.5]], PAL.asphalt); L([[12.5, 3, 0], [12.5, 3, 9]], '#c9ccd0', 0.8);
}, 'The police come from here. Favours, the sports fund.');
def('b', 'Canton house', 18, 14, ({B, R, F, L, row}, c) => { F([[0, 0], [18, 0], [18, 14], [0, 14]], '#c9c4b6');
  B(2, 2, 0, 14, 9, 9, '#ebe5d6', {win:[...row('S', 1, 12, 1.9, 1.2, 1.1, 2.2), ...row('S', 1, 12, 1.9, 5, 1.1, 2.2), ...row('E', 1, 7.4, 2, 1.2, 1.1, 2.2), ...row('E', 1, 7.4, 2, 5, 1.1, 2.2), ['S', 6, 0, 2, 3, '#3a3125'], ['S', 3.6, 7.6, 6.8, 0.8, '#b8322a', 'CANTON', '#fff']]});
  R(2, 2, 9, 14, 9, 3, c.slate, 'x', '#ebe5d6', 0.5); L([[9, 12.5, 0], [9, 12.5, 11]], '#c9ccd0', 1); B(9.05, 12.4, 9.4, 0.06, 2, 1.4, '#b8322a', {noline:1}); B(9.07, 13.1, 9.4, 0.04, 1.3, 1.4, '#f4f2ec', {noline:1});
  B(15.6, 11.2, 1, 1.4, 0.2, 1, '#c9a23a', {win:[['S', 0.1, 0.2, 1.2, 0.6, '#d8b54a', 'FED', '#3a2c0a']]});
}, 'Concession, permits, the review, the 1970s archive, the vote. The federal office has its brass plate here.');
def('b', 'Villa', 18, 14, ({B, F, L, row}, c) => { F([[0, 0], [18, 0], [18, 14], [0, 14]], '#93ab78'); F([[10, 8.5], [16, 8.5], [16, 12.5], [10, 12.5]], '#4fa3d1');
  B(2, 2, 0, 12, 6, 3.6, '#f6f3ea', {win:[...row('S', 0.6, 10, 2.4, 0.3, 2, 2.8), ['E', 0.8, 0.4, 4, 2.6]]}); B(1.6, 1.6, 3.6, 12.8, 6.8, 0.5, '#3b3b44'); B(5, 2, 4.1, 7, 5, 2.8, '#f6f3ea', {win:[...row('S', 0.4, 6, 1.8, 0.4, 1.4, 2)]}); B(4.6, 1.6, 6.9, 7.8, 5.8, 0.4, '#3b3b44');
  for (let i = 0; i < 4; i++) L([[1, 9 + i*1.2, 0], [1, 9 + i*1.2, 1.6]], '#2b3036', 0.5);
}, 'On the knoll above the town. The lender lives here; his three black vans leave from here.');
def('b', 'Committee office', 11, 9, ({B, R, F, L, row}, c) => { F([[0, 0], [11, 0], [11, 9], [0, 9]], '#c9c4b6');
  B(1.5, 1.5, 0, 8, 5.5, 3.6, '#e6dccb', {win:[['S', 0.6, 0.3, 3, 2.2, '#f4f2ec', 'NON', '#b8322a'], ['S', 4.2, 0, 1.2, 2.4, '#5a4632'], ['S', 5.8, 0.6, 1.6, 1.6]]});
  R(1.5, 1.5, 3.6, 8, 5.5, 2.2, c.roof, 'x', '#e6dccb', 0.4); B(1.5, 7.05, 2.9, 8, 0.05, 0.7, '#f4f2ec', {noline:1, win:[['S', 0.2, 0.05, 7.6, 0.6, '#f4f2ec', 'JURA SANS FRACKING', '#b8322a']]});
}, 'The opposition\'s office. Debates take place here; the CEO drives over.');
def('b', 'University field station (gift)', 14, 10, ({B, F, C, L, row}, c) => { gravelPad(F, 14, 10, '#c9c4b6');
  B(1.5, 2, 0, 9, 5, 3, '#eef1f3', {win:[...row('S', 0.8, 7.4, 2.2, 0.9, 1.4, 1.2), ['S', 3.6, 0, 1.2, 2.3, '#5a6066'], ['S', 0.5, 2.3, 8, 0.6, '#7a2c5a', 'UNIVERSITÉ · STATION', '#fff']]});
  B(1.5, 2, 3, 9, 5, 0.3, '#c5ccd2'); C(12, 4, 0, 0.2, 3, '#9aa3ab'); C(12, 4, 3, 1, 0.3, '#f0f2f4');
}, 'Seismologists, the precise poll, the deep reading. Costs the company each month.');
def('b', 'Fountain', 6, 6, ({B, C, L, F}, c) => { F([[0, 0], [6, 0], [6, 6], [0, 6]], '#c9c4b6');
  B(1, 1, 0, 4, 4, 0.8, '#b8b2a4'); B(1.3, 1.3, 0.79, 3.4, 3.4, 0.02, '#5fa3c9', {noline:1}); C(3, 3, 0.8, 0.3, 1.6, '#b8b2a4'); C(3, 3, 2.4, 0.5, 0.2, '#b8b2a4');
}, 'A village wish: restored once.');
def('b', 'Railway station', 22, 8, ({B, R, F, L, row}, c) => { F([[0, 5], [22, 5], [22, 7.5], [0, 7.5]], '#7a705f'); L([[0, 5.8, 0.1], [22, 5.8, 0.1]], '#4a4f55', 0.5); L([[0, 6.8, 0.1], [22, 6.8, 0.1]], '#4a4f55', 0.5);
  B(6, 0.5, 0, 9, 4, 3.6, '#efe6d2', {win:[...row('S', 0.8, 7.4, 1.6, 0.8, 1, 1.8), ['S', 2.6, 2.6, 3.8, 0.7, '#2c4f7c', 'GARE', '#fff']]}); R(6, 0.5, 3.6, 9, 4, 1.8, c.roof, 'x', '#efe6d2', 0.8);
}, 'The line along the top of the valley.');
def('b', 'New quarter: coworking and sushi', 20, 10, ({B, F, row}, c) => { F([[0, 0], [20, 0], [20, 10], [0, 10]], '#d6d3cb');
  B(1.5, 2, 0, 9, 5, 5, '#e9ecef', {win:[...row('S', 0.3, 8.2, 1, 0.3, 0.8, 4.4), ['S', 0.6, 3.9, 7.8, 0.8, '#ffffff', 'COWORK', '#1c2225']]}); B(12.5, 3, 0, 5, 4, 3, '#2b2b2b', {top:'#3a3a3a', win:[['S', 0.6, 0.4, 3.8, 1.4, '#c94c3a'], ['S', 0.8, 2.1, 3.4, 0.6, '#d8342a', 'SUSHI', '#fff']]});
}, 'Where the valley is no longer quite the valley.');
def('b', 'Company information stand', 6, 5, ({B, L, F}, c) => {
  B(1, 1.5, 0, 4, 1.2, 1.1, c.co, {win:[['S', 0.2, 0.2, 3.6, 0.7, c.co, 'INFO', '#fff']]}); L([[1, 1.5, 1.1], [1, 1.5, 2.6]], '#9aa3ab', 0.5); L([[5, 1.5, 1.1], [5, 1.5, 2.6]], '#9aa3ab', 0.5);
  B(0.8, 1.2, 2.6, 4.4, 1.8, 0.1, c.co2, {h:[0.25, 0.25, 0, 0]});
}, 'Brochures and coffee in a village square.');
def('b', 'Protest camp', 12, 10, ({B, R, F, L}, c) => { F([[0, 0], [12, 0], [12, 10], [0, 10]], '#a7b98b');
  R(1, 1, 0, 3, 3.6, 1.8, '#3f7a4a', 'y', '#356a3f', 0.1); R(5, 1.5, 0, 3, 3.6, 1.8, '#c9622a', 'y', '#a8512a', 0.1); R(2.5, 5.5, 0, 3, 3.6, 1.8, '#2c5f93', 'y', '#244e79', 0.1);
  L([[8.5, 7, 0], [8.5, 7, 2.4]], '#7a5a3a', 0.5); L([[11, 7, 0], [11, 7, 2.4]], '#7a5a3a', 0.5); B(8.5, 6.95, 1.4, 2.5, 0.05, 1, '#f4f2ec', {noline:1, win:[['S', 0.1, 0.05, 2.3, 0.9, '#f4f2ec', 'NON', '#b8322a']]});
  B(9.5, 2, 0, 1, 1, 0.6, '#5a4632'); B(9.6, 3.5, 0, 0.5, 0.5, 0.8, '#c9a23a');
}, 'Tents at the gate of a site. Burns the site after a warning unless cleared.');
def('b', 'Burning barricade', 7, 5, ({B, C, F}, c) => { for (let i = 0; i < 5; i++) C(1 + i*1.2, 2.5, 0, 0.55, 0.45, '#2b2b2b'); for (let i = 0; i < 4; i++) C(1.6 + i*1.2, 2.5, 0.45, 0.55, 0.45, '#2b2b2b');
  B(1, 2, 0.9, 1.2, 1, 1.4, '#e8742a', {noline:1, h:[0.4, 1.6, 0.6, 1.1]}); B(3, 2, 0.9, 1.4, 1, 1.8, '#f2b23a', {noline:1, h:[1.2, 0.4, 1.8, 0.6]});
}, 'Tyres on the road. The gendarmerie comes by itself.');

/* Vehicles (length along x, front at +x). Rounded bodies (bevel), round wheels. */
const lights = (x, d, z) => [['E', 0.15, z, 0.3, 0.22, '#fff2b0'], ['E', d - 0.45, z, 0.3, 0.22, '#fff2b0']];
const axle = (W, xs, y0, y1, r) => { for (const x of xs){ W(x, y0, r); W(x, y1, r); } };
def('v', 'Company car (old 911)', 4.4, 1.8, ({B, W}, c) => { const col = '#4a6b45';
  axle(W, [0.95, 3.45], 0.2, 1.6, 0.33);
  B(0.2, 0.2, 0.3, 4, 1.4, 0.5, col, {bv:0.18, win:[...lights(3.95, 1.4, 0.18)]});
  B(0.55, 0.32, 0.8, 1.2, 1.16, [0.03, 0.42, 0.42, 0.03], col);
  B(1.75, 0.32, 0.8, 1.1, 1.16, 0.42, col, {bv:0.12, win:[['S', 0.12, 0.06, 0.86, 0.28]]});
  B(2.85, 0.32, 0.8, 0.55, 1.16, [0.42, 0.04, 0.04, 0.42], '#9fc3d6');
}, 'Never named. Drives the CEO to debates, interviews and crises.');
def('v', 'Geologist\'s pickup', 5.2, 1.9, ({B, W}, c) => { axle(W, [1.1, 4.1], 0.2, 1.7, 0.4);
  B(0.2, 0.2, 0.35, 4.8, 1.5, 0.75, '#f6f5f0', {bv:0.15, win:[['S', 0.5, 0.3, 1.4, 0.32, c.co, 'ÉG', '#fff'], ...lights(4.8, 1.5, 0.35)]});
  B(2.5, 0.28, 1.1, 1.8, 1.34, 0.7, '#f6f5f0', {bv:0.14, win:[['S', 0.15, 0.1, 1.45, 0.42], ['E', 0.12, 0.1, 1.1, 0.42]]});
  B(0.3, 0.3, 1.1, 2.1, 1.3, 0.22, '#d4d3cc'); B(4.3, 0.5, 1.15, 0.2, 0.9, 0.4, '#3a3f45');
}, 'Plants the prospect flags.');
const truck = (B, W, cab, body, len, opts) => { opts = opts || {}; axle(W, opts.axles || [1.3, len - 2.2, len - 1.1], 0.25, 2.25, 0.48);
  B(len - 2.3, 0.2, 0.55, 2.1, 2.1, 2.3, cab, {bv:0.3, win:[['S', 0.2, 1.05, 1.4, 0.8], ['E', 0.2, 1.05, 1.7, 0.8], ...lights(len - 0.2 - (len - 2.3), 2.1, 0.25)]}); };
def('v', 'Supply lorry', 8, 2.5, ({B, W}, c) => { truck(B, W, c.co, 0, 8); B(0.2, 0.2, 0.7, 5.3, 2.1, 2.3, '#eceef0', {bv:0.15, win:[['S', 0.6, 0.8, 4, 0.6, c.co, 'ÉNERGIE-GÉO', '#fff']]}); }, 'Brings drilling supplies from the depot.');
def('v', 'Low-loader with rig', 14, 2.8, ({B, W, L}, c) => { axle(W, [1.2, 2.4, 3.6, 11.4], 0.3, 2.5, 0.45);
  B(11.6, 0.3, 0.55, 2.2, 2.2, 2.3, '#d0663a', {bv:0.3, win:[['S', 0.2, 1.05, 1.5, 0.8], ['E', 0.2, 1.05, 1.8, 0.8]]}); B(0.2, 0.4, 0.55, 11.2, 2, 0.35, '#3a3f45', {bv:0.08});
  B(1, 0.6, 0.9, 7.5, 1.6, 1.3, '#7a828a', {bv:0.15}); B(1.2, 1.1, 2.2, 10, 0.6, 0.35, c.co2, {bv:0.08}); }, 'Brings a rig to a pad and back; the mast lies folded on top.');
def('v', 'Vibro-truck', 8, 2.6, ({B, W}, c) => { truck(B, W, '#f0c33c', 0, 8, {axles:[1.3, 6.7]}); B(0.2, 0.25, 0.7, 5.2, 2.1, 1.6, '#f0c33c', {bv:0.2, win:[['S', 0.4, 0.5, 3.8, 0.55, '#3a3f45', 'VIBRO-SOND', '#f0c33c']]});
  B(2, 0.6, 0.15, 2.2, 1.4, 0.5, '#3a3f45', {bv:0.1}); }, 'Shakes the ground along a survey line, in a slow convoy.');
def('v', 'Tipper (builders)', 7, 2.5, ({B, W}, c) => { truck(B, W, '#e6e3da', 0, 7, {axles:[1.1, 2.3, 5.8]}); B(0.2, 0.25, 0.9, 4.4, 2.05, 1.3, '#a07a46', {bv:0.15, h:[1.1, 1.5, 1.5, 1.1]}); }, 'Roads, pads, flattening, buildings.');
def('v', 'Excavator', 5.4, 3, ({B, L}, c) => { B(0.4, 0.2, 0, 4.4, 0.7, 0.7, '#2f3337', {bv:0.25}); B(0.4, 2.1, 0, 4.4, 0.7, 0.7, '#2f3337', {bv:0.25}); B(1, 0.6, 0.7, 3, 1.8, 0.9, '#f0c33c', {bv:0.2});
  B(1.2, 0.8, 1.6, 1.4, 1.3, 1.3, '#f0c33c', {bv:0.15, win:[['S', 0.12, 0.35, 1.1, 0.75], ['E', 0.12, 0.35, 1, 0.75]]}); L([[3.6, 1.5, 1.6], [5.4, 1.5, 3.1], [6.3, 1.5, 0.9]], '#d9a23a', 2.4); B(5.9, 1.1, 0.2, 0.8, 0.8, 0.6, '#3a3f45', {bv:0.1}); }, '');
def('v', 'Post bus', 11, 2.5, ({B, W}, c) => { axle(W, [1.9, 8.8], 0.2, 2.3, 0.45); B(0.2, 0.2, 0.4, 10.6, 2.1, 2.7, '#f5c636', {bv:0.35, win:[...[0.6, 2.1, 3.6, 5.1, 6.6, 8.1].map(a => ['S', a, 1.25, 1.25, 0.85]), ['E', 0.25, 1.05, 1.6, 1.15], ['S', 9.4, 0, 0.9, 2, '#5a6066'], ['S', 0.6, 0.45, 4, 0.5, '#f5c636', 'CAR POSTAL', '#b8322a'], ...lights(10.6, 2.1, 0.3)]}); }, 'Evening bus as a village gift.');
def('v', 'Police car', 4.8, 1.9, ({B, W}, c) => { axle(W, [1, 3.8], 0.2, 1.7, 0.34); B(0.2, 0.2, 0.3, 4.4, 1.5, 0.62, '#f6f6f3', {bv:0.2, win:[['S', 0.4, 0.2, 3.6, 0.16, '#2a4fa0'], ['S', 1.2, 0.36, 2, 0.22, '#f6f6f3', 'POLICE', '#2a4fa0'], ...lights(4.4, 1.5, 0.22)]});
  B(1.2, 0.32, 0.92, 2.3, 1.26, 0.55, '#f6f6f3', {bv:0.16, win:[['S', 0.16, 0.08, 1.95, 0.36], ['E', 0.1, 0.08, 1, 0.36]]}); B(2.05, 0.65, 1.47, 0.6, 0.6, 0.16, '#3b7bf0', {bv:0.05}); }, 'From the gendarmerie, never from the edge of the map.');
def('v', 'Police van', 6, 2.2, ({B, W}, c) => { axle(W, [1.2, 4.7], 0.2, 2, 0.4); B(0.2, 0.2, 0.4, 5.6, 1.8, 2.1, '#f6f6f3', {bv:0.3, win:[['S', 0.3, 0.55, 5, 0.22, '#2a4fa0'], ['S', 0.4, 1.15, 1.2, 0.65], ['E', 0.2, 1.15, 1.4, 0.65], ['S', 2.2, 0.85, 2.6, 0.45, '#f6f6f3', 'POLICE', '#2a4fa0'], ...lights(5.6, 1.8, 0.3)]}); B(2.4, 0.8, 2.5, 0.8, 0.6, 0.15, '#3b7bf0', {bv:0.05}); }, '');
def('v', 'Riot police bus', 10, 2.5, ({B, W}, c) => { axle(W, [1.8, 8.1], 0.2, 2.3, 0.45); B(0.2, 0.2, 0.4, 9.6, 2.1, 2.7, '#33405e', {bv:0.35, win:[...[0.6, 2.6, 4.6, 6.6].map(a => ['S', a, 1.35, 1.5, 0.7, '#55658a']), ['E', 0.25, 1.15, 1.6, 0.95, '#55658a'], ['S', 1, 0.45, 4, 0.5, '#33405e', 'POLICE', '#e8e8e2'], ...lights(9.6, 2.1, 0.3)]}); B(4, 0.8, 3.1, 0.8, 0.8, 0.15, '#3b7bf0', {bv:0.05}); }, 'Shields, no batons.');
def('v', 'Black van (the lender)', 5.4, 2.1, ({B, W}, c) => { axle(W, [1.1, 4.3], 0.2, 1.9, 0.38); B(0.2, 0.2, 0.4, 5, 1.7, 1.85, '#1d2024', {bv:0.32, win:[['S', 0.3, 0.95, 1.1, 0.55, '#3a4048'], ['E', 0.2, 0.95, 1.3, 0.55, '#3a4048'], ...lights(5, 1.7, 0.25)]}); }, 'Three of them, slowly, from the villa. No plates.');
def('v', 'Tractor with manure spreader', 9.4, 2.6, ({B, W}, c) => { W(0.9, 0.35, 0.45); W(0.9, 2.25, 0.45); W(2.9, 0.3, 0.8, 0.5); W(2.9, 2.3, 0.8, 0.5); W(6.2, 0.3, 0.45); W(6.2, 2.3, 0.45);
  B(5.1, 0.6, 0.75, 4, 1.4, 0.75, '#c63a2c', {bv:0.25, win:[...lights(4, 1.4, 0.2)].map(w => w)}); B(2.1, 0.55, 1.4, 1.6, 1.5, 1.5, '#c63a2c', {bv:0.2, win:[['S', 0.12, 0.25, 1.35, 1], ['E', 0.12, 0.25, 1.25, 1]]});
  B(0.2, 0.45, 0.6, 3.9, 1.7, 1.2, '#3f7a4a', {bv:0.2}); B(0.3, 0.55, 1.8, 3.7, 1.5, 0.18, '#5a4632'); }, 'The farmers\' blockade.');
def('v', 'Fire engine', 9, 2.5, ({B, W, L}, c) => { axle(W, [1.6, 6.5, 7.7], 0.2, 2.3, 0.45); B(0.2, 0.2, 0.45, 8.6, 2.1, 2.4, '#d02a20', {bv:0.3, win:[['S', 6.9, 1.05, 1.4, 0.8], ['E', 0.2, 1.05, 1.7, 0.8], ['S', 0.4, 0.35, 6, 0.22, '#f2f0ea'], ['S', 1.2, 0.9, 4, 0.45, '#d02a20', 'POMPIERS', '#fff'], ...lights(8.6, 2.1, 0.3)]}); L([[0.6, 1.25, 2.95], [7.4, 1.25, 2.95]], '#c9ccd0', 1.4); }, '');
def('v', 'Army truck', 8, 2.5, ({B, W}, c) => { truck(B, W, '#5b6b45', 0, 8); B(0.2, 0.2, 0.75, 5.3, 2.1, 2.35, '#6b7a52', {bv:0.4}); }, 'Only in the secret ending.');
def('v', 'Police helicopter', 16, 2.4, ({B, L, C}, c) => { B(5.6, 0.5, 1.1, 4.2, 1.4, 1.6, '#f6f6f3', {bv:0.55, win:[['E', 0.12, 0.55, 1.15, 0.8], ['S', 2.4, 0.15, 1.6, 0.26, '#2a4fa0']]}); B(8.8, 0.6, 1.3, 1.2, 1.2, 1.1, '#9fc3d6', {bv:0.4});
  B(0.8, 1, 1.9, 5, 0.4, 0.4, '#f6f6f3', {bv:0.12}); B(0.4, 1, 1.9, 0.6, 0.4, 1.2, '#2a4fa0', {bv:0.1});
  L([[7.6, 1.2, 2.7], [7.6, 1.2, 3.2]], '#3a3f45', 1); L([[2.6, 1.2, 3.2], [12.6, 1.2, 3.2]], '#3a3f45', 0.8); L([[7.6, -3.8, 3.2], [7.6, 6.2, 3.2]], '#3a3f45', 0.8); L([[6, 0.4, 0.4], [9.2, 0.4, 0.4]], '#3a3f45', 0.6); L([[6, 2, 0.4], [9.2, 2, 0.4]], '#3a3f45', 0.6); }, 'The last resort.');
def('v', 'F-35', 16, 11, ({B}, c) => { const g = '#7d848b'; B(0, 4.6, 6, 16, 1.8, 1.2, g, {h:[0.6, 1.2, 1.2, 0.6]}); B(5, 0, 6.2, 6, 11, 0.3, g, {h:[0.1, 0.3, 0.3, 0.1]}); B(0, 3, 6.3, 2.6, 5, 0.2, g); B(0.4, 4.4, 6.9, 2, 0.4, 2, g); B(0.4, 6.2, 6.9, 2, 0.4, 2, g);
  B(11.2, 4.9, 7, 2.6, 1.2, 0.6, '#c9a23a', {h:[0.6, 0.2, 0.2, 0.6]}); }, 'Only in the secret ending.');
def('v', 'Regional train', 24, 3, ({B}, c) => { for (const x0 of [0.3, 12.2]) B(x0, 0.2, 0.6, 11.5, 2.6, 3, '#d4d7da', {bv:0.4, win:[...[0.6, 2.4, 4.2, 6, 7.8, 9.6].map(a => ['S', a, 1.4, 1.3, 0.9]), ['S', 0.2, 0.45, 11, 0.28, '#b8322a']]}); }, 'Along the top of the valley.');

/* ---------------------------------------------------------------- people */
const PEOPLE = [];
const person = (n, o, note) => PEOPLE.push(Object.assign({n, note}, o));
person('The CEO', {top:'#2b2f36', bot:'#2b2f36', hair:'#5a4632', skin:'#efc9a8', tie:'#b8322a', item:'case'}, 'Grey at the temples, dark suit. Drives the 911.');
person('Suit (woman)', {top:'#1f2329', bot:'#1f2329', hair:'#3a2b20', long:1, skin:'#f2d2b6', tie:'#f4f2ec', item:'case', skirt:1}, 'Lent by the association.');
person('Suit (man)', {top:'#1f2329', bot:'#1f2329', hair:'#2b2522', skin:'#e8c09c', tie:'#2c5f93', item:'case'}, '');
person('Geologist', {top:'#e07a2c', bot:'#3a4a63', hair:'#7a4a2a', long:1, skin:'#f2d2b6', hat:'#f4f4f2', item:'board', vest:1}, 'White helmet, clipboard. Drives the pickup.');
person('Driller', {top:'#e07a2c', bot:'#e07a2c', hair:'#3a2b20', skin:'#d9a882', hat:'#f2c230', vest:1}, 'Orange overalls.');
person('Driller (woman)', {top:'#e07a2c', bot:'#e07a2c', hair:'#c9a24a', long:1, skin:'#f2d2b6', hat:'#f2c230', vest:1}, '');
person('Mud engineer', {top:'#3a5f8a', bot:'#3a4a63', hair:'#2b2522', skin:'#c98e66', hat:'#f4f4f2', item:'bottle'}, '');
person('Water officer', {top:'#2c8a8a', bot:'#3a4a63', hair:'#8a5a3a', long:1, skin:'#f2d2b6', item:'bottle'}, 'Samples springs.');
person('Community liaison', {top:'#b05a6a', bot:'#4a4f55', hair:'#2b2522', long:1, skin:'#a8704a', item:'cup'}, 'Coffee with the neighbours.');
person('Security guard', {top:'#2b2f36', bot:'#2b2f36', hair:'#2b2522', skin:'#e8c09c', hat:'#2b2f36', vest:1}, '');
person('Seismologist', {top:'#6a5a8a', bot:'#4a4f55', hair:'#c9c4b6', skin:'#f2d2b6', item:'laptop'}, 'From the university station.');
person('Plant operator', {top:'#3a5f8a', bot:'#3a5f8a', hair:'#5a4632', long:1, skin:'#e8c09c', hat:'#f4f4f2'}, '');
person('Villager (woman)', {top:'#7a8f6e', bot:'#4a4f55', hair:'#8a5a3a', long:1, skin:'#f2d2b6', skirt:1}, '');
person('Villager (man)', {top:'#8a6a4a', bot:'#3a4a63', hair:'#c9c4b6', skin:'#e8c09c', hat:'#5a4632', cap:1}, '');
person('Farmer', {top:'#2c5f93', bot:'#2c5f93', hair:'#5a4632', skin:'#d9a882', hat:'#3a3f45', cap:1, item:'fork'}, 'Blue work jacket.');
person('Mayor', {top:'#3a3f45', bot:'#3a3f45', hair:'#c9c4b6', long:1, skin:'#f2d2b6', sash:1}, 'With the sash on fête days.');
person('Protester with sign', {top:'#3f7a4a', bot:'#3a4a63', hair:'#c94c3a', long:1, skin:'#f2d2b6', item:'sign', sign:'NON'}, 'In a march.');
person('Protester with sign (2)', {top:'#c9622a', bot:'#4a4f55', hair:'#2b2522', skin:'#a8704a', item:'sign', sign:'STOP'}, '');
person('Police officer', {top:'#2a4fa0', bot:'#1f2a44', hair:'#2b2522', skin:'#e8c09c', hat:'#1f2a44', cap:1}, '');
person('Riot police', {top:'#1f2a44', bot:'#1f2a44', hair:'#1f2a44', skin:'#e8c09c', hat:'#2b2f36', helmet:1, item:'shield'}, '');
person('Journalist (La Feuille)', {top:'#c9a24a', bot:'#3a3f45', hair:'#3a2b20', long:1, skin:'#f2d2b6', item:'camera'}, '');
person('Banker', {top:'#3a4a63', bot:'#3a4a63', hair:'#5a4632', skin:'#e8c09c', tie:'#c9a23a', item:'case'}, '');
person('The lender', {top:'#f4f2ec', bot:'#f4f2ec', hair:'#1c1f22', skin:'#d9a882', tie:'#1c1f22', hat:'#f4f2ec', cap:1, glasses:1}, 'White suit, dark glasses.');
person('Association presenter', {top:'#3d6b45', bot:'#4a4f55', hair:'#7a4a2a', long:1, skin:'#f2d2b6', item:'board'}, 'Gives the slide show.');
person('Soldier', {top:'#5b6b45', bot:'#5b6b45', hair:'#2b2522', skin:'#e8c09c', hat:'#4a5838', helmet:1}, 'Only in the secret ending.');
person('Child', {top:'#e8b730', bot:'#3a4a63', hair:'#8a5a3a', skin:'#f2d2b6', small:1}, '');

/* draws a person standing on (x, y) in screen pixels; u = pixel size; dir 0 front-left, 1 front-right, 2 back-left, 3 back-right.
   Chibi proportions: big round head, short body; a dark outline pass first, then colours. */
function drawPerson(g, x, y, u, p, dir){
  const back = dir >= 2, flip = dir === 1 || dir === 3, k = p.small ? 0.78 : 1, OUT = '#2a2d33';
  g.save(); if (flip){ g.translate(x*2, 0); g.scale(-1, 1); }
  g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x, y, 4.2*u, 1.2*u, 0, 0, Math.PI*2); g.fill();
  const pass = (o) => {
    const R = (c, px, py, w, h, r) => { const e = o ? 0.7 : 0, X = x + (px - e)*u, Y = y + (py*k - e)*u, Wd = (w + e*2)*u, Hd = (h*k + e*2)*u; g.fillStyle = o ? OUT : c;
      if (r){ const rr = Math.min(r*u, Wd/2, Hd/2); g.beginPath(); g.moveTo(X + rr, Y); g.arcTo(X + Wd, Y, X + Wd, Y + Hd, rr); g.arcTo(X + Wd, Y + Hd, X, Y + Hd, rr); g.arcTo(X, Y + Hd, X, Y, rr); g.arcTo(X, Y, X + Wd, Y, rr); g.fill(); } else g.fillRect(X, Y, Wd, Hd); };
    // legs and shoes
    if (p.skirt){ R(p.skin, -1.7, -4.2, 1.3, 3.6); R(p.skin, 0.4, -4.2, 1.3, 3.6); R(p.bot, -2.6, -7.6, 5.2, 3.8, 1.2); }
    else { R(p.bot, -2, -6.2, 1.8, 5.6, 0.5); R(p.bot, 0.2, -6.2, 1.8, 5.6, 0.5); }
    R('#2b2522', -2.3, -1.2, 2.2, 1.2, 0.5); R('#2b2522', 0.1, -1.2, 2.2, 1.2, 0.5);
    // body and arms
    R(p.top, -2.8, -11.6, 5.6, 6, 1.6); R(p.top, -3.9, -11, 1.4, 4.6, 0.7); R(p.top, 2.5, -11, 1.4, 4.6, 0.7);
    R(p.skin, -3.9, -6.8, 1.4, 1.3, 0.6); R(p.skin, 2.5, -6.8, 1.4, 1.3, 0.6);
    // head
    R(p.skin, -3.4, -19.2, 6.8, 7.4, 2.6);
    if (o) return;
    if (p.vest) R('#f2e23a', -2.8, -9.2, 5.6, 0.8);
    if (p.tie && !back){ R('#f4f2ec', -0.8, -11.6, 1.6, 1.4, 0.4); R(p.tie, -0.4, -11, 0.8, 3.4, 0.3); }
    if (p.sash && !back) for (let i = 0; i < 5; i++) R(i % 2 ? '#f4f2ec' : '#c63a2c', -2.6 + i*1.05, -11.2 + i*1.05, 1.1, 1.1);
    // hair
    if (back) R(p.hair, -3.5, -19.4, 7, p.long ? 8.4 : 6, 2.6);
    else { R(p.hair, -3.5, -19.6, 7, 2.6, 2); R(p.hair, 2.1, -19.2, 1.4, p.long ? 7.6 : 3.4, 0.7); if (p.long) R(p.hair, -3.5, -19, 1.2, 7.4, 0.6);
      R('#2a2d33', -1.7, -15.6, 0.9, 1.3, 0.4); R('#2a2d33', 0.6, -15.6, 0.9, 1.3, 0.4); R('#f2a3a3', -2.6, -14, 1.1, 0.7, 0.3); R('#f2a3a3', 1.5, -14, 1.1, 0.7, 0.3); R('#b0645a', -0.5, -13.4, 1, 0.4);
      if (p.glasses){ R('#1c1f22', -2.3, -16.1, 2, 1.5, 0.4); R('#1c1f22', 0.2, -16.1, 2, 1.5, 0.4); } }
    if (p.hat){ if (p.helmet){ R(p.hat, -3.8, -20.4, 7.6, 3.6, 2.4); } else if (p.cap){ R(p.hat, -3.6, -20.4, 7.2, 2.4, 1.2); if (!back) R(p.hat, -5, -18.6, 2.4, 0.8, 0.4); } else { R(p.hat, -3.6, -21, 7.2, 3, 1.6); R(p.hat, -4.4, -18.6, 8.8, 0.8, 0.4); } }
    // items, held on the screen-left side
    if (p.item === 'case') R('#6a4a32', -5.4, -7, 2.4, 2, 0.5);
    if (p.item === 'board'){ R('#c9a24a', -5.8, -10.4, 2.2, 2.8, 0.4); R('#f4f2ec', -5.5, -9.9, 1.6, 1.9); }
    if (p.item === 'bottle') R('#9fd0e8', -5.2, -8.4, 1.2, 2.2, 0.5);
    if (p.item === 'cup') R('#f4f2ec', -5.2, -8.8, 1.3, 1.4, 0.3);
    if (p.item === 'laptop') R('#3a3f45', -6, -9, 3, 1.7, 0.3);
    if (p.item === 'camera'){ R('#1c1f22', -5.8, -12.4, 2.8, 1.9, 0.5); R('#5a6066', -6.4, -11.9, 0.8, 0.9, 0.3); }
    if (p.item === 'fork'){ R('#8a6a4a', -4.8, -17, 0.6, 16); R('#9aa3ab', -5.6, -18.2, 2.2, 0.5); for (let i = 0; i < 3; i++) R('#9aa3ab', -5.6 + i*0.8, -19.4, 0.4, 1.3); }
    if (p.item === 'shield'){ R('#a9c7e8', -6.6, -12.4, 3, 9, 0.8); R('#1f2a44', -6.1, -9.4, 2, 0.6); }
    if (p.item === 'sign'){ R('#8a6a4a', -4.9, -22, 0.6, 14); R('#f4f2ec', -8.4, -27.6, 7.6, 5.6, 0.6); }
  };
  pass(true); pass(false);
  g.restore();
  if (p.item === 'sign' && !back){ g.fillStyle = '#c63a2c'; g.font = Math.round(3.2*u) + 'px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.sign || 'NON', x + (flip ? 4.6 : -4.6)*u, y + (-24.8*k)*u); }
}

window.ART = {models:M, people:PEOPLE, draw, drawPerson, PAL};
})();
