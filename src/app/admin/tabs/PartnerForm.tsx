"use client";

import { NeonButton } from "@/components/ui/NeonButton";
import { createPartner, updatePartner } from "@/lib/actions/partners";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface PartnerFormProps {
    onSuccess: () => void;
    initialData?: {
        id: string;
        name: string;
        description: string;
        discount_code: string;
        discount_amount: string;
        offer_details: string;
        link: string;
        image_url: string;
    };
}

export function PartnerForm({ onSuccess, initialData }: PartnerFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const isEditing = !!initialData;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);

        const result = isEditing
            ? await updatePartner(initialData!.id, formData)
            : await createPartner(formData);

        if (result.error) {
            setError(result.error);
        } else {
            onSuccess();
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Cég Neve</label>
                    <input name="name" required defaultValue={initialData?.name || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Logó URL (Opcionális)</label>
                    <input name="image_url" placeholder="https://..." defaultValue={initialData?.image_url || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Rövid Leírás (Bónusz info)</label>
                <textarea name="description" required defaultValue={initialData?.description || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white h-20" />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Kuponkód</label>
                    <input name="discount_code" required defaultValue={initialData?.discount_code || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Kedvezmény (%)</label>
                    <input name="discount_amount" placeholder="20% OFF" required defaultValue={initialData?.discount_amount || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Affiliate Link</label>
                    <input name="link" placeholder="https://..." required defaultValue={initialData?.link || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Ajánlat Részletei (Opcionális)</label>
                <input name="offer_details" placeholder="Pl. Csak új ügyfeleknek" defaultValue={initialData?.offer_details || ""} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end pt-2">
                <NeonButton type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? "Módosítás Mentése" : "Partner Mentése"}
                </NeonButton>
            </div>
        </form>
    );
}
