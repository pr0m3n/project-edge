import { getTickets } from "@/lib/actions/tickets";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TicketManager } from "./TicketManager";

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
    const tickets = await getTickets();

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Hibajegyek Kezelése</h1>
                <p className="text-gray-400">Felhasználói megkeresések és problémák.</p>
            </div>

            <TicketManager tickets={tickets} />
        </DashboardLayout>
    );
}
