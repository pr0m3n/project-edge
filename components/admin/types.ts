/**
 * Az admin felület adatszerkezetei.
 *
 * Külön modulban, hogy az admin alkomponensek (pl. a számlázási kártya)
 * ne a 2500 soros `AdminDashboard.tsx`-ből importáljanak típust.
 */

import type { HandoverStepState } from "@/lib/handover";

export type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  project_type: string;
  budget: string | null;
  goals: string;
  status: string;
  notes: string | null;
};

export type Ticket = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  rating: number | null;
  rating_comment: string | null;
  status: string;
  admin_reply: string | null;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  created_at: string;
  sender: "customer" | "admin";
  body: string;
};

export type ClientProject = {
  id: string;
  user_id: string;
  created_at: string;
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
  admin_notes: string | null;
  offer_title: string | null;
  offer_summary: string | null;
  offer_scope: string | null;
  offer_timeline: string | null;
  offer_deliverables: string | null;
  base_offer_price: number | null;
  offer_price: number | null;
  offer_currency: string | null;
  offer_note: string | null;
  offer_status: string | null;
  offer_sent_at: string | null;
  coupon_code: string | null;
  coupon_percent: number | null;
  coupon_max_discount: number | null;
  coupon_discount_amount: number;
  client_decision_note: string | null;
  brief_data: any;
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
  /** Régi, szabad szöveges átadási lista — csak a 017 előtti projekteknél. */
  handover_checklist: Array<{ title: string; done: boolean }> | null;
  /** Vezetett átadás állapota (lib/handover.ts). */
  handover_steps: HandoverStepState[] | null;
  maintenance_option: string | null;
  maintenance_monthly_fee: number | null;
  maintenance_currency: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_cancel_requested_at: string | null;
  followup_check_fee: number | null;
  followup_check_status: string | null;
  followup_check_transfer_reported: boolean;
  followup_check_due_at: string | null;
  followup_check_completed_at: string | null;
  followup_checklist: Array<{ key: string; label: string; done: boolean }> | null;
  followup_check_report: string | null;
  warranty_started_at: string | null;
  warranty_expires_at: string | null;
  deposit_transfer_reported: boolean;
  final_transfer_reported: boolean;
  review_approved: boolean;
  client_rating: number | null;
  client_review: string | null;
  reference_permitted: boolean;
  staging_url: string | null;
  final_payment_paid: boolean;
  final_payment_paid_at: string | null;
  estimated_deadline: string | null;
  logo_url: string | null;
  commercial_model: "subscription" | "purchase";
  subscription_plan: "presence" | "business" | "custom" | null;
  monthly_price: number | null;
  next_billing_at: string | null;
  billing_cycle_started_at: string | null;
  pause_requested_at: string | null;
  paused_at: string | null;
  resume_requested_at: string | null;
  cancel_effective_at: string | null;
  cancelled_at: string | null;
  managed_domain_name: string | null;
  domain_renewal_at: string | null;
  domain_status: string | null;
  purchase_option_price: number | null;
  site_health_status: string | null;
  last_health_check_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
  stripe_parked_at: string | null;
};

export type ClientTicket = {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  subject: string;
  status: string;
  rating: number | null;
  rating_comment: string | null;
  last_message_at: string;
};

/** Beérkezett befizetés, amihez még nem készült AAM-számla. */
export type BillingoIssue = {
  id: string;
  project_id: string;
  amount: number;
  paid_at: string | null;
  stripe_invoice_id: string | null;
  billingo_error: string | null;
};

export type ChangeRequest = {
  id: string;
  project_id: string;
  category: "content" | "design" | "technical" | "new_feature";
  description: string;
  status: "new" | "planned" | "in_progress" | "waiting_client" | "completed" | "declined";
  included_in_plan: boolean | null;
  admin_note: string | null;
  requested_at: string;
  quoted_amount: number | null;
  payment_reference: string | null;
  transfer_reported_at: string | null;
  paid_at: string | null;
};
