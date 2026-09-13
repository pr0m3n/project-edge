import type { ReactElement } from "react";

/* „Amire épül" — a /szolgaltatasok oldalon a csomagárak ELŐTT álló sáv.
   Szándékosan NEM logófal és nem partnerlista: azt az egyetlen ellenvetést
   előzi meg, ami az árnál jönne („miért ne egy sablon?"). Ezért van minden
   márkajel mellett szerep és egy mondat — a logó önmagában csak dekoráció
   lenne, és a célközönség úgysem ismeri fel a neveket.

   Nincs végtelen csúszó sáv: a mozgó logósor a SaaS-sablonok kelléke, és pont
   a prémium benyomást viszi el. Statikus rács, hajszálvonalakkal.

   A márkajelek egyszínűek, currentColorral rajzolódnak. Mind 0 0 24 24-es
   viewBoxban van, de a vizuális súlyuk nem egyforma — a tömör Vercel-
   háromszög jóval "nehezebb", mint a Next.js körvonala —, ezért minden
   tételnek saját optikai szorzója van (`scale`), nem egyforma dobozmérete.
   A doboz mérete közös, a jelé nem: így ülnek egy vonalon. */

type StackItem = {
  name: string;
  role: string;
  note: string;
  scale: number;
  Mark: () => ReactElement;
};

function MarkNext() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z" />
    </svg>
  );
}

function MarkVercel() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 1.608 12 20.784H0Z" />
    </svg>
  );
}

function MarkSupabase() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" />
    </svg>
  );
}

function MarkStripe() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
    </svg>
  );
}

const stack: StackItem[] = [
  {
    name: "Next.js",
    role: "Keretrendszer",
    note: "Az oldal a szerveren áll össze, a látogató kész HTML-t kap. Ettől gyors, és ettől olvassa jól a Google.",
    scale: 1,
    Mark: MarkNext
  },
  {
    name: "Vercel",
    role: "Tárhely és CDN",
    note: "A fájlok a világ több pontján állnak, mindig a legközelebbiről töltődnek. Nincs megosztott tárhely, amin mások oldalai lassítanak.",
    scale: 0.86,
    Mark: MarkVercel
  },
  {
    name: "Supabase",
    role: "Adatbázis és belépés",
    note: "Az ügyfélkapu, a ticketek és a jogosultságok mögött ez áll. Kezelt Postgres, automatikus mentéssel.",
    scale: 0.98,
    Mark: MarkSupabase
  },
  {
    name: "Stripe",
    role: "Fizetés",
    note: "A havidíj bankkártyás terhelését végig a Stripe kezeli. Kártyaadat nem kerül hozzám, és nem tárolom.",
    scale: 0.92,
    Mark: MarkStripe
  }
];

export function StackRow() {
  return (
    <section className="stack-band" aria-labelledby="stack-band-title">
      <div className="stack-head">
        <p className="micro-label dark">Amire épül</p>
        <h2 id="stack-band-title">Nem sablon, és nem bővítmények halmaza.</h2>
        <p>
          Ugyanaz a négy réteg dolgozik a te oldalad alatt, amin nagy forgalmú termékek futnak.
          Ezért nincs havi bővítményfrissítés, feltört admin és fokozatos lassulás.
        </p>
      </div>

      <ul className="stack-rail">
        {stack.map(({ name, role, note, scale, Mark }) => (
          <li className="stack-cell" key={name}>
            <span className="stack-mark" style={{ "--s": scale } as React.CSSProperties}>
              <Mark />
            </span>
            <p className="stack-name">{name}</p>
            <p className="stack-role">{role}</p>
            <p className="stack-note">{note}</p>
          </li>
        ))}
      </ul>

      <p className="stack-fineprint">
        A felsorolt nevek a tulajdonosaik védjegyei. Itt az általam használt technológiát jelölik —
        nem partnerséget vagy támogatást.
      </p>
    </section>
  );
}
