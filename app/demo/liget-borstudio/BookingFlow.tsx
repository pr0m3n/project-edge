"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Treatment } from "./TreatmentPicker";

/**
 * Háromlépcsős időpontfoglalás.
 *
 * Korábban egyetlen hosszú űrlap volt, minden mező egyszerre. Itt egyszerre egy
 * kérdés áll a képernyőn, fölötte vékony haladásjelzővel, és a kiválasztott
 * kezelés fotója végig ott marad — így a folyamat közben sem veszik el, hogy
 * miről is van szó.
 */

const DAYS = ["H 10.", "K 11.", "SZE 12.", "CS 13.", "P 14."];
const SLOTS = ["09:30", "11:00", "13:30", "16:00", "17:30"];
const SPECIALISTS = ["Bori", "Kata", "Bárki, aki ráér"];

type Props = {
  onClose: () => void;
  onFinish: (summary: string) => void;
  startIndex: number;
  treatments: Treatment[];
};

export function BookingFlow({ onClose, onFinish, startIndex, treatments }: Props) {
  const [step, setStep] = useState(0);
  const [treatment, setTreatment] = useState(startIndex);
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState("13:30");
  const [specialist, setSpecialist] = useState(SPECIALISTS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  /* Escape-re zárjon, és amíg nyitva van, ne görögjön mögötte a lap. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const chosen = treatments[treatment];
  const ready = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  return (
    <div className="noma-modal-shade" onClick={onClose} role="presentation">
      <div
        aria-label="Időpontfoglalás"
        aria-modal="true"
        className="noma-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Bezárás" className="noma-close" onClick={onClose} type="button">
          ×
        </button>

        <aside className="noma-modal-aside">
          <Image
            alt={chosen.alt}
            fill
            sizes="(max-width: 900px) 100vw, 320px"
            src={chosen.image}
          />
          <div className="noma-modal-aside-copy">
            <p>Kiválasztva</p>
            <strong>{chosen.name}</strong>
            <span>
              {chosen.time} · {chosen.price}
            </span>
          </div>
        </aside>

        <div className="noma-modal-main">
          <div className="noma-steps">
            {["Kezelés", "Időpont", "Elérhetőség"].map((label, index) => (
              <span className={index <= step ? "on" : ""} key={label}>
                {label}
              </span>
            ))}
          </div>

          {step === 0 && (
            <div className="noma-step">
              <h3>Melyik kezelést szeretnéd?</h3>
              <div className="noma-choices">
                {treatments.map((item, index) => (
                  <button
                    className={treatment === index ? "on" : ""}
                    key={item.name}
                    onClick={() => setTreatment(index)}
                    type="button"
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {item.time} · {item.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="noma-step">
              <h3>Mikor jó neked?</h3>
              <div className="noma-pills">
                {DAYS.map((item, index) => (
                  <button
                    className={day === index ? "on" : ""}
                    key={item}
                    onClick={() => setDay(index)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="noma-pills">
                {SLOTS.map((item) => (
                  <button
                    className={slot === item ? "on" : ""}
                    key={item}
                    onClick={() => setSlot(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="noma-step-note">Novemberi szabad időpontok. Lemondás 24 órán belül díjmentes.</p>
            </div>
          )}

          {step === 2 && (
            <div className="noma-step">
              <h3>Kihez és hova írjunk?</h3>
              <div className="noma-pills">
                {SPECIALISTS.map((item) => (
                  <button
                    className={specialist === item ? "on" : ""}
                    key={item}
                    onClick={() => setSpecialist(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="noma-fields">
                <label>
                  <span>Neved</span>
                  <input onChange={(event) => setName(event.target.value)} value={name} />
                </label>
                <label>
                  <span>E-mail-címed</span>
                  <input
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="noma-modal-foot">
            <p className="noma-modal-summary">
              {chosen.name} · {DAYS[day]} {slot} · {specialist}
            </p>
            <div className="noma-modal-actions">
              {step > 0 && (
                <button className="noma-btn ghost" onClick={() => setStep(step - 1)} type="button">
                  Vissza
                </button>
              )}
              {step < 2 ? (
                <button className="noma-btn" onClick={() => setStep(step + 1)} type="button">
                  Tovább
                </button>
              ) : (
                <button
                  className="noma-btn"
                  disabled={!ready}
                  onClick={() =>
                    onFinish(`${chosen.name} · ${DAYS[day]} ${slot} · ${specialist}`)
                  }
                  type="button"
                >
                  Foglalás megerősítése
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
