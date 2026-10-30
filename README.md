# PhiSafe

**People first. Every animal home.**

PhiSafe is a privacy-first, offline-capable household preparedness planner. It is designed to help a household manage an evacuation checklist, people/animal counts, safe transport capacity, supplies, and print-ready documents. It does not predict war, monitor hazards, or send emergency alerts.

## Status

**v0.1.0, first functional MVP**. Static web app, zero build dependencies, no login, no tracking.

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
- `core.mjs`: normalized schema and calculations, import hardening.
- `sw.js`, `manifest.webmanifest`: static offline shell.
- `tests/core.test.mjs`: core invariants.
- `.github/workflows/`: tests and Pages deployment.

Future work should include an accessible first-run wizard, richer per-species care plans, automated expiry reminders **only with consent**, optional encrypted local backups, better accessibility/headset checks, offline official printable guides with source/date tracking, and a transport layout planner. Those features are **not** implemented.

## License

MIT. See [LICENSE](LICENSE).
