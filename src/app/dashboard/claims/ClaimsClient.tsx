"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, Clock, Check, X } from "lucide-react";
import { createClaim } from "@/lib/actions/claims";

const CLAIM_TYPES = [
    { id: "free_account", label: "Ingyenes Számla Igénylés" },
    { id: "payout_bonus", label: "Kifizetési Bónusz Igénylés" },
    { id: "monthly_trial", label: "Havi Ingyenes Próba" },
];

export default function ClaimsClient({ initialClaims }: { initialClaims: any[] }) {
    const [activeTab, setActiveTab] = useState("free_account");
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.append("type", activeTab);
        // Mock file handling: we're not actually uploading to storage in this demo phase without bucket config,
        // so we just pass the filename as text to the action for now.
        if (fileName) {
            formData.set("evidence_file", fileName); // Overwrite file object with name for simple text storage
        }

        const result = await createClaim(formData);

        setLoading(false);

        if (result.error) {
            alert("Hiba történt: " + result.error);
        } else {
            alert("Igénylés sikeresen beküldve!");
            setFileName("");
            // Optional: reset form
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'Rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Igénylés Beküldése</h1>
                <p className="text-gray-400">Válaszd ki az igénylés típusát alább.</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-1 rounded-xl border border-white/10 w-fit">
                {CLAIM_TYPES.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setActiveTab(type.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === type.id
                            ? "bg-primary text-black shadow-lg shadow-primary/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <GlassCard className="p-8">
                        <div className="mb-8 flex gap-3 text-sm text-gray-400 bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
                            <div className="mt-0.5"><CheckCircle2 className="w-5 h-5 text-blue-400" /></div>
                            <div>
                                <span className="text-blue-400 font-bold block mb-1">Szabályok:</span>
                                Kérjük, csatolj bizonyítékot az evaluáció teljesítéséről vagy a kifizetésről.
                                Győződj meg róla, hogy a dátum, idő és a számlázási adatok jól láthatóak.
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">Prop Firm</label>
                                    <select name="firm" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white">
                                        <option value="">Válassz céget...</option>
                                        <option value="MyFundedFutures">MyFundedFutures</option>
                                        <option value="Alpha Futures">Alpha Futures</option>
                                        <option value="Lucid Trading">Lucid Trading</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">Vásárlás Dátuma</label>
                                    <input name="date" type="date" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white" />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">Időzóna</label>
                                    <select name="timezone" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white">
                                        <option value="CET">CET (Budapest)</option>
                                        <option value="EST">EST (New York)</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">Discord Felhasználónév</label>
                                    <input name="discord_username" type="text" placeholder="pl. trader#1234" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">Bizonyíték Feltöltése (Kép/PDF)</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*,application/pdf"
                                />
                                <div
                                    onClick={handleFileClick}
                                    className={`border-2 border-dashed rounded-xl p-8 hover:border-primary/50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${fileName ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}
                                >
                                    <UploadCloud className={`w-10 h-10 mb-3 ${fileName ? 'text-primary' : 'text-gray-400'}`} />
                                    <p className="text-sm font-medium text-white">{fileName || "Kattints a feltöltéshez vagy húzd ide a fájlt"}</p>
                                    <p className="text-xs text-gray-500 mt-1">{fileName ? "Fájl kiválasztva" : "PNG, JPG vagy PDF (Max. 5MB)"}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">Megjegyzés (Opcionális)</label>
                                <textarea
                                    name="comment"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white min-h-[100px]"
                                    placeholder="Egyéb fontos információ..."
                                ></textarea>
                            </div>

                            <NeonButton type="submit" disabled={loading} className="w-full py-4 text-lg">
                                {loading ? "Beküldés folyamatban..." : "Igény Beküldése"}
                            </NeonButton>
                        </form>
                    </GlassCard>
                </div>

                {/* History Sidebar */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">Korábbi Igénylések</h3>
                    <div className="space-y-4">
                        {initialClaims.length === 0 ? (
                            <GlassCard className="p-6 text-center text-gray-500">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Még nincs beküldött igénylésed.</p>
                            </GlassCard>
                        ) : (
                            initialClaims.map((claim) => (
                                <GlassCard key={claim.id} className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(claim.status)}`}>
                                            {claim.status === 'Pending' ? 'Függőben' : claim.status === 'Approved' ? 'Jóváhagyva' : 'Elutasítva'}
                                        </span>
                                        <span className="text-xs text-gray-500">{new Date(claim.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="font-medium text-sm mb-1">{CLAIM_TYPES.find(t => t.id === claim.type)?.label || claim.type}</p>
                                    <p className="text-xs text-gray-400">{claim.data?.firm || "Nincs cég megadva"}</p>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
