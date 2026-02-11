"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Check, X, User, DollarSign } from "lucide-react";
import { updateWithdrawalStatus } from "@/lib/actions/withdrawals";
import { useState } from "react";

const METHODS: Record<string, string> = {
    bank: "Banki Átutalás",
    crypto: "Crypto (USDT)",
    paypal: "PayPal",
    prop_firm: "Új Prop Firm Számla",
};

export function PayoutsTab({ payouts }: { payouts: any[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleStatusUpdate = async (id: string, status: string) => {
        setLoadingId(id);
        await updateWithdrawalStatus(id, status);
        setLoadingId(null);
    };

    if (!payouts || payouts.length === 0) {
        return (
            <GlassCard className="p-12 text-center text-gray-500">
                Nincs függőben lévő kifizetési kérelem.
            </GlassCard>
        );
    }

    return (
        <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4">Dátum</th>
                            <th className="px-6 py-4">Felhasználó</th>
                            <th className="px-6 py-4">Összeg</th>
                            <th className="px-6 py-4">Kifizetési Adatok</th>
                            <th className="px-6 py-4">Státusz</th>
                            <th className="px-6 py-4 text-right">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payouts.map((payout: any) => (
                            <tr key={payout.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(payout.created_at).toLocaleDateString()}
                                    <div className="text-xs text-gray-500">{new Date(payout.created_at).toLocaleTimeString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span className="font-medium text-white">{payout.profiles?.email || "Unknown"}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 font-bold text-primary">
                                        <DollarSign className="w-4 h-4" />
                                        {payout.amount.toFixed(2)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs mb-1 inline-block">
                                        {METHODS[payout.method] || payout.method}
                                    </span>
                                    {payout.details && (
                                        <div className="text-xs space-y-0.5 text-gray-400 mt-1">
                                            <div><span className="text-gray-500">Bank:</span> {payout.details.bank_name}</div>
                                            <div><span className="text-gray-500">Számla:</span> <span className="font-mono">{payout.details.account_number}</span></div>
                                            <div><span className="text-gray-500">Név:</span> {payout.details.beneficiary_name}</div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium border ${payout.status === "Approved"
                                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                                            : payout.status === "Pending"
                                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}
                                    >
                                        {payout.status === "Approved" ? "Jóváhagyva" : payout.status === "Pending" ? "Függőben" : "Elutasítva"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {payout.status === "Pending" && (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                disabled={loadingId === payout.id}
                                                onClick={() => handleStatusUpdate(payout.id, "Approved")}
                                                className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                                                title="Kifizetés Jóváhagyása"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                disabled={loadingId === payout.id}
                                                onClick={() => handleStatusUpdate(payout.id, "Rejected")}
                                                className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                                                title="Elutasítás (visszatérítés)"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
}
