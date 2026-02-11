"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitPayout(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const challenge_id = formData.get("challenge_id") as string;
    const proof_url = formData.get("proof_url") as string;

    if (!proof_url) return { error: "Proof URL is required" };

    const { error } = await supabase.from("payout_proofs").insert({
        challenge_id,
        proof_url,
        status: "Pending",
    });

    if (error) {
        console.error("Error submitting payout:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
