"use client";

import { useState } from "react";
import { updateTicketStatus } from "@/lib/actions/tickets";
import { GlassCard } from "@/components/ui/GlassCard";
import { MessageSquare, CheckCircle, XCircle } from "lucide-react";

export function TicketManager({ tickets }: { tickets: any[] }) {
    const [loading, setLoading] = useState(false);

    const handleStatusUpdate = async (id: string, status: string) => {
        if (!confirm(`Állapot módosítása erre: ${status}?`)) return;
        setLoading(true);
        await updateTicketStatus(id, status);
        setLoading(false);
    };

    return (
        <div className="grid gap-6">
            {tickets.map((ticket) => (
                <GlassCard key={ticket.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {ticket.subject}
                                <span className={`text-xs px-2 py-1 rounded border ${ticket.status === 'Open' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : ticket.status === 'Closed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {ticket.status}
                                </span>
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">Felhasználó: {ticket.profiles?.email || 'Ismeretlen'}</p>
                            <p className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleString()}</p>
                        </div>

                        <div className="flex gap-2">
                            {ticket.status !== 'Closed' && (
                                <button
                                    onClick={() => handleStatusUpdate(ticket.id, 'Closed')}
                                    className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                                    title="Lezárás"
                                    disabled={loading}
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            )}
                            {ticket.status !== 'Answered' && ticket.status !== 'Closed' && (
                                <button
                                    onClick={() => handleStatusUpdate(ticket.id, 'Answered')}
                                    className="p-2 rounded hover:bg-blue-500/10 text-blue-400"
                                    title="Megválaszolva jelölés"
                                    disabled={loading}
                                >
                                    <CheckCircle className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg text-sm text-gray-300">
                        {ticket.message}
                    </div>

                    {/* Future: Add Reply form here */}
                </GlassCard>
            ))}

            {tickets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    Nincsenek hibajegyek.
                </div>
            )}
        </div>
    );
}
