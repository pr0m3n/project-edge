"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createChallenge } from "@/lib/actions/challenges";

interface AddChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROP_FIRMS = ["MyFundedFutures", "Alpha Futures", "Lucid Trading"];
const ACCOUNT_SIZES = ["50k", "100k", "150k"];

export function AddChallengeModal({ isOpen, onClose }: AddChallengeModalProps) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await createChallenge(formData);

        setLoading(false);

        if (result && result.error) {
            alert(result.error);
        } else {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kihívás Regisztrálása">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Prop Firm</label>
                    <select name="firm" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white">
                        {PROP_FIRMS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Méret</label>
                        <select name="size" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white">
                            {ACCOUNT_SIZES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Ár ($)</label>
                        <input
                            name="price"
                            type="number"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Rendelés Azonosító (Order ID)</label>
                    <input
                        name="order_id"
                        type="text"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white"
                        placeholder="#12345"
                        required
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                    >
                        Mégse
                    </button>
                    <NeonButton type="submit" disabled={loading} className="px-6 py-2">
                        {loading ? "Hozzáadás..." : "Hozzáadás"}
                    </NeonButton>
                </div>
            </form>
        </Modal>
    );
}
