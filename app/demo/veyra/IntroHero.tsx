/**
 * A Veyra nyitóképe: előbb kimondja, mi a termék, és megmutatja, mit lát a
 * vendég a telefonján. A 3D-s hét csak utána jön, „hogyan működik"-ként.
 */

const DAYS = [
  { label: "H", date: 22, full: true },
  { label: "K", date: 23, full: false },
  { label: "SZE", date: 24, full: true },
  { label: "CS", date: 25, full: false, active: true },
  { label: "P", date: 26, full: false }
];

const SLOTS = [
  { time: "9:00", taken: true },
  { time: "10:30" },
  { time: "12:00", taken: true },
  { time: "14:00", active: true },
  { time: "15:30" },
  { time: "17:00", taken: true }
];

const POINTS = [
  ["Éjjel is foglalnak", "A nap 24 órájában, telefonálás nélkül."],
  ["Emlékeztető előző nap", "SMS-ben vagy emailben, a te szövegeddel."],
  ["Várólista lemondásra", "A felszabaduló időpont magától betelik."]
];

export function IntroHero({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="vy-intro-title" className="vy-intro">
      <div className="vy-intro-copy">
        <p className="vy-kicker">Online foglalás fodrász- és kozmetikai szalonoknak</p>
        <h1 id="vy-intro-title">A vendégeid maguk foglalnak időpontot. Te közben dolgozol.</h1>
        <p className="vy-intro-lead">
          A Veyra foglalási oldal és naptár egyben. A vendég a telefonján választ szolgáltatást és szabad időpontot, előző
          nap emlékeztetőt kap, és ha mégis lemondja, a várólistáról valaki a helyére lép.
        </p>
        <div className="vy-hero-actions">
          <button className="vy-primary" onClick={onStart} type="button">
            14 napig ingyen <span aria-hidden="true">↗</span>
          </button>
          <a className="vy-text-link" href="#egy-het">
            Hogyan működik? <span>↓</span>
          </a>
        </div>
        <ul className="vy-intro-points">
          {POINTS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div aria-label="Így foglal a vendég a telefonján" className="vy-intro-visual" role="img">
        <div aria-hidden="true" className="vy-book">
          <div className="vy-book-head">
            <span className="vy-book-avatar">GH</span>
            <div>
              <strong>Gréta Hair Studio</strong>
              <small>Szeged · online foglalás</small>
            </div>
          </div>

          <p className="vy-book-label">Szolgáltatás</p>
          <div className="vy-book-service">
            <div>
              <strong>Festés</strong>
              <small>2 óra · Gréta</small>
            </div>
            <b>18 900 Ft</b>
          </div>

          <p className="vy-book-label">Szeptember</p>
          <div className="vy-book-days">
            {DAYS.map((day) => (
              <span className={`${day.active ? "is-active" : ""}${day.full ? " is-full" : ""}`} key={day.date}>
                {day.label}
                <b>{day.date}</b>
              </span>
            ))}
          </div>

          <p className="vy-book-label">Szabad időpontok · csütörtök</p>
          <div className="vy-book-slots">
            {SLOTS.map((slot) => (
              <span className={`${slot.active ? "is-active" : ""}${slot.taken ? " is-taken" : ""}`} key={slot.time}>
                {slot.time}
              </span>
            ))}
          </div>

          <span className="vy-book-cta">Foglalás · CS 14:00</span>
        </div>

        <div aria-hidden="true" className="vy-book-toast">
          <small>Új foglalás · 23:47</small>
          <strong>Nóra · Hajvágás</strong>
          <span>Péntek 10:00</span>
        </div>
      </div>
    </section>
  );
}
