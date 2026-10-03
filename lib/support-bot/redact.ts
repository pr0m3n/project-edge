/**
 * Bankkártyaszám kitakarása a chatüzenetből, MIELŐTT eltároljuk vagy a
 * modellnek elküldjük.
 *
 * A látogatók néha beírják a kártyaszámukat („ezzel fizetnék"). Ez nem
 * kerülhet sem az adatbázisba, sem egy külső modellszolgáltatóhoz. A Luhn-
 * ellenőrzés miatt egy telefonszám vagy egy adószám nem esik áldozatul.
 */
const CARD_CANDIDATE = /\b(?:\d[ -]?){12,18}\d\b/g;

function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export const REDACTED_CARD = "[bankkártyaszám kitakarva]";

export function redactCardNumbers(text: string) {
  return text.replace(CARD_CANDIDATE, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits) ? REDACTED_CARD : match;
  });
}
