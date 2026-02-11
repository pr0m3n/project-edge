import { ChallengeList } from "@/components/dashboard/ChallengeList";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Wallet, Trophy, ClipboardCheck, ArrowUpRight, AlertCircle, Calendar } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    return (
        <DashboardLayout>
            {/* Header */}
            <DashboardClient />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Egyenleg"
                    value="$0"
                    description="Feltöltés szükséges"
                    icon={Wallet}
                    variant="primary"
                />
                <StatsCard
                    title="Igényelt Számlák"
                    value="0"
                    description="Ingyenes számlák + havi"
                    icon={ClipboardCheck}
                />
                <StatsCard
                    title="Kifizetett Bónusz"
                    value="$0"
                    description="Jóváhagyott bónuszok"
                    icon={Trophy}
                />
                <StatsCard
                    title="Összes Kifizetés"
                    value="$0"
                    description="Sikeres kifizetések"
                    icon={ArrowUpRight}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Recent Requests) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold">Legutóbbi Kérelmek</h3>
                        <button className="text-sm text-primary hover:underline">Összes megtekintése</button>
                    </div>

                    {/* We reuse the ChallengeList here as the feed */}
                    <ChallengeList />
                </div>

                {/* Right Info Panel */}
                <div className="space-y-6">
                    {/* Pending Actions */}
                    <GlassCard className="p-6">
                        <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-400" />
                            Teendők
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Függőben lévő igények</span>
                                <span className="font-medium">0</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Jóváhagyott igények</span>
                                <span className="font-medium text-green-400">0</span>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Quick Tips */}
                    <GlassCard className="p-6">
                        <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            Gyors Tippek
                        </h4>
                        <ul className="space-y-3 text-xs text-gray-400 list-disc list-inside">
                            <li>Igényeidet 60 napon belül nyújtsd be.</li>
                            <li>Pontos kereskedési adatokat adj meg.</li>
                            <li>Minimum kifizetés: $25.</li>
                            <li>Feldolgozási idő: 72 óra.</li>
                        </ul>
                    </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    );
}
