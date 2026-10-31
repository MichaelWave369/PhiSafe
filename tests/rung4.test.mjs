import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, normalizeState } from "../core.mjs";
import { FIELD_CHECKS, SHELL_FILES, SHELL_CACHE,
  assessFieldReadiness, inspectOfflineShell } from "../rung4.mjs";
import { renderField, printFieldCard } from "../rung4-ui.mjs";

function completeExample() {
  const s=defaultState();
  Object.assign(s.household,{
    people:2,dogs:8,cats:9,humanWaterGallons:8,animalWaterGallons:6,
    animalWaterDailyGallons:2,peopleFoodDays:5,dogFoodDays:5,catFoodDays:5,medsDays:5
  });
  s.pets=[
    ...Array.from({length:8},(_,i)=>({id:"dog"+i,name:"Dog "+i,species:"dog",carrier:"Crate D"+i})),
    ...Array.from({length:9},(_,i)=>({id:"cat"+i,name:"Cat "+i,species:"cat",carrier:"Crate C"+i}))
  ];
  s.loading.vehicles=[{id:"v",name:"Transport Van",kind:"van",peopleSeats:2,peopleAssigned:2,petSpaces:17}];
  s.loading.assignments=s.pets.map((p,i)=>({petId:p.id,vehicleId:"v",slot:i+1}));
  Object.assign(s.plan,{meetingPlace:"Verified A",backupPlace:"Verified B",routeA:"Plan A",routeB:"Plan B",emergencyContact:"Test contact"});
  s.rehearsal.history=[{finishedAt:"2026-10-20T11:00:00Z",minutes:12,status:"complete",people:2,animals:17,
    boarded:2,animalsSecured:17,animalsArrived:17,warnings:[],notes:"Practice completed"}];
  return normalizeState(s);
}
const now="2026-10-31T10:00:00Z";
test("older plans preserve records and default to no field verification",()=>{
  const s=defaultState();delete s.field;
  s.household.people=2;
  const migrated=normalizeState(s);
  assert.equal(migrated.household.people,2);
  assert.deepEqual(migrated.field,{checks:{},notes:""});
});
test("incomplete household yields essential gaps and never a safety percentage",()=>{
  const result=assessFieldReadiness(defaultState(),now);
  assert.ok(result.essentials.some(x=>x.id==="people"));
  assert.ok(result.essentials.some(x=>x.id==="transport"));
  assert.equal("score" in result,false);
});
test("complete entered 2-person 17-animal plan clears structural essentials but not physical checks",()=>{
  const s=completeExample();
  const result=assessFieldReadiness(s,now);
  assert.equal(result.essentials.length,0);
  assert.equal(result.verifications.length,FIELD_CHECKS.length);
  assert.equal(result.loading.assignedAnimals,17);
});
test("removing one cat immediately raises an essential roster and transport gap",()=>{
  const s=completeExample();
  s.pets=s.pets.slice(0,-1);
  const result=assessFieldReadiness(normalizeState(s),now);
  assert.ok(result.essentials.some(x=>x.id==="roster"));
  assert.ok(result.essentials.some(x=>x.id==="transport"));
});
test("water unknown must remain visible, not invented",()=>{
  const s=completeExample();
  s.household.animalWaterDailyGallons=0;
  const result=assessFieldReadiness(s,now);
  assert.ok(result.important.some(x=>x.id==="animal-water-unknown"));
});
test("manual field checks are date-stamped, import-stable, and stale checks request review",()=>{
  const s=completeExample();
  s.field.checks.fit="2026-08-01T15:30:00.000Z";
  s.field.checks.offline="2026-10-30T10:00:00.000Z";
  s.field.checks.invalid="2026-10-30T10:00:00.000Z";
  const normalized=normalizeState(s);
  assert.equal(Object.hasOwn(normalized.field.checks,"invalid"),false);
  assert.deepEqual(normalizeState(normalized).field,normalized.field);
  const result=assessFieldReadiness(normalized,now);
  assert.ok(result.reviewSuggested.some(x=>x.id==="fit"));
  assert.equal(result.reviewSuggested.some(x=>x.id==="offline"),false);
});
test("offline cache audit distinguishes unsupported, partial and fully cached from actual offline",async()=>{
  let result=await inspectOfflineShell(null);
  assert.equal(result.status,"unverified");
  const base={secure:true,cacheStorageAvailable:true,controller:true,
    getCacheNames:async()=>[SHELL_CACHE],hasCached:async()=>true};
  result=await inspectOfflineShell(base);
  assert.equal(result.status,"cached");
  assert.equal(result.count,SHELL_FILES.length);
  assert.match(result.message,/actually disconnected/i);
  result=await inspectOfflineShell({...base,hasCached:async(_,path)=>path!=="./rung4.mjs"});
  assert.equal(result.status,"incomplete");
  assert.ok(result.missing.includes("./rung4.mjs"));
  result=await inspectOfflineShell({...base,getCacheNames:async()=>["phisafe-shell-v3"]});
  assert.equal(result.status,"unverified");
  result=await inspectOfflineShell({...base,hasCached:async()=>{throw Error("cache error");}});
  assert.equal(result.status,"unverified");
});
test("field-reference print escapes untrusted personal strings and shows vehicle",()=>{
  const s=completeExample();
  s.plan.meetingPlace="<script>alert(1)</script>";
  const e=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const html=printFieldCard(s,e);
  assert.ok(!html.includes("<script>"));
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/Transport Van/);
  const field=renderField(s,null,{e,pill:value=>String(value)});
  assert.ok(field.includes("Field readiness"));
});
