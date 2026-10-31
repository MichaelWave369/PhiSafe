// PhiSafe Rung 8: deterministic first-run guidance. Not a safety certification.
// No network use, location lookup, generated family data, or account requirement.
import {loadingReport} from "./rung2.mjs";
import {manifestReport} from "./rung2.mjs";
export const SETUP_STEPS = Object.freeze([
 {id:"household",name:"Household",tab:"setup",description:"Record how many people and animals depend on your plan."},
 {id:"animals",name:"Individual animals",tab:"animals",description:"Account for every animal and identify their carrier or restraint."},
 {id:"transport",name:"Transport",tab:"loading",description:"Assign every person and animal a declared travel position; physically verify each space."},
 {id:"destination",name:"Departure destinations",tab:"evacuation",description:"Record two different, confirmed destinations and two route options."},
 {id:"essentials",name:"Three-day essentials",tab:"household",description:"Record realistic drinking water, food and medicine reserves for people and pets."},
 {id:"backup",name:"Offline copies",tab:"vault",description:"Make a private printed plan and encrypted backup, then actually test recovery."}
]);
const stage=(id,done,reason)=>({id,done:Boolean(done),reason});
export function isUntouchedPlan(state) {
  // A saved plan with no household counts can still contain important work.
  if (state?.updatedAt) return false;
  const h=state?.household || {};
  const p=state?.plan || {};
  return (h.people||0)===0 && (h.dogs||0)===0 && (h.cats||0)===0 &&
    (h.otherPets||0)===0 && !state?.pets?.length && !state?.supplies?.length &&
    !state?.loading?.vehicles?.length && !state?.loading?.assignments?.length &&
    !state?.rehearsal?.history?.length &&
    !Object.values(p).some(value=>typeof value==="string" && value.trim()) &&
    !(state?.setup?.backupReviewedAt);
}
export function defaultSetup() {
  return {setup:{backupReviewedAt:null}};
}
export function normalizeSetup(raw) {
  const dt=raw?.setup?.backupReviewedAt;
  let backupReviewedAt=null;
  if (typeof dt==="string" && /^\d{4}-\d{2}-\d{2}T/.test(dt) &&
      Number.isFinite(Date.parse(dt))) {
    backupReviewedAt=new Date(dt).toISOString();
  }
  return {setup:{backupReviewedAt}};
}
export function setupReport(state) {
  const h=state.household;
  const expected={dog:h.dogs,cat:h.cats,other:h.otherPets};
  const species={dog:0,cat:0,other:0};
  const animals=h.dogs+h.cats+h.otherPets;
  const pets=state.pets;
  for(const p of pets) if(p.species in species) species[p.species]++;
  const householdOk=h.people>0;
  const rosterMatches=Object.keys(species).every(key=>species[key]===expected[key]);
  const missingCarriers=pets.filter(p=>!p.carrier?.trim()).length;
  const animalsOk=householdOk && rosterMatches && missingCarriers===0;
  const load=loadingReport(state);
  const transportOk=householdOk && animalsOk && load.allocationComplete;
  const p=state.plan;
  const nonempty=(value)=>typeof value==="string"&&value.trim().length>0;
  const distinct=nonempty(p.meetingPlace)&&nonempty(p.backupPlace) &&
    p.meetingPlace.trim().toLowerCase()!==p.backupPlace.trim().toLowerCase();
  const destinationOk=distinct&&nonempty(p.routeA)&&nonempty(p.routeB);
  const manifest=manifestReport(state);
  // Manifest includes human and animal water only when household needs are actually entered.
  const essentialsOk=householdOk && manifest.gaps.length===0;
  const backupOk=Boolean(state.setup?.backupReviewedAt);
  const stages=[
    stage("household",householdOk,"Set at least one person; zero animals is allowed."),
    stage("animals",animalsOk,!rosterMatches ?
      "Individual animal roster does not match declared species totals." :
      missingCarriers ? missingCarriers+" animal(s) have no carrier recorded." :
      "Add or verify your animal roster."),
    stage("transport",transportOk,"Assign real vehicle seats and individual animal spaces; verify them in person."),
    stage("destination",destinationOk,"Enter two distinct, confirmed destinations and two route notes."),
    stage("essentials",essentialsOk,manifest.gaps[0]||"Check a minimum three-day kit using your real needs."),
    stage("backup",backupOk,"Print and store your plan; create an encrypted backup and personally test restore.")
  ];
  const completed=stages.filter(s=>s.done).length;
  return {
    stages, completed, total:stages.length, expectedAnimals:animals,
    rostered:pets.length, species, expected, missingCarriers,
    people:h.people, humanWaterMinimum:h.people*3,
    animalWaterMinimum:animals>0 && h.animalWaterDailyGallons>0 ? h.animalWaterDailyGallons*3 : null,
    manifestGaps:manifest.gaps,
    onboardingComplete:completed===stages.length,
    nextStep:stages.find(s=>!s.done)?.id||"backup",
    // Advisory only. No field-safety claim, no automatic hazard assessment.
    warning:"These are recorded planning steps, not verified evacuation safety."
  };
}
export function mayAddAnimal(state,species) {
  const report=setupReport(state);
  if(!["dog","cat","other"].includes(species)) return false;
  if(state.pets.length>=200) return false;
  return report.species[species]<report.expected[species];
}
