import { getAllChallenges } from "@/lib/actions/admin";
import { getPartners } from "@/lib/actions/partners";
import { getAllClaims } from "@/lib/actions/claims";
import { getAllWithdrawals } from "@/lib/actions/withdrawals";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const supabase = await createClient();

    // Fetch all data in parallel for performance
    const [challenges, partners, claims, withdrawals, { data: profiles }] = await Promise.all([
        getAllChallenges(),
        getPartners(),
        getAllClaims(),
        getAllWithdrawals(),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
    ]);

    return (
        <AdminDashboard
            challenges={challenges}
            partners={partners}
            payouts={withdrawals}
            users={profiles || []}
            claims={claims}
        />
    );
}

