"use client";

import { useState } from "react";
import { createPartner, deletePartner } from "@/lib/actions/partners";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Trash2, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function PartnerManager({ partners }: { partners: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("Biztosan törlöd ezt a partnert?")) return;
        await deletePartner(id);
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await createPartner(formData);
        setLoading(false);
        if (res && res.error) {
            alert(res.error);
        } else {
            setIsModalOpen(false);
        }
    };

    return (
        <>
            <div className="flex justify-end mb-6">
                <NeonButton onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Új Partner Hozzáadása
                </NeonButton>
            </div>

            <div className="grid gap-6">
                {partners.map((partner) => (
                    <GlassCard key={partner.id} className="p-6 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            {partner.image_url && (
                                <img src={partner.image_url} alt={partner.name} className="w-16 h-16 rounded-lg object-cover bg-white/5" />
                            )}
                            <div>
                                <h3 className="text-xl font-bold">{partner.name}</h3>
                                <p className="text-sm text-gray-400">{partner.description}</p>
                                <div className="flex gap-2 mt-2 text-xs">
                                    <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">{partner.discount_code}</span>
                                    <span className="px-2 py-1 rounded bg-white/10 text-white">{partner.discount_amount}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(partner.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </GlassCard>
                ))}
                {partners.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Nincsenek partnerek. Adj hozzá egyet!
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Új Partner">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Név</label>
                        <input name="name" required className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Leírás</label>
                        <input name="description" required className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Kupon Kód</label>
                            <input name="discount_code" required className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Kedvezmény (pl. 40%)</label>
                            <input name="discount_amount" required className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Részletek (Opcionális)</label>
                        <input name="offer_details" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Link</label>
                        <input name="link" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Kép URL</label>
                        <input name="image_url" placeholder="https://..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white px-4">Mégse</button>
                        <NeonButton type="submit" disabled={loading}>{loading ? "Hozzáadás..." : "Hozzáadás"}</NeonButton>
                    </div>
                </form>
            </Modal>
        </>
    );
}
