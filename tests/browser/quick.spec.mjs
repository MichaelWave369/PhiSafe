import {test,expect} from "@playwright/test";
import {seedPrivateTestPlan} from "./fixtures.mjs";

test("quick reference shows 17 separate animals, switched hazard guidance and private print offline",async({page,context})=>{
  await seedPrivateTestPlan(page);
  await page.addInitScript(()=>{window.print=()=>{window.__quickPrintCalled=true;};});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  await page.getByRole("button",{name:"Quick Reference",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Emergency Quick View"})).toBeVisible();
  await expect(page.locator(".quick-table tbody tr")).toHaveCount(17);
  await expect(page.locator("#content").getByText("Synthetic destination A")).toBeVisible();
  await page.getByRole("button",{name:"Flooding & rising water"}).click();
  await expect(page.getByText("Never walk, swim, or drive through floodwater;",{exact:false})).toBeVisible();
  await context.setOffline(true);
  try{
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:"Quick View",exact:true}).click();
    await expect(page.locator(".quick-table tbody tr")).toHaveCount(17);
    await page.getByRole("button",{name:"Extreme heat",exact:true}).click();
    await expect(page.getByText("Never leave a person or animal inside a parked vehicle",{exact:false})).toBeVisible();
    await page.getByRole("button",{name:"Print quick reference"}).click();
    await expect.poll(()=>page.evaluate(()=>Boolean(window.__quickPrintCalled))).toBe(true);
    const printed=await page.locator("#printReport").innerHTML();
    expect(printed).toContain("Test Dog 1");
    expect(printed).toContain("Test Cat 9");
    expect((printed.match(/<td>\[ \]<\/td>/g)||[]).length).toBe(34);
    expect(printed).toContain("Synthetic destination A");
  }finally{
    await context.setOffline(false);
  }
  expect(errors).toEqual([]);
});
