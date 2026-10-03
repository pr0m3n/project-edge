/**
 * A `@/…` importok feloldása `node --test` alatt.
 *
 * A Next a tsconfig `paths` alapján oldja fel az aliast, a Node viszont nem
 * ismeri. Azok a modulok, amik aliasszal importálnak (pl. az admin konzol
 * logikája), ezzel a hookkal tesztelhetők — a teszt a `registerHooks()` után
 * dinamikusan importálja őket.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = ROOT + specifier.slice(2);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) {
      if (existsSync(candidate)) return next(pathToFileURL(candidate).href, context);
    }
  }
  return next(specifier, context);
}
