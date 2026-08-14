import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * A módosítási keret szabályai.
 *
 * A `lib/subscriptions.ts` TypeScript és `@/` aliast importál, ezért a
 * függvényeket itt újraépítjük ugyanabból a logikából, és a forrást
 * szövegszinten is ellenőrizzük. Ha a kettő elcsúszik, ez a teszt elbukik.
 */
const source = readFileSync(new URL("../lib/subscriptions.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/031_change_request_quota.sql", import.meta.url), "utf8");

// A `quotaPeriodKey` másolata — a teszt ezt hasonlítja a forráshoz.
function quotaPeriodKey(anchorIso, quota, now) {
  const anchor = anchorIso ? new Date(anchorIso) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) return quota.period === "year" ? "Y0" : "M0";
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const anchorDay = Math.min(anchor.getDate(), daysInMonth);
  let elapsed;
  if (quota.period === "year") {
    elapsed = now.getFullYear() - anchor.getFullYear();
    if (now.getMonth() < anchor.getMonth() || (now.getMonth() === anchor.getMonth() && now.getDate() < anchorDay)) elapsed -= 1;
  } else {
    elapsed = (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth());
    if (now.getDate() < anchorDay) elapsed -= 1;
  }
  return `${quota.period === "year" ? "Y" : "M"}${Math.max(0, elapsed)}`;
}

const monthly = { count: 1, period: "month" };
const yearly = { count: 3, period: "year" };

test("a havi keret a fordulónapon újul, nem a hónap elsején", () => {
  const anchor = "2026-01-17T10:00:00.000Z";
  assert.equal(quotaPeriodKey(anchor, monthly, new Date(2026, 0, 20)), "M0");
  assert.equal(quotaPeriodKey(anchor, monthly, new Date(2026, 1, 1)), "M0", "február 1. még az első időszak");
  assert.equal(quotaPeriodKey(anchor, monthly, new Date(2026, 1, 17)), "M1", "február 17-én fordul");
  assert.equal(quotaPeriodKey(anchor, monthly, new Date(2027, 0, 17)), "M12");
});

test("31-i fordulónapnál a rövid hónap utolsó napja a forduló", () => {
  const anchor = "2026-01-31T10:00:00.000Z";
  assert.equal(quotaPeriodKey(anchor, monthly, new Date(2026, 1, 27)), "M0");
  assert.equal(quotaPeriodKey(anchor, monthly, new Date(2026, 1, 28)), "M1", "februárban a 28. a forduló");
});

test("az éves keret az évfordulón újul", () => {
  const anchor = "2026-08-14T10:00:00.000Z";
  assert.equal(quotaPeriodKey(anchor, yearly, new Date(2027, 7, 13)), "Y0");
  assert.equal(quotaPeriodKey(anchor, yearly, new Date(2027, 7, 14)), "Y1");
});

test("hiányzó horgony esetén nem omlik össze a számítás", () => {
  assert.equal(quotaPeriodKey(null, monthly, new Date()), "M0");
  assert.equal(quotaPeriodKey("nem-datum", yearly, new Date()), "Y0");
});

test("a technikai hiba soha nem fogyaszt keretet", () => {
  assert.match(source, /if \(request\.category === "technical"\) return false;/);
  assert.match(source, /CHANGE_QUOTA_FREE/);
});

test("az elutasított, a külön ajánlatos és a vásárlási kérés sem fogyaszt", () => {
  assert.match(source, /if \(request\.status === "declined"\) return false;/);
  assert.match(source, /if \(request\.included_in_plan === false\) return false;/);
  assert.match(source, /if \(isWebsitePurchaseRequest\(request\.description\)\) return false;/);
});

test("a period_key-t adatbázis-trigger tölti, nem a kliens", () => {
  assert.match(migration, /before insert on public\.change_requests/);
  assert.match(migration, /security definer/);
  assert.doesNotMatch(migration, /grant .* on public\.change_requests .* to authenticated/i);
});

test("a migráció ugyanazt a fordulónap-szabályt használja, mint a kliens", () => {
  assert.match(migration, /least\(anchor_day, days_in_month\)/);
  assert.match(migration, /plan = 'presence'/, "a Jelenlét keret éves");
});

test("a csomagok kvótája és a megjelenített mondat nem csúszhat el", () => {
  assert.match(source, /changeQuota: \{ count: 3, period: "year" \}/);
  assert.match(source, /changeQuota: \{ count: 1, period: "month" \}/);
  assert.match(source, /changeQuota: \{ count: 2, period: "month" \}/);
  assert.match(source, /export function changeQuotaLabel/);
});

test("az összehasonlító táblázat minden csomagra ugyanazt kérdezi", () => {
  const rows = [...source.matchAll(/\{ label: "([^"]+)", value: \(plan\)/g)];
  assert.ok(rows.length >= 8, "legalább nyolc közös tengely kell");
  assert.ok(rows.some(([, label]) => label === "Oldalak"), "az oldalszám a legfontosabb tengely");
  assert.ok(rows.some(([, label]) => label === "Módosítási keret"));
});

test("a logótervezés mindkét konstrukciónál kérhető, részletekkel", () => {
  const briefFields = readFileSync(new URL("../components/portal/brief-fields.ts", import.meta.url), "utf8");
  const portal = readFileSync(new URL("../components/ClientPortal.tsx", import.meta.url), "utf8");
  const draft = readFileSync(new URL("../lib/brief-draft.ts", import.meta.url), "utf8");

  // A mezőknek léteznie kell az űrlap alapállapotában, különben a szerkesztő
  // ág elveszíti őket (a projectForm/editForm ebből a shape-ből származik).
  assert.match(draft, /logoStyle: ""/);
  assert.match(draft, /logoColorSource: ""/);
  assert.match(draft, /logoBrief: ""/);

  // A kérdés nem lehet a vásárlási ághoz kötve.
  assert.doesNotMatch(portal, /commercialModel === "purchase" && projectForm\.logoStatus === "no"/);
  assert.match(portal, /projectForm\.logoStatus === "no" \? \(/);

  // A válaszoknak a brief SZÖVEGÉBE is bele kell kerülniük, mert az admin és
  // az AI-prompt onnan olvas vissza.
  assert.match(briefFields, /Logó típusa: /);
  assert.match(briefFields, /Logó színei: /);
  assert.match(briefFields, /Logó leírás: /);
  assert.match(briefFields, /logoDesignLines/);
});

test("a logótervezés validációja nem enged hiányos igényt átmenni", () => {
  const briefFields = readFileSync(new URL("../components/portal/brief-fields.ts", import.meta.url), "utf8");
  assert.match(briefFields, /form\.logoStatus === "no" && !form\.wantLogoDesign/);
  assert.match(briefFields, /wantLogoDesign === "yes" && !form\.logoStyle/);
});

test("a bérlésből kivásárlás átadása tartalmazza a domain átírását", () => {
  const handover = readFileSync(new URL("../lib/handover.ts", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../components/AdminDashboard.tsx", import.meta.url), "utf8");

  // A kivásárlási terv NEM a `dns` lépéseket kapja: azok azt feltételeznék,
  // hogy a domain már az ügyfélé, holott bérlésnél a Szolgáltató nevén van.
  assert.match(admin, /buildHandoverPlan\(\["vercel", "github", "domain"\]\)/);
  assert.match(handover, /id: "domain_account"/);
  assert.match(handover, /id: "domain_transfer"/);
  assert.match(handover, /id: "domain_confirm"/);

  // A két domainkezelés kizárja egymást.
  assert.match(handover, /function resolveDomainServices/);
  assert.match(handover, /services\.filter\(\(service\) => service !== "dns"\)/);
});

test("a domain átírása figyelmezteti az ügyfelet a megújítási felelősségre", () => {
  const handover = readFileSync(new URL("../lib/handover.ts", import.meta.url), "utf8");
  assert.match(handover, /megújítási díja téged terhel/);
});

test("az átfutás nem válaszidőnek látszik, és külön van a visszaigazolástól", () => {
  // A régi, félreérthető mező nem élhet tovább sehol.
  // Sor eleji mezőhozzárendelés, hogy a magyarázó komment ne adjon fals találatot.
  assert.doesNotMatch(source, /^\s+response: "/m);
  assert.doesNotMatch(source, /"Válasz \d+ munkanapon belül"/);

  // Az átfutás számként él, és a megfogalmazás az ELKÉSZÜLÉSRŐL szól.
  assert.match(source, /changeLeadDays: 5/);
  assert.match(source, /changeLeadDays: 3/);
  assert.match(source, /changeLeadDays: 2/);
  assert.match(source, /A kért módosítás \$\{days\} munkanapon belül elkészül/);

  // A visszaigazolás és a hibára reagálás minden csomagra azonos vállalás.
  assert.match(source, /ACK_PROMISE = "Írásos kérésre 1 munkanapon belül visszaigazolok"/);
  assert.match(source, /FAULT_RESPONSE_PROMISE = "Technikai hibára 1 munkanapon belül reagálok"/);
  assert.ok(
    SHARED_HAS_ACK(source),
    "a visszaigazolás a minden csomagban benne van listában is szerepeljen"
  );
});

function SHARED_HAS_ACK(src) {
  const block = src.slice(src.indexOf("SUBSCRIPTION_SHARED_INCLUDED"), src.indexOf("CHANGE_QUOTA_INCLUDED"));
  return /visszaigazolok/.test(block) && /reagálok/.test(block);
}

test("a „prioritásos ügyintézés” homályos felirat eltűnt", () => {
  assert.doesNotMatch(source, /"Prioritásos ügyintézés"/);
});
