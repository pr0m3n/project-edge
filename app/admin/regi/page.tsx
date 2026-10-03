import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = { title: "Régi admin · ProjectEdge" };

/**
 * A régi admin felület — ÁTMENETILEG elérhető az új konzol mellett, hogy ha
 * valamit ott keresnél, ne akadj el. Ha az új konzol bevált, ez törölhető
 * (a `components/AdminDashboard.tsx`-szel együtt).
 */
export default function LegacyAdminPage() {
  return (
    <main className="admin-page">
      <AdminDashboard />
    </main>
  );
}
