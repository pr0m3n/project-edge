"use client";

import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { createTicket } from "@/lib/actions/tickets";
import { LifeBuoy } from "lucide-react";
import { useState } from "react";

export function SupportForm() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await createTicket(formData);
        setLoading(false);

        if (res && res.error) {
            alert(res.error);
        } else {
            alert("Hibajegy sikeresen elküldve!");
            (e.target as HTMLFormElement).reset();
        }
    };

    return (
        <GlassCard className="p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-primary" />
                Új Hibajegy Létrehozása
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Tárgy</label>
                    <input
                        name="subject"
                        type="text"
                        placeholder="pl. Probléma a belépéssel"
                        required
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Leírás</label>
                    <textarea
                        name="message"
                        required
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none text-white min-h-[150px]"
                        placeholder="Kérjük írd le részletesen a kérésedet..."
                    ></textarea>
                </div>

                <div className="flex justify-end">
                    <NeonButton type="submit" disabled={loading} className="px-8">
                        {loading ? "Küldés..." : "Hibajegy Beküldése"}
                    </NeonButton>
                </div>
            </form>
        </GlassCard>
    );
}
