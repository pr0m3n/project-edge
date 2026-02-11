"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Clock, DollarSign } from "lucide-react";
import { PayoutModal } from "@/components/dashboard/PayoutModal";

interface Challenge {
    id: string;
    firm: string;
    size: string;
    order_id: string;
    status: string;
    price: number;
    created_at: string;
}

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
    const [isPayoutOpen, setIsPayoutOpen] = useState(false);

    // Translate status for display
    const getStatusLabel = (status: string) => {
        switch (status) {
            case "Active": return "Aktív";
            case "Passed": return "Teljesítve";
            case "Reviewing": return "Ellenőrzés Alatt";
            case "Failed": return "Sikertelen";
            default: return status;
        }
    };

    return (
        <>
            <GlassCard className="relative overflow-hidden group flex flex-col h-full bg-white/5 border-white/10 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">{challenge.firm}</h3>
                        <p className="text-sm text-gray-400">Számla: {challenge.size}</p>
                        <p className="text-xs text-gray-500 mt-1">Order: {challenge.order_id}</p>
                    </div>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${challenge.status === "Active"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : challenge.status === "Passed"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : challenge.status === "Reviewing"
                                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                    >
                        {getStatusLabel(challenge.status)}
                    </span>
                </div>

                <div className="flex-1" />

                <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(challenge.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm font-bold text-primary flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {challenge.price}
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                    {challenge.status === "Active" && (
                        <NeonButton
                            variant="outline"
                            className="w-full text-xs py-2 h-auto"
                            onClick={() => setIsPayoutOpen(true)}
                        >
                            Visszatérítés Kérése
                        </NeonButton>
                    )}
                    {challenge.status === "Reviewing" && (
                        <div className="text-center text-xs text-yellow-400 font-medium py-2 bg-yellow-500/5 rounded-lg">
                            Kérelem Beküldve
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </GlassCard>

            <PayoutModal
                isOpen={isPayoutOpen}
                onClose={() => setIsPayoutOpen(false)}
                challengeId={challenge.id}
            />
        </>
    );
}
