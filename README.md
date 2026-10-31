# PhiSafe

**People first. Every animal home.**

PhiSafe is a privacy-first, offline-capable household preparedness planner. It is designed to help a household manage an evacuation checklist, people/animal counts, safe transport capacity, supplies, and print-ready documents. It does not predict war, monitor hazards, or send emergency alerts.

## Status

**v0.3.0, Rung 3 practice drills and paper load sheets**. Static web app, zero build dependencies, no login, no tracking.

## Try it locally

Serve the repository with any static server, e.g.:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. For an installed/offline PWA, use HTTPS deployment such as GitHub Pages and visit the app once while online so the service worker can cache its files. Some browsers do not support installing apps with SVG-only icons; adding PNG icons is a planned improvement. Test offline mode before relying on it.

To run tests (Node.js 22+):

```bash
node --test tests/*.test.mjs
node --check app.js
```

## Features

- Household configuration with people, dogs, cats and other animals.
- 3, 14 or 30-day planning horizons, with a human water baseline of **at least one US gallon per person per day**. More may be required for heat, illness or other conditions. **Animal water needs must be entered by the household**.
- Manual food and medication supply-day estimates, not automatic medical advice.
- Inventory with user-set quantities, goals and optional expiration dates.
- Per-animal roster with carrier/secured-position assignments and resettable drill loading marks.
- **Rung 3 evacuation practice:** animal-by-animal physical check prompts (located, secured, recounted on arrival), people headcount at boarding and destination, five predeparture prompts, incomplete/complete drill records, and printable private load sheets.
- **Rung 2 visual evacuation loading planner:** explicit passenger/animal capacity per vehicle, one unique vehicle slot per animal, missing roster warnings, and printable allocation-aware 72-hour manifests.
- **Rung 2 backup power estimates:** battery rated watt-hours, configurable usability and inverter loss assumptions, per-device watts/hours-per-day and simultaneous load check.
- **Rung 2 72-hour go-bag checklist:** people, pet, shared and per-animal tasks; locally saved packing marks; dedicated printable sheet.
- Transport capacity gap checks, destination/contact fields and six core evacuation actions.
- Print-friendly summary; explicit private JSON export and import.
- Static links to official public guidance.
- Offline application shell after the first successful HTTPS load and cache installation.

## Design and safety constraints

1. **Not an emergency-response service.** Always obey official emergency alerts and responders. Do not wait for PhiSafe to agree with an evacuation warning.
2. **No guessing.** Unconfigured water and transport capacity should show as unknown or incomplete. A green check does not certify road access, equipment condition or safety.
3. **No private seed data.** Default household and animal records are blank. Never commit real family names, addresses, contact numbers, shelter destinations, veterinary records or medical details to this public repository.
4. **Local storage is not encryption.** Browsers may clear local storage, and people who share a device may read it. Exports and printouts contain plaintext private information. Store and share them accordingly.
5. **Protect animals during transport.** Use appropriate secured carriers/restraints and ventilation. Do not transport people or animals inside a fifth-wheel/trailer while it is being towed.
6. **No invented shelter capacity.** Confirm any temporary shelter, hotel or destination will accept your actual group and all animals.
7. **Offline is not real-time.** The app does not know current hazards, open roads or shelter availability. Official sites linked in the Guides require internet access.

## GitHub Pages

A Pages workflow deploys on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the publishing source. After the deployment, visit the HTTPS site online, verify the service worker has cached the shell, then test in airplane/offline mode. Do not treat a successful GitHub check as proof of readiness without a device-level test.

## Architecture

- `index.html`, `styles.css`, `app.js`: no-framework UI, responsive and print friendly.
- `core.mjs`, `rung2.mjs`: normalized schema, older-backup compatibility, evacuation/power/manifest calculations.
- `rung2-ui.mjs`: evacuation loading, power and go-bag view rendering.
- `rung3.mjs`, `rung3-ui.mjs`: local-only practice state, validation and printable vehicle assignment sheet.
- `sw.js`, `manifest.webmanifest`: static offline shell.
- `tests/core.test.mjs`: core invariants.
- `.github/workflows/`: tests and Pages deployment.

Future work should include a full in-browser field test, an accessible first-run wizard, richer per-species care plans, automated expiry reminders **only with consent**, optional encrypted local backups, better accessibility/headset checks, offline official printable guides with source/date tracking, and a transport layout planner. Those features are **not** implemented.

## License

MIT. See [LICENSE](LICENSE).


## Rung 2 safety notes

- **Migrates previous data:** Existing schema-1 backups and browser records import with empty Rung 2 sections; no household records are committed to this repository.
- **Vehicle planner:** Counts are not proof of secure restraint, actual crate fit, ventilation, accessibility, legal passenger capacity, climate control or road access. No passengers or animals should ride in a towed fifth-wheel.
- **Battery planner formula:** estimated usable Wh = rated battery Wh × usable fraction × assumed inverter efficiency. Daily Wh = sum(device W × hours/day). Estimated days = usable Wh / daily Wh. Unknown input gives an unknown result. It omits solar, generator charging, aging, cold weather, standby inverter draw, reserve margin and peak startup surges. Do not use it for life-support equipment or to authorize electrical modifications.
- **Fuel generator warning:** Use fuel generators outdoors at least 20 feet from doors, windows and vents; keep exhaust away and use functional CO detectors. See [California Department of Public Health's carbon monoxide guidance](https://www.cdph.ca.gov/Programs/EPO/Pages/Power-outage-and-carbon-monoxide-poisoning.aspx).
- **72-hour manifest:** a short-term evacuation kit, not an adequate full pet stockpile; [CDC pet emergency kit guidance](https://www.cdc.gov/healthy-pets/emergency-preparedness/preparedness-kit.html) recommends a longer reserve. The printable sheet contains private household fields, so safeguard it.
- **No official live feeds:** Never delay a real evacuation to finish a checklist or device power calculation.

### Rung 2 test scenarios

1. Add two people, two dogs and one cat, then verify passenger and animal allocations.
2. Try duplicate animal spaces (should be unavailable) and changing vehicle capacity (assignments outside capacity should be cleared and treated as unassigned).
3. Add an approximately 1000 Wh battery at 80% usable and 85% inverter efficiency; for 160 Wh/day listed load, the mathematical estimate should show 4.25 days, excluding real-world losses.
4. Prepare a 72-hour checklist, print it and confirm every animal has its own individual line.
5. Export plan, reload browser, import backup, test offline after a successful HTTPS visit. Verify no private family data appears in GitHub.

 
## Rung 3: physical rehearsal before crisis

The **Practice Drill** tab provides an optional simulation in calm conditions. It:
- Verifies an individual locate, vehicle securement and destination recount for each animal.
- Separately records people boarding and arriving.
- Requires manual acknowledgement of route review, confirmed destinations, medicines/supplies, vehicle restraint/ventilation checks, and offline/printed plan access.
- Records completed **or incomplete** drills with elapsed time and unresolved items, retaining the most recent 20 in local browser storage.
- Can print a paper load sheet listing the planned vehicle/spot and three blank verification boxes for each animal.

**Never run a drill during a real evacuation.** Do not wait to finish any app checklist when local officials order departure or conditions become dangerous. Marked steps are self-reported, and no one has validated vehicle fit, evacuation routes, destination acceptance, or actual departure times. Printouts and backups contain private details and are not encrypted.

### Rung 3 field test

1. Configure two people, eight dogs and nine cats; assign each animal a separate physically appropriate carrier and vehicle space.
2. Print the load sheet. Verify every animal appears once, with a carrier and assigned place.
3. Start a **practice** session. Mark location, securement, and arrival recount in order. Enter people boarded and people at destination, plus stage confirmations.
4. Save a deliberately incomplete exercise and confirm its gaps are retained in history.
5. Finish a complete practice and verify the record remains across reload, export/import, and disconnected browser sessions.
6. Perform an actual timed loading rehearsal in a safe setting and adjust the layout. This program does not establish legal transport capacity or animal restraint safety.
