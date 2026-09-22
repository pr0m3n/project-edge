import "server-only";

import { createBillingoSubscriptionInvoice, type BillingParty } from "@/lib/billingo";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { billingIntervalLabel, billingUnitLabel, type BillingCycle } from "@/lib/onboarding";

/**
 * A számla vevője a SAJÁT nyilvántartásunkból.
 *
 * Az utalásos ügyfélnek nincs Stripe-vevője, tehát a számlázási adatai csak
 * itt élnek — a `client_profiles` 038-ban felvett mezőiben. Ez a függvény az
 * egyetlen hely, ahol ezek számlázási alakra fordulnak; ha egy mező hiányzik,
 * azt a `missingBillingFields` mondja meg, nem egy homályos Billingo-hiba.
 */
export async function billingPartyForUser(userId: string): Promise<BillingParty | null> {
  const { data } = await createServerSupabaseAdminClient()
    .from("client_profiles")
    .select("email,full_name,billing_name,billing_tax_number,billing_country,billing_postal_code,billing_city,billing_address")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  return {
    name: (data.billing_name as string | null) ?? (data.full_name as string | null) ?? "",
    email: (data.email as string | null) ?? "",
    country: ((data.billing_country as string | null) ?? "HU").toUpperCase(),
    postalCode: (data.billing_postal_code as string | null) ?? "",
    city: (data.billing_city as string | null) ?? "",
    address: (data.billing_address as string | null) ?? "",
    taxNumber: (data.billing_tax_number as string | null) ?? null
  };
}

/**
 * Számla kiállítása EGY befizetéshez, és az eredmény visszaírása a sorba.
 *
 * Három helyről kell ugyanez a művelet: a Stripe havi számlájából, az admin
 * által generált egyszeri kártyás fizetésből, és a kézzel rögzített utalásból.
 * Korábban ez a logika csak a webhookban létezett, egyetlen try/catch-ben
 * összefonva a számlázással — így a másik két útvonalon vagy hiányzott volna,
 * vagy harmadszor is le kellett volna írni.
 *
 * A hiba SOHA nem száll tovább: egy Billingo-kimaradás nem bukhatja meg a
 * fizetés rögzítését, mert a pénz akkor is beérkezett. A hiba a sorba kerül
 * (`billingo_error`), és az admin értesítést kap — a `BillingoIssuesCard`
 * pontosan ezeket a sorokat listázza, hogy egy se maradjon számlázatlanul.
 */
export async function issueSubscriptionInvoice(input: {
  paymentId: string;
  projectTitle: string;
  planName: string;
  amount: number;
  paidAt: Date;
  party: BillingParty;
  /** A `vendor_id` alapja a Billingóban — ez zárja ki a duplikált számlát. */
  reference: string;
  interval: BillingCycle;
  paymentMethod: "online_bankcard" | "wire_transfer";
  comment?: string;
}) {
  const admin = createServerSupabaseAdminClient();

  try {
    const result = await createBillingoSubscriptionInvoice({
      stripeInvoiceId: input.reference,
      party: input.party,
      amount: input.amount,
      itemName: `ProjectEdge ${input.planName} menedzselt weboldal — ${billingIntervalLabel(input.interval)} díj`,
      paidAt: input.paidAt,
      unit: billingUnitLabel(input.interval),
      paymentMethod: input.paymentMethod,
      comment: input.comment
    });

    await admin.from("subscription_payments").update(result.skipped
      ? { billingo_error: result.reason, updated_at: new Date().toISOString() }
      : {
          billingo_document_id: result.id,
          billingo_invoice_number: result.invoiceNumber,
          billingo_error: null,
          updated_at: new Date().toISOString()
        }
    ).eq("id", input.paymentId);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ismeretlen Billingo-hiba";
    await admin.from("subscription_payments")
      .update({ billingo_error: message, updated_at: new Date().toISOString() })
      .eq("id", input.paymentId);
    await admin.from("notifications").insert({
      user_id: null,
      title: "Billingo számlázási hiba",
      message: `${input.projectTitle}: ${message}`,
      link: "/admin/dashboard"
    });
    return { skipped: true as const, reason: message };
  }
}
