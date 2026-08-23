import type { CommercialModel, SubscriptionPlanKey } from "@/lib/subscriptions";

export const PUBLIC_BRIEF_DRAFT_KEY = "projectedge-public-brief-v1";

export const initialBriefForm = {
  commercialModel: "subscription" as CommercialModel,
  subscriptionPlan: "business" as SubscriptionPlanKey,
  audience: "",
  budget: "",
  company: "",
  features: "",
  goals: "",
  pages: "",
  palette: "",
  projectType: "",
  priority: "",
  primaryAction: "",
  style: "",
  title: "",
  vibe: "",
  website: "",
  websiteStatus: "",
  domainStatus: "",
  domainName: "",
  domainIdeas: "",
  domainProofUrl: "",
  domainPurchaseState: "",
  hostingAccess: "",
  existingPlatform: "",
  wpAccess: "",
  logoStatus: "",
  wantLogoDesign: "",
  /** Csak akkor tölt be szerepet, ha `wantLogoDesign === "yes"`. */
  logoStyle: "",
  logoColorSource: "",
  logoBrief: "",
  brandColors: "",
  fontPreference: "",
  contentSource: "",
  contentBrief: "",
  contentFileUrls: [] as string[],
  photoSource: "",
  photoUrls: [] as string[],
  socialLinks: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  otherSocialLinks: "",
  contactEmail: "",
  contactPhone: "",
  analyticsAccess: "",
  billingDetails: "",
  customBg: "#F5F5F5",
  customAccent: "#76ABAE",
  customText: "#303841",
  customCta: "#FF5722",
  logoUrl: ""
};

export type BriefFormValues = typeof initialBriefForm;

export type PublicBriefDraft = {
  data: BriefFormValues;
  savedAt: string;
  step: number;
  version: 1;
};

export function readPublicBriefDraft(raw: string | null): PublicBriefDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PublicBriefDraft>;
    if (parsed.version !== 1 || !parsed.data || typeof parsed.data !== "object") return null;
    return {
      data: { ...initialBriefForm, ...parsed.data },
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      step: typeof parsed.step === "number" ? Math.max(0, Math.min(4, parsed.step)) : 0,
      version: 1
    };
  } catch {
    return null;
  }
}

/**
 * Félbehagyott projektindító adatlap — a `brief_drafts` tábla egy sora
 * (035-ös migráció).
 *
 * Miért kell szerveren is: a piszkozat eddig csak a böngésző localStorage-ában
 * élt, tehát aki elkezdte és elnavigált, arról a rendszer nem tudott. Így nem
 * lehetett emlékeztetőt küldeni neki, és az admin sem látta, melyik lépésnél
 * morzsolódnak le az érdeklődők.
 */
export type BriefDraftRow = {
  user_id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  company: string | null;
  commercial_model: string | null;
  subscription_plan: string | null;
  step: number;
  step_count: number;
  data: Partial<BriefFormValues> | null;
  submitted_at: string | null;
  reminder_sent_at: string | null;
};

/**
 * Üres-e a piszkozat. Egy érintetlen űrlapot nem mentünk el a szerverre és nem
 * is emlékeztetünk rá — az nem félbehagyott kitöltés, csak egy megnyitott oldal.
 */
export function isBlankBriefDraft(form: Partial<BriefFormValues>) {
  return !(
    form.company?.trim() ||
    form.title?.trim() ||
    form.goals?.trim() ||
    form.audience?.trim() ||
    form.contentBrief?.trim() ||
    form.pages?.trim() ||
    form.features?.trim()
  );
}

/** Hány százalékig jutott — az admin listán és az emlékeztető levélben ez jelenik meg. */
export function briefDraftProgress(step: number, stepCount: number) {
  if (stepCount <= 0) return 0;
  return Math.round(((Math.max(0, step) + 1) / stepCount) * 100);
}
