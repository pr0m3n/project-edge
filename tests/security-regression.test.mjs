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
  assert.match(impressum, /Statisztikai számjel/);
});
