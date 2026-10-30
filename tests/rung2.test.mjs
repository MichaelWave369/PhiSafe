import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, normalizeState } from "../core.mjs";
import { BAG_ITEMS, loadingReport, powerReport, manifestReport } from "../rung2.mjs";

function sample() {
  const state = defaultState();
  Object.assign(state.household, {people:2,dogs:2,cats:1,peopleFoodDays:4,dogFoodDays:5,catFoodDays:4,medsDays:5,animalWaterDailyGallons:1.5,animalWaterGallons:6,humanWaterGallons:8});
  state.pets = [
    {id:"dogA",name:"A",species:"dog",carrier:"crate1",loaded:false},
    {id:"dogB",name:"B",species:"dog",carrier:"crate2",loaded:false},
    {id:"catC",name:"C",species:"cat",carrier:"carrier3",loaded:false}
  ];
  return state;
}
test("legacy schema-one plans migrate without losing household and pets", () => {
  const old = sample();
  delete old.loading;
  delete old.power;
  delete old.manifest;
  const restored = normalizeState(old);
  assert.equal(restored.household.people,2);
  assert.equal(restored.pets.length,3);
  assert.deepEqual(restored.loading.vehicles,[]);
  assert.equal(restored.power.batteryWh,0);
  assert.deepEqual(restored.manifest.packed,{});
});
test("one-to-one pet slot allocations and vehicle passengers", () => {
  const s=sample();
  s.loading.vehicles=[{id:"van1",name:"Main van",kind:"van",peopleSeats:2,peopleAssigned:2,petSpaces:3,notes:""}];
  s.loading.assignments=[
    {petId:"dogA",vehicleId:"van1",slot:1},
    {petId:"dogB",vehicleId:"van1",slot:2},
    {petId:"catC",vehicleId:"van1",slot:3}
  ];
  const normalized=normalizeState(s);
  const report=loadingReport(normalized);
  assert.equal(report.allocationComplete,true);
  assert.equal(report.assignedAnimals,3);
  assert.equal(report.occupancy[0].spaces[2].pet.name,"C");
  assert.deepEqual(normalized.loading.assignments,s.loading.assignments);
  assert.deepEqual(normalizeState(normalized).loading.assignments,normalized.loading.assignments);
});
test("duplicate spaces, unknown animals and changed capacity are not accepted",()=>{
  const s=sample();
  s.loading.vehicles=[{id:"van1",name:"Main van",peopleSeats:1,peopleAssigned:2,petSpaces:2}];
  s.loading.assignments=[
    {petId:"dogA",vehicleId:"van1",slot:1},
    {petId:"dogB",vehicleId:"van1",slot:1},
    {petId:"catC",vehicleId:"van1",slot:3},
    {petId:"nonexistent",vehicleId:"van1",slot:2}
  ];
  const restored=normalizeState(s);
  assert.equal(restored.loading.assignments.length,1);
  const report=loadingReport(restored);
  assert.equal(report.allocationComplete,false);
  assert.equal(report.unassignedPets.length,2);
  assert.equal(report.occupancy[0].passengersOverCapacity,true);
});
test("species mismatch defeats a superficially complete roster",()=>{
  const s=sample();
  s.pets[2].species="dog";
  s.loading.vehicles=[{id:"van",name:"Van",peopleSeats:2,peopleAssigned:2,petSpaces:3}];
  s.loading.assignments=s.pets.map((p,i)=>({petId:p.id,vehicleId:"van",slot:i+1}));
  assert.equal(loadingReport(normalizeState(s)).allocationComplete,false);
});
test("power daily energy, simultaneous load and effective battery energy",()=>{
  const s=sample();
  Object.assign(s.power,{batteryWh:1000,usablePercent:80,inverterEfficiencyPercent:85,inverterContinuousW:250,
    devices:[{id:"a",name:"Router",watts:20,hoursPerDay:4,simultaneous:true},
             {id:"b",name:"Lights",watts:10,hoursPerDay:8,simultaneous:false}]});
  const report=powerReport(normalizeState(s));
  assert.equal(report.dailyWh,160);
  assert.equal(report.simultaneousW,20);
  assert.equal(report.effectiveWh,680);
  assert.equal(report.estimatedDays,4.25);
  assert.equal(report.threeDayNeedWh,480);
  assert.equal(report.overInverter,false);
});
test("power unknown rather than inventing runtime, detects overload",()=>{
  const s=sample();
  assert.equal(powerReport(s).estimatedDays,null);
  s.power.devices=[{id:"c",name:"Pump",watts:300,hoursPerDay:1,simultaneous:true}];
  s.power.inverterContinuousW=200;
  assert.equal(powerReport(s).overInverter,true);
  assert.equal(powerReport(s).estimatedDays,null);
});
test("manifest calculates 72 hours without guessing pet water use",()=>{
  const s=sample();
  let report=manifestReport(s);
  assert.equal(report.humanWaterGallons,6);
  assert.equal(report.animalWaterGallons,4.5);
  assert.equal(report.petRows.length,3);
  assert.equal(report.gaps.length,0);
  s.household.animalWaterDailyGallons=0;
  report=manifestReport(s);
  assert.equal(report.animalWaterGallons,null);
  assert.ok(report.gaps.some(g=>g.includes("unknown")));
});
test("manifest marks are private and restricted to current valid item IDs",()=>{
  const s=sample();
  s.manifest.packed={ "people-water":true,"pet-catC":true,"__proto__":true,"malicious":true };
  const restored=normalizeState(s);
  assert.equal(restored.manifest.packed["people-water"],true);
  assert.equal(restored.manifest.packed["pet-catC"],true);
  assert.equal(Object.hasOwn(restored.manifest.packed,"malicious"),false);
  assert.equal(manifestReport(restored).packedCount,2);
  assert.ok(BAG_ITEMS.some(i=>i.id==="shared-maps"));
});
