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
