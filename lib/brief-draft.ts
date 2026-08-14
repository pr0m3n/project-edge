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
