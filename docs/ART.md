# Jurafrackers 2.0 — Art register

Phase 1 (look) is approved. All art lives in `v2/art.js` (`window.ART`): every model is built in code and drawn isometrically in four orientations. The old catalogue page (`v2/catalogue.html`) became too heavy to load and is no longer the place to review art; this file is the record of what exists and what was decided.

## Style rules (decided with the user)

- **Buildings:** blocks, gable and hip roofs, windows with frames and sills, plinths, tile lines. Cute, detailed, not bland. Nothing may stick through anything else; parts standing on a block are drawn right after it; steep back roof slopes are hidden behind their gables.
- **Vehicles, people, animals, trees, the F-35:** smooth volumes rendered pixel by pixel (per-pixel ray march, building light: top bright, south mid, east dark, a few tone steps, darker contour where something nearer covers). Pixelated, rounded, never cubes, never flat panels.
- **People:** realistic proportions (about 1.78 m), simple, **no faces** (they are tiny next to cars). Jointed: legs stand / walk / run / sit, arms swing, point, wave, forward, up, fist, strike, throw, shield, eye, ear, carry, hip, bars, mouth, sticks, push, lap. Carried things follow the hand.
- **Text:** only protest signs must be readable (crisp pixel plates: NON, STOP, EAU, JURA, OUI). Other lettering on buildings and big vehicles is decoration; small vehicles have none. Body text in windows stays Helvetica; titles Silkscreen.
- **Riot police:** full armour, **black helmets** with visor, shield and baton; lines hold, advance, strike, stand in two rows.
- **F-35:** after the user's three-view and photo: wide flat chined body, short light cone nose, big tinted bubble canopy with a hump behind, bulging intakes, trapezoid wings from mid-body, tailplanes past the nozzle, broad tails leaning out, sawtooth panels. It flies low (about 9–14 m) with its shadow and is not much bigger than a house on the map. A close formation of four crosses the map once, firing rockets at every rig; as many as needed.
- **Lender's vans:** black Mercedes Vito style (short sloping bonnet, raked windscreen, flat roof, tinted glass, sliding door), three of them.
- **Animals and trees move:** cows walk, graze, swish; sheep walk and graze; chickens walk and peck (three pixels); horses stand, walk, gallop, graze; dogs run; cats sit and walk; deer graze and leap; crows fly and land; trees sway in three frames. Winter: bare broadleaf trees, snow on spruces, bushes and ground.
- **Logos:** pixel art, drawn small and scaled with hard pixels. Game: Jurassic-Park-like emblem (arched fiery JURAFRACKERS on a dark ring, rig over Jura ridges on a glowing red-orange disc, 2.0) and a glowing wordmark. Association Géothermie-Helvetica: bold red GÉOTHERMIE, orange HELVETICA, red-to-orange wave (in the style of the national geothermal association). Company Énergie-Géo Switzerland SA: navy crescent with red swoosh, stacked navy name; Jura site-sign variant with red JURA and stripes (in the style of the deep-geothermal developer). Real marks are not copied one to one.

## Approved corrections, for reference

B02 depot fine; B03 glass pavilion and B28 farm without overlaps; B26/B29 brutalist bank; B31 Feuille's van beside the hall; B21 scaffolding; committee office with the rooftop banner "LE JURA SANS FRACKING"; ruins for a big quake (houses and farms collapse and smoke); Porsche 911 silver; Hilux double cab; blue vibro-trucks; Piranha 8×8 for the army; helicopter logical (pod, mast on the roof, boom from the back, skids under the cabin); stork chimney small.

## Register (numbers as last shown)

### Buildings

- B01 Bureau — Two storeys, the company plate over the door, a parking with five spaces, the flag.
- B02 Depot — Storage hall with two roller doors; casing on racks, pallets of mud and bits, drums.
- B03 Maison de la géothermie — The association on campus: a glass pavilion with a thin roof, a timber deck, courses inside.
- B04 Centre de compétences — Deep drilling, stimulation and the second survey pass. A mast with the seismometer link on the roof.
- B05 Atelier — Directional kit and maintenance: a high door, a crane rail, a BOP on the yard.
- B06 Site container — Office, changing room and supplies at each site.
- B07 Survey station — A trailer at the end of a survey line: recorder, antenna, solar panel. Its window holds the section.
- B08 Light rig on its pad — To about 2,200 m. Mast, doghouse, mud tanks, pipe rack.
- B09 Deep rig on its pad — To 5,000 m. Taller mast, generators, three mud tanks. Needs the Centre.
- B10 Capped wellhead — What stays when the rig leaves: valves on a concrete cellar, a fence.
- B11 Heat station — Heat exchanger and heat pumps; hot pipe out (red), cooled water back (blue).
- B12 Power plant — Turbine hall, the air cooler on stilts with six fans, working-fluid tanks. Electricity, 10 % of the heat.
- B13 Substation (utility) — Where the power line enters the grid. Without it, a plant cannot sell.
- B14 Utility office — Contracts and prices: heat per station, electricity for all plants.
- B15 House, small — Variations: wall colour, roof colour, shutters.
- B16 House, two storeys — Village house with the gable to the street.
- B17 Mairie — Gifts, wishes, promises, the fête. A clock turret and the flag.
- B18 Village shop — Rumours pinned to the board outside; leaflets against them.
- B19 Church — Nave and bell tower.
- B20 Church after a quake — Cracked walls, half the nave roof and the top of the tower gone, rubble, tape around it.
- B21 Church under repair — Scaffolding around the tower while it is rebuilt.
- B22 House, collapsed — After a very big quake: walls down, the roof on the floor, charred beams, smoke.
- B23 House, two storeys, collapsed — One corner still standing; the rest is rubble, smoking.
- B24 Farm, collapsed — The big roof came down on the barn; the silo broke; smoke for days.
- B25 Chapel — In the villages.
- B26 School — Education shifts the vote over the years. A gift: the sports hall next door.
- B27 Sports hall (gift) — The company name on the wall. Some like it, some call it buying children.
- B28 Farm — A Jura farmhouse under one huge roof, a silo, the manure heap. Farmers vote as a block.
- B29 Bank — Raw board-marked concrete, a heavy upper block on a recessed glass ground floor, slit windows.
- B30 Bourse du Jura — A glass cube with an LED ticker in the new quarter. Shares, announcements, buybacks. The federal office plate is next door.
- B31 La Feuille de la Faille — The old printing house: red brick, a sawtooth roof over the presses, the delivery van outside.
- B32 Gendarmerie — A 1970s police station: flat roof, a blue band, radio mast, two garages. The police come from here.
- B33 Canton house — Baroque stone house with a hipped slate roof and a central bay. Permits, the review, the archive, the vote. The federal office has its plate here.
- B34 Villa — On the knoll above the town. The lender lives here; his three black vans leave from here.
- B35 Committee office — The opposition's office, plastered with NON and STOP, a huge LE JURA SANS FRACKING banner on the roof. Debates take place here.
- B36 University field station (gift) — Seismologists, the precise poll, the deep reading. Costs the company each month.
- B37 Fountain — A village wish: restored once.
- B38 Railway station — The line along the top of the valley.
- B39 New quarter: coworking and sushi — Where the valley is no longer quite the valley.
- B40 Company information stand — Brochures and coffee in a village square.
- B41 Protest camp — Tents at the gate of a site. Burns the site after a warning unless cleared.
- B42 Burning barricade — Tyres on the road. The gendarmerie comes by itself.

### Vehicles

- V01 Company car (old 911) — The CEO's old silver 911: round headlights, sloping roof, wide hips. Not mentioned anywhere.
- V02 Geologist's pickup — Toyota-style double cab: four doors, black grille, a roll bar over the bed. Plants the prospect flags.
- V03 Supply lorry — Brings drilling supplies from the depot.
- V04 Low-loader with rig — Brings a rig to a pad and back; the mast lies folded on top.
- V05 Vibro-truck — Blue off-road vibrator: the steel base plate between the axles is pressed onto the road and shaken.
- V06 Tipper (builders) — Roads, pads, flattening, buildings.
- V07 Excavator
- V08 Post bus — Evening bus as a village gift.
- V09 Police car — From the gendarmerie.
- V10 Police van
- V11 Riot police bus — Shields, no batons.
- V12 Black van (the lender) — Three black Vito-like vans, slowly, from the villa. Tinted glass, no plates.
- V13 Tractor with manure spreader — The farmers' blockade.
- V14 Fire engine
- V15 Army truck — Only in the secret ending.
- V16 Piranha (8×8) — Swiss army 8×8 armoured personnel carrier: sloped nose, flat sides, small weapon station, camouflage. Only in the secret ending.
- V17 Police helicopter — Cabin with a glass nose and a blue band, engine and rotor mast on the roof, tail boom, ducted tail rotor, skids. The last resort.
- V18 F-35 — Unmistakably an F-35: wide flat body blending into the wings, short light cone nose, big bubble canopy with a hump behind, bulging intakes under it, broad trapezoid tails leaning out, lighter sawtooth panels. Only in the secret ending.
- V19 Regional train — Along the top of the valley.
- V20 Ambulance — Swiss style: white with a red and yellow chequered band.

### People

- P01 The CEO — Tall, grey at the temples, dark suit.
- P02 Suit (woman) — Lent by the association.
- P03 Suit (man)
- P04 Geologist — White hard hat, clipboard. Drives the pickup.
- P05 Driller — Orange coveralls with reflective bands, hard hat, beard, gloves, boots, pipe wrench.
- P06 Driller (woman)
- P07 Mud engineer
- P08 Water officer — Samples springs; green rubber boots.
- P09 Community liaison — Coffee with the neighbours.
- P10 Security guard
- P11 Seismologist — From the university station.
- P12 Plant operator
- P13 Villager (woman)
- P14 Villager (man), elderly — With a cane and a flat cap.
- P15 Farmer — Blue work jacket, rubber boots, a belly, a pitchfork.
- P16 Mayor — With the sash on fête days.
- P17 Protester with sign — Green parka, red beanie, yellow scarf, sign held up.
- P18 Protester with sign (2) — Yellow STOP sign.
- P19 Police officer
- P20 Riot police — Full armour, black helmet with visor, shoulder plates, shield and baton.
- P21 Journalist (La Feuille)
- P22 Banker
- P23 The lender — White suit, white hat with a black band.
- P24 Association presenter — Gives the slide show.
- P25 Soldier — Helmet, pack, rifle. Only in the secret ending.
- P26 Soldier with radio
- P27 Officer — Reads the evacuation order.
- P28 Soldier (woman)
- P29 Child

### Variations, poses, crowds

- C01 Protesters: 20 variations — Mixed ages and clothes; signs NON, STOP, EAU, JURA; Jura flags; raised fists.
- C02 Villagers: 20 variations — Everyday people for the villages and the town.
- C03 Black bloc: 10 variations — Only in the riots before the secret ending: hoods, masks, flags, flares, stones.
- C04 The lender's men: 4 variations — They set buildings ablaze: torches and jerrycans.
- C05 Poses: The CEO
- C06 Poses: Suit (woman)
- C07 Poses: Suit (man)
- C08 Poses: Geologist
- C09 Poses: Driller
- C10 Poses: Driller (woman)
- C11 Poses: Mud engineer
- C12 Poses: Water officer
- C13 Poses: Community liaison
- C14 Poses: Security guard
- C15 Poses: Seismologist
- C16 Poses: Plant operator
- C17 Poses: Villager (woman)
- C18 Poses: Villager (man), elderly
- C19 Poses: Farmer
- C20 Poses: Mayor
- C21 Poses: Protester with sign
- C22 Poses: Protester with sign (2)
- C23 Poses: Police officer
- C24 Poses: Riot police
- C25 Poses: Journalist (La Feuille)
- C26 Poses: Banker
- C27 Poses: The lender
- C28 Poses: Association presenter
- C29 Poses: Soldier
- C30 Poses: Soldier with radio
- C31 Poses: Officer
- C32 Poses: Soldier (woman)
- C33 Poses: Child
- C34 Poses: Black bloc
- C35 Poses: The lender's men
- C36 Riot police line: holding — Shoulder to shoulder, shields in front.
- C37 Riot police line: advancing
- C38 Riot police line: batons — Batons raised; some step out of the line.
- C39 Riot police: two rows — A second row behind with batons ready.
- C40 Protesters at a barricade — Behind tyres, pallets and a bin.
- C41 Black bloc at a burning barricade
- C42 Stand-off: crowd, barricade, police — For the riot before the secret ending.
- C43 The lender's men set a house ablaze — Late at night. The vans wait with the engines running.

### Life in the valley

- L01 Hiker — Backpack and walking pole, on the yellow-signposted paths.
- L02 Hiker (woman)
- L03 Cyclist — On the valley road.
- L04 Road cyclist — Lycra and a white helmet.
- L05 Jogger
- L06 Dog walker — With a dog on a red leash.
- L07 Kids playing — One with a ball, one running, one waving.
- L08 School children — Bright backpacks, on the way to the school.
- L09 Angler — By the stream; sees the contamination first.
- L10 Postman — Yellow cap and stripe; letters and parcels.
- L11 Woman with a pram
- L12 Pensioners on a bench — They watch the trucks go by.
- L13 Brass band (fanfare) — At the fête; plays at openings if the mood is good.
- L14 Churchgoers — Sunday morning.
- L15 Priest — Long black cassock. The church after the quake is his.
- L16 Market stall with cheese seller — Tête de Moine and the rest. Stands at the market square.
- L17 Café terrace — The waiter brings coffee; gossip about the drilling.
- L18 Hay making — Round bales in the fields in summer.
- L19 Road worker — Builds the roads you order.
- L20 Road worker with jackhammer
- L21 Surveyor with tripod — Pegs out pads and roads.
- L22 Electrician on a pylon — Hooks a new plant to the grid.
- L23 Delivery driver
- L24 Firefighters with a hose — Called out for fires, barricades and quake ruins.
- L25 Paramedics — Carry a stretcher between them.
- L26 TV camera operator — National TV comes when it gets ugly.
- L27 Sound engineer with boom
- L28 Counter-protesters (OUI) — For the project: jobs, cheap heat. Fewer, but loud.
- L29 Drummers in the march
- L30 Police negotiator — Talks first. Megaphone, yellow vest.

### Nature

- N01 Beech (broadleaf tree) — Village and valley trees.
- N02 Spruce — The Jura forests are mostly spruce and fir.
- N03 Fruit tree — Orchards around the farms.
- N04 Bush
- N05 Hedge — Field borders.
- N06 Forest patch — Placed in clusters on the hills.
- N07 Rock outcrop — Limestone, as everywhere in the Jura.
- N08 Pond — Where the farmers water the cows.
- N09 Stream — The valley stream; contamination shows here first.
- N10 Trees in the wind: beech and spruce (left, still, right) — Three frames each; leaves and tops move.
- N11 Spruce in snow
- N12 Bare beech in snow — Broadleaf trees lose their leaves in winter.
- N13 Bare fruit tree in snow
- N14 Bush in snow
- N15 Forest patch in snow — Winter on the Jura ridges.

### Animals

- A01 Cow (Simmental) — Red and white, as in the Jura.
- A02 Cow, lying
- A03 Sheep
- A04 Chicken — Three pixels.
- A05 Chicken (brown)
- A06 Cow in motion: walk, walk, graze, tail — Cows graze and wander slowly in their pasture.
- A07 Sheep in motion: walk, walk, graze
- A08 Chickens: walk, peck — They peck around the farmyard.
- A09 Franches-Montagnes horse: stand, walk, gallop, graze — The Jura's own breed: bay, black mane and legs, white blaze.
- A10 Dog: stand, run
- A11 Cat: sit, walk
- A12 Deer at the forest edge: stand, graze, leap — Leave when the rigs come.
- A13 Crows: flying, flying, on the ground — A flock lifts off when a survey truck shakes the ground.
- A14 Stork on a chimney — Storks nest on village chimneys in spring.

### Ground, roads, lines

- G01 Road, straight — Laid on a grid; 4 m of asphalt with a gravel shoulder.
- G02 Road, crossing
- G03 Road, T-junction
- G04 Road, bend
- G05 Dirt track — To farms, the villa and sites: two ruts and grass between.
- G06 Gravel pad — Under every site and rig.
- G07 Heat pipe, above ground — Insulated supply and return, on short supports.
- G08 Heat pipe, buried — Fresh trench, yellow marker posts.
- G09 Power line (wooden poles) — Village supply.
- G10 High-voltage pylon — The grid line across the valley; the substation hooks in here.
- G11 Fence — Pastures.
- G12 Street lamp
- G13 Bus stop — For the post bus gift.
- G14 Hiking signpost — Yellow, of course.
- G15 Bridge
- G16 Meadow — With flowers.
- G17 Wheat field
- G18 Ploughed field
- G19 Pasture with cows and sheep — How they appear on the map, at the same scale.

### Site items and effects

- E01 Prospect flag — Planted by the geologist; marks a prospect.
- E02 Survey line — Geophones laid along a road during a survey.
- E03 Flare stack — Burns off gas from a kick; drilling goes on.
- E04 Mud tank
- E05 Casing stack — Steel casing, as delivered to the pad.
- E06 Fire — Things set ablaze by an angry crowd.
- E07 Smoke column — Over ruins after a big quake, over burnt sites.
- E08 Rocket — Fired at the rigs from the formation.
- E09 Explosion — A rocket hit.
- E10 Destroyed rig — What is left after the formation passes.
- E11 Crater

### Air and scale

- X01 Scale check: F-35 flying low over a house, a car, a driller and cows — All at the same scale. The jet at 12 m: its shadow on the ground, the jet above it.
- X02 F-35 formation (four, close) — Fly once across the map, low, firing at every rig. As many as needed.

### Logos

- Game emblem, game wordmark, association, company, company Jura site sign — `ART.logos.game / word / association / company(scale, jura)`.
