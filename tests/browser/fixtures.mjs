import {defaultState} from "../../core.mjs";
export function syntheticHousehold() {
  const state=defaultState();
  Object.assign(state.household,{
    people:2,dogs:8,cats:9,
    humanWaterGallons:12,animalWaterGallons:9,animalWaterDailyGallons:2,
    peopleFoodDays:4,dogFoodDays:5,catFoodDays:5,medsDays:4
  });
  state.pets=[
    ...Array.from({length:8},(_,i)=>({id:"test-dog-"+i,name:"Test Dog "+(i+1),species:"dog",carrier:"Dog crate "+(i+1),loaded:false,notes:""})),
    ...Array.from({length:9},(_,i)=>({id:"test-cat-"+i,name:"Test Cat "+(i+1),species:"cat",carrier:"Cat carrier "+(i+1),loaded:false,notes:""}))
  ];
  state.loading.vehicles=[{id:"synthetic-vehicle",name:"Test passenger van",kind:"van",
    peopleSeats:2,peopleAssigned:2,petSpaces:17,notes:"Synthetic layout only; NOT a claim of actual safe fit."}];
  state.loading.assignments=state.pets.map((pet,i)=>({
    petId:pet.id,vehicleId:"synthetic-vehicle",slot:i+1
  }));
  Object.assign(state.plan,{
    meetingPlace:"Synthetic destination A",backupPlace:"Synthetic destination B",
    routeA:"Test route A",routeB:"Test route B",
    emergencyContact:"Demo-only, no real contact details"
  });
  return state;
}
export async function seedPrivateTestPlan(page,state=syntheticHousehold()){
  await page.addInitScript(({json})=>{
    // Set initial demo records once per tab; never overwrite them during reload/offline tests.
    if(!sessionStorage.getItem("phisafe-browser-test-initialized")){
      localStorage.setItem("phisafe-household-v1",json);
      sessionStorage.setItem("phisafe-browser-test-initialized","1");
    }
  },{json:JSON.stringify(state)});
}
