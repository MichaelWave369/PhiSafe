// PhiSafe Rung 2: pure, deterministic readiness logic. No network or browser APIs.
const numeric = (value, max = 10000000) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};
const whole = (value, max = 999) => Math.floor(numeric(value, max));
const text = (value, max = 160) => typeof value === "string"
  ? value.slice(0, max).replace(/[\u0000-\u001f]/g, "") : "";
const safeId = value => text(value, 80).replace(/[^A-Za-z0-9_-]/g, "") || "unknown";
const uniqueId = (value, used) => {
  const base = safeId(value);
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) candidate = base + "-" + suffix++;
  used.add(candidate);
  return candidate;
};
export const BAG_ITEMS = Object.freeze([
  { id:"people-water", group:"people", label:"Drinking and sanitation water for people" },
  { id:"people-food", group:"people", label:"Three days of shelf-stable food per person" },
  { id:"people-medication", group:"people", label:"Essential medications and instructions" },
  { id:"people-clothes", group:"people", label:"Clothing, sturdy shoes and weather protection" },
  { id:"people-documents", group:"people", label:"Copies of IDs, health information and contact details" },
  { id:"pets-water", group:"pets", label:"Water reserved for every animal" },
  { id:"pets-food", group:"pets", label:"At least three days of species-appropriate food" },
  { id:"pets-meds", group:"pets", label:"Animal medications, veterinary records and feeding instructions" },
  { id:"pets-carriers", group:"pets", label:"Labeled, secured carriers/crates, leashes and harnesses" },
  { id:"pets-cleanup", group:"pets", label:"Cat litter, waste bags, cleaning supplies and bedding" },
  { id:"pets-bowls", group:"pets", label:"Food and water bowls, manual can opener if needed" },
  { id:"shared-communications", group:"shared", label:"Charged phones, cables and portable power banks" },
  { id:"shared-maps", group:"shared", label:"Printed maps, emergency contacts and local alert information" },
  { id:"shared-lights", group:"shared", label:"Flashlights, batteries and emergency radio" },
  { id:"shared-medical", group:"shared", label:"First-aid kit, sanitation and personal hygiene" },
  { id:"shared-vehicle", group:"shared", label:"Vehicle keys, fuel/charge and emergency travel equipment" },
  { id:"shared-destinations", group:"shared", label:"Two confirmed destinations that accept the whole household" }
]);
export function defaultRung2() {
  return {
    loading: { vehicles: [], assignments: [] },
    power: {
      batteryWh: 0, usablePercent: 80, inverterEfficiencyPercent: 85,
      inverterContinuousW: 0, devices: []
    },
    manifest: { packed: {} }
  };
}
export function normalizeRung2(raw, pets) {
  const result = defaultRung2();
  const loading = raw?.loading && typeof raw.loading === "object" ? raw.loading : {};
  const usedVehicles = new Set();
  if (Array.isArray(loading.vehicles)) result.loading.vehicles = loading.vehicles.slice(0, 12)
    .map(vehicle => ({
      id: uniqueId(vehicle?.id, usedVehicles),
      name: text(vehicle?.name, 100),
      kind: ["car","truck","van","other"].includes(vehicle?.kind) ? vehicle.kind : "other",
      peopleSeats: whole(vehicle?.peopleSeats, 40),
      peopleAssigned: whole(vehicle?.peopleAssigned, 40),
      petSpaces: whole(vehicle?.petSpaces, 64),
      notes: text(vehicle?.notes, 300)
    })).filter(vehicle => vehicle.name);
  const vehicleById = new Map(result.loading.vehicles.map(v => [v.id, v]));
  const validPetIds = new Set(pets.map(p => p.id));
  const usedPets = new Set();
  const usedSpaces = new Set();
  if (Array.isArray(loading.assignments)) {
    for (const assignment of loading.assignments.slice(0, 200)) {
      const petId = safeId(assignment?.petId);
      const vehicleId = safeId(assignment?.vehicleId);
      const slot = whole(assignment?.slot, 64);
      const vehicle = vehicleById.get(vehicleId);
      const seatKey = vehicleId + ":" + slot;
      if (!validPetIds.has(petId) || !vehicle || slot < 1 || slot > vehicle.petSpaces ||
          usedPets.has(petId) || usedSpaces.has(seatKey)) continue;
      result.loading.assignments.push({ petId, vehicleId, slot });
      usedPets.add(petId);
      usedSpaces.add(seatKey);
    }
  }
  const power = raw?.power && typeof raw.power === "object" ? raw.power : {};
  result.power.batteryWh = numeric(power.batteryWh);
  result.power.usablePercent = power.usablePercent === undefined ? 80 : numeric(power.usablePercent, 100);
  result.power.inverterEfficiencyPercent = power.inverterEfficiencyPercent === undefined ? 85 : numeric(power.inverterEfficiencyPercent, 100);
  result.power.inverterContinuousW = numeric(power.inverterContinuousW, 100000);
  const usedDevices = new Set();
  if (Array.isArray(power.devices)) result.power.devices = power.devices.slice(0, 80)
    .map(device => ({
      id: uniqueId(device?.id, usedDevices),
      name: text(device?.name, 100),
      watts: numeric(device?.watts, 100000),
      hoursPerDay: numeric(device?.hoursPerDay, 24),
      simultaneous: device?.simultaneous !== false
    })).filter(device => device.name);
  const packed = raw?.manifest?.packed;
  if (packed && typeof packed === "object" && !Array.isArray(packed)) {
    const validBagIds = new Set(BAG_ITEMS.map(item => item.id));
    for (const pet of pets) validBagIds.add("pet-" + pet.id);
    for (const key of validBagIds) if (packed[key] === true) result.manifest.packed[key] = true;
  }
  return result;
}
export function loadingReport(state) {
  const people = state.household.people;
  const expectedAnimals = state.household.dogs + state.household.cats + state.household.otherPets;
  const pets = state.pets;
  const vehicles = state.loading.vehicles;
  const assignments = state.loading.assignments;
  const rosterCountOk = pets.length === expectedAnimals &&
    pets.filter(p=>p.species === "dog").length === state.household.dogs &&
    pets.filter(p=>p.species === "cat").length === state.household.cats &&
    pets.filter(p=>p.species === "other").length === state.household.otherPets;
  const assignedPeople = vehicles.reduce((sum, v) => sum + v.peopleAssigned, 0);
  const availableSeats = vehicles.reduce((sum, v) => sum + v.peopleSeats, 0);
  const availableSpaces = vehicles.reduce((sum, v) => sum + v.petSpaces, 0);
  const assignedIds = new Set(assignments.map(a => a.petId));
  const unassignedPets = pets.filter(p => !assignedIds.has(p.id));
  const passengerOverflow = vehicles.some(v => v.peopleAssigned > v.peopleSeats);
  const occupancy = vehicles.map(v => ({
    ...v,
    passengersOverCapacity: v.peopleAssigned > v.peopleSeats,
    spaces: Array.from({length:v.petSpaces}, (_, index) => {
      const slot = index + 1;
      const assignment = assignments.find(a=>a.vehicleId===v.id && a.slot===slot);
      const pet = assignment ? pets.find(p => p.id === assignment.petId) : null;
      return {slot, pet:pet || null};
    })
  }));
  return {
    people, expectedAnimals, rosterCountOk, assignedPeople,
    availableSeats, availableSpaces, assignedAnimals:assignments.length,
    unassignedPets, occupancy,
    allocationComplete: vehicles.length > 0 && people > 0 && assignedPeople === people &&
      !passengerOverflow && rosterCountOk && assignments.length === expectedAnimals
  };
}
export function powerReport(state) {
  const p = state.power;
  const dailyWh = p.devices.reduce((sum, device) => sum + device.watts * device.hoursPerDay, 0);
  const simultaneousW = p.devices.reduce((sum, device) => sum + (device.simultaneous ? device.watts : 0), 0);
  const effectiveWh = p.batteryWh > 0
    ? p.batteryWh * p.usablePercent / 100 * p.inverterEfficiencyPercent / 100 : null;
  return {
    dailyWh, simultaneousW, effectiveWh,
    estimatedDays: effectiveWh !== null && dailyWh > 0 ? effectiveWh / dailyWh : null,
    ratedInverter: p.inverterContinuousW || null,
    overInverter: p.inverterContinuousW > 0 && simultaneousW > p.inverterContinuousW,
    threeDayNeedWh: dailyWh > 0 ? dailyWh * 3 : null,
    ratedBatteryForThreeDaysWh: dailyWh > 0 && p.usablePercent > 0 && p.inverterEfficiencyPercent > 0
      ? dailyWh * 3 / (p.usablePercent / 100 * p.inverterEfficiencyPercent / 100) : null,
    incompleteDevices: p.devices.filter(d => d.watts <= 0 || d.hoursPerDay <= 0).length
  };
}
export function manifestReport(state) {
  const h = state.household;
  const animals = h.dogs + h.cats + h.otherPets;
  const petRows = state.pets.map(p => ({
    id:"pet-" + p.id, label:p.name + " (" + p.species + ") — carrier: " + (p.carrier || "NOT ASSIGNED")
  }));
  const rows = BAG_ITEMS.filter(item => item.group !== "pets" || animals > 0)
    .map(item => ({ ...item }));
  const all = rows.concat(petRows.map(row => ({...row,group:"individual"})));
  const packedCount = all.filter(item => state.manifest.packed[item.id] === true).length;
  const gaps = [];
  if (h.people < 1) gaps.push("People count is not configured.");
  if (h.people > 0 && h.humanWaterGallons < 3*h.people) gaps.push("Stored human water is below the three-day baseline.");
  if (h.people > 0 && h.peopleFoodDays < 3) gaps.push("People food is recorded as less than three days.");
  if (animals > 0) {
    if (h.animalWaterDailyGallons <= 0) gaps.push("Animal daily water requirement is unknown.");
    else if (h.animalWaterGallons < h.animalWaterDailyGallons*3) gaps.push("Animal water is recorded as less than three days.");
    if (h.dogs && h.dogFoodDays < 3) gaps.push("Dog food is recorded as less than three days.");
    if (h.cats && h.catFoodDays < 3) gaps.push("Cat food is recorded as less than three days.");
    if (h.otherPets && h.otherPetsFoodDays < 3) gaps.push("Other pet food is recorded as less than three days.");
    if (state.pets.length !== animals) gaps.push("Animal roster count does not match household counts.");
  }
  if (h.medsDays < 3) gaps.push("Essential medication supply is recorded as less than three days; check all prescriptions and veterinary needs.");
  return {
    rows, petRows, all, packedCount, total:all.length, gaps,
    humanWaterGallons:3*h.people,
    animalWaterGallons: animals > 0 && h.animalWaterDailyGallons > 0 ? 3*h.animalWaterDailyGallons : null
  };
}