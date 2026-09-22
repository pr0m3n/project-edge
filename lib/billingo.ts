import "server-only";

import type Stripe from "stripe";

type BillingoDocument = { id: number; invoice_number?: string };

/**
 * A számla vevője, szolgáltatófüggetlen alakban.
 *
 * Korábban ez a modul közvetlenül `Stripe.Customer`-t várt, ami azt jelentette,
 * hogy CSAK kártyás fizetéshez lehetett számlát kiállítani. Az utalásos
 * ügyfélnek viszont nincs Stripe-vevője — az adatai a `client_profiles`
 * számlázási mezőiben élnek. A normalizált alak mindkét forrást kiszolgálja.
 */
export type BillingParty = {
  name: string;
  email: string;
  /** ISO 3166-1 alpha-2, nagybetűvel. */
  country: string;
  postalCode: string;
  city: string;
  address: string;
  /** Adószám HU előtag nélkül; hiányában magánszemélyként számlázunk. */
  taxNumber?: string | null;
};

/** Stripe-vevő átfordítása számlázási vevővé. A `tax_ids` bővítve kell legyen. */
export function billingPartyFromStripeCustomer(customer: Stripe.Customer): BillingParty {
  const address = customer.address;
  const taxIds = customer.tax_ids;
  return {
    name: customer.name ?? "",
    email: customer.email?.trim() ?? "",
    country: (address?.country ?? "").toUpperCase(),
    postalCode: address?.postal_code ?? "",
    city: address?.city ?? "",
    address: [address?.line1, address?.line2].filter(Boolean).join(" "),
    taxNumber: taxIds && "data" in taxIds ? taxIds.data[0]?.value.replace(/^HU/i, "") ?? null : null
  };
}

/** Hiányos vevőadat esetén a hiányzó mezők nevét adja vissza, különben üres tömböt. */
export function missingBillingFields(party: BillingParty) {
  const required: Array<[keyof BillingParty, string]> = [
    ["name", "név"],
    ["email", "email cím"],
    ["country", "ország"],
    ["postalCode", "irányítószám"],
    ["city", "település"],
    ["address", "utca, házszám"]
  ];
  return required.filter(([key]) => !String(party[key] ?? "").trim()).map(([, label]) => label);
}

function config() {
  const apiKey = process.env.BILLINGO_API_KEY;
  const blockId = Number(process.env.BILLINGO_DOCUMENT_BLOCK_ID);
  const bankAccountId = Number(process.env.BILLINGO_BANK_ACCOUNT_ID);
  if (!apiKey || !Number.isInteger(blockId) || !Number.isInteger(bankAccountId)) return null;
  return { apiKey, blockId, bankAccountId };
}

async function billingoFetch<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.billingo.hu/v3${path}`, {
    ...init,
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) throw new Error(`Billingo API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<T>;
}

export async function createBillingoSubscriptionInvoice(input: {
  /** Külső azonosító. Ebből lesz a `vendor_id`, ami a duplikált számlát kizárja. */
  stripeInvoiceId: string;
  party: BillingParty;
  amount: number;
  itemName: string;
  paidAt: Date;
  /**
   * A tétel mennyiségi egysége. Alapértelmezésben „hó", mert a Stripe-ból
   * érkező számlák havi díjak — egy éves díjnál viszont ez félrevezető lenne
   * a számlán, ezért felülírható.
   */
  unit?: string;
  /** Fizetési mód a Billingo felé. Az utalásos befizetésnél nem kártya. */
  paymentMethod?: "online_bankcard" | "wire_transfer";
  /** A számla lábjegyzete — az utalás azonosítója is ide kerülhet. */
  comment?: string;
}) {
  const settings = config();
  if (!settings) return { skipped: true as const, reason: "A Billingo API környezeti változói nincsenek teljesen beállítva." };

  const missing = missingBillingFields(input.party);
  if (missing.length) {
    throw new Error(`A számlázási adatok hiányosak: ${missing.join(", ")}. Töltsd ki őket az ügyfél adatlapján.`);
  }

  const email = input.party.email.trim();
  const partners = await billingoFetch<{ data?: Array<{ id: number; emails?: string[] }> }>(
    `/partners?per_page=100&query=${encodeURIComponent(email)}`,
    settings.apiKey
  );
  let partnerId = partners.data?.find((partner) => partner.emails?.some((value) => value.toLowerCase() === email.toLowerCase()))?.id;
  if (!partnerId) {
    const taxCode = input.party.taxNumber?.replace(/^HU/i, "").trim() || "";
    const partner = await billingoFetch<{ id: number }>("/partners", settings.apiKey, {
      method: "POST",
      body: JSON.stringify({
        name: input.party.name,
        address: {
          country_code: input.party.country.toUpperCase(),
          post_code: input.party.postalCode,
          city: input.party.city,
          address: input.party.address
        },
        emails: [email],
        taxcode: taxCode,
        tax_type: taxCode ? "HAS_TAX_NUMBER" : "NO_TAX_NUMBER"
      })
    });
    partnerId = partner.id;
  }

  const day = input.paidAt.toISOString().slice(0, 10);
  const document = await billingoFetch<BillingoDocument>("/documents", settings.apiKey, {
    method: "POST",
    body: JSON.stringify({
      vendor_id: `stripe-${input.stripeInvoiceId}`,
      partner_id: partnerId,
      block_id: settings.blockId,
      bank_account_id: settings.bankAccountId,
      type: "invoice",
      fulfillment_date: day,
      due_date: day,
      payment_method: input.paymentMethod ?? "online_bankcard",
      language: "hu",
      currency: "HUF",
      electronic: false,
      paid: true,
      instant_payment: true,
      items: [{
        name: input.itemName,
        unit_price: input.amount,
        unit_price_type: "gross",
        quantity: 1,
        unit: input.unit ?? "hó",
        vat: "AAM",
        entitlement: "AAM",
        comment: "Alanyi adómentes szolgáltatás."
      }],
      comment: input.comment ?? `Stripe bankkártyás fizetés: ${input.stripeInvoiceId}`
    })
  });
  await billingoFetch(`/documents/${document.id}/send`, settings.apiKey, {
    method: "POST",
    body: JSON.stringify({ emails: [email] })
  });
  return { skipped: false as const, id: document.id, invoiceNumber: document.invoice_number ?? null };
}
