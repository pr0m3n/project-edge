"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Clock, DollarSign, Trash2 } from "lucide-react";
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
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Biztosan törölni szeretnéd ezt a regisztrációt?")) return;

        setLoading(true);
        const { deleteChallenge } = await import("@/lib/actions/challenges");
        const result = await deleteChallenge(challenge.id);
        setLoading(false);

        if (result && result.error) {
            alert(result.error);
        }
    };

    return (
        <GlassCard className="relative overflow-hidden group flex flex-col h-full bg-white/5 border-white/10 hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white">{challenge.firm}</h3>
                    <p className="text-sm text-gray-400">Számla: {challenge.size}</p>
                    <p className="text-xs text-gray-500 mt-1">Order: {challenge.order_id}</p>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                    title="Törlés"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
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

            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </GlassCard>
    );
}
