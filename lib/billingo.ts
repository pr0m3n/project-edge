import "server-only";

import type Stripe from "stripe";

type BillingoDocument = { id: number; invoice_number?: string };

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
  stripeInvoiceId: string;
  customer: Stripe.Customer;
  amount: number;
  itemName: string;
  paidAt: Date;
}) {
  const settings = config();
  if (!settings) return { skipped: true as const, reason: "A Billingo API környezeti változói nincsenek teljesen beállítva." };

  const email = input.customer.email?.trim();
  const address = input.customer.address;
  if (!email || !input.customer.name || !address?.country || !address.postal_code || !address.city || !address.line1) {
    throw new Error("A Stripe-vevő neve, email címe vagy számlázási címe hiányos.");
  }

  const partners = await billingoFetch<{ data?: Array<{ id: number; emails?: string[] }> }>(
    `/partners?per_page=100&query=${encodeURIComponent(email)}`,
    settings.apiKey
  );
  let partnerId = partners.data?.find((partner) => partner.emails?.some((value) => value.toLowerCase() === email.toLowerCase()))?.id;
  if (!partnerId) {
    const expandedTaxIds = input.customer.tax_ids;
    const taxCode = expandedTaxIds && "data" in expandedTaxIds
      ? expandedTaxIds.data[0]?.value.replace(/^HU/i, "")
      : undefined;
    const partner = await billingoFetch<{ id: number }>("/partners", settings.apiKey, {
      method: "POST",
      body: JSON.stringify({
        name: input.customer.name,
        address: {
          country_code: address.country.toUpperCase(),
          post_code: address.postal_code,
          city: address.city,
          address: [address.line1, address.line2].filter(Boolean).join(" ")
        },
        emails: [email],
        taxcode: taxCode || "",
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
      payment_method: "online_bankcard",
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
        unit: "hó",
        vat: "AAM",
        entitlement: "AAM",
        comment: "Alanyi adómentes szolgáltatás."
      }],
      comment: `Stripe bankkártyás fizetés: ${input.stripeInvoiceId}`
    })
  });
  await billingoFetch(`/documents/${document.id}/send`, settings.apiKey, {
    method: "POST",
    body: JSON.stringify({ emails: [email] })
  });
  return { skipped: false as const, id: document.id, invoiceNumber: document.invoice_number ?? null };
}
