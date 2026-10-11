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
    X:(pts, z, h, c, o) => push(Object.assign({t:'prism', pts, z, h, c}, o || {})),                  // extruded outline: wings, rounded bodies
    O:(cx, cy, z, rx, ry, h, c, o) => { const pts = []; for (let i = 0; i < 8; i++){ const a = (i + 0.5)/8*Math.PI*2; pts.push([cx + Math.cos(a)*rx, cy + Math.sin(a)*ry]); } return push(Object.assign({t:'prism', pts, z, h, c}, o || {})); },   // octagon: round things
    S:(x, y, z, r, c) => push({t:'puff', x, y, z, r, c:c || 'rgba(120,120,120,.55)'}),               // smoke puff
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
  // anything standing on top of a block is drawn after the ground-level parts
  for (const p of parts){ if (p.z === undefined || p.z <= 0 || p.t === 'ln' || p.t === 'txt' || p.t === 'puff') continue; const pc = p.pts ? [p.pts.reduce((a, q) => a + q[0], 0)/p.pts.length, p.pts.reduce((a, q) => a + q[1], 0)/p.pts.length] : null;
    const cx = p.kx ?? (pc ? pc[0] : p.t === 'cyl' ? p.x : p.x + (p.w || 0)/2), cy = p.ky ?? (pc ? pc[1] : p.t === 'cyl' ? p.y : p.y + (p.d || 0)/2);
    for (const q of parts){ if (q === p || (q.t !== 'blk' && q.t !== 'prism')) continue; const top = q.z + (q.t === 'prism' ? q.h : Math.max(...q.h)); if (q.t === 'prism'){ const xs = q.pts.map(v => v[0]), ys = q.pts.map(v => v[1]); if (Math.abs(top - p.z) < 0.2 && cx >= Math.min(...xs) && cx <= Math.max(...xs) && cy >= Math.min(...ys) && cy <= Math.max(...ys)){ p.up = (q.up || 0) + 1; break; } continue; } if (Math.abs(top - p.z) < 0.35 && cx >= q.x - 0.01 && cx <= q.x + q.w + 0.01 && cy >= q.y - 0.01 && cy <= q.y + q.d + 0.01){ p.up = (q.up || 0) + 1; break; } } }
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
      items.push({k:kc[0] + kc[1] + (p.up || 0)*1000 + (p.roof ? 0.01 : 0) + (p.k || 0) + ((x0 + x1)/2 + (y0 + y1)/2)*0.001, i, f(){
        const z = p.z, c = p.c, line = p.noline || model.cat === 'p' ? null : 'rgba(20,24,28,.38)';
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
        poly([P(x0, y0, z + h00), P(x1, y0, z + h10), P(x1, y1, z + h11), P(x0, y1, z + h01)], top, line);
        if (p.roof){ const cr = [[x0, y0, h00], [x1, y0, h10], [x1, y1, h11], [x0, y1, h01]]; for (let e = 0; e < 4; e++) if (cr[e][2] < 1e-6 && cr[(e + 1) % 4][2] < 1e-6){ const a0 = cr[e], a1 = cr[(e + 1) % 4], b1 = cr[(e + 2) % 4], b0 = cr[(e + 3) % 4], nL = Math.max(2, Math.round(Math.hypot(b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2])/0.55));
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
      const q = rp(p.x, p.y); items.push({k:q[0] + q[1] + (p.up || 0)*1000 + (p.k || 0), i, f(){
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
      items.push({k:cx + cy + (p.up || 0)*1000 + (p.k || 0), i, f(){ const z = p.z, zt = p.z + p.h, ln = p.noline || model.cat === 'p' ? null : 'rgba(20,24,28,.38)', sides = [];
        for (let j = 0; j < n; j++){ const a = pts[j], b = pts[(j + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], nx = sg*dy, ny = -sg*dx; if (nx + ny <= 1e-9) continue; const L2 = Math.hypot(nx, ny), f = 0.74 + 0.16*(ny/L2 + 1 - nx/L2)/2; sides.push({a, b, f, d:a[0] + a[1] + b[0] + b[1]}); }
        if (p.h > 0) sides.sort((u, v) => u.d - v.d).forEach(sd => poly([P(sd.a[0], sd.a[1], z), P(sd.b[0], sd.b[1], z), P(sd.b[0], sd.b[1], zt), P(sd.a[0], sd.a[1], zt)], sh(p.side || p.c, sd.f), ln));
        poly(pts.map(q => P(q[0], q[1], zt)), p.top || sh(p.c, 1.1), ln); }});
    } else if (p.t === 'puff'){
      const q = rp(p.x, p.y); items.push({k:9000 + p.z, i, f(){ const c0 = P(q[0], q[1], p.z); g.beginPath(); g.arc(c0[0], c0[1], p.r*S, 0, Math.PI*2); g.fillStyle = p.c; g.fill(); }});
    } else if (p.t === 'pyr'){
      const cs = [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.d], [p.x, p.y + p.d]].map(q => rp(q[0], q[1])), ap = rp(p.x + p.w/2, p.y + p.d/2);
      const xs = cs.map(q => q[0]), ys = cs.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), A = P(ap[0], ap[1], p.z + p.h);
      items.push({k:ap[0] + ap[1] + (p.up || 0)*1000 + (p.k || 0), i, f(){ const ln = 'rgba(20,24,28,.38)';
        poly([P(x0, y0, p.z), P(x1, y0, p.z), A], sh(p.c, 0.8), ln); poly([P(x0, y0, p.z), P(x0, y1, p.z), A], sh(p.c, 0.95), ln);
        poly([P(x0, y1, p.z), P(x1, y1, p.z), A], sh(p.c, 1.08), ln); poly([P(x1, y0, p.z), P(x1, y1, p.z), A], sh(p.c, 0.78), ln); }});
    } else if (p.t === 'whl'){
      const q = rp(p.x, p.y), alongX = rot % 2 === 0, cl = rp(p.x, D/2), near = q[0] + q[1] > cl[0] + cl[1];   // disk plane: x–z before rotation, y–z after an odd turn
      items.push({k:(near ? 5000 : -5000) + q[0] + q[1], i, f(){ const ring = (rr, dy, col) => { g.beginPath(); for (let t = 0; t <= 24; t++){ const a = t/24*Math.PI*2, cx = Math.cos(a)*rr, cz = Math.sin(a)*rr + p.r; const s2 = alongX ? P(q[0] + cx, q[1] + dy, cz) : P(q[0] + dy, q[1] + cx, cz); t ? g.lineTo(s2[0], s2[1]) : g.moveTo(s2[0], s2[1]); } g.closePath(); g.fillStyle = col; g.fill(); };
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
def('b', 'Maison de la géothermie', 16, 13, ({B, F, L, row}, c) => { F([[0, 0], [16, 0], [16, 13], [0, 13]], '#a7b98b'); F([[1.5, 9.5], [14.5, 9.5], [14.5, 12.5], [1.5, 12.5]], '#b58a5a');
  const glass = '#bfe0ee', mull = (f, n, len) => row(f, 0, len, len/n, 0, 0.12, 3.4, '#4a5560');
  B(2.5, 2, 0.15, 11, 7, 3.4, glass, {top:'#e9ecef', win:[...mull('S', 8, 11), ...mull('E', 5, 7), ...mull('N', 8, 11), ...mull('W', 5, 7), ['S', 4.6, 0, 1.8, 2.6, '#7fb0c8']]});
  B(1.5, 1.2, 0, 13, 8.6, 0.15, '#d8d4ca'); B(1.2, 0.9, 3.55, 13.6, 9.2, 0.45, '#f4f2ec', {win:[['S', 2.6, 0.08, 8.4, 0.3, '#f4f2ec', 'MAISON DE LA GÉOTHERMIE', '#3d6b45'], ['E', 1.5, 0.08, 6, 0.3, '#f4f2ec', 'GÉOTHERMIE-HELVETICA', '#3d6b45']]});
  for (const [x, y] of [[1.6, 1.3], [14.4, 1.3], [1.6, 9.7], [14.4, 9.7]]) L([[x, y, 0], [x, y, 3.55]], '#9aa3ab', 0.8);
  L([[13.8, 11.6, 0], [13.8, 11.6, 5.2]], '#c9ccd0', 0.8); B(13.82, 11.5, 4.1, 0.06, 1.4, 1, '#3d6b45', {noline:1}); }, 'The association on campus: a glass pavilion with a thin roof, a timber deck, courses inside.');
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
  R(2, 3, 4, 14, 9, 6.5, '#6e4b38', 'x', '#a07a55', 1.4); C(19.5, 5, 0, 1.8, 9, '#cfd3d6', {top:'#9aa3ab'}); B(17.5, 13, 0, 4, 3, 1, '#5a4632', {h:[1, 1.4, 0.8, 0.6]});
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
  B(13, 10.5, 0, 3.6, 2, 1.8, '#f4f2ec', {bv:0.3, win:[['S', 0.3, 0.6, 3, 0.5, '#f4f2ec', 'FEUILLE', '#1c2225']]}); }, 'The old printing house: red brick, a sawtooth roof over the presses, the delivery van outside.');
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
def('v', 'Company car (old 911)', 4.3, 1.8, ({B, X, W}, c) => { const ag = '#d9dde1', ch = '#f6f7f8'; wheels(W, [0.95, 3.35], 1.8, 0.36);
  B(0.1, 0.18, 0.28, 4.1, 1.44, 0.34, ag, {bv:0.14, win:[['W', 0.2, 0.12, 0.3, 0.14, '#e8473a'], ['W', 1.0, 0.12, 0.3, 0.14, '#e8473a']]});
  for (const y of [0.1, 1.22]){ B(3.05, y, 0.58, 1.05, 0.48, 0.22, ag, {bv:0.12, win:[['E', 0.1, 0.03, 0.28, 0.17, '#fff4b8']]}); B(0.35, y, 0.58, 1.25, 0.48, 0.26, ag, {bv:0.12}); }
  B(3.05, 0.55, 0.58, 1.1, 0.7, [0.16, 0.02, 0.02, 0.16], ag);
  B(1.35, 0.3, 0.62, 1.25, 1.2, 0.52, ag, {bv:0.18, win:[['S', 0.12, 0.08, 1, 0.3, GL], ['N', 0.12, 0.08, 1, 0.3, GL]]});
  B(2.6, 0.3, 0.62, 0.5, 1.2, [0.52, 0.03, 0.03, 0.52], GL); B(0.45, 0.3, 0.62, 0.9, 1.2, [0.03, 0.52, 0.52, 0.03], ag);
  B(4.18, 0.25, 0.3, 0.07, 1.3, 0.1, ch); B(0.03, 0.25, 0.3, 0.07, 1.3, 0.1, ch); }, 'Silver, round lamps, the sloping back. Never named. Drives the CEO to debates, interviews and crises.');
def('v', 'Geologist\'s pickup', 5.4, 1.9, ({B, W, L}, c) => { const wh = '#f4f3ee', bk = '#2b2f33'; wheels(W, [1.05, 4.35], 1.9, 0.5);
  B(0.1, 0.17, 0.5, 5.15, 1.56, 0.6, wh, {bv:0.12, win:[['E', 0.45, 0.22, 0.66, 0.3, bk], ['E', 0.08, 0.25, 0.3, 0.18, '#fff4b8'], ['E', 1.18, 0.25, 0.3, 0.18, '#fff4b8'], ...lamps(1.56, 0.25).slice(2), ...sides(2.3, 0.15, 1.2, 0.3, c.co, 'ÉG', '#fff')]});
  B(5.2, 0.2, 0.42, 0.14, 1.5, 0.28, bk, {bv:0.04}); B(0.0, 0.2, 0.42, 0.1, 1.5, 0.24, bk);
  B(3.95, 0.2, 1.1, 1.2, 1.5, [0.14, 0.03, 0.03, 0.14], wh);
  B(1.95, 0.22, 1.1, 2.05, 1.46, 0.8, wh, {bv:0.16, win:[...sides(0.12, 0.14, 0.82, 0.48, GL), ...sides(1.05, 0.14, 0.82, 0.48, GL), ['E', 0.12, 0.12, 1.22, 0.55, GL], ['W', 0.18, 0.2, 1.1, 0.4, GL]]});
  B(0.12, 0.2, 1.1, 1.8, 1.5, 0.42, wh, {top:'#41464c', bv:0.04}); L([[1.75, 0.3, 1.52], [1.75, 0.3, 2.0], [1.75, 1.6, 2.0], [1.75, 1.6, 1.52]], bk, 1.1);
  for (const y of [0.1, 1.62]){ B(0.65, y, 0.62, 0.85, 0.18, 0.42, bk, {bv:0.05}); B(3.95, y, 0.62, 0.85, 0.18, 0.42, bk, {bv:0.05}); } }, 'Toyota-style double cab: four doors, black grille and arches, a roll bar over the bed. Plants the prospect flags.');
def('v', 'Supply lorry', 6.6, 2.4, ({B, W}, c) => { wheels(W, [1.1, 2.4, 5.4], 2.4, 0.55);
  B(4.6, 0.2, 0.6, 1.9, 2, 2.2, c.co, {bv:0.38, win:[...allGlass(1.9, 2, 1.1, 0.75), ...lamps(2, 0.3)]}); B(0.2, 0.2, 0.75, 4.3, 2, 2.3, '#f2f2ee', {bv:0.22, win:sides(0.5, 0.8, 3.3, 0.6, c.co, 'ÉNERGIE-GÉO', '#fff')}); }, 'Brings drilling supplies from the depot.');
def('v', 'Low-loader with rig', 11, 2.6, ({B, W}, c) => { wheels(W, [1, 2.1, 3.2, 9.8], 2.6, 0.48);
  B(9.1, 0.25, 0.6, 1.8, 2.1, 2.2, '#d0663a', {bv:0.38, win:[...allGlass(1.8, 2.1, 1.1, 0.75), ...lamps(2.1, 0.3)]}); B(0.2, 0.4, 0.62, 8.9, 1.8, 0.3, '#3a3f45', {bv:0.08});
  B(0.6, 0.7, 0.92, 7.4, 1.2, 0.85, '#7a828a', {bv:0.18}); B(0.4, 1.0, 1.77, 8.4, 0.6, 0.35, c.co2, {bv:0.1}); }, 'Brings a rig to a pad and back; the mast lies folded on top.');
def('v', 'Vibro-truck', 7.4, 2.6, ({B, W, L}, c) => { const blue = '#2f6fbf'; wheels(W, [1.25, 6.2], 2.6, 0.72);
  B(5.7, 0.25, 0.85, 1.5, 2.1, 2, blue, {bv:0.36, win:[...allGlass(1.5, 2.1, 1, 0.7), ...lamps(2.1, 0.3)]});
  B(0.3, 0.5, 1.0, 5.4, 1.6, 0.38, '#3a3f45', {bv:0.06}); B(0.3, 0.35, 1.38, 2.3, 1.9, 1.45, blue, {bv:0.28, win:sides(0.2, 0.55, 1.9, 0.45, '#f2f2ee', 'VIBRO', blue)});
  B(2.75, 0.55, 1.38, 1.4, 1.5, 0.95, '#d9dde0', {bv:0.3}); B(3.0, 0.25, 0.12, 2, 2.1, 0.32, '#2b2f33', {bv:0.08});
  for (const [x, y] of [[3.2, 0.5], [4.8, 0.5], [3.2, 2.1], [4.8, 2.1]]) L([[x, y, 0.44], [x, y, 1.0]], '#f0c33c', 1.4); }, 'Blue off-road vibrator: the steel base plate between the axles is pressed onto the road and shaken.');
def('v', 'Tipper (builders)', 6, 2.4, ({B, W}, c) => { wheels(W, [1, 2.2, 5.1], 2.4, 0.55);
  B(4.3, 0.2, 0.6, 1.6, 2, 2, '#ece9e0', {bv:0.36, win:[...allGlass(1.6, 2, 1, 0.7), ...lamps(2, 0.3)]}); B(0.2, 0.25, 0.95, 4, 1.9, 1.3, '#b07a3e', {bv:0.18}); }, 'Roads, pads, flattening, buildings.');
def('v', 'Excavator', 5, 3, ({B, L}, c) => { B(0.3, 0.2, 0, 3.6, 0.75, 0.65, '#33373b', {bv:0.3}); B(0.3, 2.05, 0, 3.6, 0.75, 0.65, '#33373b', {bv:0.3}); B(0.6, 0.6, 0.65, 2.8, 1.8, 0.8, '#f0c33c', {bv:0.28});
  B(0.8, 0.75, 1.45, 1.3, 1.3, 1.25, '#f0c33c', {bv:0.22, win:allGlass(1.3, 1.3, 0.35, 0.7)}); L([[3.1, 1.5, 1.6], [4.6, 1.5, 3], [5.4, 1.5, 0.9]], '#d9a23a', 2.6); B(4.9, 1.1, 0.25, 0.8, 0.8, 0.55, '#3a3f45', {bv:0.12}); }, '');
def('v', 'Post bus', 9, 2.5, ({B, W}, c) => { wheels(W, [1.7, 7.3], 2.5, 0.52);
  B(0.2, 0.2, 0.4, 8.6, 2.1, 2.6, '#f5c636', {bv:0.5, win:[...[0.5, 2, 3.5, 5, 6.5].flatMap(a => sides(a, 1.2, 1.25, 0.85, GL)), ['E', 0.2, 1.05, 1.7, 1.1, GL], ['W', 0.25, 1.2, 1.6, 0.85, GL], ...sides(0.5, 0.42, 3.6, 0.45, '#f5c636', 'CAR POSTAL', '#b8322a'), ...lamps(2.1, 0.3)]}); }, 'Evening bus as a village gift.');
def('v', 'Police car', 4.2, 1.9, ({B, W}, c) => { wheels(W, [0.95, 3.25], 1.9, 0.42);
  B(0.1, 0.18, 0.32, 4, 1.54, 0.6, '#f6f6f3', {bv:0.25, win:[...lamps(1.54, 0.22), ...sides(0.3, 0.18, 3.4, 0.14, '#2a4fa0'), ...sides(1, 0.32, 2, 0.24, '#f6f6f3', 'POLICE', '#2a4fa0')]});
  B(1.05, 0.32, 0.92, 2.1, 1.26, 0.56, '#f6f6f3', {bv:0.2, win:allGlass(2.1, 1.26, 0.08, 0.36)}); B(1.8, 0.66, 1.48, 0.6, 0.58, 0.16, '#3b7bf0', {bv:0.06}); }, 'From the gendarmerie.');
def('v', 'Police van', 5.2, 2.2, ({B, W}, c) => { wheels(W, [1.1, 4.1], 2.2, 0.46);
  B(0.15, 0.2, 0.4, 4.9, 1.8, 2.1, '#f6f6f3', {bv:0.42, win:[...allGlass(4.9, 1.8, 1.15, 0.6).slice(0, 2), ...sides(3.6, 1.15, 1, 0.6, GL), ...sides(0.3, 0.55, 4.3, 0.2, '#2a4fa0'), ...sides(1.2, 0.85, 2.2, 0.36, '#f6f6f3', 'POLICE', '#2a4fa0'), ...lamps(1.8, 0.3)]});
  B(2.2, 0.8, 2.5, 0.8, 0.6, 0.15, '#3b7bf0', {bv:0.06}); }, '');
def('v', 'Riot police bus', 8.4, 2.5, ({B, W}, c) => { wheels(W, [1.6, 6.8], 2.5, 0.52);
  B(0.2, 0.2, 0.4, 8, 2.1, 2.6, '#33405e', {bv:0.5, win:[...[0.6, 2.4, 4.2, 6].flatMap(a => sides(a, 1.3, 1.4, 0.7, '#6a7ca3')), ['E', 0.25, 1.15, 1.6, 0.95, '#6a7ca3'], ...sides(0.8, 0.45, 3.4, 0.45, '#33405e', 'POLICE', '#e8e8e2'), ...lamps(2.1, 0.3)]}); B(3.6, 0.8, 3, 0.8, 0.8, 0.15, '#3b7bf0', {bv:0.06}); }, 'Shields, no batons.');
def('v', 'Black van (the lender)', 4.8, 2.1, ({B, W}, c) => { wheels(W, [1, 3.8], 2.1, 0.44);
  B(0.15, 0.2, 0.4, 4.5, 1.7, 1.85, '#1d2024', {bv:0.42, win:[['E', 0.14, 0.95, 1.42, 0.6, '#45505c'], ...sides(3.3, 0.95, 0.9, 0.55, '#45505c'), ...lamps(1.7, 0.25)]}); }, 'Three of them, slowly, from the villa. No plates.');
def('v', 'Tractor with manure spreader', 8.6, 2.6, ({B, W}, c) => { W(7.6, 0.4, 0.42); W(7.6, 2.2, 0.42); W(5.5, 0.32, 0.78, 0.5); W(5.5, 2.28, 0.78, 0.5); W(1.6, 0.3, 0.5); W(1.6, 2.3, 0.5);
  B(6.1, 0.65, 0.7, 2.2, 1.3, 0.8, '#c63a2c', {bv:0.28, win:lamps(1.3, 0.25).slice(0, 2)}); B(4.8, 0.6, 1.0, 1.4, 1.4, 1.75, '#c63a2c', {bv:0.25, win:allGlass(1.4, 1.4, 0.55, 0.95)});
  B(0.2, 0.45, 0.65, 3.6, 1.7, 1.15, '#3f7a4a', {bv:0.25}); B(0.3, 0.55, 1.78, 3.4, 1.5, 0.16, '#5a4632'); }, 'The farmers\' blockade.');
def('v', 'Fire engine', 7.8, 2.5, ({B, W, L}, c) => { wheels(W, [1.5, 5.6, 6.7], 2.5, 0.52);
  B(0.2, 0.2, 0.45, 7.4, 2.1, 2.4, '#d02a20', {bv:0.42, win:[['E', 0.2, 1.1, 1.7, 0.8, GL], ...sides(6, 1.1, 1.2, 0.8, GL), ...sides(0.4, 0.38, 5.2, 0.2, '#f2f0ea'), ...sides(1, 0.8, 3.6, 0.42, '#d02a20', 'POMPIERS', '#fff'), ...lamps(2.1, 0.3)]}); L([[0.6, 1.25, 2.95], [6.2, 1.25, 2.95]], '#c9ccd0', 1.6); }, '');
def('v', 'Army truck', 6.8, 2.5, ({B, W}, c) => { wheels(W, [1.1, 2.3, 5.6], 2.5, 0.58);
  B(4.8, 0.2, 0.7, 1.8, 2.1, 2, '#5b6b45', {bv:0.36, win:[...allGlass(1.8, 2.1, 1.05, 0.65), ...lamps(2.1, 0.3)]}); B(0.2, 0.2, 0.8, 4.5, 2.1, 2.3, '#6b7a52', {bv:0.55}); }, 'Only in the secret ending.');
def('v', 'Armoured vehicle (8×8)', 7.6, 2.8, ({B, X, W, O, L}, c) => { const ol = '#5b6b45'; wheels(W, [1.1, 2.4, 5.0, 6.3], 2.8, 0.55);
  X([[0.2, 0.3], [5.9, 0.3], [7.4, 0.8], [7.5, 1.4], [7.4, 2.0], [5.9, 2.5], [0.2, 2.5]], 0.5, 1.15, ol); X([[0.4, 0.45], [5.6, 0.45], [6.6, 0.9], [6.6, 1.9], [5.6, 2.35], [0.4, 2.35]], 1.65, 0.35, '#677a4f');
  O(3.4, 1.4, 2.0, 0.75, 0.65, 0.42, ol); L([[4.0, 1.4, 2.25], [6.0, 1.4, 2.3]], '#3a3f45', 1.2); B(6.5, 1.0, 1.4, 0.06, 0.8, 0.25, GL, {noline:1}); }, 'Eight wheels, a small turret. Only in the secret ending.');
def('v', 'Police helicopter', 10.5, 2.6, ({B, X, O, L}, c) => { const wh = '#f6f6f3', bl = '#2a4fa0';
  const pod = (z, h, col, sc) => X([[3.0, 1.3 - 0.8*sc], [6.2, 1.3 - 0.85*sc], [7.4, 1.3 - 0.55*sc], [7.9, 1.3], [7.4, 1.3 + 0.55*sc], [6.2, 1.3 + 0.85*sc], [3.0, 1.3 + 0.8*sc], [2.7, 1.3]], z, h, col);
  pod(0.75, 0.3, wh, 0.95); pod(1.05, 0.18, bl, 1); pod(1.23, 0.55, wh, 1);
  X([[5.9, 0.6], [7.0, 0.75], [7.75, 1.3], [7.0, 1.85], [5.9, 2.0]], 1.23, 0.62, GL, {k:0.5});
  O(4.4, 1.3, 1.78, 1.1, 0.62, 0.42, wh); O(4.4, 1.3, 2.2, 0.15, 0.15, 0.3, '#3a3f45');
  X([[0.4, 1.18], [3.0, 1.0], [3.0, 1.6], [0.4, 1.42]], 1.45, 0.32, wh); B(0.15, 1.12, 1.25, 0.7, 0.36, 1.25, bl, {bv:0.15}); B(0.6, 0.55, 1.6, 0.5, 1.5, 0.08, wh);
  for (const a of [0, 1, 2, 3]){ const an = a*Math.PI/2 + 0.4; L([[4.4, 1.3, 2.52], [4.4 + Math.cos(an)*5, 1.3 + Math.sin(an)*5, 2.6]], '#2b2f33', 1); }
  for (const y of [0.45, 2.15]){ L([[3.1, y, 0.15], [6.9, y, 0.15], [7.2, y, 0.32]], '#3a3f45', 1); L([[3.9, y, 0.15], [4.1, y, 0.78]], '#3a3f45', 0.7); L([[6.0, y, 0.15], [5.8, y, 0.78]], '#3a3f45', 0.7); } }, 'Rounded pod with a blue band, glass nose, tail fin, skids, four blades. The last resort.');
def('v', 'F-35', 15.6, 11, ({X, B, W}, c) => { const g = '#8d949b', g2 = '#7a8188';
  X([[15.4, 5.5], [13.2, 4.95], [9, 4.55], [2.2, 4.6], [0.8, 4.9], [0.8, 6.1], [2.2, 6.4], [9, 6.45], [13.2, 6.05]], 0.9, 0.85, g);
  X([[9.6, 4.6], [5.6, 0.4], [4.2, 0.4], [4.1, 4.6]], 1.25, 0.16, g2); X([[9.6, 6.4], [5.6, 10.6], [4.2, 10.6], [4.1, 6.4]], 1.25, 0.16, g2);
  X([[2.6, 4.7], [1.0, 2.7], [0.2, 2.7], [0.4, 4.7]], 1.35, 0.12, g2); X([[2.6, 6.3], [1.0, 8.3], [0.2, 8.3], [0.4, 6.3]], 1.35, 0.12, g2);
  X([[2.9, 4.7], [1.4, 4.4], [1.0, 4.4], [1.6, 4.7]], 1.75, 1.3, g2); X([[2.9, 6.3], [1.4, 6.6], [1.0, 6.6], [1.6, 6.3]], 1.75, 1.3, g2);
  X([[12.6, 5.5], [11.2, 5.05], [9.6, 5.05], [9.6, 5.95], [11.2, 5.95]], 1.75, 0.38, '#c9a54a'); B(0.3, 5.05, 1.0, 0.6, 0.9, 0.6, '#3a3f45', {bv:0.15});
  W(12.6, 5.35, 0.3); W(12.6, 5.65, 0.3); W(5.2, 4.3, 0.36); W(5.2, 6.7, 0.36); }, 'Grey, delta wings, twin canted tails, gold canopy. Only in the secret ending.');
def('v', 'Regional train', 20, 3, ({B, W}, c) => { for (const x0 of [0.3, 10.2]){ wheels(W, [x0 + 1.4, x0 + 8], 3, 0.45);
  B(x0, 0.25, 0.6, 9.5, 2.5, 2.8, '#dfe2e5', {bv:0.5, win:[...[0.6, 2.3, 4, 5.7, 7.4].flatMap(a => sides(a, 1.3, 1.3, 0.85, GL)), ...sides(0.3, 0.45, 8.9, 0.26, '#b8322a'), ['E', 0.3, 1.2, 1.9, 0.9, GL], ['W', 0.3, 1.2, 1.9, 0.9, GL]]}); } }, 'Along the top of the valley.');

/* People, built in 3D from octagons: rounded heads and bodies, front at +x. Each type has its own silhouette. */
const personModel = (p) => ({B, O, X, L}, c) => {
  const k = (p.small ? 0.72 : 1)*(p.tall || 1), gw = p.wide || 1, cx = 0.75, cy = 0.75, legH = 0.42*k, bodyH = 0.5*k, hs = 0.56*(p.small ? 0.85 : 1), hz = legH + bodyH, bw = 0.27*gw*(p.small ? 0.8 : 1), bd = 0.17*gw*(p.small ? 0.8 : 1);
  const SH = p.boots || '#2b2522';
  // legs and shoes
  for (const sy of [-1, 1]){ const ly = cy + sy*0.1*gw; if (p.skirt) O(cx, ly, 0, 0.06, 0.06, legH, p.skin); else O(cx, ly, 0, 0.085*gw, 0.085*gw, legH, p.bot);
    B(cx - 0.07, ly - 0.08, 0, 0.26, 0.16, p.boots ? 0.18 : 0.09, SH, {bv:0.04}); if (p.knee) O(cx + 0.05, ly, legH*0.45, 0.07, 0.08, 0.12, p.knee); }
  // body
  if (p.skirt) O(cx, cy, legH*0.45, bd + 0.06, bw + 0.04, legH*0.6, p.bot);
  O(cx, cy, legH, bd, bw, bodyH, p.top); if (p.belly) O(cx + 0.04, cy, legH + 0.05, bd + 0.05, bw - 0.02, bodyH*0.55, p.top);
  if (p.vest) O(cx, cy, legH + bodyH*0.42, bd + 0.012, bw + 0.012, 0.07, '#f2e23a', {noline:1});
  if (p.armor){ O(cx, cy, legH + bodyH*0.35, bd + 0.03, bw + 0.03, bodyH*0.55, p.armor); for (const sy of [-1, 1]) O(cx, cy + sy*(bw + 0.03), hz - 0.08, 0.13, 0.12, 0.13, p.armor2 || p.armor); }
  if (p.tie) B(cx + bd - 0.02, cy - 0.035, legH + bodyH*0.3, 0.04, 0.07, bodyH*0.6, p.tie);
  if (p.bow) B(cx + bd - 0.02, cy - 0.07, hz - 0.1, 0.04, 0.14, 0.06, p.bow);
  if (p.sash) X([[cx + bd + 0.01, cy - bw], [cx + bd + 0.01, cy - bw + 0.08], [cx + bd + 0.015, cy + bw], [cx + bd + 0.015, cy + bw - 0.08]], legH + bodyH*0.3, 0.12, '#c63a2c', {noline:1});
  if (p.chain) B(cx + bd - 0.01, cy - 0.06, hz - 0.18, 0.03, 0.12, 0.05, '#e3c05a');
  if (p.pack) B(cx - bd - 0.16, cy - 0.15, legH + 0.08, 0.16, 0.3, bodyH*0.8, p.pack, {bv:0.04});
  if (p.lanyard) B(cx + bd - 0.02, cy - 0.04, legH + bodyH*0.35, 0.03, 0.08, 0.1, '#f4f2ec');
  // arms and hands
  for (const sy of [-1, 1]){ const ay = cy + sy*(bw + 0.06*gw); O(cx, ay, legH + 0.1*k, 0.06*gw, 0.06*gw, bodyH - 0.08*k, p.armor && p.armor2 ? p.armor : p.top); O(cx, ay, legH + 0.04*k, 0.06, 0.06, 0.08, p.gloves || p.skin); }
  // head
  if (p.visor){ O(cx, cy, hz, hs/2 + 0.02, hs/2 + 0.02, hs*0.95, p.hat); X([[cx + hs/2 - 0.02, cy - hs*0.38], [cx + hs/2 + 0.035, cy - hs*0.3], [cx + hs/2 + 0.035, cy + hs*0.3], [cx + hs/2 - 0.02, cy + hs*0.38]], hz + hs*0.38, hs*0.22, '#16181b', {noline:1}); O(cx, cy, hz + hs*0.95, hs*0.38, hs*0.38, 0.06, p.hat); }
  else {
    O(cx, cy, hz, hs/2, hs/2, hs*0.82, p.skin); O(cx, cy, hz + hs*0.82, hs*0.36, hs*0.36, 0.07, p.skin);
    const fx = cx + hs/2 - 0.03, ez = hz + hs*0.42;
    for (const sy of [-1, 1]){ B(fx, cy + sy*hs*0.17 - 0.03, ez, 0.05, 0.06, 0.08, '#2a2d33', {noline:1}); B(fx, cy + sy*hs*0.27 - 0.03, ez - 0.09, 0.04, 0.07, 0.04, '#f0a0a0', {noline:1}); }
    B(fx, cy - 0.04, ez - 0.14, 0.04, 0.08, 0.025, '#a8584e', {noline:1});
    if (p.glasses){ B(fx + 0.01, cy - hs*0.3, ez - 0.01, 0.03, hs*0.6, 0.06, '#16181b', {noline:1}); }
    if (p.beard) X([[fx - 0.02, cy - hs*0.32], [fx + 0.04, cy - hs*0.25], [fx + 0.04, cy + hs*0.25], [fx - 0.02, cy + hs*0.32]], hz + 0.02, hs*0.28, p.beard, {noline:1});
    // hair: cap and back
    if (!(p.hat && (p.helmet || p.full))){ O(cx - 0.01, cy, hz + hs*0.72, hs/2 + 0.025, hs/2 + 0.025, hs*0.2, p.hair); }
    const back = []; for (let i = 0; i < 8; i++){ const a = (i + 0.5)/8*Math.PI*2; if (Math.cos(a) <= 0.2) back.push([cx - 0.02 + Math.cos(a)*(hs/2 + 0.03), cy + Math.sin(a)*(hs/2 + 0.03)]); }
    X(back, hz + (p.long ? -0.12 : hs*0.3), p.long ? hs*0.95 : hs*0.55, p.hair);
    if (p.bun) O(cx - hs/2 + 0.02, cy, hz + hs*0.7, 0.1, 0.1, 0.16, p.hair);
    if (p.hat){ const ht = hz + hs*0.82;
      if (p.helmet){ O(cx, cy, hz + hs*0.5, hs/2 + 0.05, hs/2 + 0.05, hs*0.42, p.hat); O(cx, cy, hz + hs*0.92, hs*0.4, hs*0.4, 0.07, p.hat); if (p.camo) for (const [dx, dy] of [[0.1, -0.12], [-0.08, 0.1], [0.02, 0.18]]) O(cx + dx, cy + dy, hz + hs*0.93, 0.06, 0.07, 0.07, p.camo, {noline:1}); }
      else if (p.cap){ O(cx, cy, ht - 0.02, hs/2 + 0.01, hs/2 + 0.01, 0.12, p.hat); B(cx + hs/2 - 0.04, cy - 0.12, ht - 0.02, 0.18, 0.24, 0.04, p.hat); }
      else if (p.beanie){ O(cx, cy, ht - 0.06, hs/2 + 0.02, hs/2 + 0.02, 0.18, p.hat); O(cx, cy, ht + 0.12, 0.06, 0.06, 0.06, p.hat); }
      else { O(cx, cy, ht - 0.02, hs/2 + 0.12, hs/2 + 0.12, 0.04, p.hat); if (p.band) O(cx, cy, ht + 0.02, hs/2 - 0.03, hs/2 - 0.03, 0.06, p.band, {noline:1}); O(cx, cy, ht + 0.02, hs/2 - 0.04, hs/2 - 0.04, 0.2, p.hat); } } }
  // items in the right hand (+y side)
  const hy = cy + bw + 0.12, hx = cx + 0.04;
  if (p.item === 'case') B(hx - 0.14, hy - 0.03, 0.06, 0.28, 0.08, 0.24, '#6a4a32', {bv:0.03});
  if (p.item === 'board') B(hx + 0.02, hy - 0.05, legH, 0.05, 0.26, 0.34, '#c9a24a', {win:[['E', 0.03, 0.05, 0.2, 0.22, '#f4f2ec']]});
  if (p.item === 'bottle') O(hx + 0.04, hy, legH - 0.12, 0.05, 0.05, 0.22, '#9fd0e8');
  if (p.item === 'cup') O(hx + 0.08, hy, legH + 0.02, 0.06, 0.06, 0.13, '#f4f2ec');
  if (p.item === 'laptop') B(hx - 0.05, hy - 0.05, legH + 0.06, 0.32, 0.24, 0.05, '#3a3f45');
  if (p.item === 'camera') B(cx + bd, cy - 0.12, hz + hs*0.28, 0.2, 0.24, 0.18, '#1c1f22', {bv:0.03});
  if (p.item === 'cane') L([[hx + 0.08, hy, 0], [hx + 0.08, hy, legH + 0.05]], '#6a4a32', 1.4);
  if (p.item === 'fork'){ L([[hx, hy + 0.04, 0.02], [hx, hy + 0.04, hz + hs + 0.3]], '#8a6a4a', 1.3); L([[hx - 0.12, hy + 0.04, hz + hs + 0.3], [hx + 0.12, hy + 0.04, hz + hs + 0.3]], '#9aa3ab', 1); }
  if (p.item === 'rifle') L([[hx + 0.05, hy, legH], [hx + 0.05, hy, hz + 0.25]], '#2f3329', 1.6);
  if (p.item === 'radio') B(cx - bd - 0.17, cy - 0.15, legH + 0.08, 0.17, 0.3, bodyH*0.85, '#4a5838', {bv:0.04});
  if (p.item === 'shield') X([[cx + bd + 0.1, cy - 0.5], [cx + bd + 0.16, cy - 0.45], [cx + bd + 0.16, cy + 0.45], [cx + bd + 0.1, cy + 0.5]], 0.1, 1.05*k, '#a9c7e8', {top:'#d6e6f4'});
  if (p.item === 'sign'){ L([[hx, hy + 0.04, legH], [hx, hy + 0.04, hz + hs + 0.55]], '#8a6a4a', 1.3); B(hx - 0.03, hy - 0.42, hz + hs + 0.35, 0.06, 0.92, 0.55, '#f4f2ec', {win:[['E', 0.05, 0.08, 0.82, 0.38, '#f4f2ec', p.sign || 'NON', '#c63a2c'], ['W', 0.05, 0.08, 0.82, 0.38, '#f4f2ec', p.sign || 'NON', '#c63a2c']]}); } };

const person = (n, o, note) => def('p', n, 1.5, 1.5, personModel(o), note);
person('The CEO', {top:'#2f343c', bot:'#2f343c', hair:'#9a9590', skin:'#efc9a8', tie:'#b8322a', item:'case', tall:1.1, glasses:1}, 'Tall, grey at the temples, dark suit, glasses.');
person('Suit (woman)', {top:'#1f2329', bot:'#1f2329', hair:'#3a2b20', long:1, skin:'#f2d2b6', item:'case', skirt:1, bun:1}, 'Lent by the association.');
person('Suit (man)', {top:'#1f2329', bot:'#1f2329', hair:'#2b2522', skin:'#e8c09c', tie:'#2c5f93', item:'case'}, '');
person('Geologist', {top:'#e07a2c', bot:'#3a4a63', hair:'#7a4a2a', long:1, skin:'#f2d2b6', hat:'#f4f4f2', helmet:1, item:'board', vest:1}, 'White helmet, clipboard. Drives the pickup.');
person('Driller', {top:'#e07a2c', bot:'#e07a2c', hair:'#3a2b20', skin:'#d9a882', hat:'#f2c230', helmet:1, vest:1, wide:1.15, beard:'#3a2b20', boots:'#3a2b20', gloves:'#c9a24a'}, 'Orange overalls, beard, work boots.');
person('Driller (woman)', {top:'#e07a2c', bot:'#e07a2c', hair:'#c9a24a', long:1, skin:'#f2d2b6', hat:'#f2c230', helmet:1, vest:1, boots:'#3a2b20', gloves:'#c9a24a'}, '');
person('Mud engineer', {top:'#3a5f8a', bot:'#3a4a63', hair:'#2b2522', skin:'#c98e66', hat:'#f4f4f2', helmet:1, item:'bottle'}, '');
person('Water officer', {top:'#2c8a8a', bot:'#3a4a63', hair:'#8a5a3a', long:1, skin:'#f2d2b6', item:'bottle', boots:'#2f5f3a'}, 'Samples springs; green rubber boots.');
person('Community liaison', {top:'#b05a6a', bot:'#4a4f55', hair:'#2b2522', long:1, skin:'#a8704a', item:'cup'}, 'Coffee with the neighbours.');
person('Security guard', {top:'#2b2f36', bot:'#2b2f36', hair:'#2b2522', skin:'#e8c09c', hat:'#2b2f36', cap:1, vest:1, wide:1.2}, '');
person('Seismologist', {top:'#6a5a8a', bot:'#4a4f55', hair:'#d9d4c8', skin:'#f2d2b6', item:'laptop', glasses:1, beard:'#d9d4c8'}, 'From the university station.');
person('Plant operator', {top:'#3a5f8a', bot:'#3a5f8a', hair:'#5a4632', long:1, skin:'#e8c09c', hat:'#f4f4f2', helmet:1}, '');
person('Villager (woman)', {top:'#7a8f6e', bot:'#4a4f55', hair:'#8a5a3a', long:1, skin:'#f2d2b6', skirt:1}, '');
person('Villager (man), elderly', {top:'#8a6a4a', bot:'#3a4a63', hair:'#e6e2da', skin:'#e8c09c', hat:'#5a4632', cap:1, item:'cane', tall:0.92}, 'With a cane and a flat cap.');
person('Farmer', {top:'#2c5f93', bot:'#2c5f93', hair:'#5a4632', skin:'#d9a882', hat:'#3a3f45', cap:1, item:'fork', wide:1.25, belly:1, boots:'#2f5f3a'}, 'Blue work jacket, rubber boots, a belly.');
person('Mayor', {top:'#3a3f45', bot:'#3a3f45', hair:'#c9c4b6', long:1, skin:'#f2d2b6', sash:1, wide:1.15, bun:1}, 'With the sash on fête days.');
person('Protester with sign', {top:'#3f7a4a', bot:'#3a4a63', hair:'#c94c3a', long:1, skin:'#f2d2b6', item:'sign', sign:'NON', hat:'#c63a2c', beanie:1}, 'In a march.');
person('Protester with sign (2)', {top:'#c9622a', bot:'#4a4f55', hair:'#2b2522', skin:'#a8704a', item:'sign', sign:'STOP', beard:'#2b2522'}, '');
person('Police officer', {top:'#2a4fa0', bot:'#1f2a44', hair:'#2b2522', skin:'#e8c09c', hat:'#1f2a44', cap:1}, '');
person('Riot police', {top:'#2d3440', bot:'#2d3440', hair:'#1f2a44', skin:'#e8c09c', hat:'#3b4352', visor:1, armor:'#4a5466', armor2:'#7d8796', knee:'#7d8796', gloves:'#1c1f22', boots:'#16181b', wide:1.4, tall:1.12, item:'shield'}, 'Full armour, closed helmet with a black visor, shoulder plates, a big shield.');
person('Journalist (La Feuille)', {top:'#c9a24a', bot:'#3a3f45', hair:'#3a2b20', long:1, skin:'#f2d2b6', item:'camera', pack:'#5a4632'}, '');
person('Banker', {top:'#3a4a63', bot:'#3a4a63', hair:'#5a4632', skin:'#e8c09c', bow:'#c9a23a', item:'case', glasses:1, belly:1}, 'Bow tie.');
person('The lender', {top:'#f4f2ec', bot:'#f4f2ec', hair:'#1c1f22', skin:'#d9a882', tie:'#1c1f22', hat:'#f4f2ec', band:'#1c1f22', glasses:1, chain:1, wide:1.1}, 'White suit, white hat with a black band, dark glasses, a gold chain.');
person('Association presenter', {top:'#3d6b45', bot:'#4a4f55', hair:'#7a4a2a', long:1, skin:'#f2d2b6', item:'board', lanyard:1}, 'Gives the slide show.');
person('Soldier', {top:'#5b6b45', bot:'#5b6b45', hair:'#2b2522', skin:'#e8c09c', hat:'#4a5838', helmet:1, camo:'#3a4529', boots:'#2b2a22', item:'rifle', pack:'#4a5838'}, 'Helmet, pack, rifle. Only in the secret ending.');
person('Soldier with radio', {top:'#5b6b45', bot:'#5b6b45', hair:'#5a4632', skin:'#d9a882', hat:'#4a5838', helmet:1, camo:'#3a4529', boots:'#2b2a22', item:'radio'}, '');
person('Officer', {top:'#4f5d3c', bot:'#4f5d3c', hair:'#9a9590', skin:'#efc9a8', hat:'#4a5838', helmet:1, camo:'#3a4529', boots:'#2b2a22', item:'board', tall:1.05}, 'Reads the evacuation order.');
person('Soldier (woman)', {top:'#5b6b45', bot:'#5b6b45', hair:'#3a2b20', long:1, skin:'#f2d2b6', hat:'#4a5838', helmet:1, camo:'#3a4529', boots:'#2b2a22', pack:'#4a5838'}, '');
person('Child', {top:'#e8b730', bot:'#3a4a63', hair:'#8a5a3a', skin:'#f2d2b6', small:1}, '');

function outline(c, col){ const g = c.getContext('2d'), W = c.width, Hh = c.height, d = g.getImageData(0, 0, W, Hh), a = d.data, o = new Uint8Array(W*Hh), rgb = hex(col || '#2a2d33');
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++){ const i = (y*W + x)*4; if (a[i + 3]) continue; if ((x > 0 && a[i - 1]) || (x < W - 1 && a[i + 7]) || (y > 0 && a[i - W*4 + 3]) || (y < Hh - 1 && a[i + W*4 + 3])) o[y*W + x] = 1; }
  for (let j = 0; j < o.length; j++) if (o[j]){ a[j*4] = rgb[0]; a[j*4 + 1] = rgb[1]; a[j*4 + 2] = rgb[2]; a[j*4 + 3] = 255; } g.putImageData(d, 0, 0); }
window.ART = {models:M, draw, outline, PAL};
})();
