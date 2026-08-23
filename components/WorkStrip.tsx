import Image from "next/image";

/**
 * Elválasztó a `/munkak` heró és az első eset-tanulmány között.
 *
 * A heró 160px felső és ~130px alsó térközzel megy, alatta a case-study saját
 * térköze — együtt akkora üresség maradt, amit a látogató „vége az oldalnak"
 * jelzésként olvashat. Ez a sáv kitölti, és közben előrevetíti, mi jön: a hat
 * projekt bélyegképe lassan átúszik rajta.
 *
 * Dekoráció, ezért `aria-hidden` — minden projekt elérhető alatta linkként is.
 * A sor kétszer szerepel, így a ciklus varrat nélkül fut körbe.
 */

const SHOTS = [
  { src: "/work/checky.png", width: 2940, height: 1662 },
  { src: "/work/demos/veyra.webp", width: 1440, height: 900 },
  { src: "/work/demos/zamat.webp", width: 1440, height: 900 },
  { src: "/work/demos/budai-otthonok.webp", width: 1440, height: 900 },
  { src: "/work/demos/liget-borstudio.webp", width: 1440, height: 900 },
  { src: "/work/demos/varga-villany.webp", width: 1440, height: 900 }
];

export function WorkStrip() {
  return (
    <div aria-hidden="true" className="work-strip">
      <div className="work-strip-track">
        {[...SHOTS, ...SHOTS].map((shot, index) => (
          <span className="work-strip-cell" key={`${shot.src}-${index}`}>
            <Image alt="" height={shot.height} sizes="260px" src={shot.src} width={shot.width} />
          </span>
        ))}
      </div>
    </div>
  );
}
