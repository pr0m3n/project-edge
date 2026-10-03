import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { initialBriefForm, PUBLIC_BRIEF_DRAFT_KEY } from "../lib/brief-draft";

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function screenshotBrief(page: Page, testInfo: TestInfo, name: string) {
  const cookieChoice = page.getByRole("button", { name: "Csak a szükséges", exact: true });
  if (await cookieChoice.isVisible()) await cookieChoice.click();
  await page.locator(".public-brief").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false, animations: "disabled" });
  await page.locator(".public-brief-slide").screenshot({ path: testInfo.outputPath(`${name}-form.png`), animations: "disabled" });
}

test("felújításnál az első lépés kéri a jelenlegi címet és a domain megtartását", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Meglévőt újítanék fel/ }).click();
  const brief = page.locator(".public-brief");
  await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
  await expect(brief.getByRole("button", { name: "Meglévő weboldal felújítása", exact: true })).toHaveClass("selected");
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(0);
  await brief.getByPlaceholder("Például: Kovács Épületgépészet").fill("Meglévő vállalkozás");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(brief.getByRole("alert")).toContainText("jelenlegi weboldalad címét");
  await brief.getByLabel("Jelenlegi weboldalad címe", { exact: true }).fill("https://pelda.hu/szolgaltatasok");
  await expect(brief.getByLabel("Meglévő domained", { exact: true })).toHaveValue("pelda.hu");
  await expect(brief.getByRole("button", { name: "Megtartom a jelenlegi domaint", exact: true })).toHaveClass("selected");
  await screenshotBrief(page, testInfo, "redesign-first-step");
  await brief.getByRole("button", { name: "Új domaint szeretnék az új oldalhoz", exact: true }).click();
  await expect(brief.getByLabel("Meglévő domained", { exact: true })).toHaveCount(0);
  await brief.getByRole("button", { name: "Megtartom a jelenlegi domaint", exact: true }).click();
  await brief.getByRole("radio", { name: /Weboldal megvásárlása/ }).click();
  await expect(brief.getByRole("button", { name: "Megtartom a jelenlegi domaint", exact: true })).toHaveClass("selected");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(1);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).data, PUBLIC_BRIEF_DRAFT_KEY)).toMatchObject({ websiteStatus: "yes", website: "https://pelda.hu/szolgaltatasok", domainName: "pelda.hu", domainStatus: "have" });
  expect(errors).toEqual([]);
});

test("új oldalhoz is megadható meglévő domain, és a hiányos lépés nem kap pipát", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Új weboldalt indítok/ }).click();
  const brief = page.locator(".public-brief");
  await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
  await expect(brief.getByRole("button", { name: "Új weboldalt indítok", exact: true })).toHaveClass("selected");
  await expect(brief.getByLabel("Jelenlegi weboldalad címe", { exact: true })).toHaveCount(0);
  await brief.getByRole("button", { name: "Domainem már van", exact: true }).click();
  await brief.getByPlaceholder("Például: Kovács Épületgépészet").fill("Új vállalkozás");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(brief.getByRole("alert")).toContainText("meglévő domainedet");
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(0);
  await brief.getByLabel("Meglévő domained", { exact: true }).fill("sajatdomain.hu");
  await brief.getByRole("radio", { name: /Weboldal megvásárlása/ }).click();
  await brief.getByRole("radio", { name: /Havidíjas weboldal/ }).click();
  await expect(brief.getByLabel("Meglévő domained", { exact: true })).toHaveValue("sajatdomain.hu");
  await expect(brief.getByRole("button", { name: "Domainem már van", exact: true })).toHaveClass("selected");
  await screenshotBrief(page, testInfo, "new-site-existing-domain");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(1);
  await brief.getByRole("button", { name: "Vissza", exact: true }).click();
  await brief.getByPlaceholder("Például: Kovács Épületgépészet").fill("");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(brief.getByRole("alert")).toContainText("vállalkozásod vagy márkád nevét");
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mindkét árkártyás konstrukció megmarad az alapadatok és az ajánlás között", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.goto("/");
  const pricing = page.locator("#arak");
  await pricing.getByRole("radio", { name: /Weboldal megvásárlása/ }).click();
  await pricing.getByRole("link", { name: "Ezt megvásárolom" }).nth(1).click();
  const brief = page.locator(".public-brief");
  await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(0);
  await expect(brief.getByRole("radio", { name: /Weboldal megvásárlása/ })).toHaveAttribute("aria-checked", "true");
  await brief.getByPlaceholder("Például: Kovács Épületgépészet").fill("Üzleti csomag teszt");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await brief.getByRole("button", { name: "Egyet", exact: true }).click();
  await brief.getByRole("button", { name: "Nem, elég ha felhív vagy ír", exact: true }).click();
  await brief.getByPlaceholder(/több minőségi ajánlatkérés/).fill("Több érdeklődőt szeretnék a vállalkozásomnak.");
  await brief.getByPlaceholder(/Veszprém környéki családok/).fill("Helyi vállalkozások");
  await brief.getByRole("button", { name: "Ajánlatot kérek", exact: true }).click();
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(brief.locator(".brief-recommend-head")).toContainText(/329\s*000 Ft/);
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(2);
  await screenshotBrief(page, testInfo, "preserved-purchase-plan");
  await pricing.getByRole("radio", { name: /Havidíjas weboldal/ }).click();
  await pricing.getByRole("link", { name: /Ezt választom/ }).nth(2).click();
  await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
  await expect(brief.getByRole("radio", { name: /Havidíjas weboldal/ })).toHaveAttribute("aria-checked", "true");
  await expect(brief.getByPlaceholder("Például: Kovács Épületgépészet")).toHaveValue("Üzleti csomag teszt");
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).data, PUBLIC_BRIEF_DRAFT_KEY)).toMatchObject({ commercialModel: "subscription", subscriptionPlan: "custom" });
  expect(errors).toEqual([]);
});

test("régi, hiányos piszkozat folytatásakor az első hiányzó lépés nyílik meg", async ({ page }) => {
  await page.addInitScript(({ key, form }) => localStorage.setItem(key, JSON.stringify({ version: 1, step: 3, savedAt: new Date().toISOString(), data: form })), { key: PUBLIC_BRIEF_DRAFT_KEY, form: { ...initialBriefForm, websiteStatus: "yes", domainStatus: "keep", website: "https://regi.hu" } });
  await page.goto("/");
  await page.getByRole("button", { name: /Meglévőt újítanék fel/ }).click();
  await page.getByRole("button", { name: "Folytatás", exact: true }).click();
  const brief = page.locator(".public-brief");
  await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
  await expect(brief.locator(".public-brief-steps .done")).toHaveCount(0);
  await expect(brief.getByLabel("Meglévő domained", { exact: true })).toHaveValue("regi.hu");
});
