import {test,expect} from "@playwright/test";
import {syntheticHousehold,seedPrivateTestPlan} from "./fixtures.mjs";

test("demo editing, printing, plain export, import and delete safeguards leave saved household unchanged",async({page})=>{
  const privatePlan=syntheticHousehold();
  privatePlan.plan.meetingPlace="PRIVATE TEST DESTINATION, MUST REMAIN UNTOUCHED";
  await seedPrivateTestPlan(page,privatePlan);
  await page.addInitScript(()=>{window.print=()=>{window.__demoPrinted=true;}});
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto("/");
  const before=await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"));
  await page.getByRole("button",{name:"Try Demo"}).click();
  await expect(page.locator("#demoBanner")).toBeVisible();
  await expect(page.locator("#demoBanner")).toContainText("SAMPLE DATA ONLY");
  await expect(page.locator("#content").getByText("FICTIONAL DESTINATION A",{exact:false})).toBeVisible();

  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Household"}).click();
  await page.locator("#people").fill("3");
  await page.getByRole("button",{name:"Save household"}).click();
  await expect(page.locator("#people")).toHaveValue("3");
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);

  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Quick View"}).click();
  await page.getByRole("button",{name:"Print quick reference"}).click();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__demoPrinted))).toBe(true);
  const printed=await page.locator("#printReport").innerHTML();
  expect(printed).toContain("DEMO ONLY");
  expect(printed).toContain("Example Dog One");
  expect(printed).toContain("FICTIONAL DESTINATION A");
  expect(printed).not.toContain("PRIVATE TEST DESTINATION");
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);

  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export plain JSON"}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^phisafe-DEMO-plain-/);

  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Official guides"}).click();
  await page.getByRole("button",{name:"Delete this device’s PhiSafe plan"}).click();
  await expect(page.locator("#appNotice")).toContainText("private plan cannot be erased");
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);

  await page.locator("#importFile").setInputFiles({
    name:"test.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(privatePlan))
  });
  await expect(page.getByText("Exit Demo Mode before importing a real backup",{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);

  await page.getByRole("button",{name:"Exit demo and restore my plan"}).click();
  await expect(page.locator("#demoBanner")).toBeHidden();
  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Quick View"}).click();
  await expect(page.locator("#content").getByText("PRIVATE TEST DESTINATION",{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);
  expect(errors).toEqual([]);
});

test("demo reset and offline reload return to the real plan without persistence",async({page,context})=>{
  page.on("dialog",dialog=>dialog.accept());
  await seedPrivateTestPlan(page);
  await page.goto("/");
  const before=await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"));
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  await page.getByRole("button",{name:"Try Demo"}).click();
  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Household"}).click();
  await page.locator("#people").fill("6");
  await page.getByRole("button",{name:"Save household"}).click();
  await page.getByRole("button",{name:"Restart demo"}).click();
  await expect(page.locator("#demoBanner")).toBeVisible();
  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Household"}).click();
  await expect(page.locator("#people")).toHaveValue("2");
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);
  await context.setOffline(true);
  try{
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#demoBanner")).toBeHidden();
    await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Animals"}).click();
    await expect(page.locator("#content").getByText("Test Cat 9")).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);
  }finally{await context.setOffline(false);}
});

test("fresh user can try and exit demo without creating a household plan",async({page})=>{
  await page.goto("/");
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();
  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Community Pilot"}).click();
  await page.getByRole("button",{name:"Start fictional demo"}).click();
  await expect(page.locator("#demoBanner")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();
  await page.getByRole("button",{name:"Exit demo and restore my plan"}).click();
  await expect(page.getByRole("heading",{name:"Guided household setup"})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();
});
