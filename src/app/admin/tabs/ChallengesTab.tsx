"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { ExternalLink } from "lucide-react";
import { AdminActions } from "../AdminActions";

export function ChallengesTab({ challenges }: { challenges: any[] }) {
    return (
        <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4">Dátum</th>
                            <th className="px-6 py-4">Felhasználó</th>
                            <th className="px-6 py-4">Cég / Méret</th>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Státusz</th>
                            <th className="px-6 py-4">Igazolás</th>
                            <th className="px-6 py-4 text-right">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody>
                        {challenges.map((challenge: any) => (
                            <tr key={challenge.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    {new Date(challenge.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {challenge.user_id.slice(0, 8)}... {/* User ID shortened */}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold">{challenge.firm}</div>
                                    <div className="text-xs text-gray-500">{challenge.size}</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs">
                                    {challenge.order_id}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium border ${challenge.status === "Active"
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            : challenge.status === "Passed"
                                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                : challenge.status === "Reviewing"
                                                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}
                                    >
                                        {challenge.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {challenge.payout_proofs?.[0] ? (
                                        <a
                                            href={challenge.payout_proofs[0].proof_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Megtekint
                                        </a>
                                    ) : (
                                        <span className="text-gray-600">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <AdminActions id={challenge.id} status={challenge.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {challenges.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    Nincs megjeleníthető kihívás.
                </div>
            )}
        </GlassCard>
    );
}
