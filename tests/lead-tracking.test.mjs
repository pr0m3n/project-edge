import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSUMED_RETENTION_MONTHS,
  CONVERSION_FREE_PATH_PREFIXES,
  LEAD_VALUES,
  ONCE_PER_SESSION_KINDS,
  PORTAL_NATIVE_KINDS,
  adsSendTo,
  isConversionFreePath,
  isFreshSignupLead,
  leadConversionBlockedBy,
  leadValue,
  SIGNUP_LEAD_MAX_AGE_MS
} from "../lib/analytics.ts";

const ALL_KINDS = ["chat", "phone", "audit", "brief", "project"];

/** Egy valódi, hirdetésből érkező mobilos látogató a nyilvános oldalon. */
function visitor(overrides = {}) {
  return { path: "/", canPlaceCall: true, alreadySent: false, ...overrides };
}

test("a hirdetésből érkező látogató minden érdeklődése konverzió", () => {
  for (const kind of ALL_KINDS) {
    assert.equal(leadConversionBlockedBy(kind, visitor()), null, kind);
  }
});

test("asztali gépen a telefonszám kattintása nem konverzió", () => {
  // A `tel:` asztali böngészőben jellemzően nem csinál semmit, tehát a
  // kattintás nem bizonyít érdeklődést. Ez volt a legolcsóbb hamis jel.
  assert.equal(leadConversionBlockedBy("phone", visitor({ canPlaceCall: false })), "cannot-place-call");
  // A többi típus viszont asztali gépen is teljesen valódi.
  for (const kind of ALL_KINDS.filter((item) => item !== "phone")) {
    assert.equal(leadConversionBlockedBy(kind, visitor({ canPlaceCall: false })), null, kind);
  }
});

test("az admin és az ügyfélkapu alatti kattintás nem új lead", () => {
  // A lábléc (benne a telefonszám) és a chat widget a ChromeGate miatt ezeken
  // az útvonalakon is ott van; aki ott kattint, az a stúdió vagy meglévő ügyfél.
  for (const path of ["/admin", "/admin/", "/admin/ugyfelek", "/ugyfelkapu", "/ugyfelkapu/dashboard"]) {
    assert.equal(leadConversionBlockedBy("chat", visitor({ path })), "suppressed-path", path);
    assert.equal(leadConversionBlockedBy("audit", visitor({ path })), "suppressed-path", path);
  }
});

test("a projektindítás és a regisztráció az ügyfélkapun belül is valódi lead", () => {
  // Mindkettő szerver által visszaigazolt, és természetes helye az /ugyfelkapu —
  // az útvonalszűrő nem némíthatja el őket, különben a tölcsér alja tűnik el.
  for (const kind of PORTAL_NATIVE_KINDS) {
    assert.equal(leadConversionBlockedBy(kind, visitor({ path: "/ugyfelkapu/dashboard" })), null, kind);
  }
  assert.deepEqual([...PORTAL_NATIVE_KINDS].sort(), ["brief", "project"]);
});

test("a hasonló nevű nyilvános útvonalak nem esnek a szűrő alá", () => {
  // Puszta startsWith('/admin') ezeket is elnémítaná.
  for (const path of ["/", "/munkak", "/adminisztracio", "/ugyfelkapu-arak", "/blog/admin-rendszerek"]) {
    assert.equal(isConversionFreePath(path), false, path);
    assert.equal(leadConversionBlockedBy("chat", visitor({ path })), null, path);
  }
});

test("a telefon és a regisztráció munkamenetenként egyszer számít", () => {
  // A szám négy helyen látszik ugyanazon az oldalon; egy ember akkor is egy
  // érdeklődő, ha az Ads-műveletnél „Minden konverzió" a számlálás.
  for (const kind of ONCE_PER_SESSION_KINDS) {
    assert.equal(leadConversionBlockedBy(kind, visitor({ alreadySent: true })), "duplicate", kind);
  }
});

test("az ismételt chat, audit és projekt viszont önálló megkeresés marad", () => {
  for (const kind of ["chat", "audit", "project"]) {
    assert.equal(leadConversionBlockedBy(kind, visitor({ alreadySent: true })), null, kind);
  }
});

test("a blokkolási okok sorrendje rögzített", () => {
  // Az eszköz erősebb ok, mint az útvonal, az pedig erősebb, mint az ismétlés —
  // így a GA4-be kerülő `lead_not_counted` mindig a valódi okot mondja meg.
  const everything = { path: "/admin", canPlaceCall: false, alreadySent: true };
  assert.equal(leadConversionBlockedBy("phone", everything), "cannot-place-call");
  assert.equal(leadConversionBlockedBy("phone", { ...everything, canPlaceCall: true }), "suppressed-path");
  assert.equal(leadConversionBlockedBy("phone", { path: "/", canPlaceCall: true, alreadySent: true }), "duplicate");
});

test("a konverziós érték sorrendje követi a megkeresés komolyságát", () => {
  // Ez került egyszer élesbe fordítva: a LEGMÉLYEBB konverzió küldte a
  // legkisebb számot, tehát a Google a gyengébb jelet erősítette volna.
  assert.ok(LEAD_VALUES.phone < LEAD_VALUES.chat, "a koppintás nem érhet többet a leírt kérdésnél");
  assert.ok(LEAD_VALUES.chat < LEAD_VALUES.audit);
  assert.ok(LEAD_VALUES.audit < LEAD_VALUES.brief);
  assert.ok(LEAD_VALUES.brief < LEAD_VALUES.project);
});

test("az életciklus-érték minden csomagnál veri a puszta briefet", () => {
  for (const monthly of [14900, 24900, 39900]) {
    assert.ok(monthly * ASSUMED_RETENTION_MONTHS > LEAD_VALUES.brief, String(monthly));
  }
});

test("a hibás felülírt érték a típus alapértékére esik vissza", () => {
  // Nullás értékű konverzió az Adsben annyit jelent, hogy a lead nem ér semmit.
  assert.equal(leadValue("project", 178_800), 178_800);
  assert.equal(leadValue("project", 0), LEAD_VALUES.project);
  assert.equal(leadValue("project", Number.NaN), LEAD_VALUES.project);
  assert.equal(leadValue("project", -1), LEAD_VALUES.project);
  assert.equal(leadValue("project", undefined), LEAD_VALUES.project);
  assert.equal(leadValue("chat"), LEAD_VALUES.chat);
});

test("a típus saját címkéje nyer, és címke nélkül nem megy ki semmi", () => {
  const labels = { chat: "CHAT_LABEL", phone: "", audit: "", brief: "", project: "" };
  assert.equal(adsSendTo("chat", "AW-1", labels, "KOZOS"), "AW-1/CHAT_LABEL");
  // Amíg nincs saját címke, a közös tartalékra esik — a mérés nem néma.
  assert.equal(adsSendTo("phone", "AW-1", labels, "KOZOS"), "AW-1/KOZOS");
  // Se saját, se tartalék: inkább semmit, mint rossz helyre.
  assert.equal(adsSendTo("phone", "AW-1", labels, ""), null);
  assert.equal(adsSendTo("chat", "", labels, "KOZOS"), null);
});

test("a regisztrációs jel lejár, és a hibás időbélyeget eldobjuk", () => {
  const now = 1_700_000_000_000;
  assert.equal(isFreshSignupLead(String(now - 60_000), now), true);
  assert.equal(isFreshSignupLead(String(now), now), true);
  assert.equal(isFreshSignupLead(String(now - SIGNUP_LEAD_MAX_AGE_MS - 1), now), false);
  // Elállított rendszeróra vagy szemét a tárolóban: ezekre ne jelentsünk leadet.
  assert.equal(isFreshSignupLead(String(now + 60_000), now), false);
  assert.equal(isFreshSignupLead("holnap", now), false);
  assert.equal(isFreshSignupLead("0", now), false);
  assert.equal(isFreshSignupLead(null, now), false);
});

test("a szűrt útvonalak listája nem szűkül csendben", () => {
  assert.deepEqual([...CONVERSION_FREE_PATH_PREFIXES], ["/admin", "/ugyfelkapu"]);
});
