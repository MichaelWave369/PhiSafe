import test from "node:test";
import assert from "node:assert/strict";
import {defaultState,normalizeState} from "../core.mjs";
import {makeDemoState,DEMO_MARKER,demoIsClearlyFictional} from "../demo.mjs";
import {loadingReport} from "../rung2.mjs";
import {quickSnapshot} from "../quick.mjs";
import {setupReport} from "../setup.mjs";

test("fictional demonstration is a valid schema-one plan with exactly 2 people and 4 animals",()=>{
  const demo=makeDemoState();
  assert.equal(demo.schema,1);
  assert.equal(demo.household.people,2);
  assert.equal(demo.household.dogs,2);
  assert.equal(demo.household.cats,2);
  assert.equal(demo.pets.length,4);
  assert.equal(new Set(demo.pets.map(p=>p.id)).size,4);
  assert.equal(demoIsClearlyFictional(demo),true);
  assert.match(DEMO_MARKER,/SAMPLE DATA/);
  assert.deepEqual(normalizeState(demo),demo);
});
test("demo contains obvious unreal destinations and no phone number or real family name",()=>{
  const demo=makeDemoState();
  const text=JSON.stringify(demo);
  assert.ok(demo.plan.meetingPlace.startsWith("FICTIONAL"));
  assert.ok(demo.plan.backupPlace.startsWith("FICTIONAL"));
  assert.ok(demo.plan.routeA.startsWith("EXAMPLE"));
  assert.match(demo.plan.emergencyContact,/FICTIONAL/);
  assert.doesNotMatch(text,/\b(?:\+1)?\d{3}[-. ]\d{3}[-. ]\d{4}\b/);
  for(const forbidden of ["Larrina","Mikey","Vina","Woodson Bridge","Michael Wayne"]) {
    assert.equal(text.includes(forbidden),false);
  }
});
test("demo assigns each animal to a unique declared slot but makes no real capacity claim",()=>{
  const demo=makeDemoState();
  const report=loadingReport(demo);
  assert.equal(report.assignedAnimals,4);
  assert.equal(report.allocationComplete,true);
  assert.equal(demo.loading.vehicles.length,1);
  assert.match(demo.loading.vehicles[0].notes,/not a statement/i);
  assert.deepEqual(demo.loading.assignments.map(a=>a.slot),[1,2,3,4]);
});
test("demo renders through normal quick reference and setup without ever changing a real record",()=>{
  const real=defaultState();
  real.household.people=7;
  real.plan.meetingPlace="EXISTING PRIVATE PLAN, SHOULD BE UNTOUCHED";
  const before=JSON.stringify(real);
  const demo=makeDemoState();
  const snapshot=quickSnapshot(demo);
  const setup=setupReport(demo);
  assert.equal(snapshot.animals.length,4);
  assert.equal(snapshot.people,2);
  assert.ok(setup.stages.find(s=>s.id==="transport").done);
  demo.household.people=9;
  demo.pets[0].name="Fake renamed pet";
  assert.equal(JSON.stringify(real),before);
});
test("each new demo starts from a fresh unmodified sample after past edits",()=>{
  const a=makeDemoState();
  a.pets[0].name="Modified";
  a.household.people=91;
  const b=makeDemoState();
  assert.equal(b.pets[0].name,"Example Dog One");
  assert.equal(b.household.people,2);
  assert.equal(demoIsClearlyFictional(b),true);
});
