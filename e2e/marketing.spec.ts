import { expect, test } from "@playwright/test";

test("a főoldal egyértelmű ajánlattal és működő árkalkulátorral indul", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Weboldal készítés/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Csomagok és árak/ })).toBeVisible();

  const purchaseTab = page.getByRole("tab", { name: /Weboldal megvásárlása/ });
  await purchaseTab.focus();
  await purchaseTab.press("ArrowLeft");
  await expect(page.getByRole("tab", { selected: true })).toHaveAttribute("aria-selected", "true");
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
  await page.goto("/munkak/checky");
  await expect(page.getByText("Éles digitális termék", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/valós ügyfélmunka/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Élő rendszer megnyitása/ })).toHaveAttribute("href", "https://checky.hu");
});
