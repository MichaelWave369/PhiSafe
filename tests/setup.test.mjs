import test from "node:test";
import assert from "node:assert/strict";
import {defaultState,normalizeState} from "../core.mjs";
import {defaultSetup,normalizeSetup,isUntouchedPlan,setupReport,mayAddAnimal,SETUP_STEPS} from "../setup.mjs";
import {syntheticHousehold} from "./browser/fixtures.mjs";
import {renderSetup} from "../setup-ui.mjs";

const e=value=>String(value??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[c]);
const helpers={e,pill:(text)=>"<span>"+e(text)+"</span>"};

test("fresh schema-one state starts blank and ready for onboarding with no personal seeds",()=>{
  const s=defaultState();
  assert.equal(isUntouchedPlan(s),true);
  assert.equal(s.household.people,0);
  assert.deepEqual(s.pets,[]);
  assert.deepEqual(defaultSetup(),{setup:{backupReviewedAt:null}});
  const report=setupReport(s);
  assert.equal(report.completed,0);
  assert.equal(report.total,6);
  assert.equal(report.nextStep,"household");
  assert.equal(report.onboardingComplete,false);
});
test("old real plans normalize without losing data or requiring wizard reset",()=>{
  const s=normalizeState(syntheticHousehold());
  const old=structuredClone(s);
  delete old.setup;
  const restored=normalizeState(old);
  assert.equal(isUntouchedPlan(restored),false);
  assert.equal(restored.pets.length,17);
  assert.equal(restored.plan.meetingPlace,s.plan.meetingPlace);
  assert.deepEqual(restored.setup,{backupReviewedAt:null});
});
test("two people, eight dogs, nine cats represent all animals distinctly",()=>{
  const s=normalizeState(syntheticHousehold());
  const report=setupReport(s);
  assert.equal(report.people,2);
  assert.equal(report.expectedAnimals,17);
  assert.equal(report.species.dog,8);
  assert.equal(report.species.cat,9);
  assert.equal(report.rostered,17);
  assert.equal(report.stages.find(x=>x.id==="animals").done,true);
  assert.equal(report.stages.find(x=>x.id==="transport").done,true);
  assert.equal(report.stages.find(x=>x.id==="destination").done,true);
  assert.equal(report.stages.find(x=>x.id==="backup").done,false);
});
test("missing one cat is not masked by an extra dog; missing carriers also block animal stage",()=>{
  const s=syntheticHousehold();
  s.pets[s.pets.length-1].species="dog";
  let report=setupReport(normalizeState(s));
  assert.equal(report.stages.find(x=>x.id==="animals").done,false);
  assert.equal(report.stages.find(x=>x.id==="transport").done,false);
  s.pets[s.pets.length-1].species="cat";
  s.pets[0].carrier="";
  report=setupReport(normalizeState(s));
  assert.equal(report.missingCarriers,1);
  assert.equal(report.stages.find(x=>x.id==="animals").done,false);
});
test("adding an animal is constrained by declared species and total roster cap",()=>{
  const s=normalizeState(syntheticHousehold());
  assert.equal(mayAddAnimal(s,"cat"),false);
  assert.equal(mayAddAnimal(s,"dog"),false);
  assert.equal(mayAddAnimal(s,"other"),false);
  s.household.otherPets=1;
  assert.equal(mayAddAnimal(s,"other"),true);
});
test("two identical destinations are not treated as a completed departure plan",()=>{
  const s=syntheticHousehold();
  s.plan.backupPlace="  "+s.plan.meetingPlace.toUpperCase()+"  ";
  const report=setupReport(normalizeState(s));
  assert.equal(report.stages.find(x=>x.id==="destination").done,false);
});
test("manual backup check is normalized, does not certify device recovery",()=>{
  const s=syntheticHousehold();
  s.setup.backupReviewedAt="2026-10-31T12:00:00.000Z";
  s.setup.extraSecret="not-retained";
  const restored=normalizeState(s);
  assert.equal(restored.setup.backupReviewedAt,"2026-10-31T12:00:00.000Z");
  assert.equal(Object.hasOwn(restored.setup,"extraSecret"),false);
  assert.equal(setupReport(restored).stages.find(x=>x.id==="backup").done,true);
  assert.deepEqual(normalizeState(restored).setup,restored.setup);
  assert.deepEqual(normalizeSetup({setup:{backupReviewedAt:"not-a-date"}}),{setup:{backupReviewedAt:null}});
});
test("setup view escapes untrusted private names, and rendering is read-only",()=>{
  const s=normalizeState(syntheticHousehold());
  s.plan.meetingPlace='<script>alert(1)</script>';
  s.pets[0].name='<img src=x onerror=alert(1)>';
  const original=JSON.stringify(s);
  const html=renderSetup(s,"destination",helpers);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.equal(JSON.stringify(s),original);
  const animals=renderSetup(s,"animals",helpers);
  assert.ok(animals.includes("Individual animals"));
  assert.ok(animals.includes("Add animal to roster"));
  assert.equal(JSON.stringify(s),original);
});
test("step labels stay stable and no safe-to-evacuate declaration is emitted",()=>{
  assert.deepEqual(SETUP_STEPS.map(x=>x.id),["household","animals","transport","destination","essentials","backup"]);
  const html=renderSetup(defaultState(),"household",helpers);
  assert.ok(html.includes("not an evacuation safety certificate"));
  assert.ok(!html.includes("Safe to evacuate"));
});
