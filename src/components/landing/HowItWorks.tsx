"use client";

import { GlassCard } from "../ui/GlassCard";
import { UserPlus, Gift, Banknote } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
    {
        icon: UserPlus,
        title: "1. Csatlakozz & Vásárolj",
        description: "Regisztrálj a Project Edge felületén, és használd a partner kódjainkat (pl. EDGE40) a kedvezményes vásárláshoz.",
    },
    {
        icon: Banknote,
        title: "2. Kereskedj",
        description: "Használd a számlát a szokásos módon. Ha sikerül, ha nem, mi itt vagyunk mögötted.",
    },
    {
        icon: Gift,
        title: "3. Zsebeld be a Jutalmat",
        description: "Sikeres kifizetésnél bónusz készpénzt adunk. Ha elbuksz, új fiókot vagy visszatérítést nyerhetsz a sorsolásainkon.",
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="relative py-20 md:py-32 overflow-hidden">
            {/* Subtle animated background */}
            <div className="absolute inset-0">
                {/* Soft gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-primary/[0.03] to-black/50" />

                {/* Slow orbiting orb */}
                <motion.div
                    animate={{
                        x: [0, 30, -20, 0],
                        y: [0, -20, 15, 0],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[500px] h-[300px] bg-primary/[0.06] rounded-full blur-[120px]"
                />

                {/* Top/bottom separator lines */}
                <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute bottom-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Connecting dots between cards */}
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ opacity: [0.1, 0.4, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
                        className="absolute hidden md:block w-1.5 h-1.5 bg-primary/30 rounded-full"
                        style={{
                            top: '58%',
                            left: `${28 + i * 6}%`,
                        }}
                    />
                ))}
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={`r-${i}`}
                        animate={{ opacity: [0.1, 0.4, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 + 0.4, ease: "easeInOut" }}
                        className="absolute hidden md:block w-1.5 h-1.5 bg-primary/30 rounded-full"
                        style={{
                            top: '58%',
                            left: `${61 + i * 6}%`,
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Hogyan Működik?</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        A Project Edge több mint egy visszatérítés. Ez egy ökoszisztéma, ami támogatja a fejlődésedet.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {STEPS.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.5 }}
                        >
                            <GlassCard className="p-8 relative overflow-hidden group hover:border-primary/50 transition-colors h-full">
                                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Step number watermark */}
                                <div className="absolute -top-4 -right-2 text-[80px] font-black text-white/[0.03] leading-none select-none">
                                    {index + 1}
                                </div>

                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 group-hover:border-primary/30 transition-all duration-300">
                                        <step.icon className="w-7 h-7" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
