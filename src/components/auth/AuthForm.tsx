"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "../ui/NeonButton";
import { GlassCard } from "../ui/GlassCard";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const supabase = createClient();
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setMessage("Hiba: " + error.message);
                setLoading(false);
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } else {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                setMessage("Hiba: " + error.message);
            } else {
                setMessage("Sikeres regisztráció! Ellenőrizd az email fiókodat.");
            }
            setLoading(false);
        }
    };

    return (
        <GlassCard className="w-full max-w-md mx-auto p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                    {isLogin ? "Üdvözlünk Újra" : "Csatlakozz Hozzánk"}
                </h2>
                <p className="text-gray-400 text-sm">
                    {isLogin
                        ? "Jelentkezz be a fiókodba."
                        : "Hozz létre egy új fiókot ingyen."}
                </p>
            </div>

            <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-lg border border-white/5">
                <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? "bg-primary/20 text-primary border border-primary/20" : "text-gray-400 hover:text-white"
                        }`}
                >
                    Bejelentkezés
                </button>
                <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? "bg-primary/20 text-primary border border-primary/20" : "text-gray-400 hover:text-white"
                        }`}
                >
                    Regisztráció
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Cím</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="trader@pelda.hu"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Jelszó</label>
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

                {message && (
                    <div className={`p-3 rounded-lg text-sm text-center ${message.includes("Hiba") ? "bg-red-500/10 text-red-400 text-red-500" : "bg-green-500/10 text-green-400 text-green-500"}`}>
                        {message}
                    </div>
                )}

                <NeonButton type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isLogin ? "Bejelentkezés" : "Regisztráció")}
                </NeonButton>
            </form>
        </GlassCard>
    );
}
