"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getUserBalance() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error fetching balance:", error);
        return 0;
    }
    return data?.balance || 0;
}

export async function getUserWithdrawals() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching withdrawals:", error);
        return [];
    }
    return data || [];
}

export async function createWithdrawal(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const amount = parseFloat(formData.get("amount") as string);
    const method = formData.get("method") as string;

    if (!amount || amount < 25) {
        return { error: "Minimum kifizetés: $25" };
    }

    // Check balance
    const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

    const currentBalance = profile?.balance || 0;

    if (amount > currentBalance) {
        return { error: "Nincs elegendő egyenleg!" };
    }

    // Deduct from balance
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
        .from("profiles")
        .update({ balance: currentBalance - amount })
        .eq("id", user.id);

    if (updateError) {
        console.error("Error deducting balance:", updateError);
        return { error: "Hiba történt az egyenleg módosításakor." };
    }

    // Create withdrawal request
    const { error: insertError } = await supabase
        .from("withdrawals")
        .insert({
            user_id: user.id,
            amount,
            method,
            status: "Pending"
        });

    if (insertError) {
        console.error("Error creating withdrawal:", insertError);
        // Rollback balance
        await adminClient
            .from("profiles")
            .update({ balance: currentBalance })
            .eq("id", user.id);
        return { error: "Hiba történt a kifizetési kérelem létrehozásakor." };
    }

    revalidatePath("/dashboard/withdrawals");
    revalidatePath("/admin");
    return { success: true };
}

export async function getAllWithdrawals() {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("withdrawals")
        .select("*, profiles:user_id(email)")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all withdrawals:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

export async function updateWithdrawalStatus(id: string, status: string) {
    const adminClient = createAdminClient();

    // If rejecting, refund the balance
    if (status === "Rejected") {
        const { data: withdrawal } = await adminClient
            .from("withdrawals")
            .select("user_id, amount")
            .eq("id", id)
            .single();

        if (withdrawal) {
            const { data: profile } = await adminClient
                .from("profiles")
                .select("balance")
                .eq("id", withdrawal.user_id)
                .single();

            const currentBalance = profile?.balance || 0;
            await adminClient
                .from("profiles")
                .update({ balance: currentBalance + withdrawal.amount })
                .eq("id", withdrawal.user_id);
        }
    }

    const { error } = await adminClient
        .from("withdrawals")
        .update({ status })
        .eq("id", id);

    if (error) {
        console.error("Error updating withdrawal:", JSON.stringify(error, null, 2));
        return { error: error.message };
    }

    revalidatePath("/dashboard/withdrawals");
    revalidatePath("/admin");
    return { success: true };
}
