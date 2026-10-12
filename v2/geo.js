/* Jurafrackers 2.0 — the underground. One 3D model for the whole block and beyond: layer boundaries that vary across the
   block, normal faults as tilted planes, karst water in the Malm, warm water in the Muschelkalk, salt and anhydrite, the
   Permo-Carboniferous trough with its coal, and granite below. Every section, in any direction, cuts the same rock, so two
   lines that cross agree where they cross. Underground distances are the map's times K (the valley is drawn small). */
(function(){
'use strict';
const K = 3;   // one metre on the map is three metres underground
const ROCK = {SOIL:0, LIME:1, WATER:2, MARL:3, HARD:4, WARM:5, FAULT:6, GRANITE:7, SALT:8, SAND:9, COAL:10};
const RNAME = ['topsoil', 'Malm limestone', 'karst water', 'marl and clay', 'dolomite', 'Muschelkalk aquifer', 'fault zone', 'granite', 'salt and anhydrite', 'sandstone', 'shale and coal'];
const RSHORT = ['soil', 'Malm', 'karst', 'marl', 'dolomite', 'Muschelkalk', 'fault', 'granite', 'salt', 'sandstone', 'coal'];
const IMP = [2, 6, 3, 3, 8, 5, 2, 9, 7.5, 5, 3];               // acoustic impedance: what reflection seismic responds to
const RCOL = ['#7a5a3a', '#c9b48a', '#4f86b8', '#8f8a6a', '#9a9ca2', '#5f97c9', '#8b4a41', '#c49a96', '#e4e0d8', '#c27b4f', '#4a4a50'];
const RSPEED = [1200, 1100, 800, 1200, 550, 1000, 500, 600, 800, 900, 700];   // metres a month at the bit
const PERM = [45, 60, 70, 45, 110, 70, 90, 100, 80, 80, 90];                 // bits, mud and cuttings per 100 m (k CHF), by rock
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, sm = t => t*t*(3 - 2*t);
const ih = (a, b, c) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0)/4294967296; };
function create(seed, world){
  const SI = (seed % 99991) | 0, h = (a, b, c) => ih(a, b, Math.imul(c | 0, 7919) + SI + 31337);
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = h(xi, yi, s), b = h(xi + 1, yi, s), c = h(xi, yi + 1, s), d = h(xi + 1, yi + 1, s); return a + (b - a)*fx + (c - a)*fy + (a - b - c + d)*fx*fy; };
  const vn3 = (x, y, z, s) => { const zi = Math.floor(z), fz = sm(z - zi); return vn(x, y, s + zi*13)*(1 - fz) + vn(x, y, s + (zi + 1)*13)*fz; };
  const rnd = (i, k) => h(i, k, 777);
  // ---- layer boundaries (metres below the ground) as functions of the underground position
  const strata = (X, Y) => { const soil = 40 + 30*vn(X/400, Y/400, 1), lime = 420 + 130*vn(X/900, Y/900, 2), marl = lime + 380 + 80*vn(X/700, Y/700, 3) + 340*vn(X/3200 + 3, Y/3200, 15);
    const aqHere = vn(X/700, Y/700, 6) > 0.25, aq = marl + 100 + 80*vn(X/500, Y/500, 5), salt = aq + 120 + 60*vn(X/600, Y/600, 4), sand = salt + 30 + 30*vn(X/800, Y/800, 14);
    const trough = Math.max(0, 850*vn(X/2200, Y/2200, 7) - 100); return {soil, lime, marl, aq, aqHere, salt, sand, gran:sand + trough}; };
  // ---- normal faults: tilted planes. At depth d the trace lies d/tan(dip) further along the dip direction; one side sits lower
  const FAULTS = []; { const n = 4 + Math.floor(rnd(1, 1)*2); for (let i = 0; i < n; i++){ const a = rnd(i, 2)*Math.PI, X0 = (0.1 + 0.8*rnd(i, 3))*world.W*K, Y0 = (0.1 + 0.8*rnd(i, 4))*world.D*K, dip = (58 + 22*rnd(i, 5))*Math.PI/180;
    FAULTS.push({id:i, nx:-Math.sin(a), ny:Math.cos(a), X0, Y0, cot:1/Math.tan(dip), thr:(rnd(i, 6) - 0.5)*320, w:30 + 30*rnd(i, 7), name:'F' + (i + 1)}); } }
  const faultS = (f, X, Y, d) => (X - f.X0)*f.nx + (Y - f.Y0)*f.ny - d*f.cot + 60*(vn(d/400 + f.id*7, (X*f.ny - Y*f.nx)/800, 11) - 0.5);
  // ---- springs: one above every settlement, where the karst comes out. Protection zones around them.
  const springs = []; { const W = world, homes = [['town', ...W.uphill(W.town[0], W.town[1], 40)], ...W.villages.map((v, i) => [i, ...W.uphill(v[0], v[1], 30)])];   // uphill of each settlement
    for (const [home, x0, y0] of homes){ let best = null; for (let k = 0; k < 200 && !best; k++){ const a = rnd(k, 50 + String(home).length)*Math.PI*2, r = 20 + k*0.6, x = clamp(x0 + Math.cos(a)*r, 12, W.W - 12), y = clamp(y0 + Math.sin(a)*r, 12, W.D - 12);
        if (!W.probe(x, y, 6) && !W.roadNear(x, y, 4) && Math.abs(W.stream.streamV(x, y)) > W.stream.hw(x) + 6) best = [x, y]; } best = best || [x0, y0]; springs.push({home, x:best[0], y:best[1], lvl:0}); } }
  const zoneAt = (x, y) => { let z = 0; for (const s of springs){ const d = Math.hypot(s.x - x, s.y - y); if (d < 10) z = Math.max(z, 2); else if (d < 30) z = Math.max(z, 2); else if (d < 75) z = Math.max(z, 1); } return z; };   // 2: inner zones (no drilling), 1: outer zone (sealed pad)
  // ---- the rock at a point (underground metres, depth below ground)
  const rockAt = (X, Y, d) => { if (d < 0) return -1; let shift = 0, inFault = false; for (const f of FAULTS){ const s = faultS(f, X, Y, d); if (s > 0) shift += f.thr; if (Math.abs(s) < f.w/2) inFault = true; }
    const st = strata(X, Y), dd = d - shift; let t;
    if (d < st.soil) t = ROCK.SOIL;
    else if (dd < st.lime){ t = ROCK.LIME; if (d > 60 && dd < st.lime - 30 && vn3(X/260, Y/260, d/90, 8) > 0.72) t = ROCK.WATER; else if (vn3(X/240, Y/240, d/80, 9) > 0.82) t = ROCK.HARD; }
    else if (dd < st.marl) t = ROCK.MARL; else if (dd < st.aq) t = st.aqHere ? ROCK.WARM : ROCK.HARD; else if (dd < st.salt) t = ROCK.SALT; else if (dd < st.sand) t = ROCK.SAND; else if (dd < st.gran) t = ROCK.COAL; else t = ROCK.GRANITE;
    if (inFault && t !== ROCK.SOIL) t = ROCK.FAULT;
    for (const s of springs){ const dx = (X - s.x*K)/260, dy = (Y - s.y*K)/260, dz = (d - 160)/70; if (dx*dx + dy*dy + dz*dz < 1 && d > st.soil) t = ROCK.WATER; }
    return t; };
  // temperature: about 42 °C a kilometre through the sediments, 27 °C a kilometre in the granite below; a little local warmth
  const geoT = d => 11 + 0.042*Math.min(d, 1500) + 0.027*Math.max(0, d - 1500);
  const tempAt = (X, Y, d) => Math.round(geoT(d) + 6*(vn(X/1400, Y/1400 + d/600, 12) - 0.5));
  // hidden quality: how much water a well gives (aquifer) or a stimulated volume carries (granite), 0..1. Fault zones help.
  const permAt = (X, Y, d) => clamp(vn(X/600, Y/600 + d/800, 13)*1.2 - 0.15 + (FAULTS.some(f => Math.abs(faultS(f, X, Y, d)) < 300) ? 0.25 : 0), 0, 1);
  const faultNear = (X, Y, d, r) => FAULTS.find(f => Math.abs(faultS(f, X, Y, d)) < (r || 400));
  // ---- the 1970s: a petroleum campaign left a few straight lines on paper, north–south and east–west, with gaps
  const legacy = []; { const n = 3 + Math.floor(rnd(9, 9)*2); for (let i = 0; i < n; i++){ const ns = i % 2 === 0, pos = (0.18 + 0.64*rnd(i, 21))*(ns ? world.W : world.D);
    const a = ns ? [pos, -10] : [-10, pos], b = ns ? [pos, world.D + 10] : [world.W + 10, pos], gaps = []; for (let k = 0; k < 2 + Math.floor(rnd(i, 22)*3); k++){ const s = rnd(i, 23 + k); gaps.push([s, s + 0.04 + 0.08*rnd(i, 30 + k)]); }
    legacy.push({id:'L' + i, name:'JU-7' + (1 + i % 3) + '-' + String(2 + i*3).padStart(2, '0'), a, b, ns, gaps, legacy:true}); } }
  return {K, ROCK, RNAME, RSHORT, RCOL, IMP, RSPEED, PERM, strata, rockAt, tempAt, geoT, permAt, faults:FAULTS, faultS, faultNear, springs, zoneAt, legacy, vn, h}; }

/* ---- a section: the rock under a line, from u0 to u1 (underground metres along the line from its start), 0..5000 m deep.
   What is known decides what is drawn: the 1970s paper, the survey's seismic image, the wells' logs; the rest is grey. */
const SEC = {W:720, H:420, TOP:46, DMAX:5000};
function sectionCanvas(geo, line, u0, u1, known, opts){ opts = opts || {}; const c = document.createElement('canvas'), Wp = SEC.W, Hp = SEC.H, top = SEC.TOP, g = c.getContext('2d'); c.width = Wp; c.height = Hp;
  const ux = i => u0 + (u1 - u0)*(i + 0.5)/Wp, dz = j => (j - top + 0.5)/(Hp - top)*SEC.DMAX, at = u => [line.ax + line.ex*u, line.ay + line.ey*u];   // underground X, Y of a point along the line
  const img = g.createImageData(Wp, Hp), px = img.data, set = (i, j, r, gg, b) => { const o = (j*Wp + i)*4; px[o] = r; px[o + 1] = gg; px[o + 2] = b; px[o + 3] = 255; };
  // the rock column of every pixel column (sampled every 10 m)
  const cols = []; for (let i = 0; i < Wp; i++){ const [X, Y] = at(ux(i)), col = new Uint8Array(501); for (let k = 0; k <= 500; k++) col[k] = geo.rockAt(X, Y, k*10); cols.push(col); }
  const rk = (i, d) => cols[clamp(i, 0, Wp - 1)][clamp(Math.round(d/10), 0, 500)];
  // reflectivity traces for the seismic image (first pass: blurry and noisy; second pass: sharp)
  const trace = (i, q) => { const tr = new Float32Array(Hp), wav = q >= 2 ? [-0.4, 0, 1, 0, -0.4] : [-0.25, -0.35, 0, 0.6, 1, 0.6, 0, -0.35, -0.25], half = (wav.length - 1)/2, raw = new Float32Array(Hp);
    let prev = geo.IMP[rk(i, dz(top))]; for (let j = top + 1; j < Hp - 1; j++){ const t = rk(i, dz(j + 1)), fz = t === geo.ROCK.FAULT, zz = fz ? prev : geo.IMP[t]; raw[j] = fz ? (geo.h(i, j, 90 + q) - 0.5)*0.5 : (zz - prev)*0.35*(t === geo.ROCK.COAL && prev !== geo.IMP[geo.ROCK.COAL] ? 3 : 1); if (!fz) prev = zz; }
    const noise = q >= 2 ? 0.18 : 0.55; for (let j = top; j < Hp; j++){ let a = 0; for (let k = 0; k < wav.length; k++){ const jj = j + k - half; if (jj >= top && jj < Hp) a += raw[jj]*wav[k]; } tr[j] = a + (geo.h(i >> 2, j >> (q >= 2 ? 0 : 1), 70 + q) - 0.5)*noise*(1 + (j - top)/Hp) + (q >= 2 ? 0 : (geo.vn(i/30, j/6, 80) - 0.5)*0.5); } return tr; };
  const tq = new Map(); const traceOf = (i, q) => { const k = i*4 + q; if (!tq.has(k)) tq.set(k, trace(i, q)); return tq.get(k); };
  for (let i = 0; i < Wp; i++){ const u = ux(i), kq = known(u);    // 0 nothing, 1 the 1970s paper, 2 first pass, 3 second pass
    for (let j = top; j < Hp; j++){ const d = dz(j);
      if (kq.q >= 2){ const q = kq.q - 1, sm2 = q === 1 ? 2 : 1; let a = 0, n = 0; for (let k = -sm2; k <= sm2; k++){ a += traceOf(clamp(i + k, 0, Wp - 1), q)[j]; n++; } a /= n; const v = clamp(a*2.4, -1, 1), b = 150 - 120*v; set(i, j, clamp(b + 6, 0, 255), clamp(b + 2, 0, 255), clamp(b - 4, 0, 255)); }
      else if (kq.q === 1){ const paper = 222 - 10*geo.h(i >> 1, j >> 1, 61); set(i, j, paper, paper - 8, paper - 30); }
      else { const v = 118 + 6*geo.h(i >> 2, j >> 2, 62); set(i, j, v, v + 2, v + 4); } } }
  g.putImageData(img, 0, 0);
  // the 1970s drawing: hand-drawn boundaries where the paper is, with gaps and old handwriting
  g.save(); g.strokeStyle = 'rgba(60,46,30,.75)'; g.lineWidth = 1.2; const bounds = ['lime', 'marl', 'aq', 'salt', 'gran'];
  for (const bk of bounds){ g.beginPath(); let pen = false; for (let i = 0; i < Wp; i += 2){ const u = ux(i), kq = known(u); if (kq.q !== 1 || kq.gap){ pen = false; continue; } const [X, Y] = at(u), st = geo.strata(X, Y), d = st[bk] + 30*(geo.vn(i/40, bounds.indexOf(bk), 63) - 0.5), y = top + d/SEC.DMAX*(Hp - top);
      if (!pen){ g.moveTo(i, y); pen = true; } else g.lineTo(i, y); } g.stroke(); }
  g.restore();
  // the surface: the ground along the line and the buildings on it, a band above the rock
  g.fillStyle = '#e9eef0'; g.fillRect(0, 0, Wp, top); const prof = []; for (let i = 0; i < Wp; i++){ const [X, Y] = at(ux(i)), x = X/geo.K, y = Y/geo.K, inMap = x >= 0 && y >= 0 && x <= opts.W && y <= opts.D, hz = inMap ? opts.hb(x, y) : null; prof.push(hz); }
  const hs = prof.filter(v => v !== null), zmin = Math.min(...hs, 0), zmax = Math.max(...hs, 1), hy = v => top - 4 - (v - zmin)/(zmax - zmin + 1e-6)*(top - 18);
  g.fillStyle = '#8fae62'; for (let i = 0; i < Wp; i++){ if (prof[i] === null) continue; const y = hy(prof[i]); g.fillRect(i, y, 1, top - y); }
  if (opts.things) for (const t of opts.things){ const i = Math.round((t.u - u0)/(u1 - u0)*Wp); if (i < 0 || i >= Wp || prof[i] === null) continue; const y = hy(prof[i]); g.fillStyle = t.c || '#efe6d4'; g.fillRect(i - t.w/2, y - t.h, t.w, t.h); if (t.roof){ g.fillStyle = t.roof; g.fillRect(i - t.w/2 - 1, y - t.h - 2, t.w + 2, 3); } }
  g.fillStyle = '#2a2d33'; g.fillRect(0, top - 1, Wp, 1);
  // depth scale
  g.font = '9px Silkscreen, monospace'; g.fillStyle = 'rgba(30,32,36,.75)'; for (let d = 1000; d < SEC.DMAX; d += 1000){ const y = top + d/SEC.DMAX*(Hp - top); g.fillRect(0, y, 6, 1); g.fillText(d/1000 + ' km', 8, y + 3); }
  return {canvas:c, u0, u1, top, H:Hp, W:Wp, dOf:y => (y - top)/(Hp - top)*SEC.DMAX, yOf:d => top + d/SEC.DMAX*(Hp - top), xOf:u => (u - u0)/(u1 - u0)*Wp, uOf:x => u0 + x/Wp*(u1 - u0), rk}; }
globalThis.Geo = {create, sectionCanvas, SEC, K};
})();
