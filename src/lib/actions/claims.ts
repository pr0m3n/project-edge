"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClaim(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const type = formData.get("type") as string;
    const firm = formData.get("firm") as string;
    const date = formData.get("date") as string;
    const timezone = formData.get("timezone") as string;
    const discord_username = formData.get("discord_username") as string;
    const comment = formData.get("comment") as string;
    // Note: File upload logic usually requires storage bucket. 
    // For now we'll store the filename or assume client handled upload and sent URL.
    // Since we don't have storage setup confirmed, we'll store the filename/mock URL.
    // In a real app, upload to Supabase Storage first, then save URL here.
    const evidence_file = formData.get("evidence_file") as string;

    // Construct data jsonb
    const claimData = {
        firm,
        date,
        timezone,
        discord_username,
        comment,
        evidence_file // In real world this would be a URL
    };

    const { error } = await supabase.from("claims").insert({
        user_id: user.id,
        type,
        data: claimData,
        status: "Pending"
    });

    if (error) {
        console.error("Error creating claim:", JSON.stringify(error, null, 2));
        return { error: error.message };
    }

    console.log("Claim created successfully for user:", user.id);

    revalidatePath("/dashboard/claims");
    revalidatePath("/admin");
    return { success: true };
}

export async function getUserClaims() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) console.error("Error fetching user claims:", error);
    return data || [];
}

export async function getAllClaims() {
    const supabase = createAdminClient();

    // In real app, check admin role here

    const { data, error } = await supabase
        .from("claims")
        .select("*") // Temporarily removed profiles join to debug
        .order("created_at", { ascending: false });

    console.log("Admin Claims Fetch Code:", error?.code, "Message:", error?.message);
    console.log("Admin Claims Data Count:", data?.length);

    if (error) {
        console.error("Error fetching all claims:", JSON.stringify(error, null, 2));
    }
    return data || [];
}

export async function updateClaimStatus(id: string, status: string, amount?: number) {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from("claims")
        .update({ status })
        .eq("id", id);

    if (error) {
        console.error("Error updating claim status:", JSON.stringify(error, null, 2));
        return { error: error.message };
    }

    // If approved with an amount, add to user's balance
    if (status === "Approved" && amount && amount > 0) {
        // Get the claim to find user_id
        const { data: claim } = await supabase
            .from("claims")
            .select("user_id")
            .eq("id", id)
            .single();

        if (claim) {
            // Get current balance
            const { data: profile } = await supabase
                .from("profiles")
                .select("balance")
                .eq("id", claim.user_id)
                .single();

            const currentBalance = profile?.balance || 0;
            const newBalance = currentBalance + amount;

            await supabase
                .from("profiles")
                .update({ balance: newBalance })
                .eq("id", claim.user_id);

            console.log("Balance updated for user", claim.user_id, ":", currentBalance, "->", newBalance);
        }
    }

    console.log("Claim", id, "updated to:", status, amount ? `(+$${amount})` : "");

    revalidatePath("/dashboard/claims");
    revalidatePath("/dashboard/withdrawals");
    revalidatePath("/admin");
    return { success: true };
}
