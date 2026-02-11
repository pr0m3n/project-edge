"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { LayoutDashboard, Users, Wallet, Shield } from "lucide-react";
import { ChallengesTab } from "./tabs/ChallengesTab";
import { PartnersTab } from "./tabs/PartnersTab";
import { PayoutsTab } from "./tabs/PayoutsTab";
import { UsersTab } from "./tabs/UsersTab";
import { ClaimsTab } from "./tabs/ClaimsTab";
import { FileText } from "lucide-react";

export function AdminDashboard({ challenges, partners, payouts, users, claims }: any) {
    const [activeTab, setActiveTab] = useState("challenges");

    const renderTabContent = () => {
        switch (activeTab) {
            case "challenges":
                return <ChallengesTab challenges={challenges} />;
            case "partners":
                return <PartnersTab partners={partners} />;
            case "claims":
                return <ClaimsTab claims={claims} />;
            case "payouts":
                return <PayoutsTab payouts={payouts} />;
            case "users":
                return <UsersTab users={users} />;
            default:
                return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Adminisztráció</h1>
                <div className="text-sm text-gray-400">
                    Vezérlőpult
                </div>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                <TabButton
                    active={activeTab === "challenges"}
                    onClick={() => setActiveTab("challenges")}
                    icon={LayoutDashboard}
                    label="Kihívások"
                />
                <TabButton
                    active={activeTab === "claims"}
                    onClick={() => setActiveTab("claims")}
                    icon={FileText}
                    label="Igénylések"
                />
                <TabButton
                    active={activeTab === "partners"}
                    onClick={() => setActiveTab("partners")}
                    icon={Users}
                    label="Partnerek"
                />
                <TabButton
                    active={activeTab === "payouts"}
                    onClick={() => setActiveTab("payouts")}
                    icon={Wallet}
                    label="Kifizetések"
                />
                <TabButton
                    active={activeTab === "users"}
                    onClick={() => setActiveTab("users")}
                    icon={Shield}
                    label="Felhasználók"
                />
            </div>

            {renderTabContent()}
        </DashboardLayout>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${active
                ? "bg-primary text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}
