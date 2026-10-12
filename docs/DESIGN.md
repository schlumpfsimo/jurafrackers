# Jurafrackers 2.0 — the new build

A complete rebuild in a new file. Everything that worked in the old game (geology, drilling trouble, water, quakes, moods, voter groups, the vote, endings, texts) is carried over; the map, the interface and how the player acts are rebuilt from scratch. This document is the reference for every build step.

Standing rules (unchanged):
- Company: **Énergie-Géo Switzerland SA**. Association: **Géothermie-Helvetica**. Newspaper: **La Feuille de la Faille**.
- No real places except cantons (Jura, Bern, Zurich). All other names are invented, in the dry punning style (Grand-Fracas, Saint-Calorie…).
- Never show odds. Dry humour. Text clear but not in your face; no tutorial voice ("click", "its card", "left panel") in world text.
- Keep the secret annexation ending with the F-35s and the lender's raid.

---

## 1. Look

**Map**
- Three times the current area. Scroll and zoom; zoomed out, the whole block is visible.
- Higher resolution throughout; every building redrawn with more detail.
- Real topography over the whole block: rolling hills, valleys, slopes. Low enough to always see the block. The cut faces of the block show the rock layers.
- Organic: villages, forests, hills, the river. Gridded: roads, pipes, power lines, survey lines (north–south or east–west, never diagonal).
- A very faint grid shows the directions; survey lines (own and 1970s) are drawn stronger on top.
- Building anywhere is allowed; the ground is flattened, which costs money and is done in the same move as the access road.

**Villages**
- Prettier and organic, but hanging on the road grid. Civic buildings face the road in front; houses loose behind; nothing overlaps.
- Buildings carry enamel plates (never confused with protest banners).

**Vehicles** (all drive on roads; a bit faster than now but still natural; the speed buttons are for the rest)
- The CEO's company car: an old Porsche 911. Never named or mentioned anywhere.
- The geologist's Hilux. Lorries, the low-loader, vibro-trucks, builders, buses.
- Police come from the police station. The lender's three black vans come slowly from the villa.

**Interface style**
- Less Windows 95, more "office": clean panels, soft paper and card tones, light borders, a touch of pixel character only.
- Logo: **Jurafrackers 2.0**, a cool pixelated logo, top left, and large on the title screen.
- Fonts: a readable pixel font for titles, map labels and the header; Helvetica for body text in windows.

---

## 2. Interface

**The header is the only fixed interface. It shows information; it never operates anything.**

Small header:
- Cash, share price, market value, debt.
- A live meter of the current net gain or loss (running in real time).
- Heat and electricity production, the date, the months to the vote, the vote forecast.

Expanded header (drops down below; **expanding pauses the game**):
- Every monthly cost and every income line, each with the building it belongs to, e.g. "Salaries (Bureau)", "Standby (light rig, Champ-Long)", "Heat sales (station near Val-Fumant)". Clicking a line jumps to that building.
- Loans with rate and payment, grants with conditions and deadlines, contracts, share chart and announcements.
- All news (La Feuille de la Faille headlines and wire), with details.

**Everything else is a pop-up window at a building.** Clicking a building opens its window; operations happen there. No side panel, no dragging objects onto the map, no toolbar.

**Markers on the map**
- **!** — something waits for an answer or an action (a request, a problem at a rig, a crisis).
- **?** — something to learn or look into (a rumour, a hint).
- Clicking either opens its pop-up at that place.

**Pausing**
- The game never pauses for decisions. Only an attack warning (two weeks ahead: a fire, the raid) pauses it. Expanding the header pauses it.

---

## 3. Time and money

- The game runs in days internally; everything is shown per month.
- Monthly items that cannot be split: leasing a rig, staff wages, building upkeep, membership, loan payments. A rig leased for a few days costs the full month.
- Daily items: only things that run by the day (drilling day rate while a rig drills, fuel, material in use). A daily figure is shown only where it helps a decision (e.g. "CHF 20k a day while drilling" when committing a phase). Everywhere else, monthly.

---

## 4. Start and learning

1. The game opens with the logo and the canton's concession.
2. The player starts with only the company car, drives it and chooses where to build the Bureau.
3. While the Bureau is being built, the association shows a **slide show**: the basics only (survey, drill, heat or power, the valley votes in ten years). It does not explain the buildings.
4. Everything else is click and discover. Short tips appear at a building the first time it matters.
5. Courses: when a worker takes a course at the Maison, the player can read that class there too. The Maison keeps all classes read so far.

---

## 5. Company buildings (campus)

Chosen in the Bureau, placed next to it.

| Building | Purpose |
|---|---|
| **Bureau** | Lists all staff (where they are, what they do; anyone can be called back), candidates to hire, and the CEO. Prospect flags are picked up here. |
| **Depot** | Drilling supplies and rigs. Grows by itself as more is built. |
| **Maison de la géothermie** | The association on campus: membership tiers (Membre, Membre bienfaiteur, Membre du comité), courses (Cycle Strates), the class archive, suits, polls, information stand, congress. |
| **Centre de compétences** | Deep rig, deep drilling, stimulation, the second survey pass (with a trained geologist), traffic-light plan, seismic monitoring. |
| **Atelier** | Directional drilling, owned rigs and maintenance. |

Staff: named, 60% women with correct pronouns, a large name pool. Paid monthly. Trades: driller, geologist, mud engineer, cementer, water officer, community liaison, security, suit (no personal name: "Suit no. 1"; villagers may still mention gender), seismologist (needs the university station), plant operator. Courses take time; the person is away meanwhile.

The CEO: listed at the Bureau. Travels in the 911 only for things done in person: debates, interviews, crises at the newspaper or mairie. Choosing such an option at the building sends the car automatically. Mostly decoration; banking needs no drive.

---

## 6. The valley

**Town**: canton house (with the federal office), bank, Bourse du Jura, La Feuille de la Faille, gendarmerie (police station), utility office with its substation, the lender's villa on a hill, the opposition committee's office (debates happen there). **Villages**: mairie, shop, church or chapel, school, farms on dirt lanes.

**Every building asks for things separately** (farms, school, shop, mairie…), shown with **!**. You can also offer things.
- Promises fall due 6–18 months later, **with no reminder**: the player has to remember what was promised. Promises must actually be carried out on the map.
- Pace: each building asks at most every 6–9 months; 1–2 open requests across the valley at any time. Engaged villages ask a little more; ignored ones stop asking and turn sour. Town institutions ask less, but weigh more.
- None of it is required to progress; all of it has effects, positive or negative. Convincing the valley is the key to winning.

**Crises** (all felt quakes, spills, blowouts, bribes exposed…) are handled at **La Feuille de la Faille**; those involving a village or its officials also at the **mairie**. The CEO drives there. Crises never pause the game.

**Opposition** (carried over, adjusted): committee with its own office; rumours (?), banners, stands, manure blockades, burning barricades, torches, camps that burn a site after a warning. Marches: **fewer people, walking slower**, from town to a rig; work stops while they stand there; riot police can walk them back. Police come from the police station.

**A very big quake** (the result of doing everything wrong) collapses ordinary houses and farms, which smoke for days. Mood drops immensely, and the valley most likely slides into the violence spiral that leads to the secret ending.

Carried over: moods per village, voter groups (higher/lower educated, farmers), wishes, the fête de la géothermie, gifts (university station, sports hall, fountain, bus, benches), water contamination, anhydrite swelling, quakes, the church, the referendum committee, the campaign, the late deciders.

---

**World building (every game):**
- Every game is a new valley from a random seed. The same seed gives the same valley.
- The map is 640 × 480 m. The valley crosses it differently every game: west to east, north to south, or bending round a corner. From the seed come the width of its floor, the height and shape of each side (a plateau, a ridge, terraces or rolling ground), how far up the forest starts and how wooded the land is, up to two side valleys with their own streams, and one to three hills (sometimes a big one). There is always a stream, the valley road and a railway along the floor, and a lot of open land to build on.
- One town on the valley road and three villages: one on the slope, one in a side valley (or high on the far side when there is none), one across the stream. The springs rise above them.
- No collisions: nothing stands on a road, the railway, a stream or another building; trees, animals, cars and people keep clear too.
- Rule 1: every type of house is on the map (all ordinary houses, all farms, all public buildings, the villa, the station, the substation).
- Rule 2: each building stands where its function puts it:
  - town: square with fountain, mairie, church, shop, bank, Bourse du Jura, La Feuille de la Faille, gendarmerie, canton house, school, committee office, utility office, railway station on the railway, ordinary houses
  - every village: mairie, chapel, shop and ordinary houses; the largest village also has a school
  - freestanding: farms in the open with a track to the nearest road, the lender's villa alone on the slope near the forest with its own drive, the substation outside the town by the valley road
- Buildings that come during play (company campus, sites, gifts, damaged states, protest camps) are not part of the start.
- Detail follows the zoom: far, middle, close. The finest resolution is 6 px per metre; zooming further only enlarges the pixels.

**Later:**
- 16 views (directions) for every object, so vehicles follow curved roads and things can face any way.
- Survey: the survey line is rotated with the arrow keys (buttons on a phone); the rig and everything else orient themselves to that line.

## 7. Survey and geology

**One 3D underground** for the whole block: each layer's depth varies across the block; faults are tilted planes. A north–south and an east–west line through the same spot show the same rock where they cross. The block's faces show the same rock as the sections.

**Prospecting**
1. Pick up a flag at the Bureau, click a spot. The geologist drives there in the Hilux and plants it.
2. The flag's window offers a seismic survey: a north–south or east–west line through the flag. Vibro-trucks drive it; villages along it are disturbed.
3. A survey station appears. Its section shows the raw seismic image, with one cautious hint ("strong reflector at about 1 km, probably the Muschelkalk").
4. **Two survey passes only.** The second pass is mainly for the deep game (faults, depth to the granite, temperature estimates) and needs the association's course: the geologist must have attended it. It also needs the Centre.
5. Nothing is certain until drilled. Layers a well passes are labelled with name, depth and temperature; the labels spread a little sideways with fading confidence and show on every line nearby.

**The 1970s archive**: bought cheaply at the canton house. Old north–south / east–west lines appear on the map as faint dashed lines with names (JU-72-04…). Their sections are yellowed paper drawings with gaps and old handwriting. **Where new survey data overlaps, it is drawn over the old** (combined, not side by side).

**Sections**: clicking any grid line asks: *project site here* or *open section*. A section always opens **2 km wide**; unsurveyed parts show only the surface and nearby wells, the underground grey. The section window is redesigned to be easy to read.

---

## 8. Drilling

1. **Site**: "project site here" places a pad; the ground is flattened with the access road. Before the rig comes: mairie permit, canton permit (deeper than ~2 km, months), access road. Shown with progress at the pad.
2. **Rig**: light (to ~2.2 km, 3 drillers) or deep (to 5 km, 5 drillers, needs the Centre). Leased (standby while waiting) or owned (upkeep). Comes from the depot on the low-loader.
3. **Well path drawn by hand** in the section window. That is part of the fun.
4. **Phases**: the path is split into casing phases (top hole, intermediate, reservoir). The player **plans phases ahead but starts each one by hand**. Per phase, options with cost and purpose:

| Option | Good for |
|---|---|
| Plain water mud | cheapest, solid rock |
| Clean top hole | protects groundwater in the karst |
| Heavy mud | holds back gas (coal, faults) |
| Salt-saturated mud | crossing salt and anhydrite safely |
| Lost-circulation material on standby | sealing mud losses |
| Cement bond log | proves the casing is sealed |
| Geologist / mud engineer on site | earlier warnings, fewer losses and kicks |

5. **A started phase cannot be stopped. No emergency measures.** If the rock doesn't match the plan, a warning appears and the consequence follows automatically: salt on water mud → swelling later; mud losses without LCM → contamination risk. **Gas kick**: drilling continues; the only live choice is to flare (village angry) or not (blowout risk).
6. Between phases: change options, add logs, redraw the rest of the path.
7. At the target: final depth, temperature, rock; a paid flow test shows the flow. Then a second well (doublet), stimulation (granite), or plug (costs money; burnt or abandoned holes too).

**Stimulation** (clearer and prettier): cutaway of the granite; 3–8 stages along the open hole; pressure per stage; traffic light (needs a seismologist) with own thresholds; live micro-quake cloud and a flow meter; yellow = lower or stop, red = automatic stop if planned; without a plan a felt quake can follow. Result: the cracked volume and the flow reached.

---

## 9. Production and prices

- Heat station (doublet in the Muschelkalk or granite) → heat pipes straight to villages (gridded).
- Power plant (granite) → power line to the **utility's substation**; without it, no sales.
- **Prices set at the utility building**: heat per station, electricity globally. High prices squeeze money and cost popularity; low prices buy goodwill and cost profit.

---

## 10. Financing

Money gets cheaper as risk falls: shares and grants pay for exploration; loans and utility deals pay for production.

**Bourse du Jura (shares)**
- The share price does not change cash. Cash comes only from issuing new shares (price × number); buybacks cost cash and lift the price. No dividends, no takeovers, no shareholder ending.
- **Scheduled issue: once every 6 months.** On-demand issues any time, but each makes La Feuille de la Faille more suspicious.
- The price reacts strongly to news (quakes, flow tests, protests, vote forecast, canton) and to the **Company's own announcements**. Overstated announcements can pump the price for an issue; each unmet claim weakens the next, costs trust, and past a hidden point the market regulator investigates (fine, suspension, bad press).

**Federal exploration contribution** (at the canton house): **deep wells only**. Applied for before drilling; pays a large share of drilling in tranches. Conditions: data public, traffic-light plan followed, start before a deadline; breaking them means paying back.

**Canton**: the concession review (a well ≥ 3,000 m into the granite by January of year 8; a deep well still drilling then counts). **CHF 15 M** when reached; CHF 5 M penalty when missed. Small grants for heat networks.

**Bank**
- General company credit: always available as the fallback when the Bourse is not enough; expensive; limit based on what the Company owns and its market value; too much → auditors → called in.
- Project loan: only after a successful flow test; ~60–70% of a station or plant, secured on the well, repaid from sales.
- Mortgage: two thirds of a campus building, cheap; called in if the building burns.

**Utility** (player asks at its building; it says yes only when conditions are met): long-term heat or power contract, a stake in a plant, or buying a station outright.

**Lender at the villa**: last resort; short term, high interest; no automatic repayment (one reminder card a month ahead); unpaid → a site burns → three months → the raid.

---

## 11. Endings (carried over)

Won or lost at the vote (year 10), lapsed (nothing built), wound up, bankrupt, the lender's raid, and the secret annexation by the canton of Berne with the F-35s.

---

## 12. Cut from the old game

Comité de patronage reports · local vs outside contractor choice per job (one builder queue; local hiring as one Bureau setting) · seismic network as a separate building (→ Centre) · police outreach hut (→ gendarmerie) · water lab (→ water officer) · containers and depot extensions as items · casing/mud/bits as separate stocks (→ one supplies stock; phase options decide use) · the weekly counter · the side panel, attention list and Strate 0 checklist · Notes tab (→ Maison) · duplicate toasts · cutting the block anywhere (→ sections along grid lines) · the third survey pass.

---

## 13. Build order (one new file, one new PR, a commit per step)

1. **Look**: map, terrain, forests, villages, roads, every building and vehicle, logo, fonts, header style. Shown for approval before logic goes in.
2. **Basic logic**: days and monthly money, vehicles on roads, placing and flattening, pop-up windows, header readouts.
3. **Geology**: 3D underground, surveys, 1970s archive, sections, hand-drawn wells, drilling phases, stimulation.
4. **Valley and buildings**: every building window, requests and promises, crises, CEO car, opposition and marches, association and courses.
5. **Financing and vote**: Bourse and announcements, grants, bank, utility, prices, canton target, the vote and endings. Then playtest rounds until two consecutive clean rounds.

**Phase 1 (look) is done.** The world look is settled: per-pixel ground with three detail levels, the 640 × 480 m valley from a random seed, the locked buildings, vehicles and people. Fine tuning done at the end: the finest level is 6 px per metre (was 7), the middle level 4 (was 4.8), people are drawn 1.2 times life size. Afterwards the valley itself became different every game (its course across the map, the shape of its sides, side valleys, hills, woods); a world takes about 1.5 s to make.

**Phases 2–5 are built** (`v2/index.html`). Code map:

| File | What it holds |
|---|---|
| `art.js` | every model, the sprite ray caster (16 views), logos, plates and wall texts |
| `world.js` | the valley from a seed: ground, roads, villages, buildings, trees, sites, levelling, routes |
| `render.js` | tiles per level, things in depth order, picking; flying things drawn on top |
| `geo.js` | the 3D underground (layers, faults, springs, temperature), the 1970s lines, section drawings |
| `game.js` | time and money, header, windows, vehicles, the start, the campus, save and load |
| `drill.js` | flags, surveys (8 directions), sections, sites, rigs, crews, supplies, permits, wells and phases, drilling events, flow tests, springs |
| `reservoir.js` | doublets, stimulation with the traffic light, circulation tests, stations, earthquakes |
| `valley.js` | moods by voter group, the forecast, building windows, requests, promises, gifts, crises, the CEO's trips |
| `oppo.js` | the committee, rumours, banners, blockades, barricades, camps, marches, police, debates |
| `assoc.js` | the Maison: tiers, Cycle Strates courses and classes, suits, polls, the stand, the congress |
| `life.js` | walkers, traffic, the train, Sunday churchgoers, the band, workers, firefighters, TV crew; sound |
| `finance.js` | Bourse, announcements and the regulator, bank, utility and prices, pipes and lines, sales, federal and canton money, the lender |
| `endings.js` | the campaign, the vote, lapsed, wound up, bankrupt, the raid, the secret annexation |

Decisions taken while building (open to change):
- Survey lines turn in eight directions (arrow keys or ⟲ ⟳); pipes and power lines stay gridded. A pad may stand up to 25 m beside its line.
- One map metre is three metres underground; sections are 2 km wide and 5 km deep.
- Goodwill has a ceiling (58) until heat reaches a village (72 there; +4 for all once power flows); repeated favours count for less.
- The market values proven resources (a productive aquifer, hot granite), so exploration success holds the share price up.
- Staff can be let go at the Bureau (they leave at the end of the month).

Old saves will not load in the new build.


## Life in the valley (for the scenes)

The catalogue (v2/catalogue.html) holds every figure, animal and object; the game should use them to make the valley feel lived in. Ambient life never blocks play and is not clickable unless stated.

- **Everyday:** hikers on the yellow-signposted paths (with packs and walking poles), cyclists and road cyclists on the valley road, joggers, dog walkers, kids playing (ball, running, waving), school children walking to and from the school, an angler by the stream (the first to notice contamination), the postman with parcels, a woman with a pram, pensioners on a bench watching the trucks.
- **Village life:** the brass band at the fête (plays at openings when the mood is good), churchgoers on Sunday, the priest (owner of the church that the quake can wreck), the market stall with the cheese seller on the market square, the café terrace with a waiter and gossip about the drilling, hay making with round bales in summer.
- **Animals:** cows grazing, walking and swishing tails in pastures; sheep grazing; chickens pecking in farmyards; Franches-Montagnes horses (stand, walk, gallop, graze); dogs and cats; deer at the forest edge (they leave when rigs come); crows that lift off when a survey truck shakes the ground; storks nesting on village chimneys in spring.
- **Work:** road workers (shovel, jackhammer) when roads are built, surveyors with a tripod pegging out pads and roads, an electrician on a pylon when a plant is hooked to the grid, delivery drivers.
- **Crisis and media:** firefighters with a hose (fires, barricades, quake ruins), paramedics with a stretcher and the ambulance, a TV crew (camera operator, sound engineer with boom) when it gets ugly, counter-protesters with blue OUI signs (fewer but loud), drummers in the marches, a police negotiator with a megaphone who talks before the riot police move.
- **Crowds:** protesters and villagers are drawn from 20 variations each; black bloc (10 variations) only in the riots before the secret ending; the lender's men (torches, jerrycans) set buildings ablaze at night, arriving in black Vito-like vans.
- **Poses:** every figure has stand, two walking frames and an activity (march with signs, baton strike behind shields, pitchfork, photo, speech, aiming, running). Riot police form lines: holding, advancing, batons, two rows; crowds gather behind barricades.
- **Seasons and weather:** trees sway in the wind (three frames); in winter broadleaf trees are bare, spruces and bushes carry snow, the ground is white.
