// PhiSafe Rung 4: advisory field readiness. Never an evacuation order or safety certificate.
import { loadingReport } from "./rung2.mjs";
import { rehearsalReport } from "./rung3.mjs";

const clean = (x,limit=1200) => typeof x === "string"
  ? x.slice(0,limit).replace(/[\u0000-\u001f]/g,"") : "";
const iso = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value).toISOString() : null;

export const FIELD_CHECKS = Object.freeze([
  {id:"fit",name:"Physically verify vehicle fit and animal restraint positions",
    help:"Check every carrier, seat belt, ventilation, temperature and ability to load safely."},
  {id:"destination",name:"Personally confirm two destinations can accept everyone",
    help:"Ask about the actual animal count and any limitations or availability."},
  {id:"routes",name:"Review official road and evacuation information",
    help:"Confirm primary/alternate routes when preparing; conditions can change quickly."},
  {id:"paper",name:"Print and securely store a current family plan",
    help:"Include loading positions, numbers, contacts, and enough copies to be useful offline."},
  {id:"offline",name:"Open and use PhiSafe with connectivity disabled",
    help:"Test a genuine disconnected reload; the cache audit alone cannot prove this."},
  {id:"contact",name:"Test out-of-area contacts and coordination",
    help:"Agree who handles each animal and check how you will communicate if mobile service fails."}
]);

export const SHELL_FILES = Object.freeze([
  "./", "./index.html", "./styles.css", "./app.js", "./core.mjs",
  "./rung2.mjs", "./rung2-ui.mjs", "./rung3.mjs", "./rung3-ui.mjs",
  "./rung4.mjs", "./rung4-ui.mjs", "./manifest.webmanifest", "./icons/shield.svg"
]);
export const SHELL_CACHE = "phisafe-shell-v5";

export function defaultRung4() {
  return {field:{checks:{},notes:""}};
}
export function normalizeRung4(raw) {
  const field=raw?.field && typeof raw.field==="object" ? raw.field : {};
  const source = field.checks && typeof field.checks==="object" ? field.checks : {};
  const checks={};
  for(const item of FIELD_CHECKS) {
    const valid=iso(source[item.id]);
    if(valid) checks[item.id]=valid;
  }
  return {field:{checks,notes:clean(field.notes)}};
}
const gap=(priority,id,title,explanation)=>({priority,id,title,explanation});
export function assessFieldReadiness(state, now = new Date().toISOString()) {
  const h=state.household;
  const animals=h.dogs+h.cats+h.otherPets;
  const loading=loadingReport(state);
  const practice=rehearsalReport(state);
  const gaps=[];
  if(h.people<1) gaps.push(gap("essential","people","Record the people in this household","Headcount must be known."));
  if(animals>0 && !loading.rosterCountOk) gaps.push(gap("essential","roster","Complete the animal roster","Every animal must appear once, with species counts matching."));
  if(!loading.allocationComplete) gaps.push(gap("essential","transport","Finish the passenger and animal vehicle allocation","Entered travel spaces are only a diagram until physically verified."));
  if(!state.plan.meetingPlace || !state.plan.backupPlace) gaps.push(gap("essential","destination","Record two confirmed evacuation destinations","Do not assume a general pet-friendly destination accepts your group."));
  if(!state.plan.routeA || !state.plan.routeB) gaps.push(gap("important","routes","Describe primary and alternate departure routes","Road conditions must still be checked with official sources during an incident."));
  if(h.people>0 && h.humanWaterGallons<h.people*3) gaps.push(gap("important","human-water","Review three-day human water supply","Baseline is at least one US gallon per person per day."));
  if(h.people>0 && h.peopleFoodDays<3) gaps.push(gap("important","people-food","Review three-day food supply for people","Use actual portions and dietary needs."));
  if(animals>0) {
    if(h.animalWaterDailyGallons<=0) gaps.push(gap("important","animal-water-unknown","Set the actual daily water needs of all animals","Requirements differ by species, size, diet and temperature."));
    else if(h.animalWaterGallons<h.animalWaterDailyGallons*3) gaps.push(gap("important","animal-water","Review three-day animal water supply","Use your household's observed/verified daily amount."));
    if(h.dogs && h.dogFoodDays<3) gaps.push(gap("important","dog-food","Review dog food for three days","Consider each dog's actual meals."));
    if(h.cats && h.catFoodDays<3) gaps.push(gap("important","cat-food","Review cat food for three days","Consider each cat's actual meals."));
    if(h.otherPets && h.otherPetsFoodDays<3) gaps.push(gap("important","other-pet-food","Review food for other animals","Match each species' needs."));
  }
  if(h.medsDays<3) gaps.push(gap("important","medications","Review essential medication availability","Coordinate personal/veterinary prescriptions when possible."));
  if(!practice || !state.rehearsal.history.some(record=>record.status==="complete")) gaps.push(
    gap("important","rehearsal","Complete an actual calm-weather loading rehearsal","A checked app cannot prove that animals and crates fit physically."));
  const nowMs=Date.parse(now);
  const fieldStatuses=FIELD_CHECKS.map(item=>{
    const checkedAt=state.field.checks[item.id]||null;
    const ageDays=checkedAt && Number.isFinite(nowMs) ? Math.max(0,Math.floor((nowMs-Date.parse(checkedAt))/86400000)):null;
    const reviewSuggested=ageDays!==null && ageDays>30;
    if(!checkedAt) gaps.push(gap("verify","check-"+item.id,item.name,item.help));
    return {...item,checkedAt,ageDays,reviewSuggested};
  });
  return {
    gaps,
    essentials:gaps.filter(g=>g.priority==="essential"),
    important:gaps.filter(g=>g.priority==="important"),
    verifications:gaps.filter(g=>g.priority==="verify"),
    fieldStatuses,
    reviewSuggested:fieldStatuses.filter(x=>x.reviewSuggested),
    loading,
    practice
  };
}
// A technical cache audit. Even a passing result is not proof of an unplugged/offline session.
export async function inspectOfflineShell(env) {
  if(!env || !env.secure || !env.cacheStorageAvailable || !env.controller ||
    typeof env.getCacheNames!=="function" || typeof env.hasCached!=="function") {
    return {status:"unverified",message:"HTTPS/localhost, Cache Storage, or an active service worker controller is unavailable.",missing:SHELL_FILES.slice(),count:0,total:SHELL_FILES.length};
  }
  try {
    const names=await env.getCacheNames();
    if(!names.includes(SHELL_CACHE)) return {
      status:"unverified",message:"Current PhiSafe v4 application cache was not found. Reload after visiting online.",missing:SHELL_FILES.slice(),count:0,total:SHELL_FILES.length
    };
    const missing=[];
    for(const file of SHELL_FILES) if(!(await env.hasCached(SHELL_CACHE,file))) missing.push(file);
    return {
      status:missing.length?"incomplete":"cached",
      message:missing.length?"Some essential app files are missing from the cache.":"All expected app files were found in the browser cache. Test with the internet actually disconnected.",
      missing,count:SHELL_FILES.length-missing.length,total:SHELL_FILES.length
    };
  }catch(_) {
    return {status:"unverified",message:"Could not inspect browser cache. Do not assume offline readiness.",missing:SHELL_FILES.slice(),count:0,total:SHELL_FILES.length};
  }
}
