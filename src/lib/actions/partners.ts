"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPartners() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("partners").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error fetching partners:", error);
    return data || [];
}

export async function createPartner(formData: FormData) {
    const supabase = await createClient();
    const data = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        discount_code: formData.get("discount_code") as string,
        discount_amount: formData.get("discount_amount") as string,
        offer_details: formData.get("offer_details") as string,
        link: formData.get("link") as string,
        image_url: formData.get("image_url") as string,
        color: "text-white",
        bg_color: "bg-white/5",
        border_color: "border-white/10"
    };

    const { error } = await supabase.from("partners").insert(data);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/dashboard/partners");
    revalidatePath("/");
    return { success: true };
}

export async function updatePartner(id: string, formData: FormData) {
    const supabase = await createClient();
    const data = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        discount_code: formData.get("discount_code") as string,
        discount_amount: formData.get("discount_amount") as string,
        offer_details: formData.get("offer_details") as string,
        link: formData.get("link") as string,
        image_url: formData.get("image_url") as string,
    };

    const { error } = await supabase.from("partners").update(data).eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/dashboard/partners");
    revalidatePath("/");
    return { success: true };
}

export async function deletePartner(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/dashboard/partners");
    revalidatePath("/");
    return { success: true };
}
