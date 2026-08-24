"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { STUDIO_PHONE_LABEL, STUDIO_PHONE_TEL } from "@/lib/contact";

/**
 * A brief melletti gyors út: aki nem akar öt lépést kitölteni, ide ír egy
 * mondatot, és onnantól beszélgetés lesz belőle.
 *
 * Miért ÜZENET és nem email cím: egy puszta elérhetőségből a stúdió nem tudja,
 * mit akar a látogató, tehát vakon kellene visszahívnia. Előbb az derül ki,
 * hogy miért keres, és csak utána kérjük el, hogy hol érjük el — pontosan úgy,
 * ahogy a chat is csinálja (lásd `SupportWidget`, `draftStage`).
 *
 * Ezért nem is épül külön lead-rendszer alá: a küldés a MEGLÉVŐ chatet nyitja
 * meg a kész üzenettel (`projectedge:open-support`), tehát ugyanabba a
 * ticket-postaládába fut, ugyanazzal az email-értesítéssel és ugyanazzal a
 * folytatás-linkkel. A `source: "gyorssav"` csak annyit tesz, hogy az adminban
 * megkülönböztethető marad, honnan jött.
 */

/** A chipek a kitöltetlen mező ellen vannak: egy koppintás, és van üzenet.
    A `label` rövid, hogy elférjen; a `text` az, ami ténylegesen elmegy —
    mindegyik kérdéssel zárul, mert arra könnyebb válaszolni. */
const CHIPS = [
  {
    label: "Új oldal kell, nem tudom hol kezdjem",
    text: "Új weboldalt szeretnék, de nem tudom, hol kezdjem. Mit javasolsz?"
  },
  {
    label: "Van oldalam, de nem hoz megkeresést",
    text: "Van már weboldalam, de alig hoz megkeresést. Meg tudnád nézni, mi lehet a baj?"
  },
  {
    label: "Sürgős, hamarosan kellene",
    text: "Viszonylag sürgősen kellene egy weboldal. Mennyi idő alatt tudsz elindulni?"
  }
];

/** Egy karakter kiírásának ideje az írógép-effektben. */
const TYPE_MS = 16;

export function BriefQuickLane() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typeTimer = useRef<number | null>(null);

  /* ── A mező a tartalmához nő ──
     Egysoros mezőben a chipek mondata nem fért ki: a látogató csak a szöveg
     egy darabját látta abból, amit mindjárt elküld egy idegennek. A magasságot
     minden változásnál újraszámoljuk — előbb nullázni kell, különben a
     `scrollHeight` sosem tudna csökkenni, ha a szöveg rövidül.
     `useLayoutEffect`, hogy a festés előtt megtörténjen: így nincs egy képkocka
     rossz magassággal.

     A görgetés mentése-visszaállítása NEM óvatoskodás, hanem egy mért hiba
     javítása: a `scrollHeight` kiolvasása `height:auto` mellett kikényszerít
     egy layoutot, ilyenkor viszont a mező pillanatnyilag egy sorra esik össze.
     A böngésző görgetés-horgonyzása erre kompenzál, és mivel a magasságot
     rögtön vissza is állítjuk, a kompenzáció bent marad — leütésenként ~8
     pixellel húzta el a lapot a látogató alól. */
  useLayoutEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const anchor = window.scrollY;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
    if (window.scrollY !== anchor) window.scrollTo({ top: anchor, behavior: "instant" });
  }, [value]);

  /* Ha a komponens eltűnik (a kapu helyére belép a brief), a futó időzítő ne
     próbáljon egy leszerelt mezőbe írni. */
  useEffect(() => {
    return () => {
      if (typeTimer.current !== null) window.clearInterval(typeTimer.current);
    };
  }, []);

  function fillFromChip(chip: (typeof CHIPS)[number]) {
    trackEvent("quick_lane_chip", { chip: chip.label });
    if (typeTimer.current !== null) window.clearInterval(typeTimer.current);

    /* `preventScroll`: a látogató egy LÁTHATÓ chipre koppintott, tehát semmi
       nem indokolja, hogy a lap elugorjon alóla. A böngésző alapból a fókuszált
       mezőt középre görgetné. */
    inputRef.current?.focus({ preventScroll: true });

    /* Csökkentett mozgás mellett nincs gépelés-utánzat: ott a szöveg egyben
       jelenik meg. Az eredmény ugyanaz, csak nem animál. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(chip.text);
      return;
    }

    setTyping(true);
    setValue("");
    let index = 0;
    typeTimer.current = window.setInterval(() => {
      index += 1;
      setValue(chip.text.slice(0, index));
      if (index >= chip.text.length) {
        if (typeTimer.current !== null) window.clearInterval(typeTimer.current);
        typeTimer.current = null;
        setTyping(false);
      }
    }, TYPE_MS);
  }

  /* Enter küld, Shift+Enter új sort nyit — ugyanaz a megszokás, mint a
     chat írómezőjében (`SupportWidget`, `handleDraftKeyDown`). */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  function send() {
    const message = value.trim();
    if (!message) {
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    /* A gépelés-animációt leállítjuk, különben tovább írná a mezőt azután is,
       hogy az üzenet már elment a chatbe. */
    if (typeTimer.current !== null) {
      window.clearInterval(typeTimer.current);
      typeTimer.current = null;
      setTyping(false);
    }
    trackEvent("quick_lane_sent", { length: message.length });
    /* A mező szándékosan NEM ürül: ha a látogató mégis bezárja a chatet,
       itt marad, amit írt, és újraküldheti. Ismételt küldésnél a chat a már
       létező beszélgetést nyitja meg, tehát nem keletkezik két ticket. */
    window.dispatchEvent(
      new CustomEvent("projectedge:open-support", {
        detail: { intent: "contact", message, source: "gyorssav" }
      })
    );
  }

  return (
    <div className="quick-lane">
      <div className="quick-lane-or" role="separator">
        <span>vagy</span>
      </div>

      <p className="quick-lane-title">Inkább csak kérdeznél?</p>
      <p className="quick-lane-sub">
        Írd le egy mondatban, mire lenne szükséged — egy munkanapon belül válaszolok.
      </p>

      <div className="quick-lane-chips">
        {CHIPS.map((chip) => (
          <button className="quick-lane-chip" key={chip.label} onClick={() => fillFromChip(chip)} type="button">
            {chip.label}
          </button>
        ))}
      </div>

      <form
        className={`quick-lane-bar${focused ? " is-focused" : ""}${value ? " has-value" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <span aria-hidden="true" className="quick-lane-prompt">
          ›
        </span>
        <label className="sr-only" htmlFor="quick-lane-input">
          Mire lenne szükséged?
        </label>
        <textarea
          autoComplete="off"
          className="quick-lane-input"
          id="quick-lane-input"
          maxLength={500}
          onBlur={() => setFocused(false)}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Írd le egy mondatban…"
          ref={inputRef}
          rows={1}
          value={value}
        />
        {typing ? <span aria-hidden="true" className="quick-lane-caret" /> : null}
        <button aria-label="Küldés" className="quick-lane-send" disabled={!value.trim()} type="submit">
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
            <path d="M5 12h13" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </button>
      </form>

      <p className="quick-lane-foot">
        Vagy hívj: <a href={`tel:${STUDIO_PHONE_TEL}`}>{STUDIO_PHONE_LABEL}</a>
      </p>
    </div>
  );
}
