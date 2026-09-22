import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

/**
 * A forrás KÓD része, kommentek nélkül.
 *
 * Ezek a tesztek arra vigyáznak, mit CSINÁL a kód — nem arra, miről ír a
 * dokumentáció. A magyarázó komment jellemzően épp a régi hibát nevezi meg
 * („korábban a `custom_domain` oszlopot kérte"), tehát a nyers szövegre
 * illesztve a teszt pont a jó magyarázatot büntetné.
 */
const readCode = (relativePath) =>
  read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Ezek a tesztek egy KONKRÉT, megtörtént hibaosztályt őriznek: a havi
 * ügyfél-jelentés kitalált műszaki adatokat küldött ki valódi ügyfeleknek.
 * A számok („99.98%", „165 ms") string konstansként éltek a route-ban, mérés
 * nélkül. A hiba azért maradt észrevétlenül, mert a route egy nem létező
 * oszlopot kért, tehát a cron amúgy is elhasalt — a törött működés fedte el a
 * tartalmi problémát.
 *
 * Amit itt őrzünk, az nem a megfogalmazás, hanem egy szabály: az ügyfélnek
 * küldött műszaki állítás mögött MÉRÉS legyen.
 */

test("a havi jelentés nem tartalmaz beégetett műszaki számokat", () => {
  const route = readCode("app/api/reports/monthly/route.ts");

  // A konkrét kitalált értékek, amik korábban kimentek.
  assert.doesNotMatch(route, /99\.98/);
  assert.doesNotMatch(route, /165 ms/);
  assert.doesNotMatch(route, /Napi automatikus mentés rendben/i);

  // Semmilyen százalék-literál nem szerepelhet állításként a levélben.
  assert.doesNotMatch(route, /"\d{2}\.\d{2}%/);
});

test("a havi jelentés a valódi mérésekből dolgozik", () => {
  const route = readCode("app/api/reports/monthly/route.ts");

  // A rendelkezésre állás az adatbázis-függvényből jön, nem konstansból.
  assert.match(route, /site_uptime_summary/);
  assert.match(route, /uptime\.checks > 0/);
  // A sebességpontszám a tárolt PSI-mérésből.
  assert.match(route, /psi_performance/);
});

test("a havi jelentés nem kér nem létező oszlopot", () => {
  const route = readCode("app/api/reports/monthly/route.ts");
  const migrations = [
    "supabase/migrations/020_managed_websites.sql",
    "supabase/migrations/038_manual_onboarding.sql",
    "supabase/migrations/039_site_monitoring.sql"
  ].map(read).join("\n");

  // Ez a konkrét oszlop okozta, hogy a cron minden hónapban elhasalt.
  assert.doesNotMatch(route, /custom_domain/);

  // Amit a route kér, annak léteznie kell valamelyik migrációban.
  for (const column of ["managed_domain_name", "ssl_expires_at", "domain_expires_at", "psi_performance"]) {
    assert.match(migrations, new RegExp(column), `${column} nincs egyetlen migrációban sem`);
  }
});

test("a mérés valóban méréssel készül, nem kitalálva", () => {
  const monitor = readCode("lib/site-monitor.ts");

  // Valódi hálózati kérés és valódi TLS kézfogás.
  assert.match(monitor, /await fetch\(target/);
  // Minden lépés (az átirányítások is) nyilvános célra mehet csak: a mérés
  // szerveroldalon fut, egy belső cím SSRF lenne.
  assert.match(monitor, /redirect: "manual"/);
  assert.match(monitor, /publicTargetError\(target\)/);
  assert.match(monitor, /tls\.connect/);
  assert.match(monitor, /pagespeedonline\/v5\/runPagespeed/);

  // Időkorlát mindenhol: egy nem válaszoló cél nem akaszthatja meg a cront.
  assert.match(monitor, /AbortSignal\.timeout/);
});

test("az uptime összesítő egyetlen helyen számol", () => {
  const migration = read("supabase/migrations/039_site_monitoring.sql");

  assert.match(migration, /create or replace function public\.site_uptime_summary/);
  // Osztás a valódi mérésszámmal — nem rögzített érték.
  assert.match(migration, /count\(\*\) filter \(where ok\) \/ count\(\*\)/);
  assert.match(migration, /security definer/);
});

/**
 * A tranzakciós és a marketing levél szétválasztása. Ha ez összecsúszik, az
 * ügyfél vagy a saját számlájáról szóló értesítést veszíti el, vagy a küldő
 * domain kerül levélszemétbe — a hideg email kampány mellett ez utóbbi
 * közvetlen üzleti kár.
 */
test("a leiratkozás csak a marketing levélhez tartozik", () => {
  // A sablon és a küldő külön fájlban él, és a leiratkozás MINDKETTŐT érinti:
  // a cím a sablonban készül (hogy a láblécbe és a fejlécbe ugyanaz kerüljön),
  // a fejlécet viszont a küldő teszi rá. Ezért mindkettőt nézni kell.
  const template = readCode("lib/email-template.ts");
  const sender = readCode("lib/projectedge-email.ts");
  const unsubscribe = readCode("app/api/marketing/unsubscribe/route.ts");

  // A leiratkozó cím CSAK akkor készül el, ha a hívó adott tokent.
  assert.match(template, /unsubscribeToken/);
  assert.match(template, /input\.unsubscribeToken\s*\n?\s*\?/);
  // A fejléc csak akkor kerül a levélre, ha van cím — tranzakciós levélnél nincs.
  assert.match(sender, /unsubscribeUrl \? \{/);
  assert.match(sender, /List-Unsubscribe-Post/);

  // A leiratkozás a hírlevelet kapcsolja ki, nem a szolgáltatás leveleit.
  assert.match(unsubscribe, /marketing_opt_in: false/);
  assert.doesNotMatch(unsubscribe, /subscription_payments|reminder_stage/);

  // Az egykattintásos POST mindig sikert jelez — a 4xx a küldő hírnevét rontaná.
  assert.match(unsubscribe, /status: 204/);
});

test("a fizetési emlékeztető nem küldhet kétszer ugyanolyan levelet", () => {
  const reminders = readCode("app/api/billing/reminders/route.ts");

  // Az idempotencia a fokozat-számlálón áll, nem dátumszámításon.
  assert.match(reminders, /reminder_stage/);
  assert.match(reminders, /stage <= payment\.reminder_stage/);

  // A kártyás ügyfél dunningja a Stripe dolga — nem küldünk párhuzamosat.
  assert.match(reminders, /payment_method === "stripe"/);
});
