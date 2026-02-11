"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { User, Shield } from "lucide-react";

export function UsersTab({ users }: { users: any[] }) {
    return (
        <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4">ID / Email</th>
                            <th className="px-6 py-4">Dátum</th>
                            <th className="px-6 py-4">Rang</th>
                            <th className="px-6 py-4 text-right">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user: any) => (
                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-full">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{user.email || "Nincs email"}</div>
                                            <div className="text-xs text-gray-500 font-mono">{user.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'admin' ? (
                                        <span className="flex items-center gap-1 text-primary text-xs font-bold border border-primary/20 bg-primary/10 px-2 py-1 rounded w-fit">
                                            <Shield className="w-3 h-3" />
                                            ADMIN
                                        </span>
                                    ) : (
                                        <span className="text-gray-500 text-xs border border-white/10 bg-white/5 px-2 py-1 rounded">
                                            User
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-xs text-gray-600">Szerkesztés hamarosan</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {users.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    Nincs megjeleníthető felhasználó.
                </div>
            )}
        </GlassCard>
    );
}
