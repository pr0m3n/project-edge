"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAllChallenges() {
    const supabase = await createClient();

    // In a real app, check for admin role here
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user?.email !== "admin@projectedge.com") return [];

    const { data, error } = await supabase
        .from("challenges")
        .select("*, payout_proofs(*)") // Join proofs
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Admin fetch error:", error);
        return [];
    }

    return data;
}

export async function updateChallengeStatus(id: string, status: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("challenges")
        .update({ status })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
}
