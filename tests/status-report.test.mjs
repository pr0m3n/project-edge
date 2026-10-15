import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolve as aliasResolve } from "./support/alias-hooks.mjs";

registerHooks({ resolve: aliasResolve });

const {
  canAutoSend,
  evaluateReport,
  expectedChecks,
  previousQuarter,
  quarterPeriod
} = await import("../lib/status-report.ts");
const { buildStatusReportEmail } = await import("../lib/status-report-template.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readCode = (path) => readFileSync(join(root, path), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * A negyedéves állapotjelentés valódi ügyfélnek megy, a nevünkben, azzal az
 * állítással, hogy az oldaluk rendben működött. Ezek a tesztek azt őrzik, hogy
 * hamis vagy hiányos mérésből ilyen levél NE mehessen ki magától.
 */

const period = quarterPeriod(new Date("2026-11-10T12:00:00Z"));
const now = new Date("2027-01-02T08:00:00Z");

function inputs(overrides = {}) {
  return {
    projectTitle: "Zsongorkő Gyógyszertár weboldal",
    siteUrl: "https://www.zsongorkogyogyszertar.hu",
    salutation: "Tisztelt Doktornő!",
    toEmail: "ugyfel@example.hu",
    period,
    monitoredSince: new Date("2026-10-01T00:00:00Z"),
    uptime: { checks: 2200, failures: 0, uptime_percent: 100, avg_response_ms: 310, last_failure_at: null },
    daily: [],
    lastCheckAt: new Date("2027-01-02T07:00:00Z"),
    liveCheck: { ok: true, responseMs: 280, error: null },
    sslExpiresAt: new Date("2027-03-01T00:00:00Z"),
    domainName: "zsongorkogyogyszertar.hu",
    domainExpiresAt: new Date("2027-08-31T00:00:00Z"),
    psiPerformance: 94,
    now,
    isFirstReport: false,
    ...overrides
  };
}

const sender = { name: "Boczán Patrik", role: "ProjectEdge · weboldal-üzemeltetés", email: "patrik@example.hu", phone: null };

test("negyedévek: kulcs, határok, magyar címke, előző negyedév", () => {
  assert.equal(period.key, "2026-Q4");
  assert.equal(period.label, "2026. október–december");
  assert.equal(period.start.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(period.end.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(previousQuarter(now).key, "2026-Q4");
  assert.equal(previousQuarter(new Date("2027-04-02T08:00:00Z")).key, "2027-Q1");
});

test("a várt mérésszám a felvétel napjától számol, nem a negyedév elejétől", () => {
  const full = expectedChecks(period, null, now);
  assert.equal(full, 92 * 24);
  const late = expectedChecks(period, new Date("2026-12-01T00:00:00Z"), now);
  assert.equal(late, 31 * 24);
});

test("hibátlan mérésnél nincs figyelmeztetés, és mehet automatikusan — de csak ha be van kapcsolva", () => {
  const warnings = evaluateReport(inputs());
  assert.deepEqual(warnings, []);
  assert.equal(canAutoSend(warnings, true), true);
  assert.equal(canAutoSend(warnings, false), false);
});

test("mérés nélkül a levél nem küldhető (block)", () => {
  const warnings = evaluateReport(inputs({ uptime: { checks: 0, failures: 0, uptime_percent: null, avg_response_ms: null, last_failure_at: null } }));
  assert.ok(warnings.some((w) => w.level === "block"));
  assert.equal(canAutoSend(warnings, true), false);
});

test("hiányos mérés, leállt monitor, élőben nem válaszoló oldal: mind megállítja az automatikus küldést", () => {
  const cases = [
    inputs({ uptime: { checks: 900, failures: 0, uptime_percent: 100, avg_response_ms: 300, last_failure_at: null } }),
    inputs({ lastCheckAt: new Date("2026-12-28T00:00:00Z") }),
    inputs({ liveCheck: { ok: false, responseMs: null, error: "Időtúllépés" } }),
    inputs({ uptime: { checks: 2200, failures: 40, uptime_percent: 98.18, avg_response_ms: 300, last_failure_at: null } }),
    inputs({ isFirstReport: true }),
    inputs({ toEmail: null }),
    inputs({ sslExpiresAt: new Date("2027-01-10T00:00:00Z") })
  ];
  for (const item of cases) {
    const warnings = evaluateReport(item);
    assert.ok(warnings.length > 0, JSON.stringify(item));
    assert.equal(canAutoSend(warnings, true), false);
  }
});

test("a levél magázó, gomb és ügyfélkapu nélküli, és a valódi számokat írja", () => {
  const email = buildStatusReportEmail(inputs(), sender);
  assert.match(email.html, /Tisztelt Doktornő!/);
  assert.match(email.html, /minden óránkénti ellenőrzéskor elérhető volt, összesen 2\s?200 alkalommal/);
  assert.match(email.html, /0,31 másodperc/);
  assert.match(email.subject, /2026\. október–december/);
  assert.doesNotMatch(email.html, /Szia|ügyfélkapu|ugyfelkapu|href="https?:\/\/[^"]*projectedge\.hu\/ugyfelkapu/i);
  assert.doesNotMatch(email.text, /Szia/);
});

test("a fennakadást nem szépíti el", () => {
  const email = buildStatusReportEmail(inputs({ uptime: { checks: 2200, failures: 3, uptime_percent: 99.86, avg_response_ms: 300, last_failure_at: null } }), sender);
  assert.match(email.html, /3 alkalommal rövid fennakadást mértem/);
  assert.doesNotMatch(email.html, /Minden ellenőrzéskor elérhető volt/);
});

test("mérés nélkül a levél nem állítja, hogy az oldal rendben működött", () => {
  const email = buildStatusReportEmail(inputs({ uptime: { checks: 0, failures: 0, uptime_percent: null, avg_response_ms: null, last_failure_at: null } }), sender);
  assert.doesNotMatch(email.html, /Minden ellenőrzéskor elérhető volt|elérhető volt, összesen/);
  assert.match(email.html, /Az első mérések folyamatban/);
});

test("a napi sáv a negyedév minden napjára egy cellát rajzol, a fennakadásos napot másik színnel", async () => {
  const { periodDays, dayState } = await import("../lib/status-report.ts");
  const days = periodDays(period);
  assert.equal(days.length, 92);
  assert.equal(dayState(undefined), "none");
  assert.equal(dayState({ day: days[0], checks: 24, failures: 0 }), "ok");
  assert.equal(dayState({ day: days[0], checks: 24, failures: 2 }), "partial");
  assert.equal(dayState({ day: days[0], checks: 24, failures: 20 }), "down");
  const daily = days.map((day) => ({ day, checks: 24, failures: day === "2026-11-03" ? 2 : 0 }));
  const html = buildStatusReportEmail(inputs({ daily }), sender).html;
  assert.equal((html.match(/height:34px;background:#34b37a/g) ?? []).length, 91);
  assert.equal((html.match(/height:34px;background:#f0a63a/g) ?? []).length, 1);
});

test("a megszólítás nem injektálhat HTML-t", () => {
  const email = buildStatusReportEmail(inputs({ salutation: "<script>x</script>" }), sender);
  assert.doesNotMatch(email.html, /<script>x<\/script>/);
});

test("csendes ügyfél: a szerveroldali útvonalak kihagyják", () => {
  assert.match(readCode("app/api/reports/monthly/route.ts"), /\.eq\("silent", false\)/);
  assert.match(readCode("app/api/billing/reminders/route.ts"), /\.eq\("silent", false\)/);
  assert.match(readCode("app/api/notify/route.ts"), /\.eq\("silent", true\)/);
  assert.match(readCode("app/api/admin/payments/route.ts"), /issueInvoice && !silent/);
  assert.match(readCode("app/api/admin/payments/route.ts"), /notifyClient && !silent/);
  assert.match(readCode("app/api/admin/followup/route.ts"), /project\.silent/);
});

test("a negyedéves jelentés csak jóváhagyással vagy hibátlan méréssel megy ki", () => {
  const code = readCode("app/api/reports/status/route.ts");
  assert.match(code, /prepared\.autoSend && project\.contact_email/);
  assert.match(code, /status: "pending_approval"/);
});
