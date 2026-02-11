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

        try {
            const formData = new FormData(e.currentTarget);
            formData.append("challenge_id", challengeId);

            // File Upload Logic
            const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
            const file = fileInput?.files?.[0];

            if (file) {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Nem vagy bejelentkezve!");

                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}_payout.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('claims-evidence')
                    .upload(fileName, file);

                if (uploadError) throw new Error("Fájl feltöltése sikertelen: " + uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('claims-evidence')
                    .getPublicUrl(fileName);

                formData.set("proof_url", publicUrl);
            } else {
                // Fallback if no file is selected but maybe url input was used? 
                // But wait, user asked for file upload. Let's make it mandatory or just use file.
                // The previous code had "proof_url" input. 
                // I will replace URL input with File input.
                // So if no file, error.
                throw new Error("Kérlek tölts fel egy igazolást!");
            }

            const result = await submitPayout(formData);

            if (result && result.error) {
                alert(result.error);
            } else {
                onClose();
                alert("Visszatérítési kérelem sikeresen elküldve!");
            }
        } catch (error: any) {
            console.error(error);
            alert("Hiba történt: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Visszatérítési Kérelem">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-gray-400 text-sm">
                    Tölts fel egy képernyőfotót a kifizetésedről vagy a sikertelen tranzakcióról.
                </p>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Bizonyíték (Kép/PDF)</label>
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
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
                        {loading ? "Küldés..." : "Kérelem Beküldése"}
                    </NeonButton>
                </div>
            </form>
        </Modal>
    );
}
