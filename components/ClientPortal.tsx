"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  initialBriefForm,
  PUBLIC_BRIEF_DRAFT_KEY,
  readPublicBriefDraft
} from "@/lib/brief-draft";
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
import { IconPaperclip, IconPen, IconBell } from "@/components/icons";
import { AuthScreen } from "@/components/portal/AuthScreen";
import { TransferModal } from "@/components/portal/TransferModal";
import { ProjectSwitcher } from "@/components/portal/ProjectSwitcher";
import { BriefPanel } from "@/components/portal/BriefPanel";
import { OfferPanel } from "@/components/portal/OfferPanel";
import { ContractPanel, contractPlainText } from "@/components/portal/ContractPanel";
import { DepositPaymentPanel } from "@/components/portal/DepositPaymentPanel";
import { BuildProgressPanel } from "@/components/portal/BuildProgressPanel";
import { ReviewFeedbackPanel } from "@/components/portal/ReviewFeedbackPanel";
import { LaunchedPanel } from "@/components/portal/LaunchedPanel";
import { ProjectInlineMessenger } from "@/components/portal/ProjectInlineMessenger";
import { ClosedProjectCard } from "@/components/portal/ClosedProjectCard";
import { HandoverPanel } from "@/components/portal/HandoverPanel";
import { ManagedWebsitePanel } from "@/components/portal/ManagedWebsitePanel";
import { PurchaseFlowPanel, type PurchaseBillingState } from "@/components/portal/PurchaseFlowPanel";
import { PurchaseHandoverPanel } from "@/components/portal/PurchaseHandoverPanel";
import { DomainAvailabilityPicker } from "@/components/portal/DomainAvailabilityPicker";
import { AssetLink, AssetImage } from "@/components/portal/AssetLink";
import { assetReference, parseAssetReference } from "@/lib/storage-assets";
import { isAllowedUpload, MAX_PROJECT_UPLOAD_BYTES, MAX_UPLOAD_BYTES } from "@/lib/upload-limits";
import { completeHandoverStep } from "@/lib/handover";
import { LOGO_DESIGN_PRICE, SUBSCRIPTION_PLANS, formatHuf, isWebsitePurchaseRequest, purchaseOptionPrice, subscriptionPlan, type CommercialModel, type SubscriptionPlanKey } from "@/lib/subscriptions";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";
import type { Project, Ticket, TicketMessage, ClientChangeRequest, WebsitePurchase } from "@/components/portal/types";
import type { WebsitePurchasePaymentMethod } from "@/lib/website-purchase";
import {
  audienceChips,
  briefSteps,
  buildBriefText,
  curatedFonts,
  featureChips,
  logoColorSourceOptions,
  logoStyleOptions,
  pageChips,
  paletteOptions,
  priorityLabels,
  projectTypeOptions,
  splitListValue,
  toggleLimitedListValue,
  toggleListValue,
  validateProjectStep,
  validationTargetFor,
  vibeOptions
} from "@/components/portal/brief-fields";
import {
  formatPrice,
  parseBrief,
  projectFlow,
  statusLabels,
  transferReference
} from "@/components/portal/format";

const initialProject = initialBriefForm;

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



const initialTicket = {
  body: "",
  projectId: "",
  subject: ""
};


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
  const [changeRequests, setChangeRequests] = useState<ClientChangeRequest[]>([]);
  const [websitePurchases, setWebsitePurchases] = useState<WebsitePurchase[]>([]);
  const [projectForm, setProjectForm] = useState(initialProject);
  const [projectStep, setProjectStep] = useState(0);
  const [projectSubmitted, setProjectSubmitted] = useState(false);
  const [briefConfirmed, setBriefConfirmed] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [submittedProjectTitle, setSubmittedProjectTitle] = useState("");
  const [submittedCommercialModel, setSubmittedCommercialModel] = useState<CommercialModel>("subscription");
  const [ticketForm, setTicketForm] = useState(initialTicket);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [reply, setReply] = useState("");
  const portalChatMessagesRef = useRef<HTMLDivElement>(null);
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketRatingComment, setTicketRatingComment] = useState("");
  const [notice, setNotice] = useState("");
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);

  // New state variables for upgraded project lifecycle flow
  const [editingBriefProjectId, setEditingBriefProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(initialProject);
  const [showPaymentModalProjectId, setShowPaymentModalProjectId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"deposit" | "final">("deposit");
  const [paymentError, setPaymentError] = useState("");
  // Csak a dupla beküldés ellen; a modál a `transferAlreadyReported` propból
  // tudja, mit mutasson.
  const [, setPaymentLoading] = useState(false);
  const [stripeLoadingProjectId, setStripeLoadingProjectId] = useState<string | null>(null);
  const [contractChecked, setContractChecked] = useState(false);
  const [performanceConsent, setPerformanceConsent] = useState(false);
  const [feedbackRoundNote, setFeedbackRoundNote] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: "", reference: false });
  const [modificationRequestText, setModificationRequestText] = useState("");
  const [showModificationRequestProjectId, setShowModificationRequestProjectId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [contentUploading, setContentUploading] = useState(false);
  const [validationTarget, setValidationTarget] = useState("");
  const [customFontOpen, setCustomFontOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [supportThreadOpen, setSupportThreadOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  /** Emailes jelszó-visszaállításról érkezett a felhasználó. */
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [recentlyClosedProjectId, setRecentlyClosedProjectId] = useState<string | null>(null);
  const [pendingBrandColor, setPendingBrandColor] = useState("#76ABAE");
  const [domainUpdateProjectId, setDomainUpdateProjectId] = useState<string | null>(null);
  const [domainUpdateName, setDomainUpdateName] = useState("");
  const [domainProofUrl, setDomainProofUrl] = useState("");
  const [domainProofUploading, setDomainProofUploading] = useState(false);
  const [handoverSaving, setHandoverSaving] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [publicBriefPending, setPublicBriefPending] = useState(false);
  const [publicBriefImported, setPublicBriefImported] = useState(false);

  const { toasts, pushToast, dismissToast } = useToasts();
  const { confirm, confirmModal } = useConfirm();
  const online = useOnline();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPublicBriefPending(params.get("brief") === "continue" || Boolean(readPublicBriefDraft(window.localStorage.getItem(PUBLIC_BRIEF_DRAFT_KEY))));
    const modelFromUrl = params.get("model");
    const planFromUrl = params.get("plan");
    if (modelFromUrl === "subscription" || modelFromUrl === "purchase") {
      window.sessionStorage.setItem("projectedge-commercial-choice", JSON.stringify({ model: modelFromUrl, plan: planFromUrl }));
    }
    let saved: { model?: string; plan?: string | null } = {};
    try {
      saved = JSON.parse(window.sessionStorage.getItem("projectedge-commercial-choice") || "{}");
    } catch {
      saved = {};
    }
    const model = modelFromUrl ?? saved.model ?? null;
    const plan = planFromUrl ?? saved.plan ?? null;
    if (model !== "subscription" && model !== "purchase") return;
    setProjectForm((current) => ({
      ...current,
      commercialModel: model,
      subscriptionPlan: SUBSCRIPTION_PLANS.some((item) => item.key === plan) ? (plan as SubscriptionPlanKey) : current.subscriptionPlan,
      domainStatus: model === "subscription" ? "need" : current.domainStatus,
      hostingAccess: model === "subscription" ? "managed" : current.hostingAccess,
      budget: model === "subscription" ? "subscription" : current.budget,
      ...(model === "subscription" ? { projectType: "", websiteStatus: "", website: "", existingPlatform: "", wpAccess: "", analyticsAccess: "", priority: "" } : {})
    }));
    setHomeView("new-brief");
    if (view === "dashboard") window.sessionStorage.removeItem("projectedge-commercial-choice");
  }, [view]);

  useEffect(() => {
    if (view !== "dashboard" || !userId || publicBriefImported) return;
    const saved = readPublicBriefDraft(window.localStorage.getItem(PUBLIC_BRIEF_DRAFT_KEY));
    if (!saved) return;
    setProjectForm((current) => ({ ...current, ...saved.data }));
    setProjectStep(4);
    setProjectSubmitted(false);
    setBriefConfirmed(false);
    setHomeView("new-brief");
    setPublicBriefImported(true);
    setNotice("A nyilvános brief válaszait betöltöttük. Egészítsd ki a privát anyagokkal, majd ellenőrzés után küldd be.");
  }, [publicBriefImported, userId, view]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment");
    const purchaseResult = params.get("purchase");
    const changePaymentResult = params.get("change_payment");
    if (!paymentResult && !purchaseResult && !changePaymentResult) return;
    setNotice(changePaymentResult
      ? changePaymentResult === "success"
        ? "A módosítás kártyás fizetése sikeres volt. A munka rövidesen elindul."
        : "A módosítás kártyás fizetését megszakítottad. Később újra folytathatod."
      : purchaseResult
      ? purchaseResult === "success"
        ? "A kártyás fizetés sikeres volt. A technikai átadási lista rövidesen megjelenik."
        : "A kártyás fizetést megszakítottad. A tulajdonba-vétel továbbra is folytatható."
      : paymentResult === "success"
        ? "A Stripe-fizetés sikeres. Az előfizetés állapota rövidesen automatikusan frissül."
        : "A fizetést megszakítottad; az előfizetés még nem indult el.");
    params.delete("payment");
    params.delete("purchase");
    params.delete("change_payment");
    window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
  }, []);

  async function openStripe(project: Project, endpoint: "checkout" | "portal") {
    setStripeLoadingProjectId(project.id);
    setPaymentError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("A munkamenet lejárt. Jelentkezz be újra.");
      const response = await fetch(`/api/stripe/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId: project.id })
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "A Stripe felülete nem nyitható meg.");
      window.location.assign(result.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "A Stripe felülete nem nyitható meg.");
      setStripeLoadingProjectId(null);
    }
  }

  useEffect(() => {
    if (!validationTarget) return;
    const currentMessage = validateProjectStep(projectStep, projectForm);
    if (!currentMessage || validationTargetFor(currentMessage) !== validationTarget) {
      setValidationTarget("");
      document.querySelectorAll(".validation-error").forEach((node) => node.classList.remove("validation-error"));
    }
  }, [projectForm, projectStep, validationTarget]);

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
      if (readPublicBriefDraft(window.localStorage.getItem(PUBLIC_BRIEF_DRAFT_KEY))) return;
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
  }, [projectForm, draftKey, projectSubmitted]);

  /**
   * A `targetEmail` szándékosan NEM megy át a szerverre: a címzettet a
   * `/api/notify` a hívó jogosultsága alapján állapítja meg. A paraméter csak
   * a hívási helyek olvashatóságát szolgálja.
   */
  async function triggerNotification(
    targetUserId: string | null,
    _targetEmail: string | null,
    title: string,
    message: string,
    link: string
  ) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ userId: targetUserId, title, message, link })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.emailSent === false) {
        const reason = typeof result.emailError === "string" ? ` (${result.emailError})` : "";
        console.error("A rendszerértesítés egyik kézbesítési csatornája hibázott.", result);
        setNotice(result.success === false && result.emailSent
          ? "Az email kiment, de az ügyfélkapus értesítést nem sikerült rögzíteni."
          : `Az ügyfélkapus értesítés rögzülhetett, de az email nem ment ki${reason}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Nem sikerült elküldeni a rendszer értesítést:", err);
      setNotice("Értesítés rögzítve, de az email szolgáltató nem volt elérhető.");
      return false;
    }
  }

  // Notification `link` values are historical DB data — old rows already
  // saved with #statuses/#projects/#support/#account/#notifications hashes
  // (from the old 6-tab layout) must keep resolving correctly indefinitely,
  // even though those tabs no longer exist as such.
  function openNotificationLink(link?: string | null) {
    if (link) {
      if (link.includes("#projects")) {
        setOpenPanel(null);
        setHomeView("new-brief");
      } else if (link.includes("#support")) {
        const ticketId = link.match(/#support:([a-f0-9-]+)/i)?.[1];
        if (ticketId) {
          setActiveTicketId(ticketId);
          setSupportThreadOpen(true);
        }
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

  async function markNotificationAsRead(id: string, link?: string | null) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    openNotificationLink(link);
  }

  const latestUnreadNotification = notifications.find((item) => !item.read) ?? null;

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
    if (!newPassword || newPassword.length < 10) {
      setNotice("A jelszónak legalább 10 karakterből kell állnia.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setNotice("A jelszó tartalmazzon betűt és számot is.");
      return;
    }
    // Újrahitelesítés: a jelszócsere elfogadott munkamenettel is csak a
    // jelenlegi jelszó ismeretében mehet, különben egy őrizetlenül hagyott
    // böngészőnél bárki átvehetné a fiókot.
    //
    // KIVÉTEL a jelszó-visszaállítás: aki emailes recovery linkről érkezik,
    // épp azért van itt, mert NEM tudja a régi jelszavát. Ott a linkből
    // származó munkamenet maga a bizonyíték.
    if (!recoveryMode) {
      if (!currentPassword) {
        setNotice("A biztonság kedvéért add meg a jelenlegi jelszavadat is.");
        return;
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) {
        setNotice("A jelenlegi jelszó nem megfelelő.");
        return;
      }
    }
    setNotice("Módosítás...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setNotice(`Jelszócsere sikertelen: ${error.message}`);
    } else {
      setNewPassword("");
      setCurrentPassword("");
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
  const highlightedClosedProject = closedProjects.find((project) => project.id === recentlyClosedProjectId && project.commercial_model !== "subscription" && Boolean(project.warranty_started_at || project.final_payment_paid_at || project.final_payment_paid))
    ?? closedProjects.find((project) => project.commercial_model !== "subscription" && Boolean(project.warranty_started_at || project.final_payment_paid_at || project.final_payment_paid) && !project.client_rating)
    ?? null;

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

  const selectedWebsitePurchase = selectedProject
    ? websitePurchases.find((purchase) => purchase.project_id === selectedProject.id && !["completed", "declined", "cancelled"].includes(purchase.status)) ?? null
    : null;

  const selectedProjectTypeLabels = splitListValue(projectForm.projectType)
    .map((value) => projectTypeOptions.find(([option]) => option === value)?.[1])
    .filter(Boolean);
  const selectedVibe = vibeOptions.find(([value]) => value === projectForm.vibe) ?? vibeOptions[0];
  const selectedPalette = paletteOptions.find(([value]) => value === projectForm.palette) ?? paletteOptions[0];
  const activePaletteColors =
    projectForm.palette === "custom"
      ? [projectForm.customBg, projectForm.customAccent, projectForm.customText, projectForm.customCta]
      : selectedPalette[2];
  const briefProgress = Math.round(((projectStep + 1) / briefSteps.length) * 100);
  const displayedBriefSteps = projectForm.commercialModel === "subscription"
    ? ["Csomag és márka", "Cél és ügyfél", "Csomagtartalom", "Megjelenés", "Induló anyagok", "Ellenőrzés"]
    : briefSteps;

  function revealValidation(message: string) {
    const target = validationTargetFor(message);
    setNotice(message);
    setValidationTarget(target);
    if (!target) return;
    window.setTimeout(() => {
      document.querySelectorAll(".validation-error").forEach((node) => node.classList.remove("validation-error"));
      const element = document.getElementById(target);
      element?.classList.add("validation-error");
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = element?.matches("input,textarea,select,button")
        ? element
        : element?.querySelector<HTMLElement>("input,textarea,select,button");
      focusable?.focus({ preventScroll: true });
    }, 80);
  }

  function moveToProjectStep(nextStep: number) {
    const target = Math.max(0, Math.min(briefSteps.length - 1, nextStep));
    if (target > projectStep) {
      for (let step = projectStep; step < target; step += 1) {
        const validationMessage = validateProjectStep(step, projectForm);
        if (validationMessage) {
          setProjectStep(step);
          revealValidation(validationMessage);
          return;
        }
      }
    }
    setNotice("");
    setValidationTarget("");
    document.querySelectorAll(".validation-error").forEach((node) => node.classList.remove("validation-error"));
    setProjectStep(target);
  }

  function validateAllProjectSteps() {
    for (let step = 0; step < briefSteps.length - 1; step += 1) {
      const validationMessage = validateProjectStep(step, projectForm);
      if (validationMessage) {
        setProjectStep(step);
        revealValidation(validationMessage);
        return false;
      }
    }
    return true;
  }

  async function ensureClientProfile(sessionUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }) {
    const userEmail = sessionUser.email ?? "";
    const metadataName =
      typeof sessionUser.user_metadata?.full_name === "string"
        ? sessionUser.user_metadata.full_name
        : typeof sessionUser.user_metadata?.name === "string"
          ? sessionUser.user_metadata.name
          : "";

    await supabase.from("client_profiles").upsert(
      {
        email: userEmail,
        full_name: metadataName || userEmail,
        id: sessionUser.id
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    // Értesítés küldése az adminnak az új regisztrációról (a végpont deduplikál)
    if (sessionUser.id && userEmail) {
      void fetch("/api/auth/register-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: sessionUser.id,
          email: userEmail,
          name: metadataName || userEmail
        })
      }).catch(() => {});
    }
  }

  useEffect(() => {
    // Check if recovery link is used
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("type=recovery") || search.includes("reset=true")) {
        setRecoveryMode(true);
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
      void ensureClientProfile(sessionUser);
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
        void ensureClientProfile(sessionUser);
        if (view === "auth") {
          window.location.href = "/ugyfelkapu/dashboard";
          return;
        }

        loadPortal(false, sessionUser.id);
      } else {
        setProjects([]);
        setWebsitePurchases([]);
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

  useEffect(() => {
    if (supportThreadOpen && portalChatMessagesRef.current) {
      portalChatMessagesRef.current.scrollTo({
        top: portalChatMessagesRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, supportThreadOpen, activeTicketId]);

  async function loadPortal(silent = false, uid?: string) {
    if (!silent) {
      setLoading(true);
    }

    const resolvedUid = uid ?? userId;
    const [
      { data: projectData, error: projectError },
      { data: ticketData, error: ticketError },
      { data: profileData },
      { data: notificationData },
      { data: changeRequestData },
      { data: websitePurchaseData }
    ] = await Promise.all([
      supabase.from("client_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("client_tickets").select("*").order("last_message_at", { ascending: false }),
      resolvedUid
        ? supabase.from("client_profiles").select("full_name").eq("id", resolvedUid).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("change_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("website_purchases").select("*").order("created_at", { ascending: false })
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
    setChangeRequests(changeRequestData ?? []);
    setWebsitePurchases((websitePurchaseData ?? []) as WebsitePurchase[]);
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
      void fetch("/api/auth/register-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          email: authForm.email,
          name: authForm.name || authForm.email
        })
      }).catch(() => {});
    }

    if (data.session) {
      window.location.href = "/ugyfelkapu/dashboard";
      return;
    }

    setCanResendConfirmation(true);
    setNotice("Fiók kész. Hamarosan kaphatsz egy megerősítő emailt — nézd meg a Spam/Promóciók mappát is, ha nem találod.");
  }

  async function continueWithGoogle() {
    setNotice("Átirányítás a Google biztonságos belépési oldalára...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          prompt: "select_account"
        },
        redirectTo: `${window.location.origin}/ugyfelkapu/dashboard`
      }
    });

    if (error) {
      setNotice(`A Google-belépés most nem indítható el: ${error.message}`);
    }
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

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setNotice("A logó PNG, JPG, WEBP vagy PDF lehet, legfeljebb 20 MB méretben.");
      return;
    }

    setLogoUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    // Ugyanazt a privát, már a képekhez és dokumentumokhoz is használt
    // bucketet használjuk. A külön client-logos bucket több telepítésben nem
    // létezett, ezért a brief egyetlen feltöltése következetesen elhasalt.
    const assetPath = `${userId}/logo-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("client-assets").upload(assetPath, file);
    if (uploadError) {
      setLogoUploading(false);
      setNotice(`Nem sikerült feltölteni a logót: ${uploadError.message}`);
      return;
    }

    // Privát bucket (018-as migráció): az útvonalat tároljuk, a megnyitás
    // signed URL-lel történik (lib/storage-assets.ts).
    const previousLogo = projectForm.logoUrl;
    setProjectForm((current) => ({ ...current, logoUrl: assetReference("client-assets", assetPath) }));
    if (previousLogo) await deleteDraftAsset(previousLogo);
    setLogoUploading(false);
    setNotice("Logó sikeresen feltöltve.");
  }

  async function uploadProjectPhotos(files: File[]) {
    if (!userId || files.length === 0) return;
    const imageTypes = ["image/png", "image/jpeg", "image/webp"];
    const images = files.filter((file) => imageTypes.includes(file.type) && file.size <= MAX_UPLOAD_BYTES);
    if (images.length !== files.length) {
      setNotice("Csak JPG, PNG vagy WEBP kép tölthető fel, fájlonként legfeljebb 20 MB méretben.");
      return;
    }
    if (images.reduce((total, file) => total + file.size, 0) > MAX_PROJECT_UPLOAD_BYTES) {
      setNotice("A kiválasztott képek összmérete legfeljebb 250 MB lehet.");
      return;
    }
    setAssetUploading(true);
    const uploaded: string[] = [];
    for (const file of images) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage.from("client-assets").upload(path, file);
      if (error) {
        await Promise.all(uploaded.map(deleteDraftAsset));
        setAssetUploading(false);
        setNotice("Az egyik kép feltöltése nem sikerült. Próbáld újra.");
        return;
      }
      uploaded.push(assetReference("client-assets", path));
    }
    setProjectForm((current) => ({ ...current, photoUrls: [...current.photoUrls, ...uploaded] }));
    setAssetUploading(false);
    setNotice(`${uploaded.length} kép sikeresen feltöltve.`);
  }

  async function deleteDraftAsset(value: string) {
    const asset = parseAssetReference(value);
    if (!asset || !userId || !asset.path.startsWith(`${userId}/`)) return;
    await supabase.storage.from(asset.bucket).remove([asset.path]);
  }

  async function removeProjectPhoto(value: string) {
    await deleteDraftAsset(value);
    setProjectForm((current) => ({ ...current, photoUrls: current.photoUrls.filter((item) => item !== value) }));
  }

  async function uploadContentFiles(files: File[]) {
    if (!userId || files.length === 0) return;
    const allowed = files.filter(isAllowedUpload);
    if (allowed.length !== files.length) {
      setNotice("Csak PDF, JPG, PNG, WEBP, DOCX, XLSX vagy ZIP tölthető fel, fájlonként legfeljebb 20 MB méretben.");
      return;
    }
    if (allowed.reduce((total, file) => total + file.size, 0) > MAX_PROJECT_UPLOAD_BYTES) {
      setNotice("A kiválasztott fájlok összmérete legfeljebb 250 MB lehet.");
      return;
    }
    setContentUploading(true);
    const uploaded: string[] = [];
    for (const file of allowed) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${userId}/copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage.from("client-assets").upload(path, file);
      if (error) {
        await Promise.all(uploaded.map(deleteDraftAsset));
        setContentUploading(false);
        setNotice("A szöveges anyag feltöltése nem sikerült. Próbáld újra.");
        return;
      }
      uploaded.push(assetReference("client-assets", path));
    }
    setProjectForm((current) => ({
      ...current,
      contentFileUrls: [...current.contentFileUrls, ...uploaded]
    }));
    setContentUploading(false);
    setNotice(`${uploaded.length} szöveges fájl sikeresen feltöltve.`);
  }

  async function uploadDomainProof(file: File) {
    if (!userId) return;
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setNotice("A domain igazolása PNG, JPG, WEBP vagy PDF lehet, legfeljebb 20 MB méretben.");
      return;
    }
    setDomainProofUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${userId}/domain-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("client-assets").upload(path, file);
    if (error) {
      setNotice("A domain igazolásának feltöltése nem sikerült.");
      setDomainProofUploading(false);
      return;
    }
    // A domain-igazoláson tulajdonosi adatok (név, cím, telefon) szerepelnek,
    // ezért privát bucketbe kerül, és csak signed URL-lel nyitható meg.
    setDomainProofUrl(assetReference("client-assets", path));
    setDomainProofUploading(false);
    setNotice("A domain igazolása feltöltve.");
  }

  async function submitPurchasedDomain(project: Project) {
    const domain = domainUpdateName.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain || !domain.includes(".")) {
      setNotice("Írd be a megvásárolt domain nevét, például: vallalkozasod.hu.");
      return;
    }
    if (!domainProofUrl) {
      setNotice("Tölts fel egy képet vagy PDF-et az aktív domain státuszáról.");
      return;
    }
    const briefData = {
      ...(project.brief_data ?? {}),
      domainName: domain,
      domainProofUrl,
      domainPurchaseState: "submitted"
    };
    const { error } = await supabase
      .from("client_projects")
      .update({
        brief_data: briefData,
        next_step: "A domain adatait elküldted. Most az adminisztrátor ellenőrzi, majd megadja a pontos DNS-beállításokat."
      })
      .eq("id", project.id);
    if (error) {
      setNotice("A domain adatainak elküldése nem sikerült.");
      return;
    }
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, brief_data: briefData, next_step: "A domain adatait elküldted. Most az adminisztrátor ellenőrzi, majd megadja a pontos DNS-beállításokat." } : item));
    setDomainUpdateProjectId(null);
    setDomainUpdateName("");
    setDomainProofUrl("");
    setNotice("A domain adatait elküldtük. Most az adminisztrátoron a sor.");
    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Domain adatok érkeztek",
      `Az ügyfél (${email}) elküldte a(z) ${domain} domain adatait a(z) "${project.title}" projekthez.`,
      "/admin"
    );
  }

  /**
   * Egy átadási lépés lezárása az ügyfél oldaláról.
   *
   * A sorrendet és a felelőst a lib/handover.ts ellenőrzi, az adatbázisban pedig
   * a 019-es migráció triggere is: az ügyfél nem tudja kipipálni a mi
   * lépéseinket, tehát nem lehet a felületet megkerülve „kész" állapotba vinni
   * az átadást.
   */
  async function completeClientHandoverStep(project: Project, stepId: string, value: string) {
    const result = completeHandoverStep(project.handover_steps, stepId, "client", value);
    if (result.error) {
      setNotice(result.error);
      return;
    }

    setHandoverSaving(true);
    const { error } = await supabase
      .from("client_projects")
      .update({ handover_steps: result.steps })
      .eq("id", project.id);
    setHandoverSaving(false);

    if (error) {
      setNotice("Nem sikerült rögzíteni a lépést. Próbáld újra.");
      return;
    }

    setProjects((current) =>
      current.map((item) => (item.id === project.id ? { ...item, handover_steps: result.steps } : item))
    );
    setNotice("Lépés rögzítve. Köszönjük!");

    const completed = result.steps.find((step) => step.id === stepId);
    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Átadási lépés kész",
      `Az ügyfél (${email}) elvégzett egy átadási lépést a(z) "${project.title}" projektben.${
        completed?.value ? `\n\nMegadott adat: ${completed.value}` : ""
      }`,
      "/admin"
    );
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || projectSaving) {
      return;
    }

    if (projectStep !== briefSteps.length - 1) {
      moveToProjectStep(projectStep + 1);
      return;
    }
    if (!briefConfirmed) {
      setNotice("A beküldés előtt erősítsd meg, hogy ellenőrizted az adatlapot.");
      return;
    }

    if (!validateAllProjectSteps()) {
      return;
    }

    setProjectSaving(true);
    setNotice("Projekt mentése...");

    const detailedGoals = buildBriefText(projectForm);
    const selectedSubscription = subscriptionPlan(projectForm.subscriptionPlan);
    const isSubscription = projectForm.commercialModel === "subscription";

    const { error } = await supabase.from("client_projects").insert({
      budget: projectForm.budget,
      company: projectForm.company || null,
      contact_email: email,
      contact_name: profileName || email,
      goals: detailedGoals,
      project_type: isSubscription ? `managed-${selectedSubscription.key}` : projectForm.projectType,
      title: isSubscription ? `${projectForm.company} · ${selectedSubscription.name}` : projectForm.title,
      user_id: userId,
      website: isSubscription ? null : projectForm.website || null,
      brief_data: projectForm,
      commercial_model: projectForm.commercialModel,
      subscription_plan: isSubscription ? selectedSubscription.key : null,
      monthly_price: isSubscription ? selectedSubscription.price : null,
      subscription_status: isSubscription ? "agreement_pending" : null,
      status: isSubscription ? "contract_pending" : "request_received",
      offer_title: isSubscription ? `${selectedSubscription.name} menedzselt weboldal` : null,
      offer_summary: isSubscription ? selectedSubscription.short : null,
      offer_scope: isSubscription ? selectedSubscription.features.join("\n") : null,
      offer_price: isSubscription ? selectedSubscription.price : null,
      offer_currency: "Ft",
      offer_status: isSubscription ? "accepted" : "draft",
      deposit_amount: isSubscription ? selectedSubscription.price : null,
      purchase_option_price: isSubscription ? purchaseOptionPrice(selectedSubscription.key) : null,
      next_step: isSubscription ? "Olvasd el és fogadd el a menedzselt weboldal szolgáltatási szerződését." : null,
      // logo_url mező csak a 011-es migráció után létezik — csak akkor
      // küldjük, ha tényleg van feltöltött logó (ami maga is csak a
      // migráció lefuttatása után lehetséges), így addig nem töri el a
      // sima projekt-beküldést azoknál, akik nem töltenek fel logót.
      ...(projectForm.logoUrl ? { logo_url: projectForm.logoUrl } : {})
    });

    if (error) {
      setProjectSaving(false);
      setNotice("Nem sikerült elindítani a projektet.");
      return;
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Új projektindító adatlap",
      `Új ${isSubscription ? `${selectedSubscription.name} előfizetés` : "projektindító adatlap"} érkezett: "${isSubscription ? projectForm.company : projectForm.title}" az ügyféltől (${email}).`,
      "/admin"
    );

    await triggerNotification(
      userId,
      email,
      "Projektindító adatlap beküldve",
      isSubscription ? `A(z) "${projectForm.company}" menedzselt weboldal igényét rögzítettük. Következő lépés a szolgáltatási szerződés elfogadása.` : `A(z) "${projectForm.title}" projektindító adatlapját sikeresen rögzítettük. Az adminisztrátor hamarosan elkészíti az ajánlatot.`,
      "/ugyfelkapu/dashboard#projects"
    );

    try {
      if (draftKey) window.localStorage.removeItem(draftKey);
      window.localStorage.removeItem(PUBLIC_BRIEF_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setSubmittedCommercialModel(projectForm.commercialModel);
    setProjectForm(initialProject);
    setBriefConfirmed(false);
    setProjectSaving(false);
    setProjectSubmitted(true);
    // Google Ads konverzió: innen tudja a licitálás, melyik hirdetés hozott érdeklődőt
    trackLeadConversion(isSubscription ? selectedSubscription.price : undefined);
    setSubmittedProjectTitle(isSubscription ? `${projectForm.company} · ${selectedSubscription.name}` : projectForm.title);
    setNotice(isSubscription ? "A menedzselt weboldal adatlapja elkészült. Következő lépés a szolgáltatási szerződés." : "Elmentettük és elküldtük a tervet. Hamarosan jelentkezünk a következő lépésekkel.");
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
    for (let step = 0; step < 4; step += 1) {
      const validationMessage = validateProjectStep(step, editForm);
      if (validationMessage) {
        setNotice(validationMessage);
        return;
      }
    }
    setNotice("Projektindító adatlap módosításainak mentése...");
    
    // Ugyanaz a builder, mint a beküldésnél — így a szerkesztés nem törli ki a
    // szerkesztőben nem szerkeszthető sorokat (domain, logó, szövegek, kapcsolat,
    // számlázás), amelyeket az admin nézete ebből a szövegből olvas.
    const newDetailedGoals = buildBriefText(editForm);

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
      setNotice("Nem sikerült elmenteni a projektindító adatlap módosításait.");
      return;
    }

    if (logs.length > 0) {
      await supabase.from("project_change_logs").insert(logs);
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Projektindító adatlap módosítva",
      `Az ügyfél (${email}) módosította a projektindító adatlapot a(z) "${project.title}" projektben. Változások száma: ${logs.length}.`,
      "/admin"
    );

    await triggerNotification(
      userId,
      email,
      "Projektindító adatlap módosítva",
      `Sikeresen elmentetted a projektindító adatlap módosításait a(z) "${editForm.title}" projektben.`,
      "/ugyfelkapu/dashboard#projects"
    );

    setEditingBriefProjectId(null);
    setNotice("Projektindító adatlap sikeresen módosítva.");
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

  async function markDepositTransferSent(project: Project) {
    if (project.deposit_transfer_reported) return;
    setPaymentLoading(true);
    setPaymentError("");

    const amount = formatPrice(project.deposit_amount, project.offer_currency || "Ft");
    const reference = transferReference(project);
    const managed = project.commercial_model === "subscription";
    const paymentName = managed ? "első havidíj" : "foglaló";

    const { error } = await supabase.from("client_projects").update({
      deposit_transfer_reported: true,
      next_step: `Jelezted, hogy elindítottad a(z) ${amount} összegű ${paymentName} utalását (közlemény: ${reference}). Ellenőrzöm a bankszámlát, és amint megérkezett, jóváhagyom — utána indul a kivitelezés.`
    }).eq("id", project.id);

    setPaymentLoading(false);
    if (error) {
      setPaymentError("Nem sikerült rögzíteni a jelzést. Próbáld újra, vagy írj az info@projectedge.hu címre.");
    } else {
      setShowPaymentModalProjectId(null);
      setNotice("Jeleztük, hogy elindítottad az utalást. Amint megérkezik, jóváhagyjuk és folytatjuk.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        `${managed ? "Első havidíj" : "Foglaló"} utalása bejelentve`,
        `Az ügyfél (${email}) jelezte, hogy elindította a(z) ${amount} összegű ${paymentName} utalását a(z) "${project.title}" projekthez. Közlemény: ${reference}. Ellenőrizd a bankszámlát, és hagyd jóvá az admin felületen.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Utalás jelezve",
        `Jeleztük, hogy elindítottad a(z) ${paymentName} utalását a(z) "${project.title}" projekthez. Amint megérkezik, jóváhagyjuk, és indul a kivitelezés.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function markFinalTransferSent(project: Project) {
    if (project.final_transfer_reported) return;
    setPaymentLoading(true);
    setPaymentError("");

    const amount = formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft");
    const reference = transferReference(project);

    const { error } = await supabase.from("client_projects").update({
      final_transfer_reported: true,
      next_step: `Jelezted, hogy elindítottad a(z) ${amount} hátralék utalását (közlemény: ${reference}). Ellenőrzöm a bankszámlát, és amint megérkezett, jóváhagyom, majd élesítjük az oldalt.`
    }).eq("id", project.id);

    setPaymentLoading(false);
    if (error) {
      setPaymentError("Nem sikerült rögzíteni a jelzést. Próbáld újra, vagy írj az info@projectedge.hu címre.");
    } else {
      setShowPaymentModalProjectId(null);
      setNotice("Jeleztük, hogy elindítottad az utalást. Amint megérkezik, jóváhagyjuk.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Hátralék utalás bejelentve",
        `Az ügyfél (${email}) jelezte, hogy elindította a(z) ${amount} hátralék utalását a(z) "${project.title}" projekthez. Közlemény: ${reference}. Ellenőrizd a bankszámlát, és hagyd jóvá az admin felületen.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Utalás jelezve",
        `Jeleztük, hogy elindítottad a hátralék utalását a(z) "${project.title}" projekthez. Amint megérkezik, jóváhagyjuk.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      loadPortal(true);
    }
  }

  async function acceptContract(project: Project) {
    if (!contractChecked) {
      setNotice("Az aláíráshoz el kell fogadnod a szerződést és az ÁSZF-et.");
      return;
    }
    if (!performanceConsent) {
      setNotice("Jelöld be a teljesítés megkezdésére vonatkozó nyilatkozatot is.");
      return;
    }
    setNotice("Szerződés elfogadása...");
    const managed = project.commercial_model === "subscription";
    const { error } = await supabase.from("client_projects").update({
      contract_accepted: true,
      contract_accepted_at: new Date().toISOString(),
      status: "deposit_pending",
      ...(managed ? { subscription_status: "first_payment_pending" } : {}),
      next_step: managed ? "Szolgáltatási szerződés elfogadva. Fizesd be az első havidíjat a weboldal elkészítésének indításához." : "Szerződés aláírva! Kérlek, fizesd be a foglalót a kivitelezés elindításához."
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült elfogadni a szerződést.");
    } else {
      setContractChecked(false);
      setPerformanceConsent(false);
      setNotice(managed ? "Szerződés elfogadva. Következő lépés: az első havidíj." : "Szerződés aláírva. Következő lépés: a foglaló befizetése.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Szerződés aláírva",
        `Az ügyfél (${email}) elfogadta a ${managed ? "szolgáltatási" : "vállalkozási"} szerződést a(z) "${project.title}" projekthez. ${managed ? "Első havidíj" : "Foglaló"} befizetésére vár.`,
        "/admin"
      );
      await triggerNotification(
        userId,
        email,
        "Szerződés aláírva",
        `Elfogadtad a szerződést a(z) "${project.title}" projekthez ${new Date().toLocaleString("hu-HU")} időpontban. Következő lépésként fizesd be ${managed ? "az első havidíjat" : "a foglalót"} a kivitelezés elindításához.\n\nAz elfogadott szerződés változatlan szövege:\n\n${contractPlainText(project)}`,
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

  async function closeCompletedProject(project: Project) {
    const ok = await confirm({
      title: "Projekt lezárása",
      message: "A projekt elkészült. A lezárással elindul a 30 napos díjmentes technikai garancia.",
      confirmLabel: "Projekt lezárása",
      cancelLabel: "Mégse"
    });
    if (!ok) return;
    setNotice("Projekt lezárása...");
    const { error } = await supabase.rpc("close_completed_project", { project_id: project.id });
    if (error) {
      setNotice("Nem sikerült elmenteni a döntést.");
    } else {
      setRecentlyClosedProjectId(project.id);
      setNotice("A projekt lezárult. A 30 napos technikai garancia aktív.");
      await triggerNotification(
        null,
        "admin@projectedge.hu",
        "Projekt lezárva",
        `Az ügyfél (${email}) lezárta a(z) "${project.title}" projektet. A 30 napos technikai garancia az utolsó igazolt átadási lépéstől számít.`,
        "/admin"
      );
      await triggerNotification(userId, email, "Projekt sikeresen lezárva",
        `Köszönjük az együttműködést! A(z) "${project.title}" projektet sikeresen lezártuk.\n\nAz utolsó igazolt technikai átadási lépéstől számított 30 napig díjmentes technikai garanciát biztosítunk az általunk elkészített működésre. Ha hibát találsz, jelentsd az ügyfélkapuban.`,
        "/ugyfelkapu/dashboard#statuses");
      loadPortal(true);
    }
  }

  async function requestSubscriptionState(project: Project, action: "pause" | "resume" | "cancel") {
    const copy = action === "pause"
      ? { title: "Weboldal szüneteltetése", message: "A jelenlegi időszak végén az oldal parkolóállapotba kerül. A domain és a rendszer 2 900 Ft/hó díj mellett megmarad.", status: "pause_requested", field: "pause_requested_at" }
      : action === "resume"
        ? { title: "Weboldal újraaktiválása", message: "Elküldjük az újraaktiválási kérelmet. Az adminisztrátor ellenőrzi és visszakapcsolja az oldalt.", status: "resume_requested", field: "resume_requested_at" }
        : { title: "Előfizetés lemondása", message: "A weboldal a kifizetett időszak végén leáll. A már kifizetett havidíj nem visszatéríthető.", status: "cancel_requested", field: "subscription_cancel_requested_at" };
    const ok = await confirm({ title: copy.title, message: copy.message, confirmLabel: "Kérelem elküldése", cancelLabel: "Mégse", danger: action === "cancel" });
    if (!ok) return;
    if (action === "cancel" && project.stripe_subscription_id) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setNotice("A munkamenet lejárt. Jelentkezz be újra."); return; }
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId: project.id, action: "cancel" })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setNotice(result.error || "A lemondás nem sikerült."); return; }
    }
    const now = new Date().toISOString();
    const { error } = action === "cancel" && project.stripe_subscription_id
      ? { error: null }
      : await supabase.from("client_projects").update({ subscription_status: copy.status, [copy.field]: now }).eq("id", project.id);
    if (error) { setNotice("A kérést nem sikerült elküldeni."); return; }
    await triggerNotification(null, "admin@projectedge.hu", copy.title, `Az ügyfél (${email}) elküldte a kérelmet: ${project.title}.`, "/admin");
    await triggerNotification(
      userId,
      email,
      `${copy.title} — kérelem rögzítve`,
      action === "cancel"
        ? `A(z) "${project.title}" előfizetés lemondási kérelmét rögzítettük. A weboldal a kifizetett időszak végén áll le; ez nem projektátadás, és nem indít technikai garanciát.`
        : `A(z) "${project.title}" szolgáltatáshoz tartozó kérelmedet rögzítettük. Az adminisztrátor feldolgozza, az eredményről új értesítést kapsz.`,
      "/ugyfelkapu/dashboard#statuses"
    );
    setNotice("A kérelmet elküldtük. Hamarosan visszajelzünk.");
    loadPortal(true);
  }

  async function startWebsitePurchase(project: Project) {
    setPurchaseBusy(true);
    setNotice("A tulajdonba-vételi folyamat indítása...");
    try {
      const { data, error } = await supabase.rpc("create_website_purchase", { p_project_id: project.id });
      if (error || !data) {
        setNotice(error?.message || "A tulajdonba-vételi folyamatot nem sikerült elindítani.");
        return;
      }
      setWebsitePurchases((current) => [data as WebsitePurchase, ...current.filter((item) => item.id !== (data as WebsitePurchase).id)]);
      await triggerNotification(null, "admin@projectedge.hu", "Új tulajdonba-vételi igény", `Az ügyfél (${email}) elindította a(z) „${project.title}” weboldal tulajdonba-vételi folyamatát. Készítsd elő az átadási és fizetési összefoglalót.`, "/admin");
      setNotice("A folyamat elindult. Amint elkészülnek a fizetési adatok, itt folytathatod.");
      await loadPortal(true);
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function createChangeRequest(project: Project, category: string, description: string) {
    const { error } = await supabase.from("change_requests").insert({ project_id: project.id, user_id: userId, category, description });
    if (error) { setNotice("A módosítási kérést nem sikerült elküldeni."); return; }
    await triggerNotification(null, "admin@projectedge.hu", "Új weboldal-módosítás", `Új kérés érkezett a(z) „${project.title}” menedzselt weboldalhoz.`, "/admin");
    setNotice("A módosítási kérést elküldtük.");
  }

  async function selectWebsitePurchasePayment(purchaseId: string, method: WebsitePurchasePaymentMethod): Promise<boolean> {
    setPurchaseBusy(true);
    try {
      const { data, error } = await supabase.rpc("set_website_purchase_payment_method", { p_purchase_id: purchaseId, p_payment_method: method });
      if (error) { setNotice(error.message || "A fizetési mód mentése nem sikerült."); return false; }
      if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchaseId ? data as WebsitePurchase : item));
      return Boolean(data);
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function saveWebsitePurchaseBilling(purchaseId: string, billing: PurchaseBillingState): Promise<boolean> {
    setPurchaseBusy(true);
    try {
      const { data, error } = await supabase.rpc("update_website_purchase_billing", {
        p_purchase_id: purchaseId,
        p_name: billing.name,
        p_email: billing.email,
        p_country: billing.country,
        p_postal_code: billing.postalCode,
        p_city: billing.city,
        p_address: billing.address,
        p_tax_number: billing.taxNumber
      });
      if (error) { setNotice(error.message || "A számlázási adatok mentése nem sikerült."); return false; }
      if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchaseId ? data as WebsitePurchase : item));
      setNotice("A számlázási adatokat elmentettük.");
      return Boolean(data);
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function startWebsitePurchaseCardPayment(purchaseId: string) {
    setPurchaseBusy(true);
    setNotice("A biztonságos fizetési oldal megnyitása...");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) { setNotice("A munkameneted lejárt. Jelentkezz be újra."); return; }
      const response = await fetch("/api/stripe/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ purchaseId })
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) { setNotice(result.error || "A kártyás fizetési oldal nem nyitható meg."); return; }
      window.location.assign(result.url);
    } catch {
      setNotice("A kártyás fizetési oldal most nem érhető el.");
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function reportWebsitePurchaseTransferV2(purchaseId: string) {
    const ok = await confirm({
      title: "Átutalás jelzése",
      message: "Csak akkor jelöld késznek, ha a vételárat ténylegesen elutaltad a megadott közleménnyel.",
      confirmLabel: "Elutaltam",
      cancelLabel: "Mégse"
    });
    if (!ok) return;
    setPurchaseBusy(true);
    try {
      const { data, error } = await supabase.rpc("report_website_purchase_transfer_v2", { p_purchase_id: purchaseId });
      if (error) { setNotice(error.message || "Az átutalás jelzését nem sikerült menteni."); return; }
      if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchaseId ? data as WebsitePurchase : item));
      setNotice("Az utalást jeleztük. Az adminisztrátor ellenőrzi a beérkezést.");
      await triggerNotification(null, "admin@projectedge.hu", "Tulajdonba-vételi utalás ellenőrzése", `Az ügyfél (${email}) jelezte a weboldal vételárának átutalását. Ellenőrizd a bankszámlát.`, "/admin");
      await loadPortal(true);
    } finally {
      setPurchaseBusy(false);
    }
  }

  /**
   * Döntés egy kereten felüli módosítás ajánlatáról.
   *
   * Mindhárom lépés `security definer` adatbázis-függvényen megy át (032), mert
   * az ügyfél a pénzügyi mezőkhöz közvetlenül nem nyúlhat — a `guard_change_
   * request_write` trigger az ilyen írást elutasítja.
   */
  async function decideChangeQuote(project: Project, requestId: string, decision: "accept" | "decline" | "transfer") {
    if (decision === "decline") {
      const ok = await confirm({
        title: "Ajánlat elutasítása",
        message: "Biztosan nem kéred ezt a módosítást? A kérés lezárul, de bármikor küldhetsz újat.",
        confirmLabel: "Nem kérem",
        cancelLabel: "Mégis meggondolom"
      });
      if (!ok) return;
    }
    if (decision === "transfer") {
      const ok = await confirm({
        title: "Utalás jelzése",
        message: "Csak akkor jelezd, ha az utalást ténylegesen elindítottad. A közleményt pontosan add meg, hogy be tudjuk azonosítani.",
        confirmLabel: "Elutaltam",
        cancelLabel: "Mégse"
      });
      if (!ok) return;
    }

    let error: { message?: string } | null = null;
    if (decision === "transfer") {
      const methodResult = await supabase.rpc("set_change_request_payment_method", {
        request_id: requestId,
        p_payment_method: "bank_transfer"
      });
      if (!methodResult.error) {
        const transferResult = await supabase.rpc("report_change_transfer", { request_id: requestId });
        error = transferResult.error;
      } else {
        error = methodResult.error;
      }
    } else {
      const rpc = decision === "accept" ? "accept_change_quote" : "decline_change_quote";
      error = (await supabase.rpc(rpc, { request_id: requestId })).error;
    }
    if (error) {
      setNotice(error.message || "A művelet most nem hajtható végre.");
      return;
    }

    const titles = {
      accept: "Ajánlat elfogadva",
      decline: "Ajánlat elutasítva",
      transfer: "Utalás jelezve"
    } as const;
    await triggerNotification(
      null,
      "admin@projectedge.hu",
      titles[decision],
      `A(z) „${project.title}" projekt egyik módosítási ajánlatánál az ügyfél lépett: ${titles[decision].toLowerCase()}.`,
      "/admin"
    );
    setNotice(decision === "accept"
      ? "Elfogadtad az ajánlatot. A fizetési adatok most megjelentek a kérésnél."
      : decision === "decline"
        ? "Az ajánlatot elutasítottuk, a kérés lezárult."
        : "Jeleztük az utalást. Az összeg beérkezése után indul a munka.");
    await loadPortal(true);
  }

  async function startChangeRequestCardPayment(requestId: string) {
    setNotice("A módosítás biztonságos fizetési oldalának megnyitása...");
    const methodResult = await supabase.rpc("set_change_request_payment_method", {
      request_id: requestId,
      p_payment_method: "card"
    });
    if (methodResult.error) {
      setNotice(methodResult.error.message || "A kártyás fizetési mód mentése nem sikerült.");
      return;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setNotice("A munkameneted lejárt. Jelentkezz be újra.");
      return;
    }
    try {
      const response = await fetch("/api/stripe/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ requestId })
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setNotice(result.error || "A kártyás fizetési oldal nem nyitható meg.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setNotice("A módosítás kártyás fizetése most nem érhető el.");
    }
  }

  /** Új üzenet a kérés beszélgetésében — a stúdió kap róla értesítést. */
  async function notifyThreadMessage(project: Project) {
    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Új üzenet egy módosítási kérésnél",
      `Az ügyfél üzenetet írt a(z) „${project.title}" projekt egyik kérésénél.`,
      "/admin"
    );
  }

  async function approveReview(project: Project) {
    setNotice("Jóváhagyás mentése...");
    const { error } = await supabase.from("client_projects").update({
      review_approved: true,
      next_step: "Jóváhagytad az elkészült oldalt. Most az adminisztrátor végzi az élesítést; addig nincs teendőd."
    }).eq("id", project.id);
    if (error) {
      setNotice("Nem sikerült menteni a jóváhagyást.");
      return;
    }
    await triggerNotification(null, "admin@projectedge.hu", "Ügyfél jóváhagyta az oldalt",
      `Az ügyfél (${email}) jóváhagyta a(z) "${project.title}" projektet. Az oldal élesíthető.`, "/admin");
    setNotice("Jóváhagyva. Most az adminisztrátoron a sor.");
    loadPortal(true);
  }

  async function submitProjectReview(project: Project, rating: number, review: string, referencePermitted: boolean) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setNotice("Válassz 1 és 5 közötti értékelést.");
      return;
    }
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

    if (!ticketForm.subject.trim() || !ticketForm.body.trim()) {
      setNotice("A tárgy és az üzenet megadása kötelező.");
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

  async function sendReply(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    const text = reply.trim();
    if (!activeTicket || !text || !userId || activeTicket.status === "closed") {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: TicketMessage = {
      id: optimisticId,
      body: text,
      created_at: new Date().toISOString(),
      sender: "customer",
      ticket_id: activeTicket.id,
      user_id: userId
    };

    // Instant UI update (0ms lag)
    setMessages((current) => ({
      ...current,
      [activeTicket.id]: [...(current[activeTicket.id] ?? []), optimisticMessage]
    }));
    setReply("");

    const { data: inserted, error } = await supabase
      .from("client_ticket_messages")
      .insert({
        body: text,
        sender: "customer",
        ticket_id: activeTicket.id,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      setNotice("Nem sikerült elküldeni az üzenetet.");
      return;
    }

    if (inserted) {
      setMessages((current) => ({
        ...current,
        [activeTicket.id]: (current[activeTicket.id] ?? []).map((m) =>
          m.id === optimisticId ? inserted : m
        )
      }));
    }

    await triggerNotification(
      null,
      "admin@projectedge.hu",
      "Új ticket üzenet",
      `Új üzenet érkezett az ügyféltől (${email}) a(z) "${activeTicket.subject}" tickethez.`,
      "/admin"
    );
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

        {/* Csak a domain beszerzésének idején van itt helye: élesítés után az
            átadási panel veszi át, törlési kérelem alatt pedig a sárga sáv a
            fókusz. Korábban a „Domain elküldve" blokk hónapokkal az élesítés
            után is a kártya tetején maradt. */}
        {project.commercial_model !== "subscription" && project.brief_data?.domainStatus === "need" &&
        !project.delete_requested &&
        ["request_received", "planning", "offer_sent", "contract_pending", "deposit_pending", "in_progress", "review"].includes(
          project.status
        ) ? (
          <section className="project-domain-action">
            <div className="project-domain-action-copy">
              <span className="micro-label">Domain következő lépés</span>
              {project.brief_data.domainPurchaseState === "submitted" ? (
                <>
                  <h4>Domain elküldve: {project.brief_data.domainName}</h4>
                  <p>Az igazolást megkaptuk. Most az adminisztrátor ellenőrzi, majd az átadási listában megadja a szükséges DNS-rekordokat.</p>
                  {project.brief_data.domainProofUrl ? (
                    <AssetLink label="Feltöltött igazolás megnyitása" value={project.brief_data.domainProofUrl} />
                  ) : null}
                </>
              ) : (
                <>
                  <h4>Ha megvetted a domaint, itt küldd el.</h4>
                  <p>A briefet ettől még beküldheted. Vásárlás után add meg a domain nevét és tölts fel egy képet az aktív státuszról.</p>
                </>
              )}
            </div>
            {project.brief_data.domainPurchaseState !== "submitted" ? (
              <button
                className="button secondary compact-action"
                type="button"
                onClick={() => {
                  setDomainUpdateProjectId((current) => current === project.id ? null : project.id);
                  setDomainUpdateName(project.brief_data?.domainName ?? "");
                  setDomainProofUrl(project.brief_data?.domainProofUrl ?? "");
                }}
              >
                Domain adatok elküldése
              </button>
            ) : <span className="sent-state">✓ Elküldve</span>}
            {domainUpdateProjectId === project.id ? (
              <div className="project-domain-submit">
                <label>
                  <span>Megvásárolt domain</span>
                  <input value={domainUpdateName} onChange={(event) => setDomainUpdateName(event.target.value)} placeholder="vallalkozasod.hu" />
                </label>
                <div className="asset-uploader">
                  <label htmlFor={`domain-proof-${project.id}`}>
                    <strong>{domainProofUploading ? "Feltöltés..." : domainProofUrl ? "✓ Igazolás feltöltve" : "Aktív státusz feltöltése"}</strong>
                    <span>PNG, JPG, WEBP vagy PDF · legfeljebb 10 MB</span>
                  </label>
                  <input
                    id={`domain-proof-${project.id}`}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,image/*,application/pdf"
                    disabled={domainProofUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadDomainProof(file);
                      event.target.value = "";
                    }}
                  />
                </div>
                <button className="button primary compact-action" type="button" onClick={() => submitPurchasedDomain(project)}>
                  Domain beküldése
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="project-status-head">
          <div>
            <strong>{project.title}</strong>
            <small>{project.project_type} · {project.commercial_model === "subscription" ? `${subscriptionPlan(project.subscription_plan).name} · ${formatHuf(project.monthly_price ?? subscriptionPlan(project.subscription_plan).price)}/hó` : project.budget || "büdzsé nélkül"}</small>
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
                      <span className="stepper-label">{project.commercial_model === "subscription" && value === "deposit_pending" ? "Első havidíj" : project.commercial_model === "subscription" && value === "launched" ? "Aktív" : label}</span>
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
            paymentStarting={stripeLoadingProjectId === project.id}
            onStartPayment={() => project.commercial_model === "subscription"
              ? openStripe(project, "checkout")
              : (setPaymentMode("deposit"), setShowPaymentModalProjectId(project.id), setPaymentError(""))}
          />
        )}

        {project.status === "contract_pending" && (
          <ContractPanel
            project={project}
            contractChecked={contractChecked}
            onContractCheckedChange={setContractChecked}
            performanceConsent={performanceConsent}
            onPerformanceConsentChange={setPerformanceConsent}
            onAccept={() => acceptContract(project)}
          />
        )}

        <BuildProgressPanel project={project} />

        {project.status === "review" && (
          project.review_approved ? null : <>
            <ReviewFeedbackPanel
              project={project}
              feedbackRoundNote={feedbackRoundNote}
              onFeedbackRoundNoteChange={setFeedbackRoundNote}
              onSubmit={() => submitFeedback(project, feedbackRoundNote)}
            />
            <button className="button primary" type="button" onClick={() => approveReview(project)}>
              Minden rendben, jóváhagyom
            </button>
          </>
        )}

        {/* A lépések a kivitelezés indulásától látszanak, amint az admin
            kijelölte a projekt összetevőit. Ez szándékos: fiók létrehozása és
            meghívás nélkül nem lehet élesíteni, tehát ezeknek az élesítés ELŐTT
            kell megtörténniük. Az ajánlat előtt viszont nem jelenik meg, mert
            akkor még nincs se szerződés, se eldöntött technikai összetétel. */}
        {project.commercial_model !== "subscription" && project.commercial_model !== "purchase" && ["in_progress", "review", "launched"].includes(project.status) &&
        (project.handover_steps?.length ?? 0) > 0 && (
          <HandoverPanel
            project={project}
            busy={handoverSaving}
            onCompleteStep={(stepId, value) => completeClientHandoverStep(project, stepId, value)}
          />
        )}

        {project.commercial_model === "purchase" && selectedWebsitePurchase ? (
          <PurchaseHandoverPanel
            project={project}
            purchase={selectedWebsitePurchase}
            busy={handoverSaving || purchaseBusy}
            onCompleteStep={(stepId, value) => void completeClientHandoverStep(project, stepId, value)}
            onClose={() => void closeCompletedProject(project)}
          />
        ) : null}

        {project.commercial_model === "subscription" && (project.status === "launched" || project.status === "paused") ? (
          <>
            <ManagedWebsitePanel project={project} requests={changeRequests.filter((request) => request.project_id === project.id && !isWebsitePurchaseRequest(request.description))} onPause={() => requestSubscriptionState(project, "pause")} onResume={() => requestSubscriptionState(project, "resume")} onCancel={() => requestSubscriptionState(project, "cancel")} onManageBilling={() => openStripe(project, "portal")} onRequestChange={async (category, description) => { await createChangeRequest(project, category, description); await loadPortal(true); }} onQuoteDecision={(requestId, decision) => decideChangeQuote(project, requestId, decision)} onQuoteCardPayment={startChangeRequestCardPayment} onThreadMessage={() => notifyThreadMessage(project)} />
            <PurchaseFlowPanel
              key={`${project.id}-${selectedWebsitePurchase?.id ?? "new"}`}
              project={project}
              purchase={selectedWebsitePurchase}
              busy={handoverSaving || purchaseBusy}
              onStart={() => startWebsitePurchase(project)}
              onSelectPayment={(method) => selectedWebsitePurchase ? selectWebsitePurchasePayment(selectedWebsitePurchase.id, method) : Promise.resolve(false)}
              onSaveBilling={(billing) => selectedWebsitePurchase ? saveWebsitePurchaseBilling(selectedWebsitePurchase.id, billing) : Promise.resolve(false)}
              onStartCardPayment={() => selectedWebsitePurchase ? startWebsitePurchaseCardPayment(selectedWebsitePurchase.id) : Promise.resolve()}
              onReportTransfer={() => selectedWebsitePurchase ? reportWebsitePurchaseTransferV2(selectedWebsitePurchase.id) : Promise.resolve()}
            />
          </>
        ) : project.commercial_model !== "subscription" && project.commercial_model !== "purchase" && project.status === "launched" ? (
          <LaunchedPanel project={project} onPayFinal={() => { setPaymentMode("final"); setShowPaymentModalProjectId(project.id); setPaymentError(""); }} onCloseProject={() => closeCompletedProject(project)} />
        ) : null}

        {project.status !== "closed" && (
          <ProjectInlineMessenger
            project={project}
            tickets={tickets}
            messages={messages}
            userId={userId || null}
            userEmail={email || project.contact_email || ""}
            userName={profileName || project.contact_name || email || ""}
            onRefresh={() => void loadPortal(true)}
          />
        )}

        {project.commercial_model !== "subscription" && !project.delete_requested && project.status !== "closed" && (
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
    return (
      <AuthScreen
        authForm={authForm}
        canResendConfirmation={canResendConfirmation}
        consentChecked={consentChecked}
        forgotPasswordEmail={forgotPasswordEmail}
        mode={mode}
        notice={notice}
        showForgotPassword={showForgotPassword}
        showPassword={showPassword}
        publicBriefPending={publicBriefPending}
        onAuthFormChange={setAuthForm}
        onConsentChange={setConsentChecked}
        onForgotPasswordEmailChange={setForgotPasswordEmail}
        onModeChange={setMode}
        onNoticeChange={setNotice}
        onResendConfirmation={resendConfirmation}
        onShowForgotPasswordChange={setShowForgotPassword}
        onShowPasswordChange={setShowPassword}
        onSubmitAuth={submitAuth}
        onSubmitForgotPassword={submitForgotPassword}
        onContinueWithGoogle={continueWithGoogle}
      />
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

      {latestUnreadNotification ? (
        <aside className="portal-unread-alert" aria-live="polite">
          <span className="portal-unread-alert-dot" aria-hidden="true" />
          <div>
            <small>ÚJ ÉRTESÍTÉS</small>
            <strong>{latestUnreadNotification.title}</strong>
            <p>{latestUnreadNotification.message}</p>
          </div>
          <button
            className="portal-unread-alert-open"
            type="button"
            onClick={() => openNotificationLink(latestUnreadNotification.link)}
          >
            Megnyitás
          </button>
          <button
            className="portal-unread-alert-close"
            type="button"
            aria-label="Értesítés bezárása"
            onClick={() => markNotificationAsRead(latestUnreadNotification.id)}
          >
            ×
          </button>
        </aside>
      ) : null}

      <OfflineBanner online={online} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {confirmModal}

      {!loading && projects.length === 0 && !projectSubmitted && (
        <div className="portal-welcome">
          <div className="portal-welcome-text">
            <span className="micro-label">Üdvözlünk a fedélzeten</span>
            <h2>Örülünk, hogy itt vagy{profileName ? `, ${profileName}` : ""}!</h2>
            <p>
            Indítsd el az első projektindító adatlapodat pár perc alatt. Onnantól minden itt fut össze:
              az ajánlat, a fizetés, a fejlesztési mérföldkövek, az előnézeti link és a support — egy helyen.
            </p>
          </div>
          <button className="button primary" type="button" onClick={() => setHomeView("new-brief")}>
            Projektindító adatlap indítása →
          </button>
        </div>
      )}


      {homeView === "new-brief" ? (
        <div className="project-studio-layout">
          <section className="project-wizard-card">
            <div className="wizard-topline">
              <div>
                <span>Projektindító adatlap</span>
                <h2>{projectSubmitted ? "Terv elküldve" : displayedBriefSteps[projectStep]}</h2>
              </div>
              <strong>{projectSubmitted ? "Kész" : `${briefProgress}%`}</strong>
            </div>
            {projectSubmitted ? (
              <div className="wizard-success">
                <div className="success-mark">✓</div>
                <span>Elmentettük és elküldtük</span>
                <h3>{submittedProjectTitle || "A projektterv"}</h3>
                <p>
                  {submittedCommercialModel === "subscription"
                    ? "A választott csomagot és az új weboldalhoz szükséges adatokat rögzítettük. Nincs külön ajánlati kör: a következő lépés a szolgáltatási szerződés, majd az első havidíj."
                    : "Köszönöm, megkaptam az adatlapot. Átnézem a célokat, a funkciókat és a vizuális irányt, majd a következő lépéseket és az ajánlatot itt fogod látni a dashboardban."}
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
                  {displayedBriefSteps.map((step, index) => (
                    <button
                      className={index === projectStep ? "active" : index < projectStep ? "done" : ""}
                      key={step}
                      onClick={() => moveToProjectStep(index)}
                      type="button"
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {step}
                    </button>
                  ))}
                </div>
                <form className="wizard-form" onSubmit={createProject} onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.target as HTMLElement).tagName !== "TEXTAREA") event.preventDefault();
                }}>
                  <div className="wizard-slide" key={projectStep}>
                {projectStep === 0 ? (
                  <>
                    {/* NINCS konstrukcióválasztás a lap tetején.
                        Két egyforma doboz akkor is két terméknek látszik, ha az
                        egyik már nem „weboldal vásárlás", hanem egyedi projekt.
                        Az alapértelmezés a bérlés; az egyedi projekt egy halk
                        kiút a csomagválasztó alatt, azoknak, akiknek olyan kell,
                        amit tényleg nem lehet bérelni. */}
                    {projectForm.commercialModel === "purchase" ? (
                      <div className="brief-custom-mode">
                        <div>
                          <span>EGYEDI PROJEKT</span>
                          <strong>Egyszeri fejlesztés, egyedi ajánlattal</strong>
                          <p>Webapp, ügyfélkapu vagy meglévő oldal átalakítása. A brief kérdései ehhez igazodnak.</p>
                        </div>
                        <button
                          className="brief-mode-switch"
                          type="button"
                          onClick={() => setProjectForm((current) => ({ ...current, commercialModel: "subscription", domainStatus: "need", hostingAccess: "managed", budget: "subscription", projectType: "", websiteStatus: "", website: "", existingPlatform: "", wpAccess: "", analyticsAccess: "", priority: "" }))}
                        >
                          Mégis havidíjas weboldalt szeretnék →
                        </button>
                      </div>
                    ) : null}
                    {projectForm.commercialModel === "subscription" ? (
                      <section className="brief-plan-picker" aria-labelledby="brief-plan-title">
                        <header className="brief-plan-head">
                          <div><span>02 / HAVI CSOMAG</span><h3 id="brief-plan-title">Mekkora weboldalra van szükséged?</h3></div>
                          <p>A havidíj fix. Induló díj nincs, és bármelyik hónapban lemondhatod.</p>
                        </header>
                        <div className="brief-plan-list">
                          {SUBSCRIPTION_PLANS.map((plan) => {
                            const selected = projectForm.subscriptionPlan === plan.key;
                            return (
                              <button
                                aria-pressed={selected}
                                className={`${selected ? "selected" : ""} ${plan.featured ? "recommended" : ""}`}
                                key={plan.key}
                                type="button"
                                onClick={() => setProjectForm((current) => ({ ...current, subscriptionPlan: plan.key, pages: "", features: "" }))}
                              >
                                <span className="brief-plan-radio" aria-hidden="true"><i /></span>
                                <span className="brief-plan-name">{plan.name}{plan.featured ? <em>Legnépszerűbb</em> : null}</span>
                                <strong>{new Intl.NumberFormat("hu-HU").format(plan.price)} Ft<small>/hó</small></strong>
                                <p>{plan.short}</p>
                                <span className="brief-plan-scope"><b>{plan.pages}</b><b>{plan.changes}</b></span>
                              </button>
                            );
                          })}
                        </div>
                        <footer><span>✓ Domain, hosting és SSL</span><span>✓ Technikai felügyelet</span><span>✓ Nincs hűségidő</span></footer>
                      </section>
                    ) : null}
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
                    {projectForm.commercialModel === "subscription" ? (
                      <div className="managed-brand-start">
                        <span>01 / A PROJEKT ALAPJAI</span>
                        <div className="field">
                          <label htmlFor="project-company">Mi a vállalkozásod vagy márkád neve?</label>
                          <input id="project-company" required value={projectForm.company} onChange={(event) => setProjectForm((current) => ({ ...current, company: event.target.value }))} placeholder="Például: Kovács Épületgépészet" />
                        </div>
                        <div className="field" style={{ marginTop: "12px" }}>
                          <label>Milyen projektről van szó?</label>
                          <div className="choice-grid compact">
                            <button
                              className={projectForm.websiteStatus !== "yes" ? "selected" : ""}
                              onClick={() => setProjectForm((current) => ({ ...current, websiteStatus: "no", website: "", domainStatus: "need" }))}
                              type="button"
                            >
                              <strong>Új weboldalt indítok</strong>
                            </button>
                            <button
                              className={projectForm.websiteStatus === "yes" ? "selected" : ""}
                              onClick={() => setProjectForm((current) => ({ ...current, websiteStatus: "yes", domainStatus: "keep" }))}
                              type="button"
                            >
                              <strong>Meglévő weboldal felújítása</strong>
                            </button>
                          </div>
                        </div>
                        {projectForm.websiteStatus === "yes" ? (
                          <div className="field" style={{ marginTop: "12px" }}>
                            <label htmlFor="project-website">Jelenlegi weboldalad címe (URL)</label>
                            <input
                              id="project-website"
                              value={projectForm.website}
                              onChange={(event) => setProjectForm((current) => ({ ...current, website: event.target.value }))}
                              placeholder="https://kovacsklima.hu"
                            />
                            <div style={{ marginTop: "8px" }}>
                              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                                Mi történjen a meglévő domainnel?
                              </span>
                              <div className="choice-grid compact">
                                <button
                                  className={projectForm.domainStatus === "keep" ? "selected" : ""}
                                  onClick={() => setProjectForm((current) => ({ ...current, domainStatus: "keep" }))}
                                  type="button"
                                >
                                  <strong>Megtartom a jelenlegi domaint</strong>
                                </button>
                                <button
                                  className={projectForm.domainStatus === "need" ? "selected" : ""}
                                  onClick={() => setProjectForm((current) => ({ ...current, domainStatus: "need" }))}
                                  type="button"
                                >
                                  <strong>Új domaint szeretnék</strong>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : <>
                      <div className="field">
                        <label htmlFor="project-title">Mi legyen a projekt neve?</label>
                        <input id="project-title" required value={projectForm.title} onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))} placeholder="Például: új weboldal, redesign, ügyfélkapu..." />
                      </div>
                      <div className="wizard-two"><div className="field">
                        <label htmlFor="project-company">Cég / márka</label>
                        <input
                          id="project-company"
                          required
                          value={projectForm.company}
                          onChange={(event) => setProjectForm((current) => ({ ...current, company: event.target.value }))}
                          placeholder="Vállalkozás neve"
                        />
                      </div><div className={`field ${validationTarget === "website-status" || validationTarget === "project-website" ? "validation-error" : ""}`} id="website-status">
                        <label>Van már működő weboldalad?</label>
                        <div className="choice-grid compact website-status-choices">
                          <button
                            className={projectForm.websiteStatus === "yes" ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, websiteStatus: "yes" }))}
                            type="button"
                          ><strong>Igen</strong></button>
                          <button
                            className={projectForm.websiteStatus === "no" ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, websiteStatus: "no", website: "", existingPlatform: "", wpAccess: "", analyticsAccess: "" }))}
                            type="button"
                          ><strong>Nem</strong></button>
                        </div>
                        {projectForm.websiteStatus === "yes" ? (
                          <input
                            id="project-website"
                            value={projectForm.website}
                            onChange={(event) => setProjectForm((current) => ({ ...current, website: event.target.value }))}
                            placeholder="https://..."
                          />
                        ) : null}
                      </div></div>
                      <p className="multi-select-hint">Többet is kijelölhetsz.</p>
                      <div id="project-types" className={`choice-grid ${validationTarget === "project-types" ? "validation-error" : ""}`}>
                      {projectTypeOptions.map(([value, label, description]) => (
                        <button
                          className={splitListValue(projectForm.projectType).includes(value) ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, projectType: toggleListValue(current.projectType, value) }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>{description}</span>
                        </button>
                      ))}
                      </div>
                    </>}
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
                        {(projectForm.commercialModel === "subscription"
                          ? projectForm.subscriptionPlan === "presence"
                            ? ["Profi online névjegy", "Egy szolgáltatás bemutatása", "Könnyű kapcsolatfelvétel"]
                            : projectForm.subscriptionPlan === "business"
                              ? ["Több ajánlatkérés", "Szolgáltatások bemutatása", "Nagyobb bizalom", "Mérhető érdeklődők"]
                              : ["Összetett ajánlatkérés", "Online időpontfoglalás", "Több szolgáltatás bemutatása", "Automatizált érdeklődőszerzés"]
                          : ["Több megkeresés, érdeklődő", "Professzionálisabb megjelenés", "Online időpontfoglalás", "Szolgáltatások bemutatása", "Online értékesítés"]).map((chip) => (
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
                        required
                        value={projectForm.audience}
                        onChange={(event) => setProjectForm((current) => ({ ...current, audience: event.target.value }))}
                        placeholder="Kattints a fenti gombokra, vagy pontosítsd szabadon..."
                      />
                    </div>
                    {projectForm.commercialModel === "subscription" ? <div className="field" id="primary-action">
                      <label>Mi legyen az oldal legfontosabb gombja?</label>
                      <div className="choice-grid compact">
                        {(projectForm.subscriptionPlan === "custom" ? ["Ajánlatot kérek", "Időpontot foglalok", "Visszahívást kérek", "Feliratkozom"] : ["Ajánlatot kérek", "Kapcsolatfelvétel", "Telefonálok", "Időpontot kérek"]).map((action) => <button className={projectForm.primaryAction === action ? "selected" : ""} key={action} onClick={() => setProjectForm((current) => ({ ...current, primaryAction: action }))} type="button"><strong>{action}</strong></button>)}
                      </div>
                    </div> : <><p className="multi-select-hint">Többet is kijelölhetsz.</p>
                    <div id="project-priorities" className={`choice-grid compact ${validationTarget === "project-priorities" ? "validation-error" : ""}`}>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <button
                          className={splitListValue(projectForm.priority).includes(value) ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, priority: toggleListValue(current.priority, value) }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                        </button>
                      ))}
                    </div></>}
                  </>
                ) : null}

                {projectStep === 2 ? (
                  <>
                    {projectForm.commercialModel === "subscription" ? (
                      <div className="plan-scope-banner">
                        <div><span>VÁLASZTOTT KERET</span><strong>{subscriptionPlan(projectForm.subscriptionPlan).name}</strong></div>
                        <p><b>{subscriptionPlan(projectForm.subscriptionPlan).pages}</b><b>{subscriptionPlan(projectForm.subscriptionPlan).changes}</b><small>A kereten túli funkciót is megjelölheted; arra külön ajánlatot kapsz, mielőtt elkészülne.</small></p>
                      </div>
                    ) : null}
                    <div className="wizard-visual structure">
                      <div>Főoldal</div>
                      <div>Ajánlatkérés</div>
                      <div>Admin</div>
                      <div>Automatizmus</div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-pages">{projectForm.commercialModel === "subscription" ? subscriptionPlan(projectForm.subscriptionPlan).pageQuestion : "Milyen oldalak kellenek?"}</label>
                      <div className="quick-chips">
                        {(projectForm.commercialModel === "subscription" ? subscriptionPlan(projectForm.subscriptionPlan).pageOptions : pageChips).map((chip) => (
                          <button
                            className={splitListValue(projectForm.pages).includes(chip) ? "active" : ""}
                            key={chip}
                            onClick={() => setProjectForm((current) => ({ ...current, pages: projectForm.commercialModel === "subscription" ? toggleLimitedListValue(current.pages, chip, current.subscriptionPlan === "presence" ? 7 : current.subscriptionPlan === "business" ? 5 : 10) : toggleListValue(current.pages, chip) }))}
                            type="button"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="project-pages"
                        required
                        value={projectForm.pages}
                        onChange={(event) => setProjectForm((current) => ({ ...current, pages: event.target.value }))}
                        placeholder={projectForm.commercialModel === "subscription" ? "Jelöld ki a csomag keretén belüli tartalmakat, és itt pontosíthatsz..." : "Kattints a fenti gombokra, vagy sorold fel szabadon..."}
                      />
                      {projectForm.commercialModel === "subscription" ? <small className="plan-selection-count">{splitListValue(projectForm.pages).length} kiválasztva · maximum {projectForm.subscriptionPlan === "presence" ? 7 : projectForm.subscriptionPlan === "business" ? 5 : 10}</small> : null}
                    </div>
                    <div className="field">
                      <label htmlFor="project-features">{projectForm.commercialModel === "subscription" ? subscriptionPlan(projectForm.subscriptionPlan).featureQuestion : "Milyen funkciókat szeretnél?"}</label>
                      <div className="quick-chips">
                        {(projectForm.commercialModel === "subscription" ? subscriptionPlan(projectForm.subscriptionPlan).featureOptions : featureChips).map((chip) => (
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
                        required
                        value={projectForm.features}
                        onChange={(event) => setProjectForm((current) => ({ ...current, features: event.target.value }))}
                        placeholder={projectForm.commercialModel === "subscription" ? "Jelöld ki, amit a választott csomagból használni szeretnél..." : "Kattints a fenti gombokra, vagy írd le szabadon, mire van szükséged..."}
                      />
                    </div>
                    {projectForm.commercialModel === "purchase" ? <div className="field">
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
                    </div> : <div className="managed-brief-note"><span>✓</span><p><strong>Az árat már tudod.</strong>A {subscriptionPlan(projectForm.subscriptionPlan).name} csomag díja {new Intl.NumberFormat("hu-HU").format(subscriptionPlan(projectForm.subscriptionPlan).price)} Ft/hó, külön induló költség nélkül.</p></div>}
                  </>
                ) : null}

                {projectStep === 3 ? (
                  <>
                    <div className="choice-grid vibe-grid" id="project-vibe">
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
                    <div className="palette-grid" id="project-palette">
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
                      <label htmlFor="project-style">Van konkrét stílus, példa vagy tiltólista? <span className="optional-label">Nem kötelező</span></label>
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
                      Ezekre azért van szükségem, hogy gördülékenyen tudjunk indulni. Minden blokkban
                      válassz egy lehetőséget vagy adj meg egy rövid információt; amit később pontosítunk,
                      azt írd be így: „később” vagy „rátok bízom”.
                    </p>

                    {projectForm.commercialModel === "subscription" ? (
                      <div className="managed-domain-brief">
                        <div className="managed-domain-orbit"><span>URL</span><i /><i /><i /></div>
                        <div><span className="micro-label dark">Élő domainkereső</span><h4>Válaszd ki az egyetlen webcímed</h4><p>Mi ellenőrizzük, regisztráljuk, megújítjuk és technikailag kezeljük. Nem kell három ötletet beküldened vagy külön regisztrátori fiókot nyitnod.</p>
                          <DomainAvailabilityPicker value={projectForm.domainName} onChange={(domainName) => setProjectForm((current) => ({ ...current, domainName }))} />
                        </div>
                      </div>
                    ) : <>
                    {/* Domain */}
                    <div className="field" id="domain-status">
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
                            required
                            value={projectForm.domainName}
                            onChange={(event) => setProjectForm((current) => ({ ...current, domainName: event.target.value }))}
                            placeholder="vallalkozas.hu"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="hosting-access">Tárhely / domain hozzáférés</label>
                          <select
                            id="hosting-access"
                            required
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
                      <div className="domain-help-card">
                        <img className="domain-guide-cover" src="/guides/domain-guide-cover.png" alt="Rackhost domainvásárlási útmutató borítója" />
                        <div className="domain-help-copy">
                          <span className="micro-label">Rackhost · teljes vásárlási útmutató</span>
                          <h4>Vásárlás képernyőről képernyőre</h4>
                          <p>Rövid, képes útmutató a kereséstől az aktív domainig. A briefet most is beküldheted; a megvásárolt domainhez külön beküldőgomb jelenik meg a projektednél.</p>
                          <a className="domain-guide-button" href="/guides/projectedge-domainvasarlas-rackhost.pdf" target="_blank" rel="noreferrer">
                            PDF megnyitása <span>↗</span>
                          </a>
                        </div>
                        <div className="domain-guide-summary">
                          <strong>Vásárlás után a projektednél küldöd el:</strong>
                          <span>domainnév + aktív státusz képe</span>
                          <span>jelszó és bankkártyaadat nélkül</span>
                        </div>
                      </div>
                    ) : null}
                    </>}

                    {/* Meglévő oldal — csak ha megadott weboldalt */}
                    {projectForm.websiteStatus === "yes" && projectForm.website.trim() ? (
                      <div className="field" id="existing-platform">
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
                    {projectForm.websiteStatus === "yes" && projectForm.existingPlatform === "wordpress" ? (
                      <div className="field">
                        <label htmlFor="wp-access">Tudsz WordPress admin hozzáférést adni? (a tartalom átemeléséhez)</label>
                        <select
                          id="wp-access"
                          required
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
                    <div className="field" id="logo-status">
                      <label>Van logód?</label>
                      <div className="choice-grid compact">
                        {[
                          ["yes", "Igen, van logóm"],
                          ["no", "Nincs logóm"]
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
                    {/* A logótervezés igénye mindkét konstrukciónál kérhető.
                        Korábban csak vásárlásnál jelent meg, így egy bérlő
                        ügyfél sehol nem tudta jelezni, hogy szeretne logót. */}
                    {projectForm.logoStatus === "no" ? (
                      <div className="field" id="logo-design">
                        <label>Kérsz logótervezést?</label>
                        <div className="choice-grid compact">
                          <button
                            className={projectForm.wantLogoDesign === "yes" ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, wantLogoDesign: "yes" }))}
                            type="button"
                          >
                            <strong>Igen, kérek</strong>
                            <span>
                              {formatHuf(LOGO_DESIGN_PRICE)} egyszeri felár.{" "}
                              {projectForm.commercialModel === "subscription"
                                ? "A projekt indításakor kapsz rá fizetési adatokat — előtte semmi nem terhel."
                                : "Az ajánlatban külön tételként szerepel."}
                            </span>
                          </button>
                          <button
                            className={projectForm.wantLogoDesign === "no" ? "selected" : ""}
                            onClick={() => setProjectForm((current) => ({ ...current, wantLogoDesign: "no", logoStyle: "", logoColorSource: "", logoBrief: "" }))}
                            type="button"
                          >
                            <strong>Egyelőre nem</strong>
                            <span>Letisztult szöveges márkanevet készítek, felár nélkül.</span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {projectForm.logoStatus === "no" && projectForm.wantLogoDesign === "yes" ? (
                      <>
                        <div className="field">
                          <label>Milyen típusú logót szeretnél?</label>
                          <div className="choice-grid compact">
                            {logoStyleOptions.map(([value, label, hint]) => (
                              <button
                                key={value}
                                className={projectForm.logoStyle === value ? "selected" : ""}
                                onClick={() => setProjectForm((current) => ({ ...current, logoStyle: value }))}
                                type="button"
                              >
                                <strong>{label}</strong>
                                <span>{hint}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="field">
                          <label>Milyen színekkel dolgozzak?</label>
                          <div className="quick-chips">
                            {logoColorSourceOptions.map(([value, label]) => (
                              <button
                                key={value}
                                className={projectForm.logoColorSource === value ? "active" : ""}
                                onClick={() => setProjectForm((current) => ({ ...current, logoColorSource: value }))}
                                type="button"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="field">
                          <label htmlFor="logo-brief">Mit jelenítsen meg, és mit kerüljek el?</label>
                          <textarea
                            id="logo-brief"
                            value={projectForm.logoBrief}
                            onChange={(event) => setProjectForm((current) => ({ ...current, logoBrief: event.target.value }))}
                            placeholder="Pl.: valami villanyszereléshez kapcsolódó, de ne legyen villámjel. Ha a Külön megadom színt választottad, ide írd a színeket is."
                          />
                        </div>
                      </>
                    ) : null}
                    {projectForm.logoStatus === "yes" ? (
                      <div className="field">
                        <label htmlFor="logo-upload">Töltsd fel a logódat</label>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
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
                              <span className="logo-preview-chip"><IconPaperclip size={16} /> Fájl csatolva</span>
                            ) : (
                              <AssetImage value={projectForm.logoUrl} alt="Feltöltött logó előnézet" />
                            )}
                            <span>Sikeresen feltöltve — bármikor cserélheted.</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Arculat */}
                    <div className="field" id="brand-colors">
                      <label htmlFor="brand-colors-text">Van márkaszíned / színkódod?</label>
                      <div className="brand-color-builder">
                        <input
                          id="brand-colors-text"
                          required
                          value={projectForm.brandColors}
                          onChange={(event) => setProjectForm((current) => ({ ...current, brandColors: event.target.value }))}
                          placeholder="Például: #1E2329, sötétzöld, arany — vagy írd: rátok bízom"
                        />
                        <div className="brand-color-swatches">
                          {projectForm.brandColors
                            .split(",")
                            .map((color) => color.trim())
                            .filter((color) => /^#[0-9a-f]{6}$/i.test(color))
                            .filter((color, index, colors) => colors.indexOf(color) === index)
                            .map((color) => (
                              <button
                                className="brand-color-chip"
                                key={color}
                                style={{ background: color }}
                                title={`${color} eltávolítása`}
                                type="button"
                                onClick={() => setProjectForm((current) => ({
                                  ...current,
                                  brandColors: current.brandColors
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter((item) => item.toUpperCase() !== color.toUpperCase())
                                    .join(", ")
                                }))}
                              >
                                <span>×</span>
                              </button>
                            ))}
                          <div className="brand-color-add">
                            <input
                              type="color"
                              aria-label="Márkaszín kiválasztása"
                              value={pendingBrandColor}
                              onChange={(event) => setPendingBrandColor(event.target.value.toUpperCase())}
                            />
                            <code>{pendingBrandColor}</code>
                            <button
                              type="button"
                              onClick={() => {
                                const next = pendingBrandColor.toUpperCase();
                                setProjectForm((current) => {
                                  const colors = current.brandColors.split(",").map((item) => item.trim()).filter(Boolean);
                                  return {
                                    ...current,
                                    brandColors: colors.some((item) => item.toUpperCase() === next)
                                      ? colors.join(", ")
                                      : [...colors, next].join(", ")
                                  };
                                });
                              }}
                            >
                              Hozzáadás
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="field" id="font-preference">
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
                          <span className="font-sample" aria-hidden="true"><IconPen size={26} /></span>
                          <strong>Egyéb</strong>
                          <span className="font-preview-line">Leírom, mit szeretnék</span>
                        </button>
                      </div>
                      {(customFontOpen || (Boolean(projectForm.fontPreference) && !curatedFonts.some(([label]) => label === projectForm.fontPreference))) && (
                        <input
                          required
                          value={curatedFonts.some(([label]) => label === projectForm.fontPreference) ? "" : projectForm.fontPreference}
                          onChange={(event) => setProjectForm((current) => ({ ...current, fontPreference: event.target.value }))}
                          placeholder="Írd le, milyen betűtípust szeretnél — vagy hagyd ránk"
                        />
                      )}
                    </div>

                    {/* Szövegek */}
                    <div className="field" id="content-source">
                      <label>A szövegeket ki írja?</label>
                      <div className="choice-grid compact">
                        <button
                          className={projectForm.contentSource === "studio" ? "selected" : ""}
                          onClick={() => setProjectForm((current) => ({ ...current, contentSource: "studio" }))}
                          type="button"
                        >
                          <strong>Írjátok meg ti</strong>
                          <span>{projectForm.commercialModel === "subscription" && projectForm.subscriptionPlan === "presence" ? "Az alapanyagaidból tömör, egyoldalas szöveget készítünk." : "Benne van a csomagban — a vázlatodból dolgozunk."}</span>
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
                      {projectForm.contentSource === "studio" ? (
                        <div className="conditional-brief" id="content-brief">
                          <span className="micro-label">Ehhez szükségünk van rád</span>
                          <h4>Mesélj a vállalkozásodról</h4>
                          <p>Nem kell marketingesen fogalmaznod. A saját szavaidból készítünk hiteles, eladható weboldalszöveget.</p>
                          <textarea
                            value={projectForm.contentBrief}
                            onChange={(event) => setProjectForm((current) => ({ ...current, contentBrief: event.target.value }))}
                            placeholder={"Kik vagytok és mióta működtök?\nMit képvisel a cégetek?\nMi a legfontosabb szolgáltatásotok vagy terméketek?\nMiért választanak benneteket?\nMilyen hangon beszéljünk a vásárlókkal?"}
                          />
                          <small>{projectForm.contentBrief.trim().length}/30 minimum karakter</small>
                        </div>
                      ) : null}
                      {projectForm.contentSource === "client" ? (
                        <div className="conditional-brief" id="content-client-material">
                          <span className="micro-label">Küldd el egyben is</span>
                          <h4>A kész vagy nyers szöveged</h4>
                          <p>Beilleszthetsz egy hosszú szöveget, vagy feltölthetsz több dokumentumot és képet. Nem kell oldalanként szétszedned.</p>
                          <textarea
                            value={projectForm.contentBrief}
                            onChange={(event) => setProjectForm((current) => ({ ...current, contentBrief: event.target.value }))}
                            placeholder="Másold ide mindazt, amit az oldalon szeretnél látni..."
                          />
                          <div className="asset-uploader">
                            <label htmlFor="project-copy-upload">
                              <strong>{contentUploading ? "Feltöltés..." : "Anyagok feltöltése"}</strong>
                              <span>PDF, JPG, PNG, WEBP, DOCX, XLSX vagy ZIP · fájlonként 20 MB · projektenként 250 MB</span>
                            </label>
                            <input
                              id="project-copy-upload"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.zip,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
                              multiple
                              disabled={contentUploading}
                              onChange={(event) => {
                                uploadContentFiles(Array.from(event.target.files ?? []));
                                event.target.value = "";
                              }}
                            />
                            {projectForm.contentFileUrls.length ? (
                              <div className="uploaded-file-list">
                                {projectForm.contentFileUrls.map((url, index) => (
                                  <div key={url}>
                                    <a href={url} target="_blank" rel="noreferrer">Szöveges anyag {index + 1}</a>
                                    <button type="button" onClick={() => setProjectForm((current) => ({ ...current, contentFileUrls: current.contentFileUrls.filter((item) => item !== url) }))}>Eltávolítás</button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Képek */}
                    <div className="field" id="photo-source">
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
                      {projectForm.photoSource === "own" ? (
                        <div className="asset-uploader" id="photo-upload">
                          <label htmlFor="project-photo-upload">
                            <strong>{assetUploading ? "Képek feltöltése..." : "Képek kiválasztása"}</strong>
                            <span>JPG, PNG vagy WEBP · képenként legfeljebb 20 MB · projektenként 250 MB</span>
                          </label>
                          <input
                            id="project-photo-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            disabled={assetUploading}
                            onChange={(event) => {
                              const files = Array.from(event.target.files ?? []);
                              uploadProjectPhotos(files);
                              event.target.value = "";
                            }}
                          />
                          {projectForm.photoUrls.length ? (
                            <div className="asset-preview-grid">
                              {projectForm.photoUrls.map((url, index) => (
                                <div key={url}><AssetImage value={url} alt={`Feltöltött kép ${index + 1}`} /><button type="button" aria-label={`${index + 1}. kép eltávolítása`} onClick={() => removeProjectPhoto(url)}>×</button></div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Kapcsolat + közösségi */}
                    <div className="wizard-two" id="contact-details">
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
                    <fieldset className="field social-link-fieldset">
                      <legend>Közösségi oldalak linkjei</legend>
                      <p>Csak azt töltsd ki, amit szeretnél megjeleníteni a weboldalon.</p>
                      {([
                        ["Facebook", "facebookUrl", "https://facebook.com/…"],
                        ["Instagram", "instagramUrl", "https://instagram.com/…"],
                        ["LinkedIn", "linkedinUrl", "https://linkedin.com/company/…"],
                        ["TikTok", "tiktokUrl", "https://tiktok.com/@…"],
                        ["YouTube", "youtubeUrl", "https://youtube.com/@…"]
                      ] as const).map(([label, key, placeholder]) => (
                        <label className="social-link-row" key={key}>
                          <span>{label}:</span>
                          <input
                            type="url"
                            inputMode="url"
                            value={projectForm[key]}
                            onChange={(event) => setProjectForm((current) => ({ ...current, [key]: event.target.value }))}
                            placeholder={placeholder}
                          />
                        </label>
                      ))}
                      <label className="social-link-row social-link-other">
                        <span>Egyéb:</span>
                        <textarea
                          value={projectForm.otherSocialLinks}
                          onChange={(event) => setProjectForm((current) => ({ ...current, otherSocialLinks: event.target.value }))}
                          placeholder="Google Cégprofil vagy bármilyen más link — soronként egy"
                        />
                      </label>
                    </fieldset>

                    {/* Analytics */}
                    {projectForm.websiteStatus === "yes" ? <div className="field">
                      <label htmlFor="analytics-access">Van Google Analytics / mérés a régi oldalon?</label>
                      <select
                        id="analytics-access"
                        required
                        value={projectForm.analyticsAccess}
                        onChange={(event) => setProjectForm((current) => ({ ...current, analyticsAccess: event.target.value }))}
                      >
                        <option value="">Válassz...</option>
                        <option value="yes">Van, tudok hozzáférést adni</option>
                        <option value="setup">Nincs, de szeretnék mérést</option>
                        <option value="no">Nincs / nem fontos</option>
                      </select>
                    </div> : null}

                    {/* Számlázás */}
                    <div className="field">
                      <label htmlFor="billing-details">Számlázási adatok (a szerződéshez / számlához)</label>
                      <textarea
                        id="billing-details"
                        required
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
                        <span>{projectForm.commercialModel === "subscription" ? "Weboldal kerete" : "Projekt típusa"}</span>
                        <strong>{projectForm.commercialModel === "subscription" ? subscriptionPlan(projectForm.subscriptionPlan).pages : selectedProjectTypeLabels.join(", ") || "Nincs kiválasztva"}</strong>
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
                        <span>{projectForm.commercialModel === "subscription" ? "Konstrukció" : "Büdzsé"}</span>
                        <strong>{projectForm.commercialModel === "subscription" ? `${subscriptionPlan(projectForm.subscriptionPlan).name} előfizetés` : projectForm.budget}</strong>
                      </div>
                      {projectForm.commercialModel === "subscription" ? <div>
                        <span>Indítás és fizetés</span>
                        <strong>{formatHuf(subscriptionPlan(projectForm.subscriptionPlan).price)}/hó · első hónap a szerződés után</strong>
                      </div>
                      : null}
                    </div>
                    {projectForm.commercialModel === "subscription" ? <div className="summary-payment-note"><span>01</span><p><strong>A brief beküldése még nem fizetés.</strong> Előbb elfogadod a szolgáltatási szerződést, utána jelennek meg az első havidíj banki átutalási adatai. A kivitelezés a beérkezés visszaigazolásakor indul.</p></div> : null}
                    <label className="brief-final-confirm"><input type="checkbox" checked={briefConfirmed} onChange={(event) => setBriefConfirmed(event.target.checked)} /><span><strong>Ellenőriztem az adatokat.</strong> Kifejezetten kérem az adatlap beküldését és a következő szerződéses lépés megnyitását.</span></label>
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
                        onClick={() => moveToProjectStep(projectStep + 1)}
                        type="button"
                      >
                        Következő
                      </button>
                    ) : (
                      <button className="button primary" disabled={!briefConfirmed || projectSaving} type="submit">
                        {projectSaving ? "Biztonságos beküldés…" : projectForm.commercialModel === "subscription" ? "Adatlap beküldése — tovább a szerződéshez" : "Projektkérés küldése"}
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
                <span>Élő adatlap</span>
                <strong>{briefProgress}% kész</strong>
              </div>
              <div
                className={`sidebar-style-preview vibe-${projectForm.vibe || "premium"}`}
                style={{ background: activePaletteColors[0], color: activePaletteColors[2] }}
              >
                <span style={{ color: activePaletteColors[1] }}>{selectedVibe[1]}</span>
                <strong>{projectForm.company || "Márkád"}</strong>
                <p>{selectedVibe[2]}</p>
                <em style={{ background: activePaletteColors[3] }}>{projectForm.commercialModel === "subscription" ? projectForm.primaryAction || "Kapcsolatfelvétel" : "Ajánlatot kérek"}</em>
              </div>
              <h3>{projectForm.title || "A projekt neve ide kerül"}</h3>
              <p>{projectForm.goals || (projectForm.commercialModel === "subscription" ? "Ahogy válaszolsz, itt áll össze a választott csomag kivitelezési adatlapja." : "Ahogy válaszolsz, itt épül össze az anyag, amiből ajánlatot tudok adni.")}</p>
              <div className="live-brief-tags">
                <span>{projectForm.commercialModel === "subscription" ? `${subscriptionPlan(projectForm.subscriptionPlan).name} · ${formatHuf(subscriptionPlan(projectForm.subscriptionPlan).price)}/hó` : selectedProjectTypeLabels.join(" · ") || "Projekt típusa"}</span>
                <span>{selectedVibe[1]}</span>
                <span>{projectForm.commercialModel === "subscription" ? projectForm.primaryAction || "Elsődleges művelet" : splitListValue(projectForm.priority).map((value) => priorityLabels[value]).filter(Boolean).join(" · ") || "Vágyott eredmény"}</span>
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
                  <span>{projectForm.commercialModel === "subscription" && projectForm.subscriptionPlan === "presence" ? "Oldalblokkok" : "Oldalak"}</span>
                  <strong>{projectForm.pages || "Később pontosítjuk"}</strong>
                </div>
                <div>
                  <span>Csomagból használt funkciók</span>
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
              Új projektindító adatlap
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
                <p>Indíts egy projektindító adatlapot, és itt látod majd a státuszt, a tennivalókat és az ajánlatot.</p>
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
            {!loading && highlightedClosedProject ? (
              <section className="just-completed-project">
                {renderProjectCard(highlightedClosedProject)}
              </section>
            ) : null}
            {!loading && closedProjects.length > 0 && (
              <details className="disclosure">
                <summary>Korábbi projektek ({closedProjects.length})</summary>
                <div className="disclosure-body" style={{ display: "grid", gap: "16px" }}>
                  {closedProjects
                    .filter((project) => project.id !== highlightedClosedProject?.id)
                    .map((project) => renderProjectCard(project))}
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
                <div className="portal-chat-messages" ref={portalChatMessagesRef}>
                  {(messages[activeTicket.id] ?? []).map((item) => (
                    <div className={`portal-bubble ${item.sender}`} key={item.id}>
                      <span>
                        {item.sender === "admin" ? "ProjectEdge" : "Te"} ·{" "}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
                          : "most"}
                      </span>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
                {activeTicket.status !== "closed" && (
                  <form className="portal-reply" onSubmit={sendReply}>
                    <textarea
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                      placeholder="Írj választ… (Enter a küldéshez)"
                      rows={1}
                      value={reply}
                    />
                    <button className="button primary" disabled={!reply.trim()} type="submit">
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
              {recoveryMode ? null : (
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="settings-current-password">Jelenlegi jelszó</label>
                  <input
                    id="settings-current-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="A megerősítéshez"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              )}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="settings-password">Új jelszó</label>
                <input
                  id="settings-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Legalább 10 karakter, betű és szám"
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
                Az üres, projekt és ügyfélszolgálati ügy nélküli fiókot itt végleg törölheted. Ha már van projekted vagy üzenetváltásod, az üzleti és számlázási nyilvántartások miatt előbb a lezárást kell kérned az ügyfélszolgálattól; a rendszer ezeket nem törli automatikusan.
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
                <span aria-hidden="true"><IconBell size={34} /></span>
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
      {showPaymentModalProjectId ? (() => {
        const project = projects.find((item) => item.id === showPaymentModalProjectId);
        if (!project) return null;
        return (
          <TransferModal
            project={project}
            paymentMode={paymentMode}
            paymentError={paymentError}
            transferAlreadyReported={paymentMode === "final" ? project.final_transfer_reported : project.deposit_transfer_reported}
            onClose={() => setShowPaymentModalProjectId(null)}
            onReportTransfer={paymentMode === "final" ? markFinalTransferSent : markDepositTransferSent}
          />
        );
      })() : null}
    </section>
  );
}
