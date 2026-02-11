"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { submitPayout } from "@/lib/actions/payouts";

interface PayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    challengeId: string;
}

export function PayoutModal({ isOpen, onClose, challengeId }: PayoutModalProps) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.append("challenge_id", challengeId);

        const result = await submitPayout(formData);

        setLoading(false);
        if (result && result.error) {
            alert(result.error);
        } else {
            onClose();
            alert("Visszatérítési kérelem elküldve!");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Visszatérítési Kérelem">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-gray-400 text-sm">
                    Tölts fel egy képernyőfotót a kifizetésedről (Payout Certificate) vagy a banki tranzakcióról.
                </p>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Bizonyíték URL (Screenshot)</label>
                    <input
                        name="proof_url"
                        type="url"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white"
                        placeholder="https://..."
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
                        {loading ? "Küldés..." : "Igazolás Beküldése"}
                    </NeonButton>
                </div>
            </form>
        </Modal>
    );
}
