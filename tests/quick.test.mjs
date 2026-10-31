import test from "node:test";
import assert from "node:assert/strict";
import {defaultState,normalizeState} from "../core.mjs";
import {syntheticHousehold} from "./browser/fixtures.mjs";
import {QUICK_GUIDES, guideFor, quickSnapshot} from "../quick.mjs";
import {renderQuick,printQuick} from "../quick-ui.mjs";

const e=v=>String(v??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[c]);
const helpers={e,pill:(text)=>"<span>"+e(text)+"</span>"};
test("2 people and 17 synthetic animals are represented separately with planned vehicle slots",()=>{
  const s=normalizeState(syntheticHousehold());
  const view=quickSnapshot(s);
  assert.equal(view.people,2);
  assert.equal(view.dogs,8);
  assert.equal(view.cats,9);
  assert.equal(view.expectedAnimals,17);
  assert.equal(view.animals.length,17);
  assert.equal(view.assigned,17);
  assert.equal(view.animals[16].name,"Test Cat 9");
  assert.equal(view.animals[16].slot,17);
  assert.ok(view.allocationsEntered);
  assert.deepEqual(view.gaps,[]);
});
test("missing animal and unassigned transport result in visible gaps",()=>{
  const s=syntheticHousehold();
  s.pets.pop();
  const view=quickSnapshot(normalizeState(s));
  assert.equal(view.expectedAnimals,17);
  assert.equal(view.animals.length,16);
  assert.equal(view.allocationsEntered,false);
  assert.ok(view.gaps.some(item=>/animal roster/i.test(item)));
  assert.ok(view.gaps.some(item=>/vehicle allocation/i.test(item)));
});
test("no fabricated destination, route, or people counts in empty plan",()=>{
  const view=quickSnapshot(defaultState());
  assert.equal(view.people,0);
  assert.equal(view.expectedAnimals,0);
  assert.equal(view.plan.primary,"");
  assert.equal(view.plan.contact,"");
  assert.ok(view.gaps.length>0);
});
test("duplicated primary and backup destinations flagged without making evacuation decisions",()=>{
  const s=syntheticHousehold();
  s.plan.backupPlace=s.plan.meetingPlace;
  const view=quickSnapshot(normalizeState(s));
  assert.ok(view.gaps.some(text=>/identical/.test(text)));
  assert.equal("evacuateNow" in view,false);
});
test("static hazard guides have grounded agency links and validate unknown selections",()=>{
  assert.equal(QUICK_GUIDES.length,4);
  assert.equal(guideFor("not-real").id,"wildfire");
  for(const g of QUICK_GUIDES){
    assert.ok(g.reminders.length>=3);
    assert.match(g.url,/^https:\/\/(www\.ready\.gov|www\.cdc\.gov)\//);
  }
});
test("rendering and print escape user-supplied names and destinations, without mutating state",()=>{
  const s=normalizeState(syntheticHousehold());
  s.pets[0].name='<img src=x onerror="alert(1)">';
  s.plan.meetingPlace="<script>alert('x')</script>";
  s.plan.routeA='<a href="https://evil.test">Route</a>';
  const old=JSON.stringify(s);
  const view=renderQuick(s,"flood",helpers);
  const paper=printQuick(s,"flood",e);
  assert.doesNotMatch(view,/<script>|<img src=x|<a href="https:\/\/evil\.test"/);
  assert.doesNotMatch(paper,/<script>|<img src=x|<a href="https:\/\/evil\.test"/);
  assert.match(view,/&lt;script&gt;/);
  assert.match(paper,/&lt;img src=x/);
  assert.match(paper,/Test Cat 9/);
  assert.equal((paper.match(/<td>\[ \]<\/td>/g)||[]).length,34);
  assert.equal(JSON.stringify(s),old);
});
test("selected guidance is labeled reference, never a live alert",()=>{
  const html=renderQuick(normalizeState(syntheticHousehold()),"heat",helpers);
  assert.match(html,/not.*detect emergencies/i);
  assert.match(html,/Heat and Pets/);
  assert.match(html,/aria-pressed="true"/);
  assert.doesNotMatch(html,/checked="safe"/);
});
