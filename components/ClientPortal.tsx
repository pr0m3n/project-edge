"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  useToasts,
  ToastStack,
  useConfirm,
  Skeleton,
  useOnline,
  OfflineBanner,
  type ToastKind
} from "@/components/ui/feedback";
import { ProjectTurnGuide, isClientTurn } from "@/components/portal/ProjectTurnGuide";
import { ProjectSwitcher } from "@/components/portal/ProjectSwitcher";
import { BriefPanel } from "@/components/portal/BriefPanel";
import { OfferPanel } from "@/components/portal/OfferPanel";
import { ContractPanel } from "@/components/portal/ContractPanel";
import { DepositPaymentPanel } from "@/components/portal/DepositPaymentPanel";
import { BuildProgressPanel } from "@/components/portal/BuildProgressPanel";
import { ReviewFeedbackPanel } from "@/components/portal/ReviewFeedbackPanel";
import { LaunchedPanel } from "@/components/portal/LaunchedPanel";
import { ClosedProjectCard } from "@/components/portal/ClosedProjectCard";

function noticeKind(message: string): ToastKind {
  if (/nem sikerült|hiba|sikertelen|nem lehet|nincs aktív/i.test(message)) {
    return "error";
  }
  if (
    /sikeres|elfogadva|elmentett|elküldt|elküldve|mentve|kész|köszön|rögzítve|létrejött|létrehoz|megnyitva|frissítve|megváltozott|törölve|aláírva|rendezve/i.test(
      message
    )
  ) {
    return "success";
  }
  return "info";
}

export type Project = {
  id: string;
  contact_email: string | null;
  contact_name: string | null;
  title: string;
  company: string | null;
  website: string | null;
  project_type: string;
  budget: string | null;
  goals: string;
  status: string;
  next_step: string | null;
  created_at: string;
  offer_title: string | null;
  offer_summary: string | null;
  offer_scope: string | null;
  offer_timeline: string | null;
  offer_deliverables: string | null;
  offer_price: number | null;
  offer_currency: string | null;
  offer_note: string | null;
  offer_status: string | null;
  offer_sent_at: string | null;
  client_decision_note: string | null;
  brief_data: {
    title?: string;
    company?: string;
    website?: string;
    projectType?: string;
    goals?: string;
    audience?: string;
    priority?: string;
    pages?: string;
    features?: string;
    budget?: string;
    vibe?: string;
    palette?: string;
    style?: string;
    customBg?: string;
    customAccent?: string;
    customText?: string;
    customCta?: string;
  } | null;
  last_modified_at: string | null;
  last_modified_by: string | null;
  last_modified_by_name: string | null;
  delete_requested: boolean;
  delete_requested_at: string | null;
  status_before_delete_request: string | null;
  deposit_amount: number | null;
  payment_status: "unpaid" | "deposit_paid" | "fully_paid";
  contract_accepted: boolean;
  contract_accepted_at: string | null;
  milestones: Array<{ title: string; done: boolean }> | null;
  feedback_round: number;
  feedback_notes: string | null;
  handover_checklist: Array<{ title: string; done: boolean }> | null;
  maintenance_option: string | null;
  client_rating: number | null;
  client_review: string | null;
  reference_permitted: boolean;
  staging_url: string | null;
  final_payment_paid: boolean;
  final_payment_paid_at: string | null;
  estimated_deadline: string | null;
  logo_url: string | null;
};

type Ticket = {
  id: string;
  project_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  subject: string;
  status: string;
  rating: number | null;
  rating_comment: string | null;
  last_message_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender: "customer" | "admin";
  body: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  request_received: "Igény beérkezett",
  planning: "Tervezés",
  offer_sent: "Ajánlat elküldve",
  deposit_pending: "Foglaló fizetésre vár",
  contract_pending: "Szerződés aláírásra vár",
  in_progress: "Kivitelezés",
  review: "Átnézés",
  launched: "Élesítve",
  paused: "Szünetel",
  closed: "Lezárva",
  deletion_pending: "Törlés jóváhagyásra vár",
  open: "Nyitott",
  answered: "Megválaszolva"
};

const initialProject = {
  audience: "",
  budget: "not-sure",
  company: "",
  features: "",
  goals: "",
  pages: "",
  palette: "edge",
  projectType: "premium-business-site",
  priority: "quality",
  style: "",
  title: "",
  vibe: "premium",
  website: "",
  // Anyagok és hozzáférések (5. lépés)
  domainStatus: "",
  domainName: "",
  hostingAccess: "",
  existingPlatform: "",
  wpAccess: "",
  logoStatus: "",
  wantLogoDesign: "",
  brandColors: "",
  fontPreference: "",
  contentSource: "studio",
  photoSource: "",
  socialLinks: "",
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

export type BriefFormValues = typeof initialProject;

const initialTicket = {
  body: "",
  projectId: "",
  subject: ""
};

const projectFlow = [
  ["request_received", "Brief"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
  ["contract_pending", "Szerződés"],
  ["deposit_pending", "Foglaló"],
  ["in_progress", "Építés"],
  ["review", "Átnézés"],
  ["launched", "Élesítés"]
];

const briefSteps = [
  "Alapok",
  "Vágyott eredmény",
  "Oldalak és funkciók",
  "Vizuális irány",
  "Anyagok és hozzáférések",
  "Összegzés"
];

const projectTypeOptions: Array<[string, string, string]> = [
  ["premium-business-site", "Prémium céges weboldal", "Bemutatkozás, bizalomépítés, ajánlatkérés."],
  ["redesign", "Meglévő oldal fejlesztése", "Van már alap, de jobb szerkezet és design kell."],
  ["web-app", "Webapp / admin rendszer", "Belépés, adatkezelés, dashboard, folyamatok."],
  ["client-portal", "Ügyfélkapu / dashboard", "Privát ügyfélfelület, státuszok, ticketek."],
  ["care-plan", "Karbantartás és növekedés", "Folyamatos javítás, mérés, fejlesztés."]
];

const vibeOptions: Array<[string, string, string]> = [
  ["premium", "Prémium", "Nagy kontraszt, erős első benyomás, drágább érzet."],
  ["clean", "Letisztult", "Sok levegő, egyszerű döntések, gyors megértés."],
  ["bold", "Merész", "Nagy tipó, karakteres blokkok, emlékezetes oldal."],
  ["friendly", "Barátságos", "Közvetlenebb hang, puhább ritmus, könnyű kapcsolatfelvétel."]
];

const paletteOptions: Array<[string, string, string[]]> = [
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
const curatedFonts: Array<[string, string]> = [
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
const audienceChips = ["Helyi lakosok", "Magánszemélyek", "Cégek (B2B)", "Családok", "Fiatalok", "Turisták"];
const pageChips = ["Főoldal", "Szolgáltatások", "Áraink", "Galéria", "Rólunk", "Kapcsolat", "Blog", "Gyakori kérdések"];
const featureChips = [
  "Időpontfoglalás",
  "Kapcsolati űrlap",
  "Térkép",
  "Galéria",
  "Vélemények",
  "Hírlevél-feliratkozás",
  "Webshop",
  "Többnyelvű oldal"
];

function splitListValue(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function toggleListValue(current: string, item: string) {
  const parts = splitListValue(current);
  return parts.includes(item) ? parts.filter((part) => part !== item).join(", ") : [...parts, item].join(", ");
}

const priorityLabels: Record<string, string> = {
  automation: "Automatizált folyamatok",
  conversion: "Több érdeklődő / jobb konverzió",
  quality: "Minőség és prémium megjelenés",
  scalable: "Később bővíthető rendszer",
  speed: "Gyors indulás"
};

const hostingAccessLabels: Record<string, string> = {
  yes: "tud hozzáférést adni",
  later: "hozzáférés később",
  unknown: "nem tudja, hol van"
};

const platformLabels: Record<string, string> = {
  wordpress: "WordPress",
  wix: "Wix / Squarespace",
  custom: "egyedi fejlesztés",
  other: "egyéb / nem tudja"
};

const wpAccessLabels: Record<string, string> = {
  yes: "tud admin hozzáférést adni",
  no: "nincs hozzáférés, de a tartalmat elküldi"
};

const logoLabels: Record<string, string> = {
  vector: "van, vektoros",
  raster: "van, csak képként",
  none: "nincs logó"
};

const analyticsLabels: Record<string, string> = {
  yes: "van, tud hozzáférést adni",
  setup: "nincs, de szeretne mérést",
  no: "nincs / nem fontos"
};

export function escHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function splitLines(value: string | null) {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatPrice(value: number | null, currency = "Ft") {
  if (!value) {
    return "Egyeztetés alapján";
  }

  return `${new Intl.NumberFormat("hu-HU").format(value)} ${currency}`;
}

export function hasOffer(project: Project) {
  return project.offer_status === "sent" || Boolean(project.offer_title || project.offer_price || project.offer_summary);
}

export function parseBrief(value: string | null) {
  const pairs = splitLines(value).map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return ["Megjegyzés", line] as const;
    }

    return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()] as const;
  });

  return Object.fromEntries(pairs) as Record<string, string>;
}

export function paletteByName(name?: string) {
  return paletteOptions.find(([, label]) => label === name)?.[2] ?? paletteOptions[0][2];
}

function printDomainGuide(companyName?: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const heading = companyName ? `${escHtml(companyName)} — domain-vásárlási útmutató` : "Domain-vásárlási útmutató";
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${heading}</title>` +
    `<style>body{font-family:sans-serif;padding:40px;color:#333;line-height:1.6;max-width:720px;margin:0 auto}h1{color:#111;font-size:26px}h2{color:#111;font-size:18px;margin-top:32px}ul{padding-left:20px}li{margin-bottom:6px}.note{color:#666;font-size:13px}</style></head>` +
    `<body>` +
    `<h1>${heading}</h1>` +
    `<p>Ez az útmutató lépésről lépésre végigvezet azon, hogyan szerezz saját domaint (weboldal-címet) a vállalkozásodnak.</p>` +
    `<h2>1. Mi az a domain, és miért kell?</h2>` +
    `<p>A domain a weboldalad internetes címe, pl. <strong>vallalkozasod.hu</strong>. Ez a te tulajdonod — akkor is a tiéd marad, ha később fejlesztőt váltasz.</p>` +
    `<h2>2. Hogyan válassz domain nevet?</h2>` +
    `<ul>` +
    `<li>Legyen rövid, könnyen megjegyezhető és kimondható.</li>` +
    `<li>Lehetőleg <strong>.hu</strong> vagy <strong>.com</strong> végződés.</li>` +
    `<li>Kerüld a kötőjeleket és számokat, ha nem feltétlenül szükséges.</li>` +
    `<li>Érdemes leellenőrizni, hogy a név nem ütközik-e védjeggyel.</li>` +
    `</ul>` +
    `<h2>3. Hol regisztrálhatod?</h2>` +
    `<p>Bármelyik akkreditált, .hu domain regisztrálására jogosult szolgáltatónál regisztrálhatsz. Azt, hogy egy .hu domain név szabad-e, a hivatalos nyilvántartó (a domain.hu oldal, amit az ISZT — Internet Szolgáltatók Tanácsa üzemeltet) oldalán tudod ellenőrizni.</p>` +
    `<h2>4. Mennyibe kerül? <span class="note">(tájékoztató jellegű, szolgáltatónként és évenként változhat)</span></h2>` +
    `<ul>` +
    `<li>.hu domain: nagyságrendileg 2000–5000 Ft / év</li>` +
    `<li>.com domain: nagyságrendileg 3000–6000 Ft / év</li>` +
    `</ul>` +
    `<h2>5. A regisztráció lépései</h2>` +
    `<ol>` +
    `<li>Döntsd el a domain nevet.</li>` +
    `<li>Ellenőrizd, hogy szabad-e.</li>` +
    `<li>Válassz egy szolgáltatót, és regisztráld.</li>` +
    `<li>A tulajdonos adatainál a <strong>saját</strong> (nem a fejlesztő) adataidat add meg.</li>` +
    `<li>Fizesd ki a regisztrációt.</li>` +
    `<li>Oszd meg velünk a hozzáférést / DNS-beállítási jogot, hogy rá tudjuk kötni a weboldalt.</li>` +
    `</ol>` +
    `<h2>6. Mi az a DNS, egyszerűen?</h2>` +
    `<p>A DNS olyan, mint egy telefonkönyv: megmondja a böngészőnek, melyik szerveren található a weboldalad. Ezt a beállítást, amint megvan a domained, mi elvégezzük.</p>` +
    `<h2>7. Gyakori hibák</h2>` +
    `<ul>` +
    `<li>Ne a fejlesztő nevére regisztráltasd a domaint — legyen mindig a sajátod.</li>` +
    `<li>Ne felejtsd el a megújítást — sokan elveszítik a domainjüket lejárat miatt.</li>` +
    `<li>Ne vásárolj felesleges extra domaineket "csak biztos, ami biztos" alapon.</li>` +
    `</ul>` +
    `<p class="note">Ha bármiben elakadsz, írj nekünk üzenetet az ügyfélkapun — szívesen segítünk.</p>` +
    `</body></html>`
  );
  win.document.close();
}

type ClientPortalProps = {
  view?: "auth" | "dashboard";
};

export function ClientPortal({ view = "auth" }: ClientPortalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [consentChecked, setConsentChecked] = useState(false);
  // The dashboard has exactly two top-level destinations (the current project,
  // or the new-brief wizard) plus small icon-triggered slide-over panels for
  // secondary things (notifications, messages, account) — replaces the old
  // 6-tab layout, which repeated the same status info 2-3 times before any
  // real content appeared.
  const [homeView, setHomeView] = useState<"project" | "new-brief">("project");
  const [openPanel, setOpenPanel] = useState<"notifications" | "support" | "account" | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [authForm, setAuthForm] = useState({ email: "", name: "", password: "" });
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [projectForm, setProjectForm] = useState(initialProject);
  const [projectStep, setProjectStep] = useState(0);
  const [projectSubmitted, setProjectSubmitted] = useState(false);
  const [submittedProjectTitle, setSubmittedProjectTitle] = useState("");
  const [ticketForm, setTicketForm] = useState(initialTicket);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [reply, setReply] = useState("");
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketRatingComment, setTicketRatingComment] = useState("");
  const [notice, setNotice] = useState("");
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);

  // New state variables for upgraded project lifecycle flow
  const [editingBriefProjectId, setEditingBriefProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(initialProject);
  const [showStripeModalProjectId, setShowStripeModalProjectId] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState<"deposit" | "final">("deposit");
  const [stripeForm, setStripeForm] = useState({ card: "", exp: "", cvc: "", name: "" });
  const [stripeError, setStripeError] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [contractChecked, setContractChecked] = useState(false);
  const [feedbackRoundNote, setFeedbackRoundNote] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: "", reference: false });
  const [modificationRequestText, setModificationRequestText] = useState("");
  const [showModificationRequestProjectId, setShowModificationRequestProjectId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [customFontOpen, setCustomFontOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [supportThreadOpen, setSupportThreadOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { toasts, pushToast, dismissToast } = useToasts();
  const { confirm, confirmModal } = useConfirm();
  const online = useOnline();

  // Mirror logged-in (dashboard) notices into transient toasts. Auth screens
  // keep their inline form-status message. Transient "...folyamatban" notices
  // (ending with "...") are skipped to avoid double toasts.
  useEffect(() => {
    if (!userId || !notice || notice.endsWith("...")) {
      return;
    }
    pushToast(notice, noticeKind(notice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice, userId]);

  // Brief draft persistence: keep the half-filled wizard across reloads so an
  // interrupted brief is never lost. Cleared on successful submit.
  const draftKey = userId ? `pe-brief-draft-${userId}` : "";
  const draftRestored = useMemo(() => ({ done: false }), [userId]);

  useEffect(() => {
    if (!draftKey || draftRestored.done || projectSubmitted) return;
    draftRestored.done = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setProjectForm((current) => ({ ...current, ...parsed }));
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || projectSubmitted) return;
    const isEmpty = JSON.stringify(projectForm) === JSON.stringify(initialProject);
    try {
      if (isEmpty) {
        window.localStorage.removeItem(draftKey);
      } else {
        window.localStorage.setItem(draftKey, JSON.stringify(projectForm));
      }
    } catch {
      /* storage unavailable (private mode) — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectForm, draftKey, projectSubmitted]);

  async function triggerNotification(
    targetUserId: string | null,
    targetEmail: string | null,
    title: string,
    message: string,
    link: string
  ) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          userId: targetUserId,
          email: targetEmail,
          title,
          message,
          link
        })
      });
    } catch (err) {
      console.error("Nem sikerült elküldeni a rendszer értesítést:", err);
    }
  }

  // Notification `link` values are historical DB data — old rows already
  // saved with #statuses/#projects/#support/#account/#notifications hashes
  // (from the old 6-tab layout) must keep resolving correctly indefinitely,
  // even though those tabs no longer exist as such.
  async function markNotificationAsRead(id: string, link?: string | null) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (link) {
      if (link.includes("#projects")) {
        setOpenPanel(null);
        setHomeView("new-brief");
      } else if (link.includes("#support")) {
        setOpenPanel("support");
      } else if (link.includes("#account")) {
        setOpenPanel("account");
      } else if (link.includes("#notifications")) {
        setOpenPanel("notifications");
      } else {
        setOpenPanel(null);
        setHomeView("project");
      }
    }
  }

  async function markAllNotificationsAsRead() {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function deleteReadNotifications() {
    if (!userId) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("read", true);

    if (error) {
      setNotice("Nem sikerült törölni az értesítéseket.");
      return;
    }
    setNotifications((current) => current.filter((n) => !n.read));
  }

  async function updateProfileName(e: FormEvent) {
    e.preventDefault();
    if (!profileName.trim()) {
      setNotice("A név nem lehet üres.");
      return;
    }
    setNotice("Módosítás...");
    const { error: profileError } = await supabase
      .from("client_profiles")
      .update({ full_name: profileName.trim(), updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (profileError) {
      setNotice(`Nem sikerült a név frissítése: ${profileError.message}`);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: profileName.trim() }
    });
    if (authError) {
      setNotice(`Név frissítve az adatbázisban, de a munkamenetben nem: ${authError.message}`);
    } else {
      setNotice("Profilnév sikeresen frissítve!");
    }
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setNotice("A jelszónak legalább 6 karakterből kell állnia.");
      return;
    }
    setNotice("Módosítás...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setNotice(`Jelszócsere sikertelen: ${error.message}`);
    } else {
      setNewPassword("");
      setNotice("A jelszavad sikeresen megváltozott!");
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    if (deleteConfirmText !== "TÖRLÉS") {
      setNotice("Kérjük, írd be a 'TÖRLÉS' szót a megerősítéshez.");
      return;
    }
    setNotice("Fiók törlése folyamatban...");
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setNotice("Nincs aktív munkamenet.");
      return;
    }
    try {
      const res = await fetch("/api/delete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setNotice("Fiókod sikeresen törölve lett. Kijelentkeztetés...");
        await triggerNotification(
          null,
          "admin@projectedge.hu",
          "Fiók törölve",
          `Az ügyfél (${email}) véglegesen törölte a fiókját a rendszerből.`,
          "/admin"
        );
        setTimeout(() => {
          supabase.auth.signOut().then(() => {
            window.location.href = "/ugyfelkapu";
          });
        }, 1500);
      } else {
        setNotice(`Sikertelen törlés: ${resData.error || "Ismeretlen hiba"}`);
      }
    } catch (err: any) {
      setNotice(`Hiba történt a törlés során: ${err.message}`);
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Visszaállító link küldése...");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/ugyfelkapu/dashboard?reset=true`
    });
    if (error) {
      setNotice(`Hiba: ${error.message}`);
    } else {
      setNotice("A jelszóvisszaállító linket elküldtük az email címedre!");
      setForgotPasswordEmail("");
    }
  }

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) ?? tickets[0],
    [activeTicketId, tickets]
  );

  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;

  const activeProjects = useMemo(() => projects.filter((p) => p.status !== "closed"), [projects]);
  const closedProjects = useMemo(() => projects.filter((p) => p.status === "closed"), [projects]);

  // Default selection: prefer a project where the client actually has
  // something to do, then the most recently touched one, then just the
  // first — over the old "newest by created_at" rule, which could hide an
  // urgent older project behind a brand-new one.
  const defaultProjectId = useMemo(() => {
    const clientTurn = activeProjects.find((p) => isClientTurn(p));
    if (clientTurn) return clientTurn.id;
    const byRecency = [...activeProjects].sort((a, b) => {
      const aTime = new Date(a.last_modified_at || a.created_at).getTime();
      const bTime = new Date(b.last_modified_at || b.created_at).getTime();
      return bTime - aTime;
    });
    return byRecency[0]?.id ?? "";
  }, [activeProjects]);

  const selectedProject =
    activeProjects.find((p) => p.id === selectedProjectId) ?? activeProjects.find((p) => p.id === defaultProjectId) ?? activeProjects[0];

  const selectedProjectType = projectTypeOptions.find(([value]) => value === projectForm.projectType) ?? projectTypeOptions[0];
  const selectedVibe = vibeOptions.find(([value]) => value === projectForm.vibe) ?? vibeOptions[0];
  const selectedPalette = paletteOptions.find(([value]) => value === projectForm.palette) ?? paletteOptions[0];
  const activePaletteColors =
    projectForm.palette === "custom"
      ? [projectForm.customBg, projectForm.customAccent, projectForm.customText, projectForm.customCta]
      : selectedPalette[2];
  const briefProgress = Math.round(((projectStep + 1) / briefSteps.length) * 100);

  useEffect(() => {
    // Check if recovery link is used
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("type=recovery") || search.includes("reset=true")) {
        setOpenPanel("account");
        setNotice("Kérjük, állíts be egy új jelszót a 'Jelszó módosítása' résznél.");
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) {
        if (view === "dashboard") {
          window.location.href = "/ugyfelkapu";
          return;
        }

        setLoading(false);
        return;
      }

      setUserId(sessionUser.id);
      setEmail(sessionUser.email ?? "");
      if (view === "auth") {
        window.location.href = "/ugyfelkapu/dashboard";
        return;
      }

      loadPortal(false, sessionUser.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUserId(sessionUser?.id ?? "");
      setEmail(sessionUser?.email ?? "");
      if (sessionUser) {
        if (view === "auth") {
          window.location.href = "/ugyfelkapu/dashboard";
          return;
        }

        loadPortal(false, sessionUser.id);
      } else {
        setProjects([]);
        setTickets([]);
        setMessages({});
        if (view === "dashboard") {
          window.location.href = "/ugyfelkapu";
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [view]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`client-portal-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "client_projects"
        },
        () => loadPortal(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "client_tickets"
        },
        () => loadPortal(true)
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_ticket_messages"
        },
        (payload) => {
          const nextMessage = payload.new as TicketMessage & { user_id?: string };
          setMessages((current) => {
            const ticketMessages = current[nextMessage.ticket_id] ?? [];
            if (ticketMessages.some((item) => item.id === nextMessage.id)) {
              return current;
            }

            return {
              ...current,
              [nextMessage.ticket_id]: [...ticketMessages, nextMessage]
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "notifications"
        },
        () => loadPortal(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadPortal(silent = false, uid?: string) {
    if (!silent) {
      setLoading(true);
    }

    const resolvedUid = uid ?? userId;
    const [
      { data: projectData, error: projectError },
      { data: ticketData, error: ticketError },
      { data: profileData },
      { data: notificationData }
    ] = await Promise.all([
      supabase.from("client_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("client_tickets").select("*").order("last_message_at", { ascending: false }),
      resolvedUid
        ? supabase.from("client_profiles").select("full_name").eq("id", resolvedUid).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)
    ]);

    if (projectError || ticketError) {
      setNotice("Nem sikerült betölteni az ügyfélkaput. Próbáld frissíteni az oldalt, vagy írj nekünk, ha nem sikerül.");
      setLoading(false);
      return;
    }

    const ticketIds = (ticketData ?? []).map((ticket) => ticket.id);
    const { data: messageData, error: messageError } = ticketIds.length
      ? await supabase
          .from("client_ticket_messages")
          .select("*")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (messageError) {
      setNotice("Az üzenet-előzményeket nem sikerült betölteni.");
      setLoading(false);
      return;
    }

    const grouped = (messageData ?? []).reduce<Record<string, TicketMessage[]>>((result, item) => {
      result[item.ticket_id] = [...(result[item.ticket_id] ?? []), item];
      return result;
    }, {});

    setProjects(projectData ?? []);
    setTickets(ticketData ?? []);
    setMessages(grouped);
    setProfileName(profileData?.full_name ?? "");
    setNotifications(notificationData ?? []);
    setActiveTicketId((current) => current || ticketData?.[0]?.id || "");
    setLoading(false);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(mode === "login" ? "Beléptetés..." : "Fiók létrehozása...");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password
      });

      if (error) {
        setNotice("Nem sikerült belépni. Ellenőrizd az emailt és a jelszót.");
        return;
      }
      window.location.href = "/ugyfelkapu/dashboard";
      return;
    }

    if (!consentChecked) {
      setNotice("A regisztrációhoz el kell fogadnod az Adatkezelési tájékoztatót és az ÁSZF-et.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: {
        data: {
          full_name: authForm.name || authForm.email
        },
        emailRedirectTo: `${window.location.origin}/ugyfelkapu/dashboard`
      }
    });

    if (error) {
      setNotice(`Nem sikerült létrehozni a fiókot: ${error.message}`);
      return;
    }

    if (data.user) {
      await supabase.from("client_profiles").upsert({
        email: authForm.email,
        full_name: authForm.name || authForm.email,
        id: data.user.id
      });
    }

    if (data.session) {
      window.location.href = "/ugyfelkapu/dashboard";
      return;
    }

    setCanResendConfirmation(true);
    setNotice("Fiók kész. Hamarosan kaphatsz egy megerősítő emailt — nézd meg a Spam/Promóciók mappát is, ha nem találod.");
  }

  async function resendConfirmation() {
    if (!authForm.email) {
      setNotice("Írd be az email címedet, és újraküldöm a megerősítést.");
      return;
    }

    setNotice("Megerősítő email újraküldése...");
    const { error } = await supabase.auth.resend({
      email: authForm.email,
      options: {
        emailRedirectTo: `${window.location.origin}/ugyfelkapu/dashboard`
      },
      type: "signup"
    });

    if (error) {
      setNotice("Nem sikerült újraküldeni. Próbáld pár perc múlva újra, vagy írj nekünk, ha nem sikerül.");
      return;
    }

    setNotice("Elküldtem újra a megerősítő emailt. Nézd meg a Spam/Promóciók mappát is.");
  }

  async function uploadLogo(file: File) {
    if (!userId) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setNotice("Csak PNG, JPG, SVG vagy PDF fájlt lehet feltölteni.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("A fájl mérete legfeljebb 5 MB lehet.");
      return;
    }

    setLogoUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("client-logos").upload(path, file);
    if (uploadError) {
      setLogoUploading(false);
      setNotice("Nem sikerült feltölteni a logót. Lehet, hogy a Storage még nincs beállítva — próbáld újra később.");
      return;
    }

    const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
    setProjectForm((current) => ({ ...current, logoUrl: data.publicUrl }));
    setLogoUploading(false);
    setNotice("Logó sikeresen feltöltve.");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    if (!projectForm.title.trim()) {
      setProjectStep(0);
      setNotice("Adj nevet a projektnek, hogy el tudjam menteni.");
      return;
    }

    if (!projectForm.goals.trim()) {
      setProjectStep(1);
      setNotice("Írd le röviden, mit szeretnél elérni az oldallal.");
      return;
    }

    setNotice("Projekt mentése...");

    const domainLine = projectForm.domainStatus === "have"
      ? `Domain: ${projectForm.domainName || "saját domain"}${hostingAccessLabels[projectForm.hostingAccess] ? ` (${hostingAccessLabels[projectForm.hostingAccess]})` : ""}`
      : projectForm.domainStatus === "need"
        ? "Domain: még nincs — segítséget kér a regisztrációhoz"
        : "";
    const platformLine = projectForm.website.trim() && projectForm.existingPlatform
      ? `Jelenlegi rendszer: ${platformLabels[projectForm.existingPlatform] ?? projectForm.existingPlatform}${projectForm.existingPlatform === "wordpress" && wpAccessLabels[projectForm.wpAccess] ? ` — ${wpAccessLabels[projectForm.wpAccess]}` : ""}`
      : "";
    const logoLine = projectForm.logoStatus
      ? `Logó: ${logoLabels[projectForm.logoStatus]}${projectForm.logoStatus === "none" && projectForm.wantLogoDesign ? ` — ${projectForm.wantLogoDesign === "yes" ? "logótervezést kér (extra)" : "egyelőre nem kér logótervezést"}` : ""}`
      : "";

    const detailedGoals = [
      `Cél: ${projectForm.goals}`,
      projectForm.audience ? `Célközönség / vásárlók: ${projectForm.audience}` : "",
      projectForm.pages ? `Fontos oldalak: ${projectForm.pages}` : "",
      projectForm.features ? `Kért funkciók: ${projectForm.features}` : "",
      projectForm.style ? `Stílus / hangulat: ${projectForm.style}` : "",
      `Vizuális karakter: ${selectedVibe[1]}`,
      `Színirány: ${selectedPalette[1]}${projectForm.palette === "custom" ? ` (${activePaletteColors.join(", ")})` : ""}`,
      `Prioritás: ${priorityLabels[projectForm.priority] ?? projectForm.priority}`,
      domainLine,
      platformLine,
      logoLine,
      projectForm.brandColors ? `Márkaszín: ${projectForm.brandColors}` : "",
      projectForm.fontPreference ? `Betűtípus: ${projectForm.fontPreference}` : "",
      `Szövegek: ${projectForm.contentSource === "client" ? "az ügyfél adja" : "stúdió írja (benne az árban)"}`,
      projectForm.photoSource ? `Képek: ${projectForm.photoSource === "own" ? "saját képek" : "stock / segítség kell"}` : "",
      projectForm.contactEmail ? `Kapcsolati email: ${projectForm.contactEmail}` : "",
      projectForm.contactPhone ? `Telefon: ${projectForm.contactPhone}` : "",
      projectForm.socialLinks ? `Közösségi linkek: ${projectForm.socialLinks}` : "",
      analyticsLabels[projectForm.analyticsAccess] ? `Analytics: ${analyticsLabels[projectForm.analyticsAccess]}` : "",
      projectForm.billingDetails ? `Számlázási adatok: ${projectForm.billingDetails}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase.from("client_projects").insert({
      budget: projectForm.budget,
      company: projectForm.company || null,
      contact_email: email,
      contact_name: profileName || email,
      goals: detailedGoals,
      project_type: projectForm.projectType,
      title: projectForm.title,
      user_id: userId,
      website: projectForm.website || null,
      brief_data: projectForm,
      // logo_url mező csak a 011-es migráció után létezik — csak akkor
      // küldjük, ha tényleg van feltöltött logó (ami maga is csak a
      // migráció lefuttatása után lehetséges), így addig nem töri el a
      // sima projekt-beküldést azoknál, akik nem töltenek fel logót.
      ...(projectForm.logoUrl ? { logo_url: projectForm.logoUrl } : {})
    });

    if (error) {
      setNotice("Nem sikerült elindítani a projektet.");
      return;
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Új projekt brief",
      `Új projekt brief érkezett: "${projectForm.title}" az ügyféltől (${email}).`,
      "/admin"
    );

    await triggerNotification(
      userId,
      email,
      "Brief sikeresen beküldve",
      `A(z) "${projectForm.title}" projekt briefét sikeresen rögzítettük. Az adminisztrátor hamarosan elkészíti az ajánlatot.`,
      "/ugyfelkapu/dashboard#projects"
    );

    try {
      if (draftKey) window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setProjectForm(initialProject);
    setProjectSubmitted(true);
    setSubmittedProjectTitle(projectForm.title);
    setNotice("Elmentettük és elküldtük a tervet. Hamarosan jelentkezünk a következő lépésekkel.");
    loadPortal(true);
  }

  function startEditingBrief(project: Project) {
    setEditingBriefProjectId(project.id);
    if (project.brief_data) {
      setEditForm({
        ...initialProject,
        ...project.brief_data,
        title: project.title,
        company: project.company || "",
        website: project.website || "",
        budget: project.budget || "not-sure",
        projectType: project.project_type
      });
    } else {
      const brief = parseBrief(project.goals);
      setEditForm({
        ...initialProject,
        audience: brief["Célközönség"] || brief["Célközönség / vásárlók"] || "",
        budget: project.budget || "not-sure",
        company: project.company || "",
        features: brief["Funkciók"] || brief["Kért funkciók"] || "",
        goals: brief["Cél"] || project.goals || "",
        pages: brief["Oldalak"] || brief["Fontos oldalak"] || "",
        palette: paletteOptions.find(([, label]) => label === brief["Színirány"])?.[0] || "edge",
        projectType: project.project_type,
        priority: Object.keys(priorityLabels).find(k => priorityLabels[k] === brief["Prioritás"]) || "quality",
        style: brief["Stílus"] || brief["Stílus / hangulat"] || "",
        title: project.title,
        vibe: vibeOptions.find(([, label]) => label === brief["Vizuális karakter"])?.[0] || "premium",
        website: project.website || ""
      });
    }
  }

  async function saveBriefEdits(event: FormEvent<HTMLFormElement>, project: Project) {
    event.preventDefault();
    setNotice("Brief módosítások mentése...");
    
    const selVibe = vibeOptions.find(([v]) => v === editForm.vibe) ?? vibeOptions[0];
    const selPalette = paletteOptions.find(([v]) => v === editForm.palette) ?? paletteOptions[0];
    
    const newDetailedGoals = [
      `Cél: ${editForm.goals}`,
      editForm.audience ? `Célközönség / vásárlók: ${editForm.audience}` : "",
      editForm.pages ? `Fontos oldalak: ${editForm.pages}` : "",
      editForm.features ? `Kért funkciók: ${editForm.features}` : "",
      editForm.style ? `Stílus / hangulat: ${editForm.style}` : "",
      `Vizuális karakter: ${selVibe[1]}`,
      `Színirány: ${selPalette[1]}${editForm.palette === "custom" ? ` (${[editForm.customBg, editForm.customAccent, editForm.customText, editForm.customCta].join(", ")})` : ""}`,
      `Prioritás: ${priorityLabels[editForm.priority] ?? editForm.priority}`
    ]
      .filter(Boolean)
      .join("\n\n");

    const logs: Array<{
      project_id: string;
      changed_by: string;
      changed_by_name: string;
      field_name: string;
      old_value: string;
      new_value: string;
    }> = [];

    function checkDiff(label: string, oldVal: string | null | undefined, newVal: string | null | undefined) {
      const o = (oldVal ?? "").trim();
      const n = (newVal ?? "").trim();
      if (o !== n) {
        logs.push({
          project_id: project.id,
          changed_by: userId,
          changed_by_name: email,
          field_name: label,
          old_value: o || "(üres)",
          new_value: n || "(üres)"
        });
      }
    }

    const oldBrief = project.brief_data || {};
    checkDiff("Projekt címe", project.title, editForm.title);
    checkDiff("Cégnév", project.company, editForm.company);
    checkDiff("Weboldal", project.website, editForm.website);
    checkDiff("Projekt típusa", project.project_type, editForm.projectType);
    checkDiff("Büdzsé", project.budget, editForm.budget);
    checkDiff("Célok", oldBrief.goals || parseBrief(project.goals)["Cél"] || project.goals, editForm.goals);
    checkDiff("Célközönség", oldBrief.audience || parseBrief(project.goals)["Célközönség"], editForm.audience);
    checkDiff("Funkciók", oldBrief.features || parseBrief(project.goals)["Funkciók"], editForm.features);
    checkDiff("Oldalak", oldBrief.pages || parseBrief(project.goals)["Oldalak"], editForm.pages);
    checkDiff("Stílus", oldBrief.style || parseBrief(project.goals)["Stílus"], editForm.style);
    checkDiff("Színirány", oldBrief.palette, editForm.palette);
    checkDiff("Vizuális karakter", oldBrief.vibe, editForm.vibe);
    checkDiff("Prioritás", oldBrief.priority, editForm.priority);

    const { error } = await supabase.from("client_projects").update({
      title: editForm.title,
      company: editForm.company || null,
      website: editForm.website || null,
      project_type: editForm.projectType,
      budget: editForm.budget,
      goals: newDetailedGoals,
      brief_data: editForm,
      last_modified_at: new Date().toISOString(),
      last_modified_by: userId,
      last_modified_by_name: email
    }).eq("id", project.id);

    if (error) {
      setNotice("Nem sikerült elmenteni a brief módosításokat.");
      return;
    }

    if (logs.length > 0) {
      await supabase.from("project_change_logs").insert(logs);
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Brief módosítva",
      `Az ügyfél (${email}) módosította a briefet a(z) "${project.title}" projektben. Változások száma: ${logs.length}.`,
      "/admin"
    );

    await triggerNotification(
      userId,
      email,
      "Brief módosítva",
      `Sikeresen elmentetted a brief módosításokat a(z) "${editForm.title}" projektben.`,
      "/ugyfelkapu/dashboard#projects"
    );

    setEditingBriefProjectId(null);
    setNotice("Brief sikeresen módosítva.");
    loadPortal(true);
  }

  async function acceptOffer(project: Project) {
    setNotice("Ajánlat elfogadása...");
    // Fix, alacsony foglaló — a cél a komoly érdeklődők szűrése, nem a
    // kockázat fedezése (azt az adja, hogy csak teljes kifizetés után adjuk
    // át a kész oldalt, lásd LaunchedPanel).
    const deposit = 10000;
    const { error } = await supabase.from("client_projects").update({
      status: "contract_pending",
      deposit_amount: deposit,
      payment_status: "unpaid",
      offer_status: "accepted",
      next_step: "Ajánlat elfogadva. Kérlek, olvasd el és írd alá a vállalkozási szerződést."
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült elfogadni az ajánlatot.");
    } else {
      setNotice("Ajánlat elfogadva. Következő lépés: a szerződés aláírása.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Ajánlat elfogadva",
        `Az ügyfél (${email}) elfogadta a(z) "${project.title}" projekt ajánlatát. Szerződés aláírásra vár.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Ajánlat elfogadva",
        `Elfogadtad a(z) "${project.title}" projekt ajánlatát. Következő lépésként olvasd el és írd alá a szerződést.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function requestOfferChanges(project: Project, note: string) {
    if (!note.trim()) return;
    setNotice("Módosítási kérés küldése...");
    const { error } = await supabase.from("client_projects").update({
      status: "planning",
      offer_status: "draft",
      client_decision_note: note,
      next_step: "Módosítási kérést küldtél. Az adminisztrátor átdolgozza az ajánlatot."
    }).eq("id", project.id);

    if (error) {
      setNotice("Nem sikerült elküldeni a módosítási kérést.");
      return;
    }

    // Automatically open a support ticket for this request
    await supabase.from("client_tickets").insert({
      user_id: userId,
      project_id: project.id,
      contact_name: profileName || email,
      contact_email: email,
      subject: `${project.title} - Ajánlat módosítási igény`
    }).select().single().then(async ({ data: ticket }) => {
      if (ticket) {
        await supabase.from("client_ticket_messages").insert({
          ticket_id: ticket.id,
          user_id: userId,
          sender: "customer",
          body: `Módosítási kérés az ajánlathoz:\n${note}`
        });
      }
    });

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Ajánlat módosítási kérelem",
      `Az ügyfél (${email}) módosításokat kért a(z) "${project.title}" projekt ajánlatához.`,
      "/admin"
    );

    await triggerNotification(
      userId,
      email,
      "Ajánlat módosítási igény elküldve",
      `A(z) "${project.title}" projekt ajánlat módosítási kérését elküldtük az adminisztrátornak.`,
      "/ugyfelkapu/dashboard#statuses"
    );

    setShowModificationRequestProjectId(null);
    setModificationRequestText("");
    setNotice("Módosítási kérés rögzítve.");
    loadPortal(true);
  }

  async function declineOffer(project: Project) {
    const ok = await confirm({
      title: "Biztosan elutasítod az ajánlatot?",
      message: "Ezzel a projekt lezárul. A döntés később már nem visszavonható az ügyfélkapun keresztül.",
      confirmLabel: "Igen, elutasítom",
      cancelLabel: "Mégse",
      danger: true
    });
    if (!ok) return;
    setNotice("Ajánlat elutasítása...");
    const { error } = await supabase.from("client_projects").update({
      status: "closed",
      offer_status: "declined",
      next_step: "Ajánlat elutasítva. A projekt lezárult."
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült elutasítani az ajánlatot.");
    } else {
      setNotice("Ajánlat elutasítva.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Ajánlat elutasítva",
        `Az ügyfél (${email}) elutasította a(z) "${project.title}" projekt ajánlatát.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Ajánlat elutasítva",
        `Elutasítottad a(z) "${project.title}" projekt ajánlatát.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function payDeposit(project: Project) {
    setStripeLoading(true);
    setStripeError("");
    
    if (!stripeForm.card.trim() || !stripeForm.exp.trim() || !stripeForm.cvc.trim() || !stripeForm.name.trim()) {
      setStripeError("Minden mezőt ki kell tölteni.");
      setStripeLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { error } = await supabase.from("client_projects").update({
      payment_status: "deposit_paid",
      status: "in_progress",
      next_step: "Foglaló sikeresen kifizetve! Elindult a kivitelezési szakasz. A mérföldköveknél követheted a haladást."
    }).eq("id", project.id);

    setStripeLoading(false);
    if (error) {
      setStripeError("A fizetés feldolgozása sikertelen volt.");
    } else {
      setShowStripeModalProjectId(null);
      setStripeForm({ card: "", exp: "", cvc: "", name: "" });
      setNotice("Foglaló sikeresen rendezve. A kivitelezés megkezdődik.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Foglaló befizetve",
        `Az ügyfél (${email}) befizette a foglalót a(z) "${project.title}" projekthez. A fejlesztés indulhat!`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Foglaló sikeresen kifizetve",
        `A(z) "${project.title}" projekt foglalója beérkezett. Megkezdjük a kivitelezést.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function payFinal(project: Project) {
    setStripeLoading(true);
    setStripeError("");

    if (!stripeForm.card.trim() || !stripeForm.exp.trim() || !stripeForm.cvc.trim() || !stripeForm.name.trim()) {
      setStripeError("Minden mezőt ki kell tölteni.");
      setStripeLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { error } = await supabase.from("client_projects").update({
      final_payment_paid: true,
      final_payment_paid_at: new Date().toISOString(),
      payment_status: "fully_paid"
    }).eq("id", project.id);

    setStripeLoading(false);
    if (error) {
      setStripeError("A fizetés feldolgozása sikertelen volt.");
    } else {
      setShowStripeModalProjectId(null);
      setStripeForm({ card: "", exp: "", cvc: "", name: "" });
      setNotice("Hátralék sikeresen rendezve. Köszönjük!");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Végső fizetés beérkezett",
        `Az ügyfél (${email}) kifizette a hátralékot a(z) "${project.title}" projekthez.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Hátralék kifizetve",
        `A(z) "${project.title}" projekt hátraléka beérkezett. Köszönjük az együttműködést!`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function acceptContract(project: Project) {
    setNotice("Szerződés elfogadása...");
    const { error } = await supabase.from("client_projects").update({
      contract_accepted: true,
      contract_accepted_at: new Date().toISOString(),
      status: "deposit_pending",
      next_step: "Szerződés aláírva! Kérlek, fizesd be a foglalót a kivitelezés elindításához."
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült elfogadni a szerződést.");
    } else {
      setContractChecked(false);
      setNotice("Szerződés aláírva. Következő lépés: a foglaló befizetése.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Szerződés aláírva",
        `Az ügyfél (${email}) aláírta a szerződést a(z) "${project.title}" projekthez. Foglaló befizetésére vár.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Szerződés aláírva",
        `Aláírtad a szerződést a(z) "${project.title}" projekthez. Következő lépésként fizesd be a foglalót a kivitelezés elindításához.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function submitFeedback(project: Project, notes: string) {
    if (!notes.trim()) return;
    setNotice("Módosítások beküldése...");
    const nextRound = project.feedback_round + 1;
    const { error } = await supabase.from("client_projects").update({
      feedback_round: nextRound,
      feedback_notes: notes,
      status: "in_progress",
      next_step: `${nextRound}. körös visszajelzés beküldve. Dolgozom a kért módosításokon.`
    }).eq("id", project.id);

    if (error) {
      setNotice("Nem sikerült beküldeni a visszajelzést.");
      return;
    }

    // Create ticket automatic message
    await supabase.from("client_tickets").insert({
      user_id: userId,
      project_id: project.id,
      contact_name: profileName || email,
      contact_email: email,
      subject: `${project.title} - ${nextRound}. kör visszajelzés`
    }).select().single().then(async ({ data: ticket }) => {
      if (ticket) {
        await supabase.from("client_ticket_messages").insert({
          ticket_id: ticket.id,
          user_id: userId,
          sender: "customer",
          body: `Módosítási kérések (${nextRound}. kör):\n${notes}`
        });
      }
    });

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Javítási visszajelzés",
      `Az ügyfél (${email}) elküldte a(z) ${nextRound}. kör visszajelzését a(z) "${project.title}" projekthez.`,
      "/admin"
    );

    await triggerNotification(
      userId,
      email,
      "Visszajelzés beküldve",
      `Elküldtük a(z) ${nextRound}. körös módosítási igényeidet a(z) "${project.title}" projekthez.`,
      "/ugyfelkapu/dashboard#statuses"
    );

    setFeedbackRoundNote("");
    setNotice("Módosítási igények elküldve.");
    loadPortal(true);
  }

  async function selectMaintenance(project: Project, option: string) {
    if (option === "declined") {
      const ok = await confirm({
        title: "Lezárjuk karbantartás nélkül?",
        message: "A projekt lezárul, és nem aktiváljuk a folyamatos karbantartási csomagot. Később bármikor kérheted emailben.",
        confirmLabel: "Igen, lezárhatjuk",
        cancelLabel: "Mégse",
        danger: true
      });
      if (!ok) return;
    }
    setNotice("Karbantartási igény mentése...");
    const { error } = await supabase.from("client_projects").update({
      maintenance_option: option,
      status: "closed",
      next_step: "Projekt sikeresen lezárva. Köszönjük az együttműködést!"
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült elmenteni a döntést.");
    } else {
      setNotice("Döntésedet elmentettük. A projekt lezárult.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Karbantartási döntés",
        `Az ügyfél (${email}) döntött a karbantartásról a(z) "${project.title}" projektnél: ${option === 'accepted' ? 'KÉRI' : 'NEM KÉRI'}.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Projekt sikeresen lezárva",
        `Köszönjük az együttműködést! A(z) "${project.title}" projektet sikeresen lezártuk.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function submitProjectReview(project: Project, rating: number, review: string, referencePermitted: boolean) {
    setNotice("Értékelés mentése...");
    const { error } = await supabase.from("client_projects").update({
      client_rating: rating,
      client_review: review,
      reference_permitted: referencePermitted
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült elmenteni az értékelést.");
    } else {
      setNotice("Köszönjük az értékelést és a visszajelzést!");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Új értékelés érkezett",
        `Az ügyfél (${email}) értékelte a(z) "${project.title}" projektet: ${rating}/5 csillag.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Értékelés rögzítve",
        `Köszönjük, hogy értékelted a(z) "${project.title}" projektet!`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function requestProjectDeletion(project: Project) {
    const ok = await confirm({
      title: "Projekt törlése / megszakítása",
      message: "Biztosan törölni szeretnéd a projektet? A kérelem az adminisztrátor jóváhagyására vár, és a projekt addig „Törlés jóváhagyásra vár” állapotba kerül.",
      confirmLabel: "Törlés kezdeményezése",
      cancelLabel: "Mégse",
      danger: true
    });
    if (!ok) return;
    setNotice("Törlés kezdeményezése...");
    const { error } = await supabase.from("client_projects").update({
      status: "deletion_pending",
      status_before_delete_request: project.status,
      delete_requested: true,
      delete_requested_at: new Date().toISOString(),
      next_step: "Projekt törlése kezdeményezve. Az adminisztrátor jóváhagyására vár."
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült kezdeményezni a törlést.");
    } else {
      setNotice("Törlési kérelem elküldve.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Projekt törlési kérelem",
        `Az ügyfél (${email}) kezdeményezte a(z) "${project.title}" projekt törlését. Jóváhagyás szükséges.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Törlési kérelem elküldve",
        `Kezdeményezted a(z) "${project.title}" projekt törlését/megszakítását.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setNotice("Üzenet küldése...");
    const { data: ticket, error: ticketError } = await supabase
      .from("client_tickets")
      .insert({
        contact_email: email,
        contact_name: profileName || email,
        project_id: ticketForm.projectId || null,
        subject: ticketForm.subject,
        user_id: userId
      })
      .select("*")
      .single();

    if (ticketError || !ticket) {
      setNotice("Nem sikerült elküldeni az üzenetet.");
      return;
    }

    const { error: messageError } = await supabase.from("client_ticket_messages").insert({
      body: ticketForm.body,
      sender: "customer",
      ticket_id: ticket.id,
      user_id: userId
    });

    if (messageError) {
      setNotice("A beszélgetés elindult, de az első üzeneted nem ment el.");
      return;
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Új support ticket",
      `Új support ticketet nyitott az ügyfél (${email}): "${ticketForm.subject}".`,
      "/admin"
    );

    setTicketForm(initialTicket);
    setActiveTicketId(ticket.id);
    setComposerOpen(false);
    setSupportThreadOpen(true);
    setNotice("Üzeneted elküldve.");
    loadPortal(true);
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket || !reply.trim() || !userId || activeTicket.status === "closed") {
      return;
    }

    const { error } = await supabase.from("client_ticket_messages").insert({
      body: reply.trim(),
      sender: "customer",
      ticket_id: activeTicket.id,
      user_id: userId
    });

    if (error) {
      setNotice("Nem sikerült elküldeni az üzenetet.");
      return;
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Új ticket üzenet",
      `Új üzenet érkezett az ügyféltől (${email}) a(z) "${activeTicket.subject}" tickethez.`,
      "/admin"
    );

    setReply("");
  }

  async function submitTicketRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket || !ticketRating) {
      setNotice("Válassz 1 és 5 közötti értékelést.");
      return;
    }

    const { error } = await supabase
      .from("client_tickets")
      .update({
        rating: ticketRating,
        rating_comment: ticketRatingComment || null
      })
      .eq("id", activeTicket.id);

    if (error) {
      setNotice("Nem sikerült menteni az értékelést.");
      return;
    }

    setTicketRating(0);
    setTicketRatingComment("");
    setNotice("Köszönöm az értékelést.");
    loadPortal(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setNotice("");
  }

  function renderProjectCard(project: Project) {
    if (project.status === "closed") {
      return (
        <ClosedProjectCard
          key={project.id}
          project={project}
          reviewForm={reviewForm}
          onReviewFormChange={setReviewForm}
          onSubmitReview={() => submitProjectReview(project, reviewForm.rating, reviewForm.review, reviewForm.reference)}
        />
      );
    }

    return (
      <article className="project-status-card detailed expanded" key={project.id}>
        {project.delete_requested && (
          <div style={{ background: '#FFF3CD', border: '1px solid #FFEBAA', color: '#856404', padding: '14px', borderRadius: '16px', fontSize: '14px' }}>
            <strong>Törlés jóváhagyásra vár</strong>
            <p style={{ margin: '4px 0 0 0' }}>Kezdeményezted a projekt törlését. Az adminisztrátor hamarosan jóváhagyja vagy elutasítja a kérést.</p>
          </div>
        )}

        <ProjectTurnGuide project={project} />

        <div className="project-status-head">
          <div>
            <strong>{project.title}</strong>
            <small>{project.project_type} · {project.budget || "büdzsé nélkül"}</small>
          </div>
        </div>
        {(() => {
          const isDeletionPending = project.status === "deletion_pending";
          const isPaused = project.status === "paused";
          // deletion_pending itself isn't in projectFlow — freeze the stepper at the
          // status it was in right before the deletion request instead of showing
          // everything as "upcoming" (status_before_delete_request is always set
          // together with deletion_pending, see requestProjectDeletion).
          const stepperStatus = isDeletionPending
            ? project.status_before_delete_request ?? project.status
            : project.status;
          const currentIndex = projectFlow.findIndex(([value]) => value === stepperStatus);
          const inactive = isPaused || (currentIndex === -1 && !isDeletionPending);
          return (
            <div className="project-stepper-wrap">
              {isPaused && <span className="stepper-ribbon">Szünetel</span>}
              {isDeletionPending && <span className="stepper-ribbon">Törlésre vár</span>}
              <div className={`project-stepper ${inactive ? "inactive" : ""}`} aria-label="Projekt folyamat">
                {projectFlow.map(([value, label], index) => {
                  const state =
                    currentIndex === -1
                      ? "upcoming"
                      : index < currentIndex
                      ? "done"
                      : index === currentIndex
                      ? "active"
                      : "upcoming";
                  return (
                    <div className={`stepper-node ${state}`} key={value}>
                      <span className="stepper-dot">{state === "done" ? "✓" : index + 1}</span>
                      <span className="stepper-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {project.estimated_deadline && project.status !== "launched" && project.status !== "closed" && (
          <div className="project-deadline-chip">
            <span>Tervezett átadás</span>
            <strong>
              {new Date(project.estimated_deadline).toLocaleDateString("hu-HU", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </strong>
          </div>
        )}

        <p>{project.next_step || "Amint átnéztem, itt jelenik meg a következő lépés."}</p>

        {project.last_modified_at && (
          <small style={{ color: 'var(--muted)', fontStyle: 'italic', display: 'block', marginTop: '-4px' }}>
            Utoljára módosítva: {new Date(project.last_modified_at).toLocaleString('hu-HU')} ({project.last_modified_by_name || 'Felhasználó'})
          </small>
        )}

        <BriefPanel
          project={project}
          isEditing={editingBriefProjectId === project.id}
          editForm={editForm}
          onEditFormChange={setEditForm}
          onStartEdit={() => startEditingBrief(project)}
          onCancelEdit={() => setEditingBriefProjectId(null)}
          onSaveEdit={(e) => saveBriefEdits(e, project)}
        />

        <OfferPanel
          project={project}
          isRequestingChange={showModificationRequestProjectId === project.id}
          modificationRequestText={modificationRequestText}
          onModificationRequestTextChange={setModificationRequestText}
          onStartModificationRequest={() => setShowModificationRequestProjectId(project.id)}
          onCancelModificationRequest={() => setShowModificationRequestProjectId(null)}
          onSubmitModificationRequest={() => requestOfferChanges(project, modificationRequestText)}
          onAccept={() => acceptOffer(project)}
          onDecline={() => declineOffer(project)}
        />

        {project.status === "deposit_pending" && (
          <DepositPaymentPanel
            project={project}
            onStartPayment={() => { setStripeMode("deposit"); setShowStripeModalProjectId(project.id); setStripeError(""); }}
          />
        )}

        {project.status === "contract_pending" && (
          <ContractPanel
            project={project}
            contractChecked={contractChecked}
            onContractCheckedChange={setContractChecked}
            onAccept={() => acceptContract(project)}
          />
        )}

        <BuildProgressPanel project={project} />

        {project.status === "review" && (
          <ReviewFeedbackPanel
            project={project}
            feedbackRoundNote={feedbackRoundNote}
            onFeedbackRoundNoteChange={setFeedbackRoundNote}
            onSubmit={() => submitFeedback(project, feedbackRoundNote)}
          />
        )}

        {project.status === "launched" && (
          <LaunchedPanel
            project={project}
            onPayFinal={() => { setStripeMode("final"); setShowStripeModalProjectId(project.id); setStripeError(""); }}
            onSelectMaintenance={(choice) => selectMaintenance(project, choice)}
          />
        )}

        {!project.delete_requested && project.status !== "closed" && (
          <button
            className="button secondary"
            type="button"
            style={{ marginTop: '12px', borderColor: '#DC3545', color: '#DC3545', width: 'fit-content', fontSize: '13px', padding: '6px 12px', minHeight: 'auto' }}
            onClick={() => requestProjectDeletion(project)}
          >
            Projekt törlése / megszakítása
          </button>
        )}
      </article>
    );
  }

  if (view === "auth") {
    if (showForgotPassword) {
      return (
        <section className="portal-auth">
          <div className="portal-auth-copy">
            <p className="micro-label">Ügyfélkapu</p>
            <h1>Jelszó visszaállítása</h1>
            <p>
              Add meg a regisztrált email címedet, és elküldünk egy linket, amellyel bejelentkezés nélkül beállíthatsz egy új jelszót.
            </p>
          </div>
          <form className="portal-card" onSubmit={submitForgotPassword}>
            <h2 style={{ fontSize: '18px', color: 'var(--ink)', marginBottom: '16px' }}>Elfelejtett jelszó</h2>
            <div className="field">
              <label htmlFor="forgot-email">Regisztrált email cím</label>
              <input
                id="forgot-email"
                required
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="hello@vallalkozasod.hu"
              />
            </div>
            <button className="button primary" type="submit">Visszaállító link küldése</button>
            <button
              className="button secondary"
              type="button"
              style={{ marginTop: '12px' }}
              onClick={() => { setShowForgotPassword(false); setNotice(""); }}
            >
              Vissza a bejelentkezéshez
            </button>
            <p className="form-status">{notice}</p>
          </form>
        </section>
      );
    }

    return (
      <section className="portal-auth">
        <div className="portal-auth-copy">
          <p className="micro-label">Ügyfélkapu</p>
          <h1>Saját projektfelület, nem elvesző emailek.</h1>
          <p>
            Itt tudsz projektet indítani, üzenetet küldeni, visszanézni a beszélgetéseket és látni,
            hol tart a közös munka.
          </p>
        </div>
        <form className="portal-card" onSubmit={submitAuth}>
          <div className="portal-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(""); }} type="button">
              Belépés
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setNotice(""); }} type="button">
              Regisztráció
            </button>
          </div>
          {mode === "register" ? (
            <div className="field">
              <label htmlFor="client-name">Név</label>
              <input
                id="client-name"
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Kovács Anna"
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="client-email">Email</label>
            <input
              id="client-email"
              required
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="hello@vallalkozasod.hu"
            />
          </div>
          <div className="field" style={{ position: 'relative' }}>
            <label htmlFor="client-password">Jelszó</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input
                id="client-password"
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Legalább 6 karakter"
                style={{ width: '100%', paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2
                }}
                aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {mode === "register" && (
              <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '11px', lineHeight: '1.3' }}>
                Legalább 6 karakter hosszú jelszó megadása kötelező.
              </small>
            )}
          </div>
          {mode === "login" && (
            <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setNotice(""); }}
                style={{ background: 'none', border: 'none', color: '#76ABAE', cursor: 'pointer', fontSize: '13px', padding: 0 }}
              >
                Elfelejtetted a jelszavad?
              </button>
            </div>
          )}
          {mode === "register" && (
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', lineHeight: '1.4', color: 'var(--muted)', cursor: 'pointer', marginBottom: '4px' }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <span>
                Elolvastam és elfogadom az{" "}
                <a href="/adatkezeles" target="_blank" style={{ color: '#76ABAE' }}>Adatkezelési tájékoztatót</a>{" "}
                és az{" "}
                <a href="/aszf" target="_blank" style={{ color: '#76ABAE' }}>ÁSZF-et</a>.
              </span>
            </label>
          )}
          <button className="button primary" type="submit">
            {mode === "login" ? "Belépés" : "Fiók létrehozása"}
          </button>
          {mode === "register" && canResendConfirmation ? (
            <button className="button secondary portal-resend" onClick={resendConfirmation} type="button">
              Megerősítő email újraküldése
            </button>
          ) : null}
          <p className="form-status">{notice}</p>
        </form>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="client-portal">
        <div className="portal-card">
          <p className="micro-label">Ügyfél dashboard</p>
          <h1>Átirányítás...</h1>
          <p>Ha nem vagy bejelentkezve, visszaviszünk a belépéshez.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="client-portal">
      <header className="portal-header">
        <div>
          <p className="micro-label">Ügyfél dashboard</p>
          <h1>ProjectEdge dashboard</h1>
          <p>Projektindítás, státusz és üzenetek egyetlen privát felületen.</p>
        </div>
        <div className="portal-header-actions">
          <button
            type="button"
            className={`portal-icon-button ${openPanel === "notifications" ? "active" : ""}`}
            aria-label="Értesítések"
            onClick={() => setOpenPanel(openPanel === "notifications" ? null : "notifications")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="portal-icon-badge">{notifications.filter((n) => !n.read).length}</span>
            )}
          </button>
          <button
            type="button"
            className={`portal-icon-button ${openPanel === "support" ? "active" : ""}`}
            aria-label="Üzenetek"
            onClick={() => setOpenPanel(openPanel === "support" ? null : "support")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5c-1.4 0-2.7-.32-3.87-.9L3 21l1.9-5.63A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 1 1 21 11.5z"></path>
            </svg>
            {openTickets > 0 && <span className="portal-icon-badge">{openTickets}</span>}
          </button>
          <button
            type="button"
            className={`portal-icon-button ${openPanel === "account" ? "active" : ""}`}
            aria-label="Fiók"
            onClick={() => setOpenPanel(openPanel === "account" ? null : "account")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
        </div>
      </header>

      <OfflineBanner online={online} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {confirmModal}

      {!loading && projects.length === 0 && !projectSubmitted && (
        <div className="portal-welcome">
          <div className="portal-welcome-text">
            <span className="micro-label">Üdvözlünk a fedélzeten</span>
            <h2>Örülünk, hogy itt vagy{profileName ? `, ${profileName}` : ""}!</h2>
            <p>
              Indítsd el az első projekt briefedet pár perc alatt. Onnantól minden itt fut össze:
              az ajánlat, a fizetés, a fejlesztési mérföldkövek, az előnézeti link és a support — egy helyen.
            </p>
          </div>
          <button className="button primary" type="button" onClick={() => setHomeView("new-brief")}>
            Projekt brief indítása →
          </button>
        </div>
      )}


      {homeView === "new-brief" ? (
        <div className="project-studio-layout">
          <section className="project-wizard-card">
            <div className="wizard-topline">
              <div>
                <span>Projekt brief</span>
                <h2>{projectSubmitted ? "Terv elküldve" : briefSteps[projectStep]}</h2>
              </div>
              <strong>{projectSubmitted ? "Kész" : `${briefProgress}%`}</strong>
            </div>
            {projectSubmitted ? (
              <div className="wizard-success">
                <div className="success-mark">✓</div>
                <span>Elmentettük és elküldtük</span>
                <h3>{submittedProjectTitle || "A projektterv"}</h3>
                <p>
                  Köszönöm, megkaptam a briefet. Átnézem a célokat, a funkciókat és a vizuális irányt,
                  majd a következő lépéseket és az ajánlatot itt fogod látni a dashboardban.
                </p>
                <div className="wizard-success-actions">
                  <button className="button primary" onClick={() => setHomeView("project")} type="button">
                    Státusz megnyitása
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setProjectSubmitted(false);
                      setProjectStep(0);
                    }}
                    type="button"
                  >
                    Új projekt indítása
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="wizard-progress">
                  {briefSteps.map((step, index) => (
                    <button
                      className={index === projectStep ? "active" : index < projectStep ? "done" : ""}
                      key={step}
                      onClick={() => setProjectStep(index)}
                      type="button"
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {step}
                    </button>
                  ))}
                </div>
                <form className="wizard-form" onSubmit={createProject}>
                  <div className="wizard-slide" key={projectStep}>
                {projectStep === 0 ? (
                  <>
                    <div className="wizard-visual foundation">
                      <div className="mini-browser">
                        <span />
                        <span />
                        <span />
                        <strong>{projectForm.company || "Márkád"}</strong>
                      </div>
                      <div className="floating-card one">Landing</div>
                      <div className="floating-card two">Admin</div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-title">Mi legyen a projekt neve?</label>
                      <input
                        id="project-title"
                        required
                        value={projectForm.title}
                        onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Például: új weboldal, redesign, ügyfélkapu..."
                      />
                    </div>
                    <div className="wizard-two">
                      <div className="field">
                        <label htmlFor="project-company">Cég / márka</label>
                        <input
                          id="project-company"
                          value={projectForm.company}
                          onChange={(event) => setProjectForm((current) => ({ ...current, company: event.target.value }))}
                          placeholder="Vállalkozás neve"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="project-website">Van már weboldal?</label>
                        <input
                          id="project-website"
                          value={projectForm.website}
                          onChange={(event) => setProjectForm((current) => ({ ...current, website: event.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="choice-grid">
                      {projectTypeOptions.map(([value, label, description]) => (
                        <button
                          className={projectForm.projectType === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, projectType: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>{description}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {projectStep === 1 ? (
                  <>
                    <div className="wizard-visual goals">
                      <div className="goal-orbit">
                        <span>Lead</span>
                        <span>Bizalom</span>
                        <span>Rendszer</span>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-goals">Mit szeretnél, hogy az oldal elérjen?</label>
                      <div className="quick-chips">
                        {["Több megkeresés, érdeklődő", "Professzionálisabb megjelenés", "Online időpontfoglalás", "Szolgáltatások bemutatása", "Online értékesítés"].map((chip) => (
                          <button
                            className={splitListValue(projectForm.goals).includes(chip) ? "active" : ""}
                            key={chip}
                            onClick={() => setProjectForm((current) => ({ ...current, goals: toggleListValue(current.goals, chip) }))}
                            type="button"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="project-goals"
                        required
                        value={projectForm.goals}
                        onChange={(event) => setProjectForm((current) => ({ ...current, goals: event.target.value }))}
                        placeholder="Kattints a fenti gombokra, vagy írd le a saját szavaiddal: mi most a gond, mi lenne a jó eredmény?"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="project-audience">Kiknek készül?</label>
                      <div className="quick-chips">
                        {audienceChips.map((chip) => (
                          <button
                            className={splitListValue(projectForm.audience).includes(chip) ? "active" : ""}
                            key={chip}
                            onClick={() => setProjectForm((current) => ({ ...current, audience: toggleListValue(current.audience, chip) }))}
                            type="button"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="project-audience"
                        value={projectForm.audience}
                        onChange={(event) => setProjectForm((current) => ({ ...current, audience: event.target.value }))}
                        placeholder="Kattints a fenti gombokra, vagy pontosítsd szabadon..."
                      />
                    </div>
                    <div className="choice-grid compact">
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <button
                          className={projectForm.priority === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, priority: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {projectStep === 2 ? (
                  <>
                    <div className="wizard-visual structure">
                      <div>Főoldal</div>
                      <div>Ajánlatkérés</div>
                      <div>Admin</div>
                      <div>Automatizmus</div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-pages">Milyen oldalak kellenek?</label>
                      <div className="quick-chips">
                        {pageChips.map((chip) => (
                          <button
                            className={splitListValue(projectForm.pages).includes(chip) ? "active" : ""}
                            key={chip}
                            onClick={() => setProjectForm((current) => ({ ...current, pages: toggleListValue(current.pages, chip) }))}
                            type="button"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="project-pages"
                        value={projectForm.pages}
                        onChange={(event) => setProjectForm((current) => ({ ...current, pages: event.target.value }))}
                        placeholder="Kattints a fenti gombokra, vagy sorold fel szabadon..."
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="project-features">Milyen funkciókat szeretnél?</label>
                      <div className="quick-chips">
                        {featureChips.map((chip) => (
                          <button
                            className={splitListValue(projectForm.features).includes(chip) ? "active" : ""}
                            key={chip}
                            onClick={() => setProjectForm((current) => ({ ...current, features: toggleListValue(current.features, chip) }))}
                            type="button"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="project-features"
                        value={projectForm.features}
                        onChange={(event) => setProjectForm((current) => ({ ...current, features: event.target.value }))}
                        placeholder="Kattints a fenti gombokra, vagy írd le szabadon, mire van szükséged..."
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="project-budget">Mekkora kerettel gondolkodsz?</label>
                      <select
                        id="project-budget"
                        value={projectForm.budget}
                        onChange={(event) => setProjectForm((current) => ({ ...current, budget: event.target.value }))}
                      >
                        <option value="not-sure">Még nem tudom</option>
                        <option value="50k-150k">50 000 - 150 000 Ft</option>
                        <option value="150k-350k">150 000 - 350 000 Ft</option>
                        <option value="350k-700k">350 000 - 700 000 Ft</option>
                        <option value="700k-plus">700 000 Ft felett</option>
                      </select>
                    </div>
                  </>
                ) : null}

                {projectStep === 3 ? (
                  <>
                    <div className="wizard-visual style-lab">
                      <div
                        className={`style-card vibe-${projectForm.vibe}`}
                        style={{ background: activePaletteColors[0], color: activePaletteColors[2] }}
                      >
                        <span style={{ color: activePaletteColors[1] }}>{selectedVibe[1]}</span>
                        <strong>{projectForm.company || "Márka"}</strong>
                        <p>{selectedVibe[2]}</p>
                        <em style={{ background: activePaletteColors[3] }}>Ajánlatot kérek</em>
                      </div>
                    </div>
                    <div className="choice-grid vibe-grid">
                      {vibeOptions.map(([value, label, description]) => (
                        <button
                          className={`vibe-${value} ${projectForm.vibe === value ? "selected" : ""}`}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, vibe: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>{description}</span>
                        </button>
                      ))}
                    </div>
                    <div className="palette-grid">
                      {paletteOptions.map(([value, label, colors]) => (
                        <button
                          className={projectForm.palette === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, palette: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>
                            {(value === "custom" ? activePaletteColors : colors).map((color, index) => (
                              <i key={`${color}-${index}`} style={{ background: color }} />
                            ))}
                          </span>
                        </button>
                      ))}
                    </div>
                    {projectForm.palette === "custom" ? (
                      <div className="custom-palette-picker">
                        {(
                          [
                            ["customBg", "Háttér"],
                            ["customAccent", "Kiemelő szín"],
                            ["customText", "Szöveg"],
                            ["customCta", "Gomb (CTA)"]
                          ] as Array<[keyof typeof projectForm, string]>
                        ).map(([field, label]) => (
                          <label key={field}>
                            <input
                              type="color"
                              value={projectForm[field]}
                              onChange={(event) =>
                                setProjectForm((current) => ({ ...current, [field]: event.target.value }))
                              }
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <div className="field">
                      <label htmlFor="project-style">Van konkrét stílus, példa vagy tiltólista?</label>
                      <textarea
                        id="project-style"
                        value={projectForm.style}
                        onChange={(event) => setProjectForm((current) => ({ ...current, style: event.target.value }))}
                        placeholder="Például: sötét prémium, nagy tipó, kevés stock fotó, animált 3D, ne legyen túl corporate..."
                      />
                    </div>
                  </>
                ) : null}

                {projectStep === 4 ? (
                  <>
                    <div className="wizard-visual assets">
                      <div className="asset-chip">Domain</div>
                      <div className="asset-chip">Logó</div>
                      <div className="asset-chip">Szövegek</div>
                      <div className="asset-chip">Hozzáférés</div>
                    </div>
                    <p className="wizard-hint">
                      Ezekre azért van szükségem, hogy gördülékenyen tudjunk indulni. Amit most nem
                      tudsz, nyugodtan hagyd üresen — később is pótolható.
                    </p>

                    {/* Domain */}
                    <div className="field">
                      <label>Domain (a weboldal címe)</label>
                      <div className="choice-grid compact">
                        <button
                          className={projectForm.domainStatus === "have" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, domainStatus: "have" }))}
                          type="button"
                        >
                          <strong>Van saját domainem</strong>
                        </button>
                        <button
                          className={projectForm.domainStatus === "need" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, domainStatus: "need" }))}
                          type="button"
                        >
                          <strong>Még nincs, segítsetek</strong>
                        </button>
                      </div>
                    </div>
                    {projectForm.domainStatus === "have" ? (
                      <div className="wizard-two">
                        <div className="field">
                          <label htmlFor="domain-name">Mi a domain neve?</label>
                          <input
                            id="domain-name"
                            value={projectForm.domainName}
                            onChange={(event) => setProjectForm((current) => ({ ...current, domainName: event.target.value }))}
                            placeholder="vallalkozas.hu"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="hosting-access">Tárhely / domain hozzáférés</label>
                          <select
                            id="hosting-access"
                            value={projectForm.hostingAccess}
                            onChange={(event) => setProjectForm((current) => ({ ...current, hostingAccess: event.target.value }))}
                          >
                            <option value="">Válassz...</option>
                            <option value="yes">Tudok hozzáférést adni</option>
                            <option value="later">Később megoldjuk</option>
                            <option value="unknown">Nem tudom, hol van</option>
                          </select>
                        </div>
                      </div>
                    ) : null}
                    {projectForm.domainStatus === "need" ? (
                      <div className="branch-note-block">
                        <p className="branch-note">Rendben — segítünk a domain kiválasztásában, regisztrációjában és a beállításában.</p>
                        <button className="button secondary" type="button" onClick={() => printDomainGuide(projectForm.company)}>
                          Domain-vásárlási útmutató megnyitása
                        </button>
                      </div>
                    ) : null}

                    {/* Meglévő oldal — csak ha megadott weboldalt */}
                    {projectForm.website.trim() ? (
                      <div className="field">
                        <label>Min fut a jelenlegi oldalad?</label>
                        <div className="choice-grid compact">
                          {[
                            ["wordpress", "WordPress"],
                            ["wix", "Wix / Squarespace"],
                            ["custom", "Egyedi fejlesztés"],
                            ["other", "Nem tudom / egyéb"]
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              className={projectForm.existingPlatform === value ? "selected" : ""}
                              onClick={() => setProjectForm((current) => ({ ...current, existingPlatform: value }))}
                              type="button"
                            >
                              <strong>{label}</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {projectForm.website.trim() && projectForm.existingPlatform === "wordpress" ? (
                      <div className="field">
                        <label htmlFor="wp-access">Tudsz WordPress admin hozzáférést adni? (a tartalom átemeléséhez)</label>
                        <select
                          id="wp-access"
                          value={projectForm.wpAccess}
                          onChange={(event) => setProjectForm((current) => ({ ...current, wpAccess: event.target.value }))}
                        >
                          <option value="">Válassz...</option>
                          <option value="yes">Igen, tudok adni (akár csak olvasásra)</option>
                          <option value="no">Nem, de a tartalmat elküldöm</option>
                        </select>
                      </div>
                    ) : null}

                    {/* Logó */}
                    <div className="field">
                      <label>Van logód?</label>
                      <div className="choice-grid compact">
                        {[
                          ["vector", "Van, vektoros (ai/svg/pdf)"],
                          ["raster", "Van, csak kép (jpg/png)"],
                          ["none", "Nincs logóm"]
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            className={projectForm.logoStatus === value ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, logoStatus: value }))}
                            type="button"
                          >
                            <strong>{label}</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                    {projectForm.logoStatus === "none" ? (
                      <div className="field">
                        <label>Kérsz logótervezést?</label>
                        <div className="choice-grid compact">
                          <button
                            className={projectForm.wantLogoDesign === "yes" ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, wantLogoDesign: "yes" }))}
                            type="button"
                          >
                            <strong>Igen, kérek</strong>
                            <span>Külön díjas extra, az ajánlatban jelezzük.</span>
                          </button>
                          <button
                            className={projectForm.wantLogoDesign === "no" ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, wantLogoDesign: "no" }))}
                            type="button"
                          >
                            <strong>Egyelőre nem</strong>
                            <span>Szöveges márkanévvel is el tudunk indulni.</span>
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {projectForm.logoStatus === "vector" || projectForm.logoStatus === "raster" ? (
                      <div className="field">
                        <label htmlFor="logo-upload">Töltsd fel a logódat</label>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,application/pdf"
                          disabled={logoUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) uploadLogo(file);
                            event.target.value = "";
                          }}
                        />
                        {logoUploading ? (
                          <span className="logo-preview-status">Feltöltés...</span>
                        ) : projectForm.logoUrl ? (
                          <div className="logo-preview">
                            {projectForm.logoUrl.toLowerCase().endsWith(".pdf") ? (
                              <span className="logo-preview-chip">📎 Fájl csatolva</span>
                            ) : (
                              <img src={projectForm.logoUrl} alt="Feltöltött logó előnézet" />
                            )}
                            <span>Sikeresen feltöltve — bármikor cserélheted.</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Arculat */}
                    <div className="field">
                      <label htmlFor="brand-colors">Van márkaszíned / színkódod?</label>
                      <div className="input-with-picker">
                        <input
                          id="brand-colors"
                          value={projectForm.brandColors}
                          onChange={(event) => setProjectForm((current) => ({ ...current, brandColors: event.target.value }))}
                          placeholder="Például: #1E2329, sötétzöld, arany — vagy hagyd ránk"
                        />
                        <input
                          type="color"
                          aria-label="Márkaszín kiválasztása"
                          value="#76ABAE"
                          onChange={(event) =>
                            setProjectForm((current) => ({
                              ...current,
                              brandColors: current.brandColors ? `${current.brandColors}, ${event.target.value}` : event.target.value
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Milyen betűtípus-stílus áll hozzád közel?</label>
                      <div className="font-grid">
                        {curatedFonts.map(([label, family]) => {
                          const shortLabel = label.split(" (")[0];
                          return (
                            <button
                              className={projectForm.fontPreference === label && !customFontOpen ? "selected" : ""}
                              key={label}
                              onClick={() => {
                                setCustomFontOpen(false);
                                setProjectForm((current) => ({ ...current, fontPreference: label }));
                              }}
                              type="button"
                            >
                              <span className="font-sample" style={{ fontFamily: family }} aria-hidden="true">Aa</span>
                              <strong>{shortLabel}</strong>
                              <span className="font-preview-line" style={{ fontFamily: family }}>Szép weboldal</span>
                            </button>
                          );
                        })}
                        <button
                          className={customFontOpen || (Boolean(projectForm.fontPreference) && !curatedFonts.some(([label]) => label === projectForm.fontPreference)) ? "selected" : ""}
                          onClick={() => {
                            setCustomFontOpen(true);
                            setProjectForm((current) => ({
                              ...current,
                              fontPreference: curatedFonts.some(([label]) => label === current.fontPreference) ? "" : current.fontPreference
                            }));
                          }}
                          type="button"
                        >
                          <span className="font-sample" aria-hidden="true">✏️</span>
                          <strong>Egyéb</strong>
                          <span className="font-preview-line">Leírom, mit szeretnék</span>
                        </button>
                      </div>
                      {(customFontOpen || (Boolean(projectForm.fontPreference) && !curatedFonts.some(([label]) => label === projectForm.fontPreference))) && (
                        <input
                          value={curatedFonts.some(([label]) => label === projectForm.fontPreference) ? "" : projectForm.fontPreference}
                          onChange={(event) => setProjectForm((current) => ({ ...current, fontPreference: event.target.value }))}
                          placeholder="Írd le, milyen betűtípust szeretnél — vagy hagyd ránk"
                        />
                      )}
                    </div>

                    {/* Szövegek */}
                    <div className="field">
                      <label>A szövegeket ki írja?</label>
                      <div className="choice-grid compact">
                        <button
                          className={projectForm.contentSource === "studio" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, contentSource: "studio" }))}
                          type="button"
                        >
                          <strong>Írjátok meg ti</strong>
                          <span>Benne van az árban — vázlatból dolgozunk.</span>
                        </button>
                        <button
                          className={projectForm.contentSource === "client" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, contentSource: "client" }))}
                          type="button"
                        >
                          <strong>Megírom én</strong>
                          <span>Kész szövegeket adok az oldalakhoz.</span>
                        </button>
                      </div>
                    </div>

                    {/* Képek */}
                    <div className="field">
                      <label>Képek, fotók?</label>
                      <div className="choice-grid compact">
                        <button
                          className={projectForm.photoSource === "own" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, photoSource: "own" }))}
                          type="button"
                        >
                          <strong>Vannak saját képeim</strong>
                        </button>
                        <button
                          className={projectForm.photoSource === "help" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, photoSource: "help" }))}
                          type="button"
                        >
                          <strong>Kérek stock / segítséget</strong>
                        </button>
                      </div>
                    </div>

                    {/* Kapcsolat + közösségi */}
                    <div className="wizard-two">
                      <div className="field">
                        <label htmlFor="contact-email">Megjelenő kapcsolati email</label>
                        <input
                          id="contact-email"
                          value={projectForm.contactEmail}
                          onChange={(event) => setProjectForm((current) => ({ ...current, contactEmail: event.target.value }))}
                          placeholder="info@vallalkozas.hu"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="contact-phone">Megjelenő telefonszám</label>
                        <input
                          id="contact-phone"
                          value={projectForm.contactPhone}
                          onChange={(event) => setProjectForm((current) => ({ ...current, contactPhone: event.target.value }))}
                          placeholder="+36 ..."
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="social-links">Közösségi oldalak linkjei</label>
                      <textarea
                        id="social-links"
                        value={projectForm.socialLinks}
                        onChange={(event) => setProjectForm((current) => ({ ...current, socialLinks: event.target.value }))}
                        placeholder="Facebook, Instagram, LinkedIn, Google Cégprofil..."
                      />
                    </div>

                    {/* Analytics */}
                    <div className="field">
                      <label htmlFor="analytics-access">Van Google Analytics / mérés a régi oldalon?</label>
                      <select
                        id="analytics-access"
                        value={projectForm.analyticsAccess}
                        onChange={(event) => setProjectForm((current) => ({ ...current, analyticsAccess: event.target.value }))}
                      >
                        <option value="">Válassz...</option>
                        <option value="yes">Van, tudok hozzáférést adni</option>
                        <option value="setup">Nincs, de szeretnék mérést</option>
                        <option value="no">Nincs / nem fontos</option>
                      </select>
                    </div>

                    {/* Számlázás */}
                    <div className="field">
                      <label htmlFor="billing-details">Számlázási adatok (a szerződéshez / számlához)</label>
                      <textarea
                        id="billing-details"
                        value={projectForm.billingDetails}
                        onChange={(event) => setProjectForm((current) => ({ ...current, billingDetails: event.target.value }))}
                        placeholder="Cégnév, adószám, székhely cím — vagy magánszemély esetén név és cím"
                      />
                    </div>
                  </>
                ) : null}

                {projectStep === 5 ? (
                  <div className="wizard-summary">
                    <div className="summary-hero">
                      <span>Beküldés előtt</span>
                      <h3>{projectForm.title || "Új projekt"}</h3>
                      <p>{projectForm.goals || "A cél még nincs megadva."}</p>
                    </div>
                    <div className="summary-grid">
                      <div>
                        <span>Projekt típusa</span>
                        <strong>{selectedProjectType[1]}</strong>
                      </div>
                      <div>
                        <span>Stílus</span>
                        <strong>{selectedVibe[1]}</strong>
                      </div>
                      <div>
                        <span>Paletta</span>
                        <strong>{selectedPalette[1]}</strong>
                      </div>
                      <div>
                        <span>Büdzsé</span>
                        <strong>{projectForm.budget}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

                  <div className="wizard-actions">
                    <button
                      className="button secondary"
                      disabled={projectStep === 0}
                      onClick={() => setProjectStep((current) => Math.max(0, current - 1))}
                      type="button"
                    >
                      Vissza
                    </button>
                    {projectStep < briefSteps.length - 1 ? (
                      <button
                        className="button primary"
                        onClick={() => setProjectStep((current) => Math.min(briefSteps.length - 1, current + 1))}
                        type="button"
                      >
                        Következő
                      </button>
                    ) : (
                      <button className="button primary" type="submit">
                        Projektkérés küldése
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </section>

          <aside className="project-brief-preview">
            <section className="live-brief-card">
              <div className="live-brief-head">
                <span>Élő brief</span>
                <strong>{briefProgress}% kész</strong>
              </div>
              <h3>{projectForm.title || "A projekt neve ide kerül"}</h3>
              <p>{projectForm.goals || "Ahogy válaszolsz, itt épül össze az anyag, amiből ajánlatot tudok adni."}</p>
              <div className="live-brief-tags">
                <span>{selectedProjectType[1]}</span>
                <span>{selectedVibe[1]}</span>
                <span>{priorityLabels[projectForm.priority]}</span>
              </div>
              <div className="live-palette">
                {activePaletteColors.map((color, index) => (
                  <i key={`${color}-${index}`} style={{ background: color }} />
                ))}
              </div>
              <div className="live-brief-list">
                <div>
                  <span>Célközönség</span>
                  <strong>{projectForm.audience || "Még nincs megadva"}</strong>
                </div>
                <div>
                  <span>Oldalak</span>
                  <strong>{projectForm.pages || "Később pontosítjuk"}</strong>
                </div>
                <div>
                  <span>Funkciók</span>
                  <strong>{projectForm.features || "Később pontosítjuk"}</strong>
                </div>
              </div>
            </section>

          </aside>
        </div>
      ) : null}

      {homeView === "project" ? (
        <section className="status-page-panel">
          <div className="status-page-head">
            <div>
              <span>Projekt státusz</span>
              <h2>Innen látod, hol tartunk.</h2>
            </div>
            <button className="button primary" onClick={() => setHomeView("new-brief")} type="button">
              Új projekt brief
            </button>
          </div>
          <div className="status-page-grid">
            {loading ? (
              <>
                {[0, 1].map((i) => (
                  <div key={i} className="project-status-card detailed" style={{ display: 'grid', gap: '14px' }}>
                    <Skeleton height={14} width="40%" />
                    <Skeleton height={26} width="70%" />
                    <Skeleton height={10} radius={999} />
                    <Skeleton height={64} radius={18} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Skeleton height={38} width={140} radius={14} />
                      <Skeleton height={38} width={120} radius={14} />
                    </div>
                  </div>
                ))}
              </>
            ) : null}
            {!loading && projects.length === 0 ? (
              <div className="portal-empty-state">
                <strong>Még nincs projekted.</strong>
                <p>Indíts egy projekt briefet, és itt látod majd a státuszt, a tennivalókat és az ajánlatot.</p>
              </div>
            ) : null}
            {!loading && activeProjects.length > 1 && (
              <ProjectSwitcher
                projects={activeProjects}
                selectedId={selectedProject?.id ?? ""}
                onSelect={setSelectedProjectId}
              />
            )}
            {!loading && selectedProject ? renderProjectCard(selectedProject) : null}
            {!loading && closedProjects.length > 0 && (
              <details className="disclosure">
                <summary>Korábbi projektek ({closedProjects.length})</summary>
                <div className="disclosure-body" style={{ display: "grid", gap: "16px" }}>
                  {closedProjects.map((project) => renderProjectCard(project))}
                </div>
              </details>
            )}
          </div>
        </section>
      ) : null}

      {openPanel === "support" ? (
        <div className="portal-slideover-backdrop" onClick={() => setOpenPanel(null)}>
        <aside className="portal-slideover" onClick={(e) => e.stopPropagation()} aria-label="Üzenetek">
          <div className="portal-slideover-head">
            {supportThreadOpen && activeTicket ? (
              <button type="button" className="portal-slideover-back" onClick={() => setSupportThreadOpen(false)}>
                ← Üzenetek
              </button>
            ) : (
              <h2>Üzenetek</h2>
            )}
            <button type="button" className="portal-slideover-close" onClick={() => setOpenPanel(null)} aria-label="Bezárás">×</button>
          </div>
          <div className="portal-slideover-body">
            {supportThreadOpen && activeTicket ? (
              <section className="portal-panel chat-panel">
                <div className="portal-chat-head">
                  <strong>{activeTicket.subject}</strong>
                  <span className="status-pill">{statusLabels[activeTicket.status] ?? activeTicket.status}</span>
                </div>
                <div className="portal-chat-messages">
                  {(messages[activeTicket.id] ?? []).map((item) => (
                    <div className={`portal-bubble ${item.sender}`} key={item.id}>
                      <span>{item.sender === "admin" ? "ProjectEdge" : "Te"}</span>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
                {activeTicket.status !== "closed" && (
                  <form className="portal-reply" onSubmit={sendReply}>
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Válasz írása..."
                    />
                    <button className="button primary" type="submit">
                      Küldés
                    </button>
                  </form>
                )}
                {activeTicket.status === "closed" ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px", padding: "8px 0" }}>
                    Ez a beszélgetés lezárva — új kérdéshez küldj új üzenetet.
                  </div>
                ) : null}
                {activeTicket.status === "closed" ? (
                  <form className="portal-rating" onSubmit={submitTicketRating}>
                    <strong>{activeTicket.rating ? "Köszönöm az értékelést." : "Milyen volt a segítség?"}</strong>
                    {!activeTicket.rating ? (
                      <>
                        <div className="rating-row" role="radiogroup" aria-label="Beszélgetés értékelése">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              aria-label={`${value} csillag`}
                              className={ticketRating >= value ? "active" : ""}
                              key={value}
                              onClick={() => setTicketRating(value)}
                              type="button"
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={ticketRatingComment}
                          onChange={(event) => setTicketRatingComment(event.target.value)}
                          placeholder="Pár szóban leírhatod, milyen volt a segítség."
                        />
                        <button className="button secondary" type="submit">
                          Értékelés küldése
                        </button>
                      </>
                    ) : null}
                  </form>
                ) : null}
              </section>
            ) : (
              <div className="support-stack">
                {!composerOpen && tickets.length > 0 && (
                  <button className="button primary" type="button" onClick={() => setComposerOpen(true)}>
                    ＋ Új üzenet írása
                  </button>
                )}
                {(composerOpen || tickets.length === 0) && (
                  <section className="portal-panel">
                    <div className="portal-panel-head">
                      <span>Új üzenet</span>
                      {tickets.length > 0 && (
                        <button type="button" onClick={() => setComposerOpen(false)}>Mégse</button>
                      )}
                    </div>
                    <form className="portal-form" onSubmit={createTicket}>
                      <div className="field">
                        <label htmlFor="ticket-project">Miről szeretnél írni?</label>
                        <select
                          id="ticket-project"
                          value={ticketForm.projectId}
                          onChange={(event) => setTicketForm((current) => ({ ...current, projectId: event.target.value }))}
                        >
                          <option value="">Általános kérdés</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="ticket-subject">Tárgy</label>
                        <input
                          id="ticket-subject"
                          required
                          value={ticketForm.subject}
                          onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))}
                          placeholder="Például: kérdés a kezdésről"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="ticket-body">Üzenet</label>
                        <textarea
                          id="ticket-body"
                          required
                          value={ticketForm.body}
                          onChange={(event) => setTicketForm((current) => ({ ...current, body: event.target.value }))}
                          placeholder="Írd le, miben segítsek."
                        />
                      </div>
                      <button className="button primary" type="submit">
                        Üzenet küldése
                      </button>
                    </form>
                  </section>
                )}
                {tickets.length > 0 && (
                  <div className="conversation-list">
                    <span className="conversation-list-title">Beszélgetések ({tickets.length})</span>
                    {tickets.map((ticket) => {
                      const lastMessage = (messages[ticket.id] ?? []).slice(-1)[0];
                      return (
                        <button
                          className="conversation-card"
                          key={ticket.id}
                          onClick={() => {
                            setActiveTicketId(ticket.id);
                            setSupportThreadOpen(true);
                          }}
                          type="button"
                        >
                          <div className="conversation-card-top">
                            <strong>{ticket.subject}</strong>
                            <span className={`status-pill ${ticket.status}`}>{statusLabels[ticket.status] ?? ticket.status}</span>
                          </div>
                          {lastMessage ? (
                            <p>{lastMessage.sender === "admin" ? "ProjectEdge: " : "Te: "}{lastMessage.body}</p>
                          ) : null}
                          <small>{new Date(ticket.last_message_at).toLocaleString("hu-HU")}</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
        </div>
      ) : null}

      {openPanel === "account" ? (
        <div className="portal-slideover-backdrop" onClick={() => setOpenPanel(null)}>
        <aside className="portal-slideover" onClick={(e) => e.stopPropagation()} aria-label="Fiók">
          <div className="portal-slideover-head">
            <h2>Fiók</h2>
            <button type="button" className="portal-slideover-close" onClick={() => setOpenPanel(null)} aria-label="Bezárás">×</button>
          </div>
          <div className="portal-slideover-body">
        <div className="portal-dashboard-grid account" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          <section className="portal-panel" style={{ height: "fit-content" }}>
            <div className="portal-panel-head">
              <span>Fiókadatok</span>
            </div>
            <div className="account-list" style={{ display: "grid", gap: "12px", padding: "12px 0" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", textTransform: "uppercase" }}>Email</span>
                <strong style={{ color: "var(--ink)", fontSize: "15px" }}>{email}</strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", textTransform: "uppercase" }}>Projektek száma</span>
                <strong style={{ color: "var(--ink)", fontSize: "15px" }}>{projects.length} db</strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", textTransform: "uppercase" }}>Üzeneteid száma</span>
                <strong style={{ color: "var(--ink)", fontSize: "15px" }}>{tickets.length} db</strong>
              </div>
            </div>
            <button className="button secondary" onClick={signOut} type="button" style={{ marginTop: "16px", width: "100%" }}>
              Kilépés a fiókból
            </button>
          </section>

          <section className="portal-panel" style={{ height: "fit-content" }}>
            <div className="portal-panel-head">
              <span>Profil szerkesztése</span>
              <small>Megjelenítendő név</small>
            </div>
            <form onSubmit={updateProfileName} style={{ display: "grid", gap: "14px", padding: "12px 0" }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="settings-name">Teljes név</label>
                <input
                  id="settings-name"
                  type="text"
                  placeholder="Kovács Anna"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <button className="button primary" type="submit" style={{ width: "100%" }}>
                Név mentése
              </button>
            </form>
          </section>

          <section className="portal-panel" style={{ height: "fit-content" }}>
            <div className="portal-panel-head">
              <span>Jelszó módosítása</span>
              <small>Biztonsági frissítés</small>
            </div>
            <form onSubmit={updatePassword} style={{ display: "grid", gap: "14px", padding: "12px 0" }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="settings-password">Új jelszó</label>
                <input
                  id="settings-password"
                  type="password"
                  placeholder="Legalább 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <button className="button primary" type="submit" style={{ width: "100%" }}>
                Jelszó megváltoztatása
              </button>
            </form>
          </section>

          <section className="portal-panel" style={{ height: "fit-content", border: "1px solid rgba(220, 53, 69, 0.25)", background: "rgba(220, 53, 69, 0.02)" }}>
            <div className="portal-panel-head">
              <span style={{ color: "#FF7676" }}>Fiók törlése</span>
              <small style={{ color: "rgba(220, 53, 69, 0.6)" }}>Visszafordíthatatlan művelet</small>
            </div>
            <form onSubmit={deleteAccount} style={{ display: "grid", gap: "14px", padding: "12px 0" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: "1.4" }}>
                A fiók törlésével minden projektbrief, ajánlat, üzenet és adat véglegesen törlődik a rendszerből.
              </p>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="settings-delete" style={{ color: "var(--muted)" }}>Megerősítéshez írd be: TÖRLÉS</label>
                <input
                  id="settings-delete"
                  type="text"
                  placeholder="TÖRLÉS"
                  style={{ border: "1px solid rgba(220, 53, 69, 0.25)", background: "var(--white)", color: "var(--ink)" }}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
              <button className="button primary" type="submit" style={{ width: "100%", background: "#DC3545", borderColor: "#DC3545" }}>
                Fiók végleges törlése
              </button>
            </form>
          </section>
        </div>
          </div>
        </aside>
        </div>
      ) : null}

      {openPanel === "notifications" ? (
        <div className="portal-slideover-backdrop" onClick={() => setOpenPanel(null)}>
        <aside className="portal-slideover" onClick={(e) => e.stopPropagation()} aria-label="Értesítések">
          <div className="portal-slideover-head">
            <h2>Értesítések</h2>
            <button type="button" className="portal-slideover-close" onClick={() => setOpenPanel(null)} aria-label="Bezárás">×</button>
          </div>
          <div className="portal-slideover-body">
            {notifications.length > 0 && (
              <div className="notification-actions">
                {notifications.some((n) => !n.read) && (
                  <button type="button" onClick={markAllNotificationsAsRead}>Mind olvasott</button>
                )}
                {notifications.some((n) => n.read) && (
                  <button type="button" className="danger" onClick={deleteReadNotifications}>Olvasottak törlése</button>
                )}
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="slideover-empty">
                <span aria-hidden="true">🔔</span>
                <strong>Nincs még értesítésed.</strong>
                <p>Minden státuszváltozásról, ajánlatról és üzenetválaszról itt szólunk.</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((n) => (
                  <button
                    className={`notification-item ${n.read ? "" : "unread"}`}
                    key={n.id}
                    onClick={() => markNotificationAsRead(n.id, n.link)}
                    type="button"
                  >
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <small>{new Date(n.created_at).toLocaleString("hu-HU")}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
        </div>
      ) : null}
      {showStripeModalProjectId && (() => {
        const project = projects.find(p => p.id === showStripeModalProjectId);
        if (!project) return null;
        const payAmount = stripeMode === "final"
          ? (project.offer_price ?? 0) - (project.deposit_amount ?? 0)
          : (project.deposit_amount ?? 0);
        const payLabel = stripeMode === "final" ? "Hátralék" : "Foglaló";
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)', padding: '16px' }}>
            <div style={{ background: '#1C1E22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '24px', color: '#F5F5F5', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'grid', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Biztonságos fizetés</span>
                <button type="button" onClick={() => setShowStripeModalProjectId(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '20px', padding: 0 }}>×</button>
              </div>

              <div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Fizetés a következő projektre:</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#fff' }}>{project.title}</h3>
                <small style={{ color: 'rgba(255,255,255,0.4)' }}>{project.company || "Cégnév nélkül"}</small>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Fizetendő összeg ({payLabel}):</span>
                <strong style={{ fontSize: '20px', color: '#76ABAE' }}>{formatPrice(payAmount, project.offer_currency || "Ft")}</strong>
              </div>

              {stripeError && (
                <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.2)', color: '#FF7676', padding: '12px', borderRadius: '12px', fontSize: '14px' }}>
                  {stripeError}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); stripeMode === "final" ? payFinal(project) : payDeposit(project); }} style={{ display: 'grid', gap: '14px' }}>
                <div className="field">
                  <label htmlFor="stripe-name" style={{ color: 'rgba(255,255,255,0.6)' }}>Kártyabirtokos neve</label>
                  <input
                    id="stripe-name"
                    required
                    style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                    placeholder="Minta János"
                    value={stripeForm.name}
                    onChange={(e) => setStripeForm({ ...stripeForm, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="stripe-card" style={{ color: 'rgba(255,255,255,0.6)' }}>Kártyaszám</label>
                  <input
                    id="stripe-card"
                    required
                    maxLength={19}
                    style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                    placeholder="4242 4242 4242 4242"
                    value={stripeForm.card}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      let matches = v.match(/\d{4,16}/g);
                      let match = matches && matches[0] || '';
                      let parts = [];
                      for (let i=0, len=match.length; i<len; i+=4) {
                        parts.push(match.substring(i, i+4));
                      }
                      if (parts.length > 0) {
                        setStripeForm({ ...stripeForm, card: parts.join(' ') });
                      } else {
                        setStripeForm({ ...stripeForm, card: v });
                      }
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="field">
                    <label htmlFor="stripe-exp" style={{ color: 'rgba(255,255,255,0.6)' }}>Lejárat</label>
                    <input
                      id="stripe-exp"
                      required
                      maxLength={5}
                      style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                      placeholder="MM/YY"
                      value={stripeForm.exp}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 2) {
                          setStripeForm({ ...stripeForm, exp: `${v.substring(0,2)}/${v.substring(2,4)}` });
                        } else {
                          setStripeForm({ ...stripeForm, exp: v });
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="stripe-cvc" style={{ color: 'rgba(255,255,255,0.6)' }}>CVC</label>
                    <input
                      id="stripe-cvc"
                      required
                      maxLength={3}
                      type="password"
                      style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                      placeholder="123"
                      value={stripeForm.cvc}
                      onChange={(e) => setStripeForm({ ...stripeForm, cvc: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <button className="button primary" type="submit" disabled={stripeLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '8px', background: '#76ABAE', border: 'none', borderRadius: '12px', color: '#fff' }}>
                  {stripeLoading ? (
                    <span>Fizetés folyamatban...</span>
                  ) : (
                    <span>Fizetés {formatPrice(payAmount, project.offer_currency || "Ft")}</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
