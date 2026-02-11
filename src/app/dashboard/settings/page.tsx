"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Loader2, User, Lock, Mail, Phone, Calendar } from "lucide-react";

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [updating, setUpdating] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        getUser();
    }, []);

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage("Hiba: A jelszavak nem egyeznek!");
            return;
        }
        if (password.length < 6) {
            setMessage("Hiba: A jelszónak legalább 6 karakternek kell lennie!");
            return;
        }

        setUpdating(true);
        setMessage("");

        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) {
            setMessage("Hiba: " + error.message);
        } else {
            setMessage("Siker: A jelszó frissítve! Kérlek jelentkezz be újra.");
            setPassword("");
            setConfirmPassword("");
        }
        setUpdating(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Beállítások</h1>
                    <p className="text-gray-400">Fiók adatok és biztonsági beállítások kezelése.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Profile Card */}
                    <GlassCard className="p-8 space-y-6">
                        <div className="flex items-center gap-3 text-xl font-bold text-white border-b border-white/10 pb-4">
                            <User className="w-6 h-6 text-primary" />
                            <h2>Profil Adataim</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email Cím</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-white opacity-75 cursor-not-allowed">
                                    <Mail className="w-5 h-5 text-gray-500" />
                                    <span>{user?.email}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Az email cím nem módosítható.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tagság Kezdete</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-white">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    <span>{new Date(user?.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fiók Azonosító (UID)</label>
                                <div className="px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-gray-500 text-xs font-mono truncate">
                                    {user?.id}
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Security Card */}
                    <GlassCard className="p-8 space-y-6">
                        <div className="flex items-center gap-3 text-xl font-bold text-white border-b border-white/10 pb-4">
                            <Lock className="w-6 h-6 text-primary" />
                            <h2>Biztonság</h2>
                        </div>

                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Új Jelszó</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Jelszó Megerősítése</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm text-center ${message.includes("Hiba") ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"}`}>
                                    {message}
                                </div>
                            )}

                            <div className="pt-2">
                                <NeonButton type="submit" className="w-full justify-center" disabled={updating}>
                                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Jelszó Frissítése"}
                                </NeonButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    );
}
