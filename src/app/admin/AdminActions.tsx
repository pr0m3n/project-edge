"use client";

import { updateChallengeStatus } from "@/lib/actions/admin";
import { Check, X, ShieldAlert } from "lucide-react";
import { useState } from "react";

export function AdminActions({ id, status }: { id: string, status: string }) {
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (newStatus: string) => {
        if (!confirm(`Biztosan módosítod a státuszt erre: ${newStatus}?`)) return;
        setLoading(true);
        await updateChallengeStatus(id, newStatus);
        setLoading(false);
    };

    if (status === "Passed") return <span className="text-green-500 text-xs">Jóváhagyva</span>;

    return (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => handleUpdate("Passed")}
                disabled={loading}
                className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                title="Jóváhagyás (Passed)"
            >
                <Check className="w-4 h-4" />
            </button>
            <button
                onClick={() => handleUpdate("Failed")}
                disabled={loading}
                className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                title="Elutasítás (Failed)"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
