export type WebsitePurchaseStatus =
  | "requested"
  | "payment_pending"
  | "transfer_reported"
  | "handover"
  | "completed"
  | "declined"
  | "cancelled";

export type WebsitePurchasePaymentMethod = "card" | "bank_transfer";
export type WebsitePurchasePaymentStatus = "unpaid" | "reported" | "paid" | "failed";

export type WebsitePurchase = {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: WebsitePurchaseStatus;
  payment_method: WebsitePurchasePaymentMethod | null;
  payment_status: WebsitePurchasePaymentStatus;
  amount: number;
  payment_reference: string;
  admin_note: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  transfer_reported_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_country: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_address: string | null;
  billing_tax_number: string | null;
};

export const WEBSITE_PURCHASE_STATUS_LABELS: Record<WebsitePurchaseStatus, string> = {
  requested: "Igény beérkezett",
  payment_pending: "Fizetésre kész",
  transfer_reported: "Utalás ellenőrzés alatt",
  handover: "Technikai átadás",
  completed: "Lezárva",
  declined: "Megszakítva",
  cancelled: "Megszakítva"
};

export function isActiveWebsitePurchase(purchase: WebsitePurchase | null | undefined) {
  return Boolean(purchase && !["completed", "declined", "cancelled"].includes(purchase.status));
}

export function websitePurchaseProgress(purchase: WebsitePurchase | null | undefined) {
  if (!purchase) return { index: 0, total: 5 };
  if (purchase.status === "requested") return { index: 1, total: 5 };
  if (purchase.status === "payment_pending" || purchase.status === "transfer_reported") return { index: 2, total: 5 };
  if (purchase.status === "handover") return { index: 4, total: 5 };
  if (purchase.status === "completed") return { index: 5, total: 5 };
  return { index: 1, total: 5 };
}

export const WEBSITE_PURCHASE_FLOW = [
  { number: 1, title: "Igénylés", short: "A folyamat elindítása" },
  { number: 2, title: "Fizetési mód", short: "Bankkártya vagy átutalás" },
  { number: 3, title: "Fizetés", short: "A vételár rendezése" },
  { number: 4, title: "Technikai átadás", short: "A hozzáférések átvétele" },
  { number: 5, title: "Lezárás", short: "Átvétel megerősítése" }
] as const;
