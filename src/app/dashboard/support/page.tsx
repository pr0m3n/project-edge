import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { MessageSquare, Clock } from "lucide-react";
import { getUserTickets } from "@/lib/actions/tickets";
import { SupportForm } from "./SupportForm";

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
    const tickets = await getUserTickets();

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Támogatás</h1>
                <p className="text-gray-400">Kérdésed van vagy problémába ütköztél? Segítünk!</p>
            </div>

            <div className="space-y-8">
                <SupportForm />

                <GlassCard className="p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-gray-400" />
                        Korábbi Hibajegyek
                    </h3>

                    <div className="space-y-4">
                        {tickets.map((ticket: any) => (
                            <div key={ticket.id} className="p-4 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold">{ticket.subject}</span>
                                    <span className={`text-xs px-2 py-1 rounded border ${ticket.status === 'Open' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : ticket.status === 'Closed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 truncate">{ticket.message}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}

                        {tickets.length === 0 && (
                            <div className="text-center py-6 text-gray-500">
                                <p className="text-sm">Még nem küldtél be hibajegyet.</p>
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    );
}
