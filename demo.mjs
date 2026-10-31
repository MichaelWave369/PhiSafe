// PhiSafe Rung 10: self-contained fictional sandbox for community testers.
// This is NEVER a verified transport/shelter layout or recommended supply prescription.
import {defaultState,normalizeState} from "./core.mjs";

export const DEMO_MARKER = "SAMPLE DATA — DEMO ONLY";
export function makeDemoState() {
  const state=defaultState();
  Object.assign(state.household,{
    people:2,dogs:2,cats:2,otherPets:0,
    humanWaterGallons:8,animalWaterDailyGallons:1,animalWaterGallons:4,
    peopleFoodDays:4,dogFoodDays:4,catFoodDays:4,medsDays:4,
    peopleSeats:2,animalSpaces:4
  });
  state.pets=[
    {id:"example_dog_1",name:"Example Dog One",species:"dog",carrier:"EXAMPLE dog crate 1",notes:"FICTIONAL, verify real equipment",loaded:false},
    {id:"example_dog_2",name:"Example Dog Two",species:"dog",carrier:"EXAMPLE dog crate 2",notes:"FICTIONAL, verify real equipment",loaded:false},
    {id:"example_cat_1",name:"Example Cat One",species:"cat",carrier:"EXAMPLE cat carrier 1",notes:"FICTIONAL, verify real equipment",loaded:false},
    {id:"example_cat_2",name:"Example Cat Two",species:"cat",carrier:"EXAMPLE cat carrier 2",notes:"FICTIONAL, verify real equipment",loaded:false}
  ];
  state.loading.vehicles=[
    {id:"example_van",name:"FICTIONAL demo vehicle",kind:"van",peopleSeats:2,peopleAssigned:2,petSpaces:4,
      notes:"Not a statement that four carriers safely fit in any real vehicle"}
  ];
  state.loading.assignments=state.pets.map((pet,i)=>({
    petId:pet.id,vehicleId:"example_van",slot:i+1
  }));
  Object.assign(state.plan,{
    alertZone:"EXAMPLE ZONE (not real)",
    meetingPlace:"FICTIONAL DESTINATION A (not verified)",
    backupPlace:"FICTIONAL DESTINATION B (not verified)",
    routeA:"EXAMPLE PRIMARY ROUTE (do not follow)",
    routeB:"EXAMPLE BACKUP ROUTE (do not follow)",
    emergencyContact:"FICTIONAL CONTACT — not a phone number",
    notes:"SAMPLE DATA. Not a real emergency plan."
  });
  state.supplies=[
    {id:"example_water",name:"Example sealed water",category:"water",quantity:8,goal:8,unit:"gallons",expires:""},
    {id:"example_food",name:"Example food containers",category:"food",quantity:6,goal:6,unit:"packs",expires:""}
  ];
  return normalizeState(state);
}
export function demoIsClearlyFictional(plan) {
  return plan?.pets?.length===4 &&
    plan.pets.every(x=>/^Example (Cat|Dog)/.test(x.name)) &&
    plan.plan?.meetingPlace?.startsWith("FICTIONAL DESTINATION") &&
    plan.loading?.vehicles?.[0]?.name?.startsWith("FICTIONAL");
}
