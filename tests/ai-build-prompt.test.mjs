import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * A prompt-építő szövegszintű ellenőrzése.
 *
 * A modul TypeScript és `@/` aliasokat importál, ezért itt nem futtatjuk le —
 * azt a `tsc --noEmit` és a `next build` fedi. Amit ez a teszt véd: a prompt
 * TARTALMI ígéretei, tehát hogy a szabályok tényleg benne vannak a forrásban,
 * és nem tűnnek el egy későbbi átírásnál.
 */
const source = readFileSync(new URL("../lib/ai-build-prompt.ts", import.meta.url), "utf8");

test("a prompt tiltja a helykitöltő szöveget és a kitalált tényeket", () => {
  assert.match(source, /Ne írj helykitöltő szöveget/);
  assert.match(source, /Ne találj ki tényt/);
  assert.match(source, /Ne tegyél fel visszakérdezést/);
});

test("a személyes adatok alapból kimaradnak a promptból", () => {
  assert.match(source, /includeContact:\s*false/);
  const contactLine = source.match(/\["Kapcsolattartó", options\.includeContact \? [^\]]+\]/);
  assert.ok(contactLine, "a kapcsolattartó mezőnek a kapcsolóhoz kell kötve lennie");
});

test("a magyar jogi kötelezettségek külön blokkban szerepelnek", () => {
  assert.match(source, /Impresszum oldal/);
  assert.match(source, /Adatkezelési tájékoztató/);
  assert.match(source, /Süti-tájékoztató/);
});

test("a titkokra vonatkozó szabály benne van", () => {
  assert.match(source, /Semmilyen API kulcs, jelszó vagy titok ne kerüljön a forráskódba/);
});

test("minden választható blokknak van kulcsa és címkéje", () => {
  const keys = [...source.matchAll(/\{ key: "([a-z]+)", label: "([^"]+)"/g)];
  assert.equal(keys.length, 14);
  const unique = new Set(keys.map(([, key]) => key));
  assert.equal(unique.size, 14, "a blokkkulcsoknak egyedinek kell lenniük");
});

test("az előfizetéses csomag terjedelmi korlátja bekerül a promptba", () => {
  assert.match(source, /Terjedelmi korlát/);
});
