"use client";

import { useState } from "react";
import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import {
  BILLING_TERMS,
  PRICE_TAX_NOTE,
  formatHuf,
  subscriptionPlan,
  termEffectiveMonthly,
  termSaving,
  termTotal,
  type BillingTerm
} from "@/lib/subscriptions";
import type { Project } from "@/components/portal/types";

/**
 * FIZETÉSI ÜTEMEZÉS ÉS MÓD VÁLASZTÁSA.
 *
 * Korábban itt egyetlen gomb volt: „Előfizetés indítása bankkártyával". Aki
 * fél évet vagy egy évet szeretett volna előre fizetni, annak nem volt hova
 * kattintania; aki utalni akart, annak végképp nem.
 *
 * Két döntés van, és SZÁNDÉKOSAN ebben a sorrendben:
 *
 *   1. MEDDIG — ez a pénzről szól, és itt van kedvezmény. Ezt kell előbb
 *      látnia, mert ez befolyásolja, mennyit fizet.
 *   2. HOGYAN — kártya vagy utalás. Ez csak kényelmi kérdés, és a választható
 *      módok a futamidőtől függenek.
 *
 * Fordítva a kedvezmény elveszne: aki rögtön a „bankkártya" gombot látja,
 * annak fel sem tűnik, hogy egy másik ütemezéssel két hónapot spórolhatna.
 */

type TransferDetails = {
  paymentId: string;
  amount: number;
  reference: string;
  bank: { name: string; accountNumber: string; iban: string };
};

type Props = {
  project: Project;
  /**
   * Melyik futamidők választhatók. Induláskor SZÁNDÉKOSAN csak a havi:
   * egy még el sem készült weboldalért 149–399 ezret előre kérni rossz
   * ajánlat — az ügyfélnek egy olyan szolgáltatóra kellene kockáztatnia,
   * akivel még sosem dolgozott. Az éves kedvezmény megtartó eszköz, nem
   * ügyfélszerző: akkor ér valamit, amikor az oldal már él.
   */
  terms?: BillingTerm[];
  /** Bankkártyás fizetés indítása a választott futamidővel. */
  onCard: (term: BillingTerm) => void | Promise<void>;
  /** Utalásos indítás — visszaadja az utalási adatokat. */
  onTransfer: (term: BillingTerm) => Promise<TransferDetails | null>;
  /** Az utalás bejelentése. */
  onTransferReported: (paymentId: string) => Promise<boolean>;
  busy?: boolean;
};

export function BillingTermChooser({ project, terms = BILLING_TERMS, onCard, onTransfer, onTransferReported, busy = false }: Props) {
  const plan = subscriptionPlan(project.subscription_plan);
  const monthly = project.monthly_price ?? plan.price;

  const [selected, setSelected] = useState<BillingTerm>(terms[0]);
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [reported, setReported] = useState(false);
  const [working, setWorking] = useState(false);

  async function startTransfer() {
    setWorking(true);
    try {
      const details = await onTransfer(selected);
      if (details) setTransfer(details);
    } finally {
      setWorking(false);
    }
  }

  async function reportTransfer() {
    if (!transfer) return;
    setWorking(true);
    try {
      if (await onTransferReported(transfer.paymentId)) setReported(true);
    } finally {
      setWorking(false);
    }
  }

  // ── Az utalás bejelentve ────────────────────────────────────────────────
  if (reported && transfer) {
    return (
      <div className="term-chooser">
        <div className="term-reported">
          <strong>Köszönöm, jeleztem magamnak.</strong>
          <p>
            Amint az utalás megérkezik a bankszámlára, visszaigazolom, kiállítom a számlát, és a
            weboldalad munkája indul. Erről emailt is kapsz — nincs több teendőd.
          </p>
          <dl className="term-bank">
            <div><dt>Összeg</dt><dd>{formatHuf(transfer.amount)}</dd></div>
            <div><dt>Közlemény</dt><dd><b>{transfer.reference}</b></dd></div>
          </dl>
        </div>
      </div>
    );
  }

  // ── Utalási adatok ──────────────────────────────────────────────────────
  if (transfer) {
    return (
      <div className="term-chooser">
        <header className="term-head">
          <span>BANKI ÁTUTALÁS</span>
          <h4>Ezekkel az adatokkal utalj</h4>
          <p>
            A közlemény pontos megadása azért fontos, hogy a befizetésed azonnal a te előfizetésedhez
            kerüljön. Ha megvagy, jelezd lent — így tudom, mit kell keresnem a bankszámlán.
          </p>
        </header>

        <dl className="term-bank">
          <div><dt>Kedvezményezett</dt><dd>{transfer.bank.name}</dd></div>
          <div><dt>Számlaszám</dt><dd>{transfer.bank.accountNumber}</dd></div>
          <div><dt>IBAN</dt><dd>{transfer.bank.iban}</dd></div>
          <div><dt>Összeg</dt><dd>{formatHuf(transfer.amount)}</dd></div>
          <div><dt>Közlemény</dt><dd><b>{transfer.reference}</b></dd></div>
        </dl>

        <div className="term-actions">
          <button className="button primary" type="button" disabled={working || busy} onClick={() => void reportTransfer()}>
            {working ? "Mentés…" : "Elutaltam"}
          </button>
          <button className="button secondary" type="button" disabled={working || busy} onClick={() => setTransfer(null)}>
            Mégis kártyával fizetnék
          </button>
        </div>
        <small className="term-note">{PRICE_TAX_NOTE}</small>
      </div>
    );
  }

  // ── A választó ──────────────────────────────────────────────────────────
  return (
    <div className="term-chooser">
      <header className="term-head">
        <span>ELŐFIZETÉS INDÍTÁSA</span>
        <h4>{terms.length > 1 ? "Milyen ütemezésben fizetnél?" : `Indítsd el a ${plan.name} előfizetést.`}</h4>
        <p>
          {terms.length > 1
            ? `Ugyanaz a ${plan.name} csomag — csak a fizetés gyakorisága más. A havi az ajánlott: nincs hűségidő, és bármikor válthatsz hosszabb futamidőre. Ha eleve egy összegben fizetnél, azt is megteheted. A fizetés után élesítem az oldalt.`
            : "A fizetés után élesítem a weboldalt a saját domainjén. Ezen felül nincs külön induló díj, és nincs hűségidő."}
        </p>
      </header>

      {terms.length > 1 ? (
      <div className="term-options" role="radiogroup" aria-label="Fizetési ütemezés">
        {terms.map((term) => {
          const saving = termSaving(monthly, term);
          const active = selected.key === term.key;
          return (
            <button
              key={term.key}
              type="button"
              role="radio"
              aria-checked={active}
              className={`term-option ${active ? "is-active" : ""}`}
              onClick={() => setSelected(term)}
            >
              <span className="term-option-label">
                {term.label}
                {term.months === 1 ? <b className="term-badge is-default">Ajánlott</b> : null}
                {saving ? <b className="term-badge">−{saving.months} hónap</b> : null}
              </span>
              <strong>{formatHuf(termEffectiveMonthly(monthly, term))}<small> / hó</small></strong>
              <span className="term-option-total">
                {term.months === 1
                  ? "havonta terhelve"
                  : `${formatHuf(termTotal(monthly, term))} ${term.months === 12 ? "egy évre" : "fél évre"}`}
              </span>
              {saving ? <span className="term-option-save">Megtakarítás: {formatHuf(saving.saved)}</span> : null}
            </button>
          );
        })}
      </div>
      ) : null}

      {terms.length > 1 ? (
        <p className="term-selected-note">
          {selected.note}
          {selected.months > 1
            ? " A weboldalad ugyanúgy az első befizetés után készül el — a hosszabb futamidő csak azt jelenti, hogy ritkábban kell fizetned."
            : ""}
        </p>
      ) : null}

      <div className="term-actions">
        <button className="button primary" type="button" disabled={busy || working} onClick={() => void onCard(selected)}>
          {busy ? "Stripe megnyitása…" : "Fizetés bankkártyával →"}
        </button>
        {selected.allowsTransfer ? (
          <button className="button secondary" type="button" disabled={busy || working} onClick={() => void startTransfer()}>
            {working ? "Adatok előkészítése…" : "Inkább átutalással"}
          </button>
        ) : null}
      </div>

      <small className="term-note">
        {selected.months === 1
          ? "A további havidíjakat a Stripe automatikusan terheli. Bármikor lemondható az ügyfélkapun."
          : "A megújulás a futamidő végén esedékes — előtte emailben szólok."}{" "}
        {PRICE_TAX_NOTE}
      </small>
    </div>
  );
}
