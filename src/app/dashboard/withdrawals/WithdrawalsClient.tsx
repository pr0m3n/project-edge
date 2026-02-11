"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Wallet, History, Clock, Check, X, ArrowDownRight } from "lucide-react";
import { createWithdrawal } from "@/lib/actions/withdrawals";
import { useState } from "react";

const METHODS = [
    { value: "bank", label: "Banki Átutalás" },
    { value: "crypto", label: "Crypto (USDT)" },
    { value: "paypal", label: "PayPal" },
    { value: "prop_firm", label: "Új Prop Firm Számla" },
];

export default function WithdrawalsClient({
    balance,
    withdrawals,
}: {
    balance: number;
    withdrawals: any[];
}) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await createWithdrawal(formData);

        setLoading(false);

        if (result.error) {
            alert("Hiba: " + result.error);
        } else {
            alert("Kifizetési kérelem sikeresen beküldve!");
            setAmount("");
        }
    };

    const parsedAmount = parseFloat(amount) || 0;
    const fee = parsedAmount > 0 ? Math.max(parsedAmount * 0.02, 0.5) : 0;
    const canWithdraw = parsedAmount >= 25 && parsedAmount <= balance;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Approved": return "text-green-400 bg-green-400/10 border-green-400/20";
            case "Rejected": return "text-red-400 bg-red-400/10 border-red-400/20";
            default: return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "Approved": return "Jóváhagyva";
            case "Rejected": return "Elutasítva";
            default: return "Függőben";
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Kifizetések</h1>
                <p className="text-gray-400">Igényeld a jóváhagyott visszatérítéseidet.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Balance Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-black shadow-lg shadow-primary/20">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-semibold opacity-80">Elérhető Egyenleg</span>
                            <Wallet className="w-6 h-6 opacity-80" />
                        </div>
                        <div className="text-4xl font-bold mb-2">${balance.toFixed(2)}</div>
                        <p className="text-sm opacity-75">
                            {balance > 0
                                ? "Igényelj kifizetést az egyenlegedből!"
                                : "Kezdj el igényléseket beküldeni, hogy növeld az egyenleged!"}
                        </p>
                    </div>
                </div>

                {/* Withdrawal Form */}
                <div className="md:col-span-2">
                    <GlassCard className="p-8 mb-8">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Kifizetés Igénylése
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">Kifizetési Mód</label>
                                <select
                                    name="method"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white"
                                >
                                    {METHODS.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">Összeg ($)</label>
                                <input
                                    name="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="25"
                                    max={balance}
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white"
                                />
                            </div>

                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5">
                                <span className="text-sm text-gray-400">Tranzakciós Díj:</span>
                                <span className="font-bold text-white">${fee.toFixed(2)}</span>
                            </div>

                            <NeonButton type="submit" className="w-full py-3" disabled={!canWithdraw || loading}>
                                {loading ? "Feldolgozás..." : "Kifizetés Indítása"}
                            </NeonButton>

                            {!canWithdraw && parsedAmount > 0 && parsedAmount < 25 && (
                                <p className="text-center text-xs text-red-400">Minimum kifizetés: $25.</p>
                            )}
                            {!canWithdraw && parsedAmount > balance && (
                                <p className="text-center text-xs text-red-400">Nincs elegendő egyenleg!</p>
                            )}
                            {balance < 25 && (
                                <p className="text-center text-xs text-yellow-400">Minimum kifizetés: $25. Az egyenleged túl alacsony.</p>
                            )}
                        </form>
                    </GlassCard>

                    {/* Withdrawal History */}
                    <GlassCard className="p-8">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-400" />
                            Kifizetési Előzmények
                        </h3>

                        {withdrawals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                                <div className="p-4 bg-white/5 rounded-full mb-3">
                                    <Wallet className="w-8 h-8 opacity-50" />
                                </div>
                                <p className="font-medium">Nincs találat</p>
                                <p className="text-sm">Nem indítottál még kifizetést.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {withdrawals.map((w) => (
                                    <div key={w.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <ArrowDownRight className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    ${w.amount.toFixed(2)} — {METHODS.find(m => m.value === w.method)?.label || w.method}
                                                </p>
                                                <p className="text-xs text-gray-500">{new Date(w.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(w.status)}`}>
                                            {getStatusLabel(w.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    );
}
