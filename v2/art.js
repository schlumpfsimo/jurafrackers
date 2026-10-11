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
  const push = p => (parts.push(p), p), vox = new Map();
  const H = {
    // block; h is one height or four corner heights [x0y0, x1y0, x1y1, x0y1]
    B:(x, y, z, w, d, h, c, o) => push(Object.assign({t:'blk', x, y, z, w, d, h:Array.isArray(h) ? h : [h, h, h, h], c}, o || {})),
    // gable roof on a w×d footprint; ridge along x ('x') or y ('y'); side = gable wall colour
    R(x, y, z, w, d, h, c, ax, side, ov){ ov = ov ?? 0.4; const o = {side:side || c, roof:1, kx:x + w/2, ky:y + d/2};
      if ((ax || 'x') === 'x'){ push(Object.assign({t:'blk', x:x - 0.1, y:y - ov, z, w:w + 0.2, d:d/2 + ov, h:[0, 0, h, h], c}, o)); push(Object.assign({t:'blk', x:x - 0.1, y:y + d/2, z, w:w + 0.2, d:d/2 + ov, h:[h, h, 0, 0], c}, o)); }
      else { push(Object.assign({t:'blk', x:x - ov, y:y - 0.1, z, w:w/2 + ov, d:d + 0.2, h:[0, h, h, 0], c}, o)); push(Object.assign({t:'blk', x:x + w/2, y:y - 0.1, z, w:w/2 + ov, d:d + 0.2, h:[h, 0, 0, h], c}, o)); } },
    X:(pts, z, h, c, o) => push(Object.assign({t:'prism', pts, z, h, c}, o || {})),                  // extruded outline: wings, rounded bodies
    O:(cx, cy, z, rx, ry, h, c, o) => { const pts = []; for (let i = 0; i < 8; i++){ const a = (i + 0.5)/8*Math.PI*2; pts.push([cx + Math.cos(a)*rx, cy + Math.sin(a)*ry]); } return push(Object.assign({t:'prism', pts, z, h, c}, o || {})); },   // octagon: round things
    S:(x, y, z, r, c) => push({t:'puff', x, y, z, r, c:c || 'rgba(120,120,120,.55)'}),               // smoke puff
    W:(x, y, r, w, o) => push(Object.assign({t:'whl', x, y, r, w:w || r*0.6}, o || {})),              // wheel, axle along y
    Y:(x, y, z, w, d, h, c, o) => push(Object.assign({t:'pyr', x, y, z, w, d, h, c}, o || {})),       // pyramid (spires, hip caps)
    C:(x, y, z, r, h, c, o) => push(Object.assign({t:'cyl', x, y, z, r, h, c}, o || {})),          // vertical cylinder centred on x,y
    L:(pts, c, lw, o) => push(Object.assign({t:'ln', pts, c, lw:lw || 1}, o || {})),                 // 3D polyline
    G:(x, y, o, zt) => push({t:'fig', x, y, o, zt}),                                               // a drawn person standing at x,y
    F:(pts, c, o) => push(Object.assign({t:'flat', pts, c}, o || {})),                                // ground decal
    T:(x, y, z, txt, o) => push(Object.assign({t:'txt', x, y, z, txt}, o || {})),                     // floating label (screen-aligned)
    // a row of windows on a face: face, from, to, step, z, w, h
    Q:(pts, c, o) => push(Object.assign({t:'q', pts, c}, o || {})),                                // flat 3D polygon: fins, blades; o.face shows it only from that side
    V:(x, y, z, w, d, h, c) => { for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) for (let k = z; k < z + h; k++) vox.set(i + ',' + j + ',' + k, c); },   // voxels (people), 0.1 m cubes
    SD:(x0, x1, y0, y1, z0, z1, fn, o) => { const L = (o && o.lift) || 0, f = L ? (x, y, z) => fn(x, y, z - L) : fn; return push(Object.assign({t:'sdf', b:[x0, x1, y0, y1, z0 + L, z1 + L], fn:f, zt:z1 + L}, o || {})); },
    raw:p => push(p),   // smooth volume, rendered per pixel
    VF:(u, x0, x1, y0, y1, z0, z1, fn) => { const cells = []; for (let i = Math.floor(x0/u); i*u < x1; i++) for (let j = Math.floor(y0/u); j*u < y1; j++) for (let k = Math.floor(z0/u); k*u < z1; k++){ const c = fn((i + 0.5)*u, (j + 0.5)*u, (k + 0.5)*u); if (c) cells.push([i, j, k, c]); }
      return push({t:'vox', u, cells, zt:(Math.max(...cells.map(q => q[2])) + 1)*u}); },
    row:(f, a0, a1, step, z, w, h, c) => { const r = []; for (let a = a0; a <= a1 + 1e-6; a += step) r.push([f, a, z, w, h, c]); return r; },
  };
  fn(H, PAL);
  if (vox.size){ const cells = [...vox].map(([k, c]) => [...k.split(',').map(Number), c]); push({t:'vox', u:0.1, cells, zt:(Math.max(...cells.map(q => q[2])) + 1)*0.1}); }
  // anything standing on top of a block is drawn after the ground-level parts
  for (const p of parts){ if (p.z === undefined || p.z <= 0 || p.t === 'ln' || p.t === 'txt' || p.t === 'puff') continue; const pc = p.pts ? [p.pts.reduce((a, q) => a + q[0], 0)/p.pts.length, p.pts.reduce((a, q) => a + q[1], 0)/p.pts.length] : null;
    const cx = p.kx ?? (pc ? pc[0] : p.t === 'cyl' ? p.x : p.x + (p.w || 0)/2), cy = p.ky ?? (pc ? pc[1] : p.t === 'cyl' ? p.y : p.y + (p.d || 0)/2);
    for (const q of parts){ if (q === p || (q.t !== 'blk' && q.t !== 'prism') || q.z >= p.z) continue; const top = q.z + (q.t === 'prism' ? q.h : Math.max(...q.h)); if (q.t === 'prism'){ const xs = q.pts.map(v => v[0]), ys = q.pts.map(v => v[1]); if (Math.abs(top - p.z) < 0.2 && cx >= Math.min(...xs) && cx <= Math.max(...xs) && cy >= Math.min(...ys) && cy <= Math.max(...ys)){ p.up = (q.up || 0) + 1; p.par = q; break; } continue; } if (Math.abs(top - p.z) < 0.35 && cx >= q.x - 0.01 && cx <= q.x + q.w + 0.01 && cy >= q.y - 0.01 && cy <= q.y + q.d + 0.01){ p.up = (q.up || 0) + 1; p.par = q; break; } } }
  return parts;
}

/* ---------------------------------------------------------------- renderer */
function draw(g, model, rot, S, ox, oy, post){
  post = post || [];
  const W = model.W, D = model.D, rp = (x, y) => rot === 0 ? [x, y] : rot === 1 ? [D - y, x] : rot === 2 ? [W - x, D - y] : [y, W - x];
  const P = (x, y, z) => [ox + (x - y)*S, oy + (x + y)*S/2 - z*S];
  const poly = (pts, fill, line) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = fill; g.fill(); if (line){ g.strokeStyle = line; g.lineWidth = model.lines ? 0.9 : Math.max(0.6, S*0.12); g.stroke(); } };
  const rf = f => FACES[(FACES.indexOf(f) + rot) % 4];
  const items = [];
  const cen = p => { let x, y; if (p.kx !== undefined){ x = p.kx; y = p.ky; } else if (p.t === 'prism'){ x = p.pts.reduce((a, q) => a + q[0], 0)/p.pts.length; y = p.pts.reduce((a, q) => a + q[1], 0)/p.pts.length; } else if (p.t === 'cyl'){ x = p.x; y = p.y; } else { x = p.x + (p.w || 0)/2; y = p.y + (p.d || 0)/2; } const q = rp(x, y); return q[0] + q[1]; };
  const key = p => p.par ? key(p.par) + 0.1 + cen(p)*0.001 : cen(p);
  model.parts.forEach((p, i) => {
    if (p.t === 'blk'){
      const L = [[p.x, p.y, p.h[0]], [p.x + p.w, p.y, p.h[1]], [p.x + p.w, p.y + p.d, p.h[2]], [p.x, p.y + p.d, p.h[3]]].map(([x, y, h]) => { const q = rp(x, y); return [q[0], q[1], h]; });
      const xs = L.map(q => q[0]), ys = L.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const hAt = (x, y) => L.find(q => Math.abs(q[0] - x) < 1e-6 && Math.abs(q[1] - y) < 1e-6)[2];
      const kc = p.kx !== undefined ? rp(p.kx, p.ky) : [(x0 + x1)/2, (y0 + y1)/2];
      items.push({k:key(p) + (p.roof ? 1e-4 : 0) + (p.k || 0) + ((x0 + x1)/2 + (y0 + y1)/2)*1e-5, i, f(){
        const z = p.z, c = p.c, line = p.noline || (model.cat === 'p' && !model.lines) ? null : 'rgba(20,24,28,.38)';
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
        if (model.cat === 'b' && z === 0 && h00 >= 2.4 && !p.roof && h00 === h11){ const pb = 0.45; poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, pb), P(x0, y1, pb)], sh(sideS, 0.72), null); poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, pb), P(x1, y0, pb)], sh(sideE, 0.6), null); }
        const sx = (h10 + h11) - (h00 + h01), sy = (h01 + h11) - (h00 + h10), top = p.top || (sx + sy < -1e-6 ? sh(c, 1.1) : sx + sy > 1e-6 ? sh(c, 0.72) : sh(c, 1.1));
        const faces = !p.roof || 1 - (h10 - h00)/(x1 - x0) - (h01 - h00)/(y1 - y0) > 0;   // a steep roof slope facing away is hidden behind its gable
        if (faces) poly([P(x0, y0, z + h00), P(x1, y0, z + h10), P(x1, y1, z + h11), P(x0, y1, z + h01)], top, line);
        if (p.roof && faces){ const cr = [[x0, y0, h00], [x1, y0, h10], [x1, y1, h11], [x0, y1, h01]]; for (let e = 0; e < 4; e++) if (cr[e][2] < 1e-6 && cr[(e + 1) % 4][2] < 1e-6){ const a0 = cr[e], a1 = cr[(e + 1) % 4], b1 = cr[(e + 2) % 4], b0 = cr[(e + 3) % 4], nL = Math.max(2, Math.round(Math.hypot(b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2])/0.55));
            g.strokeStyle = sh(c, 0.82); g.lineWidth = Math.max(0.6, S*0.08); for (let t = 1; t < nL; t++){ const u = t/nL, pA = P(a0[0] + (b0[0] - a0[0])*u, a0[1] + (b0[1] - a0[1])*u, z + b0[2]*u), pB = P(a1[0] + (b1[0] - a1[0])*u, a1[1] + (b1[1] - a1[1])*u, z + b1[2]*u); g.beginPath(); g.moveTo(pA[0], pA[1]); g.lineTo(pB[0], pB[1]); g.stroke(); } break; }
          g.strokeStyle = sh(c, 0.55); g.lineWidth = Math.max(1, S*0.22); const lo = [[x0, y0, h00], [x1, y0, h10], [x1, y1, h11], [x0, y1, h01]].filter(q => q[2] < 1e-6); if (lo.length === 2){ g.beginPath(); const a = P(lo[0][0], lo[0][1], z), b = P(lo[1][0], lo[1][1], z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
        }
        for (const wv of p.win || []){ const [f, a, wz, ww, wh, wc, txt, tc] = wv, fr = rf(f); if (fr !== 'E' && fr !== 'S') continue;
          const lp = f === 'E' ? [[p.x + p.w, p.y + a], [p.x + p.w, p.y + a + ww]] : f === 'W' ? [[p.x, p.y + p.d - a], [p.x, p.y + p.d - a - ww]] : f === 'S' ? [[p.x + a, p.y + p.d], [p.x + a + ww, p.y + p.d]] : [[p.x + p.w - a, p.y], [p.x + p.w - a - ww, p.y]];
          const A = rp(...lp[0]), Bq = rp(...lp[1]), col = wc || PAL.glass, base = z + wz;
          poly([P(A[0], A[1], base), P(Bq[0], Bq[1], base), P(Bq[0], Bq[1], base + wh), P(A[0], A[1], base + wh)], fr === 'E' ? sh(col, 0.85) : col, txt ? 'rgba(20,24,28,.5)' : null);
          if (!txt && model.cat === 'b' && wh > 0.7 && ww > 0.6 && wh < 4){ const M2 = (u, v) => P(A[0] + (Bq[0] - A[0])*u, A[1] + (Bq[1] - A[1])*u, base + wh*v); g.strokeStyle = 'rgba(40,44,50,.55)'; g.lineWidth = Math.max(0.7, S*0.1);
            g.beginPath(); const c1 = M2(0, 0), c2 = M2(1, 0), c3 = M2(1, 1), c4 = M2(0, 1); g.moveTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.lineTo(c4[0], c4[1]); g.closePath(); g.stroke();
            if (ww > 0.9 && col === PAL.glass || col === '#9fc3d6' || col === '#7fa6c4' || col === '#8fb0c4'){ g.beginPath(); const m1 = M2(0.5, 0), m2 = M2(0.5, 1), m3 = M2(0, 0.55), m4 = M2(1, 0.55); g.moveTo(m1[0], m1[1]); g.lineTo(m2[0], m2[1]); g.moveTo(m3[0], m3[1]); g.lineTo(m4[0], m4[1]); g.stroke(); }
            if (wz > 0.4){ g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, S*0.16); g.beginPath(); const s1 = M2(-0.06, -0.04), s2 = M2(1.06, -0.04); g.moveTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.stroke(); } }
          if (txt){ const m1 = P((A[0] + Bq[0])/2, (A[1] + Bq[1])/2, base + wh/2), len = Math.hypot(Bq[0] - A[0], Bq[1] - A[1])*S*1.12, fs = Math.max(6, Math.round(S*wh*0.8)), skew = fr === 'S' ? 0.5 : -0.5;
            post.push(() => { g.save(); g.fillStyle = tc || '#fff'; g.font = fs + 'px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(txt).width, fit = Math.min(1, (len*0.9)/tw);
              g.translate(m1[0], m1[1]); g.transform(1, skew, 0, 1, 0, 0); g.scale(fit, 1); g.fillText(txt, 0, 0.5); g.restore(); }); } }
      }});
    } else if (p.t === 'cyl'){
      const q = rp(p.x, p.y); items.push({k:key(p) + (p.k || 0), i, f(){
        const b = P(q[0], q[1], p.z), t = P(q[0], q[1], p.z + p.h), rx = p.r*S*1.41, ry = rx/2;
        g.fillStyle = sh(p.c, 0.85); g.fillRect(b[0] - rx, t[1], rx*2, b[1] - t[1]); g.beginPath(); g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); g.fill();
        g.fillStyle = sh(p.c, 0.72); g.fillRect(b[0] + rx*0.35, t[1], rx*0.65, b[1] - t[1]);
        g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI*2); g.fillStyle = p.top || sh(p.c, 1.12); g.fill(); g.strokeStyle = 'rgba(20,24,28,.35)'; g.lineWidth = Math.max(0.6, S*0.12); g.stroke();
      }});
    } else if (p.t === 'ln'){
      const pts = p.pts.map(([x, y, z]) => { const q = rp(x, y); return [q[0], q[1], z]; }), ax = pts.reduce((a, q) => a + q[0] + q[1], 0)/pts.length;
      items.push({k:ax + (p.k || 0), i, f(){ g.beginPath(); pts.forEach((q, j) => { const s = P(q[0], q[1], q[2]); j ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.strokeStyle = p.c; g.lineWidth = Math.max(0.8, S*0.18*p.lw); g.stroke(); }});
    } else if (p.t === 'prism'){
      const pts = p.pts.map(q => rp(q[0], q[1])), n = pts.length; let area = 0; for (let j = 0; j < n; j++){ const a = pts[j], b = pts[(j + 1) % n]; area += a[0]*b[1] - b[0]*a[1]; }
      const sg = area > 0 ? 1 : -1, cx = pts.reduce((a, q) => a + q[0], 0)/n, cy = pts.reduce((a, q) => a + q[1], 0)/n;
      items.push({k:key(p) + (p.k || 0), i, f(){ const z = p.z, zt = p.z + p.h, ln = p.noline || (model.cat === 'p' && !model.lines) ? null : 'rgba(20,24,28,.38)', sides = [];
        for (let j = 0; j < n; j++){ const a = pts[j], b = pts[(j + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], nx = sg*dy, ny = -sg*dx; if (nx + ny <= 1e-9) continue; const L2 = Math.hypot(nx, ny), f = 0.74 + 0.16*(ny/L2 + 1 - nx/L2)/2; sides.push({a, b, f, d:a[0] + a[1] + b[0] + b[1]}); }
        if (p.h > 0) sides.sort((u, v) => u.d - v.d).forEach(sd => poly([P(sd.a[0], sd.a[1], z), P(sd.b[0], sd.b[1], z), P(sd.b[0], sd.b[1], zt), P(sd.a[0], sd.a[1], zt)], sh(p.side || p.c, sd.f), ln));
        poly(pts.map(q => P(q[0], q[1], zt)), p.top || sh(p.c, 1.1), ln); }});
    } else if (p.t === 'q'){
      const pts = p.pts.map(([x, y, z]) => { const q = rp(x, y); return [q[0], q[1], z]; }), fr = p.face ? rf(p.face) : null;
      if (fr && fr !== 'E' && fr !== 'S') return;
      const ka = p.kx !== undefined ? rp(p.kx, p.ky) : null; items.push({k:(ka ? ka[0] + ka[1] : pts.reduce((a, q) => a + q[0] + q[1], 0)/pts.length) + (p.k || 0), i, f(){ poly(pts.map(q => P(q[0], q[1], q[2])), fr === 'E' ? sh(p.c, 0.8) : p.c, p.line || null); }});
    } else if (p.t === 'vox'){
      const u = p.u, set = new Map(), cs = p.cells.map(([x, y, z, c]) => { const a = rp(x*u, y*u), b = rp((x + 1)*u, (y + 1)*u), rx = Math.round(Math.min(a[0], b[0])/u), ry = Math.round(Math.min(a[1], b[1])/u); set.set(rx + ',' + ry + ',' + z, 1); return [rx, ry, z, c]; });
      cs.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]) || a[2] - b[2]);
      items.push({k:(p.k || 0), i, f(){ for (const [x, y, z, c0] of cs){ const fl = c0[0] === '!', c = fl ? c0.slice(1) : c0, X0 = x*u, Y0 = y*u, Z0 = z*u, X1 = X0 + u, Y1 = Y0 + u, Z1 = Z0 + u;
        if (!set.has(x + ',' + (y + 1) + ',' + z)) poly([P(X0, Y1, Z0), P(X1, Y1, Z0), P(X1, Y1, Z1), P(X0, Y1, Z1)], sh(c, fl ? 0.9 : 0.86));
        if (!set.has((x + 1) + ',' + y + ',' + z)) poly([P(X1, Y0, Z0), P(X1, Y1, Z0), P(X1, Y1, Z1), P(X1, Y0, Z1)], sh(c, fl ? 0.9 : 0.7));
        if (!set.has(x + ',' + y + ',' + (z + 1))) poly([P(X0, Y0, Z1), P(X1, Y0, Z1), P(X1, Y1, Z1), P(X0, Y1, Z1)], sh(c, fl ? 0.9 : 1.06)); } }});
    } else if (p.t === 'sdf'){
      const [x0, x1, y0, y1] = p.b, c0 = rp(x0, y0), c1 = rp(x1, y1); items.push({k:(c0[0] + c1[0])/2 + (c0[1] + c1[1])/2 + (p.k || 0), i, f(){ volume(g, p, rot, S, ox, oy, W, D); }});
      if (p.badge){ const bd = p.badge, q = rp(bd.x, bd.y), at = P(q[0], q[1], bd.z); post.push(() => pixelPlate(g, Math.round(at[0]), Math.round(at[1]), bd.text, bd.bg, bd.fg, Math.max(1, Math.round(S/12)))); }
      for (const [f, a0, a1, z, hh, txt, tc, pl] of p.labels || []){ const fr = rf(f); if (fr !== 'E' && fr !== 'S') continue;
        const A = rp(...(f === 'S' ? [a0, pl] : f === 'N' ? [a1, pl] : f === 'E' ? [pl, a0] : [pl, a1])), Bq = rp(...(f === 'S' ? [a1, pl] : f === 'N' ? [a0, pl] : f === 'E' ? [pl, a1] : [pl, a0]));
        const m1 = P((A[0] + Bq[0])/2, (A[1] + Bq[1])/2, z + hh/2), len = Math.hypot(Bq[0] - A[0], Bq[1] - A[1])*S*1.12, fs = Math.max(6, Math.round(S*hh*0.8)), skew = fr === 'S' ? 0.5 : -0.5;
        post.push(() => { g.save(); g.fillStyle = tc; g.font = fs + 'px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(txt).width, fit = Math.min(1, (len*0.9)/tw);
          g.translate(m1[0], m1[1]); g.transform(1, skew, 0, 1, 0, 0); g.scale(fit, 1); g.fillText(txt, 0, 0.5); g.restore(); }); }
    } else if (p.t === 'fig'){
      const q = rp(p.x, p.y); items.push({k:q[0] + q[1] + (p.k || 0), i, f(){ figure(g, P(q[0], q[1], 0), S, rot, p.o); }});
    } else if (p.t === 'puff'){
      const q = rp(p.x, p.y); items.push({k:9000 + p.z, i, f(){ const c0 = P(q[0], q[1], p.z); g.beginPath(); g.arc(c0[0], c0[1], p.r*S, 0, Math.PI*2); g.fillStyle = p.c; g.fill(); }});
    } else if (p.t === 'pyr'){
      const cs = [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.d], [p.x, p.y + p.d]].map(q => rp(q[0], q[1])), ap = rp(p.x + p.w/2, p.y + p.d/2);
      const xs = cs.map(q => q[0]), ys = cs.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), A = P(ap[0], ap[1], p.z + p.h);
      items.push({k:key(p) + (p.k || 0), i, f(){ const ln = 'rgba(20,24,28,.38)';
        poly([P(x0, y0, p.z), P(x1, y0, p.z), A], sh(p.c, 0.8), ln); poly([P(x0, y0, p.z), P(x0, y1, p.z), A], sh(p.c, 0.95), ln);
        poly([P(x0, y1, p.z), P(x1, y1, p.z), A], sh(p.c, 1.08), ln); poly([P(x1, y0, p.z), P(x1, y1, p.z), A], sh(p.c, 0.78), ln); }});
    } else if (p.t === 'whl'){
      const q = rp(p.x, p.y), alongX = rot % 2 === 0, cl = rp(p.x, D/2), near = q[0] + q[1] > cl[0] + cl[1];   // disk plane: x–z before rotation, y–z after an odd turn
      items.push({k:(near ? 5000 : -5000) + q[0] + q[1], i, f(){ const ring = (rr, dy, col) => { g.beginPath(); for (let t = 0; t <= 24; t++){ const a = t/24*Math.PI*2, cx = Math.cos(a)*rr, cz = Math.sin(a)*rr + p.r; const s2 = alongX ? P(q[0] + cx, q[1] + dy, cz) : P(q[0] + dy, q[1] + cx, cz); t ? g.lineTo(s2[0], s2[1]) : g.moveTo(s2[0], s2[1]); } g.closePath(); g.fillStyle = col; g.fill(); };
        ring(p.r, 0, '#1f2226'); ring(p.r*0.5, 0.01, '#9aa3ab'); ring(p.r*0.2, 0.02, '#5a6066'); }});
    } else if (p.t === 'flat'){
      const pts = p.pts.map(([x, y]) => rp(x, y)); items.push({k:-1e4 + i, i, f(){ poly(pts.map(q => P(q[0], q[1], p.z || 0)), p.c, p.line || null); }});
    } else if (p.t === 'txt'){
      const q = rp(p.x, p.y); items.push({k:1e4 + i, i, f(){ if (p.post){ const s0 = P(q[0], q[1], p.z); post.push(() => { g.font = (p.size || 7) + 'px "Silkscreen", monospace'; g.textAlign = 'center'; g.fillStyle = p.color || '#1c2225'; g.fillText(p.txt, Math.round(s0[0]), Math.round(s0[1])); }); return; } const s = P(q[0], q[1], p.z); g.font = (p.size || 7) + 'px "Silkscreen", monospace'; g.textAlign = 'center'; const tw = g.measureText(p.txt).width;
        if (p.bg){ g.fillStyle = p.bg; g.fillRect(s[0] - tw/2 - 2, s[1] - (p.size || 7) + 1, tw + 4, (p.size || 7) + 2); } g.fillStyle = p.color || '#1c2225'; g.fillText(p.txt, s[0], s[1]); }});
    }
  });
  items.sort((a, b) => a.k - b.k || a.i - b.i).forEach(it => it.f());
  return post;
}

/* ---------------------------------------------------------------- volumes (for sampled voxel models) */
const segD = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = ab[0]*ab[0] + ab[1]*ab[1] + ab[2]*ab[2];
  const t = Math.max(0, Math.min(1, (ap[0]*ab[0] + ap[1]*ab[1] + ap[2]*ab[2])/L2)); return [Math.hypot(ap[0] - ab[0]*t, ap[1] - ab[1]*t, ap[2] - ab[2]*t), t]; };
const inCap = (p, a, b, r1, r2) => { const [d, t] = segD(p, a, b); return d <= r1 + (r2 - r1)*t; };                     // tapered capsule
const inEll = (p, c, rx, ry, rz) => ((p[0] - c[0])/rx)**2 + ((p[1] - c[1])/ry)**2 + ((p[2] - c[2])/rz)**2 <= 1;
const lerpT = (tab, x) => { if (x <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]){ const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0)*(x - x0)/(x1 - x0); } return tab[tab.length - 1][1]; };

/* 4×5 pixel letters for plates that must stay readable */
const GLYPH = {N:['1001', '1101', '1011', '1001', '1001'], O:['0110', '1001', '1001', '1001', '0110'], S:['0111', '1000', '0110', '0001', '1110'], T:['1111', '0110', '0110', '0110', '0110'], P:['1110', '1001', '1110', '1000', '1000'], E:['1111', '1000', '1110', '1000', '1111'], A:['0110', '1001', '1111', '1001', '1001'], U:['1001', '1001', '1001', '1001', '0110'], J:['0011', '0001', '0001', '1001', '0110'], R:['1110', '1001', '1110', '1010', '1001'], I:['1110', '0100', '0100', '0100', '1110']};
function pixelPlate(g, cx, cy, text, bg, fg, k){ const w = (text.length*5 + 3)*k, h = 9*k, x0 = cx - Math.floor(w/2), y0 = cy - Math.floor(h/2);
  g.fillStyle = '#2a2d33'; g.fillRect(x0 - k, y0 - k, w + 2*k, h + 2*k); g.fillStyle = bg; g.fillRect(x0, y0, w, h); g.fillStyle = fg;
  [...text].forEach((ch, i) => (GLYPH[ch] || []).forEach((row, r) => [...row].forEach((b, cc) => { if (b === '1') g.fillRect(x0 + (2 + i*5 + cc)*k, y0 + (2 + r)*k, k, k); }))); }

/* Smooth volumes drawn pixel by pixel: for every screen pixel find the nearest surface along the view, shade it from the
   surface direction with the buildings' light (top bright, south face mid, east face dark), in a few tone steps. */
function volume(g, p, rot, S, ox, oy, W, D){
  const [bx0, bx1, by0, by1, z0, z1] = p.b, inv = rot === 0 ? (X, Y) => [X, Y] : rot === 1 ? (X, Y) => [Y, D - X] : rot === 2 ? (X, Y) => [W - X, D - Y] : (X, Y) => [W - Y, X];
  const rpp = (x, y) => rot === 0 ? [x, y] : rot === 1 ? [D - y, x] : rot === 2 ? [W - x, D - y] : [y, W - x];
  const cs = [rpp(bx0, by0), rpp(bx1, by1)], RX0 = Math.min(cs[0][0], cs[1][0]), RX1 = Math.max(cs[0][0], cs[1][0]), RY0 = Math.min(cs[0][1], cs[1][1]), RY1 = Math.max(cs[0][1], cs[1][1]);
  const P = (x, y, z) => [ox + (x - y)*S, oy + (x + y)*S/2 - z*S], pts = []; for (const x of [RX0, RX1]) for (const y of [RY0, RY1]) for (const z of [z0, z1]) pts.push(P(x, y, z));
  const sx0 = Math.floor(Math.min(...pts.map(q => q[0]))), sx1 = Math.ceil(Math.max(...pts.map(q => q[0]))), sy0 = Math.floor(Math.min(...pts.map(q => q[1]))), sy1 = Math.ceil(Math.max(...pts.map(q => q[1])));
  const w = sx1 - sx0 + 1, h = sy1 - sy0 + 1, dz = p.step || Math.min(0.04, 0.5/S), hit = new Float32Array(w*h*3), col = new Array(w*h).fill(null);
  const at = (X, Y, z) => { const [x, y] = inv(X, Y); return p.fn(x, y, z); };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++){ const a = (sx0 + i + 0.5 - ox)/S, b = (sy0 + j + 0.5 - oy)/S;
    const zt = Math.min(z1, RX1 - a/2 - b, RY1 - b + a/2), zb = Math.max(z0, RX0 - a/2 - b, RY0 - b + a/2); if (zt < zb) continue;
    let zp = zt + dz, found = null;
    for (let z = zt; z >= zb; z -= dz){ const c = at(a/2 + b + z, b + z - a/2, z); if (c){ let lo = z, hi = Math.min(zp, zt); for (let k = 0; k < 5; k++){ const m = (lo + hi)/2; if (at(a/2 + b + m, b + m - a/2, m)) lo = m; else hi = m; } found = [lo, c]; break; } zp = z; }
    if (!found) continue; const z = found[0], o = (j*w + i)*3; hit[o] = a/2 + b + z; hit[o + 1] = b + z - a/2; hit[o + 2] = z; col[j*w + i] = found[1]; }
  const img = g.createImageData(w, h), d = img.data, Lx = 0.345, Ly = 0.636, Lz = 1;
  const pt = (i, j) => (i < 0 || j < 0 || i >= w || j >= h || !col[j*w + i]) ? null : [hit[(j*w + i)*3], hit[(j*w + i)*3 + 1], hit[(j*w + i)*3 + 2]];
  const depth = q => q[0] + q[1] + q[2];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++){ const c0 = col[j*w + i]; if (!c0) continue; const q = pt(i, j), dq = depth(q);
    const near = (n) => n && Math.abs(depth(n) - dq) < 0.35 ? n : null;
    const r = near(pt(i + 1, j)), l = near(pt(i - 1, j)), dn = near(pt(i, j + 1)), up = near(pt(i, j - 1));
    const ex = r && l ? [r[0] - l[0], r[1] - l[1], r[2] - l[2]] : r ? [r[0] - q[0], r[1] - q[1], r[2] - q[2]] : l ? [q[0] - l[0], q[1] - l[1], q[2] - l[2]] : null;
    const ey = dn && up ? [dn[0] - up[0], dn[1] - up[1], dn[2] - up[2]] : dn ? [dn[0] - q[0], dn[1] - q[1], dn[2] - q[2]] : up ? [q[0] - up[0], q[1] - up[1], q[2] - up[2]] : null;
    let n = [0, 0, 1]; if (ex && ey){ n = [ex[1]*ey[2] - ex[2]*ey[1], ex[2]*ey[0] - ex[0]*ey[2], ex[0]*ey[1] - ex[1]*ey[0]]; if (n[0] + n[1] + n[2] < 0) n = n.map(v => -v); const L = Math.hypot(...n) || 1; n = n.map(v => v/L); }
    const flat = c0[0] === '!', c = flat ? c0.slice(1) : c0;
    let f = flat ? 1 : Math.max(0.6, Math.min(1.14, 0.55 + 0.55*(n[0]*Lx + n[1]*Ly + n[2]*Lz))); f = Math.round(f*10)/10;
    // a darker pixel where something nearer covers this part: reads as a contour
    for (const nb of [pt(i + 1, j), pt(i - 1, j), pt(i, j + 1), pt(i, j - 1)]) if (nb && depth(nb) - dq > 0.35){ f *= flat ? 1 : 0.84; break; }
    const [R, G, B] = c[0] === '#' ? hex(c) : c.match(/\d+/g).map(Number), k = v => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v)*(f - 1) : v*f))), o = (j*w + i)*4; d[o] = k(R); d[o + 1] = k(G); d[o + 2] = k(B); d[o + 3] = 255; }
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(img, 0, 0); g.drawImage(tmp, sx0, sy0);
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
def('b', 'Maison de la géothermie', 16, 13, ({B, F, L, row}, c) => { F([[0, 0], [16, 0], [16, 13], [0, 13]], '#a7b98b'); F([[1.5, 9.5], [14.5, 9.5], [14.5, 12.5], [1.5, 12.5]], '#b58a5a');
  const glass = '#bfe0ee', mull = (f, n, len) => row(f, len/n - 0.06, len - len/n, len/n, 0, 0.12, 3.4, '#4a5560');
  B(1.5, 1.2, 0, 13, 8.6, 0.15, '#d8d4ca');
  B(2.5, 2, 0.15, 11, 7, 3.4, glass, {top:'#e9ecef', win:[...mull('S', 8, 11), ...mull('E', 5, 7), ...mull('N', 8, 11), ...mull('W', 5, 7), ['S', 4.6, 0, 1.8, 2.6, '#7fb0c8']]});
  for (const [x, y] of [[2.5, 2], [13.36, 2], [13.36, 8.86], [2.5, 8.86]]) B(x, y, 0.15, 0.14, 0.14, 3.4, '#4a5560', {noline:1});
  B(1.7, 1.2, 3.55, 12.6, 8.6, 0.4, '#f4f2ec');
  B(2.2, 11.4, 0, 6.4, 0.35, 1.3, '#3d6b45', {win:[['S', 0.3, 0.3, 5.8, 0.75, '#3d6b45', 'GÉOTHERMIE-HELVETICA', '#f4f2ec'], ['N', 0.3, 0.3, 5.8, 0.75, '#3d6b45', 'GÉOTHERMIE-HELVETICA', '#f4f2ec']]});
  L([[15.3, 12.3, 0], [15.3, 12.3, 5.6]], '#c9ccd0', 0.8); B(15.32, 12.2, 4.5, 0.06, 1.4, 1, '#3d6b45', {noline:1}); }, 'The association on campus: a glass pavilion with a thin roof, a timber deck, courses inside.');
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
    if (state === 'repair'){ const x0 = 0.8, x1 = 6.2, y0 = 3.3, y1 = 8.7, w = '#c98b3a', pl = '#a87a4a';   // a frame of poles, ledgers and boards on all four sides of the tower
      for (const [x, y] of [[x0, y0], [3.5, y0], [x1, y0], [x1, 6], [x1, y1], [3.5, y1], [x0, y1], [x0, 6]]) L([[x, y, 0], [x, y, 15]], w, 0.8);
      for (let z = 2.5; z <= 15; z += 2.5){ L([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]], w, 0.6);
        B(x0, y0 - 0.05, z - 0.08, x1 - x0, 0.5, 0.08, pl, {noline:1}); B(x0, y1 - 0.45, z - 0.08, x1 - x0, 0.5, 0.08, pl, {noline:1}); B(x0 - 0.05, y0, z - 0.08, 0.5, y1 - y0, 0.08, pl, {noline:1}); B(x1 - 0.45, y0, z - 0.08, 0.5, y1 - y0, 0.08, pl, {noline:1}); }
      for (let z = 0; z < 15; z += 5){ L([[x0, y1, z], [x1, y1, z + 5]], w, 0.5); L([[x1, y0, z], [x1, y1, z + 5]], w, 0.5); L([[x0, y0, z], [x1, y0, z + 5]], w, 0.5); L([[x0, y0, z], [x0, y1, z + 5]], w, 0.5); }
      B(13, 10.4, 0, 2, 1.4, 1.2, '#9aa3ab', {bv:0.15}); } } };
def('b', 'Church', 18, 12, church('ok'), 'Nave and bell tower.');
def('b', 'Church after a quake', 18, 12, church('broken'), 'Cracked walls, half the nave roof and the top of the tower gone, rubble, tape around it.');
def('b', 'Church under repair', 18, 12, church('repair'), 'Scaffolding around the tower while it is rebuilt.');
const ruinModel = (kind) => ({B, R, F, L, S, X}, c) => { const big = kind !== 'small', W0 = kind === 'farm' ? 24 : 10, D0 = kind === 'farm' ? 18 : big ? 10 : 9; F([[0, 0], [W0, 0], [W0, D0], [0, D0]], '#9a9584');
  const wall = kind === 'farm' ? '#efe6d4' : '#e6dccb', roof = kind === 'farm' ? '#6e4b38' : c.roof, char = '#3a332c';
  if (kind === 'farm'){ B(2, 3, 0, 4, 9, [3.6, 1.2, 0.6, 2.8], wall); B(2, 11.5, 0, 14, 0.5, [2.4, 0.8, 0.4, 3], wall); B(15.4, 3, 0, 0.6, 9, [1.4, 2.6, 0.5, 0.3], wall);
    X([[3, 4], [13, 3.5], [14.5, 9], [5, 11]], 0, 1.6, roof, {top:'#5a3e2e'}); X([[8, 6], [14, 5.5], [15, 10], [9, 10.5]], 1.6, 0.9, '#4a3528');
    for (const [x, y, a] of [[6, 5, 1], [9, 4, 0], [12, 7, 1]]) L([[x, y, 0.3], [x + (a ? 3 : 2), y + (a ? 2 : 3), 2.6]], char, 1.6);
    B(17.5, 3.4, 0, 3.6, 3.6, [5, 2.2, 1.4, 3.4], '#cfd3d6'); for (const [x, y, z, r] of [[9, 7, 3, 1.4], [8.4, 6.4, 5, 1.8], [9.4, 5.6, 7.4, 2.2], [8.6, 5, 10, 2.6], [12, 9, 2.6, 1], [11.6, 8.6, 4.4, 1.4]]) S(x, y, z, r); }
  else { const hh = big ? 5.6 : 3.2;
    B(1.5, 1.5, 0, 0.5, 6, [hh, hh*0.4, 0.6, hh*0.8], wall, {win:[['E', 1, 1, 1, 1.2, '#2b2f33']]}); B(1.5, 1.5, 0, 7, 0.5, [hh, hh*0.9, hh*0.3, hh*0.6], wall, {win:[['S', 1.2, 1, 1.1, 1.3, '#2b2f33'], ['S', 4, 1, 1.1, 1.3, '#2b2f33']]});
    B(8, 1.5, 0, 0.5, 2.5, [hh*0.9, 1, 0.4, hh*0.5], wall); B(2, 7, 0, 3, 0.5, [1.4, 0.6, 0.3, 1.1], wall);
    X([[2.5, 2.5], [8, 3], [8.6, 7.8], [3.2, 7.4]], 0, 0.9, '#bdb3a0', {top:'#a39886'}); X([[3, 3.5], [7.5, 2.8], [8.2, 6.5], [4, 7]], 0.9, 0.5, roof, {top:sh(roof, 0.8)});
    for (const [x, y, w, d, h] of [[1, 7.6, 1.4, 1, 0.5], [6.6, 7.8, 1.6, 1.1, 0.6], [8.6, 4.2, 1, 1.4, 0.4], [4.2, 8, 1.2, 0.8, 0.35]]) B(x, y, 0, w, d, h, '#cfc8b8', {bv:0.15});
    for (const [x, y, a] of [[3, 3, 1], [5, 4.5, 0], [6.5, 3.5, 1]]) L([[x, y, 1.3], [x + (a ? 2.2 : 1.4), y + (a ? 1.4 : 2.2), 2.8]], char, 1.5);
    for (const [x, y, z, r] of [[5, 5, 2.2, 0.9], [4.6, 4.6, 3.6, 1.2], [5.4, 4, 5.2, 1.5], [4.8, 3.6, 7.2, 1.8], [5.8, 3.2, 9.4, 2]]) S(x, y, z, r); } };
def('b', 'House, collapsed', 10, 9, ruinModel('small'), 'After a very big quake: walls down, the roof on the floor, charred beams, smoke.');
def('b', 'House, two storeys, collapsed', 10, 10, ruinModel('big'), 'One corner still standing; the rest is rubble, smoking.');
def('b', 'Farm, collapsed', 24, 18, ruinModel('farm'), 'The big roof came down on the barn; the silo broke; smoke for days.');
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
  R(2, 3, 4, 14, 9, 6.5, '#6e4b38', 'x', '#a07a55', 0.7); C(20.6, 6, 0, 1.7, 8.5, '#cfd3d6', {top:'#9aa3ab'}); B(17.5, 13, 0, 4, 3, 1, '#5a4632', {h:[1, 1.4, 0.8, 0.6]});
  for (let i = 0; i < 6; i++) L([[2 + i*2.2, 16.5, 0], [2 + i*2.2, 16.5, 1.1]], '#7a5a3a', 0.5); L([[2, 16.5, 0.9], [13, 16.5, 0.9]], '#7a5a3a', 0.4);
}, 'A Jura farmhouse under one huge roof, a silo, the manure heap. Farmers vote as a block.');

/* Town */
def('b', 'Bank', 16, 13, ({B, F, L, row}, c) => { F([[0, 0], [16, 0], [16, 13], [0, 13]], '#bdb9b0'); const con = '#aaa69d';
  B(3.5, 3, 0, 9, 6.5, 3, '#2f3a42', {win:[...row('S', 0.3, 8.2, 1.3, 0.2, 1.1, 2.6, '#5f7686'), ...row('E', 0.3, 5.5, 1.3, 0.2, 1.1, 2.6, '#5f7686')]});
  B(2, 1.5, 3, 12, 9.5, 6.5, con, {win:[...row('S', 0.8, 10.8, 1.5, 1, 0.3, 4.4, '#3a4046'), ...row('E', 0.8, 8.2, 1.5, 1, 0.3, 4.4, '#3a4046'), ...row('N', 0.8, 10.8, 1.5, 1, 0.3, 4.4, '#3a4046'), ...row('W', 0.8, 8.2, 1.5, 1, 0.3, 4.4, '#3a4046'), ...[0.3, 6.2].map(z => ['S', 0, z, 12, 0.06, '#8f8b83']), ...[0.3, 6.2].map(z => ['E', 0, z, 9.5, 0.06, '#8f8b83'])]});
  B(1.8, 1.3, 9.5, 12.4, 9.9, 0.5, '#9a968d'); B(5.5, 4, 10, 4, 3, 1.4, con);
  B(4.5, 11, 0, 7, 1.4, 0.3, '#9a968d'); B(5, 11.2, 0.3, 6, 1, 0.3, '#9a968d'); B(2, 11, 3.6, 0.1, 0.1, 0.1, con);
  B(2.2, 10.98, 4.4, 0.02, 0.02, 0.02, con, {win:[]}); B(5, 10.95, 7.6, 6, 0.06, 0.9, con, {noline:1, win:[['S', 0, 0, 6, 0.9, con, 'BANQUE', '#3a3f45']]}); }, 'Raw board-marked concrete, a heavy upper block on a recessed glass ground floor, slit windows.');
def('b', 'Bourse du Jura', 14, 10, ({B, F, L, row}, c) => { F([[0, 0], [14, 0], [14, 10], [0, 10]], '#d6d3cb');
  B(2, 2, 0, 9, 6, 9, '#7fb6da', {top:'#e9ecef', win:[...row('S', 0.2, 8.2, 1, 0.3, 0.06, 8.4, '#e9ecef'), ['S', 0.4, 6.2, 8.2, 0.9, '#121417', '▲ 10.40  ▼ 2.1%', '#45d16a']]});
  B(11.5, 6, 0, 1.4, 0.3, 2, '#c9a23a', {win:[['S', 0.1, 0.8, 1.2, 0.8, '#d8b54a', 'OFS', '#3a2c0a']]});
}, 'A glass cube with an LED ticker in the new quarter. Shares, announcements, buybacks. The federal office plate is next door.');
def('b', 'La Feuille de la Faille', 18, 13, ({B, R, F, L, row}, c) => { F([[0, 0], [18, 0], [18, 13], [0, 13]], '#c9c4b6'); const brick = '#b0563e';
  B(1.5, 2, 0, 14, 8, 5, brick, {win:[...row('S', 0.8, 12, 2.2, 1, 1.6, 2.6, '#9fc3d6'), ...row('E', 0.8, 5.6, 2.4, 1, 1.6, 2.6, '#9fc3d6'), ['S', 3.6, 3.85, 8.4, 0.9, '#1c2225', 'LA FEUILLE DE LA FAILLE', '#f4f1e8'], ...[3.75, 4.85].map(z => ['S', 0, z, 14, 0.1, '#8a3f2c'])]});
  for (let i = 0; i < 4; i++) B(1.5 + i*3.5, 2, 5, 3.5, 8, [0, 1.8, 1.8, 0], '#6f777e', {kx:8.5, ky:6, win:[['E', 0, 0, 8, 1.8, '#bcd8e4']]});
  B(16.1, 4.5, 0, 1.8, 3.6, 1.8, '#f4f2ec', {bv:0.3, win:[['E', 0.3, 0.6, 3, 0.5, '#f4f2ec', 'FEUILLE', '#1c2225'], ['W', 0.3, 0.6, 3, 0.5, '#f4f2ec', 'FEUILLE', '#1c2225']]}); }, 'The old printing house: red brick, a sawtooth roof over the presses, the delivery van outside.');
def('b', 'Gendarmerie', 18, 13, ({B, F, L, row}, c) => { F([[0, 0], [18, 0], [18, 13], [0, 13]], '#c9c4b6'); F([[10, 8], [17, 8], [17, 12.5], [10, 12.5]], c.asphalt);
  B(1.5, 2, 0, 8.5, 7, 6.4, '#e9e6de', {win:[...row('S', 0.6, 7, 1.6, 1, 1.2, 1.4), ...row('S', 0.6, 7, 1.6, 4.2, 1.2, 1.4), ...row('E', 0.8, 5.4, 1.6, 1, 1.2, 1.4), ...row('E', 0.8, 5.4, 1.6, 4.2, 1.2, 1.4), ['S', 0, 2.9, 8.5, 0.7, '#2a4fa0', 'POLICE', '#fff'], ['E', 0, 2.9, 7, 0.7, '#2a4fa0', 'GENDARMERIE', '#fff']]});
  B(10, 3, 0, 6.5, 5, 3.6, '#d9d6cc', {win:[['S', 0.4, 0, 2.6, 2.8, '#7d8790'], ['S', 3.4, 0, 2.6, 2.8, '#7d8790'], ['S', 0, 3, 6.5, 0.4, '#2a4fa0']]});
  B(1.3, 1.8, 6.4, 8.9, 7.4, 0.4, '#c8c4ba'); L([[3, 4, 6.8], [3, 4, 14]], '#9aa3ab', 1.2); L([[2.2, 4, 12], [3.8, 4, 12]], '#9aa3ab', 0.8); L([[2.4, 4, 10.4], [3.6, 4, 10.4]], '#9aa3ab', 0.8);
  B(12.6, 0.6, 0, 0.5, 0.5, 2.6, '#2a4fa0'); }, 'A 1970s police station: flat roof, a blue band, radio mast, two garages. The police come from here.');
def('b', 'Canton house', 22, 16, ({B, R, F, L, Y, row}, c) => { F([[0, 0], [22, 0], [22, 16], [0, 16]], '#d8d2c4'); F([[8, 11.5], [14, 11.5], [14, 15.5], [8, 15.5]], '#c2b9a6'); const st = '#e6dcc4';
  B(2, 2, 0, 18, 9.5, 8.5, st, {win:[...row('S', 1, 16, 2, 1.2, 1.1, 2.2, '#8fb0c4'), ...row('S', 1, 16, 2, 5, 1.1, 2.2, '#8fb0c4'), ...row('E', 1, 7.6, 2.2, 1.2, 1.1, 2.2, '#8fb0c4'), ...row('E', 1, 7.6, 2.2, 5, 1.1, 2.2, '#8fb0c4'), ['S', 0, 4.1, 18, 0.25, '#cfc3a6'], ['E', 0, 4.1, 9.5, 0.25, '#cfc3a6']]});
  Y(1.6, 1.6, 8.5, 18.8, 10.3, 4.2, '#59606a'); B(8, 11.5, 0, 6, 1, 9.4, st, {win:[['S', 2.2, 0, 1.6, 3, '#5a4632'], ['S', 1, 5, 1.1, 2.2, '#8fb0c4'], ['S', 3.9, 5, 1.1, 2.2, '#8fb0c4'], ['S', 1, 8.2, 4, 0.6, '#b8322a', 'CANTON', '#fff']]});
  R(8, 11.3, 9.4, 6, 1.4, 1.8, '#59606a', 'y', st, 0.2);
  L([[11, 15, 0], [11, 15, 12]], '#c9ccd0', 1); B(11.05, 14.9, 10.4, 0.06, 2, 1.4, '#b8322a', {noline:1}); B(11.07, 15.4, 10.4, 0.04, 1, 1.4, '#f4f2ec', {noline:1});
  B(18.6, 13, 0.8, 1.4, 0.2, 1, '#c9a23a', {win:[['S', 0.1, 0.2, 1.2, 0.6, '#d8b54a', 'FED', '#3a2c0a']]}); }, 'Baroque stone house with a hipped slate roof and a central bay. Permits, the review, the archive, the vote. The federal office has its plate here.');
def('b', 'Villa', 18, 14, ({B, F, L, row}, c) => { F([[0, 0], [18, 0], [18, 14], [0, 14]], '#93ab78'); F([[10, 8.5], [16, 8.5], [16, 12.5], [10, 12.5]], '#4fa3d1');
  B(2, 2, 0, 12, 6, 3.6, '#f6f3ea', {win:[...row('S', 0.6, 10, 2.4, 0.3, 2, 2.8), ['E', 0.8, 0.4, 4, 2.6]]}); B(1.6, 1.6, 3.6, 12.8, 6.8, 0.5, '#3b3b44'); B(5, 2, 4.1, 7, 5, 2.8, '#f6f3ea', {win:[...row('S', 0.4, 6, 1.8, 0.4, 1.4, 2)]}); B(4.6, 1.6, 6.9, 7.8, 5.8, 0.4, '#3b3b44');
  for (let i = 0; i < 4; i++) L([[1, 9 + i*1.2, 0], [1, 9 + i*1.2, 1.6]], '#2b3036', 0.5);
}, 'On the knoll above the town. The lender lives here; his three black vans leave from here.');
def('b', 'Committee office', 13, 11, ({B, R, F, L, row}, c) => { F([[0, 0], [13, 0], [13, 11], [0, 11]], '#c9c4b6'); F([[1, 8.5], [12, 8.5], [12, 10.5], [1, 10.5]], '#b3ab98'); const w = '#e6dccb', red = '#c63a2c';
  B(1.5, 1.5, 0, 9, 6.5, 3.8, w, {win:[['S', 0.5, 0.4, 3, 2.3, '#f4f2ec', 'NON', red], ['S', 4.2, 0, 1.2, 2.5, '#5a4632'], ['S', 5.9, 0.5, 2.6, 1.8, '#f4f2ec', 'STOP', red], ['E', 0.6, 0.6, 2.4, 1.6, '#f4f2ec', 'NON', red], ['E', 3.6, 0.6, 2.4, 1.6, red, '!', '#fff'], ['S', 0, 3.1, 9, 0.5, red, 'COMITÉ RÉFÉRENDAIRE', '#fff'], ['N', 0.5, 0.6, 3, 1.6, '#f4f2ec', 'NON', red], ['W', 0.6, 0.6, 2.4, 1.6, '#f4f2ec', 'NON', red]]});
  R(1.5, 1.5, 3.8, 9, 6.5, 2.4, '#9c4a3e', 'x', w, 0.4);
  for (const x of [1.8, 10.2]) L([[x, 4.75, 6.2], [x, 4.75, 9.4]], '#6a4a32', 1.3); B(1.8, 4.7, 7.2, 8.4, 0.1, 2.1, '#f4f2ec', {noline:1, win:[['S', 0, 0, 8.4, 2.1, '#f4f2ec', 'LE JURA SANS FRACKING', red], ['N', 0, 0, 8.4, 2.1, '#f4f2ec', 'LE JURA SANS FRACKING', red]]});
  L([[1.8, 4.75, 9.4], [10.2, 4.75, 9.4]], '#6a4a32', 0.8);
  for (const [x, t] of [[11.2, 'NON'], [12.2, 'STOP']]){ L([[x, 9.6, 0], [x, 9.6, 2.6]], '#8a6a4a', 0.8); B(x - 0.5, 9.55, 1.8, 1, 0.1, 0.8, '#f4f2ec', {noline:1, win:[['S', 0, 0, 1, 0.8, '#f4f2ec', t, red]]}); }
  B(2, 9, 0, 2.2, 0.8, 0.8, red, {bv:0.1}); for (let i = 0; i < 4; i++) B(5 + i*1.2, 9.1, 0, 0.9, 0.6, 0.5 + (i % 2)*0.3, '#c9b48a', {bv:0.08}); }, 'The opposition\'s office, plastered with NON and STOP, a huge LE JURA SANS FRACKING banner on the roof. Debates take place here.');
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

/* Vehicles: toy proportions, rounded, front at +x. Windows and lamps on all four faces so every orientation looks right. */
const GL = '#a8d3e8';
const allGlass = (len, wid, z, h) => [['E', 0.14, z, wid - 0.28, h, GL], ['W', 0.14, z, wid - 0.28, h, GL], ['S', 0.16, z, len - 0.32, h, GL], ['N', 0.16, z, len - 0.32, h, GL]];
const lamps = (wid, z) => [['E', 0.12, z, 0.3, 0.2, '#fff4b8'], ['E', wid - 0.42, z, 0.3, 0.2, '#fff4b8'], ['W', 0.12, z, 0.3, 0.2, '#e8473a'], ['W', wid - 0.42, z, 0.3, 0.2, '#e8473a']];
const wheels = (W, xs, D, r) => { for (const x of xs){ W(x, 0.18, r); W(x, D - 0.18, r); } };
const sides = (a, z, w, h, col, txt, tc) => [['S', a, z, w, h, col, txt, tc], ['N', a, z, w, h, col, txt, tc]];
def('v', 'Company car (old 911)', 4.3, 1.8, ({SD}, c) => { const ag = '#c9ced3', cy = 0.9;
  const topT = [[0, 0.6], [0.3, 0.84], [0.8, 0.92], [1.25, 1.02], [1.9, 1.27], [2.3, 1.31], [2.6, 1.26], [2.98, 0.97], [3.8, 0.86], [4.3, 0.62]];
  SD(0, 4.3, 0, 1.8, 0, 1.35, (x, y, z) => { const ay = Math.abs(y - cy);
    // wheels: dark tyres, light hubs, under round arches
    for (const wx of [0.85, 3.35]){ const rr = Math.hypot(x - wx, z - 0.32); if (rr < 0.32 && ay > 0.55 && ay < 0.9) return rr < 0.16 && ay > 0.82 ? '#aab1b8' : '#1f2226'; if (rr < 0.41 && ay > 0.55) return null; }
    if (z < 0.2) return null;
    // fenders: round hips over the wheels, wider at the back
    const hip = Math.max(0, 1 - ((x - 0.85)/0.75)**2)*0.07 + Math.max(0, 1 - ((x - 3.35)/0.7)**2)*0.04;
    const hw = 0.8 + hip, top = lerpT(topT, x);
    if (z > 0.95){ // glasshouse: narrower, glass sides, silver roof
      const cw = 0.66 - (z - 0.95)*0.55; if (ay > cw || z > top) return null;
      return z > top - 0.05 || (x > 2.32 && x < 2.42) ? ag : '#3c4954'; }
    const r = ay/hw; if (r > 1 || z > top - 0.08*r**4) return null;
    for (const s2 of [-1, 1]) if ((x - 4.12)**2 + (y - cy - s2*0.55)**2 < 0.03 && z > 0.7) return '#f4f0d8';           // round headlights
    if (x < 0.1 && z > 0.62 && z < 0.72) return '#b8322a';                                                         // tail light band
    if (z < 0.34 && (x < 0.12 || x > 4.18)) return '#9aa1a8';                                                       // bumpers
    return ag; }, {step:0.02});
}, 'The CEO\'s old silver 911: round headlights, sloping roof, wide hips. Not mentioned anywhere.');
/* Vehicle kit for smooth volumes: parts are [test, colour or paint(p)], the first part that holds a point gives its colour. */
const rbx = (x0, x1, y0, y1, z0, z1, r) => p => { const qx = Math.max(Math.abs(p[0] - (x0 + x1)/2) - ((x1 - x0)/2 - r), 0), qy = Math.max(Math.abs(p[1] - (y0 + y1)/2) - ((y1 - y0)/2 - r), 0), qz = Math.max(Math.abs(p[2] - (z0 + z1)/2) - ((z1 - z0)/2 - r), 0);
  return Math.abs(p[0] - (x0 + x1)/2) <= (x1 - x0)/2 && Math.abs(p[1] - (y0 + y1)/2) <= (y1 - y0)/2 && Math.abs(p[2] - (z0 + z1)/2) <= (z1 - z0)/2 && qx*qx + qy*qy + qz*qz <= r*r; };
const cyY = (x, z, r, y0, y1) => p => (p[0] - x)**2 + (p[2] - z)**2 <= r*r && p[1] >= y0 && p[1] <= y1;
const cyZ = (x, y, r, z0, z1) => p => (p[0] - x)**2 + (p[1] - y)**2 <= r*r && p[2] >= z0 && p[2] <= z1;
const cap3 = (a, b, r) => p => inCap(p, a, b, r, r);
const both = (...t) => p => t.every(f => f(p)), but = (t, u) => p => t(p) && !u(p);
const tyres = (xs, D, r, w) => xs.flatMap(x => [[cyY(x, r, r, 0.02, w || 0.32), p => Math.hypot(p[0] - x, p[2] - r) < r*0.45 ? '#aab1b8' : '#1f2226'], [cyY(x, r, r, D - (w || 0.32), D - 0.02), p => Math.hypot(p[0] - x, p[2] - r) < r*0.45 ? '#aab1b8' : '#1f2226']]);
const scene = parts => (x, y, z) => { const p = [x, y, z]; for (const [t, c] of parts) if (t(p)) return typeof c === 'function' ? c(p) : c; return null; };
const VG = '#8fb3c9', LAMP = '#fff4c8', TAIL = '#c8322a';
// paint helper: windows band on a box (sides and both ends), with pillars every 'pitch' metres
const glassBand = (base, z0, z1, x0, x1, pitch, frontX, rearX) => p => { if (p[2] > z0 && p[2] < z1){ if (frontX !== undefined && p[0] > frontX) return VG; if (rearX !== undefined && p[0] < rearX) return VG;
  if (p[0] > x0 && p[0] < x1 && (!pitch || ((p[0] - x0) % pitch) > 0.14)) return VG; } return typeof base === 'function' ? base(p) : base; };
const veh = (n, W, D, H, parts, note, o) => def('v', n, W, D, ({SD, Q}, c) => { SD(-0.3, W + 0.3, -0.1, D + 0.1, 0, H, scene(parts(c)), Object.assign({step:0.03}, o || {})); if (o && o.extra) o.extra(Q); }, note);

veh('Geologist\'s pickup', 5.4, 1.9, 2.1, c => { const wh = '#f4f3ee', bk = '#2b2f33', cy = 0.95; return [
  ...tyres([1.05, 4.35], 1.9, 0.42, 0.34),
  [p => p[0] > 1.68 && p[0] < 1.82 && p[2] > 1.45 && p[2] < 2.05 && (p[2] > 1.95 || Math.abs(p[1] - cy) > 0.62) && Math.abs(p[1] - cy) < 0.72, bk],          // roll bar
  [but(rbx(0.1, 1.95, 0.14, 1.76, 0.95, 1.5, 0.06), rbx(0.24, 1.82, 0.28, 1.62, 1.1, 1.6, 0.02)), p => p[0] < 0.16 && p[2] > 1.25 && Math.abs(p[1] - cy) > 0.62 ? TAIL : wh],      // bed
  [both(rbx(1.9, 4.05, 0.2, 1.7, 0.95, 1.9, 0.18), p => p[2] < 1.9 - Math.max(0, p[0] - 3.55)*1.05), glassBand(wh, 1.28, 1.78, 2.0, 3.95, 1.0, 3.62)],   // double cab
  [rbx(0.08, 5.32, 0.12, 1.78, 0.45, 1.12, 0.16), p => p[0] > 5.15 && p[2] > 0.62 && p[2] < 0.98 ? (Math.abs(p[1] - cy) > 0.55 && p[2] > 0.84 ? LAMP : bk) : p[2] < 0.6 && (p[0] > 5.2 || p[0] < 0.2) ? bk : p[0] > 2.4 && p[0] < 3.4 && p[2] > 0.7 && p[2] < 0.95 ? c.co : wh]]; },
  'Toyota-style double cab: four doors, black grille, a roll bar over the bed. Plants the prospect flags.');
veh('Supply lorry', 6.6, 2.4, 3.2, c => [
  ...tyres([1.1, 2.4, 5.4], 2.4, 0.52, 0.42),
  [rbx(4.6, 6.5, 0.2, 2.2, 0.6, 2.85, 0.32), glassBand(p => p[0] > 6.35 && p[2] < 1.0 && Math.abs(p[1] - 1.2) > 0.6 ? LAMP : c.co, 1.75, 2.5, 4.75, 6.3, 0, 6.35)],
  [rbx(0.2, 4.5, 0.2, 2.2, 0.8, 3.1, 0.14), p => p[2] > 1.8 && p[2] < 2.25 ? c.co : p[0] < 0.26 && p[2] < 1.05 ? TAIL : '#f2f2ee'],
  [rbx(0.3, 6.4, 0.55, 1.85, 0.45, 0.82, 0.05), '#33373b']], 'Brings drilling supplies from the depot.');
veh('Low-loader with rig', 11, 2.6, 2.9, c => [
  ...tyres([1, 2.1, 3.2, 9.8], 2.6, 0.46, 0.42),
  [rbx(9.1, 10.9, 0.25, 2.35, 0.6, 2.8, 0.32), glassBand(p => p[0] > 10.75 && p[2] < 1.0 && Math.abs(p[1] - 1.3) > 0.6 ? LAMP : '#d0663a', 1.75, 2.5, 9.25, 10.7, 0, 10.75)],
  [rbx(0.35, 8.85, 1.0, 1.6, 1.77, 2.1, 0.08), c.co2],
  [p => rbx(0.6, 8.0, 0.7, 1.9, 0.92, 1.78, 0.1)(p) && (((p[0] - 0.6) % 0.9) < 0.16 || Math.abs(p[1] - 1.3) > 0.5 || p[2] > 1.68 || p[2] < 1.02), '#7a828a'],     // the folded lattice mast
  [rbx(0.2, 9.1, 0.4, 2.2, 0.55, 0.92, 0.06), '#3a3f45']], 'Brings a rig to a pad and back; the mast lies folded on top.');
veh('Vibro-truck', 7.4, 2.6, 2.9, c => { const blue = '#2f6fbf'; return [
  ...tyres([1.25, 6.2], 2.6, 0.7, 0.5),
  [p => [[3.2, 0.5], [4.8, 0.5], [3.2, 2.1], [4.8, 2.1]].some(([x, y]) => cyZ(x, y, 0.07, 0.44, 1.0)(p)), '#f0c33c'],
  [rbx(3.0, 5.0, 0.25, 2.35, 0.12, 0.44, 0.06), '#2b2f33'],
  [rbx(5.7, 7.2, 0.25, 2.35, 0.85, 2.85, 0.3), glassBand(p => p[0] > 7.05 && p[2] < 1.2 && Math.abs(p[1] - 1.3) > 0.6 ? LAMP : blue, 1.85, 2.55, 5.85, 7.0, 0, 7.05)],
  [rbx(2.75, 4.15, 0.55, 2.05, 1.38, 2.33, 0.45), '#d9dde0'],
  [rbx(0.3, 2.6, 0.35, 2.25, 1.38, 2.83, 0.25), p => p[2] > 1.95 && p[2] < 2.4 ? '#f2f2ee' : blue],
  [rbx(0.3, 5.7, 0.5, 2.1, 1.0, 1.38, 0.05), '#3a3f45']]; }, 'Blue off-road vibrator: the steel base plate between the axles is pressed onto the road and shaken.');
veh('Tipper (builders)', 6, 2.4, 2.7, c => [
  ...tyres([1, 2.2, 5.1], 2.4, 0.52, 0.42),
  [rbx(4.3, 5.9, 0.2, 2.2, 0.6, 2.6, 0.32), glassBand(p => p[0] > 5.75 && p[2] < 1.0 && Math.abs(p[1] - 1.2) > 0.6 ? LAMP : '#ece9e0', 1.6, 2.35, 4.45, 5.7, 0, 5.75)],
  [but(rbx(0.2, 4.2, 0.25, 2.15, 0.95, 2.25, 0.12), rbx(0.36, 4.04, 0.41, 1.99, 1.25, 2.4, 0.05)), p => p[2] < 1.3 && p[2] > 1.2 ? '#8a5e2e' : '#b07a3e'],
  [rbx(0.3, 4.3, 0.55, 1.85, 0.5, 0.95, 0.05), '#33373b']], 'Roads, pads, flattening, buildings.');
veh('Excavator', 5.6, 3, 3.3, c => [
  [cap3([3.1, 1.5, 1.6], [4.6, 1.5, 3.0], 0.16), '#e0b030'], [cap3([4.6, 1.5, 3.0], [5.15, 1.5, 1.0], 0.13), '#e0b030'],
  [rbx(4.8, 5.6, 1.1, 1.9, 0.25, 0.85, 0.14), '#3a3f45'],
  [rbx(0.8, 2.1, 0.75, 2.05, 1.4, 2.7, 0.15), glassBand('#f0c33c', 1.75, 2.5, 0.9, 2.0, 0, 1.95, 0.95)],
  [rbx(0.6, 3.4, 0.6, 2.4, 0.65, 1.45, 0.22), '#f0c33c'],
  [rbx(0.3, 3.9, 0.15, 0.95, 0, 0.68, 0.3), p => (Math.floor(p[0]*5) % 2) && p[2] < 0.1 ? '#22262a' : '#33373b'], [rbx(0.3, 3.9, 2.05, 2.85, 0, 0.68, 0.3), '#33373b']], '');
veh('Post bus', 9, 2.5, 3.1, c => [
  ...tyres([1.7, 7.3], 2.5, 0.5, 0.36),
  [rbx(0.2, 8.8, 0.2, 2.3, 0.4, 3.0, 0.45), glassBand(p => p[0] > 8.6 && p[2] < 1.0 && Math.abs(p[1] - 1.25) > 0.6 ? LAMP : p[0] < 0.26 && p[2] < 1.0 && Math.abs(p[1] - 1.25) > 0.6 ? TAIL : p[2] < 0.75 ? '#e2b42a' : '#f5c636', 1.55, 2.45, 0.5, 8.4, 1.5, 8.62, 0.3)]],
  'Evening bus as a village gift.');
veh('Police car', 4.2, 1.9, 1.75, c => [
  ...tyres([0.95, 3.25], 1.9, 0.36, 0.3),
  [rbx(1.8, 2.4, 0.62, 1.28, 1.42, 1.62, 0.05), '#3b7bf0'],
  [both(rbx(1.05, 3.15, 0.3, 1.6, 0.85, 1.48, 0.2), p => p[2] < 1.48 - Math.max(0, p[0] - 2.75)*1.2 && p[2] < 1.48 - Math.max(0, 1.35 - p[0])*1.0), glassBand('#f6f6f3', 1.0, 1.38, 1.15, 3.05, 0.95, 2.85, 1.3)],
  [rbx(0.1, 4.1, 0.18, 1.72, 0.28, 0.95, 0.25), p => p[0] > 3.98 && p[2] > 0.62 && Math.abs(p[1] - 0.95) > 0.45 ? LAMP : p[0] < 0.12 && p[2] > 0.62 && Math.abs(p[1] - 0.95) > 0.45 ? TAIL : p[2] > 0.5 && p[2] < 0.62 ? '#2a4fa0' : '#f6f6f3']],
  'From the gendarmerie.');
veh('Police van', 5.2, 2.2, 2.75, c => [
  ...tyres([1.1, 4.1], 2.2, 0.44, 0.34),
  [rbx(2.2, 3.0, 0.8, 1.4, 2.45, 2.62, 0.05), '#3b7bf0'],
  [rbx(0.15, 5.05, 0.2, 2.0, 0.4, 2.5, 0.4), p => p[0] > 4.86 && p[2] > 1.5 && p[2] < 2.25 ? VG : p[0] > 3.7 && p[0] < 4.7 && p[2] > 1.55 && p[2] < 2.15 ? VG : p[0] > 4.9 && p[2] < 0.95 && Math.abs(p[1] - 1.1) > 0.55 ? LAMP : p[2] > 0.95 && p[2] < 1.15 ? '#2a4fa0' : '#f6f6f3']],
  '', {labels:[['S', 1.0, 3.4, 1.4, 0.36, 'POLICE', '#2a4fa0', 2.0], ['N', 1.0, 3.4, 1.4, 0.36, 'POLICE', '#2a4fa0', 0.2]]});
veh('Riot police bus', 8.4, 2.5, 3.2, c => [
  ...tyres([1.6, 6.8], 2.5, 0.5, 0.36),
  [rbx(3.6, 4.4, 0.85, 1.65, 2.95, 3.12, 0.05), '#3b7bf0'],
  [rbx(0.2, 8.2, 0.2, 2.3, 0.4, 3.0, 0.45), glassBand(p => p[0] > 8.0 && p[2] < 1.0 && Math.abs(p[1] - 1.25) > 0.6 ? LAMP : '#33405e', 1.65, 2.4, 0.5, 7.8, 1.8, 8.02)]],
  'Shields, no batons.', {labels:[['S', 0.8, 4.2, 1.05, 0.45, 'POLICE', '#e8e8e2', 2.3], ['N', 0.8, 4.2, 1.05, 0.45, 'POLICE', '#e8e8e2', 0.2]]});
def('v', 'Black van (the lender)', 5.1, 1.95, ({SD}, c) => { const bk = '#1a1c1f', gl = '#2a3036', cy = 0.975;
  // a Vito-like van: short sloping bonnet, steep raked windscreen, long flat roof, sliding door, tinted glass all round
  const topT = [[0, 1.86], [0.1, 1.92], [3.55, 1.93], [3.85, 1.86], [4.35, 1.25], [4.95, 1.0], [5.1, 0.82]];
  SD(-0.1, 5.2, -0.1, 2.05, 0, 2.0, (x, y, z) => { const ay = Math.abs(y - cy);
    for (const wx of [0.9, 4.15]){ const rr = Math.hypot(x - wx, z - 0.33); if (rr < 0.33 && ay > 0.68 && ay < 0.96) return rr < 0.18 && ay > 0.88 ? '#6a7078' : '#141517'; if (rr < 0.42 && ay > 0.68) return null; }
    if (z < 0.2) return null; const top = lerpT(topT, x), hw = 0.96 - Math.max(0, z - 1.0)*0.12; if (ay > hw || z > top) return null;
    if (x > 5.0 && z > 0.45 && z < 0.78) return Math.abs(y - cy) < 0.08 && z > 0.58 && z < 0.68 ? '#c9ced3' : Math.abs(y - cy) > 0.62 && z > 0.6 ? '#e8e8de' : '#0f1012';   // grille, star, lamps
    if (z > 1.08 && z < top - 0.06 && x > 0.15 && x < 4.38 && !(x > 3.15 && x < 3.3) && !(x > 1.65 && x < 1.75)) return gl;                                          // glass
    if (x < 0.08 && z > 0.9 && z < 1.35 && ay > 0.7) return '#8a2420';                                                                                               // tail lights
    if (z < 0.42) return '#111214';
    if (Math.abs(x - 2.4) < 0.015 && z < 1.05 && ay > 0.9) return '#0f1012';                                                                                        // sliding door line
    return bk; }, {step:0.025});
}, 'Three black Vito-like vans, slowly, from the villa. Tinted glass, no plates.');
veh('Tractor with manure spreader', 8.6, 2.6, 2.9, c => [
  [cyY(7.6, 0.42, 0.42, 0.25, 0.6), p => Math.hypot(p[0] - 7.6, p[2] - 0.42) < 0.2 ? '#d9b23a' : '#1f2226'], [cyY(7.6, 0.42, 0.42, 2.0, 2.35), p => Math.hypot(p[0] - 7.6, p[2] - 0.42) < 0.2 ? '#d9b23a' : '#1f2226'],
  [cyY(5.5, 0.78, 0.78, 0.05, 0.55), p => Math.hypot(p[0] - 5.5, p[2] - 0.78) < 0.36 ? '#d9b23a' : '#1f2226'], [cyY(5.5, 0.78, 0.78, 2.05, 2.55), p => Math.hypot(p[0] - 5.5, p[2] - 0.78) < 0.36 ? '#d9b23a' : '#1f2226'],
  ...tyres([1.6], 2.6, 0.48, 0.36),
  [rbx(4.8, 6.2, 0.6, 2.0, 1.0, 2.75, 0.18), p => p[2] > 1.45 && p[2] < 2.55 && ((p[0] > 4.95 && p[0] < 6.05) || (p[1] > 0.75 && p[1] < 1.85)) ? VG : '#c63a2c'],
  [rbx(6.1, 8.3, 0.65, 1.95, 0.7, 1.5, 0.25), p => p[0] > 8.15 && p[2] > 1.1 && Math.abs(p[1] - 1.3) > 0.35 ? LAMP : '#c63a2c'],
  [but(rbx(0.2, 3.8, 0.45, 2.15, 0.65, 1.8, 0.2), both(rbx(0.35, 3.65, 0.6, 2.0, 1.65, 2.0, 0.02))), p => p[2] > 1.6 && p[0] > 0.35 && p[0] < 3.65 && p[1] > 0.6 && p[1] < 2.0 ? '#5a4632' : '#3f7a4a']],
  'The farmers\' blockade.');
veh('Fire engine', 7.8, 2.5, 3.15, c => [
  ...tyres([1.5, 5.6, 6.7], 2.5, 0.5, 0.36),
  [p => rbx(0.6, 6.2, 0.75, 1.75, 2.85, 3.05, 0.03)(p) && (Math.abs(p[1] - 0.8) < 0.06 || Math.abs(p[1] - 1.7) < 0.06 || ((p[0] - 0.6) % 0.4) < 0.07), '#c9ccd0'],
  [rbx(0.2, 7.6, 0.2, 2.3, 0.45, 2.85, 0.4), p => p[0] > 7.4 && p[2] > 1.55 && p[2] < 2.35 ? VG : p[0] > 6.1 && p[0] < 7.3 && p[2] > 1.55 && p[2] < 2.35 ? VG : p[0] > 7.45 && p[2] < 1.0 && Math.abs(p[1] - 1.25) > 0.6 ? LAMP : p[2] > 0.83 && p[2] < 1.03 ? '#f2f0ea' : '#d02a20']],
  '', {labels:[['S', 1.0, 4.6, 1.5, 0.42, 'POMPIERS', '#fff', 2.3], ['N', 1.0, 4.6, 1.5, 0.42, 'POMPIERS', '#fff', 0.2]]});
veh('Army truck', 6.8, 2.5, 3.2, c => [
  ...tyres([1.1, 2.3, 5.6], 2.5, 0.56, 0.42),
  [rbx(4.8, 6.6, 0.2, 2.3, 0.7, 2.7, 0.35), glassBand(p => p[0] > 6.45 && p[2] < 1.1 && Math.abs(p[1] - 1.25) > 0.6 ? '#e8e2b8' : '#5b6b45', 1.75, 2.45, 4.95, 6.4, 0, 6.45)],
  [rbx(0.2, 4.7, 0.2, 2.3, 0.8, 3.1, 0.5), p => ((p[0] - 0.2) % 1.1) < 0.06 ? '#5e6d48' : '#6b7a52'],
  [rbx(0.3, 6.5, 0.6, 1.9, 0.5, 0.85, 0.05), '#2f3329']], 'Only in the secret ending.');
const camoP = p => { const v = Math.sin(p[0]*1.9 + p[1]*0.7) + Math.sin(p[2]*3.3 - p[0]*1.1 + p[1]*1.3); return v > 1.1 ? '#3a432c' : v < -1.2 ? '#6e5c3e' : v < -0.5 && v > -0.7 ? '#2b2f24' : '#56603f'; };
veh('Piranha (8×8)', 7.9, 2.8, 3.2, c => [
  ...tyres([1.05, 2.35, 4.6, 5.9], 2.8, 0.55, 0.42),
  [cyZ(0.6, 2.2, 0.03, 2.0, 3.1), '#262a24'], [cap3([3.45, 1.4, 2.25], [4.7, 1.4, 2.28], 0.05), '#262a24'],
  [rbx(2.6, 3.45, 1.0, 1.8, 1.98, 2.42, 0.08), p => p[0] > 3.38 && p[2] > 2.15 && p[2] < 2.28 ? '#1c1f1a' : '#4b5437'],
  [rbx(5.2, 5.85, 0.55, 1.2, 1.98, 2.1, 0.03), '#4b5437'], [rbx(1.3, 1.9, 0.6, 1.2, 1.98, 2.1, 0.03), '#4b5437'],
  [p => p[0] >= 0.15 && p[0] <= 7.75 && p[1] >= 0.3 && p[1] <= 2.5 && p[2] >= 0.6 && p[2] <= Math.min(2.0 - Math.max(0, Math.abs(p[1] - 1.4) - 0.85)*1.8, 1.55 + 0.45 - Math.max(0, p[0] - 6.2)*0.75) && (p[2] <= 1.55 || Math.abs(p[1] - 1.4) <= 1.1),
    p => p[0] > 7.55 && p[2] < 0.95 && Math.abs(p[1] - 1.4) > 0.7 ? LAMP : camoP(p)]],
  'Swiss army 8×8 armoured personnel carrier: sloped nose, flat sides, small weapon station, camouflage. Only in the secret ending.');
veh('Police helicopter', 10.5, 2.6, 2.8, c => { const wh = '#f6f6f3', bl = '#2a4fa0', dk = '#3a3f45', m = 1.3; return [
  ...[0.4, 2.2].flatMap(y => [[cap3([3.3, y, 0.1], [6.9, y, 0.1], 0.05), dk], [cap3([6.9, y, 0.1], [7.25, y, 0.3], 0.05), dk], [cap3([4.1, y, 0.1], [4.1, y < m ? 0.75 : 1.85, 0.62], 0.04), dk], [cap3([6.0, y, 0.1], [5.85, y < m ? 0.75 : 1.85, 0.62], 0.04), dk]]),
  [cyZ(4.6, m, 0.09, 2.2, 2.62), dk], [cyZ(4.6, m, 0.25, 2.6, 2.72), dk],
  [rbx(3.4, 5.6, m - 0.45, m + 0.45, 1.8, 2.3, 0.18), wh],
  [p => inEll(p, [5.2, m, 1.25], 2.6, 0.82, 0.68) && p[2] > 0.62, p => p[0] > 6.4 && p[2] > 1.15 ? '#7fb6d6' : p[0] > 4.6 && p[0] < 6.2 && p[2] > 1.3 && p[2] < 1.72 && Math.abs(p[1] - m) > 0.55 ? '#7fb6d6' : p[2] > 1.05 && p[2] < 1.2 ? bl : wh],
  [p => inCap(p, [3.0, m, 1.45], [0.6, m, 1.6], 0.2, 0.11), wh],
  [rbx(0.95, 1.45, 0.45, 2.15, 1.58, 1.66, 0.03), wh],
  [p => p[0] >= 0.05 && p[0] <= 1.0 && Math.abs(p[1] - m) <= 0.11 && p[2] >= 1.2 && p[2] <= 2.65 - (p[0] - 0.05)*0.7, p => Math.hypot(p[0] - 0.48, p[2] - 1.72) < 0.3 && Math.hypot(p[0] - 0.48, p[2] - 1.72) > 0.18 ? '#22252a' : bl]]; },
  'Cabin with a glass nose and a blue band, engine and rotor mast on the roof, tail boom, ducted tail rotor, skids. The last resort.',
  {extra: Q => { const m = 1.3; for (let i = 0; i < 4; i++){ const a = i*Math.PI/2 + 0.4, ca = Math.cos(a), sa = Math.sin(a), w = 0.07; Q([[4.6 - sa*w, m + ca*w, 2.78], [4.6 + ca*5.2 - sa*w, m + sa*5.2 + ca*w, 2.78], [4.6 + ca*5.2 + sa*w, m + sa*5.2 - ca*w, 2.78], [4.6 + sa*w, m - ca*w, 2.78]], '#2b2f33', {k:8000}); } }});
const F35 = (() => { const m = 5.5, g = '#80827e', gt = '#8c8e8a', gb = '#6c6e6a', lt = '#a9aba6', dk = '#262725', zc = 1.45;
  // after a three-view drawing and photos: wide flat body blending into the wings, short cone nose, big bubble canopy with a hump behind,
  // bulging intakes under the canopy, broad trapezoid tails leaning out, lighter sawtooth panel edges on top
  const wT = [[0.5, 0.7], [1.4, 0.95], [2.5, 1.6], [3.6, 2.0], [7.6, 2.1], [10.2, 1.75], [11.6, 1.45], [12.6, 1.0], [13.6, 0.62], [14.6, 0.32], [15.6, 0.03]];
  const huT = [[0.5, 0.4], [1.5, 0.6], [4, 0.85], [8, 1.0], [10.6, 1.05], [12.6, 0.8], [13.6, 0.5], [14.6, 0.28], [15.6, 0.03]];
  const hlT = [[0.5, 0.4], [2, 0.6], [5, 0.85], [9, 0.9], [12, 0.7], [13.6, 0.45], [15.6, 0.03]];
  const saw = (x, ay) => { const step = Math.floor(ay/0.35) % 2 ? 0.28 : 0; for (const xs of [3.4, 5.6, 8.0]) if (Math.abs(x - xs - step) < 0.09 && ay < 1.6) return true; return Math.abs(ay - 0.95 - (Math.floor(x/0.5) % 2)*0.2) < 0.08 && x > 3 && x < 9.6; };
  return (x, y, z) => { const ay = Math.abs(y - m);
    // big one-piece canopy, dark smoky, with a light frame line; hump behind it
    if (inEll([x, y, z], [11.95, m, zc + 1.0], 1.5, 0.55, 0.58) && z > zc + 0.95) return Math.abs(x - 11.1) < 0.08 ? '#b5b7b2' : '#3b3a33';
    if (inEll([x, y, z], [9.6, m, zc + 0.95], 1.9, 0.75, 0.3) && z > zc + 0.9) return gt;
    // bulging intakes under the canopy sides, dark mouths facing forward
    for (const sg of [-1, 1]) if (inEll([x, y, z], [10.6, m + sg*1.55, zc - 0.05], 1.3, 0.45, 0.48)) return x > 11.55 && ay < 1.85 && ay > 1.2 ? dk : g;
    // engine nozzle
    if (x >= 0.55 && x < 2.4 && (y - m)**2 + (z - zc - 0.1)**2 <= 0.66**2) return x < 0.85 ? '#3a3b38' : '#585a55';
    // body: wide flat deck, sharp chine, light cone nose
    if (x >= 0.5 && x <= 15.6){ const w = lerpT(wT, x), r = ay/w; if (r <= 1){ const top = zc + lerpT(huT, x)*(1 - r**3), bot = zc - lerpT(hlT, x)*(1 - r**2.4);
      if (z <= top && z >= bot){ if (x > 14.0) return '#a3a5a0'; if (z > top - 0.15 && saw(x, ay)) return lt; return z > zc + 0.15 ? gt : z < zc - 0.15 ? gb : g; } } }
    // wings blending out of the body, light edge panels at the tips
    if (Math.abs(z - zc) < 0.09 && ay >= 1.8 && ay <= 5.35){ const f = (ay - 1.9)/3.45, le = 7.9 - f*2.2, te = 3.0 + f*0.8; if (x <= le && x >= te) return ay > 4.8 || x < te + 0.25 ? lt : g; }
    // tailplanes past the nozzle, square tips
    if (Math.abs(z - zc - 0.05) < 0.08 && ay >= 1.0 && ay <= 3.7){ const f = Math.max(0, (ay - 1.3)/2.4), le = 4.1 - f*3.0; if (x <= le && x >= -0.07) return g; }
    // broad trapezoid tails at the body edges, leaning out about 22 degrees
    const zb = zc + 0.75; if (z >= zb && z <= zb + 2.5){ const t = (z - zb)/2.5, yc = 1.55 + t*1.0, le = 4.6 - t*1.9, te = 1.2 - t*0.25; if (Math.abs(ay - yc) < 0.22 && x <= le && x >= te) return '!' + (t > 0.94 ? lt : y > m ? '#8e908b' : '#767874'); }
    return null; };
})();
const F35_SHADOW = (() => { const h = [[15.6, 0], [14.6, 0.32], [13.6, 0.62], [12.6, 1.0], [11.6, 1.45], [10.2, 1.75], [7.9, 1.9], [5.7, 5.35], [3.8, 5.35], [3.0, 2.15], [1.1, 3.7], [-0.07, 3.7], [-0.07, 1.0], [0.55, 0.66]];
  return [...h.map(([x, y]) => [x, 5.5 - y]), ...h.slice(1).reverse().map(([x, y]) => [x, 5.5 + y])]; })();
const f35At = (H, dx, dy, lift) => { H.F(F35_SHADOW.map(([x, y]) => [x + dx, y + dy]), '#a9ae9f'); H.SD(-0.3 + dx, 15.7 + dx, dy, 11 + dy, 0.5, 5.4, (x, y, z) => F35(x - dx, y - dy, z), {lift}); };
def('v', 'F-35', 15.6, 11, (H) => f35At(H, 0, 0, 9), 'Unmistakably an F-35: wide flat body blending into the wings, short light cone nose, big bubble canopy with a hump behind, bulging intakes under it, broad trapezoid tails leaning out, lighter sawtooth panels. Only in the secret ending.');
M[M.length - 1].big = 1.6;
veh('Regional train', 20, 3, 3.6, c => [
  ...[0.3, 10.2].flatMap(x0 => [...tyres([x0 + 1.4, x0 + 8.1], 3, 0.45, 0.4),
    [rbx(x0, x0 + 9.5, 0.25, 2.75, 0.6, 3.45, 0.5), p => p[2] > 1.95 && p[2] < 2.75 && ((((p[0] - x0) % 1.7) > 0.2) || p[0] < x0 + 0.4 || p[0] > x0 + 9.1) ? VG : p[2] > 1.05 && p[2] < 1.3 ? '#b8322a' : '#dfe2e5']])],
  'Along the top of the valley.');

/* People drawn as figures (not built from parts): smooth shapes in a three-quarter view, lit from the upper left like the
   buildings. Views 1 and 2 show the front, 3 and 4 the back; the figure is mirrored for the two sides. Units are metres. */
function figure(g, base, S, rot, o){
  const front = rot < 2, dir = rot === 1 || rot === 2 ? -1 : 1, U = (u, v) => [base[0] + u*S*dir, base[1] - v*S];
  const smooth = pts => { const n = pts.length, sp = pts.map(([u, v]) => U(u, v)), mid = (a, b) => [(a[0] + b[0])/2, (a[1] + b[1])/2];
    g.beginPath(); let m0 = mid(sp[n - 1], sp[0]); g.moveTo(m0[0], m0[1]); for (let k = 0; k < n; k++){ const m1 = mid(sp[k], sp[(k + 1) % n]); g.quadraticCurveTo(sp[k][0], sp[k][1], m1[0], m1[1]); } g.closePath(); return sp; };
  const box = sp => { const xs = sp.map(p => p[0]), ys = sp.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  // fill a shape, shade its right third, optional horizontal bands [v, h, colour]
  const shape = (pts, c, bands, flat) => { const sp = smooth(pts); g.fillStyle = c; g.fill(); const [x0, y0, x1, y1] = box(sp);
    g.save(); g.clip(); if (!flat){ g.fillStyle = sh(c, 0.8); g.fillRect(x0 + (x1 - x0)*0.64, y0 - 2, x1 - x0, y1 - y0 + 4); g.fillStyle = sh(c, 1.08); g.fillRect(x0 - 2, y0 - 2, (x1 - x0)*0.22 + 2, y1 - y0 + 4); }
    for (const [v, h, bc] of bands || []){ const a = U(0, v + h), b = U(0, v); g.fillStyle = bc; g.fillRect(x0 - 2, a[1], x1 - x0 + 4, b[1] - a[1]); } g.restore(); };
  const ell = (u, v, rx, ry, c, shade) => { const p = U(u, v); g.beginPath(); g.ellipse(p[0], p[1], rx*S, ry*S, 0, 0, Math.PI*2); g.fillStyle = c; g.fill();
    if (shade){ g.save(); g.clip(); g.fillStyle = sh(c, 0.82); g.fillRect(p[0] + rx*S*0.35, p[1] - ry*S, rx*S, ry*S*2); g.restore(); } };
  const dot = (u, v, r, c) => { const p = U(u, v), d = Math.max(1, r*S); g.fillStyle = c; g.fillRect(Math.round(p[0] - d/2), Math.round(p[1] - d/2), Math.ceil(d), Math.ceil(d)); };
  const bk = o.bulk || 1, sk = o.skin, legB = o.legBands || [], topB = o.topBands || [];
  // far leg and far arm sit behind the body
  const leg = (c0, dark) => { const col = dark ? sh(o.bot, 0.86) : o.bot; shape([[c0 - 0.075, 0.95], [c0 + 0.075, 0.95], [c0 + 0.06, 0.12], [c0 - 0.05, 0.12]], col, legB);
    shape(front ? [[c0 - 0.06, 0.13], [c0 + 0.06, 0.13], [c0 + 0.14, 0.05], [c0 + 0.13, 0], [c0 - 0.07, 0]] : [[c0 - 0.065, 0.13], [c0 + 0.065, 0.13], [c0 + 0.07, 0], [c0 - 0.07, 0]], dark ? sh(o.shoe, 0.85) : o.shoe); };
  const arm = (near, raise) => { const sx = near ? 0.16*bk : -0.15*bk, col = near ? o.top : sh(o.top, 0.86);
    if (raise){ shape([[sx - 0.05, 1.42], [sx + 0.05, 1.46], [sx + 0.12, 1.95], [sx + 0.05, 1.97]], col); ell(sx + 0.09, 2.0, 0.04, 0.045, o.hand || sk, 1); return; }
    shape([[sx - 0.045, 1.47], [sx + 0.05, 1.46], [sx + 0.045, 0.98], [sx - 0.035, 0.98]], col, o.armBands); ell(sx + 0.005, 0.93, 0.04, 0.05, o.hand || sk, 1); };
  if (o.longHair && !front) shape([[-0.1, 1.72], [0.1, 1.72], [0.12, 1.4], [-0.12, 1.4]], o.hair);
  leg(-0.055, true); arm(false);
  if (o.item === 'sign' && !front){ signPost(); }
  leg(0.06, false);
  shape([[-0.14, 1.0], [0.15, 1.0], [0.145, 0.86], [-0.14, 0.86]], o.bot, o.belt ? [[0.94, 0.04, o.belt]] : []);
  shape([[-0.19*bk, 1.44], [-0.12*bk, 1.5], [0.12*bk, 1.5], [0.2*bk, 1.44], [0.16*bk, 0.98], [-0.15*bk, 0.98]], o.top, topB);
  if (o.zip && front){ const a = U(0.06, 1.48), b = U(0.06, 1.0); g.fillStyle = o.zip; g.fillRect(a[0] - 0.5, a[1], Math.max(1, S*0.015), b[1] - a[1]); }
  if (o.hood) shape([[-0.15, 1.56], [-0.02, 1.53], [-0.03, 1.44], [-0.17, 1.45]], sh(o.top, 0.92));
  shape([[-0.04, 1.57], [0.05, 1.57], [0.05, 1.47], [-0.04, 1.47]], sh(sk, 0.92), null, 1);
  if (o.scarf){ shape([[-0.09, 1.53], [0.1, 1.53], [0.1, 1.45], [-0.09, 1.45]], o.scarf); if (front) shape([[0.03, 1.47], [0.09, 1.47], [0.08, 1.28], [0.035, 1.29]], sh(o.scarf, 0.92)); }
  // head
  if (o.longHair && front) shape([[-0.11, 1.74], [0.0, 1.76], [-0.02, 1.42], [-0.13, 1.44]], o.hair);
  ell(0.015, 1.665, 0.088, 0.118, sk, 1);
  if (front){ ell(-0.05, 1.66, 0.018, 0.03, sh(sk, 0.9));
    dot(0.045, 1.68, 0.024, '#24262b'); dot(-0.01, 1.68, 0.02, '#24262b'); shape([[0.098, 1.67], [0.12, 1.64], [0.095, 1.635]], sh(sk, 0.85), null, 1);
    const m0 = U(0.02, 1.615), m1 = U(0.07, 1.615); g.fillStyle = '#9c4f45'; g.fillRect(Math.min(m0[0], m1[0]), m0[1], Math.abs(m1[0] - m0[0]), Math.max(1, S*0.012));
    if (o.brow) for (const u of [-0.01, 0.045]){ const p = U(u - 0.02, 1.71), q = U(u + 0.02, 1.71); g.fillStyle = o.brow; g.fillRect(Math.min(p[0], q[0]), p[1], Math.abs(q[0] - p[0]), Math.max(1, S*0.012)); }
    if (o.glasses){ g.save(); g.globalAlpha = 0.75; shape([[-0.03, 1.695], [0.1, 1.695], [0.1, 1.67], [-0.03, 1.67]], o.glasses, null, 1); g.restore(); }
    if (o.beard) shape([[-0.04, 1.63], [0.0, 1.6], [0.09, 1.6], [0.1, 1.63], [0.07, 1.56], [0.0, 1.55], [-0.05, 1.59]], o.beard, null, 1);
    if (!o.hat) shape([[-0.085, 1.62], [-0.1, 1.73], [-0.03, 1.79], [0.06, 1.79], [0.105, 1.72], [0.05, 1.735], [-0.02, 1.71], [-0.05, 1.66]], o.hair); }
  else { shape([[-0.095, 1.58], [-0.1, 1.72], [-0.02, 1.79], [0.07, 1.78], [0.11, 1.7], [0.1, 1.58], [0.0, 1.56]], o.hair); ell(0.1, 1.66, 0.016, 0.03, sh(sk, 0.9)); }
  if (o.hat === 'hard'){ const top = U(0, 0); shape([[-0.1, 1.74], [-0.08, 1.81], [0.0, 1.85], [0.09, 1.83], [0.12, 1.75]], o.hatc); shape([[-0.13, 1.755], [0.17, 1.755], [0.17, 1.73], [-0.13, 1.735]], sh(o.hatc, 0.85)); }
  if (o.hat === 'beanie'){ shape([[-0.1, 1.71], [-0.09, 1.8], [0.0, 1.84], [0.09, 1.81], [0.11, 1.71]], o.hatc); shape([[-0.1, 1.735], [0.11, 1.735], [0.11, 1.7], [-0.1, 1.7]], sh(o.hatc, 0.85)); ell(0.005, 1.87, 0.035, 0.03, '#f4f2ec'); }
  arm(true, o.raise);
  if (o.item === 'wrench'){ const a = U(0.17*bk, 0.9), b = U(0.17*bk, 0.52); g.fillStyle = '#b8322a'; g.fillRect(a[0] - S*0.012, a[1], S*0.026, b[1] - a[1]); shape([[0.12*bk, 0.56], [0.24*bk, 0.56], [0.24*bk, 0.46], [0.12*bk, 0.46]], '#8f979e'); }
  if (o.item === 'sign' && front) signPost();
  function signPost(){ const hu = 0.25*bk, a = U(hu, 1.7), b = U(hu, 2.45); g.fillStyle = '#8a6a4a'; g.fillRect(a[0] - S*0.012, b[1], S*0.025, a[1] - b[1]);
    const c = [U(hu - 0.5, 2.18 - 0.12), U(hu + 0.5, 2.18 + 0.12), U(hu + 0.5, 2.68 + 0.12), U(hu - 0.5, 2.68 - 0.12)];
    g.beginPath(); c.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = front ? '#f4f2ec' : '#d9d6cc'; g.fill(); g.strokeStyle = '#8a8478'; g.lineWidth = 1; g.stroke();
    if (front){ const m = U(hu, 2.43), fs = Math.max(6, Math.round(S*0.3)); g.save(); g.translate(m[0], m[1]); g.transform(1, -0.12*dir*2, 0, 1, 0, 0); g.font = fs + 'px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c63a2c'; g.fillText(o.sign || 'NON', 0, 0); g.restore(); } }
}
/* People as smooth volumes: rounded limbs on simple joints, real proportions, no faces. Front at +x. A pose bends the
   legs (stand, walk, run) and each arm (down, swing, forward, up, fist, strike, throw, shield, point, eye, ear, carry, hip);
   what a person carries follows the hand. Children and tall people are scaled. */
const ARM = { // elbow and hand offsets from the shoulder: [dx, dy outward, z] for elbow, then hand
  down:[[0, 0.02, 1.15], [0.02, 0.02, 0.88]], swingF:[[0.09, 0.01, 1.16], [0.21, 0.01, 0.94]], swingB:[[-0.09, 0.01, 1.16], [-0.19, 0.01, 0.96]],
  forward:[[0.2, 0, 1.3], [0.42, -0.04, 1.33]], up:[[0.03, 0.06, 1.7], [0.04, 0.08, 1.97]], fist:[[0.06, 0.13, 1.62], [0.09, 0.08, 1.9]],
  strike:[[-0.06, 0.06, 1.68], [-0.14, 0.02, 1.93]], throw:[[-0.13, 0.06, 1.6], [-0.27, 0.06, 1.84]], shield:[[0.18, 0.02, 1.2], [0.3, -0.02, 1.22]],
  point:[[0.21, 0.01, 1.45], [0.46, 0.0, 1.5]], eye:[[0.12, 0.08, 1.45], [0.17, -0.18, 1.66]], ear:[[0.06, 0.12, 1.42], [0.03, -0.12, 1.67]],
  carry:[[0.12, 0.01, 1.2], [0.26, -0.12, 1.15]], hip:[[-0.02, 0.13, 1.2], [0.04, 0.03, 1.0]], wave:[[0.04, 0.14, 1.66], [0.02, 0.22, 1.93]],
  bars:[[0.24, 0, 1.2], [0.46, -0.05, 1.1]], mouth:[[0.16, 0.1, 1.38], [0.2, -0.17, 1.6]], sticks:[[0.12, 0.06, 1.15], [0.32, -0.1, 1.12]], push:[[0.2, 0, 1.15], [0.42, -0.02, 1.02]], lap:[[0.14, 0.02, 1.12], [0.26, -0.1, 1.0]] };
const LEG = { stand:[[0.01, 0.5], [0, 0.1]], fwd:[[0.12, 0.52], [0.2, 0.08]], back:[[-0.05, 0.5], [-0.18, 0.12]], runF:[[0.2, 0.6], [0.26, 0.18]], runB:[[-0.08, 0.48], [-0.26, 0.2]] };
const POSE = {stand:{}, walkA:{legs:['fwd', 'back'], armR:'swingB', armL:'swingF'}, walkB:{legs:['back', 'fwd'], armR:'swingF', armL:'swingB'}, run:{legs:['runF', 'runB'], armR:'swingB', armL:'swingF'}};
const personVol = (o, pose) => { const cx = 0.75, cy = 0.75, k = o.small ? 0.62 : (o.tall || 1), kw = o.small ? 0.78 : 1, bk = o.bulk || 1, ps = Object.assign({}, POSE.stand, pose || {});
  const defR = o.item === 'sign' || o.item === 'flag' ? 'up' : 'down', defL = o.item === 'shield' ? 'shield' : 'down';
  const armR = ps.armR || o.armR || defR, armL = ps.armL || o.armL || defL, legs = ps.legs || ['stand', 'stand'];
  const J = {}; for (const s of [-1, 1]){ const ay = cy + s*0.235*bk, [e, h] = ARM[s > 0 ? armR : armL]; J[s] = {sh:[cx, ay, 1.42], el:[cx + e[0], ay + s*e[1], e[2]], ha:[cx + h[0], ay + s*h[1], h[2]]}; }
  const hR = J[1].ha, hL = J[-1].ha, dir = (a, b) => { const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...v) || 1; return v.map(q => q/L); };
  const f = (x, y, z, noLegs) => { const p = [x, y, z]; let c = null; const put = (t, col) => { if (t) c = col; };
    // legs (bare under a skirt), shoes or boots
    if (!noLegs) [-1, 1].forEach((s, i) => { const ly = cy + s*0.09, [kn, ft] = LEG[legs[i]], knee = [cx + kn[0], ly, kn[1]], foot = [cx + ft[0], ly, ft[1]];
      put(inCap(p, [cx, ly, 0.92], knee, 0.08, 0.06) || inCap(p, knee, foot, 0.058, 0.045), o.skirt ? o.skin : o.bot); if (o.shorts) put(inCap(p, knee, foot, 0.058, 0.045) && z < 0.55, o.skin);
      if (o.legBand && z > o.legBand && z < o.legBand + 0.045) put(inCap(p, knee, foot, 0.062, 0.05), o.band);
      if (o.knee) put(inEll(p, [knee[0] + 0.05, ly, knee[2]], 0.06, 0.07, 0.08), o.knee);
      put(z >= 0 && (inEll(p, [foot[0] + 0.05, ly, foot[2] - 0.055], 0.135, 0.06, 0.07) || (o.boots && inCap(p, [foot[0], ly, foot[2] - 0.05], [foot[0], ly, foot[2] + 0.14], 0.06, 0.06))), o.shoe || '#2b2522'); });
    put(inEll(p, [cx, cy, 0.95], 0.11, 0.17, 0.1), o.bot);
    if (o.skirt) put(z > 0.45 && z < 1.0 && Math.hypot((x - cx)/0.15, (y - cy)/0.2) <= 1 + (1.0 - z)*0.9, o.bot);
    if (o.robe) put(z > 0.06 && z < 1.05 && Math.hypot((x - cx)/0.15, (y - cy)/0.2) <= 1 + (1.05 - z)*0.35, o.top);
    // torso
    const torso = inEll(p, [cx, cy, 1.1], 0.105*bk, 0.155*bk, 0.15) || inEll(p, [cx, cy, 1.3], 0.125*bk, 0.19*bk, 0.17) || inCap(p, [cx, cy - 0.16*bk, 1.42], [cx, cy + 0.16*bk, 1.42], 0.065*bk, 0.065*bk) || (o.belly && inEll(p, [cx + 0.05, cy, 1.1], 0.13, 0.15, 0.14));
    put(torso, o.top);
    if (torso && o.shirt && x > cx + 0.05 && Math.abs(y - cy) < 0.045 && z > 1.2) c = o.shirt;
    if (torso && o.tie && x > cx + 0.05 && Math.abs(y - cy) < 0.018 && z > 1.12 && z < 1.43) c = o.tie;
    if (torso && o.band && o.topBand && z > o.topBand && z < o.topBand + 0.045) c = o.band;
    if (torso && o.vest && z > 1.0 && z < 1.42) c = (z > 1.18 && z < 1.22) ? '#e8ece4' : o.vest;
    if (torso && o.sash && Math.abs((y - cy) - (z - 1.25)*1.3) < 0.035 && x > cx) c = '#c63a2c';
    if (torso && o.stripe && z > 1.24 && z < 1.3) c = o.stripe;
    if (o.belt) put(inEll(p, [cx, cy, 0.98], 0.115, 0.175, 0.03), o.belt);
    if (o.armor){ put(inEll(p, [cx + 0.02, cy, 1.25], 0.15, 0.2, 0.22), o.armor); for (const s of [-1, 1]) put(inEll(p, [cx, cy + s*0.22, 1.43], 0.11, 0.1, 0.07), o.armor2); }
    if (o.hood) put(inEll(p, [cx - 0.11, cy, 1.5], 0.07, 0.14, 0.08), o.top);
    if (o.pack) put(inEll(p, [cx - 0.17, cy, 1.22], 0.08, 0.15, 0.17), o.pack);
    if (o.item === 'radio'){ put(inEll(p, [cx - 0.17, cy, 1.22], 0.08, 0.14, 0.17), '#4a5838'); put(Math.hypot(x - cx + 0.2, y - cy + 0.08) < 0.015 && z > 1.3 && z < 2.1, '#2b2f33'); }
    put(inCap(p, [cx, cy, 1.44], [cx, cy, 1.56], 0.05, 0.048), o.skin);
    if (o.scarf) put(inEll(p, [cx, cy, 1.5], 0.09, 0.1, 0.045) || inCap(p, [cx + 0.08, cy + 0.04, 1.48], [cx + 0.1, cy + 0.05, 1.3], 0.03, 0.03), o.scarf);
    // head; hair on the back and top; hats replace the top
    const hc = [cx + 0.01, cy, 1.665];
    put(inEll(p, hc, 0.1, 0.085, 0.115), o.skin);
    put(inEll(p, hc, 0.112, 0.097, 0.125) && (z > 1.7 || x < cx - 0.01), o.hair);
    if (o.longHair) put(inCap(p, [cx - 0.07, cy, 1.66], [cx - 0.09, cy, 1.4], 0.085, 0.07) && x < cx - 0.02, o.hair);
    if (o.bun) put(inEll(p, [cx - 0.12, cy, 1.72], 0.06, 0.06, 0.06), o.hair);
    if (o.beard) put(inEll(p, [cx + 0.06, cy, 1.585], 0.06, 0.08, 0.05) && x > cx + 0.02, o.beard);
    if (o.mask) put(inEll(p, hc, 0.104, 0.089, 0.118) && z < 1.65 && x > cx, o.mask);
    const h = o.hat;
    if (h === 'hard'){ put(inEll(p, [cx + 0.01, cy, 1.73], 0.125, 0.11, 0.12) && z > 1.73, o.hatc); put(z > 1.72 && z < 1.765 && inEll(p, [cx + 0.03, cy, 1.74], 0.16, 0.13, 0.1), o.hatc); }
    if (h === 'beanie'){ put(inEll(p, [cx + 0.005, cy, 1.72], 0.115, 0.1, 0.12) && z > 1.7, o.hatc); if (!o.noPom) put(inEll(p, [cx, cy, 1.86], 0.035, 0.035, 0.035), o.pom || '#f4f2ec'); }
    if (h === 'cap'){ put(inEll(p, [cx + 0.005, cy, 1.73], 0.112, 0.098, 0.09) && z > 1.72, o.hatc); put(z > 1.72 && z < 1.745 && x > cx && inEll(p, [cx + 0.1, cy, 1.73], 0.12, 0.08, 0.1), o.hatc); }
    if (h === 'hoodup') put(inEll(p, [cx - 0.005, cy, 1.67], 0.125, 0.11, 0.14) && !(x > cx + 0.06 && z < 1.72 && z > 1.56), o.hatc);
    if (h === 'army') put(inEll(p, [cx + 0.01, cy, 1.69], 0.135, 0.12, 0.15) && z > 1.66, ((Math.floor(x*40) + Math.floor(y*40) + Math.floor(z*40)) % 4 === 0) ? '#3a4529' : o.hatc);
    if (h === 'fedora'){ put(z > 1.74 && z < 1.765 && inEll(p, [cx, cy, 1.75], 0.2, 0.18, 0.1), o.hatc); put(inEll(p, [cx, cy, 1.76], 0.105, 0.095, 0.12) && z > 1.745, z < 1.79 ? o.band2 : o.hatc); }
    if (h === 'visor') put(inEll(p, [cx + 0.01, cy, 1.67], 0.135, 0.12, 0.15), x > cx + 0.06 && z > 1.63 && z < 1.71 ? (o.visorc || '#3a4a5a') : o.hatc);
    // arms on their joints, hands at the end
    for (const s of [-1, 1]){ const j = J[s], armC = o.armor ? o.armor : o.top;
      put(inCap(p, j.sh, j.el, 0.055, 0.047) || inCap(p, j.el, j.ha, 0.045, 0.037), armC);
      if (o.armBand && z > o.armBand && z < o.armBand + 0.04) put(inCap(p, j.sh, j.el, 0.058, 0.05), o.band);
      put(inEll(p, j.ha, 0.042, 0.036, 0.05), o.hand || o.skin); }
    // what they carry follows the hand
    const it = o.item, up = (a, len, r, col) => put(inCap(p, a, [a[0], a[1], a[2] + len], r, r), col);
    if (it === 'wrench'){ put(inCap(p, hR, [hR[0], hR[1], hR[2] - 0.32], 0.02, 0.02), '#b8322a'); put(inEll(p, [hR[0], hR[1], hR[2] - 0.36], 0.08, 0.025, 0.04), '#8f979e'); }
    if (it === 'case') put(Math.abs(x - hR[0]) < 0.2 && Math.abs(y - hR[1] - 0.02) < 0.05 && z > hR[2] - 0.3 && z < hR[2] - 0.04, '#5a3f2a');
    if (it === 'board') put(Math.abs(x - hR[0] - 0.06) < 0.02 && Math.abs(y - hR[1] + 0.12) < 0.12 && z > hR[2] + 0.05 && z < hR[2] + 0.38, z > hR[2] + 0.33 ? '#8a6a3a' : '#f4f2ec');
    if (it === 'bottle') up([hR[0] + 0.02, hR[1], hR[2] - 0.05], 0.2, 0.033, '#9fd0e8');
    if (it === 'cup') up([hR[0] + 0.04, hR[1], hR[2] + 0.02], 0.1, 0.04, '#f4f2ec');
    if (it === 'laptop') put(x > hR[0] - 0.25 && x < hR[0] + 0.05 && Math.abs(y - cy) < 0.17 && Math.abs(z - hR[2] - 0.04) < 0.02, '#3a3f45');
    if (it === 'camera') put(armR === 'eye' ? inEll(p, [cx + 0.2, cy, 1.67], 0.07, 0.09, 0.06) : inEll(p, [cx + 0.15, cy, 1.25], 0.05, 0.08, 0.05), '#1c1f22');
    if (it === 'cane') put(inCap(p, hR, [hR[0] + 0.04, hR[1], 0], 0.035, 0.035), '#6a4a32');
    if (it === 'fork'){ const top = armR === 'forward' ? [hR[0] + 0.9, hR[1], hR[2] + 0.35] : [hR[0], hR[1], 2.1], bot = armR === 'forward' ? [hR[0] - 0.5, hR[1], hR[2] - 0.2] : [hR[0], hR[1], 0.02];
      put(inCap(p, bot, top, 0.02, 0.02), '#8a6a4a'); for (const d of [-0.08, 0, 0.08]) put(inCap(p, [top[0], top[1] + d, top[2]], [top[0] + (armR === 'forward' ? 0.2 : 0), top[1] + d, top[2] + (armR === 'forward' ? 0.05 : 0.18)], 0.012, 0.012), '#9aa3ab'); }
    if (it === 'rifle') put(armR === 'forward' ? inCap(p, [cx + 0.05, cy + 0.12, 1.32], [cx + 0.75, cy + 0.06, 1.36], 0.028, 0.028) : inCap(p, [cx + 0.17, cy - 0.15, 1.05], [cx + 0.17, cy + 0.18, 1.4], 0.025, 0.025), '#2f3329');
    if (it === 'shield'){ const sx = hL[0] + 0.05; put(x > sx && x < sx + 0.04 && Math.abs(y - hL[1] - 0.06) < 0.3 && z > hL[2] - 0.75 && z < hL[2] + 0.45, (Math.abs(y - hL[1] - 0.06) > 0.26 || z < hL[2] - 0.71 || z > hL[2] + 0.41) ? '#5f7896' : '#a9c7e8'); }
    if (o.baton){ const d = dir(J[1].el, hR); put(inCap(p, hR, [hR[0] + d[0]*0.55, hR[1] + d[1]*0.55, hR[2] + d[2]*0.55], 0.04, 0.04), '#0c0d0f'); }
    if (it === 'sign' || it === 'flag') up([hR[0], hR[1], hR[2] - 0.25], it === 'flag' ? 1.3 : 0.62, 0.045, it === 'flag' && o.top === '#1c1f22' ? '#5a5f66' : '#8a6a4a');
    if (it === 'flag') put(Math.abs(x - hR[0]) < 0.04 && y > hR[1] && y < hR[1] + 0.6 && z > hR[2] + 0.62 && z < hR[2] + 1.02, z > hR[2] + 0.82 ? (o.flagA || '#1c1f22') : (o.flagB || '#c63a2c'));
    if (it === 'torch'){ up([hR[0], hR[1], hR[2] - 0.05], 0.3, 0.04, '#6a4a32'); if (inEll(p, [hR[0], hR[1], hR[2] + 0.42], 0.09, 0.09, 0.16)) c = '!' + (z > hR[2] + 0.46 ? '#f5a030' : '#ffe08a'); }
    if (it === 'flare') if (inEll(p, [hR[0], hR[1], hR[2] + 0.08], 0.05, 0.05, 0.07)) c = '!#ff4a3a';
    if (it === 'stone') put(inEll(p, [hR[0], hR[1], hR[2] + 0.05], 0.045, 0.045, 0.045), '#8a8a84');
    if (o.jerrycan) put(Math.abs(x - hL[0]) < 0.1 && Math.abs(y - hL[1]) < 0.05 && z > hL[2] - 0.32 && z < hL[2] - 0.02, '#c63a2c');
    if (it === 'rod'){ const tip = [hR[0] + 1.5, hR[1], hR[2] + 1.0]; put(inCap(p, hR, tip, 0.02, 0.02), '#5a4632'); put(inCap(p, tip, [tip[0] + 0.3, tip[1], 0.05], 0.008, 0.008), '#d9d4c8'); }
    if (it === 'parcel') put(Math.abs(x - hR[0] + 0.05) < 0.15 && Math.abs(y - cy) < 0.18 && z > hR[2] && z < hR[2] + 0.22, '#b58a5a');
    if (it === 'trumpet') put(inCap(p, [cx + 0.16, cy, 1.6], [cx + 0.5, cy, 1.58], 0.025, 0.06), '#d9b23a');
    if (it === 'tuba') put(inEll(p, [cx + 0.18, cy + 0.05, 1.3], 0.12, 0.12, 0.2) || inCap(p, [cx + 0.1, cy + 0.1, 1.45], [cx + 0.05, cy + 0.15, 1.72], 0.06, 0.16), '#d9b23a');
    if (it === 'drum'){ put(Math.hypot(x - cx - 0.3, z - 1.05) < 0.22 && Math.abs(y - cy) < 0.17, Math.abs(y - cy) > 0.14 ? '#f4f2ec' : '#c63a2c'); for (const s of [-1, 1]) put(inCap(p, J[s].ha, [J[s].ha[0] + 0.15, J[s].ha[1], J[s].ha[2] + 0.1], 0.015, 0.015), '#d9d4c8'); }
    if (it === 'rake'){ put(inCap(p, [hR[0] - 0.6, hR[1], hR[2] + 0.5], [hR[0] + 0.7, hR[1], 0.05], 0.02, 0.02), '#8a6a4a'); put(Math.abs(x - hR[0] - 0.7) < 0.03 && Math.abs(y - hR[1]) < 0.25 && z < 0.12, '#8a6a4a'); }
    if (it === 'shovel'){ put(inCap(p, hR, [hR[0] + 0.5, hR[1], 0.25], 0.02, 0.02), '#8a6a4a'); put(inEll(p, [hR[0] + 0.56, hR[1], 0.15], 0.04, 0.12, 0.14), '#7a828a'); }
    if (it === 'hammer'){ put(Math.abs(x - hR[0] - 0.05) < 0.07 && Math.abs(y - cy) < 0.1 && z > 0.25 && z < hR[2], '#d0663a'); put(inCap(p, [hR[0] + 0.05, cy, 0.25], [hR[0] + 0.05, cy, 0.02], 0.015, 0.015), '#3a3f45'); }
    if (it === 'hose'){ put(inCap(p, [cx + 0.2, cy, 1.0], [cx - 0.6, cy - 0.3, 0.05], 0.04, 0.04) || inCap(p, [cx + 0.2, cy, 1.0], [cx + 0.45, cy - 0.05, 1.08], 0.04, 0.03), '#c8322a'); }
    if (it === 'megaphone') put(inCap(p, [hR[0] + 0.02, hR[1], hR[2]], [hR[0] + 0.25, hR[1], hR[2] + 0.02], 0.03, 0.08), '#f4f2ec');
    if (it === 'tvcam') put(Math.abs(x - cx - 0.12) < 0.22 && Math.abs(y - cy - 0.2) < 0.07 && z > 1.6 && z < 1.76, x > cx + 0.3 ? '#3a3f45' : '#1c1f22');
    if (it === 'boom'){ put(inCap(p, hR, [hR[0] + 1.0, hR[1] - 0.2, hR[2] + 0.9], 0.016, 0.016), '#9aa3ab'); put(inEll(p, [hR[0] + 1.05, hR[1] - 0.2, hR[2] + 0.88], 0.11, 0.05, 0.05), '#7a7468'); }
    if (it === 'pole') put(inCap(p, hR, [hR[0] + 0.2, hR[1] + 0.02, 0.02], 0.016, 0.016), '#9aa3ab');
    if (it === 'ball') put(inEll(p, [hR[0] + 0.1, hR[1], hR[2] + 0.1], 0.09, 0.09, 0.09), (Math.floor(x*30) + Math.floor(z*30)) % 2 ? '#f4f2ec' : '#1c1f22');
    if (it === 'leash') put(inCap(p, hR, [hR[0] + 0.7, hR[1], 0.45], 0.008, 0.008), '#c63a2c');
    return c; };
  const g = ps.sit ? (x, y, z) => { const p = [x, y, z]; for (const s of [-1, 1]){ const ly = cy + s*0.09; if (inCap(p, [cx, ly, 0.5], [cx + 0.42, ly, 0.52], 0.08, 0.065) || inCap(p, [cx + 0.42, ly, 0.52], [cx + 0.45, ly, 0.1], 0.058, 0.045)) return o.skirt || o.robe ? (z > 0.4 ? (o.robe ? o.top : o.bot) : o.skin) : o.bot;
      if (inEll(p, [cx + 0.5, ly, 0.045], 0.135, 0.06, 0.07) && z >= 0) return o.shoe || '#2b2522'; } return f(x, y, z + 0.42, true); } : f;
  return (x, y, z) => g(cx + (x - cx)/kw, cy + (y - cy)/kw, z/k); };
// the sign plate sits on top of the stick
const signTop = (o, pose) => { const k = o.small ? 0.62 : (o.tall || 1), bk = o.bulk || 1, ps = pose || {}, a = ARM[ps.armR || o.armR || 'up'][1]; return {x:0.75 + a[0], y:0.75 + 0.235*bk + a[1], z:(a[2] + 0.5)*k}; };
const figure3 = (H, o, dx, dy, pose, lift) => { lift = lift || 0; const k = o.small ? 0.62 : (o.tall || 1), tall = o.item === 'sign' || o.item === 'flag' || o.item === 'fork' || o.item === 'radio' || (pose && (pose.armR === 'up' || pose.armR === 'wave' || pose.armR === 'strike' || pose.armR === 'fist'));
  const f = personVol(o, pose), st = o.item === 'sign' ? signTop(o, pose) : null;
  H.SD(dx - (o.item === 'fork' || o.item === 'hose' || o.item === 'rake' ? 0.3 : 0.45), dx + (o.item === 'fork' || o.item === 'rifle' || o.item === 'rod' || o.item === 'boom' ? 3.3 : 1.85), dy - 0.1, dy + 1.75, 0, (o.item === 'flag' ? 3.3 : tall ? 2.6 : 1.95)*k, (x, y, z) => f(x - dx, y - dy, z), {step:0.035, lift, badge:st ? {x:st.x + dx, y:st.y + dy, z:st.z + 0.08 + lift, text:o.signText || 'NON', bg:o.signBoard || '#f4f2ec', fg:o.signInk || '#c63a2c'} : null}); };
const volP = (n, o, note) => { def('p', n, 1.5, 1.5, (H) => figure3(H, o, 0, 0), note); M[M.length - 1].o = o; };
const hi = '#e8ece4';
volP('The CEO', {top:'#2f343c', bot:'#2f343c', hair:'#9a9590', skin:'#efc9a8', tie:'#b8322a', shirt:'#f4f2ec', item:'case', tall:1.06, shoe:'#1c1f22'}, 'Tall, grey at the temples, dark suit.');
volP('Suit (woman)', {top:'#1f2329', bot:'#1f2329', hair:'#3a2b20', longHair:1, bun:1, skin:'#f2d2b6', item:'case', skirt:1, shirt:'#f4f2ec', shoe:'#1c1f22'}, 'Lent by the association.');
volP('Suit (man)', {top:'#1f2329', bot:'#1f2329', hair:'#2b2522', skin:'#e8c09c', tie:'#2c5f93', shirt:'#f4f2ec', item:'case', shoe:'#1c1f22'}, '');
volP('Geologist', {top:'#e07a2c', bot:'#3a4a63', hair:'#7a4a2a', longHair:1, skin:'#f2d2b6', hat:'hard', hatc:'#f4f4f2', item:'board', vest:'#e07a2c', shoe:'#5a4632', boots:1}, 'White hard hat, clipboard. Drives the pickup.');
volP('Driller', {skin:'#d9a882', top:'#e07a2c', bot:'#e07a2c', shoe:'#4a3626', boots:1, hand:'#c9a24a', hair:'#3a2b20', beard:'#3a2b20', hat:'hard', hatc:'#f2c230', belt:'#2b2522', band:hi, topBand:1.12, legBand:0.3, armBand:1.24, bulk:1.08, item:'wrench'}, 'Orange coveralls with reflective bands, hard hat, beard, gloves, boots, pipe wrench.');
volP('Driller (woman)', {skin:'#f2d2b6', top:'#e07a2c', bot:'#e07a2c', shoe:'#4a3626', boots:1, hand:'#c9a24a', hair:'#c9a24a', longHair:1, hat:'hard', hatc:'#f2c230', belt:'#2b2522', band:hi, topBand:1.12, legBand:0.3, armBand:1.24}, '');
volP('Mud engineer', {top:'#3a5f8a', bot:'#3a4a63', hair:'#2b2522', skin:'#c98e66', hat:'hard', hatc:'#f4f4f2', item:'bottle', shoe:'#3a2b20', boots:1}, '');
volP('Water officer', {top:'#2c8a8a', bot:'#3a4a63', hair:'#8a5a3a', longHair:1, skin:'#f2d2b6', item:'bottle', shoe:'#2f5f3a', boots:1}, 'Samples springs; green rubber boots.');
volP('Community liaison', {top:'#b05a6a', bot:'#4a4f55', hair:'#2b2522', longHair:1, skin:'#a8704a', item:'cup'}, 'Coffee with the neighbours.');
volP('Security guard', {top:'#2b2f36', bot:'#2b2f36', hair:'#2b2522', skin:'#e8c09c', hat:'cap', hatc:'#2b2f36', vest:'#e8d23a', bulk:1.15, shoe:'#1c1f22'}, '');
volP('Seismologist', {top:'#6a5a8a', bot:'#4a4f55', hair:'#d9d4c8', beard:'#d9d4c8', skin:'#f2d2b6', item:'laptop'}, 'From the university station.');
volP('Plant operator', {top:'#3a5f8a', bot:'#3a5f8a', hair:'#5a4632', longHair:1, skin:'#e8c09c', hat:'hard', hatc:'#f4f4f2', band:hi, topBand:1.12, shoe:'#3a2b20', boots:1}, '');
volP('Villager (woman)', {top:'#7a8f6e', bot:'#4a4f55', hair:'#8a5a3a', longHair:1, skin:'#f2d2b6', skirt:1}, '');
volP('Villager (man), elderly', {top:'#8a6a4a', bot:'#3a4a63', hair:'#e6e2da', skin:'#e8c09c', hat:'cap', hatc:'#5a4632', item:'cane', tall:0.95}, 'With a cane and a flat cap.');
volP('Farmer', {top:'#2c5f93', bot:'#2c5f93', hair:'#5a4632', skin:'#d9a882', hat:'cap', hatc:'#3a3f45', item:'fork', bulk:1.15, belly:1, shoe:'#2f5f3a', boots:1}, 'Blue work jacket, rubber boots, a belly, a pitchfork.');
volP('Mayor', {top:'#3a3f45', bot:'#3a3f45', hair:'#c9c4b6', bun:1, skin:'#f2d2b6', sash:1, bulk:1.08}, 'With the sash on fête days.');
volP('Protester with sign', {skin:'#f2d2b6', top:'#3f7a4a', bot:'#3a4a63', shoe:'#5a4632', hair:'#9a4a2a', longHair:1, hat:'beanie', hatc:'#c63a2c', scarf:'#e8b730', hood:1, bulk:1.12, raise:1, item:'sign'}, 'Green parka, red beanie, yellow scarf, sign held up.');
volP('Protester with sign (2)', {top:'#c9622a', bot:'#4a4f55', hair:'#2b2522', beard:'#2b2522', skin:'#a8704a', raise:1, item:'sign', signText:'STOP', signBoard:'#e8b730', signInk:'#1c1f22'}, 'Yellow STOP sign.');
volP('Police officer', {top:'#2a4fa0', bot:'#1f2a44', hair:'#2b2522', skin:'#e8c09c', hat:'cap', hatc:'#1f2a44', belt:'#1c1f22', shoe:'#1c1f22'}, '');
volP('Riot police', {top:'#2d3440', bot:'#2d3440', hair:'#1f2a44', skin:'#e8c09c', hat:'visor', hatc:'#16181b', visorc:'#3a4a5a', armor:'#4a5463', armor2:'#7d8796', knee:'#7d8796', hand:'#1c1f22', shoe:'#16181b', boots:1, bulk:1.3, tall:1.06, item:'shield', baton:1}, 'Full armour, black helmet with visor, shoulder plates, shield and baton.');
volP('Journalist (La Feuille)', {top:'#c9a24a', bot:'#3a3f45', hair:'#3a2b20', longHair:1, skin:'#f2d2b6', item:'camera', pack:'#5a4632'}, '');
volP('Banker', {top:'#3a4a63', bot:'#3a4a63', hair:'#5a4632', skin:'#e8c09c', shirt:'#f4f2ec', tie:'#c9a23a', item:'case', belly:1, shoe:'#1c1f22'}, '');
volP('The lender', {top:'#f4f2ec', bot:'#f4f2ec', hair:'#1c1f22', skin:'#d9a882', shirt:'#1c1f22', hat:'fedora', hatc:'#f4f2ec', band2:'#1c1f22', bulk:1.1, shoe:'#f4f2ec'}, 'White suit, white hat with a black band.');
volP('Association presenter', {top:'#3d6b45', bot:'#4a4f55', hair:'#7a4a2a', longHair:1, skin:'#f2d2b6', item:'board'}, 'Gives the slide show.');
volP('Soldier', {top:'#5b6b45', bot:'#5b6b45', hair:'#2b2522', skin:'#e8c09c', hat:'army', hatc:'#4a5838', shoe:'#2b2a22', boots:1, item:'rifle', pack:'#4a5838'}, 'Helmet, pack, rifle. Only in the secret ending.');
volP('Soldier with radio', {top:'#5b6b45', bot:'#5b6b45', hair:'#5a4632', skin:'#d9a882', hat:'army', hatc:'#4a5838', shoe:'#2b2a22', boots:1, item:'radio'}, '');
volP('Officer', {top:'#4f5d3c', bot:'#4f5d3c', hair:'#9a9590', skin:'#efc9a8', hat:'army', hatc:'#4a5838', shoe:'#2b2a22', boots:1, item:'board', tall:1.04, belt:'#2b2a22'}, 'Reads the evacuation order.');
volP('Soldier (woman)', {top:'#5b6b45', bot:'#5b6b45', hair:'#3a2b20', longHair:1, skin:'#f2d2b6', hat:'army', hatc:'#4a5838', shoe:'#2b2a22', boots:1, pack:'#4a5838'}, '');
volP('Child', {top:'#e8b730', bot:'#3a4a63', hair:'#8a5a3a', skin:'#f2d2b6', small:1}, '');

/* ---------------------------------------------------------------- nature, animals, ground, site items, air */
const hsh = (a, b, c) => { const s = Math.sin(a*127.1 + b*311.7 + c*74.7)*43758.5453; return s - Math.floor(s); };
const cell = (x, y, z, q) => hsh(Math.floor(x/q), Math.floor(y/q), Math.floor(z/q));
const leafy = (base, x, y, z) => { const n = cell(x, y, z, 0.35); return n < 0.22 ? sh(base, 0.9) : n > 0.82 ? sh(base, 1.12) : base; };
// trees as functions of a local point, so forests can reuse them
const beech = (x, y, z, s) => { s = s || 1; if (cyZ(0, 0, 0.22*s, 0, 3*s)([x, y, z])) return '#6a4a32';
  const P3 = [x, y, z]; if (inEll(P3, [0, 0, 5*s], 2.4*s, 2.4*s, 2.1*s) || inEll(P3, [-0.8*s, 0.4*s, 4.2*s], 1.5*s, 1.5*s, 1.3*s) || inEll(P3, [0.8*s, -0.4*s, 4.4*s], 1.6*s, 1.6*s, 1.4*s) || inEll(P3, [0, 0.8*s, 6.1*s], 1.4*s, 1.4*s, 1.2*s)) return leafy('#5d8a3e', x, y, z); return null; };
const spruce = (x, y, z, s) => { s = s || 1; const r = Math.hypot(x, y); if (r < 0.18*s && z < 2*s) return '#5a3e2a'; if (z < 1*s || z > 10*s) return null;
  const t = (z - 1*s)/(9*s), tier = 0.72 + 0.28*(((z/s)*1.15) % 1), R = 1.9*s*(1 - t)*tier; return r <= R ? leafy('#2f5a3a', x, y, z) : null; };
const fruitTree = (x, y, z) => { if (cyZ(0, 0, 0.16, 0, 1.8)([x, y, z])) return '#6a4a32'; if (inEll([x, y, z], [0, 0, 2.7], 1.5, 1.5, 1.15)) return cell(x, y, z, 0.25) > 0.9 ? '#c8322a' : leafy('#6a9a44', x, y, z); return null; };
const at = (f, ox, oy, s) => (x, y, z) => f(x - ox, y - oy, z, s);
const firstOf = (...fs) => (x, y, z) => { for (const f of fs){ const c = f(x, y, z); if (c) return c; } return null; };
const grass = (F, W, D, c) => F([[0, 0], [W, 0], [W, D], [0, D]], c || '#9db383');
const nat = (n, W, D, H, fn, note, o) => def('n', n, W, D, ({SD, F}) => { if (!(o && o.bare)) grass(F, W, D); SD(0, W, 0, D, 0, H, fn, Object.assign({step:0.05}, o || {})); }, note);

nat('Beech (broadleaf tree)', 6, 6, 7.5, at(beech, 3, 3), 'Village and valley trees.');
nat('Spruce', 4, 4, 10.2, at(spruce, 2, 2), 'The Jura forests are mostly spruce and fir.');
nat('Fruit tree', 4, 4, 4, at(fruitTree, 2, 2), 'Orchards around the farms.');
nat('Bush', 2.6, 2.6, 1.5, (x, y, z) => inEll([x, y, z], [1.3, 1.3, 0.55], 1.15, 1.1, 0.8) && z > 0 ? leafy('#55803c', x, y, z) : null, '');
nat('Hedge', 8, 1.6, 1.6, (x, y, z) => rbx(0.2, 7.8, 0.25, 1.35, 0, 1.45, 0.45)([x, y, z]) ? leafy('#4f7a38', x, y, z) : null, 'Field borders.');
nat('Forest patch', 16, 14, 11, firstOf(at(spruce, 3, 3, 0.9), at(spruce, 8, 2.5, 1.05), at(beech, 12.5, 4, 0.85), at(spruce, 4, 9, 1.1), at(spruce, 9, 8, 0.95), at(beech, 13, 10.5, 0.9), at(spruce, 6, 12.5, 0.8)), 'Placed in clusters on the hills.', {step:0.08});
nat('Rock outcrop', 4, 3, 1.8, (x, y, z) => (inEll([x, y, z], [1.5, 1.4, 0.3], 1.3, 1.0, 1.1) || inEll([x, y, z], [2.7, 1.6, 0.2], 1.0, 0.9, 0.8) || inEll([x, y, z], [2.0, 1.0, 0.9], 0.6, 0.5, 0.7)) && z > 0 ? (cell(x, y, z, 0.3) > 0.7 ? '#b8b4a8' : '#a19d92') : null, 'Limestone, as everywhere in the Jura.');
def('n', 'Pond', 8, 6, ({F, L}) => { grass(F, 8, 6); const ring = (rx, ry) => Array.from({length:16}, (_, i) => { const a = i/16*Math.PI*2; return [4 + Math.cos(a)*rx, 3 + Math.sin(a)*ry*(1 + 0.08*Math.sin(a*3))]; });
  F(ring(3.4, 2.5), '#7d8f6a'); F(ring(3.1, 2.2), '#5f8fb0'); F(ring(2.2, 1.4), '#6b9cbd'); for (const [x, y] of [[1.4, 2.2], [1.6, 3.6], [6.6, 2.4]]) L([[x, y, 0], [x + 0.1, y, 0.9]], '#6a7f45', 0.6); }, 'Where the farmers water the cows.');
def('n', 'Stream', 12, 5, ({F}) => { grass(F, 12, 5); const pts = Array.from({length:13}, (_, i) => [i, 2.5 + Math.sin(i*0.7)*0.9]); F([...pts.map(([x, y]) => [x, y - 0.75]), ...pts.slice().reverse().map(([x, y]) => [x, y + 0.75])], '#7d8f6a');
  F([...pts.map(([x, y]) => [x, y - 0.55]), ...pts.slice().reverse().map(([x, y]) => [x, y + 0.55])], '#5f8fb0'); }, 'The valley stream; contamination shows here first.');

/* Animals: small, so few details. Chickens are three pixels. */
const ani = (n, W, D, H, fn, note) => def('a', n, W, D, ({SD}) => SD(0, W, 0, D, 0, H, fn, {step:0.015}), note);
const cowFn = (lying) => (x, y, z) => { const p = [x, y, z], bz = lying ? 0.45 : 0.95, hz = lying ? 0.8 : 1.0;
  if (!lying) for (const lx of [0.75, 1.85]) for (const ly of [0.33, 0.67]) if (inCap(p, [lx, ly, 0.75], [lx, ly, 0], 0.08, 0.065)) return z < 0.08 ? '#2b2522' : '#e2d8c8';
  if (inEll(p, [2.36, 0.5, hz], 0.27, 0.16, 0.17)) return x > 2.5 ? '#e8b8a0' : '#f2efe6';
  for (const s of [-1, 1]) if (inEll(p, [2.22, 0.5 + s*0.17, hz + 0.1], 0.06, 0.07, 0.04)) return '#9a4a2a';
  if (inCap(p, [1.95, 0.5, bz + 0.15], [2.25, 0.5, hz + 0.05], 0.18, 0.15)) return '#9a4a2a';
  if (!lying && inEll(p, [1.1, 0.5, 0.64], 0.13, 0.11, 0.07)) return '#e8a8a0';
  if (inCap(p, [0.42, 0.5, bz + 0.2], [0.36, 0.5, bz - 0.35], 0.03, 0.03)) return '#9a4a2a';
  if (inEll(p, [1.3, 0.5, bz], 0.92, 0.34, 0.38) && z > 0) return cell(x + 0.2, y, z, 0.4) > 0.45 ? '#9a4a2a' : '#f2efe6';
  return null; };
ani('Cow (Simmental)', 2.7, 1.0, 1.45, cowFn(false), 'Red and white, as in the Jura.');
ani('Cow, lying', 2.7, 1.0, 1.0, cowFn(true), '');
ani('Sheep', 1.3, 0.6, 0.9, (x, y, z) => { const p = [x, y, z]; if (inEll(p, [1.08, 0.3, 0.68], 0.13, 0.09, 0.12)) return '#2b2a28'; for (const lx of [0.42, 0.88]) for (const ly of [0.2, 0.4]) if (inCap(p, [lx, ly, 0.45], [lx, ly, 0], 0.03, 0.03)) return '#2b2a28';
  return inEll(p, [0.65, 0.3, 0.6], 0.45, 0.27, 0.27) ? (cell(x, y, z, 0.1) > 0.6 ? '#f6f3ea' : '#e2ddd0') : null; }, '');
ani('Chicken', 0.45, 0.3, 0.42, (x, y, z) => { const p = [x, y, z]; if (inEll(p, [0.34, 0.15, 0.36], 0.04, 0.02, 0.04)) return '#c8322a'; if (inEll(p, [0.4, 0.15, 0.31], 0.035, 0.02, 0.02)) return '#e8b730';
  if (z < 0.12 && Math.abs(y - 0.15) < 0.06 && Math.abs(x - 0.22) < 0.02) return '#e8b730'; return inEll(p, [0.2, 0.15, 0.22], 0.15, 0.09, 0.1) || inEll(p, [0.33, 0.15, 0.3], 0.07, 0.06, 0.07) ? '#f4f2ec' : null; }, 'Three pixels.');
ani('Chicken (brown)', 0.45, 0.3, 0.42, (x, y, z) => { const p = [x, y, z]; if (inEll(p, [0.34, 0.15, 0.36], 0.04, 0.02, 0.04)) return '#c8322a';
  if (z < 0.12 && Math.abs(y - 0.15) < 0.06 && Math.abs(x - 0.22) < 0.02) return '#e8b730'; return inEll(p, [0.2, 0.15, 0.22], 0.15, 0.09, 0.1) || inEll(p, [0.33, 0.15, 0.3], 0.07, 0.06, 0.07) ? '#a0603a' : null; }, '');

/* Ground: roads, tracks, pipes, lines, fields, street furniture */
const ASP = '#6b7075', SHO = '#a39d8e';
const dash = (F, x0, x1, y, alongX) => { for (let a = x0 + 0.5; a < x1 - 1; a += 3) F(alongX ? [[a, y - 0.07], [a + 1.5, y - 0.07], [a + 1.5, y + 0.07], [a, y + 0.07]] : [[y - 0.07, a], [y + 0.07, a], [y + 0.07, a + 1.5], [y - 0.07, a + 1.5]], '#f2f0e8'); };
const gnd = (n, W, D, fn, note) => def('g', n, W, D, fn, note);
gnd('Road, straight', 10, 8, ({F}) => { grass(F, 10, 8); F([[0, 1.7], [10, 1.7], [10, 6.3], [0, 6.3]], SHO); F([[0, 2], [10, 2], [10, 6], [0, 6]], ASP); dash(F, 0, 10, 4, true); }, 'Laid on a grid; 4 m of asphalt with a gravel shoulder.');
gnd('Road, crossing', 10, 10, ({F}) => { grass(F, 10, 10); F([[0, 2.7], [10, 2.7], [10, 7.3], [0, 7.3]], SHO); F([[2.7, 0], [7.3, 0], [7.3, 10], [2.7, 10]], SHO); F([[0, 3], [10, 3], [10, 7], [0, 7]], ASP); F([[3, 0], [7, 0], [7, 10], [3, 10]], ASP); dash(F, 0, 3, 5, true); dash(F, 7, 10, 5, true); dash(F, 0, 3, 5, false); dash(F, 7, 10, 5, false); }, '');
gnd('Road, T-junction', 10, 10, ({F}) => { grass(F, 10, 10); F([[0, 2.7], [10, 2.7], [10, 7.3], [0, 7.3]], SHO); F([[2.7, 7], [7.3, 7], [7.3, 10], [2.7, 10]], SHO); F([[0, 3], [10, 3], [10, 7], [0, 7]], ASP); F([[3, 6.9], [7, 6.9], [7, 10], [3, 10]], ASP); dash(F, 0, 10, 5, true); }, '');
gnd('Road, bend', 10, 10, ({F}) => { grass(F, 10, 10); const arc = (r) => Array.from({length:10}, (_, i) => { const a = i/9*Math.PI/2; return [10 - Math.cos(a)*r, 10 - Math.sin(a)*r]; });
  F([...arc(7.3), ...arc(2.7).reverse()], SHO); F([...arc(7), ...arc(3).reverse()], ASP); }, '');
gnd('Dirt track', 10, 6, ({F}) => { grass(F, 10, 6); F([[0, 1.8], [10, 1.8], [10, 4.2], [0, 4.2]], '#a99a7a'); F([[0, 2.6], [10, 2.6], [10, 3.4], [0, 3.4]], '#94a873'); }, 'To farms, the villa and sites: two ruts and grass between.');
gnd('Gravel pad', 10, 8, ({F, L}) => { F([[0, 0], [10, 0], [10, 8], [0, 8]], PAL.gravel); for (const y of [2.5, 5]) L([[0.5, y, 0], [9.5, y + 0.6, 0]], '#9e9788', 0.8); }, 'Under every site and rig.');
gnd('Heat pipe, above ground', 10, 3, ({F, B, SD}) => { grass(F, 10, 3); for (const x of [1, 5, 9]) B(x - 0.15, 0.6, 0, 0.3, 1.8, 0.75, '#9aa1a8');
  SD(0, 10, 0, 3, 0.6, 1.4, (x, y, z) => cyY(0, 0, 0, 0, 0)([x, y, z]) || (((y - 1.1)**2 + (z - 1.0)**2 <= 0.26**2) || ((y - 1.9)**2 + (z - 1.0)**2 <= 0.26**2)) ? (((x % 2.5) < 0.12) ? '#a9afb5' : '#c9ced3') : null, {step:0.04}); }, 'Insulated supply and return, on short supports.');
gnd('Heat pipe, buried', 10, 3, ({F, C}) => { grass(F, 10, 3); F([[0, 1.1], [10, 1.1], [10, 1.9], [0, 1.9]], '#a99a7a'); for (const x of [1.5, 6.5]) C(x, 0.6, 0, 0.07, 1.0, '#e8b730', {top:'#c8322a'}); }, 'Fresh trench, yellow marker posts.');
gnd('Power line (wooden poles)', 20, 3, ({F, C, B, L}) => { grass(F, 20, 3); for (const x of [3, 13]){ C(x, 1.5, 0, 0.13, 8, '#7a5a3a'); B(x - 0.08, 0.6, 7.4, 0.16, 1.8, 0.14, '#6a4a32'); }
  for (const y of [0.75, 2.25]){ const sag = []; for (let i = 0; i <= 20; i++){ const x = i, u = ((x - 3) % 10 + 10) % 10/10; sag.push([x, y, 7.6 - Math.sin(u*Math.PI)*0.6]); } L(sag, '#2b2f33', 0.4); } }, 'Village supply.');
gnd('High-voltage pylon', 8, 8, ({F, L}) => { grass(F, 8, 8); const top = 18, leg = (x, y) => L([[x, y, 0], [4 + (x - 4)*0.15, 4 + (y - 4)*0.15, top]], '#8a9198', 1);
  leg(1.5, 1.5); leg(6.5, 1.5); leg(6.5, 6.5); leg(1.5, 6.5); for (const z of [4, 8, 12]){ const f = 1 - z/top*0.85, a = 4 - 2.5*f, b = 4 + 2.5*f; L([[a, a, z], [b, a, z], [b, b, z], [a, b, z], [a, a, z]], '#8a9198', 0.6); L([[a, a, z], [b, b, z]], '#8a9198', 0.5); }
  for (const z of [13, 16]) L([[4, -2, z], [4, 10, z]], '#8a9198', 1); for (const y of [-2, 10]) L([[-4, y, 12.5], [12, y, 12.2]], '#2b2f33', 0.4); }, 'The grid line across the valley; the substation hooks in here.');
gnd('Fence', 8, 1.5, ({F, L}) => { grass(F, 8, 1.5); for (let x = 0.5; x <= 7.6; x += 1.4) L([[x, 0.75, 0], [x, 0.75, 1.15]], '#7a5a3a', 0.7); for (const z of [0.5, 0.95]) L([[0.5, 0.75, z], [7.5, 0.75, z]], '#8a6a4a', 0.5); }, 'Pastures.');
gnd('Street lamp', 2, 2, ({C, L, B}) => { C(1, 1, 0, 0.08, 5, '#5a6066'); L([[1, 1, 5], [1.9, 1, 5.3]], '#5a6066', 0.7); B(1.6, 0.85, 5.05, 0.6, 0.3, 0.15, '#3a3f45', {win:[['S', 0.05, 0, 0.5, 0.05, '#fff4b8']]}); }, '');
gnd('Bus stop', 5, 3, ({F, C, B}) => { F([[0, 0], [5, 0], [5, 3], [0, 3]], '#bdb9b0'); C(0.6, 2.4, 0, 0.05, 2.6, '#9aa3ab'); B(0.3, 2.35, 2.2, 0.6, 0.1, 0.45, '#e8b730', {win:[['S', 0.1, 0.08, 0.4, 0.3, '#e8b730', 'H', '#1c1f22']]});
  B(1.6, 0.5, 0, 2.8, 1.2, 2.3, '#bfe0ee', {top:'#5a6066', win:[['S', 0.1, 0.4, 2.6, 0.12, '#5a6066']]}); }, 'For the post bus gift.');
gnd('Hiking signpost', 2, 2, ({C, B}) => { C(1, 1, 0, 0.05, 2.2, '#9aa3ab'); B(1.0, 0.95, 1.85, 0.9, 0.08, 0.22, '#e8b730'); B(0.2, 1.0, 1.55, 0.8, 0.08, 0.22, '#e8b730'); }, 'Yellow, of course.');
gnd('Bridge', 10, 8, ({F, B, L}) => { grass(F, 10, 8); F([[3, 0], [7, 0], [7, 8], [3, 8]], '#7d8f6a'); F([[3.4, 0], [6.6, 0], [6.6, 8], [3.4, 8]], '#5f8fb0');
  B(0, 2.5, 0, 3.2, 3, 0.6, '#b8b4a8'); B(6.8, 2.5, 0, 3.2, 3, 0.6, '#b8b4a8'); B(0, 2.6, 0.6, 10, 2.8, 0.35, '#a19d92', {top:ASP}); for (const y of [2.65, 5.35]) L([[0, y, 1.0], [10, y, 1.0]], '#8a9198', 0.6); }, '');
gnd('Meadow', 10, 10, ({F}) => { grass(F, 10, 10, '#9fb87f'); for (let i = 0; i < 40; i++){ const x = hsh(i, 1, 2)*9.6, y = hsh(i, 3, 4)*9.6, c = ['#f4f2ec', '#e8b730', '#c86a9a'][i % 3]; F([[x, y], [x + 0.25, y], [x + 0.25, y + 0.25], [x, y + 0.25]], c); } }, 'With flowers.');
gnd('Wheat field', 10, 10, ({F}) => { F([[0, 0], [10, 0], [10, 10], [0, 10]], '#d9b85a'); for (let y = 0.6; y < 10; y += 0.9) F([[0, y], [10, y], [10, y + 0.18], [0, y + 0.18]], '#c4a24a'); }, '');
gnd('Ploughed field', 10, 10, ({F}) => { F([[0, 0], [10, 0], [10, 10], [0, 10]], '#8a6a4a'); for (let x = 0.4; x < 10; x += 0.7) F([[x, 0], [x + 0.25, 0], [x + 0.25, 10], [x, 10]], '#76583c'); }, '');
gnd('Pasture with cows and sheep', 16, 12, (H) => { grass(H.F, 16, 12, '#9fb87f'); for (const [x, y, f] of [[2, 2, cowFn(false)], [7, 6, cowFn(true)], [10, 2.5, cowFn(false)]]) H.SD(x, x + 2.7, y, y + 1, 0, 1.45, (px, py, pz) => f(px - x, py - y, pz), {step:0.03});
  for (const [x, y] of [[3, 8], [4.6, 9.5], [12, 8.5], [13.5, 10]]) H.SD(x, x + 1.3, y, y + 0.6, 0, 0.9, (px, py, pz) => { const p = [px - x, py - y, pz]; return inEll(p, [1.08, 0.3, 0.68], 0.13, 0.09, 0.12) ? '#2b2a28' : inEll(p, [0.65, 0.3, 0.55], 0.45, 0.27, 0.3) && pz > 0.2 ? '#ece8dc' : pz < 0.4 && inEll(p, [0.65, 0.3, 0.2], 0.3, 0.12, 0.3) ? '#2b2a28' : null; }, {step:0.03}); }, 'How they appear on the map, at the same scale.');

/* Site items and effects */
const flame = (x, y, z, cx, cy, z0, r, h) => { const t = (z - z0)/h; if (t < 0 || t > 1) return null; const an = Math.atan2(y - cy, x - cx), rr = r*(1 - t**0.8)*(0.7 + 0.5*hsh(Math.floor(z*5), Math.floor(an*2), 1)), d = Math.hypot(x - cx, y - cy); if (d > rr) return null;
  return '!' + (t < 0.3 ? '#ffe08a' : t < 0.6 ? '#f5a030' : '#d8502a'); };
const site = (n, W, D, fn, note) => def('e', n, W, D, fn, note);
site('Prospect flag', 2, 2, ({L, B}) => { L([[1, 1, 0], [1, 1, 3]], '#c9ccd0', 0.8); B(1.02, 1, 2.2, 0.04, 1.1, 0.75, PAL.co, {noline:1, win:[['S', 0.0, 0.25, 1.1, 0.22, PAL.co2]]}); }, 'Planted by the geologist; marks a prospect.');
site('Survey line', 16, 2, ({L, B}) => { L([[0.5, 1, 0.05], [15.5, 1, 0.05]], '#e07a2c', 0.4); for (let x = 1; x < 16; x += 1.5){ B(x - 0.1, 0.9, 0, 0.2, 0.2, 0.12, '#3a3f45'); L([[x, 1.1, 0], [x, 1.1, 0.5]], '#c9ccd0', 0.3); B(x, 1.1, 0.35, 0.02, 0.25, 0.15, '#e07a2c', {noline:1}); } }, 'Geophones laid along a road during a survey.');
site('Flare stack', 4, 4, ({C, SD, B}) => { B(1, 1, 0, 2, 2, 0.4, '#9aa3ab'); C(2, 2, 0.4, 0.22, 6, '#c9ccd0'); SD(0.5, 3.5, 0.5, 3.5, 6.3, 9.8, (x, y, z) => flame(x, y, z, 2, 2, 6.4, 1.0, 3.3)); }, 'Burns off gas from a kick; drilling goes on.');
site('Mud tank', 6, 3, ({B, L}) => { B(0.3, 0.4, 0, 5.4, 2.2, 2.2, '#8a6a3a', {top:'#5a4632', win:[['S', 0.3, 0.3, 4.8, 0.2, '#e07a2c']]}); L([[5.8, 1.5, 0], [5.8, 1.5, 2.4]], '#c9ccd0', 0.6); }, '');
site('Casing stack', 8, 3, ({SD}) => SD(0, 8, 0, 3, 0, 1.4, (x, y, z) => { for (const [yc, zc] of [[0.5, 0.3], [1.1, 0.3], [1.7, 0.3], [2.3, 0.3], [0.8, 0.82], [1.4, 0.82], [2.0, 0.82], [1.1, 1.3], [1.7, 1.3]]) if ((y - yc)**2 + (z - zc)**2 <= 0.27**2 && x > 0.3 && x < 7.7) return x < 0.38 || x > 7.62 ? '#3a3f45' : '#7a828a'; return null; }, {step:0.03}), 'Steel casing, as delivered to the pad.');
site('Fire', 4, 4, ({SD, S}) => { SD(0, 4, 0, 4, 0, 3.4, firstOf((x, y, z) => flame(x, y, z, 1.6, 1.8, 0, 1.0, 3.2), (x, y, z) => flame(x, y, z, 2.6, 2.3, 0, 0.8, 2.4))); for (const [z, r] of [[4, 0.9], [5.2, 1.2], [6.5, 1.5]]) S(2 + z*0.1, 2, z, r, 'rgba(150,150,150,.85)'); }, 'Things set ablaze by an angry crowd.');
site('Smoke column', 4, 4, ({S}) => { for (let i = 0; i < 7; i++) S(2 + i*0.25, 2, 1 + i*1.3, 0.7 + i*0.25, i % 2 ? 'rgba(150,150,150,.85)' : 'rgba(130,130,130,.85)'); }, 'Over ruins after a big quake, over burnt sites.');
site('Rocket', 6, 2, ({SD, S}) => { SD(0, 6, 0, 2, 3, 5, (x, y, z) => { const p = [x, y, z]; if (inCap(p, [1.4, 1, 4], [4.8, 1, 4], 0.14, 0.14)) return x > 4.5 ? '#c8322a' : '#c9ced3'; if (x > 1.4 && x < 1.9 && ((Math.abs(y - 1) < 0.03 && Math.abs(z - 4) < 0.4) || (Math.abs(z - 4) < 0.03 && Math.abs(y - 1) < 0.4))) return '#8a9198';
  return x > 0.7 && x < 1.4 && Math.hypot(y - 1, z - 4) < 0.12*(x - 0.7)/0.7 + 0.02 ? '!#f5a030' : null; }); for (let i = 0; i < 4; i++) S(0.5 - i*0.45, 1, 4, 0.18 + i*0.08, 'rgba(210,210,210,.85)'); }, 'Fired at the rigs from the formation.');
site('Explosion', 6, 6, ({SD, S}) => { SD(0, 6, 0, 6, 0, 4.5, (x, y, z) => { const d = Math.hypot(x - 3, y - 3, (z - 1.8)*1.1) + (cell(x, y, z, 0.45) - 0.5)*0.9; if (d > 2.3) return null; const n = cell(x, y, z, 0.3); return '!' + (n > 0.62 ? '#ffe08a' : n > 0.3 ? '#f5a030' : '#d8502a'); }); for (const [x, z, r] of [[2, 4.5, 1.2], [3.8, 4.8, 1.3], [3, 6, 1.6]]) S(x, 3, z, r, 'rgba(140,140,140,.85)'); }, 'A rocket hit.');
site('Destroyed rig', 14, 12, ({F, B, L, SD, S}) => { F([[0, 0], [14, 0], [14, 12], [0, 12]], PAL.gravel); F([[3, 3], [10, 2.5], [11, 9], [4, 9.5]], '#5a5048');
  for (let i = 0; i < 6; i++) L([[2 + i*1.6, 4 + (i % 2), 0.2 + (i % 3)*0.3], [3 + i*1.6, 7 - (i % 2), 0.4]], '#d0663a', 1.2); L([[2, 5, 0.3], [12.5, 8, 1.2]], '#d0663a', 1.6); L([[2, 6.5, 0.3], [12.5, 9, 1]], '#d0663a', 1.4);
  B(8, 2, 0, 3, 2, 1.2, '#3a3f45', {h:[1.2, 0.6, 0.9, 1.4]}); SD(5, 9, 4, 8, 0, 3, (x, y, z) => flame(x, y, z, 7, 6, 0, 1.4, 2.8)); for (const [z, r] of [[3.5, 1.2], [5, 1.6], [6.8, 2]]) S(7 + z*0.15, 6, z, r, 'rgba(130,130,130,.85)'); }, 'What is left after the formation passes.');
site('Crater', 6, 6, ({F, B}) => { F([[0, 0], [6, 0], [6, 6], [0, 6]], '#9db383'); const ring = (r, c) => F(Array.from({length:14}, (_, i) => { const a = i/14*Math.PI*2; return [3 + Math.cos(a)*r*(1 + 0.12*Math.sin(a*4)), 3 + Math.sin(a)*r]; }), c);
  ring(2.7, '#8a7458'); ring(1.9, '#5a4a38'); ring(1.0, '#3a3028'); for (const [x, y] of [[0.6, 1.2], [5.2, 4.6], [4.6, 0.8]]) B(x, y, 0, 0.4, 0.3, 0.25, '#7a6a58'); }, '');

/* Air and scale: the F-35 flies low, so on the map it is not much bigger than a house */
const placeModel = (H, name, dx, dy) => { const m = M.find(q => q.n === name), map = new Map();
  for (const q of m.parts){ const c = Object.assign({}, q); for (const k of ['x', 'kx']) if (c[k] !== undefined) c[k] += dx; for (const k of ['y', 'ky']) if (c[k] !== undefined) c[k] += dy;
    if (c.pts) c.pts = c.pts.map(v => v.length === 3 ? [v[0] + dx, v[1] + dy, v[2]] : [v[0] + dx, v[1] + dy]);
    if (c.t === 'sdf'){ const f = q.fn; c.b = [q.b[0] + dx, q.b[1] + dx, q.b[2] + dy, q.b[3] + dy, q.b[4], q.b[5]]; c.fn = (x, y, z) => f(x - dx, y - dy, z); if (q.badge) c.badge = Object.assign({}, q.badge, {x:q.badge.x + dx, y:q.badge.y + dy}); delete c.labels; }
    map.set(q, c); H.raw(c); }
  for (const [q, c] of map) if (q.par) c.par = map.get(q.par); };
def('x', 'Scale check: F-35 flying low over a house, a car, a driller and cows', 40, 22, (H) => { grass(H.F, 40, 22); placeModel(H, 'House, small', 2, 9); placeModel(H, 'Company car (old 911)', 14, 15); placeModel(H, 'Driller', 19, 15.5); placeModel(H, 'Cow (Simmental)', 22, 16); f35At(H, 16, 2, 12); }, 'All at the same scale. The jet at 12 m: its shadow on the ground, the jet above it.');
def('x', 'F-35 formation (four, close)', 52, 46, (H) => { for (const [dx, dy] of [[30, 13], [19, 0], [19, 26], [8, 39]]) f35At(H, dx, dy, 9); for (const [x, y] of [[47, 16], [47, 21]]) H.SD(x, x + 3.4, y, y + 0.4, 9.5, 11, (px, py, pz) => inCap([px, py, pz], [x + 0.3, y + 0.2, 10.4], [x + 3.2, y + 0.2, 10.2], 0.1, 0.1) ? '#c9ced3' : null, {step:0.04}); }, 'Fly once across the map, low, firing at every rig. As many as needed.');

/* ---------------------------------------------------------------- crowds, variations, poses */
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
const pick = (r, a) => a[Math.floor(r()*a.length)];
const SKIN = ['#f2d2b6', '#e8c09c', '#d9a882', '#c98e66', '#a8704a', '#8a5a3a', '#f4dcc8'], HAIR = ['#2b2522', '#3a2b20', '#5a4632', '#7a4a2a', '#9a4a2a', '#c9a24a', '#d9d4c8', '#9a9590', '#1c1f22', '#c94c3a'];
const TOPS = ['#3f7a4a', '#c9622a', '#2c5f93', '#b8322a', '#e8b730', '#6a5a8a', '#3a4a63', '#7a8f6e', '#2c8a8a', '#b05a6a', '#4a4f55', '#8a6a4a', '#d9d4c8', '#5a7aa0'];
const BOTS = ['#3a4a63', '#2b2f36', '#4a4f55', '#5a4632', '#2f3a52', '#6b5a44', '#7a7468'], SHOES = ['#2b2522', '#5a4632', '#3a3f45', '#d9d4c8', '#7a3a2a'];
// a figure 180° turned (facing -x), for police facing a crowd
const turned = (H, o, dx, dy, pose) => { const f = personVol(o, pose); H.SD(dx - 0.35, dx + 1.95, dy - 0.25, dy + 1.6, 0, 2.6*(o.tall || 1), (x, y, z) => f(1.5 - (x - dx), 1.5 - (y - dy), z), {step:0.035}); };
const label = (H, x, y, txt) => H.T(x, y, 0, txt, {size:8, color:'#2a2d33', post:1});
const sheet = (n, W, D, fn, note, views) => { def('c', n, W, D, fn, note); M[M.length - 1].views = views || [0]; };
const protester = (r, i) => { const fem = r() < 0.55, old = r() < 0.15, o = {skin:pick(r, SKIN), top:pick(r, TOPS), bot:pick(r, BOTS), shoe:pick(r, SHOES), hair:old ? pick(r, ['#d9d4c8', '#9a9590', '#e6e2da']) : pick(r, HAIR), longHair:fem && r() < 0.75, bun:fem && r() < 0.15, beard:!fem && r() < 0.35 ? pick(r, ['#2b2522', '#5a4632', '#9a9590']) : null, bulk:0.95 + r()*0.2, tall:old ? 0.95 : 0.96 + r()*0.08};
  const hat = r(); if (hat < 0.3){ o.hat = 'beanie'; o.hatc = pick(r, ['#c63a2c', '#2c5f93', '#e8b730', '#3f7a4a', '#4a4f55']); } else if (hat < 0.42){ o.hat = 'cap'; o.hatc = pick(r, ['#2b2f36', '#c63a2c', '#d9d4c8']); } else if (hat < 0.5){ o.hat = 'hoodup'; o.hatc = o.top; }
  if (r() < 0.35) o.scarf = pick(r, ['#e8b730', '#c63a2c', '#f4f2ec', '#2c5f93']); if (r() < 0.25) o.hood = 1; if (r() < 0.2) o.pack = pick(r, ['#5a4632', '#3a4a63', '#c9622a']); if (fem && r() < 0.15) o.skirt = 1;
  const what = r(); if (what < 0.55){ o.item = 'sign'; o.signText = pick(r, ['NON', 'NON', 'NON', 'STOP', 'EAU', 'JURA']); const sc = pick(r, [['#f4f2ec', '#c63a2c'], ['#e8b730', '#1c1f22'], ['#f4f2ec', '#1c1f22'], ['#c63a2c', '#f4f2ec']]); o.signBoard = sc[0]; o.signInk = sc[1]; }
  else if (what < 0.7){ o.item = 'flag'; o.flagA = '#c63a2c'; o.flagB = '#f4f2ec'; } else if (what < 0.85) o.armR = 'fist'; else if (old) o.item = 'cane';
  return o; };
const villager = (r, i) => { const fem = r() < 0.55, old = r() < 0.3, o = {skin:pick(r, SKIN), top:pick(r, TOPS), bot:pick(r, BOTS), shoe:pick(r, SHOES), hair:old ? pick(r, ['#d9d4c8', '#9a9590', '#e6e2da']) : pick(r, HAIR), longHair:fem && r() < 0.6, bun:fem && old && r() < 0.5, beard:!fem && r() < 0.25 ? pick(r, ['#2b2522', '#9a9590']) : null, bulk:0.95 + r()*0.22, belly:!fem && r() < 0.25, tall:old ? 0.94 : 0.96 + r()*0.08, skirt:fem && r() < 0.35};
  const hat = r(); if (hat < 0.25){ o.hat = 'cap'; o.hatc = pick(r, ['#5a4632', '#3a3f45', '#2c5f93', '#7a7468']); } else if (hat < 0.32 && !old){ o.hat = 'beanie'; o.hatc = pick(r, ['#c63a2c', '#2c5f93', '#4a4f55']); }
  const what = r(); if (old && what < 0.5) o.item = 'cane'; else if (what < 0.3) o.item = 'case'; else if (what < 0.4) o.item = 'cup'; if (r() < 0.2) o.vest = pick(r, ['#4a4f55', '#7a8f6e']);
  return o; };
const blackBloc = (r, i) => { const o = {skin:pick(r, SKIN), top:'#1c1f22', bot:'#1c1f22', shoe:'#141517', hair:'#1c1f22', hat:'hoodup', hatc:'#1c1f22', mask:'#1c1f22', bulk:0.98 + r()*0.15, tall:0.97 + r()*0.07, hand:'#1c1f22'};
  if (r() < 0.4) o.pack = '#2b2f33'; const what = i % 5; if (what === 0){ o.item = 'flag'; o.flagA = '#1c1f22'; o.flagB = '#c63a2c'; } else if (what === 1){ o.item = 'flare'; o.armR = 'up'; } else if (what === 2){ o.item = 'stone'; o.armR = 'throw'; } else if (what === 3){ o.item = 'sign'; o.signText = 'NON'; o.signBoard = '#1c1f22'; o.signInk = '#f4f2ec'; } else o.armR = 'fist';
  return o; };
// rows run straight across the screen: along (1, -1) in the ground plane; the next row sits lower on the screen
const gridOf = (H, list, cols, sx, sy, poseOf) => list.forEach((o, i) => { const c = i % cols, r = Math.floor(i/cols), x = 0.6 + c*sx + r*sy, y = 0.6 + (cols - 1 - c)*sx + r*sy; figure3(H, o, x, y, poseOf ? poseOf(o, i) : null); });
const gridWD = (n, cols, sx, sy) => { const rows = Math.ceil(n/cols); return [cols*sx + rows*sy + 1.5, cols*sx + rows*sy + 1.5]; };
const PROT = Array.from({length:20}, (_, i) => protester(rng(1000 + i*7), i)), VILL = Array.from({length:20}, (_, i) => villager(rng(5000 + i*13), i)), BLOC = Array.from({length:10}, (_, i) => blackBloc(rng(9000 + i*5), i));
const GOON = [{skin:'#d9a882', top:'#2a2522', bot:'#1c1f22', shoe:'#141517', hair:'#1c1f22', hat:'cap', hatc:'#1c1f22', bulk:1.15, item:'torch', armR:'throw'}, {skin:'#e8c09c', top:'#2a2522', bot:'#2b2f36', shoe:'#141517', hair:'#5a4632', bulk:1.2, belly:1, item:'torch', armR:'up', jerrycan:1},
  {skin:'#c98e66', top:'#3a2f2a', bot:'#1c1f22', shoe:'#141517', hair:'#1c1f22', beard:'#1c1f22', bulk:1.1, jerrycan:1, armR:'forward'}, {skin:'#f2d2b6', top:'#2a2522', bot:'#1c1f22', shoe:'#141517', hair:'#9a9590', hat:'cap', hatc:'#2a2522', bulk:1.1, item:'torch', armR:'throw'}];
sheet('Protesters: 20 variations', ...gridWD(20, 10, 1.6, 3.6), (H) => gridOf(H, PROT, 10, 1.6, 3.6), 'Mixed ages and clothes; signs NON, STOP, EAU, JURA; Jura flags; raised fists.');
sheet('Villagers: 20 variations', ...gridWD(20, 10, 1.3, 2.6), (H) => gridOf(H, VILL, 10, 1.3, 2.6), 'Everyday people for the villages and the town.');
sheet('Black bloc: 10 variations', ...gridWD(10, 10, 1.6, 2.6), (H) => gridOf(H, BLOC, 10, 1.6, 2.6), 'Only in the riots before the secret ending: hoods, masks, flags, flares, stones.');
sheet('The lender\'s men: 4 variations', ...gridWD(4, 4, 1.4, 2.6), (H) => gridOf(H, GOON, 4, 1.4, 2.6), 'They set buildings ablaze: torches and jerrycans.');
// poses: idle, walk, walk, activity for every person
const ACT = {'The CEO':{armR:'point'}, 'Suit (woman)':{armR:'forward'}, 'Suit (man)':{armR:'forward'}, 'Geologist':{armR:'carry'}, 'Driller':{armR:'strike'}, 'Driller (woman)':{armR:'strike'}, 'Mud engineer':{armR:'eye'},
  'Water officer':{armR:'forward'}, 'Community liaison':{armR:'forward'}, 'Security guard':{armR:'hip', armL:'hip'}, 'Seismologist':{armR:'carry', armL:'carry'}, 'Plant operator':{armR:'point'}, 'Villager (woman)':{armR:'wave'},
  'Villager (man), elderly':{legs:['fwd', 'back']}, 'Farmer':{armR:'forward', legs:['fwd', 'back']}, 'Mayor':{armR:'wave'}, 'Protester with sign':{legs:['fwd', 'back']}, 'Protester with sign (2)':{armR:'fist'},
  'Police officer':{armR:'forward'}, 'Riot police':{armR:'strike', legs:['fwd', 'back']}, 'Journalist (La Feuille)':{armR:'eye', armL:'eye'}, 'Banker':{armR:'forward'}, 'The lender':{armR:'point'}, 'Association presenter':{armR:'point'},
  'Soldier':{armR:'forward'}, 'Soldier with radio':{armR:'ear'}, 'Officer':{armR:'carry', armL:'carry'}, 'Soldier (woman)':{armR:'point'}, 'Child':{legs:['runF', 'runB'], armR:'swingB', armL:'swingF'}};
const ACT_NAME = {'Riot police':'baton', 'Protester with sign':'marching', 'Farmer':'pitchfork', 'Journalist (La Feuille)':'photo', 'Child':'running', 'Mayor':'speech', 'Soldier':'aiming'};
const walkPose = (o, ab) => { const p = ab ? {legs:['fwd', 'back'], armR:'swingB', armL:'swingF'} : {legs:['back', 'fwd'], armR:'swingF', armL:'swingB'}; if (o.item === 'sign' || o.item === 'flag') p.armR = 'up'; if (o.item === 'shield') p.armL = 'shield'; if (o.item === 'cane') p.armR = 'down'; return p; };
for (const m of M.filter(q => q.cat === 'p' && q.o)){ const o = m.o, act = ACT[m.n] || {};
  sheet('Poses: ' + m.n, 9, 9, (H) => { [null, walkPose(o, 1), walkPose(o, 0), act].forEach((ps, i) => { const x = 0.6 + i*1.8, y = 0.6 + (3 - i)*1.8; figure3(H, o, x, y, ps); label(H, x + 1.75, y + 1.75, ['stand', 'walk', 'walk', ACT_NAME[m.n] || 'activity'][i]); }); }, '');
 }
for (const [n, o, act] of [['Black bloc', BLOC[2], {armR:'throw'}], ['The lender\'s men', GOON[0], {armR:'throw'}]])
  sheet('Poses: ' + n, 9, 9, (H) => { [{armR:o.armR}, walkPose(o, 1), walkPose(o, 0), act].forEach((ps, i) => { const x = 0.6 + i*1.8, y = 0.6 + (3 - i)*1.8; figure3(H, o, x, y, ps); label(H, x + 1.75, y + 1.75, ['stand', 'walk', 'walk', 'throw'][i]); }); }, '');
// lines and scenes
const RIOT = M.find(q => q.n === 'Riot police').o;
sheet('Riot police line: holding', 4, 7, (H) => { for (let i = 0; i < 7; i++) figure3(H, RIOT, 1, 0.3 + i*0.85, {armR:'down'}); }, 'Shoulder to shoulder, shields in front.', [0, 1]);
sheet('Riot police line: advancing', 4, 7, (H) => { for (let i = 0; i < 7; i++) figure3(H, RIOT, 1 + (i % 2)*0.25, 0.3 + i*0.85, i % 2 ? {legs:['fwd', 'back'], armR:'swingF'} : {legs:['back', 'fwd'], armR:'swingB'}); }, '', [0, 1]);
sheet('Riot police line: batons', 4, 7, (H) => { for (let i = 0; i < 7; i++) figure3(H, RIOT, 1 + (i % 3 === 1 ? 0.4 : 0), 0.3 + i*0.85, i % 3 === 1 ? {armR:'strike', legs:['runF', 'runB']} : {armR:'strike'}); }, 'Batons raised; some step out of the line.', [0, 1]);
sheet('Riot police: two rows', 5.5, 7, (H) => { for (let i = 0; i < 7; i++){ figure3(H, RIOT, 2.4, 0.3 + i*0.85, {armR:'down'}); if (i % 2 === 0) figure3(H, RIOT, 0.9, 0.7 + i*0.85, {armR:'strike'}); } }, 'A second row behind with batons ready.', [0, 1]);
const barricade = (H, X, y0, y1, fire) => H.SD(X - 0.8, X + 0.8, y0, y1, 0, fire ? 2.8 : 1.4, (x, y, z) => { const p = [x, y, z];
  if (fire){ const fl = flame(x, y, z, X, (y0 + y1)/2, 0.9, 0.7, 1.8) || flame(x, y, z, X, y0 + (y1 - y0)*0.25, 0.9, 0.5, 1.2); if (fl) return fl; }
  for (let yy = y0 + 0.4; yy < y1 - 0.2; yy += 0.75) if (Math.hypot(x - X, y - yy) < 0.38 && Math.hypot(x - X, y - yy) > 0.14 && z < 0.5) return '#2b2b2b';
  if (rbx(X - 0.45, X + 0.45, y0 + 0.1, y1 - 0.1, 0.5, 0.95, 0.04)(p) && ((Math.floor(z*8) % 2) || Math.abs(y - (y0 + y1)/2) < 0.1)) return '#a07a4a';
  if (inEll(p, [X + 0.1, y0 + (y1 - y0)*0.7, 1.05], 0.5, 0.35, 0.35)) return '#7a828a'; return null; }, {step:0.03});
sheet('Protesters at a barricade', 9, 8, (H) => { barricade(H, 6.6, 0.4, 7.6, false); [0, 3, 5, 7, 9, 11, 14, 16, 18, 19].forEach((k, i) => figure3(H, PROT[k], 3.6 - (i % 3)*1.0 - (i % 2)*0.3, 0.2 + i*0.72, i % 4 === 3 ? {legs:['fwd', 'back']} : null)); }, 'Behind tyres, pallets and a bin.', [0, 2]);
sheet('Black bloc at a burning barricade', 9, 8, (H) => { barricade(H, 6.6, 0.4, 7.6, true); BLOC.slice(0, 9).forEach((o, i) => figure3(H, o, 3.8 - (i % 3)*1.1, 0.3 + i*0.8, o.armR === 'throw' ? {armR:'throw', legs:['back', 'fwd']} : null)); for (const [z, r] of [[3.2, 0.9], [4.2, 1.2]]) H.S(6.8, 4, z, r, 'rgba(140,140,140,.85)'); }, '', [0, 2]);
sheet('Stand-off: crowd, barricade, police', 14, 8, (H) => { [1, 2, 4, 6, 8, 10, 12, 13].forEach((k, i) => figure3(H, PROT[k], 2.4 - (i % 2)*1.0, 0.3 + i*0.9, null)); BLOC.slice(5, 8).forEach((o, i) => figure3(H, o, 3.6, 1.2 + i*2.2, o.armR === 'throw' ? {armR:'throw'} : null));
  barricade(H, 6.4, 0.4, 7.6, true); for (let i = 0; i < 8; i++) turned(H, RIOT, 9.4, 0.2 + i*0.88, i % 3 === 1 ? {armR:'strike'} : {armR:'down'}); for (let i = 0; i < 4; i++) turned(H, RIOT, 11.2, 0.6 + i*1.7, {armR:'down'}); }, 'For the riot before the secret ending.', [0, 1]);
sheet('The lender\'s men set a house ablaze', 16, 12, (H) => { grass(H.F, 16, 12); placeModel(H, 'House, small', 1, 1);
  H.SD(1, 11, 1, 10, 3, 9, firstOf((x, y, z) => flame(x, y, z, 4, 4.5, 4.4, 1.4, 4.2), (x, y, z) => flame(x, y, z, 7, 5, 3.6, 1.2, 3.4), (x, y, z) => flame(x, y, z, 8.6, 6.4, 0.2, 0.7, 1.8)));
  for (const [x, z, r] of [[5, 9, 1.4], [6, 10.5, 1.8], [7.5, 12, 2.2]]) H.S(x, 4.5, z, r, 'rgba(120,120,120,.85)');
  GOON.forEach((o, i) => figure3(H, o, 11 + (i % 2)*1.5, 3 + i*1.7, i % 2 ? {legs:['fwd', 'back'], armR:o.armR} : {armR:o.armR})); placeModel(H, 'Black van (the lender)', 11, 9.5); }, 'Late at night. The vans wait with the engines running.', [0, 1]);
M[M.length - 1].s = 6;

/* ---------------------------------------------------------------- life in the valley: everyday people, village life, work, crisis */
const life = (n, W, D, fn, note, views, s) => { def('l', n, W, D, fn, note); const m = M[M.length - 1]; m.views = views || [0, 1, 2, 3]; if (s) m.s = s; };
const one = (n, o, pose, note) => life(n, 2.5, 2.5, (H) => figure3(H, o, 0.5, 0.5, pose), note);
const sk = (r) => pick(r, SKIN);
const bench = (H, x, y) => { H.B(x, y, 0.42, 0.5, 1.6, 0.06, '#8a6a4a'); H.B(x - 0.05, y, 0.48, 0.06, 1.6, 0.45, '#8a6a4a'); for (const yy of [y + 0.1, y + 1.4]) H.B(x + 0.05, yy, 0, 0.4, 0.08, 0.42, '#3a3f45'); };
const bikeAt = (H, x, y, col) => H.SD(x, x + 1.9, y - 0.1, y + 0.2, 0, 1.15, (px, py, pz) => { const p = [px, py, pz], cy0 = y + 0.05;
  for (const wx of [x + 0.35, x + 1.45]){ const rr = Math.hypot(px - wx, pz - 0.35); if (rr < 0.35 && rr > 0.29 && Math.abs(py - cy0) < 0.03) return '#1c1f22'; }
  if ([[[x + 0.35, cy0, 0.35], [x + 0.85, cy0, 0.4]], [[x + 0.85, cy0, 0.4], [x + 1.35, cy0, 0.85]], [[x + 0.85, cy0, 0.4], [x + 0.75, cy0, 0.9]], [[x + 0.75, cy0, 0.9], [x + 1.35, cy0, 0.85]], [[x + 1.35, cy0, 0.85], [x + 1.45, cy0, 0.35]], [[x + 0.35, cy0, 0.35], [x + 0.75, cy0, 0.9]]].some(([a, b]) => inCap(p, a, b, 0.025, 0.025))) return col;
  if (inCap(p, [x + 1.32, cy0 - 0.25, 1.0], [x + 1.32, cy0 + 0.25, 1.0], 0.02, 0.02) || inEll(p, [x + 0.72, cy0, 0.94], 0.12, 0.05, 0.03)) return '#1c1f22'; return null; }, {step:0.02});
const dogFn = (col, run) => (x, y, z) => { const p = [x, y, z]; if (inEll(p, [0.95, 0.2, 0.5], 0.13, 0.09, 0.1) || inEll(p, [1.06, 0.2, 0.47], 0.07, 0.05, 0.05)) return x > 1.1 ? '#1c1f22' : col;
  for (const [lx, sw] of [[0.35, run ? -0.15 : 0], [0.7, run ? 0.15 : 0]]) for (const ly of [0.13, 0.27]) if (inCap(p, [lx, ly, 0.35], [lx + sw, ly, 0], 0.035, 0.03)) return col;
  if (inCap(p, [0.25, 0.2, 0.4], [0.05, 0.2, run ? 0.4 : 0.55], 0.025, 0.02)) return col; return inEll(p, [0.55, 0.2, 0.38], 0.35, 0.12, 0.12) ? col : null; };
const dogAt = (H, x, y, col, run) => { const f = dogFn(col, run); H.SD(x, x + 1.3, y, y + 0.4, 0, 0.65, (px, py, pz) => f(px - x, py - y, pz), {step:0.015}); };

// everyday
one('Hiker', {skin:'#e8c09c', top:'#c9622a', bot:'#5a4632', shoe:'#3a2b20', boots:1, hair:'#7a4a2a', hat:'cap', hatc:'#3f7a4a', pack:'#2c5f93', item:'pole'}, {legs:['fwd', 'back'], armR:'swingF', armL:'swingB'}, 'Backpack and walking pole, on the yellow-signposted paths.');
one('Hiker (woman)', {skin:'#f2d2b6', top:'#2c8a8a', bot:'#3a4a63', shoe:'#3a2b20', boots:1, hair:'#c9a24a', longHair:1, pack:'#c63a2c', item:'pole'}, {legs:['back', 'fwd'], armR:'swingB', armL:'swingF'}, '');
life('Cyclist', 2.5, 1.5, (H) => { bikeAt(H, 0.3, 0.6, '#2c5f93'); figure3(H, {skin:'#e8c09c', top:'#e8b730', bot:'#2b2f36', shoe:'#1c1f22', hair:'#5a4632', hat:'cap', hatc:'#c63a2c'}, 0.05, -0.15, {legs:['fwd', 'back'], armR:'bars', armL:'bars'}, 0.15); }, 'On the valley road.');
life('Road cyclist', 2.5, 1.5, (H) => { bikeAt(H, 0.3, 0.6, '#c63a2c'); figure3(H, {skin:'#d9a882', top:'#c63a2c', bot:'#1c1f22', shorts:1, shoe:'#f4f2ec', hair:'#2b2522', hat:'cap', hatc:'#f4f2ec', stripe:'#f4f2ec'}, 0.05, -0.15, {legs:['back', 'fwd'], armR:'bars', armL:'bars'}, 0.15); }, 'Lycra and a white helmet.');
one('Jogger', {skin:'#a8704a', top:'#3f7a4a', bot:'#1c1f22', shorts:1, shoe:'#f4f2ec', hair:'#1c1f22'}, POSE.run, '');
life('Dog walker', 3.5, 2.5, (H) => { figure3(H, {skin:'#f2d2b6', top:'#7a8f6e', bot:'#3a4a63', shoe:'#5a4632', hair:'#9a9590', bun:1, item:'leash'}, 0.3, 0.6, {legs:['fwd', 'back'], armR:'forward'}); dogAt(H, 1.5, 1.2, '#a0703a', false); }, 'With a dog on a red leash.');
life('Kids playing', 5, 4, (H) => { const kid = (top, hair, it) => ({skin:'#f2d2b6', top, bot:'#3a4a63', shoe:'#c63a2c', hair, small:1, pack:it ? null : '#e8b730', item:it});
  figure3(H, kid('#c63a2c', '#c9a24a', 'ball'), 0.5, 0.5, {armR:'up', legs:['runF', 'runB']}); figure3(H, kid('#2c5f93', '#3a2b20'), 2.2, 1.6, POSE.run); figure3(H, kid('#e8b730', '#7a4a2a'), 1.0, 2.4, {armR:'wave', armL:'wave'}); }, 'One with a ball, one running, one waving.', [0, 2]);
life('School children', 4, 3, (H) => { [['#3f7a4a', '#c63a2c'], ['#e8b730', '#2c5f93'], ['#b05a6a', '#3f7a4a']].forEach(([t, pk], i) => figure3(H, {skin:pick(rng(i + 40), SKIN), top:t, bot:'#3a4a63', shoe:'#2b2522', hair:pick(rng(i + 50), HAIR), longHair:i === 1, small:1, pack:pk}, 0.3 + i*1.0, 0.3 + (2 - i)*0.7, i % 2 ? POSE.walkA : POSE.walkB)); }, 'Bright backpacks, on the way to the school.', [0, 2]);
one('Angler', {skin:'#e8c09c', top:'#5a6a3a', bot:'#3a4a63', shoe:'#2f5f3a', boots:1, hair:'#9a9590', hat:'cap', hatc:'#5a6a3a', vest:'#6a7a4a', item:'rod'}, {armR:'forward', armL:'forward'}, 'By the stream; sees the contamination first.');
one('Postman', {skin:'#d9a882', top:'#2b2f36', bot:'#2b2f36', shoe:'#1c1f22', hair:'#3a2b20', hat:'cap', hatc:'#e8b730', stripe:'#e8b730', item:'parcel'}, {armR:'carry', armL:'carry', legs:['fwd', 'back']}, 'Yellow cap and stripe; letters and parcels.');
life('Woman with a pram', 3.5, 2.5, (H) => { figure3(H, {skin:'#f2d2b6', top:'#b05a6a', bot:'#3a4a63', shoe:'#5a4632', hair:'#7a4a2a', longHair:1}, 0.3, 0.5, {armR:'push', armL:'push', legs:['fwd', 'back']});
  H.SD(1.3, 2.4, 0.7, 1.5, 0, 1.15, (x, y, z) => { const p = [x, y, z]; for (const wx of [1.55, 2.2]) for (const wy of [0.78, 1.42]) if (Math.hypot(x - wx, z - 0.14) < 0.14 && Math.abs(y - wy) < 0.03) return '#1c1f22';
    if (inCap(p, [1.25, 1.1, 1.02], [1.5, 1.1, 0.72], 0.02, 0.02) || inCap(p, [1.25, 0.82, 1.02], [1.25, 1.38, 1.02], 0.02, 0.02)) return '#3a3f45'; if (rbx(1.45, 2.3, 0.8, 1.4, 0.3, 0.78, 0.15)(p)) return '#2c5f93'; if (inEll(p, [2.05, 1.1, 0.78], 0.3, 0.3, 0.28) && x > 1.9 && z > 0.6) return '#2a4a73'; return null; }, {step:0.02}); }, '');
life('Pensioners on a bench', 3, 3, (H) => { bench(H, 0.4, 0.6); figure3(H, {skin:'#e8c09c', top:'#8a6a4a', bot:'#3a4a63', shoe:'#3a2b20', hair:'#e6e2da', hat:'cap', hatc:'#5a4632', item:'cane'}, -0.05, 0.35, {sit:1, armR:'lap', armL:'lap'}); figure3(H, {skin:'#f2d2b6', top:'#7a8f6e', bot:'#4a4f55', shoe:'#5a4632', hair:'#d9d4c8', bun:1, skirt:1}, -0.05, 1.05, {sit:1, armR:'lap', armL:'lap'}); }, 'They watch the trucks go by.');

// village life
const band = (top, it, pose) => ({skin:'#e8c09c', top, bot:'#1f2a44', shoe:'#1c1f22', hair:'#5a4632', hat:'cap', hatc:top, stripe:'#e8b730', item:it});
life('Brass band (fanfare)', 6, 5, (H) => { [['trumpet', {armR:'mouth', armL:'mouth'}], ['trumpet', {armR:'mouth', armL:'mouth'}], ['tuba', {armR:'carry', armL:'carry'}], ['drum', {armR:'sticks', armL:'sticks'}], ['trumpet', {armR:'mouth', armL:'mouth'}]].forEach(([it, ps], i) => figure3(H, band('#7a2a2a', it), 0.4 + (i % 3)*1.4, 0.4 + Math.floor(i/3)*1.6 + (i % 3)*0.4, Object.assign({legs:i % 2 ? ['fwd', 'back'] : ['back', 'fwd']}, ps))); }, 'At the fête; plays at openings if the mood is good.', [0, 2]);
life('Churchgoers', 4, 3, (H) => { VILL.slice(0, 4).forEach((o, i) => figure3(H, Object.assign({}, o, {item:null}), 0.3 + i*0.9, 0.3 + (3 - i)*0.5, i % 2 ? POSE.walkA : POSE.walkB)); }, 'Sunday morning.', [0, 2]);
one('Priest', {skin:'#e8c09c', top:'#1c1f22', bot:'#1c1f22', shoe:'#1c1f22', hair:'#9a9590', robe:1, stripe:null, shirt:'#f4f2ec'}, {armR:'wave'}, 'Long black cassock. The church after the quake is his.');
life('Market stall with cheese seller', 5, 4, (H) => { H.B(0.5, 0.8, 0, 2.6, 1.2, 0.9, '#8a6a4a'); for (const [x, y] of [[0.8, 1.0], [1.4, 1.1], [2.0, 1.0], [2.6, 1.1]]) H.C(x, y + 0.2, 0.9, 0.22, 0.12, '#e8c860', {top:'#f0d880'});
  for (const x of [0.55, 3.0]) H.L([[x, 0.85, 0], [x, 0.85, 2.2]], '#5a4632', 0.8); H.B(0.4, 0.6, 2.1, 2.8, 1.6, [0.25, 0.25, 0.05, 0.05], '#c63a2c', {win:[['S', 0, 0, 2.8, 0.08, '#f4f2ec']]});
  figure3(H, {skin:'#d9a882', top:'#f4f2ec', bot:'#3a4a63', shoe:'#3a2b20', hair:'#5a4632', belly:1, vest:'#3a5f8a'}, -0.8, 0.9, {armR:'forward'}); figure3(H, VILL[5], 3.3, 1.2, {armR:'forward'}); }, 'Tête de Moine and the rest. Stands at the market square.', [0, 2]);
life('Café terrace', 6, 5, (H) => { for (const [x, y] of [[1.4, 1.2], [3.8, 2.6]]){ H.C(x, y, 0, 0.05, 0.72, '#3a3f45'); H.C(x, y, 0.72, 0.4, 0.04, '#e8e4da'); H.L([[x, y, 0.76], [x, y, 2.3]], '#9aa3ab', 0.6); H.Y(x - 0.8, y - 0.8, 2.25, 1.6, 1.6, 0.35, '#c63a2c'); }
  figure3(H, VILL[1], 0.2, 0.4, {sit:1, armR:'forward'}); figure3(H, VILL[6], 0.2, 1.5, {sit:1, armR:'lap'}); figure3(H, VILL[9], 2.6, 1.8, {sit:1, armR:'forward'}); figure3(H, {skin:'#e8c09c', top:'#f4f2ec', bot:'#1c1f22', shoe:'#1c1f22', hair:'#2b2522', shirt:'#1c1f22', item:'cup'}, 4.4, 0.6, {armR:'forward'}); }, 'The waiter brings coffee; gossip about the drilling.', [0, 2]);
life('Hay making', 7, 5, (H) => { for (const [x, y] of [[1, 3.3], [3.2, 3.6], [5.4, 3.2]]) H.SD(x, x + 1.4, y, y + 1.3, 0, 1.3, (px, py, pz) => Math.hypot(px - x - 0.7, pz - 0.62) < 0.62 && Math.abs(py - y - 0.65) < 0.6 ? (Math.abs(py - y - 0.65) > 0.56 ? '#e8d48a' : '#d9bf6a') : null, {step:0.03});
  figure3(H, {skin:'#d9a882', top:'#2c5f93', bot:'#2c5f93', shoe:'#2f5f3a', boots:1, hair:'#5a4632', hat:'cap', hatc:'#e8b730', item:'rake'}, 1.0, 0.8, {armR:'forward', armL:'forward', legs:['fwd', 'back']}); figure3(H, VILL[3], 4.0, 1.0, {armR:'carry', armL:'carry'}); }, 'Round bales in the fields in summer.', [0, 2]);

// work
one('Road worker', {skin:'#c98e66', top:'#e8742a', bot:'#3a4a63', shoe:'#3a2b20', boots:1, hair:'#2b2522', hat:'hard', hatc:'#e8b730', band:'#e8ece4', topBand:1.15, legBand:0.32, item:'shovel'}, {armR:'down', armL:'down'}, 'Builds the roads you order.');
one('Road worker with jackhammer', {skin:'#e8c09c', top:'#e8742a', bot:'#3a4a63', shoe:'#3a2b20', boots:1, hair:'#5a4632', hat:'hard', hatc:'#f4f4f2', band:'#e8ece4', topBand:1.15, item:'hammer'}, {armR:'lap', armL:'lap'}, '');
life('Surveyor with tripod', 3, 2.5, (H) => { figure3(H, {skin:'#f2d2b6', top:'#e8d23a', bot:'#3a4a63', shoe:'#3a2b20', boots:1, hair:'#9a4a2a', longHair:1, hat:'hard', hatc:'#f4f4f2', band:'#e8ece4', topBand:1.15}, 0.2, 0.5, {armR:'eye', armL:'eye'});
  H.SD(0.6, 1.8, 0.7, 1.8, 0, 1.75, (x, y, z) => { const p = [x, y, z], top = [1.1, 1.25, 1.5]; if (inEll(p, [1.1, 1.25, 1.6], 0.14, 0.07, 0.07)) return '#e8b730'; for (const [fx, fy] of [[0.75, 1.0], [1.45, 1.05], [1.1, 1.65]]) if (inCap(p, top, [fx, fy, 0], 0.02, 0.02)) return '#d9b23a'; return null; }, {step:0.02}); }, 'Pegs out pads and roads.');
life('Electrician on a pylon', 8, 8, (H) => { placeModel(H, 'High-voltage pylon', 0, 0); figure3(H, {skin:'#e8c09c', top:'#e8742a', bot:'#3a4a63', shoe:'#3a2b20', boots:1, hair:'#2b2522', hat:'hard', hatc:'#f4f4f2', belt:'#1c1f22'}, 3.2, 3.6, {armR:'up', armL:'up', legs:['fwd', 'back']}, 9.5); }, 'Hooks a new plant to the grid.', [0, 1], 6);
one('Delivery driver', {skin:'#a8704a', top:'#7a5a2a', bot:'#7a5a2a', shoe:'#1c1f22', hair:'#1c1f22', hat:'cap', hatc:'#e8b730', item:'parcel'}, {armR:'carry', armL:'carry', legs:['fwd', 'back']}, '');

// crisis and media
const fire = {skin:'#e8c09c', top:'#1f2a44', bot:'#1f2a44', shoe:'#1c1f22', boots:1, hair:'#2b2522', hat:'hard', hatc:'#e8d23a', band:'#e8ece4', topBand:1.15, legBand:0.32, armBand:1.25, hand:'#1c1f22'};
life('Firefighters with a hose', 5, 3, (H) => { figure3(H, Object.assign({}, fire, {item:'hose'}), 1.6, 0.6, {armR:'carry', armL:'carry'}); figure3(H, Object.assign({}, fire, {item:'hose'}), 0.4, 1.1, {armR:'carry', armL:'carry'}); for (let i = 0; i < 5; i++) H.S(3.4 + i*0.35, 0.9, 1.1 - i*0.15, 0.12 + i*0.04, 'rgba(160,200,230,.85)'); }, 'Called out for fires, barricades and quake ruins.', [0, 2]);
const para = {skin:'#f2d2b6', top:'#d9e23a', bot:'#1f2a44', shoe:'#1c1f22', hair:'#7a4a2a', longHair:1, band:'#c8322a', topBand:1.18};
life('Paramedics', 4, 3, (H) => { figure3(H, para, 0.3, 0.4, {armR:'carry', armL:'carry', legs:['fwd', 'back']}); figure3(H, Object.assign({}, para, {skin:'#c98e66', hair:'#2b2522', longHair:0}), 2.2, 0.4, {armR:'carry', armL:'carry', legs:['back', 'fwd']});
  H.B(0.9, 0.9, 0.85, 2.1, 0.6, 0.1, '#e8742a', {win:[['S', 0, 0, 2.1, 0.1, '#f4f2ec']]}); }, 'Carry a stretcher between them.', [0, 2]);
one('TV camera operator', {skin:'#d9a882', top:'#3a3f45', bot:'#3a4a63', shoe:'#3a2b20', hair:'#2b2522', beard:'#2b2522', item:'tvcam', pack:'#2b2f33'}, {armR:'ear', armL:'down'}, 'National TV comes when it gets ugly.');
one('Sound engineer with boom', {skin:'#f2d2b6', top:'#7a7468', bot:'#2b2f36', shoe:'#3a2b20', hair:'#c9a24a', longHair:1, item:'boom'}, {armR:'up'}, '');
const oui = (r, i) => Object.assign(villager(r, i), {item:'sign', signText:'OUI', signBoard:'#2c5f93', signInk:'#f4f2ec'});
life('Counter-protesters (OUI)', 5, 3, (H) => { for (let i = 0; i < 3; i++) figure3(H, oui(rng(300 + i*11), i), 0.3 + i*1.4, 0.4 + (2 - i)*0.5, i === 1 ? POSE.walkA : null); }, 'For the project: jobs, cheap heat. Fewer, but loud.', [0, 2]);
life('Drummers in the march', 5, 3, (H) => { for (let i = 0; i < 3; i++) figure3(H, Object.assign(protester(rng(700 + i*3), i), {item:'drum'}), 0.3 + i*1.4, 0.4 + (2 - i)*0.5, {armR:'sticks', armL:'sticks', legs:i % 2 ? ['fwd', 'back'] : ['back', 'fwd']}); }, '', [0, 2]);
one('Police negotiator', {skin:'#e8c09c', top:'#2a4fa0', bot:'#1f2a44', shoe:'#1c1f22', hair:'#9a9590', vest:'#e8d23a', item:'megaphone'}, {armR:'mouth'}, 'Talks first. Megaphone, yellow vest.');
veh('Ambulance', 5.6, 2.1, 2.7, c => [
  ...tyres([1.1, 4.4], 2.1, 0.42, 0.32),
  [rbx(2.4, 3.0, 0.75, 1.35, 2.48, 2.62, 0.04), '#3b7bf0'],
  [rbx(0.15, 5.45, 0.2, 1.9, 0.4, 2.5, 0.35), p => p[0] > 5.25 && p[2] > 1.4 && p[2] < 2.1 ? VG : p[0] > 4.0 && p[0] < 5.0 && p[2] > 1.45 && p[2] < 2.05 ? VG : p[0] > 5.3 && p[2] < 0.95 && Math.abs(p[1] - 1.05) > 0.5 ? LAMP :
    p[2] > 0.85 && p[2] < 1.15 ? ((Math.floor(p[0]*2.5) + (p[2] > 1.0 ? 1 : 0)) % 2 ? '#c8322a' : '#e8d23a') : '#f6f6f3']], 'Swiss style: white with a red and yellow chequered band.');

/* ---------------------------------------------------------------- animals: more of them, and in motion */
const cowM = (o) => (x, y, z) => { const p = [x, y, z], bz = 0.95, hd = o.graze ? [2.45, 0.5, 0.35] : [2.36, 0.5, 1.0], ph = o.step || 0;
  for (const [lx, sgn] of [[0.75, 1], [1.85, -1]]) for (const [ly, s2] of [[0.33, 1], [0.67, -1]]) { const sw = ph*0.18*sgn*s2; if (inCap(p, [lx, ly, 0.75], [lx + sw, ly, 0], 0.08, 0.065)) return z < 0.08 ? '#2b2522' : '#e2d8c8'; }
  if (inEll(p, hd, 0.27, 0.16, 0.17)) return x > hd[0] + 0.14 ? '#e8b8a0' : '#f2efe6';
  if (inCap(p, [1.95, 0.5, bz + 0.15], [hd[0] - 0.12, 0.5, hd[2] + 0.05], 0.18, 0.15)) return '#9a4a2a';
  if (inCap(p, [0.42, 0.5, bz + 0.2], [0.36 - (o.swish || 0)*0.2, 0.5 + (o.swish || 0)*0.2, bz - 0.35], 0.03, 0.03)) return '#9a4a2a';
  if (inEll(p, [1.3, 0.5, bz], 0.92, 0.34, 0.38) && z > 0) return cell(x + 0.2, y, z, 0.4) > 0.45 ? '#9a4a2a' : '#f2efe6'; return null; };
const horseFn = (o) => (x, y, z) => { const p = [x, y, z], g = o.gallop, bay = '#7a4a2a', blk = '#1f1a17', hd = o.graze ? [2.55, 0.4, 0.45] : [2.55, 0.4, 1.85];
  const legs = g ? [[0.6, -0.35], [0.6, -0.15], [1.75, 0.35], [1.75, 0.2]] : [[0.6, (o.step || 0)*0.15], [0.6, -(o.step || 0)*0.15], [1.75, -(o.step || 0)*0.15], [1.75, (o.step || 0)*0.15]];
  legs.forEach(([lx, sw], i) => {}); for (let i = 0; i < 4; i++){ const [lx, sw] = legs[i], ly = i % 2 ? 0.52 : 0.28; if (inCap(p, [lx, ly, 1.1], [lx + sw, ly, 0.05], 0.07, 0.05)) return z < 0.3 ? blk : bay; }
  if (inEll(p, hd, 0.32, 0.12, 0.14)) return x > hd[0] + 0.15 && Math.abs(y - 0.4) < 0.03 ? '#f4f2ec' : bay;
  if (inCap(p, [2.0, 0.4, 1.35], [hd[0] - 0.15, 0.4, hd[2] + 0.05], 0.2, 0.13)) return Math.abs(y - 0.4) < 0.05 && z > 1.4 ? blk : bay;
  if (inCap(p, [0.2, 0.4, 1.35], [0.05, 0.4, 0.75], 0.07, 0.05)) return blk;
  return inEll(p, [1.2, 0.4, 1.3], 1.0, 0.32, 0.36) ? bay : null; };
const sheepFn = (o) => (x, y, z) => { const p = [x, y, z], hd = o.graze ? [1.12, 0.3, 0.2] : [1.08, 0.3, 0.68]; if (inEll(p, hd, 0.13, 0.09, 0.12)) return '#2b2a28';
  for (const lx of [0.42, 0.88]) for (const ly of [0.2, 0.4]) if (inCap(p, [lx, ly, 0.45], [lx + (o.step || 0)*(ly > 0.3 ? 0.1 : -0.1), ly, 0], 0.03, 0.03)) return '#2b2a28';
  return inEll(p, [0.65, 0.3, 0.6], 0.45, 0.27, 0.27) ? (cell(x, y, z, 0.1) > 0.6 ? '#f6f3ea' : '#e2ddd0') : null; };
const chickFn = (o, col) => (x, y, z) => { const p = [x, y, z], hd = o.peck ? [0.38, 0.15, 0.12] : [0.33, 0.15, 0.3]; if (inEll(p, [hd[0] + 0.01, 0.15, hd[2] + 0.06], 0.04, 0.02, 0.04)) return '#c8322a'; if (inEll(p, [hd[0] + 0.07, 0.15, hd[2]], 0.035, 0.02, 0.02)) return '#e8b730';
  if (z < 0.12 && Math.abs(y - 0.15) < 0.06 && Math.abs(x - 0.22) < 0.02) return '#e8b730'; return inEll(p, [0.2, 0.15, 0.22], 0.15, 0.09, 0.1) || inEll(p, hd, 0.07, 0.06, 0.07) ? col : null; };
const deerFn = (o) => (x, y, z) => { const p = [x, y, z], br = '#9a6a3a', hd = [1.75, 0.3, o.graze ? 0.35 : 1.35]; if (!o.graze) for (const s of [-1, 1]) if (inCap(p, [1.7, 0.3 + s*0.05, 1.45], [1.6, 0.3 + s*0.18, 1.75], 0.015, 0.015) || inCap(p, [1.62, 0.3 + s*0.15, 1.65], [1.75, 0.3 + s*0.2, 1.72], 0.012, 0.012)) return '#d9c8a8';
  for (const [lx, sw] of [[0.45, o.leap ? -0.3 : 0], [1.3, o.leap ? 0.3 : 0]]) for (const ly of [0.2, 0.4]) if (inCap(p, [lx, ly, 0.75], [lx + sw, ly, o.leap ? 0.25 : 0], 0.035, 0.03)) return br;
  if (inEll(p, hd, 0.17, 0.08, 0.09)) return br; if (inCap(p, [1.35, 0.3, 0.95], [hd[0] - 0.08, 0.3, hd[2]], 0.09, 0.06)) return br;
  if (inEll(p, [0.85, 0.3, 0.9], 0.6, 0.2, 0.22)) return x < 0.35 ? '#f4f2ec' : br; return null; };
const crowFn = (up) => (x, y, z) => { const p = [x, y, z]; if (inEll(p, [0.3, 0.3, 0.3], 0.14, 0.05, 0.05) || inEll(p, [0.45, 0.3, 0.33], 0.05, 0.045, 0.045)) return '#1c1f22';
  if (Math.abs(x - 0.3) < 0.08 && Math.abs(y - 0.3) < 0.32 && Math.abs(z - 0.3 - Math.abs(y - 0.3)*(up ? 0.8 : -0.5)) < 0.02) return '#1c1f22'; return null; };
const frames = (n, W, D, H, fns, labels, note, step) => { def('a', n, W*fns.length + 0.5, D + 0.5, (G) => fns.forEach((f, i) => { const dx = 0.3 + i*W, dy = 0.3; G.SD(dx, dx + W, dy, dy + D, 0, H, (x, y, z) => f(x - dx, y - dy, z), {step:step || 0.015}); }), note); M[M.length - 1].views = [0]; };
frames('Cow in motion: walk, walk, graze, tail', 3, 1.0, 1.45, [cowM({step:1}), cowM({step:-1}), cowM({graze:1}), cowM({swish:1})], null, 'Cows graze and wander slowly in their pasture.');
frames('Sheep in motion: walk, walk, graze', 1.4, 0.6, 0.9, [sheepFn({step:1}), sheepFn({step:-1}), sheepFn({graze:1})], null, '');
frames('Chickens: walk, peck', 0.6, 0.3, 0.42, [chickFn({}, '#f4f2ec'), chickFn({peck:1}, '#f4f2ec'), chickFn({}, '#a0603a'), chickFn({peck:1}, '#a0603a')], null, 'They peck around the farmyard.');
frames('Franches-Montagnes horse: stand, walk, gallop, graze', 3.1, 0.8, 2.15, [horseFn({}), horseFn({step:1}), horseFn({gallop:1}), horseFn({graze:1})], null, 'The Jura\'s own breed: bay, black mane and legs, white blaze.', 0.02);
frames('Dog: stand, run', 1.4, 0.4, 0.65, [dogFn('#a0703a'), dogFn('#a0703a', 1), dogFn('#2b2522'), dogFn('#2b2522', 1)], null, '');
frames('Cat: sit, walk', 0.7, 0.3, 0.45, [(x, y, z) => inEll([x, y, z], [0.3, 0.15, 0.15], 0.12, 0.09, 0.15) || inEll([x, y, z], [0.36, 0.15, 0.33], 0.08, 0.07, 0.07) || inCap([x, y, z], [0.18, 0.15, 0.05], [0.05, 0.15, 0.2], 0.02, 0.02) ? (cell(x, y, z, 0.06) > 0.5 ? '#8a8a84' : '#6a6a64') : null,
  (x, y, z) => inEll([x, y, z], [0.3, 0.15, 0.2], 0.2, 0.07, 0.07) || inEll([x, y, z], [0.52, 0.15, 0.26], 0.07, 0.06, 0.06) || inCap([x, y, z], [0.12, 0.15, 0.22], [0.02, 0.15, 0.4], 0.02, 0.02) || [0.18, 0.42].some(lx => inCap([x, y, z], [lx, 0.12, 0.18], [lx, 0.12, 0], 0.02, 0.02) || inCap([x, y, z], [lx, 0.18, 0.18], [lx, 0.18, 0], 0.02, 0.02)) ? (cell(x, y, z, 0.06) > 0.5 ? '#8a8a84' : '#6a6a64') : null], null, '');
frames('Deer at the forest edge: stand, graze, leap', 2.0, 0.6, 1.8, [deerFn({}), deerFn({graze:1}), deerFn({leap:1})], null, 'Leave when the rigs come.');
frames('Crows: flying, flying, on the ground', 0.7, 0.6, 0.6, [crowFn(true), crowFn(false), (x, y, z) => inEll([x, y, z], [0.3, 0.3, 0.15], 0.14, 0.06, 0.08) || inEll([x, y, z], [0.45, 0.3, 0.22], 0.05, 0.045, 0.045) ? '#1c1f22' : null], null, 'A flock lifts off when a survey truck shakes the ground.');
def('a', 'Stork on a chimney', 3, 3, ({B, SD}) => { B(0, 0, 0, 3, 3, 1.6, '#a8473a', {h:[0.4, 1.6, 1.6, 0.4]}); B(1.25, 1.25, 1.3, 0.5, 0.5, 0.9, '#8d6e5a'); SD(0.5, 2.5, 0.5, 2.5, 2.2, 3.4, (x, y, z) => { const p = [x, y, z]; if (Math.hypot(x - 1.5, y - 1.5) < 0.6 && z < 2.45) return (cell(x, y, z, 0.08) > 0.5 ? '#8a6a4a' : '#6a4a32');
  for (const ly of [1.45, 1.55]) if (inCap(p, [1.5, ly, 2.45], [1.5, ly, 2.75], 0.015, 0.015)) return '#c8322a'; if (inCap(p, [1.7, 1.5, 3.2], [2.0, 1.5, 3.1], 0.015, 0.012)) return '#c8322a';
  if (inEll(p, [1.65, 1.5, 3.2], 0.06, 0.05, 0.06) || inCap(p, [1.55, 1.5, 2.95], [1.65, 1.5, 3.18], 0.04, 0.03)) return '#f4f2ec'; if (inEll(p, [1.45, 1.5, 2.9], 0.22, 0.1, 0.12)) return z < 2.88 || x < 1.3 ? '#1c1f22' : '#f4f2ec'; return null; }, {step:0.015}); }, 'Storks nest on village chimneys in spring.');

/* ---------------------------------------------------------------- trees in the wind and in snow */
const sway = (f, H, a) => (x, y, z, s) => f(x - a*(z/H)**2, y, z, s);
def('n', 'Trees in the wind: beech and spruce (left, still, right)', 36, 36, (G) => { [[beech, 7.5], [spruce, 10]].forEach(([f, h], r) => [-0.7, 0, 0.7].forEach((a, i) => { const k = i + r*3, dx = 3 + k*5.5, dy = 3 + (5 - k)*5.5; G.SD(dx - 3, dx + 3, dy - 3, dy + 3, 0, h, at(sway(f, h, a), dx, dy), {step:0.06}); })); }, 'Three frames each; leaves and tops move.');
M[M.length - 1].views = [0]; M[M.length - 1].s = 5;
const SNOW = '#f2f5f8', snowy = (f, q) => (x, y, z, s) => { const c = f(x, y, z, s); if (!c) return null; if (c !== '#6a4a32' && c !== '#5a3e2a' && !f(x, y, z + 0.3, s) && cell(x, y, z, 0.3) > (q || 0.2)) return SNOW; return c; };
const bareBeech = (x, y, z, s) => { s = s || 1; const p = [x, y, z]; if (cyZ(0, 0, 0.22*s, 0, 3.2*s)(p)) return '#5a4a3a';
  for (const [a, h, l] of [[0.4, 3, 2.2], [2.3, 3.4, 2.0], [4.1, 3.2, 2.1], [1.2, 4.6, 1.6], [3.3, 4.8, 1.5], [5.3, 4.4, 1.7], [0, 5.5, 1.0]]) if (inCap(p, [0, 0, h*s], [Math.cos(a)*l*s, Math.sin(a)*l*s, (h + 1.8)*s], 0.07*s, 0.035*s)) return '#5a4a3a'; return null; };
const winterGround = (F, W, D) => F([[0, 0], [W, 0], [W, D], [0, D]], '#e8edf0');
def('n', 'Spruce in snow', 4, 4, ({F, SD}) => { winterGround(F, 4, 4); SD(0, 4, 0, 4, 0, 10.2, at(snowy(spruce), 2, 2), {step:0.05}); }, '');
def('n', 'Bare beech in snow', 6, 6, ({F, SD}) => { winterGround(F, 6, 6); SD(0, 6, 0, 6, 0, 7.5, at(snowy(bareBeech, 0.6), 3, 3), {step:0.04}); }, 'Broadleaf trees lose their leaves in winter.');
def('n', 'Bare fruit tree in snow', 4, 4, ({F, SD}) => { winterGround(F, 4, 4); SD(0, 4, 0, 4, 0, 4, at(snowy((x, y, z) => bareBeech(x, y, z, 0.6), 0.6), 2, 2), {step:0.04}); }, '');
def('n', 'Bush in snow', 2.6, 2.6, ({F, SD}) => { winterGround(F, 2.6, 2.6); SD(0, 2.6, 0, 2.6, 0, 1.5, (x, y, z) => inEll([x, y, z], [1.3, 1.3, 0.55], 1.15, 1.1, 0.8) && z > 0 ? (z > 0.75 && cell(x, y, z, 0.3) > 0.25 ? SNOW : leafy('#4a6a3a', x, y, z)) : null, {step:0.05}); }, '');
def('n', 'Forest patch in snow', 16, 14, ({F, SD}) => { winterGround(F, 16, 14); SD(0, 16, 0, 14, 0, 11, firstOf(at(snowy(spruce), 3, 3, 0.9), at(snowy(spruce), 8, 2.5, 1.05), at(snowy(bareBeech, 0.6), 12.5, 4, 0.85), at(snowy(spruce), 4, 9, 1.1), at(snowy(spruce), 9, 8, 0.95), at(snowy(bareBeech, 0.6), 13, 10.5, 0.9), at(snowy(spruce), 6, 12.5, 0.8)), {step:0.08}); }, 'Winter on the Jura ridges.');

/* ---------------------------------------------------------------- logos: drawn small, then scaled up with hard pixels */
function pixelArt(w, h, scale, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, c);
  const d = g.getImageData(0, 0, w, h), a = d.data; for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 100 ? 255 : 0; g.putImageData(d, 0, 0);
  const o = document.createElement('canvas'); o.width = w*scale; o.height = h*scale; const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, w*scale, h*scale); return o; }
// a pixel glow: blur the shape, then keep two hard steps of it
function glowLayer(w, h, draw, inner, outer){ const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.shadowColor = '#000'; g.shadowBlur = 6; draw(g);
  const d = g.getImageData(0, 0, w, h), a = d.data, ci = hex(inner), co = hex(outer); for (let i = 0; i < a.length; i += 4){ const v = a[i + 3]; const col = v > 150 ? ci : co; if (v > 25){ a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2]; a[i + 3] = 255; } else a[i + 3] = 0; }
  g.putImageData(d, 0, 0); return c; }
const LOGO_FONT = 'bold {s}px "Silkscreen", monospace';
const fireText = (g, txt, x, y, size, opts) => { opts = opts || {}; g.font = LOGO_FONT.replace('{s}', size); g.textAlign = opts.align || 'center'; g.textBaseline = 'alphabetic';
  const gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, '#ffe066'); gr.addColorStop(0.5, '#ff8a1a'); gr.addColorStop(1, '#d81e12');
  g.lineJoin = 'round'; g.strokeStyle = '#1a0e0a'; g.lineWidth = Math.max(2, size/4); g.strokeText(txt, x, y); g.fillStyle = gr; g.fillText(txt, x, y); };
const textW = (t, size, bold) => { const g = document.createElement('canvas').getContext('2d'); g.font = bold === false ? size + 'px "Silkscreen", monospace' : LOGO_FONT.replace('{s}', size); return Math.ceil(g.measureText(t).width); };
const LOGOS = {
  // the game wordmark: pixel letters with a stepped dark-red extrusion, a fiery face and a red-orange glow
  word(scale, stacked){ const tw = textW('JURAFRACKERS', 22), fw = textW('FRACKERS', 22), lines = stacked ? [['JURA', 22], ['FRACKERS', 22], ['2.0', 14]] : [['JURAFRACKERS', 22], ['2.0', 14]], W = stacked ? fw + 20 : tw + textW('2.0', 14) + 22, Hh = stacked ? 92 : 40;
    return pixelArt(W, Hh, scale || 3, (g) => { const place = stacked ? [[W/2, 28], [W/2, 56], [W/2, 80]] : [[8, 30], [tw + 14, 30]], align = stacked ? 'center' : 'left';
      g.drawImage(glowLayer(W, Hh, (q) => { q.fillStyle = '#000'; q.textAlign = align; lines.forEach(([t, s], i) => { q.font = LOGO_FONT.replace('{s}', s); q.fillText(t, place[i][0] + 2, place[i][1] + 2); }); }, '#ff7a1a', '#b81e14'), 0, 0);
      lines.forEach(([t, s], i) => { const [x, y] = place[i]; g.font = LOGO_FONT.replace('{s}', s); g.textAlign = align;
        for (let d = 3; d >= 1; d--){ g.fillStyle = d === 1 ? '#7a140c' : '#4a0c08'; g.fillText(t, x + d, y + d); }
        const gr = g.createLinearGradient(0, y - s*0.8, 0, y); gr.addColorStop(0, '#ffe066'); gr.addColorStop(0.45, '#ff9a1a'); gr.addColorStop(1, '#e0281a'); g.fillStyle = gr; g.fillText(t, x, y); });
}); },
  game(scale){ return LOGOS.word(scale, true); },
  // the association, in its own green: a warm water drop with heat waves, the name in green and grey
  association(scale){ return pixelArt(44 + Math.max(textW('GÉOTHERMIE', 16), textW('HELVETICA ASSOCIATION', 8)), 44, scale || 3, (g) => { const dx = 6, dy = 4;
    g.fillStyle = '#3d6b45'; g.beginPath(); g.moveTo(dx + 14, dy); g.bezierCurveTo(dx + 4, dy + 16, dx, dy + 22, dx + 4, dy + 30); g.bezierCurveTo(dx + 8, dy + 38, dx + 20, dy + 38, dx + 24, dy + 30); g.bezierCurveTo(dx + 28, dy + 22, dx + 24, dy + 16, dx + 14, dy); g.fill();
    g.strokeStyle = '#f0c040'; g.lineWidth = 2; for (const yy of [dy + 20, dy + 26, dy + 32]){ g.beginPath(); g.moveTo(dx + 6, yy); g.bezierCurveTo(dx + 10, yy - 3, dx + 14, yy + 3, dx + 22, yy - 1); g.stroke(); }
    g.textAlign = 'left'; g.font = LOGO_FONT.replace('{s}', 16); g.fillStyle = '#2f5a3a'; g.fillText('GÉOTHERMIE', 38, 22); g.font = LOGO_FONT.replace('{s}', 8); g.fillStyle = '#7a7f78'; g.fillText('HELVETICA ASSOCIATION', 39, 36); }); },
  // the company, in its blue and orange: a drill going down through three rock layers, the name in one line
  company(scale, jura){ return pixelArt(64 + textW('ÉNERGIE', 16) + textW('GÉO', 16), 44, scale || 3, (g) => { const x0 = 6, y0 = 6;
    [['#e8b730', 0], ['#e07a2c', 10], ['#a8473a', 20]].forEach(([c, o]) => { g.fillStyle = c; g.fillRect(x0, y0 + o, 30, 8); });
    g.fillStyle = '#2c5f93'; g.fillRect(x0 + 13, y0 - 4, 4, 30); g.beginPath(); g.moveTo(x0 + 10, y0 + 26); g.lineTo(x0 + 20, y0 + 26); g.lineTo(x0 + 15, y0 + 32); g.fill();
    g.textAlign = 'left'; g.font = LOGO_FONT.replace('{s}', 16); g.fillStyle = '#2c5f93'; g.fillText('ÉNERGIE', 44, 22); const w = g.measureText('ÉNERGIE').width; g.fillStyle = '#e07a2c'; g.fillRect(46 + w, 15, 5, 4); g.fillStyle = '#2c5f93'; g.fillText('GÉO', 54 + w, 22);
    g.font = LOGO_FONT.replace('{s}', 8); g.fillStyle = jura ? '#e07a2c' : '#6b7178'; g.fillText(jura ? 'JURA' : 'SWITZERLAND SA', 45, 36); }); }
};

function outline(c, col){ const g = c.getContext('2d'), W = c.width, Hh = c.height, d = g.getImageData(0, 0, W, Hh), a = d.data, o = new Uint8Array(W*Hh), rgb = hex(col || '#2a2d33');
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++){ const i = (y*W + x)*4; if (a[i + 3]) continue; if ((x > 0 && a[i - 1]) || (x < W - 1 && a[i + 7]) || (y > 0 && a[i - W*4 + 3]) || (y < Hh - 1 && a[i + W*4 + 3])) o[y*W + x] = 1; }
  for (let j = 0; j < o.length; j++) if (o[j]){ a[j*4] = rgb[0]; a[j*4 + 1] = rgb[1]; a[j*4 + 2] = rgb[2]; a[j*4 + 3] = 255; } g.putImageData(d, 0, 0); }
// composing scenes from the locked assets: a kit of the building blocks used above
const KIT = {M, place:placeModel, figure:figure3, turned, PROT, VILL, BLOC, GOON, RIOT, POSE, cowM, sheepFn, chickFn, horseFn, dogAt, bikeAt, bench, barricade, beech, spruce, fruitTree, bareBeech, snowy, sway, at, firstOf, flame, grass, f35At, rng, pick, hsh, cell, leafy};
const compose = (W, D, fn) => ({cat:'s', n:'scene', W, D, parts:build(H => fn(H, KIT))});
window.ART = {models:M, draw, outline, PAL, logos:LOGOS, compose};
})();
