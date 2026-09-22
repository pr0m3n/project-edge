"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { billingIntervalLabel, cycleAmount, cycleDiscount, projectCycleMonths } from "@/lib/onboarding";
import {
  ACK_PROMISE,
  CHANGE_QUOTA_EXCLUDED,
  CHANGE_QUOTA_FREE,
  CHANGE_QUOTA_INCLUDED,
  FAULT_RESPONSE_PROMISE,
  PRICE_TAX_NOTE,
  SUBSCRIPTION_SHARED_INCLUDED,
  changeQuotaLabel,
  formatHuf,
  subscriptionPlan
} from "@/lib/subscriptions";

type AgreementProject = {
  id: string;
  title: string;
  company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  subscription_plan: string | null;
  monthly_price: number | null;
  billing_amount: number | null;
  billing_interval: string | null;
  billing_period_months: number | null;
  payment_method: string | null;
  subscription_started_at: string | null;
  contract_accepted_at: string | null;
  next_billing_at: string | null;
  managed_domain_name: string | null;
  purchase_option_price: number | null;
};

/**
 * A megállapodás tartalma MINDIG a jelenlegi állapotból származik, nem egy
 * elmentett pillanatképből. Ez szándékos: ha a csomag vagy a díj változik, a
 * megállapodás is azt mutatja, ami érvényes — nem egy régi, félrevezető
 * dokumentumot. A kezdés és az elfogadás dátuma viszont rögzített tény, azt
 * az adatbázis őrzi.
 */
export function AgreementView({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<AgreementProject | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setState("denied");
        return;
      }

      // Az RLS gondoskodik róla, hogy csak a sajátját lássa; külön
      // `user_id` szűrő itt nem véd többet, viszont elfedné, ha a policy
      // valaha elromlana.
      const { data } = await supabase
        .from("client_projects")
        .select("id,title,company,contact_name,contact_email,subscription_plan,monthly_price,billing_amount,billing_interval,billing_period_months,payment_method,subscription_started_at,contract_accepted_at,next_billing_at,managed_domain_name,purchase_option_price")
        .eq("id", projectId)
        .maybeSingle();

      if (cancelled) return;
      if (!data) { setState("denied"); return; }
      setProject(data as AgreementProject);
      setState("ready");
    }

    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  if (state === "loading") {
    return <section className="agreement-sheet"><p>Betöltés…</p></section>;
  }

  if (state === "denied" || !project) {
    return (
      <section className="agreement-sheet">
        <h1>Ez a megállapodás nem érhető el</h1>
        <p>Jelentkezz be az ügyfélkapura, és onnan nyisd meg a saját projektedet.</p>
        <Link className="button primary" href="/ugyfelkapu">Belépés az ügyfélkapura</Link>
      </section>
    );
  }

  const plan = subscriptionPlan(project.subscription_plan);
  const interval = projectCycleMonths(project);
  const monthly = project.monthly_price ?? plan.price;
  const charge = cycleAmount({ monthlyPrice: monthly, interval, agreed: project.billing_amount ?? null });
  const discount = cycleDiscount({ monthlyPrice: monthly, interval, agreed: project.billing_amount ?? null });
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString("hu-HU") : "—";

  return (
    <section className="agreement-sheet">
      <header className="agreement-head">
        <div>
          <span className="micro-label">Szolgáltatási megállapodás</span>
          <h1>{project.title}</h1>
          <p>{project.company || project.contact_name || "Ügyfél"}{project.contact_email ? ` · ${project.contact_email}` : ""}</p>
        </div>
        <button className="button secondary agreement-print" type="button" onClick={() => window.print()}>
          Nyomtatás / PDF
        </button>
      </header>

      <dl className="agreement-facts">
        <div><dt>Szolgáltató</dt><dd>Boczán Patrik e.v. — ProjectEdge</dd></div>
        <div><dt>Csomag</dt><dd>{plan.name}</dd></div>
        <div><dt>Díj</dt><dd>{formatHuf(monthly)} / hó</dd></div>
        <div><dt>Számlázás</dt><dd>{billingIntervalLabel(interval)}, előre — {formatHuf(charge)} alkalmanként</dd></div>
        {discount ? (
          <div>
            <dt>Kedvezmény</dt>
            <dd>{formatHuf(discount.saved)} — {formatHuf(discount.list)} helyett, {discount.months} havidíjnyi</dd>
          </div>
        ) : null}
        <div><dt>Fizetési mód</dt><dd>{project.payment_method === "stripe" ? "Bankkártya" : "Banki átutalás"}</dd></div>
        <div><dt>Szolgáltatás kezdete</dt><dd>{date(project.subscription_started_at)}</dd></div>
        <div><dt>Megállapodás dátuma</dt><dd>{date(project.contract_accepted_at)}</dd></div>
        <div><dt>Következő esedékesség</dt><dd>{date(project.next_billing_at)}</dd></div>
        {project.managed_domain_name ? <div><dt>Domain</dt><dd>{project.managed_domain_name}</dd></div> : null}
      </dl>

      <p className="agreement-tax">{PRICE_TAX_NOTE}</p>

      <div className="agreement-columns">
        <section>
          <h2>Mit tartalmaz</h2>
          <ul>
            {/* A csomag saját jellemzői ÉS a minden csomagra érvényes közös
                vállalások. A kettő külön él a `lib/subscriptions.ts`-ben; ha
                itt csak az egyiket írnánk ki, a megállapodás kevesebbet
                ígérne, mint amit az árazó oldal hirdet. */}
            {[...plan.features, ...SUBSCRIPTION_SHARED_INCLUDED].map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Módosítási keret</h2>
          <p>{changeQuotaLabel(plan.changeQuota)}</p>
          <h3>Beleszámít</h3>
          <ul>{CHANGE_QUOTA_INCLUDED.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Mindig ingyenes</h3>
          <ul>{CHANGE_QUOTA_FREE.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Külön ajánlat alapján</h3>
          <ul>{CHANGE_QUOTA_EXCLUDED.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <section className="agreement-terms">
        <h2>Vállalások</h2>
        <ul>
          <li>{ACK_PROMISE}.</li>
          <li>{FAULT_RESPONSE_PROMISE}. A technikai hiba javítása nem fogyaszt a módosítási keretből.</li>
        </ul>

        <h2>Felmondás</h2>
        <p>
          A szolgáltatás bármikor felmondható az ügyfélkapun keresztül. A weboldal a már kifizetett
          időszak végéig működik. A felmondás nem projektátadás: nem jár forráskóddal és nem indít
          technikai garanciát.
        </p>

        {project.purchase_option_price ? (
          <>
            <h2>A weboldal megvásárlása</h2>
            <p>
              A weboldal bármikor tulajdonba vehető. A listaár {formatHuf(project.purchase_option_price)},
              amibe a befizetett havidíjak fele beszámít, a vételár feléig. A pontos, aktuális összeget
              az ügyfélkapun látod.
            </p>
          </>
        ) : null}

        <h2>Adatkezelés</h2>
        <p>
          Az adatkezelés részleteit az <Link href="/adatkezeles">Adatkezelési tájékoztató</Link>, a
          szolgáltatás általános feltételeit az <Link href="/aszf">ÁSZF</Link> tartalmazza.
        </p>
      </section>

      <footer className="agreement-foot">
        <p>
          Ez az összefoglaló a rendszerben nyilvántartott, mindenkor érvényes feltételeket mutatja.
          Ha bármi nem egyezik azzal, amiben megállapodtunk, szólj — javítom.
        </p>
        <Link className="button secondary" href="/ugyfelkapu/dashboard">Vissza az ügyfélkapura</Link>
      </footer>
    </section>
  );
}
