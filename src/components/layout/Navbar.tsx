"use client";

import Link from "next/link";
import { NeonButton } from "../ui/NeonButton";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin")) {
        return null;
    }

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-6 md:px-12 backdrop-blur-md bg-black/50 border-b border-white/5"
        >
            <Link href="/" className="text-2xl font-bold tracking-tighter group">
                PROJECT <span className="text-primary group-hover:text-glow transition-all">EDGE</span>
            </Link>

            <div className="flex items-center gap-4">
                {isLoggedIn ? (
                    <Link href="/dashboard">
                        <NeonButton variant="primary" glow className="px-5 py-2 text-sm">
                            Dashboard
                        </NeonButton>
                    </Link>
                ) : (
                    <>
                        <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">
                            Bejelentkezés
                        </Link>
                        <Link href="/login">
                            <NeonButton variant="primary" glow className="px-5 py-2 text-sm">
                                Kezdés
                            </NeonButton>
                        </Link>
                    </>
                )}
            </div>
        </motion.nav>
    );
}
