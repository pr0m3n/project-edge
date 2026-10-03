import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { resolve as aliasResolve } from "./support/alias-hooks.mjs";

registerHooks({ resolve: aliasResolve });
const {
  buildConversations,
  buildCounts,
  buildTodayItems,
  consoleHref,
  filterConversations,
  monthlyRecurringRevenue
} = await import("../components/admin/console/derive.ts");

const NOW = Date.parse("2026-10-03T15:00:00Z");
const iso = (minutesAgo) => new Date(NOW - minutesAgo * 60_000).toISOString();

function project(overrides = {}) {
  return {
    id: "p1",
    user_id: "u1",
    created_at: iso(60 * 24 * 30),
    title: "Teszt Kft weboldal",
    company: "Teszt Kft",
    contact_name: "Teszt Elek",
    contact_email: "elek@teszt.hu",
    status: "launched",
    commercial_model: "subscription",
    subscription_status: "active",
    subscription_plan: "business",
    monthly_price: 24900,
    site_health_status: "healthy",
    delete_requested: false,
    deposit_transfer_reported: false,
    final_transfer_reported: false,
    final_payment_paid: false,
    review_approved: false,
    payment_status: "deposit_paid",
    last_modified_at: null,
    ...overrides
  };
}

function input(overrides = {}) {
  return {
    projects: [],
    conversations: [],
    leads: [],
    changeRequests: [],
    websitePurchases: [],
    billingoIssues: [],
    pendingPayments: [],
    briefDraftCount: 0,
    nowMs: NOW,
    ...overrides
  };
}

test("lezárt projekt nem riaszt „nem elérhető” állapottal (a Lucas Kisbirtok-hiba)", () => {
  const closed = project({ id: "closed", status: "closed", site_health_status: "offline", subscription_status: "cancelled" });
  const items = buildTodayItems(input({ projects: [closed] }));
  assert.equal(items.find((item) => item.id === "offline-closed"), undefined);
});

test("szüneteltetett projekt sem riaszt (a szüneteltetés szándékosan offline-ra állítja)", () => {
  const paused = project({ id: "paused", status: "paused", site_health_status: "offline" });
  const items = buildTodayItems(input({ projects: [paused] }));
  assert.equal(items.some((item) => item.id === "offline-paused"), false);
});

test("élő, leállt oldal sürgős, és a projektre visz", () => {
  const down = project({ id: "down", site_health_status: "offline" });
  const item = buildTodayItems(input({ projects: [down] })).find((entry) => entry.id === "offline-down");
  assert.ok(item);
  assert.equal(item.priority, 1);
  assert.deepEqual(item.target, { kind: "project", projectId: "down", tab: "attekintes" });
});

test("lezárt projekt a „rajtad a sor” listából is kimarad", () => {
  const closed = project({ id: "c", status: "closed" });
  const fresh = project({ id: "f", status: "request_received" });
  const items = buildTodayItems(input({ projects: [closed, fresh] }));
  assert.equal(items.some((item) => item.id === "turn-c"), false);
  assert.equal(items.some((item) => item.id === "turn-f"), true);
});

const botTicket = (overrides = {}) => ({
  id: "t-bot",
  created_at: iso(30),
  last_message_at: iso(5),
  name: null,
  email: null,
  message: "Mennyibe kerül egy weboldal?",
  handoff_reason: null,
  rating: null,
  rating_comment: null,
  status: "bot",
  admin_reply: null,
  source: "projectedge.hu",
  ...overrides
});

test("az AI-beszélgetés címe az első kérdése, és AI-forrásként látszik", () => {
  const conversations = buildConversations({
    tickets: [botTicket()],
    ticketMessages: {
      "t-bot": [
        { id: "m1", ticket_id: "t-bot", sender: "customer", body: "Mennyibe kerül egy weboldal?", created_at: iso(30) },
        { id: "m2", ticket_id: "t-bot", sender: "bot", body: "179 000 Ft-tól.", created_at: iso(29) }
      ]
    },
    clientTickets: [],
    clientTicketMessages: {}
  });
  assert.equal(conversations.length, 1);
  assert.equal(conversations[0].source, "ai");
  assert.match(conversations[0].title, /Mennyibe kerül egy weboldal\?/);
  assert.equal(conversations[0].needsReply, false);
  assert.equal(filterConversations(conversations, "ai", "").length, 1);
  assert.equal(filterConversations(conversations, "reply", "").length, 0);
});

test("az AI-beszélgetések megjelennek a Ma listán és a számlálóban", () => {
  const conversations = buildConversations({
    tickets: [botTicket(), botTicket({ id: "t-handoff", handoff_reason: "Egyedi ajánlatot kér" })],
    ticketMessages: {},
    clientTickets: [],
    clientTicketMessages: {}
  });
  const today = buildTodayItems(input({ conversations }));
  assert.ok(today.some((item) => item.id === "ai-fresh"));
  assert.ok(today.some((item) => item.id === "handoff-t-handoff"));
  const counts = buildCounts({ today, conversations, projects: [], billingoIssues: [], pendingPayments: [], leads: [], nowMs: NOW });
  assert.equal(counts.aiConversations, 2);
});

test("a megválaszolatlan üzenet egyenként jelenik meg, és a beszélgetésre visz", () => {
  const conversations = buildConversations({
    tickets: [botTicket({ id: "open1", status: "open", name: "Kiss Anna", email: "anna@x.hu" })],
    ticketMessages: {},
    clientTickets: [{ id: "ct1", user_id: "u1", project_id: "p1", contact_email: "a@b.hu", contact_name: "Ügyfél Béla", subject: "Kérdés", status: "open", rating: null, rating_comment: null, last_message_at: iso(10) }],
    clientTicketMessages: {}
  });
  const today = buildTodayItems(input({ conversations }));
  const ids = today.filter((item) => item.target.kind === "conversation").map((item) => item.id).sort();
  assert.deepEqual(ids, ["conv-ct1", "conv-open1"]);
});

test("a nyitott módosítási kérés az adatbázisban lezárható, és nem rejthető el", () => {
  const request = { id: "r1", project_id: "p1", category: "content", description: "Csere a nyitóképre", status: "new", requested_at: iso(100) };
  const item = buildTodayItems(input({ projects: [project()], changeRequests: [request] })).find((entry) => entry.id === "change-r1");
  assert.ok(item);
  assert.deepEqual(item.action, { kind: "resolve-change", requestId: "r1" });
  assert.equal(item.dismissible, false);
});

test("bejelentett utalás és számlázási hiba sürgős", () => {
  const items = buildTodayItems(input({
    projects: [project()],
    pendingPayments: [{ id: "pay1", project_id: "p1", amount: 24900, due_date: iso(-60 * 24 * 3), status: "reported" }],
    billingoIssues: [{ id: "b1", project_id: "p1", amount: 24900, paid_at: iso(60), stripe_invoice_id: null, billingo_error: "timeout" }]
  }));
  assert.equal(items.find((item) => item.id === "reported-pay1")?.priority, 1);
  assert.deepEqual(items.find((item) => item.id === "billingo-b1")?.action, { kind: "billingo-retry", paymentId: "b1" });
});

test("a jövőbeli domain-megújítás nem riaszt (a régi Inbox minden jövőbeli dátumra riasztott)", () => {
  const items = buildTodayItems(input({ projects: [project({ domain_renewal_at: iso(-60 * 24 * 200) })] }));
  assert.equal(items.some((item) => item.id === "domain-p1"), false);
  const soon = buildTodayItems(input({ projects: [project({ domain_expires_at: iso(-60 * 24 * 5) })] }));
  assert.equal(soon.find((item) => item.id === "domain-p1")?.priority, 1);
});

test("a lista fontosság szerint rendezett", () => {
  const items = buildTodayItems(input({
    projects: [project({ id: "down", site_health_status: "offline" }), project({ id: "new", status: "request_received" })],
    leads: [{ id: "l1", status: "new" }],
    briefDraftCount: 2
  }));
  const priorities = items.map((item) => item.priority);
  assert.deepEqual(priorities, [...priorities].sort((a, b) => a - b));
});

test("a havi bevétel az alkudott ciklusdíjból számol", () => {
  const listPrice = project({ id: "a", monthly_price: 24900 });
  const inactive = project({ id: "b", subscription_status: "paused" });
  assert.equal(monthlyRecurringRevenue([listPrice, inactive]), 24900);
});

test("a régi admin linkek a Ma oldalra mutatnak", () => {
  assert.equal(consoleHref("/admin/dashboard"), "/admin/ma");
  assert.equal(consoleHref("/admin"), "/admin/ma");
  assert.equal(consoleHref(null), "/admin/ma");
  assert.equal(consoleHref("/admin/ugyfelek/p1"), "/admin/ugyfelek/p1");
  assert.equal(consoleHref("https://evil.example"), "/admin/ma");
});

const { leadPipeline, revenueSummary, upcomingPayments } = await import("../components/admin/console/derive.ts");

test("a 90 napos előrejelzés a rögzített tételből a ciklus szerint vetít előre", () => {
  const monthly = project({ id: "m", billing_period_months: 1 });
  const rows = upcomingPayments([monthly], [{ id: "x", project_id: "m", amount: 24900, due_date: "2026-10-10T00:00:00Z", status: "pending" }], NOW);
  assert.ok(rows.length >= 3 && rows.length <= 4, `várt 3–4 sor, kapott ${rows.length}`);
  assert.equal(rows[0].projected, false);
  assert.ok(rows.slice(1).every((row) => row.projected));
});

test("az inaktív előfizetésnek nincs előrejelzése", () => {
  const paused = project({ id: "z", subscription_status: "paused" });
  assert.equal(upcomingPayments([paused], [{ id: "y", project_id: "z", amount: 1, due_date: "2026-10-10T00:00:00Z" }], NOW).length, 0);
});

test("bevételi összesítő és érdeklődő-tölcsér", () => {
  const summary = revenueSummary([project({ id: "a", payment_method: "bank_transfer" }), project({ id: "b", payment_method: "stripe" })]);
  assert.equal(summary.active.length, 2);
  assert.equal(summary.byTransfer.length, 1);
  const pipeline = leadPipeline([{ status: "won", source: "cold_email" }, { status: "new", source: "cold_email" }, { status: "archived", source: "gyorssav" }]);
  assert.deepEqual(pipeline.map((row) => [row.source, row.total, row.won]), [["Hideg email", 2, 1]]);
});
