// PhiSafe core: deterministic calculations and strict import normalization.
// No network code and no household data shipped in this file.
export const STORAGE_KEY = "phisafe-household-v1";
export const CURRENT_SCHEMA = 1;
export const ACTIONS = Object.freeze([
  { id: "alerts", label: "Register for official local emergency alerts" },
  { id: "transport", label: "Verify safe transportation for every person and animal" },
  { id: "carriers", label: "Label and stage carriers, crates, leashes and medications" },
  { id: "destinations", label: "Confirm two evacuation destinations that accept all animals" },
  { id: "documents", label: "Prepare IDs, medical and veterinary records and contact copies" },
  { id: "drill", label: "Practice a complete loading and evacuation drill" }
]);
const cleanText = (value, max = 500) => typeof value === "string" ? value.slice(0, max).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") : "";
const count = (v, max = 9999) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;
};
const qty = (v, max = 1e7) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};
const id = v => cleanText(v, 80).replace(/[^a-zA-Z0-9_-]/g, "") || "item";
const uniqueId = (value, index, used) => {
  const base = id(value);
  let candidate = base;
  let serial = 0;
  while (used.has(candidate)) candidate = base + "-" + index + "-" + (++serial);
  used.add(candidate);
  return candidate;
};
export function defaultState() {
  return {
    schema: CURRENT_SCHEMA,
    household: {
      people: 0, dogs: 0, cats: 0, otherPets: 0,
      humanWaterGallons: 0, animalWaterGallons: 0, animalWaterDailyGallons: 0,
      peopleFoodDays: 0, dogFoodDays: 0, catFoodDays: 0, otherPetsFoodDays: 0,
      medsDays: 0, peopleSeats: 0, animalSpaces: 0
    },
    supplies: [],
    pets: [],
    tasks: Object.fromEntries(ACTIONS.map(action => [action.id, false])),
    plan: { alertZone: "", meetingPlace: "", backupPlace: "", routeA: "", routeB: "", emergencyContact: "", notes: "" },
    updatedAt: null
  };
}
export function normalizeState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.schema !== CURRENT_SCHEMA) {
    throw new Error("Unsupported or invalid PhiSafe backup. Expected schema 1.");
  }
  const result = defaultState();
  const h = raw.household && typeof raw.household === "object" ? raw.household : {};
  for (const field of ["people", "dogs", "cats", "otherPets", "peopleSeats", "animalSpaces"]) {
    result.household[field] = count(h[field], 999);
  }
  for (const field of [
    "humanWaterGallons", "animalWaterGallons", "animalWaterDailyGallons",
    "peopleFoodDays", "dogFoodDays", "catFoodDays", "otherPetsFoodDays", "medsDays"
  ]) result.household[field] = qty(h[field]);
  const supplyIds = new Set();
  if (Array.isArray(raw.supplies)) result.supplies = raw.supplies.slice(0, 500).map((x, i) => ({
    id: uniqueId(x?.id, i, supplyIds),
    name: cleanText(x?.name, 120),
    category: ["food", "water", "medical", "equipment", "sanitation", "other"].includes(x?.category) ? x.category : "other",
    quantity: qty(x?.quantity),
    goal: qty(x?.goal),
    unit: cleanText(x?.unit, 24),
    expires: /^\d{4}-\d{2}-\d{2}$/.test(x?.expires || "") ? x.expires : ""
  })).filter(x => x.name);
  const petIds = new Set();
  if (Array.isArray(raw.pets)) result.pets = raw.pets.slice(0, 200).map((x, i) => ({
    id: uniqueId(x?.id, i, petIds),
    name: cleanText(x?.name, 100),
    species: ["dog", "cat", "other"].includes(x?.species) ? x.species : "other",
    carrier: cleanText(x?.carrier, 100),
    notes: cleanText(x?.notes, 300),
    loaded: x?.loaded === true
  })).filter(x => x.name);
  if (raw.tasks && typeof raw.tasks === "object") for (const action of ACTIONS) {
    result.tasks[action.id] = raw.tasks[action.id] === true;
  }
  const p = raw.plan && typeof raw.plan === "object" ? raw.plan : {};
  for (const field of Object.keys(result.plan)) result.plan[field] = cleanText(p[field], field === "notes" ? 2000 : 300);
  result.updatedAt = typeof raw.updatedAt === "string" ? cleanText(raw.updatedAt, 40) : null;
  return result;
}
export function metrics(state, days = 14) {
  const h = state.household;
  const targetDays = Math.max(1, Math.min(90, Number(days) || 14));
  const animals = h.dogs + h.cats + h.otherPets;
  const humanWaterNeeded = h.people * targetDays; // planning baseline: 1 US gallon/person/day
  const animalWaterNeeded = animals > 0 && h.animalWaterDailyGallons > 0
    ? h.animalWaterDailyGallons * targetDays : null;
  const rosterCount = state.pets.length;
  const rosterCounts = {
    dogs: state.pets.filter(p => p.species === "dog").length,
    cats: state.pets.filter(p => p.species === "cat").length,
    otherPets: state.pets.filter(p => p.species === "other").length
  };
  return {
    targetDays,
    animals, rosterCount, rosterCounts,
    humanWaterNeeded, animalWaterNeeded,
    humanWaterDays: h.people > 0 ? h.humanWaterGallons / h.people : null,
    animalWaterDays: animals === 0 ? null : (h.animalWaterDailyGallons > 0
      ? h.animalWaterGallons / h.animalWaterDailyGallons : null),
    rosterComplete: animals > 0 && rosterCount === animals &&
      rosterCounts.dogs === h.dogs && rosterCounts.cats === h.cats && rosterCounts.otherPets === h.otherPets,
    transportReady: h.people > 0 && h.peopleSeats >= h.people && h.animalSpaces >= animals,
    transportKnown: h.peopleSeats > 0 && (animals === 0 || h.animalSpaces > 0),
    tasksDone: ACTIONS.filter(a => state.tasks[a.id]).length,
    tasksTotal: ACTIONS.length,
    inventoryShortfalls: state.supplies.filter(item => item.goal > item.quantity)
  };
}
export function upcomingExpiry(item, today = new Date().toISOString().slice(0, 10)) {
  return item.expires && item.expires < today ? "expired" : item.expires && item.expires <= today ? "expires today" : "";
}
