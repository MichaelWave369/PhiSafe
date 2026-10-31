import {test,expect} from "@playwright/test";
import {syntheticHousehold,seedPrivateTestPlan} from "./fixtures.mjs";

test("all sections render without browser exceptions and remain usable on narrow screens",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Prepared, not afraid."})).toBeVisible();
  const sections=[
    ["Overview","Your household readiness"],
    ["Guided Setup","Guided household setup"],
    ["Quick View","Emergency Quick View"],
    ["Household","Household & capacity"],
    ["Supplies","Supplies inventory"],
    ["Animals","Animal evacuation roster"],
    ["Evacuation","Evacuation plan"],
    ["Loading","Evacuation loading planner"],
    ["Practice Drill","Practice evacuation drill"],
    ["Field Readiness","Field readiness & offline verification"],
    ["Power","Backup power planner"],
    ["72-hour bags","72-hour grab-and-go manifest"],
    ["Official guides","Trusted guidance"],
    ["Encrypted Vault","Private Emergency Vault"]
  ];
  for (const [tab,heading] of sections){
    await page.getByRole("button",{name:tab,exact:true}).click();
    await expect(page.getByRole("heading",{name:heading,exact:true})).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});

test("edits a household and one pet, then restores browser-local data after reload",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:"Household",exact:true}).click();
  await page.locator("#people").fill("2");
  await page.locator("#dogs").fill("1");
  await page.locator("#cats").fill("1");
  await page.getByRole("button",{name:"Save household"}).click();
  await page.getByRole("button",{name:"Animals",exact:true}).click();
  await page.locator("#petName").fill("Synthetic dog");
  await page.locator("#petSpecies").selectOption("dog");
  await page.locator("#petCarrier").fill("Test crate A");
  await page.getByRole("button",{name:"Add animal"}).click();
  await expect(page.locator("#content").getByText("Synthetic dog")).toBeVisible();
  await page.reload();
  await page.getByRole("button",{name:"Animals",exact:true}).click();
  await expect(page.locator("#content").getByText("Synthetic dog")).toBeVisible();
  const state = await page.evaluate(()=>JSON.parse(localStorage.getItem("phisafe-household-v1")));
  expect(state.household.people).toBe(2);
  expect(state.pets).toHaveLength(1);
});

test("seventeen simulated animals have unique slots and appear in printable loading sheet",async({page})=>{
  await seedPrivateTestPlan(page);
  await page.addInitScript(()=>{window.print=()=>{window.__printCalled=true;}});
  await page.goto("/");
  await page.getByRole("button",{name:"Loading",exact:true}).click();
  await expect(page.locator(".pet-assignment")).toHaveCount(17);
  await expect(page.getByText("Test passenger van").first()).toBeVisible();
  await page.getByRole("button",{name:"Print vehicle load sheet"}).click();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__printCalled))).toBe(true);
  const report=await page.locator("#printReport").innerHTML();
  expect((report.match(/<td style="text-align:center">\[ \]<\/td>/g)||[]).length).toBe(51);
  expect(report).toContain("Test Cat 9");
  expect(report).toContain("Test Dog 1");
  // The simulated 17 slots test serialization, NOT real-world vehicle fit.
});

test("private JSON backup can be imported and exported; printable manifest renders",async({page})=>{
  const synthetic=syntheticHousehold();
  await page.addInitScript(()=>{window.print=()=>{window.__printCalled=true;}});
  page.on("dialog",dialog=>dialog.accept());
  await page.goto("/");
  await page.locator("#importFile").setInputFiles({
    name:"phisafe-synthetic-test.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(synthetic))
  });
  await expect(page.getByText("Backup imported successfully.",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:"72-hour bags",exact:true}).click();
  await page.getByRole("button",{name:"Print 72-hour manifest"}).click();
  expect(await page.locator("#printReport").innerText()).toContain("Test Cat 9");
  const downloadEvent=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export plain JSON"}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^phisafe-private-backup-/);
  await page.reload();
  await page.getByRole("button",{name:"Animals",exact:true}).click();
  await expect(page.locator("#content").getByText("Test Cat 9")).toBeVisible();
});

test("offline reload serves app shell and persisted plan from cached files",async({page,context})=>{
  await seedPrivateTestPlan(page);
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Prepared, not afraid."})).toBeVisible();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  const files=await page.evaluate(async()=>{
    const names=await caches.keys();
    return {names,hasShell:names.some(name=>name.startsWith("phisafe-shell-v"))};
  });
  expect(files.hasShell).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.getByRole("heading",{name:"Prepared, not afraid."})).toBeVisible();
    await page.getByRole("button",{name:"Animals",exact:true}).click();
    await expect(page.locator("#content").getByText("Test Cat 9")).toBeVisible();
    await page.getByRole("button",{name:"Field Readiness",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Field readiness & offline verification"})).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
