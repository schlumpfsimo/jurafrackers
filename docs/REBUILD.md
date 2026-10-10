# Jurafrackers 2.0 — the rebuild

The game becomes a valley full of places. Every system lives somewhere on the map; when it needs the player, a **!** appears over it. Only real crises (quake, spill, blowout, the raid, the valley erupting) still stop the game with a letter.

What stays as it is: geology and the section view, drilling physics and drilling trouble, doublets, stimulation, the plant, moods, voter groups, the committee, protests, the vote after ten years, all endings (including the secret one and the lender's raid), shares, loans, the federal contribution. What changes: everything the player touches.

## 1. Places

**Company (built by the player)**

| Place | Job |
|---|---|
| Bureau | Placed by the player at the start, built at once with a small depot. Hiring, rigs, containers, material levels, money overview, projects, courses, notes. |
| Depot | Stock of casing, mud and bits; containers and idle rigs. Extensions raise capacity. |
| Maison de la géothermie (wing) | The association moves in: men in suits, association polls, platine tier, congress, charter, patronage committee, smoother police favours, courses Strate 4–5. |
| Research compound (needs the Maison) | Second-pass readings, tracer tests, seismic network, traffic-light plan, federal application, deep rig. |
| Workshop (later) | Buying rigs, directional kit, soundproofing. |
| Sites | Prospect flag → site with a container, one or more well pads, later a heat station or power plant. |

**Valley (generated per seed)**

Town: canton house, bank, newspaper, gendarmerie, utility depot, the lender's villa on the hill, and an awkward new quarter with the **Bourse du Jura** (LED ticker) and the federal office's brass plate. Every village: mairie, village shop, church or chapel, school, farms around it. The committee room appears when the opposition organises.

| Place | What happens there |
|---|---|
| Canton house | Concession, permits, five-year review and hearing, campaign, the vote |
| Bank | Credit, loans, repayments, warnings in the red, utility sale offers |
| Lender's villa | Private loans; the black vans start here |
| Bourse du Jura | Share price, capital increases, buybacks, shareholders' meeting |
| Federal plate | The 60% contribution and its conditions |
| Newspaper | Press letters, publishing data, exposure of bribes |
| Gendarmerie | Favours (clumsy from the Bureau, or through a man in a suit), funding |
| Utility depot | Buys heat stations |
| Mairie | Gifts (university field station, school gym hall, fountain, post bus…), wishes, promises, the fête |
| Village shop | Rumours pinned to the board; leaflets and brochures against them |
| Farms | Farmers' complaints |

## 2. People

Named staff, hired at the Bureau, paid monthly whether busy or not. Trades: driller, geologist, mud engineer, cementer, water officer, community liaison, security, man in a suit (needs the Maison), seismologist (needs a university field station in the valley), plant operator. A site needs drillers to drill (3 for a light rig, 5 for a deep rig); specialists change named risks. People are sent by clicking the Bureau, picking an idle worker and clicking the map, or with + and − on a site.

## 3. Material

Three stocks: casing and cement (per 100 m), mud and chemicals, bits and spares. Bought at the Bureau; the depot reorders by itself to the levels set there, a lorry brings it. Sites draw from the depot automatically; drilling stops on standby when a site runs dry.

## 4. Contractors

Survey company, road builder, pipe layer, grid company, builders. Each does one job at a time; orders queue. For roads, pipes and buildings the player picks a local firm (cheaper, slower, local jobs and mood) or an outside one (dearer, faster).

## 5. A project

1. Plant a flag anywhere: free. The flag shows what is known: old lines, springs, zones, road distance, villages.
2. Order a survey through the flag (contractor, off-road). Second pass needs the research compound, third pass the university field station.
3. Commit: needs a container, a rig (leased or owned) and enough drillers. Choose crew. A convoy drives there: road first, then off-road.
4. Permit from the mairie: the first one is immediate outside protection zones; later ones take months, more when the village is against it. Deep wells, stimulation and plants also need the canton.
5. Rigs need an access road (road builder) unless the site is next to a road.
6. Draw the well at the site: estimate (material, rig days, wages). Financing from the bank appears automatically.
7. Drill. Trouble appears as ! on the well; the rig waits on standby until answered.
8. Flow test, second well, heat station (builders), pipe (pipe layer), or the deep path: stimulation, circulation test, plant, power line.

## 6. Association: Géothermie-Helvetica

Membership tier set at the Bureau: ordinary (from the start), membre bienfaiteur, membre platine (needs the Maison). Higher tiers lobby for faster permits and cheaper certificates.

**Cycle Strates** (courses): Strate 0 · Surface (the trade, with the first-project checklist), Strate 1 · Malm, Strate 2 · Muschelkalk, Strate 3 · Anhydrite et sel, Strate 4 · Socle, Strate 5 · Fracture, Hors-strate: Opinion publique, Hors-strate: Financement. Reading is free once unlocked. A certificate costs a fee (lower at higher tiers) and takes a worker away for some weeks; it gives that worker a named skill.

## 7. Police

Police ignore protests unless something burns: a site, a building, a Company vehicle. Favours: clumsy from the Bureau (dear, slow, easily exposed) or through a man in a suit (cheaper, quieter). Funding the station brings better equipment and faster response. The newspaper can expose payments: a crisis.

## 8. Sound

Generated in the browser. Valley ambience (wind, birds, crickets, cowbells, church bells on the hour), places heard when near or zoomed in (rig, generator, station hum, turbine, construction, village, the ticker), vehicles, paper and stamp sounds in the interface, events (quake, fire, sirens, blowout, chanting that grows with the protest), short musical moments (brass band, the association's jingle, organ at the hearing). No background music. Sliders: ambience, effects, music, plus mute.

## 9. Interface

Left panel: the compound, add-ons to build, prospect flag, the attention list (every place with a !), projects. The Bureau window replaces the old office panel. Civic places open their own windows. The Strate 0 checklist is pinned until the first heat is sold.

## 10. Build order

R1 valley and places, ! inbox · R2 compound, staff, depot · R3 projects · R4 contractors · R5 association, courses, mairie, police, civic windows · R6 sound · R7 interface · R8 tests, bots, playthroughs, fix loop until two clean runs.
