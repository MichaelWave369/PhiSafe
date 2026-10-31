import test from "node:test";
import assert from "node:assert/strict";
import {defaultState,normalizeState} from "../core.mjs";
import {syntheticHousehold} from "./browser/fixtures.mjs";
import {
  PILOT_STORAGE_KEY,PILOT_REPORT_FORMAT,PILOT_REPORT_VERSION,PILOT_APP_VERSION,
  PILOT_CHECKS,normalizePilot,pilotProgress,installHint,makePublicPilotReport
} from "../pilot.mjs";
import {renderPilot} from "../pilot-ui.mjs";

const escape=value=>String(value??"").replace(/[&<>"']/g,char=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const helpers={e:escape,pill:value=>'<span>'+escape(value)+'</span>'};

test("pilot starts with no self-confirmations and separate storage key",()=>{
  const pilot=normalizePilot(null);
  assert.deepEqual(pilot,{checks:{}});
  assert.equal(PILOT_CHECKS.length,6);
  assert.equal(pilotProgress(pilot).done,0);
  assert.equal(pilotProgress(pilot).allSelfConfirmed,false);
  assert.notEqual(PILOT_STORAGE_KEY,"phisafe-household-v1");
});
test("pilot normalization keeps only known true flags",()=>{
  const pilot=normalizePilot({checks:{install:true,offline:false,roster:true,
    "pet-name":"Synthetic Pet",unknown:true},household:{people:200,route:"Secret"}});
  assert.deepEqual(pilot,{checks:{install:true,roster:true}});
  assert.deepEqual(normalizePilot(pilot),pilot);
});
test("self-confirmed count is advisory only, not a safety score",()=>{
  const p=normalizePilot({checks:Object.fromEntries(PILOT_CHECKS.map(x=>[x.id,true]))});
  assert.equal(pilotProgress(p).done,6);
  assert.equal(pilotProgress(p).allSelfConfirmed,true);
  assert.equal("safe" in pilotProgress(p),false);
});
test("installed status does not imply successful offline test",()=>{
  assert.equal(installHint({installed:true,promptAvailable:true}),"standalone");
  assert.equal(installHint({installed:false,promptAvailable:true}),"browser-prompt");
  assert.equal(installHint({installed:false,promptAvailable:false}),"manual");
});
test("public report only contains static allowlisted fields, never plan or arbitrary environment",()=>{
  const plan=normalizeState(syntheticHousehold());
  plan.pets[0].name="VERY PRIVATE ANIMAL NAME";
  plan.plan.meetingPlace="VERY PRIVATE DESTINATION";
  const env={
    secureContext:true,serviceWorkerSupported:true,serviceWorkerControlled:true,
    installed:false,cacheAudit:"cached",
    household:plan,plan,petNames:plan.pets.map(x=>x.name),
    userAgent:"Very private device signature",location:"A secret address",
    network:"Very private network identifier",timestamp:"2026-10-31T12:00:00Z"
  };
  const pilot=normalizePilot({checks:{offline:true}});
  const before=JSON.stringify(plan);
  const report=makePublicPilotReport(pilot,env);
  const serialized=JSON.stringify(report);
  assert.equal(report.format,PILOT_REPORT_FORMAT);
  assert.equal(report.version,PILOT_REPORT_VERSION);
  assert.equal(report.appVersion,PILOT_APP_VERSION);
  assert.equal(report.checks.offline,"self-confirmed");
  assert.equal(report.checks.backup,"not-tested");
  assert.deepEqual(Object.keys(report.environment).sort(),[
    "cacheAudit","secureContext","serviceWorkerControlled","serviceWorkerSupported","standaloneInstalled"
  ].sort());
  for (const sensitive of ["VERY PRIVATE","Synthetic destination","Test Cat","Very private","secret address",
    "phisafe-household-v1","2026-10-31T12:00:00Z"]) assert.equal(serialized.includes(sensitive),false);
  assert.equal(JSON.stringify(plan),before);
  assert.equal("household" in report,false);
  assert.equal("timestamp" in report,false);
});
test("unexpected cache-audit states cannot leak extra data",()=>{
  const report=makePublicPilotReport({checks:{install:true}},{
    cacheAudit:"SECRET ADDRESS, private data",secureContext:"true",installed:1
  });
  assert.equal(report.environment.cacheAudit,"unverified");
  assert.equal(report.environment.secureContext,false);
  assert.equal(report.environment.standaloneInstalled,false);
  assert.equal(JSON.stringify(report).includes("SECRET ADDRESS"),false);
});
test("the page provides manual installation and two real public issue links",()=>{
  const html=renderPilot(normalizePilot({checks:{print:true}}),{
    secureContext:true,serviceWorkerSupported:true,serviceWorkerControlled:true,
    installed:false,promptAvailable:false,cacheAudit:"unverified"
  },helpers);
  assert.match(html,/Community Field Pilot/);
  assert.match(html,/Add to Home Screen/);
  assert.match(html,/bug_report\.yml/);
  assert.match(html,/feature_request\.yml/);
  assert.match(html,/test confirmations stay in this browser/i);
  assert.doesNotMatch(html,/data-action="pilot-install"/);
});
test("an actual install prompt is offered only when browser indicates availability",()=>{
  const html=renderPilot(normalizePilot({}),{
    secureContext:true,serviceWorkerSupported:true,serviceWorkerControlled:false,
    installed:false,promptAvailable:true,cacheAudit:"unverified"
  },helpers);
  assert.match(html,/data-action="pilot-install"/);
  assert.match(html,/not offered an automatic install prompt/); // should not appear
});
