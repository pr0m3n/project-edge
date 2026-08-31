import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * A rent-to-own beszámítás szabályai.
 *
 * A `lib/subscriptions.ts` TypeScript és `@/` aliast importál, ezért a
 * számítást itt újraépítjük ugyanabból a logikából, a konstansokat pedig
 * szövegszinten olvassuk ki a forrásból. Ha a kettő elcsúszik, ez elbukik.
 */
const source = readFileSync(new URL("../lib/subscriptions.ts", import.meta.url), "utf8");
const aszf = readFileSync(new URL("../app/aszf/page.tsx", import.meta.url), "utf8");

function num(name) {
  const match = source.match(new RegExp(`export const ${name} = ([0-9.]+);`));
  assert.ok(match, `${name} nem található a forrásban`);
  return Number(match[1]);
}

const MONTHLY = { presence: 14900, business: 24900, custom: 39900 };
const LIST = (() => {
  const block = source.match(/PURCHASE_OPTION_PRICES: Record<SubscriptionPlanKey, number> = \{([^}]+)\}/);
  assert.ok(block, "PURCHASE_OPTION_PRICES nem található");
  return Object.fromEntries([...block[1].matchAll(/(\w+): (\d+)/g)].map(([, k, v]) => [k, Number(v)]));
})();

const RATE = num("BUYOUT_CREDIT_RATE");
const MAX_SHARE = num("BUYOUT_CREDIT_MAX_SHARE");

const cap = (key) => Math.round(LIST[key] * MAX_SHARE);
const payable = (key, monthsPaid) =>
  LIST[key] - Math.min(Math.round(MONTHLY[key] * RATE) * Math.max(0, Math.floor(monthsPaid)), cap(key));

test("sem a havidíj, sem a listaár nem változott", () => {
  for (const [key, price] of Object.entries(MONTHLY)) {
    assert.match(source, new RegExp(`price: ${price},`), `${key} havidíja ${price} kell legyen`);
  }
  assert.deepEqual(LIST, { presence: 179000, business: 329000, custom: 599000 });
});

test("a beszámítás plafonja SZÁZALÉK, nem hónapszám", () => {
  // Ez a lényeg: a vételár ~12× havidíj, ezért egy 24 hónapos hónap-plafon
  // mellett a beszámítás nullába vinné az árat (14 900 / 2 × 24 = 178 800 a
  // 179 000-es vételárnál). Az arányplafon nem tud elfogyni.
  assert.doesNotMatch(source, /BUYOUT_CREDIT_MAX_MONTHS/, "a hónap-plafon nem térhet vissza");
  assert.equal(MAX_SHARE, 0.5);
});

test("a vételár soha nem megy a fele alá, és nulla alá pláne nem", () => {
  for (const key of Object.keys(MONTHLY)) {
    const floor = payable(key, 9999);
    assert.equal(floor, LIST[key] - cap(key));
    assert.ok(floor > 0, `${key}: a padló ${floor}`);
    assert.ok(Math.abs(floor - LIST[key] / 2) < 2, `${key}: a padlónak a listaár fele kell legyen`);
  }
});

test("a beszámítás a plafon elérése után nem nő tovább", () => {
  for (const key of Object.keys(MONTHLY)) {
    const months = Math.ceil(cap(key) / Math.round(MONTHLY[key] * RATE));
    assert.equal(payable(key, months + 12), payable(key, months));
    assert.equal(payable(key, 999), payable(key, months));
  }
});

test("nulla hónapnál a listaár, negatív hónapnál sincs beszámítás", () => {
  for (const key of Object.keys(MONTHLY)) {
    assert.equal(payable(key, 0), LIST[key]);
    assert.equal(payable(key, -5), LIST[key]);
  }
});

test("a plafon nagyjából egy év bérlés alatt telik be", () => {
  // Ezt ígérjük a főoldalon („nagyjából egy év bérlés után feleáron"), tehát
  // nem csúszhat el észrevétlenül két évre.
  for (const key of Object.keys(MONTHLY)) {
    const months = Math.ceil(cap(key) / Math.round(MONTHLY[key] * RATE));
    assert.ok(months >= 10 && months <= 16, `${key}: ${months} hónap alatt telik be`);
  }
});

test("a beszámítás a kliensben és az ügyfélkapun ugyanabból a függvényből jön", () => {
  assert.match(source, /export function buyoutPrice/);
  assert.match(source, /export function buyoutCredit/);
  assert.match(source, /export function buyoutCreditCap/);
  assert.match(source, /export function buyoutCreditMonths/);
  assert.match(source, /export function buyoutFloorPrice/);
  assert.match(source, /export function elapsedBillingMonths/);

  const portal = readFileSync(new URL("../components/portal/PurchaseFlowPanel.tsx", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../components/AdminDashboard.tsx", import.meta.url), "utf8");
  assert.match(portal, /buyoutPrice\(project\.subscription_plan/);
  assert.match(admin, /buyoutPrice\(project\.subscription_plan/);
});

test("az ÁSZF a beszámítást ígéri, nem az ellenkezőjét", () => {
  assert.doesNotMatch(aszf, /nem számítanak bele a vételárba/, "a régi, ellentétes mondat nem maradhat bent");
  assert.match(aszf, /Beszámítás a vételárba/);
  assert.match(aszf, /el nem éri a vételár 50%-át/);
  assert.match(aszf, /elvész/, "a felmondáskori elvesztést ki kell mondani");
});

test("az ügyfélkapui szerződés ugyanazt mondja, mint az ÁSZF", () => {
  // Az egyedi szerződés az elsődleges dokumentum: ha ez mást ígér, mint az
  // ÁSZF, akkor az ellentmondás JOGILAG az ügyfél javára dől el.
  const contract = readFileSync(new URL("../components/portal/ContractPanel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(contract, /nem vételárrészletek/, "a régi, ellentétes mondat nem maradhat bent");
  assert.match(contract, /BUYOUT_CREDIT_MAX_SHARE/, "a szerződés a konstansból dolgozzon, ne beégetett számból");
  assert.match(contract, /BUYOUT_CREDIT_RATE/);
  assert.match(contract, /beszámít a vételárba/);
});
