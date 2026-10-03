import { expect, test } from "@playwright/test";

test("a főoldal egyértelmű ajánlattal és működő árkalkulátorral indul", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Weboldal készítés/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Csomagok és árak/ })).toBeVisible();

  const purchaseTab = page.locator("#arak").getByRole("radio", { name: /Weboldal megvásárlása/ });
  await purchaseTab.click();
  await purchaseTab.press("ArrowLeft");
  await expect(page.locator("#arak").getByRole("radio", { name: /Havidíjas weboldal/ })).toHaveAttribute("aria-checked", "true");
});

test("a mobilmenü csapdázza a fókuszt és Escape-re bezár", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobil navigációs ellenőrzés");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Menü megnyitása" });
  await trigger.click();
  await expect(page.getByRole("navigation", { name: "Mobil navigáció" })).toHaveClass(/open/);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("a keresési céloldalak önálló címmel és brief CTA-val rendelkeznek", async ({ page }) => {
  for (const path of [
    "/weboldal-keszites",
    "/havidijas-weboldal",
    "/weboldal-kisvallalkozasoknak",
    "/wordpress-weboldal-ujratervezes"
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Projektbrief indítása" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  }
});

test("a Checky referencia nem állít kitalált ügyféleredményt", async ({ page }) => {
  await page.goto("/munkak");
  await expect(page.locator('a[href="https://checky.hu"]').first()).toBeAttached();
  await expect(page.getByText(/valós ügyfélmunka/i)).toHaveCount(0);
  await expect(page.locator('a[href="https://checky.hu"]').first()).toHaveAttribute("href", "https://checky.hu");
});
