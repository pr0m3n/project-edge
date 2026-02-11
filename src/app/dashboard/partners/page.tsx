import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { ExternalLink, Tag } from "lucide-react";
import { getPartners } from "@/lib/actions/partners";

export const dynamic = 'force-dynamic';

export default async function PartnerFirmsPage() {
    const partners = await getPartners();

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Partner Cégek</h1>
                <p className="text-gray-400">Exkluzív kedvezmények és ajánlatok partnereinktől.</p>
            </div>

            <div className="space-y-6">
                {partners.map((partner: any) => (
                    <GlassCard key={partner.id} className="flex flex-col md:flex-row items-center justify-between p-6 gap-6 group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-6">
                            {/* Logo or Placeholder */}
                            {partner.image_url ? (
                                <img src={partner.image_url} alt={partner.name} className="w-16 h-16 rounded-xl object-contain bg-white/5 p-2" />
                            ) : (
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${partner.bg_color} ${partner.color} border ${partner.border_color}`}>
                                    {partner.name[0]}
                                </div>
                            )}

                            <div className="text-center md:text-left">
                                <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                                    <h3 className="text-xl font-bold">{partner.name}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${partner.bg_color} ${partner.color} border ${partner.border_color}`}>
                                        {partner.discount_amount} OFF
                                    </span>
                                </div>
                                <p className="text-sm font-medium max-w-lg" style={{ color: '#fbbf24', textShadow: '0 0 10px rgba(251, 191, 36, 0.4)' }}>{partner.description}</p>
                                {partner.offer_details && <p className="text-xs text-gray-500 mt-1">{partner.offer_details}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="hidden md:flex flex-col items-end mr-4">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">Kuponkód</span>
                                <div className="flex items-center gap-2 font-mono text-primary font-bold bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                    <Tag className="w-3 h-3" />
                                    {partner.discount_code}
                                </div>
                            </div>
                            <a href={partner.link || "#"} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                                <NeonButton className="w-full whitespace-nowrap">
                                    Ajánlat Megtekintése
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </NeonButton>
                            </a>
                        </div>
                    </GlassCard>
                ))}

                {partners.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Jelenleg nincsenek aktív partner ajánlatok. Nézz vissza később!
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
