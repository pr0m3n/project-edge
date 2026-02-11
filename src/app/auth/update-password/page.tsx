"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const supabase = createClient();
    const router = useRouter();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage("Hiba: A jelszavak nem egyeznek!");
            return;
        }
        if (password.length < 6) {
            setMessage("Hiba: A jelszónak legalább 6 karakternek kell lennie!");
            return;
        }

        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setMessage("Hiba: " + error.message);
        } else {
            setMessage("Siker: A jelszó frissítve! Átirányítás...");
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        }
        setLoading(false);
    };

    return (
        <Section className="min-h-[80vh] flex items-center justify-center">
            <GlassCard className="w-full max-w-md mx-auto p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Új Jelszó Beállítása</h2>
                    <p className="text-gray-400 text-sm">
                        Adj meg egy új jelszót a fiókodhoz.
                    </p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Új Jelszó</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Jelszó Megerősítése</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm text-center ${message.includes("Hiba") ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"}`}>
                            {message}
                        </div>
                    )}

                    <NeonButton type="submit" className="w-full justify-center" disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Jelszó Mentése"}
                    </NeonButton>
                </form>
            </GlassCard>
        </Section>
    );
}
