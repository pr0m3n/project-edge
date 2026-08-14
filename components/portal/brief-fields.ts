/**
 * A projektindító adatlap (brief) mezőkészlete, címkéi és validációja.
 *
 * Tiszta adat és tiszta függvények — nincs benne React. Azért van külön,
 * mert a `ClientPortal.tsx` jelentős részét ez a statikus mezőleírás tette
 * ki, miközben egyetlen sora sem függ a komponens állapotától.
 */

import { subscriptionPlan } from "@/lib/subscriptions";
import type { BriefFormValues } from "@/lib/brief-draft";

export const briefSteps = [
  "Alapok",
  "Vágyott eredmény",
  "Oldalak és funkciók",
  "Vizuális irány",
  "Anyagok és hozzáférések",
  "Összegzés"
];

export const projectTypeOptions: Array<[string, string, string]> = [
  ["premium-business-site", "Prémium céges weboldal", "Bemutatkozás, bizalomépítés, ajánlatkérés."],
  ["redesign", "Meglévő oldal fejlesztése", "Van már alap, de jobb szerkezet és design kell."],
  ["web-app", "Webapp / admin rendszer", "Belépés, adatkezelés, dashboard, folyamatok."],
  ["client-portal", "Ügyfélkapu / dashboard", "Privát ügyfélfelület, státuszok, ticketek."],
  ["care-plan", "Karbantartás és növekedés", "Folyamatos javítás, mérés, fejlesztés."]
];

export const vibeOptions: Array<[string, string, string]> = [
  ["premium", "Prémium", "Nagy kontraszt, erős első benyomás, drágább érzet."],
  ["clean", "Letisztult", "Sok levegő, egyszerű döntések, gyors megértés."],
  ["bold", "Merész", "Nagy tipó, karakteres blokkok, emlékezetes oldal."],
  ["friendly", "Barátságos", "Közvetlenebb hang, puhább ritmus, könnyű kapcsolatfelvétel."]
];

export const paletteOptions: Array<[string, string, string[]]> = [
  ["edge", "ProjectEdge", ["#F5F5F5", "#76ABAE", "#303841", "#FF5722"]],
  ["mono", "Monokróm tech", ["#F7F7F2", "#D9E2DF", "#20242A", "#111111"]],
  ["warm", "Meleg prémium", ["#FFF7EF", "#E8C6A4", "#32302F", "#E6532E"]],
  ["fresh", "Friss SaaS", ["#F7FBF9", "#92D1C3", "#29353D", "#2F8F83"]],
  ["luxury", "Luxus sötét", ["#F4EFE7", "#C6A15B", "#1E2329", "#0E1116"]],
  ["editorial", "Editorial", ["#FAF7F0", "#D8D0C5", "#2F343B", "#B94D3A"]],
  ["electric", "Electric tech", ["#F8FAFF", "#8DE3FF", "#2630FF", "#111827"]],
  ["nature", "Organikus", ["#FAF8EF", "#BFD7B5", "#36594C", "#D96C3B"]],
  ["rose", "Rose premium", ["#FFF7F8", "#E8B4BC", "#332B31", "#C44569"]],
  ["blueprint", "Blueprint", ["#F3F8FF", "#9DB7D6", "#1D3557", "#457B9D"]],
  ["sunset", "Sunset", ["#FFF1E6", "#F7B267", "#2B2D42", "#F25C54"]],
  ["minimal", "Minimal fehér", ["#FFFFFF", "#E9ECEF", "#343A40", "#ADB5BD"]],
  ["custom", "Egyedi paletta", ["#F5F5F5", "#76ABAE", "#303841", "#FF5722"]]
];

// [tárolt érték, közelítő betűkészlet az előnézethez] — az előnézet rendszer-
// fontokkal közelít, mert a valódi webfontok csak a kész oldalon lesznek.
export const curatedFonts: Array<[string, string]> = [
  ["Modern groteszk (pl. Inter, Helvetica-szerű)", '"Helvetica Neue", Arial, sans-serif'],
  ["Elegáns serif (pl. Playfair, Georgia-szerű)", 'Georgia, "Times New Roman", serif'],
  ["Barátságos kerekded (pl. Poppins, Nunito-szerű)", '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif'],
  ["Klasszikus időtlen (pl. Garamond-szerű)", 'Garamond, "Palatino Linotype", serif'],
  ["Technikai monospace", '"Courier New", monospace'],
  ["Kézírásos / egyedi", '"Snell Roundhand", "Brush Script MT", cursive'],
  ["Nincs preferencia — bízom a stúdióra", "inherit"]
];

// Gyorsválasztó chipek a szabad szöveges mezőkhöz — a kiválasztás vesszős
// listaként ugyanabba a mezőbe íródik, így az adatszerkezet változatlan,
// és a szöveges finomítás is megmarad.
export const audienceChips = ["Helyi lakosok", "Magánszemélyek", "Cégek (B2B)", "Családok", "Fiatalok", "Turisták"];
export const pageChips = ["Főoldal", "Szolgáltatások", "Áraink", "Galéria", "Rólunk", "Kapcsolat", "Blog", "Gyakori kérdések"];
export const featureChips = [
  "Időpontfoglalás",
  "Kapcsolati űrlap",
  "Térkép",
  "Galéria",
  "Vélemények",
  "Hírlevél-feliratkozás",
  "Webshop",
  "Többnyelvű oldal"
];

export function splitListValue(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export function toggleListValue(current: string, item: string) {
  const parts = splitListValue(current);
  return parts.includes(item) ? parts.filter((part) => part !== item).join(", ") : [...parts, item].join(", ");
}

export function toggleLimitedListValue(current: string, item: string, limit: number) {
  const parts = splitListValue(current);
  if (parts.includes(item)) return parts.filter((part) => part !== item).join(", ");
  return parts.length >= limit ? current : [...parts, item].join(", ");
}

export const priorityLabels: Record<string, string> = {
  automation: "Automatizált folyamatok",
  conversion: "Több érdeklődő / jobb konverzió",
  quality: "Minőség és prémium megjelenés",
  scalable: "Később bővíthető rendszer",
  speed: "Gyors indulás"
};

export const hostingAccessLabels: Record<string, string> = {
  yes: "tud hozzáférést adni",
  later: "hozzáférés később",
  unknown: "nem tudja, hol van"
};

export const platformLabels: Record<string, string> = {
  wordpress: "WordPress",
  wix: "Wix / Squarespace",
  custom: "egyedi fejlesztés",
  other: "egyéb / nem tudja"
};

export const wpAccessLabels: Record<string, string> = {
  yes: "tud admin hozzáférést adni",
  no: "nincs hozzáférés, de a tartalmat elküldi"
};

/**
 * Logótervezési igény részletei.
 *
 * Eddig csak egy igen/nem volt, és az is kizárólag egyszeri projektnél — aki
 * bérelt és nem volt logója, sehol nem tudta jelezni, hogy szeretne egyet.
 * A típus és a színirány azért külön kérdés, mert a `brandColors` mező az
 * OLDAL színeire vonatkozik, ami nem feltétlenül azonos a logóéval.
 */
export const logoStyleOptions: Array<[string, string, string]> = [
  ["wordmark", "Csak szöveg", "A márkanév karakteres betűtípussal. Letisztult, jól működik kis méretben is."],
  ["symbol", "Jelkép + szöveg", "Egy egyszerű ábra a név mellett. Ez a leggyakoribb választás."],
  ["monogram", "Monogram", "A kezdőbetűkből épített jel. Hosszabb cégnévnél hasznos."],
  ["unsure", "Nem tudom, bízom rád", "Adok két irányt, és a tetszőt visszük tovább."]
];

export const logoColorSourceOptions: Array<[string, string]> = [
  ["brand", "A megadott márkaszínekből"],
  ["palette", "Az oldal színpalettájából"],
  ["custom", "Külön megadom lent"]
];

export const logoStyleLabels: Record<string, string> = Object.fromEntries(
  logoStyleOptions.map(([value, label]) => [value, label])
);

export const logoColorSourceLabels: Record<string, string> = Object.fromEntries(
  logoColorSourceOptions.map(([value, label]) => [value, label])
);

export const logoLabels: Record<string, string> = {
  yes: "van, feltöltve",
  no: "nincs logó",
  vector: "van, vektoros",
  raster: "van, csak képként",
  none: "nincs logó"
};

export const analyticsLabels: Record<string, string> = {
  yes: "van, tud hozzáférést adni",
  setup: "nincs, de szeretne mérést",
  no: "nincs / nem fontos"
};

/**
 * A brief emberi olvasásra szánt szöveges változata (`client_projects.goals`).
 *
 * FONTOS: ezt a beküldés ÉS a későbbi szerkesztés is ugyaninnen kapja. Korábban
 * két külön builder volt, és a szerkesztő csak 8 sort írt vissza — így az ügyfél
 * első módosításánál eltűnt a Domain, Logó, Szövegek, Kapcsolat és Számlázás sor
 * az admin nézetéből (ami ebből a szövegből parse-ol). Ha új brief mező készül,
 * elég itt felvenni.
 */
export function buildBriefText(form: BriefFormValues) {
  const vibe = vibeOptions.find(([value]) => value === form.vibe) ?? vibeOptions[0];
  const palette = paletteOptions.find(([value]) => value === form.palette) ?? paletteOptions[0];
  const customColors = [form.customBg, form.customAccent, form.customText, form.customCta];

  const domainLine = form.commercialModel === "subscription"
    ? ""
    : form.domainStatus === "have"
      ? `Domain: ${form.domainName || "saját domain"}${
          hostingAccessLabels[form.hostingAccess] ? ` (${hostingAccessLabels[form.hostingAccess]})` : ""
        }`
      : form.domainStatus === "need"
        ? "Domain: még nincs — segítséget kér a regisztrációhoz"
        : "";

  const platformLine =
    form.commercialModel === "purchase" && form.websiteStatus === "yes" && form.existingPlatform
      ? `Jelenlegi rendszer: ${platformLabels[form.existingPlatform] ?? form.existingPlatform}${
          form.existingPlatform === "wordpress" && wpAccessLabels[form.wpAccess] ? ` — ${wpAccessLabels[form.wpAccess]}` : ""
        }`
      : "";

  const logoLine = form.logoStatus
    ? `Logó: ${logoLabels[form.logoStatus]}${
        form.logoStatus === "no" && form.wantLogoDesign
          ? ` — ${form.wantLogoDesign === "yes" ? "logótervezést kér (extra)" : "egyelőre nem kér logótervezést"}`
          : ""
      }`
    : "";

  // Külön sorok, hogy az admin nézetben és az AI-promptban is önállóan
  // megjelenjenek — a `parseBrief` „Címke: érték" párokat olvas vissza.
  const logoDesignLines = form.logoStatus === "no" && form.wantLogoDesign === "yes"
    ? [
        form.logoStyle ? `Logó típusa: ${logoStyleLabels[form.logoStyle] ?? form.logoStyle}` : "",
        form.logoColorSource ? `Logó színei: ${logoColorSourceLabels[form.logoColorSource] ?? form.logoColorSource}` : "",
        form.logoBrief ? `Logó leírás: ${form.logoBrief}` : ""
      ].filter(Boolean)
    : [];

  const socialLines = [
    form.facebookUrl ? `Facebook: ${form.facebookUrl}` : "",
    form.instagramUrl ? `Instagram: ${form.instagramUrl}` : "",
    form.linkedinUrl ? `LinkedIn: ${form.linkedinUrl}` : "",
    form.tiktokUrl ? `TikTok: ${form.tiktokUrl}` : "",
    form.youtubeUrl ? `YouTube: ${form.youtubeUrl}` : "",
    form.otherSocialLinks ? `Egyéb linkek: ${form.otherSocialLinks}` : "",
    form.socialLinks ? `Korábbi közösségi linkek: ${form.socialLinks}` : ""
  ].filter(Boolean);

  return [
    `Konstrukció: ${form.commercialModel === "subscription" ? `Weboldal bérlése — ${subscriptionPlan(form.subscriptionPlan).name} csomag` : "Egyedi projekt — egyszeri fejlesztés"}`,
    `Cél: ${form.goals}`,
    form.audience ? `Célközönség / vásárlók: ${form.audience}` : "",
    form.primaryAction ? `Elsődleges látogatói művelet: ${form.primaryAction}` : "",
    form.pages ? `Fontos oldalak: ${form.pages}` : "",
    form.features ? `Kért funkciók: ${form.features}` : "",
    form.style ? `Stílus / hangulat: ${form.style}` : "",
    `Vizuális karakter: ${vibe[1]}`,
    `Színirány: ${palette[1]}${form.palette === "custom" ? ` (${customColors.join(", ")})` : ""}`,
    `Prioritás: ${splitListValue(form.priority).map((value) => priorityLabels[value] ?? value).join(", ")}`,
    domainLine,
    form.commercialModel === "subscription" && form.domainName ? `Kiválasztott domain: ${form.domainName}` : "",
    platformLine,
    logoLine,
    ...logoDesignLines,
    form.brandColors ? `Márkaszín: ${form.brandColors}` : "",
    form.fontPreference ? `Betűtípus: ${form.fontPreference}` : "",
    `Szövegek: ${form.contentSource === "client" ? "az ügyfél adja" : "stúdió írja (benne az árban)"}`,
    form.contentBrief ? `Cégbemutató a szövegíráshoz: ${form.contentBrief}` : "",
    form.contentFileUrls.length ? `Feltöltött szöveges anyagok: ${form.contentFileUrls.length} db` : "",
    form.photoSource ? `Képek: ${form.photoSource === "own" ? "saját képek" : "stock / segítség kell"}` : "",
    form.photoUrls.length ? `Feltöltött képek: ${form.photoUrls.length} db` : "",
    form.contactEmail ? `Kapcsolati email: ${form.contactEmail}` : "",
    form.contactPhone ? `Telefon: ${form.contactPhone}` : "",
    socialLines.length ? `Közösségi linkek:\n${socialLines.join("\n")}` : "",
    analyticsLabels[form.analyticsAccess] ? `Analytics: ${analyticsLabels[form.analyticsAccess]}` : "",
    form.billingDetails ? `Számlázási adatok: ${form.billingDetails}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * A wizard step csak akkor engedhető tovább, ha az adott képernyőn minden
 * döntési blokkhoz érkezett legalább egy válasz vagy használható információ.
 * A feltételes mezőket csak akkor ellenőrizzük, amikor tényleg megjelennek.
 */
export function validateProjectStep(step: number, form: BriefFormValues): string | null {
  if (step === 0) {
    if (form.commercialModel === "purchase" && form.title.trim().length < 2) return "Add meg a projekt nevét legalább 2 karakterrel.";
    if (form.company.trim().length < 2) return "Add meg a cég vagy márka nevét legalább 2 karakterrel.";
    if (form.commercialModel === "purchase" && !splitListValue(form.projectType).length) return "Válassz legalább egy projekt típust.";
    if (form.commercialModel === "purchase" && !form.websiteStatus) return "Jelöld, hogy van-e már weboldalad.";
    if (form.commercialModel === "purchase" && form.websiteStatus === "yes" && !form.website.trim()) return "Add meg a meglévő weboldal címét.";
  }

  if (step === 1) {
    if (form.goals.trim().length < 10) return "Írd le legalább egy rövid mondatban, mit szeretnél elérni az oldallal.";
    if (form.audience.trim().length < 5) return "Írd le legalább néhány szóval, kiknek készül az oldal.";
    if (form.commercialModel === "subscription" && !form.primaryAction.trim()) return "Válaszd ki, mi legyen a weboldal elsődleges művelete.";
    if (form.commercialModel === "purchase" && !splitListValue(form.priority).length) return "Válassz legalább egy vágyott eredményt.";
  }

  if (step === 2) {
    if (form.pages.trim().length < 3) return "Adj meg legalább egy fontos oldalt.";
    if (form.features.trim().length < 3) return "Adj meg legalább egy kért funkciót, vagy írd azt, hogy „nincs”.";
    if (form.commercialModel === "purchase" && !form.budget) return "Válassz költségkeretet, vagy jelöld, hogy még nem tudod.";
  }

  if (step === 3) {
    if (!form.vibe) return "Válassz vizuális hangulatot.";
    if (!form.palette) return "Válassz színirányt.";
  }

  if (step === 4) {
    if (form.commercialModel === "subscription" && !form.domainName.trim()) return "Keress és válassz ki egy előzetesen elérhető domainnevet.";
    if (form.commercialModel === "purchase" && !form.domainStatus) return "Válaszd ki, hogy van-e már domained.";
    if (form.commercialModel === "purchase" && form.domainStatus === "have" && !form.domainName.trim()) return "Add meg a meglévő domain nevét.";
    if (form.commercialModel === "purchase" && form.domainStatus === "have" && !form.hostingAccess) return "Válaszd ki, hogyan lesz elérhető a tárhely/domain hozzáférés.";
    if (form.commercialModel === "purchase" && form.websiteStatus === "yes" && !form.existingPlatform) return "Válaszd ki, milyen rendszerben fut a jelenlegi weboldal.";
    if (form.commercialModel === "purchase" && form.websiteStatus === "yes" && form.existingPlatform === "wordpress" && !form.wpAccess) return "Válaszd ki, tudsz-e WordPress hozzáférést adni.";
    if (!form.logoStatus) return "Válaszd ki, van-e már logód.";
    if (form.logoStatus === "yes" && !form.logoUrl) return "Töltsd fel a logót, vagy válaszd a nincs logóm lehetőséget.";
    if (form.logoStatus === "no" && !form.wantLogoDesign) return "Válaszd ki, kérsz-e logótervezést.";
    if (form.logoStatus === "no" && form.wantLogoDesign === "yes" && !form.logoStyle) return "Válaszd ki, milyen típusú logót szeretnél.";
    if (!form.brandColors.trim()) return "Adj meg legalább egy márkaszínt, vagy írd azt, hogy: rátok bízom.";
    if (!form.fontPreference.trim()) return "Válassz betűtípus-stílust, vagy válaszd a nincs preferencia lehetőséget.";
    if (!form.contentSource) return "Válaszd ki, ki írja a szövegeket.";
    if (form.contentSource === "studio" && form.contentBrief.trim().length < 30) return "Mutasd be röviden a céget, hogy hiteles szöveget tudjunk írni.";
    if (form.contentSource === "client" && form.contentBrief.trim().length < 30 && form.contentFileUrls.length === 0) return "Írj be vagy tölts fel legalább egy használható szöveges anyagot.";
    if (!form.photoSource) return "Válaszd ki, honnan lesznek a képek.";
    if (form.photoSource === "own" && form.photoUrls.length === 0) return "Tölts fel legalább egy saját képet.";
    if (!form.contactEmail.trim() && !form.contactPhone.trim()) return "Adj meg legalább egy kapcsolati email címet vagy telefonszámot.";
    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) return "Adj meg érvényes kapcsolati email címet.";
    if (form.contactPhone.trim() && form.contactPhone.replace(/\D/g, "").length < 7) return "Adj meg érvényes telefonszámot.";
    if (form.commercialModel === "purchase" && form.websiteStatus === "yes" && !form.analyticsAccess) return "Válaszd ki, hogyan kezeljük a régi oldal mérését.";
    if (!form.billingDetails.trim()) return "Add meg a számlázási adatokat, vagy írd azt, hogy: magánszemély.";
  }

  return null;
}

export function validationTargetFor(message: string) {
  const targets: Array<[RegExp, string]> = [
    [/projekt nevét/i, "project-title"],
    [/cég vagy márka/i, "project-company"],
    [/projekt típust/i, "project-types"],
    [/van-e már weboldalad/i, "website-status"],
    [/weboldal címét/i, "project-website"],
    [/mit szeretnél elérni/i, "project-goals"],
    [/kiknek készül/i, "project-audience"],
    [/elsődleges művelet/i, "primary-action"],
    [/vágyott eredményt|prioritást/i, "project-priorities"],
    [/fontos oldalt/i, "project-pages"],
    [/kért funkciót/i, "project-features"],
    [/költségkeretet/i, "project-budget"],
    [/vizuális hangulatot/i, "project-vibe"],
    [/színirányt/i, "project-palette"],
    [/domained/i, "domain-status"],
    [/domain nevét/i, "domain-name"],
    [/tárhely|domain hozzáférés/i, "hosting-access"],
    [/milyen rendszerben/i, "existing-platform"],
    [/WordPress hozzáférést/i, "wp-access"],
    [/van-e már logód/i, "logo-status"],
    [/Töltsd fel a logót/i, "logo-upload"],
    [/logótervezést|típusú logót/i, "logo-design"],
    [/márkaszínt/i, "brand-colors"],
    [/betűtípus/i, "font-preference"],
    [/ki írja a szövegeket/i, "content-source"],
    [/Mutasd be röviden/i, "content-brief"],
    [/szöveges anyagot/i, "content-client-material"],
    [/honnan lesznek a képek/i, "photo-source"],
    [/saját képet/i, "photo-upload"],
    [/kapcsolati email|telefonszámot/i, "contact-details"],
    [/régi oldal mérését/i, "analytics-access"],
    [/számlázási adatokat/i, "billing-details"]
  ];
  return targets.find(([pattern]) => pattern.test(message))?.[1] ?? "";
}


export function paletteByName(name?: string) {
  return paletteOptions.find(([, label]) => label === name)?.[2] ?? paletteOptions[0][2];
}
