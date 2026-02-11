"use client";

import { motion } from "framer-motion";

export function PartnersSection({ partners }: { partners: any[] }) {
    if (!partners || partners.length === 0) return null;

    return (
        <section id="partners" className="relative py-20 md:py-32 overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Center gradient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent" />

                {/* Floating orbs - much brighter */}
                <motion.div
                    animate={{
                        x: [0, 60, -40, 0],
                        y: [0, -50, 30, 0],
                        scale: [1, 1.3, 0.85, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[10%] right-[5%] w-[450px] h-[450px] bg-primary/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -50, 50, 0],
                        y: [0, 30, -40, 0],
                        scale: [1, 0.8, 1.2, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[5%] left-[5%] w-[400px] h-[400px] bg-amber-500/15 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, 30, -20, 0],
                        y: [0, -40, 20, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[30%] left-[40%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px]"
                />

                {/* Horizontal glow lines - brighter */}
                <div className="absolute top-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="absolute bottom-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                {/* Animated scan line */}
                <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                />

                {/* Corner brackets - brighter and bigger */}
                <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-primary/50 rounded-tl-lg"
                />
                <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                    className="absolute top-6 right-6 w-16 h-16 border-r-2 border-t-2 border-primary/50 rounded-tr-lg"
                />
                <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-6 left-6 w-16 h-16 border-l-2 border-b-2 border-primary/50 rounded-bl-lg"
                />
                <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-6 right-6 w-16 h-16 border-r-2 border-b-2 border-primary/50 rounded-br-lg"
                />

                {/* Floating particles - bigger and brighter */}
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -120, 0],
                            opacity: [0, 1, 0],
                            scale: [0.5, 1.5, 0.5],
                        }}
                        transition={{
                            duration: 3 + i * 0.8,
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: "easeInOut",
                        }}
                        className="absolute rounded-full"
                        style={{
                            left: `${5 + i * 8}%`,
                            bottom: '10%',
                            width: `${3 + (i % 3) * 2}px`,
                            height: `${3 + (i % 3) * 2}px`,
                            backgroundColor: i % 3 === 0 ? 'rgba(0, 255, 136, 0.6)' : i % 3 === 1 ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.4)',
                        }}
                    />
                ))}

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,255,136,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,.3) 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }}
                />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                        Partner <span className="text-primary text-glow">Cégek</span>
                    </h2>
                    <p className="text-gray-400 max-w-lg mx-auto">
                        Dolgozz együtt a világ legjobb prop firm-jeivel — exkluzív kedvezményekkel.
                    </p>
                </motion.div>

                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                    {partners.map((partner, i) => (
                        <motion.div
                            key={partner.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="group flex flex-col items-center gap-3"
                        >
                            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center p-3 group-hover:border-primary/30 group-hover:bg-white/10 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10">
                                {partner.image_url ? (
                                    <img
                                        src={partner.image_url}
                                        alt={partner.name}
                                        className="w-16 h-16 object-contain"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-primary">
                                        {partner.name?.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                                {partner.name}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
