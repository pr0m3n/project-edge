import { getPartners } from "@/lib/actions/partners";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PartnerManager } from "./PartnerManager";

export const dynamic = 'force-dynamic';

export default async function AdminPartnersPage() {
    const partners = await getPartners();

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Partner Kezelés</h1>
                <p className="text-gray-400">Add hozzá, szerkeszd vagy töröld a partner ajánlatokat.</p>
            </div>

            <PartnerManager partners={partners} />
        </DashboardLayout>
    );
}
