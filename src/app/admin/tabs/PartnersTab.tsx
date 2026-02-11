"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Plus, Trash2, Tag, Pencil } from "lucide-react";
import { deletePartner } from "@/lib/actions/partners";
import { useState } from "react";
import { PartnerForm } from "./PartnerForm";

export function PartnersTab({ partners }: { partners: any[] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (confirm("Biztosan törölni szeretnéd ezt a partnert?")) {
            await deletePartner(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <NeonButton onClick={() => { setIsAdding(!isAdding); setEditingId(null); }} variant="primary" glow>
                    <Plus className="w-4 h-4 mr-2" />
                    {isAdding ? "Mégse" : "Új Partner Hozzáadása"}
                </NeonButton>
            </div>

            {isAdding && (
                <GlassCard className="p-6 border-primary/20">
                    <h3 className="text-lg font-bold mb-4">Új Partner</h3>
                    <PartnerForm onSuccess={() => setIsAdding(false)} />
                </GlassCard>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {partners.map((partner) => (
                    <GlassCard key={partner.id} className="p-6 relative group">
                        {/* Action buttons */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                                onClick={() => { setEditingId(editingId === partner.id ? null : partner.id); setIsAdding(false); }}
                                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title="Szerkesztés"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(partner.id)}
                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Törlés"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            {partner.image_url ? (
                                <img src={partner.image_url} alt={partner.name} className="w-12 h-12 rounded-lg object-contain bg-white/5 p-1" />
                            ) : (
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${partner.bg_color} ${partner.color} border ${partner.border_color}`}>
                                    {partner.name[0]}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-lg">{partner.name}</h3>
                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                    {partner.discount_amount} Kedvezmény
                                </span>
                            </div>
                        </div>

                        {/* Gold glowing description */}
                        <p className="text-sm font-medium mb-4 line-clamp-2" style={{ color: '#fbbf24', textShadow: '0 0 10px rgba(251, 191, 36, 0.4)' }}>
                            {partner.description}
                        </p>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg">
                                <Tag className="w-3 h-3" />
                                <span className="font-mono">{partner.discount_code}</span>
                            </div>
                            <a href={partner.link} target="_blank" className="text-primary hover:underline text-xs">
                                Link megnyitása
                            </a>
                        </div>

                        {/* Inline Edit Form */}
                        {editingId === partner.id && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <h4 className="text-sm font-bold text-primary mb-3">Szerkesztés</h4>
                                <PartnerForm
                                    onSuccess={() => setEditingId(null)}
                                    initialData={{
                                        id: partner.id,
                                        name: partner.name,
                                        description: partner.description,
                                        discount_code: partner.discount_code,
                                        discount_amount: partner.discount_amount,
                                        offer_details: partner.offer_details || "",
                                        link: partner.link,
                                        image_url: partner.image_url || "",
                                    }}
                                />
                            </div>
                        )}
                    </GlassCard>
                ))}
            </div>

            {partners.length === 0 && !isAdding && (
                <div className="p-12 text-center text-gray-500">
                    Nincs aktív partner. Adj hozzá egyet!
                </div>
            )}
        </div>
    );
}
