import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {seedPrivateTestPlan} from "./fixtures.mjs";

const passphrase="seven violet meteors beside the northern forest";
test("encrypted vault protects exported data, rejects bad password, and restores offline",async({page,context})=>{
  await seedPrivateTestPlan(page);
  await page.goto("/");
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:20_000});
  await page.getByRole("button",{name:"Encrypted Vault",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Private Emergency Vault"})).toBeVisible();
  await page.locator("#vaultExportPassphrase").fill(passphrase);
  await page.locator("#vaultConfirmPassphrase").fill(passphrase);
  const down=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download encrypted backup"}).click();
  const download=await down;
  expect(download.suggestedFilename()).toMatch(/^phisafe-encrypted-/);
  const buffer=await readFile(await download.path());
  const raw=buffer.toString("utf8");
  expect(raw).not.toContain("Test Cat 9");
  expect(raw).not.toContain("Synthetic destination");
  expect(raw).not.toContain(passphrase);
  const envelope=JSON.parse(raw);
  expect(envelope.format).toBe("phisafe-encrypted-backup");

  await page.evaluate(()=>localStorage.removeItem("phisafe-household-v1"));
  await context.setOffline(true);
  try{
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:"Encrypted Vault",exact:true}).click();
    const upload=async()=>{
      await page.locator("#vaultImportFile").setInputFiles({
        name:"phisafe-encrypted.json",mimeType:"application/json",buffer
      });
    };
    await upload();
    await page.locator("#vaultImportPassphrase").fill("a different wrong passphrase");
    await page.getByRole("button",{name:"Decrypt and restore"}).click();
    await expect(page.getByText("Unable to decrypt.",{exact:false})).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();

    let accept=false;
    page.on("dialog",dialog=>accept?dialog.accept():dialog.dismiss());
    await upload();
    await page.locator("#vaultImportPassphrase").fill(passphrase);
    await page.getByRole("button",{name:"Decrypt and restore"}).click();
    await expect(page.getByText("Restore cancelled.",{exact:false})).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem("phisafe-household-v1"))).toBeNull();

    accept=true;
    await upload();
    await page.locator("#vaultImportPassphrase").fill(passphrase);
    await page.getByRole("button",{name:"Decrypt and restore"}).click();
    await expect(page.getByText("Encrypted backup restored.",{exact:false})).toBeVisible();
    await page.getByRole("button",{name:"Animals",exact:true}).click();
    await expect(page.locator("#content").getByText("Test Cat 9")).toBeVisible();
    const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem("phisafe-household-v1")));
    expect(restored.household.people).toBe(2);
    expect(restored.pets).toHaveLength(17);
  } finally {
    await context.setOffline(false);
  }
});
