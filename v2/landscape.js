/* A test landscape composed only of the locked assets: hills and forest, the railway, the campus, the stream, the valley road,
   the village, the town, a farm with pastures, fields and a deep rig with a protest on its way. */
const SCENE = ART.compose(280, 210, (H, K) => {
  const r = K.rng(42), F = H.F, rect = (x0, y0, x1, y1, c) => F([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c);
  const tree = (x, y, kind, s) => { const f = kind === 's' ? K.spruce : kind === 'f' ? K.fruitTree : K.beech, h = (kind === 's' ? 10.5 : kind === 'f' ? 4.2 : 7.6)*(s || 1);
    H.SD(x - 2.6*(s || 1), x + 2.6*(s || 1), y - 2.6*(s || 1), y + 2.6*(s || 1), 0, h, (px, py, pz) => f(px - x, py - y, pz, s), {step:0.12}); };
  const busy = []; const free = (x, y, rr) => busy.every(([a, b, c, d]) => x < a - rr || x > c + rr || y < b - rr || y > d + rr);
  const put = (name, x, y) => { const m = K.M.find(q => q.n === name); K.place(H, name, x, y); busy.push([x, y, x + m.W, y + m.D]); };
  // ground: meadow, the hills' darker grass, fields
  rect(0, 0, 280, 210, '#9fb87f'); rect(0, 0, 280, 30, '#8aa66e');
  rect(8, 40, 60, 62, '#d9b85a'); for (let y = 41; y < 62; y += 1.4) rect(8, y, 60, y + 0.3, '#c4a24a');
  rect(8, 66, 52, 92, '#8a6a4a'); for (let x = 9; x < 52; x += 1.2) rect(x, 66, x + 0.4, 92, '#76583c');
  // railway along the top of the valley
  rect(0, 31, 280, 35, '#a39d8e'); for (const y of [32.2, 33.8]) H.L([[0, y, 0.15], [280, y, 0.15]], '#6a6e72', 0.35);
  // stream, valley road, side roads
  const pts = Array.from({length:57}, (_, i) => [i*5, 99 + Math.sin(i*0.45)*2.5]);
  F([...pts.map(([x, y]) => [x, y - 2.4]), ...pts.slice().reverse().map(([x, y]) => [x, y + 2.4])], '#7d8f6a'); F([...pts.map(([x, y]) => [x, y - 1.7]), ...pts.slice().reverse().map(([x, y]) => [x, y + 1.7])], '#5f8fb0');
  rect(0, 111.4, 280, 118.6, '#a39d8e'); rect(0, 111.8, 280, 118.2, '#6b7075'); for (let x = 1; x < 280; x += 4) rect(x, 114.9, x + 2, 115.1, '#f2f0e8');
  rect(146.8, 36, 153.2, 112, '#a39d8e'); rect(147.2, 36, 152.8, 112, '#6b7075');                          // road up to the campus and the station
  rect(152, 88.4, 272, 92.6, '#6b7075');                                                                 // campus street
  rect(87.2, 118, 92.8, 206, '#6b7075'); rect(36, 145.2, 135, 149.8, '#6b7075');                         // village streets
  rect(146, 145.2, 272, 149.8, '#6b7075'); rect(206.2, 118, 210.8, 200, '#6b7075');                     // town streets
  rect(104.6, 74, 109.4, 112, '#a99a7a');                                                                // dirt access road to the rig
  H.B(145.8, 95.2, 0.15, 8.4, 8.6, 0.45, '#a19d92', {top:'#6b7075'}); for (const x of [146, 154]) H.L([[x, 95.4, 0.9], [x, 103.6, 0.9]], '#8a9198', 0.5);
  // the rig site
  put('Deep rig on its pad', 92, 48); put('Site container', 118, 50); put('Protest camp', 64, 66);
  K.place(H, 'Mud tank', 118, 60); K.place(H, 'Casing stack', 118, 66); K.place(H, 'Flare stack', 118, 72); busy.push([118, 60, 127, 76]);
  // campus
  put('Bureau', 160, 44); put('Depot', 182, 42); put('Maison de la géothermie', 208, 44); put('Centre de compétences', 160, 66); put('Atelier', 182, 66); put('Substation (utility)', 236, 42); put('Utility office', 228, 66);
  K.place(H, 'High-voltage pylon', 258, 64); busy.push([258, 64, 266, 72]);
  put('Railway station', 140, 22);
  // village
  put('Church', 58, 152); put('Mairie', 94, 124); put('Village shop', 72, 124); put('School', 96, 166); put('Fountain', 80, 136); put('Chapel', 40, 125);
  for (const [x, y, two] of [[40, 166, 0], [52, 178, 1], [66, 186, 0], [40, 190, 1], [112, 128, 0], [114, 151, 1], [118, 186, 0], [96, 188, 0], [76, 168, 1]]) put(two ? 'House, two storeys' : 'House, small', x, y);
  // town
  put('Bank', 150, 125); put('Bourse du Jura', 170, 126); put('La Feuille de la Faille', 186, 124); put('Gendarmerie', 213, 124); put('Canton house', 234, 122);
  put('New quarter: coworking and sushi', 150, 154); put('Committee office', 173, 156); put('Villa', 238, 176); put('Sports hall (gift)', 214, 156);
  // farm and pastures
  put('Farm', 6, 124); rect(4, 150, 34, 204, '#a3bc82'); for (const y of [150, 204]) H.L([[4, y, 0.8], [34, y, 0.8]], '#8a6a4a', 0.4); for (const x of [4, 34]) H.L([[x, 150, 0.8], [x, 204, 0.8]], '#8a6a4a', 0.4); busy.push([4, 150, 34, 204]);

  // more texture: hedges along the fields, a pond, a second farm with an orchard, a wood, the lender's vans, a bus stop, a wooden power line
  for (const [x, y] of [[8, 38.4], [20, 38.4], [32, 38.4], [44, 38.4], [8, 93.2], [20, 93.2], [32, 93.2], [44, 93.2]]) K.place(H, 'Hedge', x, y);
  K.place(H, 'Pond', 40, 196); busy.push([40, 196, 48, 202]);
  put('Farm', 250, 186 - 18 + 2); for (let i = 0; i < 9; i++){ const x = 250 + (i % 3)*7, y = 194 + Math.floor(i/3)*5; if (y < 209) tree(x, y, 'f'); }
  K.place(H, 'Forest patch', 118, 192);
  for (let i = 0; i < 3; i++) K.place(H, 'Black van (the lender)', 236 + i*6, 192.5);
  K.place(H, 'Bus stop', 92, 107.5); K.place(H, 'Hiking signpost', 145, 108); K.place(H, 'Power line (wooden poles)', 160, 118.6); K.place(H, 'Power line (wooden poles)', 180, 118.6);
  // trees: forests on the hills, trees along the stream and in the village, an orchard by the farm
  for (let i = 0; i < 170; i++){ const x = 2 + r()*276, y = 1 + r()*27; if (x > 136 && x < 166 && y > 18) continue; tree(x, y, r() < 0.75 ? 's' : 'b', 0.8 + r()*0.4); }
  for (let i = 0; i < 26; i++){ const x = 4 + r()*270, y = 92 + r()*14; if (x > 140 && x < 160) continue; if (Math.abs(y - (99 + Math.sin(x/5*0.45)*2.5)) < 3) continue; tree(x, y, 'b', 0.7 + r()*0.3); }
  for (const [x, y] of [[36, 128], [36, 136], [44, 132], [52, 136], [58, 128]]) if (free(x, y, 2)) tree(x, y, 'f');
  for (let i = 0; i < 40; i++){ const x = 36 + r()*236, y = 120 + r()*86; if (free(x, y, 3) && !(x > 86 && x < 94) && !(y > 144 && y < 151) && !(x > 205 && x < 212)) tree(x, y, r() < 0.3 ? 'f' : 'b', 0.6 + r()*0.3); }
  for (let i = 0; i < 12; i++){ const x = 4 + r()*270, y = 36 + r()*52; if (free(x, y, 4) && !(x > 6 && x < 62 && y > 38 && y < 94) && !(x > 100 && x < 112) && !(x > 145 && x < 155) && !(x > 122 && x < 152)) tree(x, y, 'b', 0.8); }
  // animals
  [[8, 156], [16, 162], [22, 172], [10, 184], [26, 190]].forEach(([x, y], i) => H.SD(x, x + 3, y, y + 1, 0, 1.5, (px, py, pz) => K.cowM(i % 2 ? {graze:1} : {step:i % 3 - 1})(px - x, py - y, pz), {step:0.04}));
  [[18, 196], [20, 198], [24, 195], [14, 199], [28, 199]].forEach(([x, y], i) => H.SD(x, x + 1.4, y, y + 0.6, 0, 0.9, (px, py, pz) => K.sheepFn(i % 2 ? {graze:1} : {})(px - x, py - y, pz), {step:0.03}));
  [[30, 128], [31, 130], [29, 131.5]].forEach(([x, y], i) => H.SD(x, x + 0.5, y, y + 0.3, 0, 0.45, (px, py, pz) => K.chickFn(i ? {peck:1} : {}, i === 2 ? '#a0603a' : '#f4f2ec')(px - x, py - y, pz), {step:0.03}));
  [[44, 200], [49, 203]].forEach(([x, y], i) => H.SD(x, x + 3.2, y, y + 0.8, 0, 2.2, (px, py, pz) => K.horseFn(i ? {graze:1} : {step:1})(px - x, py - y, pz), {step:0.04}));
  // traffic on the valley road (east on the near lane, west on the far lane)
  K.place(H, 'Post bus', 120, 115.6); K.place(H, 'Company car (old 911)', 196, 112.6); K.place(H, 'Supply lorry', 236, 112.4); K.place(H, 'Tractor with manure spreader', 12, 76); K.place(H, 'Geologist\'s pickup', 112, 76); K.place(H, 'Police van', 66, 112.4); K.place(H, 'Regional train', 60, 32);
  // people: the march along the road towards the rig, police at the access road, villagers in the village, the campus, the town
  K.PROT.forEach((o, i) => K.figure(H, o, 18 + (i % 10)*2.6 + (i % 2)*0.8, 112.5 + Math.floor(i/10)*2.6, i % 2 ? {legs:['fwd', 'back'], armR:o.item === 'sign' || o.item === 'flag' ? 'up' : 'swingF'} : {legs:['back', 'fwd'], armR:o.item === 'sign' || o.item === 'flag' ? 'up' : 'swingB'}));
  for (let i = 0; i < 7; i++) K.turned(H, K.RIOT, 60, 111.6 + i*0.95, {armR:i % 3 === 1 ? 'strike' : 'down'}); K.place(H, 'Riot police bus', 64, 120);
  K.VILL.slice(0, 12).forEach((o, i) => K.figure(H, o, [84, 86, 79, 92, 64, 70, 100, 103, 120, 56, 45, 110][i], [142, 141, 139, 140, 147, 172, 150, 150, 182, 182, 160, 162][i], i % 3 ? K.POSE.walkA : null));
  K.place(H, 'Café terrace', 60, 136); K.place(H, 'Market stall with cheese seller', 102, 138); K.place(H, 'Pensioners on a bench', 84, 120);
  for (const [n, x, y] of [['The CEO', 158, 59], ['Geologist', 114, 72], ['Driller', 105, 62], ['Driller (woman)', 100, 70], ['Security guard', 106, 72], ['Association presenter', 214, 59], ['Journalist (La Feuille)', 190, 140], ['Police officer', 222, 140], ['Banker', 156, 140], ['Farmer', 28, 146]]) K.figure(H, K.M.find(m => m.n === n).o, x, y, null);
  K.place(H, 'Hiker', 120, 27); K.place(H, 'Dog walker', 128, 104); K.place(H, 'Kids playing', 106, 182); K.place(H, 'Cyclist', 260, 112.6);
});
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('bold 16px Silkscreen'), document.fonts.ready]) : Promise.resolve()).then(() => {
  const S = +(new URLSearchParams(location.search).get('s') || 3), c = document.getElementById('c'), W = SCENE.W, D = SCENE.D, pad = 60; c.width = Math.ceil((W + D)*S) + pad*2; c.height = Math.ceil((W + D)/2*S + 40*S) + pad*2;
  const g = c.getContext('2d'); g.fillStyle = '#2a2d30'; g.fillRect(0, 0, c.width, c.height);
  const t = Date.now(); const post = ART.draw(g, SCENE, 0, S, D*S + pad, 40*S + pad); post.forEach(f => f()); document.title += ' · ' + (Date.now() - t) + ' ms';
});
