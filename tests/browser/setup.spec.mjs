import {test,expect} from "@playwright/test";
import {syntheticHousehold,seedPrivateTestPlan} from "./fixtures.mjs";

test("first run starts guided setup, saves household and pets without invented entries",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Guided household setup"})).toBeVisible();
  let state=await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"));
  expect(state).toBeNull();
  await page.locator('#setupHouseholdForm [name="people"]').fill("2");
  await page.locator('#setupHouseholdForm [name="dogs"]').fill("8");
  await page.locator('#setupHouseholdForm [name="cats"]').fill("9");
  await page.getByRole("button",{name:"Save household counts"}).click();
  await expect(page.getByRole("heading",{name:"Individual animals"})).toBeVisible();
  const add=async(name,species,carrier)=>{
    await page.locator('#setupAnimalForm [name="name"]').fill(name);
    await page.locator('#setupAnimalForm [name="species"]').selectOption(species);
    await page.locator('#setupAnimalForm [name="carrier"]').fill(carrier);
    await page.getByRole("button",{name:"Add animal to roster"}).click();
  };
  await add("Synthetic Dog A","dog","Crate A");
  await add("Synthetic Cat B","cat","Carrier B");
  state=JSON.parse(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1")));
  expect(state.household.people).toBe(2);
  expect(state.household.dogs).toBe(8);
  expect(state.household.cats).toBe(9);
  expect(state.pets).toHaveLength(2);
  expect(state.pets.map(p=>p.name)).toEqual(["Synthetic Dog A","Synthetic Cat B"]);
  await page.reload();
  await page.getByRole("button",{name:"Guided Setup",exact:true}).first().click();
  await page.getByRole("button",{name:"Individual animals",exact:false}).click();
  await expect(page.getByText("1 / 8 entered")).toBeVisible();
  await expect(page.getByText("1 / 9 entered")).toBeVisible();
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).pets).toHaveLength(2);
});
test("existing synthetic household remains unchanged when visiting guided setup",async({page})=>{
  await seedPrivateTestPlan(page,syntheticHousehold());
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Your household readiness"})).toBeVisible();
  const before=await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"));
  await page.getByRole("button",{name:"Guided Setup",exact:true}).first().click();
  await expect(page.getByRole("heading",{name:"Guided household setup"})).toBeVisible();
  await page.getByRole("button",{name:"Individual animals",exact:false}).click();
  await expect(page.getByText("8 / 8 entered")).toBeVisible();
  await expect(page.getByText("9 / 9 entered")).toBeVisible();
  const after=await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"));
  expect(after).toBe(before);
});
test("setup forms for destinations and supplies persist across network-disconnected reload",async({page,context})=>{
  await page.goto("/");
  await page.getByRole("button",{name:"Departure destinations",exact:false}).click();
  await page.locator('#setupDestinationForm [name="meetingPlace"]').fill("Synthetic destination A");
  await page.locator('#setupDestinationForm [name="backupPlace"]').fill("Synthetic destination B");
  await page.locator('#setupDestinationForm [name="routeA"]').fill("Test route A");
  await page.locator('#setupDestinationForm [name="routeB"]').fill("Test route B");
  await page.getByRole("button",{name:"Save departure plan"}).click();
  await expect(page.getByRole("heading",{name:"Three-day essentials"})).toBeVisible();
  await page.locator('#setupEssentialsForm [name="humanWaterGallons"]').fill("9");
  await page.getByRole("button",{name:"Save three-day supply amounts"}).click();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  await context.setOffline(true);
  try {
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:"Guided Setup",exact:true}).first().click();
    await page.getByRole("button",{name:"Departure destinations",exact:false}).click();
    await expect(page.locator('#setupDestinationForm [name="meetingPlace"]')).toHaveValue("Synthetic destination A");
    await page.getByRole("button",{name:"Three-day essentials",exact:false}).click();
    await expect(page.locator('#setupEssentialsForm [name="humanWaterGallons"]')).toHaveValue("9");
  } finally {
    await context.setOffline(false);
  }
});
