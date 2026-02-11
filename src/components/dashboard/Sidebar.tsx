"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Wallet, LifeBuoy, Settings, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const BASE_NAV_ITEMS = [
    { name: "Áttekintés", href: "/dashboard", icon: LayoutDashboard },
    { name: "Partner Cégek", href: "/dashboard/partners", icon: Users },
    { name: "Igénylések", href: "/dashboard/claims", icon: FileText },
    { name: "Kifizetések", href: "/dashboard/withdrawals", icon: Wallet },
    { name: "Támogatás", href: "/dashboard/support", icon: LifeBuoy },
    { name: "Beállítások", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [navItems, setNavItems] = useState(BASE_NAV_ITEMS);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    setNavItems([
                        ...BASE_NAV_ITEMS,
                        { name: "Adminisztráció", href: "/admin", icon: ShieldCheck }
                    ]);
                }
            }
        };
        checkAdmin();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-black border-r border-white/10 flex flex-col z-40">
            <div className="p-6 border-b border-white/10">
                <Link href="/" className="text-xl font-bold tracking-tighter group">
                    PROJECT <span className="text-primary group-hover:text-glow transition-all">EDGE</span>
                </Link>
                <p className="text-xs text-gray-500 mt-1">Prop Firm Solutions</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-500"}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    Kijelentkezés
                </button>
            </div>
        </aside>
    );
}
