import { LucideIcon } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";

interface StatsCardProps {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    variant?: "default" | "primary" | "secondary";
}

export function StatsCard({ title, value, description, icon: Icon, variant = "default" }: StatsCardProps) {
    const isPrimary = variant === "primary";

    return (
        <GlassCard className="p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${isPrimary ? 'bg-primary/20' : 'bg-white/5'}`}>
                    <Icon className={`w-6 h-6 ${isPrimary ? 'text-primary' : 'text-gray-400'}`} />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
                <div className={`text-2xl font-bold mb-1 ${isPrimary ? 'text-primary' : 'text-white'}`}>
                    {value}
                </div>
                <p className="text-xs text-gray-500">{description}</p>
            </div>

            {/* Decor */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:from-primary/10 transition-colors" />
        </GlassCard>
    );
}
