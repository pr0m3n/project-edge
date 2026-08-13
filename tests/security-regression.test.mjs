import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

test("support migration is non-destructive and admin-only", () => {
  const migration = read("supabase/migrations/002_support_tickets.sql");

  assert.match(migration, /create table if not exists public\.support_tickets/);
  assert.match(migration, /create table if not exists public\.support_ticket_messages/);
  assert.doesNotMatch(migration, /drop table if exists public\.support_ticket/);
  assert.doesNotMatch(migration, /using \(true\)/i);
  assert.match(migration, /using \(public\.is_admin\(\)\)/);
});

test("notification policies cannot expose anonymous data", () => {
  const migration = read("supabase/migrations/006_notifications_and_settings.sql");
  const hardening = read("supabase/migrations/022_security_hardening.sql");

  assert.doesNotMatch(migration, /auth\.uid\(\) is null/);
  assert.doesNotMatch(migration, /to anon/i);
  assert.doesNotMatch(migration, /with check \(true\)/i);
  assert.match(hardening, /revoke all on public\.notifications from anon/);
  assert.match(hardening, /create policy "Admins can insert notifications"/);
});

test("public support routes use the server-only client and limits", () => {
  const createRoute = read("app/api/tickets/route.ts");
  const messageRoute = read("app/api/tickets/[ticketId]/messages/route.ts");
  const detailRoute = read("app/api/tickets/[ticketId]/route.ts");

  for (const route of [createRoute, messageRoute, detailRoute]) {
    assert.match(route, /createServerSupabaseAdminClient/);
    assert.match(route, /checkRateLimit/);
  }
  assert.match(createRoute, /message\.length > 5_000/);
  assert.match(messageRoute, /body\.length > 5_000/);
  assert.match(detailRoute, /isUuid\(ticketId\)/);
});

test("notification relay is rate limited and cannot be used anonymously", () => {
  const route = read("app/api/notify/route.ts");
  assert.match(route, /checkRateLimit/);
  assert.match(route, /!supabaseUrl \|\| !supabaseAnonKey \|\| !serviceRoleKey/);
  assert.match(route, /if \(!isAdmin\)/);
});

test("browser support chat does not subscribe to private tables", () => {
  assert.doesNotMatch(read("components/SupportWidget.tsx"), /postgres_changes/);
});

test("portal assets stay private and purchase requests are deduplicated", () => {
  const migration = read("supabase/migrations/023_portal_storage_and_purchase_guard.sql");
  const paymentFlow = read("supabase/migrations/024_purchase_payment_flow.sql");
  const portal = read("components/ClientPortal.tsx");

  assert.match(migration, /values \('client-assets', 'client-assets', false\)/);
  assert.match(migration, /guard_duplicate_website_purchase_request/);
  assert.match(migration, /status not in \('completed', 'declined'\)/);
  assert.match(paymentFlow, /create unique index if not exists one_active_website_purchase_per_project/);
  assert.match(paymentFlow, /report_website_purchase_transfer/);
  assert.match(paymentFlow, /complete_website_purchase/);
  assert.match(paymentFlow, /close_completed_project/);
  assert.match(portal, /from\("client-assets"\)\.upload\(assetPath, file\)/);
  assert.doesNotMatch(portal, /from\("client-logos"\)\.upload/);
});

test("account deletion preserves business records and removes orphanable storage", () => {
  const route = read("app/api/delete-profile/route.ts");
  assert.match(route, /projectCount/);
  assert.match(route, /ticketCount/);
  assert.match(route, /status: 409/);
  assert.match(route, /removeUserStorage/);
});

test("public support admin replies are authenticated and emailed", () => {
  const route = read("app/api/tickets/[ticketId]/admin-reply/route.ts");
  assert.match(route, /admin_users/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /sendProjectEdgeEmail/);
});

test("new pricing is centralized and tax wording is explicit", () => {
  const subscriptions = read("lib/subscriptions.ts");
  const estimator = read("components/PriceEstimator.tsx");
  const migration = read("supabase/migrations/025_update_tax_and_prices.sql");

  assert.match(subscriptions, /presence: 179000/);
  assert.match(subscriptions, /business: 329000/);
  assert.match(subscriptions, /custom: 599000/);
  assert.match(subscriptions, /Alanyi adómentes szolgáltatás/);
  assert.match(estimator, /PRICE_TAX_NOTE/);
  assert.match(migration, /when 'presence' then 14900/);
});

test("provider legal data is the registered individual entrepreneur", () => {
  const legal = read("lib/legal.ts");
  const impressum = read("app/impresszum/page.tsx");

  assert.match(legal, /Boczán Patrik egyéni vállalkozó/);
  assert.match(legal, /62666901/);
  assert.match(legal, /92276084-1-39/);
  assert.match(legal, /Kard köz 1/);
  assert.match(legal, /Alanyi adómentes/);
  assert.doesNotMatch(legal, /TRADE 24|22303442|19-06-508423|8248 Nemesvámos/);
  assert.match(impressum, /EV-nyilvántartási szám/);
  assert.match(impressum, /Adószám/);
  assert.doesNotMatch(impressum, /Statisztikai számjel|Tevékenység kezdete|Főtevékenység|Nyilvántartott tevékenységek/);
});

test("subscription lifecycle changes always reach Stripe", () => {
  const dashboard = read("components/AdminDashboard.tsx");
  const route = read("app/api/stripe/subscription/route.ts");

  // A lemondás, szüneteltetés és újraaktiválás nem írhatja közvetlenül az
  // előfizetési mezőket: korábban ezek csak az adatbázist állították át, a
  // Stripe pedig tovább terhelte az ügyfelet.
  assert.match(dashboard, /stripeSubscriptionAction\(project, "pause"\)/);
  assert.match(dashboard, /stripeSubscriptionAction\(project, "resume"\)/);
  assert.match(dashboard, /stripeSubscriptionAction\(project, "cancel_now"\)/);
  assert.doesNotMatch(dashboard, /updateClientProject\([^)]*subscription_status: "cancelled"/);
  assert.doesNotMatch(dashboard, /updateClientProject\([^)]*subscription_status: "paused"/);

  // A kivásárlás és a projekttörlés is előbb a Stripe-ot zárja le.
  assert.match(dashboard, /await stripeSubscriptionAction\(project, "cancel_now"\)\)\) \{\s*\n\s*setMessage\("A Stripe-előfizetést nem sikerült megszüntetni, ezért a vásárlást nem zártam le/);
  assert.match(dashboard, /project\.stripe_subscription_id && !\(await stripeSubscriptionAction\(project, "cancel_now"\)\)/);

  // Az azonnali/díjat érintő műveletek admin jogosultsághoz kötöttek.
  assert.match(route, /ADMIN_ACTIONS = \["cancel_now", "pause", "resume"\]/);
  assert.match(route, /Ehhez a művelethez admin jogosultság kell/);
  assert.match(route, /PARKING_MONTHLY_PRICE/);
});

test("the Stripe webhook claims an event before processing it", () => {
  const webhook = read("app/api/stripe/webhook/route.ts");

  // Foglalás-először: a duplikátumszűrés az egyedi kulcsra épülő insertből
  // jön, nem egy előzetes select-ből, különben két párhuzamos kézbesítés
  // kétszer küldene emailt és számlázna.
  const claimIndex = webhook.indexOf('.insert({ event_id: event.id, event_type: event.type })');
  const switchIndex = webhook.indexOf("switch (event.type)");
  assert.ok(claimIndex > -1, "hiányzik a webhook-esemény foglalása");
  assert.ok(claimIndex < switchIndex, "a foglalásnak a feldolgozás ELŐTT kell történnie");
  assert.match(webhook, /claimError\.code === "23505"/);
  // Hiba esetén a foglalás felszabadul, hogy a Stripe újraküldése lefusson.
  assert.match(webhook, /stripe_webhook_events"\)\.delete\(\)\.eq\("event_id", event\.id\)/);
  // Törölt projekt nem okozhat végtelen webhook-újrapróbálkozást.
  assert.match(webhook, /reportOrphanEvent/);
  assert.doesNotMatch(webhook, /throw new Error\("A Stripe-előfizetéshez tartozó projekt nem található/);
});

test("the managed-website guard never touches OLD on insert", () => {
  const migration = read("supabase/migrations/027_stripe_lifecycle_fixes.sql");
  // A magyarázó kommentek maguk is idézik a hibás mintát, ezért a tényleges
  // SQL-t vizsgáljuk.
  const sql = migration
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  // A 025 ezt eltörte: purchase modellű INSERT belefutott az OLD-ra
  // hivatkozó blokkba, és "record old is not assigned yet" hibát dobott.
  const insertBranch = sql.indexOf("if tg_op = 'INSERT' then");
  const firstOldRef = sql.indexOf("old.commercial_model");
  assert.ok(insertBranch > -1, "hiányzik a feltétel nélküli INSERT ág");
  assert.ok(firstOldRef > insertBranch, "az OLD-hivatkozás az INSERT ág után kell álljon");
  const branchBody = sql.slice(insertBranch, firstOldRef);
  assert.match(branchBody, /return new;\s*\n\s*end if;/);
  assert.doesNotMatch(branchBody, /\bold\./);

  // A 020-as táblák realtime publikációja.
  assert.match(migration, /add table public\.change_requests/);
  assert.match(migration, /add table public\.subscription_payments/);
});

test("public API routes limit the real body and hide internal errors", () => {
  const guard = read("lib/api-guard.ts");
  const notify = read("app/api/notify/route.ts");
  const deleteProfile = read("app/api/delete-profile/route.ts");
  const widget = read("components/SupportWidget.tsx");

  // A content-length fejlécre nem lehet hagyatkozni (chunked / hamisítható).
  assert.match(guard, /readLimitedBody/);
  assert.match(guard, /await reader\.cancel\(\)/);
  for (const route of [notify, deleteProfile]) {
    assert.doesNotMatch(route, /error: message \}, \{ status: 500/);
  }
  assert.doesNotMatch(notify, /content-length/);

  // A látogatói token nem mehet query stringben (naplók, Referer).
  assert.doesNotMatch(widget, /\?token=/);
  assert.match(widget, /"X-Visitor-Token": /);
});
