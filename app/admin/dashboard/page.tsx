import { redirect } from "next/navigation";

/**
 * A régi admin címe. Az értesítések, levelek és a Stripe sandbox teszt is
 * ide mutat — mindet az új konzol „Ma" oldalára visszük, a paraméterekkel
 * együtt (pl. `?payment-test=success`).
 */
export default async function AdminDashboardRedirect(props: PageProps<"/admin/dashboard">) {
  const searchParams = await props.searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString();
  redirect(`/admin/ma${suffix ? `?${suffix}` : ""}`);
}
