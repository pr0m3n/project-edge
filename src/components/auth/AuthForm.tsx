"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "../ui/NeonButton";
import { GlassCard } from "../ui/GlassCard";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AuthForm() {
    type AuthMode = 'login' | 'signup' | 'forgot_password';
    const [mode, setMode] = useState<AuthMode>('login');
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

        if (mode === 'login') {
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
        } else if (mode === 'signup') {
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
        } else if (mode === 'forgot_password') {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });

            if (error) {
                setMessage("Hiba: " + error.message);
            } else {
                setMessage("Elküldtük a jelszó visszaállító linket az email címedre!");
            }
            setLoading(false);
        }
    };

    return (
        <GlassCard className="w-full max-w-md mx-auto p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                    {mode === 'login' && "Üdvözlünk Újra"}
                    {mode === 'signup' && "Csatlakozz Hozzánk"}
                    {mode === 'forgot_password' && "Jelszó Visszaállítása"}
                </h2>
                <p className="text-gray-400 text-sm">
                    {mode === 'login' && "Jelentkezz be a fiókodba."}
                    {mode === 'signup' && "Hozz létre egy új fiókot ingyen."}
                    {mode === 'forgot_password' && "Add meg az email címedet a visszaállításhoz."}
                </p>
            </div>

            <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-lg border border-white/5">
                <button
                    onClick={() => setMode('login')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? "bg-primary/20 text-primary border border-primary/20" : "text-gray-400 hover:text-white"
                        }`}
                >
                    Bejelentkezés
                </button>
                <button
                    onClick={() => setMode('signup')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? "bg-primary/20 text-primary border border-primary/20" : "text-gray-400 hover:text-white"
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

                {mode !== 'forgot_password' && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-400">Jelszó</label>
                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot_password')}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                    Elfelejtett jelszó?
                                </button>
                            )}
                        </div>
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
                )}

                {message && (
                    <div className={`p-3 rounded-lg text-sm text-center ${message.includes("Hiba") ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"}`}>
                        {message}
                    </div>
                )}

                <NeonButton type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> :
                        (mode === 'login' ? "Bejelentkezés" :
                            mode === 'signup' ? "Regisztráció" :
                                "Küldés")
                    }
                </NeonButton>

                {mode === 'forgot_password' && (
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="w-full text-center text-sm text-gray-500 hover:text-white transition-colors mt-2"
                    >
                        Vissza a bejelentkezéshez
                    </button>
                )}
            </form>
        </GlassCard>
    );
}
