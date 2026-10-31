import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, normalizeState } from "../core.mjs";
import { DRILL_STAGES, newRehearsal, rehearsalReport, buildRehearsalRecord, makeLoadSheet } from "../rung3.mjs";
import { printLoadingSheet } from "../rung3-ui.mjs";

function sample() {
  const s=defaultState();
  s.household.people=2;s.household.dogs=8;s.household.cats=9;
  s.loading.vehicles=[{id:"van",name:"Van",kind:"van",peopleSeats:2,peopleAssigned:2,petSpaces:17,notes:""}];
  s.pets=[
    ...Array.from({length:8},(_,i)=>({id:"dog"+i,name:"Dog "+i,species:"dog",carrier:"Crate "+i})),
    ...Array.from({length:9},(_,i)=>({id:"cat"+i,name:"Cat "+i,species:"cat",carrier:"Carrier "+i}))
  ];
  s.loading.assignments=s.pets.map((pet,i)=>({petId:pet.id,vehicleId:"van",slot:i+1}));
  return normalizeState(s);
}
test("Rung 2 and older schema-1 plans migrate with empty rehearsal",()=>{
  const old=defaultState();
  delete old.rehearsal;
  old.household.people=2;
  assert.equal(normalizeState(old).household.people,2);
  assert.equal(normalizeState(old).rehearsal.startedAt,null);
  assert.deepEqual(normalizeState(old).rehearsal.history,[]);
});
test("17 animals and two people get explicit individually labeled assignments",()=>{
  const s=sample();
  const sheet=makeLoadSheet(s);
  assert.equal(sheet.rows.length,17);
  assert.ok(sheet.rows.every(row=>row.vehicle==="Van" && row.space!==null));
  assert.equal(sheet.report.allocationComplete,true);
});
test("a started rehearsal remains incomplete until all stages and headcounts are checked",()=>{
  const s=sample();
  s.rehearsal=newRehearsal([],"2026-10-30T14:00:00.000Z");
  assert.equal(rehearsalReport(s).complete,false);
  for(const stage of DRILL_STAGES) s.rehearsal.stageChecks[stage.id]=true;
  for(const pet of s.pets) s.rehearsal.animalChecks[pet.id]={located:true,secured:true,arrived:true};
  s.rehearsal.peopleBoarded=2;s.rehearsal.peopleAtDestination=2;
  const report=rehearsalReport(s);
  assert.equal(report.secured,17);
  assert.equal(report.arrived,17);
  assert.equal(report.complete,true);
  const record=buildRehearsalRecord(s,"2026-10-30T14:13:00.000Z");
  assert.equal(record.status,"complete");
  assert.equal(record.minutes,13);
  assert.equal(record.animalsArrived,17);
});
test("missing a single cat at destination defeats completion",()=>{
  const s=sample();
  s.rehearsal=newRehearsal([],"2026-10-30T14:00:00Z");
  for(const stage of DRILL_STAGES) s.rehearsal.stageChecks[stage.id]=true;
  for(const pet of s.pets) s.rehearsal.animalChecks[pet.id]={located:true,secured:true,arrived:true};
  s.rehearsal.animalChecks["cat8"].arrived=false;
  s.rehearsal.peopleBoarded=2;s.rehearsal.peopleAtDestination=2;
  assert.equal(rehearsalReport(s).complete,false);
  assert.equal(buildRehearsalRecord(s,"2026-10-30T14:10:00Z").status,"incomplete");
});
test("invalid or deleted pet references do not survive backup normalization",()=>{
  const s=sample();
  s.rehearsal.animalChecks["cat0"]={located:true,secured:true,arrived:true};
  s.rehearsal.animalChecks["fake"]={located:true,secured:true,arrived:true};
  const cleaned=normalizeState(s);
  assert.ok(cleaned.rehearsal.animalChecks.cat0);
  assert.equal(cleaned.rehearsal.animalChecks.fake,undefined);
});
test("rehearsal history keeps newest 20, normalizes private text and is stable on repeated import",()=>{
  const s=sample();
  s.rehearsal.history=Array.from({length:23},(_,i)=>({
    finishedAt:new Date(Date.UTC(2026,9,30,14,i)).toISOString(),
    minutes:i,status:i%2?"incomplete":"complete",people:2,animals:17,boarded:2,
    animalsSecured:17,animalsArrived:17,warnings:["check again"],notes:"notes"
  }));
  const a=normalizeState(s);
  const b=normalizeState(a);
  assert.equal(a.rehearsal.history.length,20);
  assert.deepEqual(b.rehearsal.history,a.rehearsal.history);
});
test("paper load sheet escapes names and shows all 17 individual rows",()=>{
  const s=sample();
  s.pets[0].name="<script>alert(1)</script>";
  const html=printLoadingSheet(s,v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.equal((html.match(/<td style="text-align:center">\[ \]<\/td>/g)||[]).length,51);
});
test("recording an unstarted rehearsal is rejected",()=>{
  assert.throws(()=>buildRehearsalRecord(sample(),"2026-10-30T16:00:00Z"),/No active rehearsal/);
});
