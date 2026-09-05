"use client";

import { useEffect, useRef } from "react";

/**
 * A három vállalás görgetésre kibomló változata.
 *
 * A korábbi felállás három egyforma idézetkártya volt egymás mellett: a
 * látogató egy pillantással letudta, és görgetett tovább. Itt a szakasz magas,
 * a panel odaragad a képernyőhöz, és a görgetés VISZI a tartalmat — egyszerre
 * egy vállalás áll a nézetben, a szavai pedig sorban gyúlnak ki.
 *
 * MIÉRT NEM ÁLLAPOTBÓL MEGY: a görgetés képkockánként szól, és minden
 * `setState` újrarajzoltatná a teljes szakaszt. Itt a görgetés csak osztályokat
 * kapcsolgat a már meglévő elemeken, és csak akkor, ha tényleg változott
 * valami. A React egyszer rendereli le a szakaszt, utána nem nyúlunk hozzá.
 *
 * TELEFONON ÉS CSÖKKENTETT MOZGÁS MELLETT NEM RAGAD. A ragadós, görgetést
 * elnyelő szakasz kis kijelzőn kifejezetten rossz: a látogató azt hiszi,
 * megakadt az oldal. Ilyenkor a `is-static` osztály visszaadja a sima,
 * egymás alatti listát, minden szó kigyújtva.
 */

export type Pledge = {
  quote: string;
  name: string;
  role: string;
};

export function PledgeScroll({ pledges }: { pledges: Pledge[] }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  /* A hatáslistában nem az elemszám áll, hanem a TARTALOM ujjlenyomata: a
     görgetéskezelő egyszer szedi össze a DOM-elemeket, és ha a szövegek
     változnának azonos darabszám mellett, régi elemekre mutatna tovább. */
  const signature = pledges.map((pledge) => pledge.name).join("|");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || pledges.length === 0) return;

    /* Csak a csökkentett mozgás kapcsolja ki. Telefonon ELŐSZÖR ki volt zárva,
       mert a görgetést elnyelő szakasz kis kijelzőn könnyen tűnik akadásnak —
       de üresen sokkal rosszabb volt: ott maradt a régi, mozdulatlan lista.
       Helyette a görgetési út rövidebb telefonon (lásd a CSS-t), így nem lehet
       beleragadni. */
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let onScreen = true;
    let lastStep = -1;
    let lastLit = -1;
    /* Statikus (telefonos / csökkentett mozgás) módban a szakasz BE VAN
       FAGYASZTVA: minden szó ki van gyújtva, és semmi nem írhatja felül. E
       nélkül a láthatóság-megfigyelő vagy egy már beütemezett képkocka
       visszakapcsolná az „egy panel aktív" állapotot. */
    let frozen = false;

    const panels = Array.from(section.querySelectorAll<HTMLElement>(".pledge-panel"));
    const marks = Array.from(section.querySelectorAll<HTMLElement>(".pledge-mark"));
    const words = panels.map((panel) => Array.from(panel.querySelectorAll<HTMLElement>(".pledge-word")));

    const lightAll = () => {
      words.forEach((set) => set.forEach((word) => word.classList.add("is-lit")));
      panels.forEach((panel) => panel.classList.add("is-active"));
      marks.forEach((mark) => mark.classList.add("is-active"));
    };

    const apply = () => {
      if (frozen) return;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;

      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      const step = Math.min(pledges.length - 1, Math.floor(progress * pledges.length));

      /* A lépésen belüli haladás. Az 1.45-ös szorzó azért kell, hogy a szöveg
         a lépés kétharmadánál már teljesen kint legyen — különben az utolsó
         szó pont akkor gyulladna ki, amikor a panel már úszik kifelé. */
      const inner = Math.min(1, (progress * pledges.length - step) * 1.45);
      const lit = Math.round(inner * words[step].length);

      if (step !== lastStep) {
        panels.forEach((panel, index) => panel.classList.toggle("is-active", index === step));
        marks.forEach((mark, index) => mark.classList.toggle("is-active", index === step));
        /* A magunk mögött hagyott panelek szövege maradjon kigyújtva: ha
           visszagörgetsz, ne épüljön újra. */
        words.forEach((set, index) => {
          if (index < step) set.forEach((word) => word.classList.add("is-lit"));
        });
        lastStep = step;
        lastLit = -1;
      }

      if (lit !== lastLit) {
        words[step].forEach((word, index) => word.classList.toggle("is-lit", index < lit));
        lastLit = lit;
      }

      section.style.setProperty("--pledge-progress", progress.toFixed(4));
    };

    const tick = () => {
      frame = 0;
      if (onScreen) apply();
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const settle = () => {
      if (still.matches) {
        frozen = true;
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        section.classList.add("is-static");
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        lightAll();
        return;
      }
      frozen = false;
      section.classList.remove("is-static");
      lastStep = -1;
      lastLit = -1;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      apply();
    };

    /* Amíg a szakasz nincs a nézetben, a görgetés nem számol semmit. */
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) apply();
      },
      { rootMargin: "100px" }
    );
    observer.observe(section);

    settle();
    still.addEventListener("change", settle);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      still.removeEventListener("change", settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [signature, pledges.length]);

  return (
    <div
      className="pledge-scroll"
      ref={sectionRef}
      style={{ ["--pledge-count" as string]: pledges.length }}
    >
      <div className="pledge-sticky">
        <div className="pledge-head">
          <p className="micro-label">Így dolgozom</p>
          <h2>Három vállalásom minden projektnél.</h2>
          <ol className="pledge-marks">
            {pledges.map((pledge, index) => (
              <li className="pledge-mark" key={pledge.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{pledge.name}</b>
              </li>
            ))}
          </ol>
        </div>

        <div className="pledge-stage">
          {pledges.map((pledge, index) => (
            <article className="pledge-panel" key={pledge.name}>
              <span className="pledge-n">{String(index + 1).padStart(2, "0")}</span>
              <p className="pledge-quote">
                {pledge.quote.split(" ").map((word, wordIndex) => (
                  <span className="pledge-word" key={`${word}-${wordIndex}`}>
                    {word}{" "}
                  </span>
                ))}
              </p>
              <p className="pledge-meta">
                <b>{pledge.name}</b>
                <span>{pledge.role}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
