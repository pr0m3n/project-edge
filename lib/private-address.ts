import { isIP } from "node:net";

/**
 * Privát, belső vagy fenntartott IP-cím-e.
 *
 * A mérés szerveroldalon fut, tehát ha a cél egy belső cím (a felhő metaadat-
 * szolgáltatása, localhost, magánhálózat), a kérés a MI infrastruktúránkon
 * belülre menne — ez az SSRF. A címet az ügyfél nem írhatja (046), de a
 * védelem itt is kell: egy domain DNS-e bármikor belső címre mutathat.
 */
export function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127
      || (a === 100 && b >= 64 && b <= 127)   // CGNAT
      || (a === 169 && b === 254)             // link-local, felhő metaadat
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;                            // multicast és fenntartott
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return lower === "::" || lower === "::1"
      || lower.startsWith("fc") || lower.startsWith("fd")   // ULA
      || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") // link-local
      || lower.startsWith("ff");                            // multicast
  }
  return true;
}
