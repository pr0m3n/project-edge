"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createChallenge(formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be logged in to create a challenge." };
    }

    const firm = formData.get("firm") as string;
    const size = formData.get("size") as string;
    const order_id = formData.get("order_id") as string;
    const price = parseFloat(formData.get("price") as string);

    if (!firm || !size || !order_id || !price) {
        return { error: "All fields are required." };
    }

    const { error } = await supabase.from("challenges").insert({
        user_id: user.id,
        firm,
        size,
        order_id,
        price,
        status: "Active",
    });

    if (error) {
        console.error("Supabase Error:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteChallenge(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true };
}

export async function getChallenges() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching challenges:", error);
        return [];
    }

    return data;
}
