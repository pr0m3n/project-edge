import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * A chat AI-asszisztensének biztonsági és pontossági korlátai.
 *
 * A route-ok TypeScriptek és `@/` aliast használnak, ezért — a többi
 * teszthez hasonlóan — szövegszinten ellenőrizzük a kritikus pontokat.
 */
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a bot végpont korlátozott és botszűrt", () => {
  const route = read("app/api/support-bot/route.ts");
  assert.match(route, /await checkDurableRateLimit\(request, "support-bot-message"/);
  assert.match(route, /await checkGlobalDurableLimit\("support-bot-daily"/);
  assert.match(route, /readJsonBody<BotPayload>\(request, [\d_]+\)/);
  assert.match(route, /payload\.website/, "rejtett mezős botszűrés kell az új beszélgetéshez");
  assert.match(route, /Date\.now\(\) - startedAt < 1_500/);
  assert.match(route, /\.eq\("visitor_token", token\)/, "meglévő beszélgetés csak a látogatói tokennel folytatható");
  assert.match(route, /MAX_BOT_REPLIES_PER_TICKET/);
});

test("a bot nem szól bele egy Patrik által átvett beszélgetésbe", () => {
  const route = read("app/api/support-bot/route.ts");
  assert.match(route, /if \(data\.status !== "bot"\)[\s\S]{0,200}status: 409/);
});

test("a bot hibájánál a látogató Patrikhoz kerül, nem marad válasz nélkül", () => {
  const route = read("app/api/support-bot/route.ts");
  assert.match(route, /reply = FALLBACK_REPLY;\s*handoff = true;/);
  const reply = read("lib/support-bot/reply.ts");
  assert.match(reply, /catch \(error\) \{[\s\S]{0,120}return null;/);
});

test("az átadás tokenhez kötött, egyszer fut le, és csak bot-beszélgetésen", () => {
  const route = read("app/api/tickets/[ticketId]/handoff/route.ts");
  assert.match(route, /await checkDurableRateLimit\(request, "support-bot-handoff"/);
  assert.match(route, /isUuid\(ticketId\)/);
  assert.match(route, /\.eq\("visitor_token", token\)/);
  assert.match(route, /\.eq\("status", "bot"\)/, "a párhuzamos átadás ne küldjön két értesítőt");
});

test("a kézi üzenetküldés nem ír egy bot-beszélgetésbe", () => {
  const route = read("app/api/tickets/[ticketId]/messages/route.ts");
  assert.match(route, /if \(ticket\.status === "bot"\)[\s\S]{0,200}status: 409/);
});

test("az admin válasza email nélküli AI-beszélgetésnél sem bukik el", () => {
  const route = read("app/api/tickets/[ticketId]/admin-reply/route.ts");
  assert.match(route, /if \(!ticket\.email\)/);
});

test("a 047-es migráció nem romboló, és ismeri a bot állapotot és küldőt", () => {
  const migration = read("supabase/migrations/047_support_bot.sql");
  assert.doesNotMatch(migration, /drop table/i);
  assert.doesNotMatch(migration, /drop column/i);
  assert.doesNotMatch(migration, /delete from/i);
  assert.match(migration, /check \(status in \('bot', 'open', 'answered', 'closed'\)\)/);
  assert.match(migration, /check \(sender in \('customer', 'admin', 'bot'\)\)/);
  // A bot-beszélgetést a látogató üzenete nem nyithatja meg az adminban.
  assert.match(migration, /when new\.sender = 'customer' and status = 'bot' then 'bot'/);
});

test("a modell az AI Gateway-en fut, tanítás nélkül, a tájékoztatóban szereplő szolgáltatóknál", () => {
  const reply = read("lib/support-bot/reply.ts");
  assert.match(reply, /const DEFAULT_MODEL = "openai\/gpt-6-luna";/);
  assert.match(reply, /disallowPromptTraining: true/);
  assert.match(reply, /only: \["openai", "anthropic"\]/);
  assert.match(reply, /Output\.object\(/, "strukturált kimenet kell, nem eszközhívó ciklus");
  assert.doesNotMatch(reply, /tools:/, "a botnak nincs végrehajtható eszköze");

  const privacy = read("app/adatkezeles/page.tsx");
  assert.match(privacy, /OpenAI/);
  assert.match(privacy, /Anthropic/);
});

test("a tudásanyagban nincs kézzel beírt csomagár — minden a lib/subscriptions-ből jön", () => {
  const knowledge = read("lib/support-bot/knowledge.ts");
  // (A 10 000 Ft-os foglalónak nincs konstansa — az az oldalon is szövegként él.)
  for (const price of ["14 900", "24 900", "39 900", "179 000", "329 000", "599 000", "29 000", "2 900"]) {
    assert.ok(!knowledge.includes(price), `${price} ne legyen beégetve a tudásanyagba`);
  }
  assert.match(knowledge, /SUBSCRIPTION_PLANS\.map/);
  assert.match(knowledge, /HOME_FAQS/);
});

test("a chat csak saját, relatív linket rajzol a bot szövegéből", () => {
  const widget = read("components/SupportWidget.tsx");
  assert.match(widget, /function renderBotText/);
  assert.match(widget, /<a href=\{path\} key=\{index\}>/);
  assert.doesNotMatch(widget, /dangerouslySetInnerHTML/);
});

test("a bankkártyaszám kitakarása a tárolás és a modellhívás előtt fut", async (t) => {
  const route = read("app/api/support-bot/route.ts");
  assert.match(route, /const message = redactCardNumbers\(clean\(payload\.message\)\);/);

  // A Node 22 (CI) típuseltávolítás nélkül nem tud .ts-t importálni — ott
  // csak a fenti szöveges ellenőrzés fut.
  let redact;
  try {
    redact = await import("../lib/support-bot/redact.ts");
  } catch {
    t.skip("TypeScript import ebben a Node-verzióban nem támogatott");
    return;
  }
  const { redactCardNumbers, REDACTED_CARD } = redact;
  assert.equal(redactCardNumbers("A kártyám 4111 1111 1111 1111 ezzel"), `A kártyám ${REDACTED_CARD} ezzel`);
  assert.equal(redactCardNumbers("5555-5555-5555-4444"), REDACTED_CARD);
  // Telefonszám, adószám és Luhn-hibás számsor érintetlen marad.
  assert.equal(redactCardNumbers("tel: +36 20 406 4954"), "tel: +36 20 406 4954");
  assert.equal(redactCardNumbers("adószám 92276084-1-39"), "adószám 92276084-1-39");
  assert.equal(redactCardNumbers("1234567890123456"), "1234567890123456");
});
