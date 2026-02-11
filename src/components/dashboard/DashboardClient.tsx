"use client";

import { useState } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { AddChallengeModal } from "./AddChallengeModal";

export function DashboardClient() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tighter">
                        Szia, <span className="text-primary">Trader</span>!
                    </h2>
                    <p className="text-gray-400">Itt láthatod a jelenlegi kihívásaid állapotát.</p>
                </div>
                <NeonButton onClick={() => setIsModalOpen(true)}>Kihívás Regisztrálása</NeonButton>
            </div>

            <AddChallengeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
