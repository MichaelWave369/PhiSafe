// PhiSafe Rung 7: read-only quick-reference data and pre-reviewed guidance.
// No hazard detection, location query, evacuation decision, or background network requests.
import { loadingReport } from "./rung2.mjs";
import { assessFieldReadiness } from "./rung4.mjs";
export const QUICK_GUIDES = Object.freeze([
  {
    id:"wildfire", title:"Wildfire & smoke", sourceName:"FEMA Ready.gov wildfires",
    url:"https://www.ready.gov/wildfires",
    reminders:[
      "Follow official local wildfire warnings and evacuation orders; leave immediately when directed.",
      "Keep people, animals, medications, and carriers together. Use the animal loading sheet for a physical recount.",
      "Check current routes and closures with authorities. A saved route may no longer be usable.",
      "Avoid dangerous smoke exposure; official guidance may recommend appropriately fitted respirators for adults."
    ]
  },
  {
    id:"flood", title:"Flooding & rising water", sourceName:"FEMA Ready.gov floods",
    url:"https://www.ready.gov/floods",
    reminders:[
      "Follow flood warnings and evacuation instructions. Move toward safe higher ground when appropriate.",
      "Never walk, swim, or drive through floodwater; never drive around flood barriers.",
      "Do not assume stored routes are passable, even if they were clear during a previous drill.",
      "Keep animals secured; avoid contaminated floodwater and downed electrical lines."
    ]
  },
  {
    id:"heat", title:"Extreme heat", sourceName:"CDC Heat and Pets",
    url:"https://www.cdc.gov/heat-health/risk-factors/heat-and-pets.html",
    reminders:[
      "Get people and animals to a reliably cool place; seek air conditioning or an official cooling location.",
      "Keep fresh drinking water accessible to people and animals and watch for heat-related illness.",
      "Never leave a person or animal inside a parked vehicle, even with windows partly open.",
      "Confirm animal carriers have ventilation and climate control during transport."
    ]
  },
  {
    id:"outage", title:"Power & communications outage", sourceName:"FEMA Ready.gov power outages",
    url:"https://www.ready.gov/power-outages",
    reminders:[
      "Use printed plans and battery-powered communications when internet or electricity is unavailable.",
      "Check the actual battery runtime of essential equipment; do not assume the backup power estimate is guaranteed.",
      "Fuel-powered generators must stay outdoors, at least 20 feet from doors, windows and vents, with exhaust pointed away.",
      "Preserve food and medications as directed by safety guidance and individual storage requirements."
    ]
  }
]);

export function guideFor(id) {
  return QUICK_GUIDES.find(guide=>guide.id===id) || QUICK_GUIDES[0];
}
const clean = (input,max=300) => typeof input==="string" && input.trim()
  ? input.slice(0,max) : "";
export function quickSnapshot(state) {
  const h=state.household;
  const loading=loadingReport(state);
  const field=assessFieldReadiness(state);
  const vehicles=new Map(state.loading.vehicles.map(v=>[v.id,v]));
  const assignments=new Map(state.loading.assignments.map(a=>[a.petId,a]));
  const rows=state.pets.map(p=>{
    const a=assignments.get(p.id);
    const v=a ? vehicles.get(a.vehicleId) : null;
    return {
      id:p.id, name:clean(p.name,100),species:p.species,
      carrier:clean(p.carrier,100) || "NOT ENTERED",
      vehicle:v?.name || "UNASSIGNED",
      slot:a?.slot ?? null
    };
  });
  const expectedAnimals=h.dogs+h.cats+h.otherPets;
  const transportGap=!loading.allocationComplete;
  const critical=[
    ...field.essentials.map(item=>item.title),
    ...(expectedAnimals>0 && rows.some(p=>p.carrier==="NOT ENTERED")
      ? ["At least one animal has no carrier recorded."] : []),
    ...(state.plan.meetingPlace && state.plan.backupPlace &&
      state.plan.meetingPlace.trim()===state.plan.backupPlace.trim()
      ? ["Primary and backup destinations are identical. Confirm a genuinely separate alternative."] : [])
  ];
  return {
    people:h.people, dogs:h.dogs,cats:h.cats,otherPets:h.otherPets,
    expectedAnimals, rostered:rows.length, assigned:loading.assignedAnimals,
    allocationsEntered:loading.allocationComplete,transportGap,
    vehicles:state.loading.vehicles.map(v=>({
      id:v.id,name:clean(v.name,100),passengers:v.peopleAssigned,seats:v.peopleSeats,
      animalSpaces:v.petSpaces
    })),
    animals:rows,
    gaps:critical,
    plan:{
      alertZone:clean(state.plan.alertZone),
      primary:clean(state.plan.meetingPlace),
      backup:clean(state.plan.backupPlace),
      routeA:clean(state.plan.routeA),
      routeB:clean(state.plan.routeB),
      contact:clean(state.plan.emergencyContact)
    }
  };
}
