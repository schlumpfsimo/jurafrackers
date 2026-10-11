/* Jurafrackers 2.0 — the map on screen. The valley is drawn at a few fixed resolutions (levels); zooming past the finest only
   enlarges the pixels. Each level is cut into tiles, drawn when first seen and kept: the ground column by column from the front
   (every pixel's colour from the world), then the buildings, trees and street things in depth order. Things that move are drawn
   over the tiles every frame; whatever stands in front of them is drawn again on top. */
(function(){
'use strict';
const T = 256, PAD = 24, BASE = 8;
const STEPS = [{li:0, z:1}, {li:1, z:1}, {li:2, z:1}, {li:3, z:1}, {li:3, z:2}, {li:3, z:3}, {li:3, z:4}];
function create(world, canvas, opts){ opts = opts || {};
  const ART = globalThis.ART, W = world.W, D = world.D, FINE = opts.fine || 7;
  const LEVELS = [1.2, 2.4, 4.8, FINE].map((S, li) => { const top = world.zmax + 26, OX = D*S + PAD, OY = top*S + PAD, w = Math.ceil((W + D)*S + 2*PAD), h = Math.ceil(((W + D)/2 + top - world.zmin + BASE)*S + 2*PAD);
    return {li, S, OX, OY, w, h, tiles:new Map(), objs:null, tw:Math.ceil(w/T), th:Math.ceil(h/T)}; });
  const lodOf = scr => scr >= 20 ? 3 : scr >= 6 ? 2 : 1;
  const g = canvas.getContext('2d');
  const cam = {x:W/2, y:D/2, step:1};
  const lv = () => LEVELS[STEPS[cam.step].li], zf = () => STEPS[cam.step].z, scr = () => lv().S*zf();
  const proj = (L, x, y, z) => [(x - y)*L.S + L.OX, ((x + y)/2 - z)*L.S + L.OY];
  // ---- static things: buildings, trees, props and anything the game adds (sites, rigs, its buildings)
  const extra = new Set(); let objVersion = 0;
  const statics = () => { const out = []; for (const b of world.buildings) out.push({kind:'b', ref:b, m:world.model(b.name), x:b.cx, y:b.cy, z:b.z, view:b.view, recol:b.recol, key:b.recol ? JSON.stringify(b.recol) : '', noPad:true, noRails:b.name === 'Railway station'});
    for (const t of world.trees) out.push({kind:'t', ref:t, m:ART.treeModel(t.kind, t.s), x:t.x, y:t.y, z:t.z, view:0});
    for (const p of world.props) out.push({kind:'p', ref:p, m:p.m, x:p.x, y:p.y, z:p.z, view:p.view, noPad:true});
    for (const e of extra) out.push(e); return out; };
  const spriteOf = (o, S) => ART.sprite(o.m, o.view || 0, S, {noPad:o.noPad !== false, recol:o.recol, key:(o.key || '') + (o.noRails ? 'nr' : ''), skip:o.noRails ? (p => p.t === 'ln' && p.pts.every(q => q[2] < 0.3)) : null});
  const index = L => { const objs = statics(), byTile = new Map(); for (const o of objs){ const e = spriteOf(o, L.S), [px, py] = proj(L, o.x, o.y, o.z), x0 = Math.round(px - e.ax), y0 = Math.round(py - e.ay); o.r = o.r || {}; o.r[L.li] = [x0, y0, e.w, e.h];
      o.depth = o.x + o.y + (o.kind === 't' ? 0.3 : 0) + (o.flat ? -50 : 0); for (let i = Math.max(0, Math.floor(x0/T)); i <= Math.min(L.tw - 1, Math.floor((x0 + e.w)/T)); i++) for (let j = Math.max(0, Math.floor(y0/T)); j <= Math.min(L.th - 1, Math.floor((y0 + e.h)/T)); j++){ const k = i*1000 + j; if (!byTile.has(k)) byTile.set(k, []); byTile.get(k).push(o); } }
    for (const v of byTile.values()) v.sort((a, b) => a.depth - b.depth); L.objs = byTile; L.list = objs; L.ver = objVersion; };
  // ---- one tile: the ground from the front of each column backwards, then the things on it
  const earthAt = (z, face) => { const f = (0.82 + 0.1*((Math.floor(z*1.2) % 2 + 2) % 2))*(face ? 0.86 : 1); return [Math.round(138*f), Math.round(116*f), Math.round(88*f)]; };
  const renderTile = (L, i, j, lod) => { const c = document.createElement('canvas'); c.width = T; c.height = T; const gg = c.getContext('2d'), img = gg.createImageData(T, T), d = img.data, S = L.S, x0 = i*T, y0 = j*T, zb = world.zmin - BASE;
    for (let col = 0; col < T; col++){ const a = (x0 + col + 0.5 - L.OX)/S, umin = Math.max(-a, a), umax = Math.min(2*W - a, 2*D + a); if (umax < umin) continue;
      let ybuf = T; const du = 1/S;
      // the cut face of the block under the front edge
      { const u = umax, x = (u + a)/2, y = (u - a)/2, h = world.hb(clamp(x, 0, W), clamp(y, 0, D)), top = (u/2 - h)*S + L.OY - y0, bot = (u/2 - zb)*S + L.OY - y0, face = (2*W - a) < (2*D + a);
        for (let row = Math.max(0, Math.ceil(top)); row < Math.min(T, Math.ceil(bot)); row++){ const z = u/2 - (row + y0 + 0.5 - L.OY)/S, cc = earthAt(z, face), o = (row*T + col)*4; d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = 255; }
        ybuf = Math.min(T, Math.max(0, Math.ceil(top))); }
      for (let u = umax; u >= umin && ybuf > 0; u -= du){ const x = (u + a)/2, y = (u - a)/2, h = world.hb(x, y), sy = (u/2 - h)*S + L.OY - y0; if (sy >= ybuf) continue;
        const r0 = Math.max(0, Math.ceil(sy - 0.5)); if (r0 >= ybuf) continue; const cc = world.colourAt(x, y, lod, S);
        for (let row = r0; row < ybuf; row++){ const o = (row*T + col)*4; d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = 255; } ybuf = r0; } }
    gg.putImageData(img, 0, 0);
    if (!L.objs || L.ver !== objVersion) index(L);
    for (const o of L.objs.get(i*1000 + j) || []){ const e = spriteOf(o, S), [rx, ry] = o.r[L.li]; gg.drawImage(ART.spriteCanvas(e), rx - x0, ry - y0); }
    return c; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // ---- the tile cache and a queue: tiles are drawn a few per frame, nearest the middle of the screen first
  const tileKey = (L, i, j, lod) => i*1000 + j + lod*1e7;
  const queue = new Set();
  const getTile = (L, i, j, lod) => { const k = tileKey(L, i, j, lod), t = L.tiles.get(k); if (t && !t.dirty) return t.c; if (!queue.has(L.li + ':' + k)) queue.add(L.li + ':' + k); return t ? t.c : null; };
  const work = budget => { const t0 = performance.now(); const items = [...queue].map(q => { const [li, k] = q.split(':').map(Number), L = LEVELS[li], i = Math.floor((k % 1e7)/1000), j = k % 1000, lod = Math.floor(k/1e7); return {q, L, i, j, lod, k}; });
    const V = viewRect(); items.sort((p, q) => dist(p, V) - dist(q, V));
    for (const it of items){ if (performance.now() - t0 > budget) break; queue.delete(it.q); if (it.L !== lv()) continue; const c = renderTile(it.L, it.i, it.j, it.lod); it.L.tiles.set(it.k, {c}); } return queue.size; };
  const dist = (it, V) => { const cx = (it.i + 0.5)*T, cy = (it.j + 0.5)*T; return Math.hypot(cx - V.cx, cy - V.cy) + (it.L === lv() ? 0 : 1e9); };
  // what part of the current level is on screen (level pixels)
  const viewRect = () => { const L = lv(), z = zf(), [cx, cy] = proj(L, cam.x, cam.y, world.hb(clamp(cam.x, 0, W), clamp(cam.y, 0, D))); return {L, z, cx:Math.round(cx), cy:Math.round(cy), x0:Math.round(cx) - canvas.width/2/z, y0:Math.round(cy) - canvas.height/2/z, x1:Math.round(cx) + canvas.width/2/z, y1:Math.round(cy) + canvas.height/2/z}; };
  // world point → screen, and screen → level pixel
  const toScreen = (x, y, z) => { const V = viewRect(), [px, py] = proj(V.L, x, y, z ?? world.hb(clamp(x, 0, W), clamp(y, 0, D))); return [(px - V.x0)*V.z, (py - V.y0)*V.z]; };
  const toLevel = (sx, sy) => { const V = viewRect(); return [sx/V.z + V.x0, sy/V.z + V.y0]; };
  // the ground under a screen point: the first sample from the front whose top reaches the pixel
  const pickGround = (sx, sy) => { const V = viewRect(), L = V.L, [px, py] = toLevel(sx, sy), a = (px - L.OX)/L.S, umin = Math.max(-a, a), umax = Math.min(2*W - a, 2*D + a); if (umax < umin) return null;
    for (let u = umax; u >= umin; u -= 0.5/L.S){ const x = (u + a)/2, y = (u - a)/2, h = world.hb(x, y), s = (u/2 - h)*L.S + L.OY; if (s <= py) return [x, y, h]; } return null; };
  // ---- the frame: tiles, then moving things with whatever stands in front of them drawn again, then signs and marks
  const dyn = [];    // {m, view, x, y, z, recol, flat (drawn under), draw (custom), depth}
  const overlays = []; // functions (g, V) drawn last
  const frame = () => { const V = viewRect(), L = V.L, lod = lodOf(scr()), z = V.z; g.imageSmoothingEnabled = false;
    const sky = g.createLinearGradient(0, 0, 0, canvas.height); sky.addColorStop(0, '#dfe6ec'); sky.addColorStop(1, '#eef0ea'); g.fillStyle = sky; g.fillRect(0, 0, canvas.width, canvas.height);
    if (!L.objs || L.ver !== objVersion) index(L);
    for (let i = Math.max(0, Math.floor(V.x0/T)); i <= Math.min(L.tw - 1, Math.floor(V.x1/T)); i++) for (let j = Math.max(0, Math.floor(V.y0/T)); j <= Math.min(L.th - 1, Math.floor(V.y1/T)); j++){
      const c = getTile(L, i, j, lod), dx = (i*T - V.x0)*z, dy = (j*T - V.y0)*z;
      if (c) g.drawImage(c, Math.round(dx), Math.round(dy), T*z, T*z); else { const lower = fallback(L, i, j); if (lower) g.drawImage(lower.c, lower.sx, lower.sy, lower.sw, lower.sh, Math.round(dx), Math.round(dy), T*z, T*z); } }
    // moving things, back to front; what stands in front of each is drawn again over it
    const items = dyn.filter(o => !o.hidden).map(o => { const e = o.draw ? null : ART.sprite(o.m, o.view || 0, L.S, {noPad:true, recol:o.recol, key:o.key || ''}), [px, py] = proj(L, o.x, o.y, o.z ?? world.hb(clamp(o.x, 0, W), clamp(o.y, 0, D))); return {o, e, px, py, depth:o.depth ?? (o.x + o.y)}; });
    items.sort((a, b) => (a.o.flat ? -1e6 : 0) + a.depth - ((b.o.flat ? -1e6 : 0) + b.depth));
    for (const it of items){ const sx = (it.px - V.x0)*z, sy = (it.py - V.y0)*z; if (sx < -400 || sy < -400 || sx > canvas.width + 400 || sy > canvas.height + 400) continue;
      if (it.o.draw){ it.o.draw(g, sx, sy, z, L.S, V); continue; }
      const e = it.e, x0 = Math.round(sx - e.ax*z), y0 = Math.round(sy - e.ay*z); g.drawImage(ART.spriteCanvas(e), x0, y0, e.w*z, e.h*z);
      if (!it.o.flat) for (const s of nearStatics(L, it.px - e.ax, it.py - e.ay, e.w, e.h)){ if (s.depth <= it.depth + 0.5) continue; const se = spriteOf(s, L.S), [rx, ry] = s.r[L.li]; g.drawImage(ART.spriteCanvas(se), Math.round((rx - V.x0)*z), Math.round((ry - V.y0)*z), se.w*z, se.h*z); } }
    // writing on walls, at screen scale, when it fits
    for (const o of visibleStatics(L, V)){ if (o.kind !== 'b') continue; const e = spriteOf(o, L.S); if (!e.texts.length) continue; const [rx, ry] = o.r[L.li]; ART.spriteTexts(g, e, (rx - V.x0)*z, (ry - V.y0)*z, z, L.S); }
    for (const f of overlays) f(g, V); };
  const nearStatics = (L, x, y, w, h) => { const out = new Set(); for (let i = Math.max(0, Math.floor(x/T)); i <= Math.min(L.tw - 1, Math.floor((x + w)/T)); i++) for (let j = Math.max(0, Math.floor(y/T)); j <= Math.min(L.th - 1, Math.floor((y + h)/T)); j++) for (const o of L.objs.get(i*1000 + j) || []){ if (o.kind === 't' && o.ref.kind === 'h') continue; const r = o.r[L.li]; if (r[0] < x + w && r[0] + r[2] > x && r[1] < y + h && r[1] + r[3] > y) out.add(o); } return [...out].sort((a, b) => a.depth - b.depth); };
  const visibleStatics = (L, V) => { const out = new Set(); for (let i = Math.max(0, Math.floor(V.x0/T)); i <= Math.min(L.tw - 1, Math.floor(V.x1/T)); i++) for (let j = Math.max(0, Math.floor(V.y0/T)); j <= Math.min(L.th - 1, Math.floor(V.y1/T)); j++) for (const o of L.objs.get(i*1000 + j) || []) out.add(o); return out; };
  // a coarser level's tile, enlarged, while the right one is being drawn
  const fallback = (L, i, j) => { for (let li = L.li - 1; li >= 0; li--){ const M = LEVELS[li], k = L.S/M.S, px = i*T/k, py = j*T/k, ti = Math.floor(px/T), tj = Math.floor(py/T); for (const lod of [1, 2, 3]){ const t = M.tiles.get(tileKey(M, ti, tj, lod)); if (t) return {c:t.c, sx:px - ti*T, sy:py - tj*T, sw:T/k, sh:T/k}; } } return null; };
  // ---- changes: tiles over a changed area are drawn again (all levels); the objects are indexed again
  world.onChange((x0, y0, x1, y1) => { objVersion++; for (const L of LEVELS){ const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => proj(L, x, y, 0)), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const a0 = Math.floor(Math.min(...xs)/T), a1 = Math.floor(Math.max(...xs)/T), b0 = Math.floor((Math.min(...ys) - (world.zmax + 30)*L.S)/T), b1 = Math.floor((Math.max(...ys) - world.zmin*L.S + 40)/T);
      for (const [k, t] of L.tiles){ const i = Math.floor((k % 1e7)/1000), j = k % 1000; if (i >= a0 && i <= a1 && j >= b0 && j <= b1) t.dirty = true; } } });
  const addStatic = o => { extra.add(o); objVersion++; const R = 30; for (const L of LEVELS) for (const [k, t] of L.tiles){ const i = Math.floor((k % 1e7)/1000), j = k % 1000, [px, py] = proj(L, o.x, o.y, o.z || 0); if (Math.abs((i + 0.5)*T - px) < T/2 + R*L.S + 200 && Math.abs((j + 0.5)*T - py) < T/2 + R*L.S + 300) t.dirty = true; } return o; };
  const removeStatic = o => { if (extra.delete(o)){ objVersion++; for (const L of LEVELS) for (const [k, t] of L.tiles){ const i = Math.floor((k % 1e7)/1000), j = k % 1000, [px, py] = proj(L, o.x, o.y, o.z || 0); if (Math.abs((i + 0.5)*T - px) < T/2 + 400 && Math.abs((j + 0.5)*T - py) < T/2 + 400) t.dirty = true; } } };
  // ---- picking a thing under the cursor: moving things first, then buildings, front to back, by their pixels
  const opaqueAt = (e, x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < e.w && y < e.h && e.data[(y*e.w + x)*4 + 3] > 0; };
  const pick = (sx, sy) => { const V = viewRect(), L = V.L, [px, py] = toLevel(sx, sy);
    const ds = dyn.filter(o => o.pickable && !o.hidden).map(o => { const e = ART.sprite(o.m, o.view || 0, L.S, {noPad:true, recol:o.recol, key:o.key || ''}), [qx, qy] = proj(L, o.x, o.y, o.z ?? world.hb(o.x, o.y)); return {o, e, x:px - (qx - e.ax), y:py - (qy - e.ay), depth:o.x + o.y}; }).sort((a, b) => b.depth - a.depth);
    for (const d of ds) if (opaqueAt(d.e, d.x, d.y) || (d.o.pickR && Math.abs(d.x - d.e.ax) < d.o.pickR*L.S && Math.abs(d.y - d.e.ay) < d.o.pickR*L.S)) return d.o;
    if (!L.objs || L.ver !== objVersion) index(L); const cands = [...visibleStatics(L, {x0:px - 1, x1:px + 1, y0:py - 1, y1:py + 1})].filter(o => o.kind === 'b' || o.pickable).sort((a, b) => b.depth - a.depth);
    for (const o of cands){ const e = spriteOf(o, L.S), r = o.r[L.li]; if (opaqueAt(e, px - r[0], py - r[1])) return o; } return null; };
  // ---- camera
  const setStep = (st, sx, sy) => { st = clamp(st, 0, STEPS.length - 1); if (st === cam.step) return; const before = sx !== undefined ? pickGround(sx, sy) : null; cam.step = st;
    if (before){ const [qx, qy] = toScreen(before[0], before[1], before[2]); panBy(sx - qx, sy - qy); } };
  const panBy = (dxs, dys) => { const L = lv(), z = zf(), dpx = -dxs/z, dpy = -dys/z; // level pixels → world: dx - dy = dpx/S, (dx + dy)/2 = dpy/S (ground plane)
    const a = dpx/L.S, b = 2*dpy/L.S; cam.x = clamp(cam.x + (a + b)/2, -40, W + 40); cam.y = clamp(cam.y + (b - a)/2, -40, D + 40); };
  const centreOn = (x, y) => { cam.x = x; cam.y = y; };
  return {cam, steps:STEPS, levels:LEVELS, frame, work, pick, pickGround, toScreen, toLevel, setStep, panBy, centreOn, dyn, overlays, addStatic, removeStatic, scr, lv, zf, proj, queue,
    resize:(w, h) => { canvas.width = w; canvas.height = h; }, invalidateAll:() => { objVersion++; for (const L of LEVELS) for (const t of L.tiles.values()) t.dirty = true; }}; }
globalThis.Render = {create, STEPS};
})();
