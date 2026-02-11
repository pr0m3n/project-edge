"use client";

import { motion } from "framer-motion";
import { NeonButton } from "../ui/NeonButton";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Trophy, Banknote } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Hero() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });
    }, []);

    const scrollToPartners = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById("partners");
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden min-h-screen flex items-center">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Radial gradient center glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />

                {/* Diagonal animated lines */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="hero-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="60" x2="60" y2="0" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hero-grid)" />
                </svg>

                {/* Large floating orbs */}
                <motion.div
                    animate={{
                        x: [0, 60, -40, 0],
                        y: [0, -80, 40, 0],
                        scale: [1, 1.3, 0.9, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]"
                />
                <motion.div
                    animate={{
                        x: [0, -50, 40, 0],
                        y: [0, 50, -50, 0],
                        scale: [1, 0.8, 1.2, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] bg-secondary/6 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{
                        x: [0, 30, -20, 0],
                        y: [0, -30, 50, 0],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[5%] right-[30%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[120px]"
                />

                {/* Animated horizontal scan line */}
                <motion.div
                    animate={{ y: ["-100%", "200%"] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                />

                {/* Corner accents */}
                <div className="absolute top-20 left-0 w-[300px] h-px bg-gradient-to-r from-primary/20 to-transparent" />
                <div className="absolute top-20 left-0 w-px h-[200px] bg-gradient-to-b from-primary/20 to-transparent" />
                <div className="absolute top-20 right-0 w-[300px] h-px bg-gradient-to-l from-primary/20 to-transparent" />
                <div className="absolute top-20 right-0 w-px h-[200px] bg-gradient-to-b from-primary/20 to-transparent" />

                {/* Rising particles */}
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -200, 0],
                            opacity: [0, 0.6, 0],
                            scale: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 5 + i * 1.5,
                            repeat: Infinity,
                            delay: i * 0.8,
                            ease: "easeInOut",
                        }}
                        className="absolute rounded-full"
                        style={{
                            left: `${5 + i * 8}%`,
                            bottom: '5%',
                            width: `${2 + (i % 3)}px`,
                            height: `${2 + (i % 3)}px`,
                            backgroundColor: i % 2 === 0 ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                        }}
                    />
                ))}

                {/* Twinkling stars */}
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={`star-${i}`}
                        animate={{
                            opacity: [0.1, 0.8, 0.1],
                        }}
                        transition={{
                            duration: 2 + (i % 4),
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: "easeInOut",
                        }}
                        className="absolute w-[2px] h-[2px] bg-white rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 70}%`,
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span>ÚJ: Bővített Partner Program</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6">
                        Kereskedj <span className="text-primary text-glow">Okosabban</span>,<br />
                        Kockázat <span className="text-secondary text-glow">Nélkül</span>
                    </h1>

                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        A Project Edge nem csak visszatéríti a bukott teszteket. Mi egy teljes
                        <span className="text-white font-bold"> Jutalmazási Platform </span>
                        vagyunk. Nyerj új fiókokat, kapj készpénzt a kifizetésed mellé, és csökkentsd a költségeidet.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                            <NeonButton className="group text-lg px-8 py-4 inline-flex items-center whitespace-nowrap">
                                <span>Csatlakozás Most</span>
                                <ArrowRight className="w-4 h-4 ml-2 inline-block group-hover:translate-x-1 transition-transform flex-shrink-0" />
                            </NeonButton>
                        </Link>
                        <button onClick={scrollToPartners}>
                            <NeonButton variant="outline" className="text-lg px-8 py-4">
                                Partner Cégek
                            </NeonButton>
                        </button>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 mt-20 max-w-4xl mx-auto border-t border-white/10 pt-10"
                >
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2 text-primary font-bold text-3xl md:text-4xl">
                            <Banknote className="w-6 h-6 md:w-8 md:h-8" />
                            <span>1M+ Ft</span>
                        </div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Visszatérítve & Jutalmazva</p>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2 text-secondary font-bold text-3xl md:text-4xl">
                            <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
                            <span>100%</span>
                        </div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Biztonságos Kifizetés</p>
                    </div>
                    <div className="text-center col-span-2 md:col-span-1">
                        <div className="flex items-center justify-center gap-2 mb-2 text-white font-bold text-3xl md:text-4xl">
                            <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                            <span>3+</span>
                        </div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Prémium Partner</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
