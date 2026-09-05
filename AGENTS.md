<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ProjectEdge Development Guidelines

## Kötelező Vizuális és Funkcionális Ellenőrzés (Playwright)
Minden olyan módosításnál, amely a felhasználói felületet (UI), dizájnt, layoutot, stílust vagy interakciót érinti:
1. **Mindig kötelező a felület vizuális ellenőrzése Playwright segítségével** a böngészőben (pl. `http://localhost:3000/...`).
2. **Képernyőképek készítése**: Asztali és szükség esetén mobil nézetben is képernyőképet kell készíteni, és meg kell vizsgálni, hogy nincsenek-e elcsúszott elemek, törések vagy vizuális regressziók.
3. **Interaktivitás és konzol ellenőrzés**: Le kell tesztelni a gombok működését, az animációkat, és ellenőrizni kell, hogy nem keletkezik-e JavaScript hiba vagy console.error.
4. Csak a sikeres vizuális és konzol ellenőrzés után tekinthető lezártnak a feladat.
