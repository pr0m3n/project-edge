"use client";

import type { BillingoIssue, ClientProject } from "@/components/admin/types";
import { formatHuf } from "@/lib/subscriptions";

/**
 * Beérkezett, de ki nem számlázott előfizetési befizetések.
 *
 * A webhook eddig eltárolta a `billingo_error`-t, és senki nem nézte meg:
 * a pénz megérkezett, AAM-számla viszont nem készült. NAV szempontból ez
 * nem maradhat nyitva, ezért itt látszik, egy kattintásos újrapróbálással.
 */
type BillingoIssuesCardProps = {
  issues: BillingoIssue[];
  projects: ClientProject[];
  retryingId: string | null;
  onRetry: (paymentId: string) => void | Promise<void>;
};

export function BillingoIssuesCard({ issues, projects, retryingId, onRetry }: BillingoIssuesCardProps) {
  if (!issues.length) return null;

  return (
        <section className="billingo-issues">
          <header>
            <div>
              <span>SZÁMLÁZÁSI TEENDŐ</span>
              <h3>{issues.length} beérkezett befizetéshez nem készült számla</h3>
              <p>A pénz megérkezett a Stripe-on, az AAM-számla viszont nem jött létre. Ezeket ki kell számlázni.</p>
            </div>
          </header>
          <ul>
            {issues.map((issue) => {
              const project = projects.find((item) => item.id === issue.project_id);
              return (
                <li key={issue.id}>
                  <div>
                    <strong>{project?.title ?? "Ismeretlen projekt"} · {formatHuf(issue.amount)}</strong>
                    <small>{issue.paid_at ? new Date(issue.paid_at).toLocaleString("hu-HU") : "ismeretlen időpont"}{issue.stripe_invoice_id ? ` · ${issue.stripe_invoice_id}` : ""}</small>
                    {issue.billingo_error ? <em>{issue.billingo_error}</em> : null}
                  </div>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={retryingId === issue.id}
                    onClick={() => onRetry(issue.id)}
                  >
                    {retryingId === issue.id ? "Számlázás…" : "Számla újrapróbálása"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
  );
}
