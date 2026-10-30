import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, normalizeState, metrics, ACTIONS, upcomingExpiry } from "../core.mjs";
test("defaults contain no private household data", () => {
  const s = defaultState();
  assert.equal(s.household.people, 0);
  assert.equal(s.pets.length, 0);
  assert.equal(s.plan.meetingPlace, "");
  assert.equal(ACTIONS.length, 6);
});
test("14-day human water target uses one gallon per person per day", () => {
  const s = defaultState();
  s.household.people = 2;
  s.household.humanWaterGallons = 10;
  assert.equal(metrics(s).humanWaterNeeded, 28);
  assert.equal(metrics(s).humanWaterDays, 5);
});
test("animal water is not guessed from headcount", () => {
  const s = defaultState();
  s.household.dogs = 3;
  assert.equal(metrics(s).animalWaterNeeded, null);
  s.household.animalWaterDailyGallons = 1.5;
  s.household.animalWaterGallons = 9;
  assert.equal(metrics(s).animalWaterNeeded, 21);
  assert.equal(metrics(s).animalWaterDays, 6);
});
test("evacuation requires seats and secured animal spaces", () => {
  const s = defaultState();
  Object.assign(s.household, { people: 2, dogs: 2, cats: 1, peopleSeats: 2, animalSpaces: 2 });
  assert.equal(metrics(s).transportReady, false);
  s.household.animalSpaces = 3;
  assert.equal(metrics(s).transportReady, true);
});
test("normalize keeps known fields, clamps quantities and rejects unsupported schema", () => {
  const s = defaultState();
  s.household.people = -20;
  s.household.humanWaterGallons = "Infinity";
  s.pets = [{ id:"unsafe/id", name:"Mochi", species:"cat", loaded:true }, { name:"" }];
  s.plan.notes = "<script>alert(1)</script>";
  const normalized = normalizeState(s);
  assert.equal(normalized.household.people, 0);
  assert.equal(normalized.household.humanWaterGallons, 0);
  assert.equal(normalized.pets.length, 1);
  assert.equal(normalized.pets[0].species, "cat");
  assert.match(normalized.plan.notes, /script/); // escaped at display boundary, not destroyed
  assert.throws(() => normalizeState({schema:99}), /Unsupported/);
});
test("shortfalls and expiry are deterministic", () => {
  const s = defaultState();
  s.supplies.push({id:"a", name:"Batteries", quantity:2, goal:4, expires:"2020-01-01"});
  assert.equal(metrics(s).inventoryShortfalls.length, 1);
  assert.equal(upcomingExpiry(s.supplies[0], "2026-01-01"), "expired");
});

test("roster requires species-matched entries and stable IDs", () => {
  const s = defaultState();
  s.household.dogs = 1;
  s.household.cats = 1;
  s.pets = [
    {id:"dog-1",name:"Dog A",species:"dog",loaded:false},
    {id:"dog-2",name:"Dog B",species:"dog",loaded:false}
  ];
  assert.equal(metrics(s).rosterComplete, false);
  s.pets[1].species = "cat";
  assert.equal(metrics(s).rosterComplete, true);
  const first = normalizeState(s);
  const second = normalizeState(first);
  assert.deepEqual(second.pets.map(p => p.id), first.pets.map(p => p.id));
});
