"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Check, X, FileText, User, DollarSign } from "lucide-react";
import { updateClaimStatus } from "@/lib/actions/claims";
import { useState } from "react";

export function ClaimsTab({ claims = [] }: { claims: any[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [amountInputId, setAmountInputId] = useState<string | null>(null);
    const [amount, setAmount] = useState("");

    const handleApproveClick = (id: string) => {
        setAmountInputId(id);
        setAmount("");
    };

    const handleConfirmApprove = async (id: string) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            alert("Kérlek adj meg egy érvényes összeget!");
            return;
        }
        setLoadingId(id);
        await updateClaimStatus(id, "Approved", parsedAmount);
        setLoadingId(null);
        setAmountInputId(null);
        setAmount("");
    };

    const handleReject = async (id: string) => {
        setLoadingId(id);
        await updateClaimStatus(id, "Rejected");
        setLoadingId(null);
    };

    return (
        <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4">Dátum</th>
                            <th className="px-6 py-4">Felhasználó</th>
                            <th className="px-6 py-4">Típus</th>
                            <th className="px-6 py-4">Részletek</th>
                            <th className="px-6 py-4">Státusz</th>
                            <th className="px-6 py-4 text-right">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody>
                        {claims.map((claim: any) => (
                            <tr key={claim.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(claim.created_at).toLocaleDateString()}
                                    <div className="text-xs text-gray-500">{new Date(claim.created_at).toLocaleTimeString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <div>
                                            <div className="font-medium text-white">{claim.profiles?.email || "Unknown User"}</div>
                                            <div className="text-xs text-gray-500">{claim.data?.discord_username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs">
                                        {claim.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs space-y-1">
                                        <div><span className="text-gray-500">Cég:</span> {claim.data?.firm}</div>
                                        <div><span className="text-gray-500">Dátum:</span> {claim.data?.date}</div>
                                        {claim.data?.evidence_file && (
                                            <a
                                                href={claim.data.evidence_file.startsWith("http") ? claim.data.evidence_file : "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:text-primary/80 hover:underline truncate max-w-[150px] block cursor-pointer transition-colors"
                                                title={claim.data.evidence_file}
                                                onClick={(e) => {
                                                    if (!claim.data.evidence_file.startsWith("http")) {
                                                        e.preventDefault();
                                                        alert("Fájlnév: " + claim.data.evidence_file + "\n\n(A fájl jelenleg nem elérhető, mert a Supabase Storage még nincs konfigurálva.)");
                                                    }
                                                }}
                                            >
                                                <FileText className="w-3 h-3 inline mr-1" />
                                                {claim.data.evidence_file}
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium border ${claim.status === "Approved"
                                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                                            : claim.status === "Pending"
                                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}
                                    >
                                        {claim.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {claim.status === "Pending" && (
                                        <div>
                                            {amountInputId === claim.id ? (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <div className="relative">
                                                        <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="number"
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            placeholder="Összeg"
                                                            className="w-24 bg-black/50 border border-primary/30 rounded px-2 pl-7 py-1.5 text-xs text-white outline-none focus:border-primary"
                                                            autoFocus
                                                            min="1"
                                                            step="0.01"
                                                        />
                                                    </div>
                                                    <button
                                                        disabled={loadingId === claim.id}
                                                        onClick={() => handleConfirmApprove(claim.id)}
                                                        className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors text-xs"
                                                        title="Megerősítés"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAmountInputId(null)}
                                                        className="p-1.5 bg-white/5 text-gray-400 rounded hover:bg-white/10 transition-colors text-xs"
                                                        title="Mégse"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        disabled={loadingId === claim.id}
                                                        onClick={() => handleApproveClick(claim.id)}
                                                        className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                                                        title="Jóváhagyás"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        disabled={loadingId === claim.id}
                                                        onClick={() => handleReject(claim.id)}
                                                        className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                                                        title="Elutasítás"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {claims.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    Nincs megjeleníthető igénylés.
                </div>
            )}
        </GlassCard>
    );
}
