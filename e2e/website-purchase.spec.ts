import { expect, test, type Page } from "@playwright/test";
import { buildHandoverPlan } from "../lib/handover";
import { initialBriefForm, PUBLIC_BRIEF_DRAFT_KEY } from "../lib/brief-draft";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "purchase-test@example.com", aud: "authenticated", role: "authenticated", user_metadata: { full_name: "Teszt ügyfél" }, app_metadata: { provider: "email" } };

// Every backend call is intercepted: these checks never create accounts, orders or emails.
async function mockPortal(page: Page, projects: Record<string, unknown>[] = []) {
  const inserts: Record<string, unknown>[] = [];
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
  await page.route("**/api/**", route => route.fulfill({ json: { success: true } }));
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, async route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/auth/v1/token")) {
      await route.fulfill({ json: { access_token: token, refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer", user } });
    } else if (url.pathname.includes("/auth/v1/user")) {
      await route.fulfill({ json: user });
    } else if (url.pathname.includes("/rest/v1/client_projects")) {
      if (["POST", "PATCH"].includes(route.request().method())) inserts.push(route.request().postDataJSON());
      await route.fulfill({ json: route.request().method() === "GET" ? projects : [] });
    } else if (url.pathname.includes("/rest/v1/admin_users")) {
      await route.fulfill({ json: { id: "test-admin" } });
    } else if (url.pathname.includes("/rest/v1/client_profiles") && route.request().method() === "GET") {
      await route.fulfill({ json: { full_name: "Teszt ügyfél" } });
    } else {
      await route.fulfill({ json: route.request().headers()["accept"]?.includes("object") ? null : [] });
    }
  });
  await page.routeWebSocket(/supabase/, socket => {
    socket.onMessage(message => {
      const data = JSON.parse(String(message));
      if (Array.isArray(data)) socket.send(JSON.stringify([data[0], data[1], data[2], "phx_reply", { status: "ok", response: {} }]));
    });
  });
  return inserts;
}

async function logIn(page: Page, path: string) {
  await page.goto(path);
  await page.locator('input[type="email"]').first().fill(user.email);
  await page.locator('input[type="password"]').first().fill("Test-password-123!");
  await page.locator("button[type=submit]").filter({ hasText: /^Belépés$/ }).click();
  await expect(page).toHaveURL(/ugyfelkapu\/dashboard/);
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("a munkák megelőzik az árazást, minden vásárlási csomag átadja az árat és konstrukciót", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.goto("/");
  expect(await page.locator(".work-deck").evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector("#arak")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect(await page.locator(".work-deck").evaluate(node => node.parentElement?.querySelector("section") === node)).toBe(true);
  const pricing = page.locator("#arak");
  await pricing.getByRole("radio", { name: /Weboldal megvásárlása/ }).click();
  await expect(pricing.locator(".plan-price")).toHaveText([/179\s*000 Ft.*egyszeri díj/, /329\s*000 Ft.*egyszeri díj/, /599\s*000 Ft.*egyszeri díj/]);
  await pricing.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("purchase-pricing.png"), fullPage: false });
  for (const [index, key] of ["presence", "business", "custom"].entries()) {
    await pricing.getByRole("link", { name: "Ezt megvásárolom" }).nth(index).click();
    const brief = page.locator(".public-brief");
    await expect(brief.getByRole("radio", { name: /Weboldal megvásárlása/ })).toHaveAttribute("aria-checked", "true");
    await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
    await expect(brief.locator(".public-brief-steps .done")).toHaveCount(0);
    await brief.getByPlaceholder("Például: Kovács Épületgépészet").fill("Csomagválasztást megőrző tesztvállalkozás");
    await expect.poll(() => page.evaluate(storageKey => {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw).data : null;
    }, PUBLIC_BRIEF_DRAFT_KEY)).toMatchObject({ commercialModel: "purchase", projectType: "website-purchase", subscriptionPlan: key });
  }
  await page.locator(".work-deck").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("references.png") });
  await page.locator(".work-deck-copy").getByRole("link").click();
  await expect(page).toHaveURL(/\/munkak$/);
  expect(errors).toEqual([]);
});

test("a céloldali vásárlás csomagot és egyszeri árat választ a helyi briefben", async ({ page }) => {
  await page.goto("/weboldal-keszites");
  await page.locator("#arak").getByRole("radio", { name: /Weboldal megvásárlása/ }).click();
  await page.getByRole("link", { name: "Ezt megvásárolom" }).nth(1).click();
  const brief = page.locator(".public-brief");
  await expect(brief.getByRole("heading", { name: "Kezdjük veled." })).toBeVisible();
  await brief.getByPlaceholder("Például: Kovács Épületgépészet").fill("Megőrzött Üzleti csomag");
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await brief.getByRole("button", { name: "Egyet", exact: true }).click();
  await brief.getByRole("button", { name: "Nem, elég ha felhív vagy ír", exact: true }).click();
  await brief.getByPlaceholder(/több minőségi ajánlatkérés/).fill("Több érdeklődőt szeretnék a vállalkozásomnak.");
  await brief.getByPlaceholder(/Veszprém környéki családok/).fill("Helyi vállalkozások");
  await brief.getByRole("button", { name: "Ajánlatot kérek", exact: true }).click();
  await brief.getByRole("button", { name: "Következő", exact: true }).click();
  await expect(page.locator(".brief-recommend-head")).toContainText(/329\s*000 Ft/);
  await page.locator(".public-brief").getByRole("radio", { name: /Havidíjas weboldal/ }).click();
  await expect(page.locator(".brief-recommend-head")).toContainText(/24\s*900 Ft/);
});

test("az ügyfélkapuban váltható a konstrukció és megmarad a megvásárolt csomag", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await mockPortal(page);
  await logIn(page, "/ugyfelkapu?model=purchase&plan=presence");
  await expect(page.locator(".brief-plan-picker")).toContainText(/179\s*000 Ft/);
  await expect(page.getByRole("radio", { name: /Weboldal megvásárlása/ })).toHaveAttribute("aria-checked", "true");
  await page.locator(".brief-plan-picker").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("portal-purchase.png") });
  await page.locator("#project-company").fill("Megőrzött vállalkozás");
  await page.getByRole("radio", { name: /Havidíjas weboldal/ }).click();
  await expect(page.locator("#project-company")).toHaveValue("Megőrzött vállalkozás");
  await expect(page.locator(".brief-plan-picker")).toContainText(/14\s*900 Ft/);
  await page.getByRole("radio", { name: /Weboldal megvásárlása/ }).click();
  await page.locator(".brief-plan-list").getByRole("button").nth(2).click();
  await expect(page.locator(".brief-plan-list button.selected")).toContainText(/599\s*000 Ft/);
  expect(errors).toEqual([]);
});

test("a vásárlási brief előfizetés nélkül, ajánlatra váró projektként kerül beküldésre", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  const inserts = await mockPortal(page);
  await page.addInitScript(({ form, key }) => localStorage.setItem(key, JSON.stringify({ data: form, step: 4, version: 1, savedAt: new Date().toISOString() })), {
    key: PUBLIC_BRIEF_DRAFT_KEY,
    form: { ...initialBriefForm, commercialModel: "purchase", projectType: "website-purchase", subscriptionPlan: "business", title: "Teszt weboldal", company: "Teszt vállalkozás", websiteStatus: "no", domainStatus: "need", budget: "329 000 Ft", goals: "Több megkeresést szeretnék az új oldalról.", audience: "Helyi vállalkozások", primaryAction: "Ajánlatot kérek", pages: "Főoldal, Kapcsolat", features: "Részletes ajánlatkérő", vibe: "clean", palette: "edge", logoStatus: "no", wantLogoDesign: "no", brandColors: "Rátok bízom", fontPreference: "Nincs preferencia", contentSource: "studio", contentBrief: "Helyi szolgáltatóként új weboldalt szeretnék a vállalkozásomnak.", photoSource: "help", contactEmail: user.email, billingDetails: "Teszt vállalkozás, tesztcím" }
  });
  await logIn(page, "/ugyfelkapu?brief=continue");
  await page.locator(".wizard-actions").getByRole("button", { name: "Következő" }).click();
  await expect(page.locator(".wizard-summary")).toContainText(/329\s*000 Ft egyszeri díj/);
  await expect(page.locator(".wizard-summary")).toContainText("10 000 Ft foglaló");
  await page.locator(".wizard-summary").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("purchase-summary.png") });
  await page.locator(".brief-final-confirm input").check();
  await page.getByRole("button", { name: "Projektkérés küldése" }).click();
  await expect(page.locator(".wizard-success")).toBeVisible();
  expect(inserts).toHaveLength(1);
  expect(inserts[0]).toMatchObject({ commercial_model: "purchase", project_type: "website-purchase", subscription_plan: null, monthly_price: null, subscription_status: null, status: "request_received", offer_status: "draft", offer_price: null, purchase_option_price: null, title: "Teszt vállalkozás · Üzleti" });
  expect(inserts[0].brief_data).toMatchObject({ commercialModel: "purchase", subscriptionPlan: "business" });
  expect(inserts[0].goals).toMatch(/Weboldal megvásárlása.*Üzleti/);
  expect(errors).toEqual([]);
});


test("a közvetlenül vásárolt éles oldalhoz elérhető a végső fizetés és a vezetett átadás", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await mockPortal(page, [{
    id: "22222222-2222-4222-8222-222222222222", user_id: user.id, commercial_model: "purchase", project_type: "website-purchase", title: "Teszt vállalkozás · Jelenlét", company: "Teszt vállalkozás", contact_email: user.email, contact_name: "Teszt ügyfél", goals: "Teszt weboldal", status: "launched", offer_status: "accepted", offer_price: 179000, offer_currency: "Ft", deposit_amount: 10000, payment_status: "deposit_paid", contract_accepted: true, final_payment_paid: false, final_transfer_reported: false, review_approved: true, feedback_round: 0, created_at: new Date().toISOString(), handover_steps: buildHandoverPlan(["github"]), brief_data: { ...initialBriefForm, commercialModel: "purchase", projectType: "website-purchase", subscriptionPlan: "presence" }
  }]);
  await logIn(page, "/ugyfelkapu");
  await expect(page.getByRole("button", { name: /Hátralék kifizetése/ })).toContainText(/169\s*000/);
  await expect(page.locator(".handover-panel")).toBeVisible();
  await page.locator(".handover-panel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("direct-purchase-handover.png") });
  expect(errors).toEqual([]);
});

test("a folyamatoldal egyszeri vásárlást és foglalót mutat", async ({ page, isMobile }) => {
  const errors = watchErrors(page);
  await page.goto("/folyamat");
  await page.getByRole("tab", { name: /02. Egyszeri vásárlás/ }).click();
  await expect(page.locator(".stage-interactive-core")).toContainText("Csomag és adatlap");
  if (isMobile) await page.getByRole("button", { name: "Következő lépés" }).click();
  else await page.getByRole("tab", { name: /Ajánlat és szerződés/ }).click();
  await expect(page.locator(".stage-interactive-core")).toContainText("10 000 Ft foglaló");
  expect(errors).toEqual([]);
});


test("az admin ajánlatba a csomag vételára és a vásárlási tartalom kerül", async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  const patches = await mockPortal(page, [{
    id: "22222222-2222-4222-8222-222222222222", user_id: user.id, commercial_model: "purchase", project_type: "website-purchase", title: "Teszt vállalkozás · Üzleti", company: "Teszt vállalkozás", contact_email: user.email, contact_name: "Teszt ügyfél", goals: "Teszt weboldal", status: "request_received", offer_status: "draft", offer_price: null, offer_currency: "Ft", deposit_amount: null, payment_status: "unpaid", contract_accepted: false, final_payment_paid: false, created_at: new Date().toISOString(), brief_data: { ...initialBriefForm, commercialModel: "purchase", projectType: "website-purchase", subscriptionPlan: "business" }
  }]);
  await logIn(page, "/ugyfelkapu");
  await page.goto("/admin/dashboard");
  await page.getByRole("button", { name: "Projekt megnyitása" }).click();
  const prepare = page.getByRole("button", { name: /Ajánlat vázának előkészítése|Ajánlat előkészítése/ }).first();
  await prepare.click();
  await expect.poll(() => patches.find(patch => patch.status === "planning")).toMatchObject({ offer_price: 329000, deposit_amount: 10000 });
  const patch = patches.find(patch => patch.status === "planning")!;
  expect(patch.offer_deliverables).toContain("Forráskód és technikai hozzáférések átadása");
  expect(patch.offer_deliverables).not.toContain("Havi 1 kisebb");
  await expect(page.locator(".admin-project-facts-strip")).toContainText(/Üzleti.*329\s*000 Ft/);
  await page.getByText("Prompt előnézete", { exact: true }).click();
  await expect(page.locator(".admin-project-card")).toContainText("Terjedelmi korlát");
  await expect(page.locator(".admin-project-card")).toContainText("Ne építs többet");
  await page.screenshot({ path: testInfo.outputPath("admin-purchase-offer.png"), fullPage: true });
  expect(errors).toEqual([]);
});
