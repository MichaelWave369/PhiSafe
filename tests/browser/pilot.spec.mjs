import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {syntheticHousehold,seedPrivateTestPlan} from "./fixtures.mjs";

test("pilot checklist and privacy-safe diagnostic survive offline reload without touching a real plan",async({page,context})=>{
  await seedPrivateTestPlan(page,syntheticHousehold());
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto("/");
  const before=await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"));
  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Community Pilot"}).click();
  await expect(page.getByRole("heading",{name:"Community Field Pilot"})).toBeVisible();
  await expect(page.getByText("0 / 6 self-confirmed")).toBeVisible();
  await page.locator('[data-action="pilot-check"][data-id="offline"]').check();
  await page.locator('[data-action="pilot-check"][data-id="roster"]').check();
  await expect(page.getByText("2 / 6 self-confirmed")).toBeVisible();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  await page.getByRole("button",{name:"Inspect cached app shell"}).click();
  await expect(page.locator(".pilot-view .kv").last()).toContainText("cached",{timeout:15_000});
  const pending=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download safe diagnostic summary"}).click();
  const download=await pending;
  const data=await readFile(await download.path(),"utf8");
  const report=JSON.parse(data);
  expect(report.format).toBe("phisafe-community-field-report");
  expect(report.checks.offline).toBe("self-confirmed");
  expect(report.checks.roster).toBe("self-confirmed");
  expect(report.environment.cacheAudit).toBe("cached");
  for(const forbidden of ["Test Dog","Test Cat","Synthetic destination",
    "Demo-only","Test passenger van","phi-safe-household","test-dog-"]){
    expect(data).not.toContain(forbidden);
  }
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  await context.setOffline(true);
  try {
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Community Pilot"}).click();
    await expect(page.getByText("2 / 6 self-confirmed")).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBe(before);
    await expect(page.locator('a[href*="feature_request.yml"]')).toHaveAttribute("rel",/noopener/);
  }finally{
    await context.setOffline(false);
  }
  expect(errors).toEqual([]);
});
test("on a fresh browser pilot marks can be cleared without creating a household",async({page})=>{
  page.on("dialog",dialog=>dialog.accept());
  await page.goto("/");
  await page.getByRole("navigation",{name:"PhiSafe sections"}).getByRole("button",{name:"Community Pilot"}).click();
  await page.locator('[data-action="pilot-check"][data-id="print"]').check();
  await expect(page.getByText("1 / 6 self-confirmed")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();
  await page.getByRole("button",{name:"Clear pilot test confirmations"}).click();
  await expect(page.getByText("0 / 6 self-confirmed")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-pilot-checks-v1"))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();
});
