import { STORAGE_KEY, ACTIONS, defaultState, normalizeState, metrics, upcomingExpiry } from "./core.mjs";
import { loadingReport } from "./rung2.mjs";
import { renderLoading, renderPower, renderGoBags, manifestPrint } from "./rung2-ui.mjs";
import { rehearsalReport, buildRehearsalRecord, newRehearsal } from "./rung3.mjs";
import { renderDrill, printLoadingSheet } from "./rung3-ui.mjs";
import { assessFieldReadiness, inspectOfflineShell } from "./rung4.mjs";
import { renderField, printFieldCard } from "./rung4-ui.mjs";
import { encryptPlan, decryptPlan, isEncryptedBackup, MAX_VAULT_FILE_BYTES } from "./vault.mjs";
import { renderVault } from "./vault-ui.mjs";
import { guideFor } from "./quick.mjs";
import { renderQuick, printQuick } from "./quick-ui.mjs";
import { SETUP_STEPS, isUntouchedPlan, setupReport, mayAddAnimal } from "./setup.mjs";
import { renderSetup } from "./setup-ui.mjs";

const root = document.querySelector("#content");
const printRoot = document.querySelector("#printReport");
const notice = document.querySelector("#appNotice");
let tab = "overview";
let setupStep = "household";
let targetDays = 14;
let quickGuide = "wildfire";
let offlineAuditResult = null;
let vaultBusy = false;
let state = load();
if (isUntouchedPlan(state)) tab = "setup";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : defaultState();
  } catch (error) {
    setTimeout(() => tell("Saved data could not be read. No browser data was deleted. Restore a known-good backup if needed."), 0);
    return defaultState();
  }
}
function e(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function fmt(number) {
  return Number(number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function tell(message) {
  notice.hidden = false;
  notice.textContent = message;
}
function clearNotice() {
  notice.hidden = true;
  notice.textContent = "";
}
function save(preserveSetupBackup = false) {
  // Any saved plan changes require a fresh copy; self-confirmations must not stay green
  // while an encrypted file on another device quietly becomes obsolete.
  if (!preserveSetupBackup && state.setup?.backupReviewedAt) state.setup.backupReviewedAt=null;
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    clearNotice();
  } catch (_) {
    tell("Browser storage is unavailable or full. Your edits may disappear when this page closes. Export a backup now.");
  }
  render();
}
function commitRestoredPlan(replacement) {
  // Persist first: failure must not silently replace a working in-memory plan.
  const candidate = normalizeState(replacement);
  candidate.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
  } catch (_) {
    tell("Unable to save the restored plan on this device. The existing plan was not changed.");
    return false;
  }
  state = candidate;
  offlineAuditResult = null;
  tab = "overview";
  render();
  return true;
}
function newId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replaceAll("-", "") : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function panel(title, body, extra = "") {
  return '<section class="card ' + extra + '"><h3>' + title + '</h3>' + body + '</section>';
}
function pill(label, tone = "") {
  return '<span class="pill ' + tone + '">' + e(label) + '</span>';
}
function percent(n, target) {
  return target > 0 ? Math.max(0, Math.min(100, n / target * 100)) : 0;
}
function bar(n, target) {
  return '<div class="progress" aria-hidden="true"><span style="width:' + percent(n, target) + '%"></span></div>';
}
function stat(label, value, detail) {
  return '<div class="stat"><div class="eyebrow-small">' + e(label) + '</div><strong>' + e(value) + '</strong><span>' + e(detail) + '</span></div>';
}
function numberField(label, key, help, step = "1") {
  return '<div class="field"><label for="' + key + '">' + e(label) + '</label><input id="' + key + '" name="' + key +
    '" type="number" min="0" max="10000000" step="' + step + '" required value="' + e(state.household[key]) + '"><small>' +
    e(help) + '</small></div>';
}
function textField(label, key, placeholder = "", big = false) {
  const value = e(state.plan[key]);
  return '<div class="field"><label for="' + key + '">' + e(label) + '</label>' +
    (big ? '<textarea id="' + key + '" name="' + key + '" maxlength="2000" placeholder="' + e(placeholder) + '">' + value + '</textarea>'
      : '<input id="' + key + '" name="' + key + '" maxlength="300" value="' + value + '" placeholder="' + e(placeholder) + '">') +
    '</div>';
}
function renderOverview() {
  const m = metrics(state, targetDays);
  const loading = loadingReport(state);
  const rehearsal = rehearsalReport(state);
  const h = state.household;
  const hasPeople = h.people > 0;
  const humanWater = m.humanWaterNeeded;
  const needPets = m.animals > 0;
  const foodDays = hasPeople ? h.peopleFoodDays : null;
  const progressTasks = bar(m.tasksDone, m.tasksTotal);
  const waterState = !hasPeople ? "Enter household first" :
    fmt(h.humanWaterGallons) + " / " + fmt(humanWater) + " gal for " + targetDays + " days";
  const petWater = !needPets ? "No animals entered" : m.animalWaterNeeded === null ?
    "Set your animals’ daily water requirement" : fmt(h.animalWaterGallons) + " / " + fmt(m.animalWaterNeeded) + " gal";
  let flags = [];
  if (!hasPeople) flags.push("Set the number of people in your household.");
  if (needPets && !m.rosterComplete) flags.push("Add every animal to the roster, with carrier information.");
  if (hasPeople && !loading.allocationComplete) flags.push("Finish individual vehicle, passenger and animal slot allocations in Loading.");
  if (hasPeople && h.humanWaterGallons < humanWater) flags.push("Increase stored human water or plan a reliable alternative.");
  if (needPets && m.animalWaterNeeded === null) flags.push("Estimate animal water needs from real consumption and veterinary guidance.");
  if (needPets && m.animalWaterNeeded !== null && h.animalWaterGallons < m.animalWaterNeeded) flags.push("Increase animal drinking water supplies.");
  if (!state.plan.meetingPlace || !state.plan.backupPlace) flags.push("Confirm two viable destinations before an evacuation.");
  if (flags.length === 0) flags.push("Review supplies, alert enrollment and drills regularly. Numbers alone do not guarantee safety.");

  return '<h2>Your household readiness</h2><p class="lead">This dashboard identifies known gaps, not a prediction of what will happen or a guarantee of safety.</p>' +
    '<div class="flex"><span class="muted">Planning horizon</span><div class="top-actions">' +
    [3,14,30].map(n => '<button class="small ' + (targetDays===n ? '' : 'secondary') + '" data-action="horizon" data-days="' + n + '">' + n + ' days</button>').join("") +
    '</div></div><div class="section grid four">' +
    stat("People", hasPeople ? h.people : "Not set", "Household count") +
    stat("Animals", m.animals || "Not set", fmt(m.rosterCount) + " rostered") +
    stat("Transport", !hasPeople || !loading.occupancy.length ? "Unplanned" : loading.allocationComplete ? "Allocated" : "Gap found", "Verify actual vehicle layout") +
    stat("Actions", m.tasksDone + " / " + m.tasksTotal, "Core tasks marked complete") +
    '</div><div class="section grid two">' +
    panel("Human water", '<div class="muted">Planning baseline: at least 1 US gallon per person per day for drinking and basic sanitation. Higher needs may apply.</div>' +
      bar(h.humanWaterGallons,humanWater) + '<strong>' + e(waterState) + '</strong>') +
    panel("Animal water", '<div class="muted">Use your own total gallons/day for all animals. PhiSafe will not guess from their count.</div>' +
      (m.animalWaterNeeded === null ? '' : bar(h.animalWaterGallons,m.animalWaterNeeded)) +
      '<strong>' + e(petWater) + '</strong>') +
    '</div><div class="section grid two">' +
    panel("Food and medication estimates", '<div class="kv"><span>People food</span><strong>' + (foodDays === null ? "Not set" : fmt(foodDays)+" days") + '</strong></div>' +
      '<div class="kv"><span>Dog food</span><strong>' + fmt(h.dogFoodDays) + ' days</strong></div>' +
      '<div class="kv"><span>Cat food</span><strong>' + fmt(h.catFoodDays) + ' days</strong></div>' +
      '<div class="kv"><span>Other pet food</span><strong>' + fmt(h.otherPetsFoodDays) + ' days</strong></div>' +
      '<div class="kv"><span>Essential medications</span><strong>' + fmt(h.medsDays) + ' days</strong></div>' +
      '<p class="hint">All days are manual estimates entered by you, not calculated from calories or prescriptions.</p>') +
    panel("Priority gaps", '<ul class="clean">' + flags.map(x => '<li>' + e(x) + '</li>').join("") + '</ul>') +
    '</div><div class="section">' + panel("Practice evacuation", '<div class="flex"><div><strong>' +
      (rehearsal.active ? "Practice in progress" : state.rehearsal.history.length ?
        "Last drill: " + e(state.rehearsal.history[0].status) : "No rehearsal recorded yet") +
      '</strong><p class="hint">Run an animal-by-animal loading and destination recount practice, then save observations locally.</p></div>' +
      '<button type="button" class="secondary small" data-tab="drill">Open rehearsal</button></div>') +
    '</div><div class="section">' + panel("Core action checklist", '<div class="flex"><strong>' + m.tasksDone + ' of ' + m.tasksTotal + ' completed</strong><button class="secondary small" data-tab="evacuation">Open checklist</button></div>' + progressTasks) + '</div>' +
    '<div class="warning-note"><strong>No live monitoring.</strong> The connection indicator only describes this browser. It does not check local hazards, public safety alerts, road closures or shelter availability.</div>';
}
function renderHousehold() {
  return '<h2>Household & capacity</h2><p class="lead">Enter counts and actual supplies. Nothing here is automatically sent to any server. Use the same device to keep the plan available offline.</p>' +
    '<form id="householdForm" class="card form-grid">' +
    '<div class="field full"><h3>Who needs to get out?</h3></div>' +
    numberField("People", "people", "Include everyone in the household.") +
    numberField("Dogs", "dogs", "Count every dog.") +
    numberField("Cats", "cats", "Count every cat.") +
    numberField("Other animals", "otherPets", "Animals requiring a different kind of carrier.") +
    '<div class="field full"><h3>Water and supply-day estimates</h3><p class="hint">Enter real on-hand quantities; only the human water baseline is automatically estimated.</p></div>' +
    numberField("Human water stored (US gallons)", "humanWaterGallons", "Drinkable and sanitation water available to people.", "0.1") +
    numberField("Animal water stored (US gallons)", "animalWaterGallons", "Water reserved for animals.", "0.1") +
    numberField("All animals' water use (gallons/day)", "animalWaterDailyGallons", "Estimate from actual use or veterinary advice. Leave 0 until known.", "0.01") +
    numberField("Days of food for people", "peopleFoodDays", "Based on portions and dietary needs.", "0.5") +
    numberField("Days of dog food", "dogFoodDays", "Based on all dogs' actual portions.", "0.5") +
    numberField("Days of cat food", "catFoodDays", "Based on all cats' actual portions.", "0.5") +
    numberField("Days of other pet food", "otherPetsFoodDays", "For animals beyond dogs and cats.", "0.5") +
    numberField("Days of essential medications", "medsDays", "Estimate for the shortest critical prescription or veterinary medication.", "0.5") +
    '<div class="field full"><h3>Verified transport capacity</h3><p class="hint">Only count seats and secure animal travel spots you have actually checked. A fifth-wheel being towed is not a safe space for passengers or animals.</p></div>' +
    numberField("Safe passenger seats", "peopleSeats", "Seat-belted seats available in evacuation vehicles.") +
    numberField("Secure animal travel spaces", "animalSpaces", "Crates, carriers or appropriate secured positions with adequate ventilation.") +
    '<div class="form-actions"><button type="submit">Save household</button></div></form>';
}
function renderSupplies() {
  const shortages = metrics(state).inventoryShortfalls.length;
  return '<h2>Supplies inventory</h2><p class="lead">Track the supplies you actually have and set your own targets. Values are not purchase recommendations.</p>' +
    '<div class="section">' + panel("Add an item", '<form id="supplyForm" class="form-grid">' +
    '<div class="field"><label for="supplyName">Item name</label><input id="supplyName" name="name" required maxlength="120" placeholder="Example: flashlight batteries"></div>' +
    '<div class="field"><label for="supplyCategory">Category</label><select id="supplyCategory" name="category"><option value="food">Food</option><option value="water">Water</option><option value="medical">Medical</option><option value="sanitation">Sanitation</option><option value="equipment">Equipment</option><option value="other">Other</option></select></div>' +
    '<div class="field"><label for="supplyQuantity">On hand</label><input type="number" id="supplyQuantity" name="quantity" min="0" step="0.01" required value="0"></div>' +
    '<div class="field"><label for="supplyGoal">Target amount</label><input type="number" id="supplyGoal" name="goal" min="0" step="0.01" required value="0"></div>' +
    '<div class="field"><label for="supplyUnit">Unit</label><input id="supplyUnit" name="unit" maxlength="24" placeholder="packs, gallons, meals"></div>' +
    '<div class="field"><label for="supplyExpiry">Expiration (optional)</label><input type="date" id="supplyExpiry" name="expires"></div>' +
    '<div class="form-actions"><button type="submit">Add to inventory</button></div></form>') + '</div>' +
    '<div class="section"><div class="section-title"><h3>Current inventory (' + state.supplies.length + ')</h3>' +
    pill(shortages + ' below target',shortages ? "warning" : "") + '</div>' +
    (state.supplies.length ? '<div class="card table-wrap"><table class="table"><thead><tr><th>Item</th><th>On hand / target</th><th>Expiration</th><th>Action</th></tr></thead><tbody>' +
    state.supplies.map(item => '<tr><td>' + e(item.name) + '<div class="hint">' + e(item.category) + '</div></td>' +
    '<td>' + fmt(item.quantity) + ' / ' + fmt(item.goal) + ' ' + e(item.unit) + (item.goal > item.quantity ? ' ' + pill("Short","warning") : '') + '</td>' +
    '<td>' + e(item.expires || "—") + ' ' + (upcomingExpiry(item) ? pill(upcomingExpiry(item),"danger") : '') + '</td>' +
    '<td><button type="button" class="danger small" data-action="delete-supply" data-id="' + e(item.id) + '">Remove</button></td></tr>').join("") +
    '</tbody></table></div>' : '<div class="empty">Inventory is empty. Add a few essential supplies to start.</div>') + '</div>';
}
function renderAnimals() {
  const m = metrics(state);
  const loaded = state.pets.filter(p => p.loaded).length;
  return '<h2>Animal evacuation roster</h2><p class="lead">One secured place for every animal. Label carriers, verify ventilation, and perform physical head counts at departure and stops.</p>' +
    '<div class="section grid three">' +
    stat("Expected animals",m.animals,"Based on household setup") +
    stat("Roster entries",m.rosterCount,"Add every animal individually") +
    stat("Marked loaded",loaded,"Reset before each drill or real departure") +
    '</div>' +
    (!m.rosterComplete ? '<div class="warning-note">Roster does not yet match your household counts. Do not treat this as a completed evacuation checklist.</div>' : '') +
    '<div class="section">' + panel("Add animal",'<form id="petForm" class="form-grid">' +
    '<div class="field"><label for="petName">Name / identifier</label><input id="petName" name="name" required maxlength="100"></div>' +
    '<div class="field"><label for="petSpecies">Animal</label><select id="petSpecies" name="species"><option value="dog">Dog</option><option value="cat">Cat</option><option value="other">Other</option></select></div>' +
    '<div class="field"><label for="petCarrier">Carrier / secured spot</label><input id="petCarrier" name="carrier" maxlength="100" placeholder="Example: Crate C4"></div>' +
    '<div class="field"><label for="petNotes">Essential care note (avoid sensitive details)</label><input id="petNotes" name="notes" maxlength="300"></div>' +
    '<div class="form-actions"><button type="submit">Add animal</button></div></form>') + '</div>' +
    '<div class="section"><div class="section-title"><h3>Loading roster</h3><button class="secondary small" data-action="reset-loaded">Reset all loaded marks</button></div>' +
    (state.pets.length ? '<div class="card table-wrap"><table class="table"><thead><tr><th>Animal</th><th>Secure position</th><th>Drill loading</th><th>Action</th></tr></thead><tbody>' +
    state.pets.map(p => '<tr><td>' + e(p.name) + '<div class="hint">' + e(p.species) + (p.notes ? ' · ' + e(p.notes) : '') + '</div></td><td>' +
    e(p.carrier || "Not assigned") + '</td><td><button class="secondary small" data-action="toggle-loaded" data-id="' + e(p.id) + '">' +
    (p.loaded ? "✓ Marked loaded" : "Mark loaded") + '</button></td><td><button class="danger small" data-action="delete-pet" data-id="' + e(p.id) + '">Remove</button></td></tr>').join("") +
    '</tbody></table></div>' : '<div class="empty">No animals added yet. Start with the hardest-to-catch pet, not the easiest.</div>') +
    '<p class="hint">This is an assistance checklist, not a substitute for visually checking each crate, seat or restraint. Never place animals in a fifth-wheel while it is being towed.</p></div>';
}
function renderEvacuation() {
  const m = metrics(state);
  return '<h2>Evacuation plan</h2><p class="lead">Leave early when official warnings or conditions require it. Confirm destinations can accommodate everyone, including every animal.</p>' +
    '<div class="section grid two">' +
    panel("Transport reality check", '<div class="kv"><span>People needed</span><strong>' + state.household.people + '</strong></div>' +
      '<div class="kv"><span>Safe seats entered</span><strong>' + state.household.peopleSeats + '</strong></div>' +
      '<div class="kv"><span>Animal spaces needed</span><strong>' + m.animals + '</strong></div>' +
      '<div class="kv"><span>Secure spaces entered</span><strong>' + state.household.animalSpaces + '</strong></div>' +
      (!m.transportKnown ? pill("Capacity unverified","warning") : m.transportReady ? pill("Entered capacity meets count") : pill("Capacity gap","danger")) +
      '<p class="hint">Numbers do not verify vehicle condition, fit, restraints, ventilation or route availability.</p>') +
    panel("Core steps", '<div class="muted">Mark a task only when it is actually complete.</div>' +
      '<ul class="clean">' + ACTIONS.map(a => '<li><label class="task"><input type="checkbox" data-action="toggle-task" data-id="' + e(a.id) + '" ' +
      (state.tasks[a.id] ? "checked" : "") + '><span>' + e(a.label) + '</span></label></li>').join("") + '</ul>') +
    '</div><div class="section">' + panel("Private places, routes & contacts", '<form id="planForm" class="form-grid">' +
    textField("Evacuation zone / alert registration reference","alertZone","Record a verified official zone ID") +
    textField("Primary destination","meetingPlace","Confirmed location that accepts all animals") +
    textField("Backup destination","backupPlace","A separate confirmed alternative") +
    textField("Primary route","routeA","Describe route, not a live safety assessment") +
    textField("Backup route","routeB","Alternative that avoids the same chokepoint if possible") +
    textField("Out-of-area contact","emergencyContact","Phone / contact method, stored only in this browser") +
    '<div class="field full">' + textField("Notes and evacuation triggers","notes","Include where carriers are stored, responsibility split and official information sources",true) + '</div>' +
    '<div class="form-actions"><button type="submit">Save evacuation plan</button></div></form>') + '</div>' +
    '<div class="danger-note"><strong>Emergency rule:</strong> Never delay an evacuation to update this app. Take your people, animals, medications and go when directed or when remaining is unsafe. Follow local authorities and emergency responders.</div>';
}
function resource(label, note, url) {
  return '<a class="resource" href="' + e(url) + '" target="_blank" rel="noopener noreferrer"><strong>' + e(label) +
    '</strong><small>' + e(note) + ' · Opens official site; internet required</small></a>';
}
function renderGuides() {
  return '<h2>Trusted guidance</h2><p class="lead">These links lead to public agencies; they are not monitored by PhiSafe, and they require internet access. Print or save critical documents while connected.</p>' +
    '<div class="grid two"><section class="card"><h3>General preparedness</h3>' +
      resource("Ready.gov: Make a plan","Family and household emergency planning","https://www.ready.gov/plan") +
      resource("Ready.gov: Pets","Evacuating and preparing with animals","https://www.ready.gov/pets") +
      resource("NOAA National Weather Service","Official weather observations and warnings","https://www.weather.gov/") +
    '</section><section class="card"><h3>Hazard-specific guidance</h3>' +
      resource("Ready for Wildfire","California wildfire preparation","https://readyforwildfire.org/") +
      resource("Ready.gov: Floods","Flood protection and evacuation","https://www.ready.gov/floods") +
      resource("Ready.gov: Power Outages","Safe blackout preparation","https://www.ready.gov/power-outages") +
      resource("Ready.gov: Nuclear Explosion","Sheltering in a substantial building, not relying on an RV","https://www.ready.gov/nuclear-explosion") +
    '</section></div><div class="section warning-note"><strong>Information boundary:</strong> PhiSafe does not know if roads are open, a shelter accepts pets, or an incident is underway. Verify with authoritative local sources and emergency officials.</div>' +
    '<div class="section">' + panel("Privacy and backups",'<p>All household information is kept in browser local storage. It is <strong>not encrypted</strong>. Anybody with access to this device or a backup may be able to read it. Clearing browser data may delete it.</p>' +
      '<p>Export JSON to a secure location, print a copy for offline use, and avoid sharing filled-in exports or printouts publicly. No accounts, analytics, ads, network integrations or location permissions are used.</p>' +
      '<button class="danger small" data-action="reset-all">Delete this device’s PhiSafe plan</button>') + '</div>';
}
function renderPrint() {
  const m = metrics(state, targetDays);
  const h = state.household;
  const p = state.plan;
  function entry(label, value) { return '<li><strong>' + e(label) + ':</strong> ' + e(value || "Not entered") + '</li>'; }
  printRoot.innerHTML = '<h1>PhiSafe · Household emergency plan</h1>' +
    '<p>Printed: ' + e(new Date().toLocaleString()) + ' · Planning horizon: ' + targetDays + ' days</p>' +
    '<p class="print-warn"><strong>Not a live warning service.</strong> Follow official emergency alerts and instructions.</p>' +
    '<h2>Household and transport</h2><ul>' +
    entry("People", h.people) + entry("Dogs", h.dogs) + entry("Cats", h.cats) + entry("Other pets", h.otherPets) +
    entry("Verified safe seats", h.peopleSeats) + entry("Secure animal spaces", h.animalSpaces) + '</ul>' +
    '<h2>Water and food</h2><ul>' + entry("People water on hand (gallons)",h.humanWaterGallons) +
    entry("People water target (gallons)", m.humanWaterNeeded) +
    entry("Animal water on hand (gallons)", h.animalWaterGallons) +
    entry("All animals water/day (gallons)",h.animalWaterDailyGallons) +
    entry("People food (days)", h.peopleFoodDays) + entry("Dog food (days)",h.dogFoodDays) +
    entry("Cat food (days)",h.catFoodDays) + entry("Other pet food (days)",h.otherPetsFoodDays) +
    entry("Essential medication (days)",h.medsDays) + '</ul>' +
    '<h2>Evacuation contacts and routes</h2><ul>' +
    entry("Alert/zone",p.alertZone) + entry("Primary destination",p.meetingPlace) +
    entry("Backup destination",p.backupPlace) + entry("Primary route",p.routeA) +
    entry("Backup route",p.routeB) + entry("Emergency contact",p.emergencyContact) +
    entry("Notes",p.notes) + '</ul>' +
    '<h2>Animal roster (' + state.pets.length + ' of ' + m.animals + ')</h2><ul>' +
    (state.pets.map(animal => entry(animal.species + ": " + animal.name, (animal.carrier || "No secured spot") + (animal.notes ? " | " + animal.notes : ""))).join("") || '<li>No roster entered</li>') + '</ul>' +
    '<h2>Action checklist</h2><ul>' + ACTIONS.map(a => entry(state.tasks[a.id] ? "[x]" : "[ ]",a.label)).join("") + '</ul>' +
    '<h2>Inventory</h2><ul>' + (state.supplies.map(s => entry(s.name,fmt(s.quantity)+" / "+fmt(s.goal)+" "+s.unit)).join("") || '<li>No inventory entered</li>') + '</ul>' +
    '<p class="print-warn">Keep this printout private. It may contain names, locations and contact details.</p>';
}
function render() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    const selected = button.dataset.tab === tab;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const helpers = {e,fmt,stat,pill};
  const views = {
    overview: renderOverview, setup: () => renderSetup(state,setupStep,helpers),
    quick: () => renderQuick(state,quickGuide,helpers),
    household: renderHousehold, supplies: renderSupplies,
    animals: renderAnimals, evacuation: renderEvacuation,
    loading: () => renderLoading(state,helpers),
    power: () => renderPower(state,helpers),
    bags: () => renderGoBags(state,helpers),
    drill: () => renderDrill(state,helpers),
    field: () => renderField(state,offlineAuditResult,helpers),
    vault: renderVault,
    guides: renderGuides
  };
  root.innerHTML = views[tab]();
  renderPrint();
}
function updateConnection() {
  const status = document.querySelector("#connectionStatus");
  status.textContent = navigator.onLine ? "Network appears online" : "Network appears offline";
}
function downloadEncryptedBackup(envelope) {
  const blob = new Blob([JSON.stringify(envelope,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href=url;
  link.download="phisafe-encrypted-"+new Date().toISOString().slice(0,10)+".json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBackup() {
  const data = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "phisafe-private-backup-" + new Date().toISOString().slice(0,10) + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  tell("Backup downloaded. This file contains private information in plain text. Store it securely.");
}
document.addEventListener("click", event => {
  const control = event.target.closest("[data-action],[data-tab]");
  if (!control) return;
  if (control.dataset.tab) {
    tab = control.dataset.tab;
    if (tab === "setup") setupStep = setupReport(state).nextStep;
    render();
    root.focus({preventScroll:true});
    return;
  }
  const action = control.dataset.action;
  const key = control.dataset.id;
  if (action === "print") { renderPrint(); window.print(); return; }
  if (action === "select-quick-guide") {
    quickGuide=guideFor(control.dataset.guide).id;
    render();
    return;
  }
  if (action === "print-quick") {
    printRoot.innerHTML=printQuick(state,quickGuide,e);
    window.addEventListener("afterprint",renderPrint,{once:true});
    window.print();
    return;
  }
  if (action === "print-field") {
    printRoot.innerHTML = printFieldCard(state,e);
    window.addEventListener("afterprint",renderPrint,{once:true});
    window.print();
    return;
  }
  if (action === "offline-audit") {
    const supported = "caches" in window && "serviceWorker" in navigator;
    inspectOfflineShell({
      secure:window.isSecureContext === true,
      cacheStorageAvailable:supported,
      controller:supported && Boolean(navigator.serviceWorker.controller),
      getCacheNames:()=>caches.keys(),
      hasCached:async(name,file)=>{
        const cache=await caches.open(name);
        const cached=await cache.match(new URL(file,location.href));
        return Boolean(cached);
      }
    }).then(result=>{
      offlineAuditResult=result;
      render();
    }).catch(()=>tell("Cache audit failed. Offline availability remains unverified."));
    return;
  }
  if (action === "print-loading") {
    printRoot.innerHTML = printLoadingSheet(state,e);
    window.addEventListener("afterprint", renderPrint, {once:true});
    window.print();
    return;
  }
  if (action === "drill-start") {
    if(state.rehearsal.startedAt) { tell("A drill is already active."); return; }
    state.rehearsal=newRehearsal(state.rehearsal.history);
    save();
    return;
  }
  if (action === "drill-cancel") {
    if (state.rehearsal.startedAt && confirm("Discard this practice session? Past records will remain.")) {
      const past=state.rehearsal.history;
      state.rehearsal=newRehearsal(past);
      state.rehearsal.startedAt=null;
      save();
    }
    return;
  }
  if (action === "drill-finish") {
    if (!state.rehearsal.startedAt) { tell("Start a practice drill first."); return; }
    const status=rehearsalReport(state);
    if (status.warnings.length && !confirm("Practice is incomplete ("+status.warnings.length+" unresolved checks). Save this as an incomplete drill?")) return;
    const record=buildRehearsalRecord(state,new Date().toISOString());
    const history=[record,...state.rehearsal.history].slice(0,20);
    state.rehearsal=newRehearsal(history);
    state.rehearsal.startedAt=null;
    save();
    tell(record.status==="complete" ? "Practice recorded as complete. Verify physical conditions separately." : "Incomplete practice recorded for follow-up.");
    return;
  }
  if (action === "print-manifest") {
    printRoot.innerHTML = manifestPrint(state,e);
    window.addEventListener("afterprint", renderPrint, {once:true});
    window.print();
    return;
  }
  if (action === "export") { exportBackup(); return; }
  if (action === "import") { document.querySelector("#importFile").click(); return; }
  if (action === "horizon") { targetDays = Number(control.dataset.days); render(); return; }
  if (action === "setup-step") {
    if (SETUP_STEPS.some(item=>item.id===key)) { setupStep=key; tab="setup"; render(); }
    return;
  }
  if (action === "setup-next") {
    const at=SETUP_STEPS.findIndex(item=>item.id===setupStep);
    setupStep=SETUP_STEPS[(at+1)%SETUP_STEPS.length].id;
    tab="setup";
    render();
    return;
  }
  if (action === "delete-supply") {
    const item = state.supplies.find(x => x.id === key);
    if (item && confirm("Remove " + item.name + " from inventory?")) { state.supplies = state.supplies.filter(x => x.id !== key); save(); }
    return;
  }
  if (action === "delete-pet") {
    const pet = state.pets.find(x => x.id === key);
    if (pet && confirm("Remove " + pet.name + " from this roster?")) { state.pets = state.pets.filter(x => x.id !== key); save(); }
    return;
  }
  if (action === "toggle-loaded") {
    const pet = state.pets.find(x => x.id === key);
    if (pet) { pet.loaded = !pet.loaded; save(); }
    return;
  }
  if (action === "delete-vehicle") {
    const vehicle = state.loading.vehicles.find(v=>v.id===key);
    if (vehicle && confirm("Remove " + vehicle.name + " and its assigned animal spaces?")) {
      state.loading.vehicles = state.loading.vehicles.filter(v=>v.id!==key);
      state.loading.assignments = state.loading.assignments.filter(a=>a.vehicleId!==key);
      save();
    }
    return;
  }
  if (action === "delete-power-device") {
    const device = state.power.devices.find(d=>d.id===key);
    if (device && confirm("Remove " + device.name + " from the power estimate?")) {
      state.power.devices = state.power.devices.filter(d=>d.id!==key);
      save();
    }
    return;
  }
  if (action === "reset-loaded") {
    if (confirm("Reset all loading marks for a fresh drill?")) { state.pets.forEach(x => x.loaded = false); save(); }
    return;
  }
  if (action === "reset-all" && confirm("Permanently remove this browser’s PhiSafe plan? Export a backup first if needed.")) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    state = defaultState();
    offlineAuditResult = null;
    setupStep = "household";
    tab = "setup";
    render();
    tell("This browser’s PhiSafe plan was cleared. Existing downloaded backups were not deleted.");
  }
});
document.addEventListener("change", event => {
  const el = event.target;
  if (el.dataset.action === "toggle-task") {
    state.tasks[el.dataset.id] = el.checked;
    save();
  }
  if (el.dataset.action === "setup-backup-review") {
    state.setup.backupReviewedAt = el.checked ? new Date().toISOString() : null;
    state = normalizeState(state);
    save(true);
    return;
  }
  if (el.dataset.action === "field-verify") {
    if (el.checked) state.field.checks[el.dataset.id]=new Date().toISOString();
    else delete state.field.checks[el.dataset.id];
    state=normalizeState(state);
    save();
    return;
  }
  if (el.dataset.action === "drill-stage") {
    if (!state.rehearsal.startedAt) return;
    if (el.checked) state.rehearsal.stageChecks[el.dataset.id]=true;
    else delete state.rehearsal.stageChecks[el.dataset.id];
    state=normalizeState(state);
    save();
    return;
  }
  if (el.dataset.action === "drill-pet") {
    if (!state.rehearsal.startedAt || !state.pets.some(p=>p.id===el.dataset.id)) return;
    const field=el.dataset.field;
    if (!["located","secured","arrived"].includes(field)) return;
    const current=state.rehearsal.animalChecks[el.dataset.id] ||
      {located:false,secured:false,arrived:false};
    if (el.checked && field==="secured" && !current.located) {
      tell("Locate and physically verify this animal first.");
      render(); return;
    }
    if (el.checked && field==="arrived" && !current.secured) {
      tell("Verify this animal is secured before the destination recount.");
      render(); return;
    }
    current[field]=el.checked;
    if (field==="located" && !el.checked) {current.secured=false;current.arrived=false;}
    if (field==="secured" && !el.checked) current.arrived=false;
    state.rehearsal.animalChecks[el.dataset.id]=current;
    state=normalizeState(state);
    save();
    return;
  }
  if (el.dataset.action === "toggle-manifest") {
    const id=el.dataset.id;
    if (el.checked) state.manifest.packed[id]=true;
    else delete state.manifest.packed[id];
    save();
  }
  if (el.dataset.action === "assign-pet-space") {
    const petId=el.dataset.id;
    if (!state.pets.some(p=>p.id===petId)) return;
    const value=el.value;
    state.loading.assignments=state.loading.assignments.filter(a=>a.petId!==petId);
    if (value) {
      const match=/^([A-Za-z0-9_-]+):([0-9]{1,2})$/.exec(value);
      if (!match) { tell("Invalid animal space."); render(); return; }
      const vehicle=state.loading.vehicles.find(v=>v.id===match[1]);
      const slot=Number(match[2]);
      const occupied=state.loading.assignments.some(a=>a.vehicleId===match[1] && a.slot===slot);
      if (!vehicle || slot<1 || slot>vehicle.petSpaces || occupied) {
        tell("Selected animal space is unavailable. No new assignment was made.");
        save();
        return;
      }
      state.loading.assignments.push({petId,vehicleId:match[1],slot});
    }
    save();
  }
});
document.addEventListener("submit", event => {
  const form = event.target;
  const id = form.id || form.dataset.form;
  if (!["householdForm","supplyForm","petForm","planForm","vehicleAddForm","edit-vehicle","powerSettingsForm","powerDeviceForm","drillPeopleForm","fieldNotesForm","setupHouseholdForm","setupAnimalForm","setupDestinationForm","setupEssentialsForm"].includes(id)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (id === "setupHouseholdForm") {
    const next=structuredClone(state);
    for(const key of ["people","dogs","cats","otherPets"]) next.household[key]=data[key];
    state=normalizeState(next);
    setupStep="animals";tab="setup";save();
    return;
  }
  if (id === "setupAnimalForm") {
    const next=structuredClone(state);
    if (!mayAddAnimal(next,data.species)) {
      tell("This species count is already filled. Adjust household totals or review the existing roster.");
      return;
    }
    const name=String(data.name||"").trim();
    const carrier=String(data.carrier||"").trim();
    if(!name||!carrier) {tell("Enter the animal's name and a real carrier or restraint identifier.");return;}
    next.pets.push({id:newId(),name,species:data.species,carrier,notes:"",loaded:false});
    state=normalizeState(next);
    setupStep="animals";tab="setup";save();
    return;
  }
  if (id === "setupDestinationForm") {
    const next=structuredClone(state);
    for(const key of ["meetingPlace","backupPlace","routeA","routeB","emergencyContact"]) next.plan[key]=data[key];
    state=normalizeState(next);
    setupStep="essentials";tab="setup";save();
    return;
  }
  if (id === "setupEssentialsForm") {
    const next=structuredClone(state);
    for(const key of ["humanWaterGallons","animalWaterDailyGallons","animalWaterGallons",
      "peopleFoodDays","dogFoodDays","catFoodDays","otherPetsFoodDays","medsDays"]) next.household[key]=data[key];
    state=normalizeState(next);
    setupStep="backup";tab="setup";save();
    return;
  }
  if (form.id === "householdForm") {
    const next = structuredClone(state);
    for (const key of Object.keys(next.household)) next.household[key] = data[key];
    state = normalizeState(next);
    save();
  }
  if (form.id === "supplyForm") {
    const item = {id:newId(),name:data.name,category:data.category,quantity:data.quantity,goal:data.goal,unit:data.unit,expires:data.expires};
    const next = structuredClone(state);
    next.supplies.push(item);
    state = normalizeState(next);
    save();
  }
  if (form.id === "petForm") {
    const next = structuredClone(state);
    next.pets.push({id:newId(),name:data.name,species:data.species,carrier:data.carrier,notes:data.notes,loaded:false});
    state = normalizeState(next);
    save();
  }
  if (form.id === "planForm") {
    const next = structuredClone(state);
    Object.keys(next.plan).forEach(key => next.plan[key] = data[key]);
    state = normalizeState(next);
    save();
  }
  if (id === "fieldNotesForm") {
    state.field.notes=data.notes;
    state=normalizeState(state);
    save();
    return;
  }
  if (id === "drillPeopleForm") {
    if (!state.rehearsal.startedAt) return;
    state.rehearsal.peopleBoarded=data.peopleBoarded;
    state.rehearsal.peopleAtDestination=data.peopleAtDestination;
    state.rehearsal.notes=data.notes;
    state=normalizeState(state);
    save();
  }
  if (id === "vehicleAddForm") {
    if (state.loading.vehicles.length >= 12) { tell("Maximum 12 vehicles in this version."); return; }
    const next=structuredClone(state);
    next.loading.vehicles.push({id:newId(),name:data.name,kind:data.kind,peopleSeats:data.peopleSeats,
      peopleAssigned:data.peopleAssigned,petSpaces:data.petSpaces,notes:data.notes});
    state=normalizeState(next);
    save();
  }
  if (id === "edit-vehicle") {
    const vehicle=state.loading.vehicles.find(v=>v.id===form.dataset.id);
    if (!vehicle) return;
    Object.assign(vehicle,{name:data.name,kind:data.kind,peopleSeats:data.peopleSeats,
      peopleAssigned:data.peopleAssigned,petSpaces:data.petSpaces,notes:data.notes});
    state=normalizeState(state);
    save();
  }
  if (id === "powerSettingsForm") {
    const next=structuredClone(state);
    for (const key of ["batteryWh","usablePercent","inverterEfficiencyPercent","inverterContinuousW"]) {
      next.power[key]=data[key];
    }
    state=normalizeState(next);
    save();
  }
  if (id === "powerDeviceForm") {
    if(state.power.devices.length>=80) { tell("Maximum 80 devices in this version."); return; }
    const next=structuredClone(state);
    next.power.devices.push({id:newId(),name:data.name,watts:data.watts,
      hoursPerDay:data.hoursPerDay,simultaneous:data.simultaneous==="on"});
    state=normalizeState(next);
    save();
  }
});
document.querySelector("#importFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 1024*1024) throw new Error("Backup too large (1 MB limit).");
    const parsed = JSON.parse(await file.text());
    const replacement = normalizeState(parsed);
    if (!confirm("Replace this browser’s PhiSafe plan with the selected backup? Export your current plan first if needed.")) return;
    if (commitRestoredPlan(replacement)) tell("Backup imported successfully. Check quantities, destination details and roster before relying on it.");
  } catch (err) { tell("Import failed: " + (err instanceof Error ? err.message : "Invalid file")); }
});
document.addEventListener("submit", async event => {
  const form = event.target;
  if (!["vaultExportForm","vaultImportForm"].includes(form.id)) return;
  event.preventDefault();
  if (vaultBusy) return;
  vaultBusy = true;
  const submit = form.querySelector('[type="submit"]');
  if(submit) submit.disabled=true;
  try {
    if (form.id==="vaultExportForm") {
      const passphrase = form.querySelector("#vaultExportPassphrase").value;
      const confirmation = form.querySelector("#vaultConfirmPassphrase").value;
      if (passphrase !== confirmation) throw new Error("Passphrases do not match.");
      const envelope = await encryptPlan(state,passphrase);
      downloadEncryptedBackup(envelope);
      tell("Encrypted backup downloaded. Store it securely and test restoring a copy. Your browser-local plan remains unencrypted.");
    } else {
      const file = form.querySelector("#vaultImportFile").files?.[0];
      if (!file) throw new Error("Choose an encrypted PhiSafe backup file.");
      if (file.size>MAX_VAULT_FILE_BYTES) throw new Error("Encrypted backup exceeds the 2 MiB limit.");
      let envelope;
      try {envelope=JSON.parse(await file.text());}
      catch(_) {throw new Error("This file is not valid JSON.");}
      if (!isEncryptedBackup(envelope)) throw new Error("This is not a PhiSafe encrypted backup. Use the plain JSON importer for old backups.");
      const passphrase = form.querySelector("#vaultImportPassphrase").value;
      const restored=await decryptPlan(envelope,passphrase);
      if (!confirm("Decryption succeeded. Replace this browser's current plan with the recovered plan? Export your existing plan first if needed.")) {
        tell("Restore cancelled. Existing browser plan was not changed.");
      } else if (commitRestoredPlan(restored)) {
        tell("Encrypted backup restored. Verify household counts, contact details and all animal assignments.");
      }
    }
  } catch(error) {
    tell("Vault: "+(error instanceof Error ? error.message : "Unable to process this backup."));
  } finally {
    form.querySelectorAll('input[type="password"]').forEach(input=>{input.value="";});
    const f=form.querySelector('input[type="file"]');if(f)f.value="";
    if(submit)submit.disabled=false;
    vaultBusy=false;
  }
});
window.addEventListener("online",updateConnection);
window.addEventListener("offline",updateConnection);
updateConnection();
render();
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    tell("Offline caching could not be enabled. Print or export your plan before disconnecting.");
  });
}
