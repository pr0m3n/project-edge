"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A pakli egy képe, ami betöltéskor beúszik, nem „beteleportál".
 *
 * Gyors görgetésnél (főleg mobilneten) a szakasz előbb ér a képernyőre,
 * mint a képek: a kártyák keretei már álltak, aztán a képek egyenként,
 * átmenet nélkül ugrottak be. Most a még úton lévő kép átlátszó, a
 * kártyán töltés-csillanás fut, és megérkezéskor halványan beúszik.
 *
 * A `data-fade` CSAK hidratálás után kerül fel: a szerver-HTML-ben a kép
 * látható, így JS nélkül (vagy lassú JS-nél) sem marad üres a pakli, és
 * nincs hidratálási eltérés. A hidratálás előtt már betöltött kép azonnal
 * „in" állapotba kerül, tehát nem tűnik el, hogy újra beússzon.
 */
export function DeckImage(props: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"wait" | "in" | undefined>(undefined);

  useEffect(() => {
    const img = ref.current;
    setState(img?.complete && img.naturalWidth > 0 ? "in" : "wait");
  }, []);

  return (
    <Image
      {...props}
      alt={props.alt}
      data-fade={state}
      // Hibánál se maradjon láthatatlan: a kártya háttere áll a helyén.
      onError={() => setState("in")}
      onLoad={() => setState("in")}
      ref={ref}
    />
  );
}
