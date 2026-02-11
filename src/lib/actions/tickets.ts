"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTickets() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_tickets").select("*, profiles:user_id(email)").order("created_at", { ascending: false });
    if (error) console.error("Error fetching tickets:", error);
    return data || [];
}

export async function getUserTickets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) console.error("Error fetching user tickets:", error);
    return data || [];
}

export async function createTicket(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const data = {
        user_id: user.id,
        subject: formData.get("subject") as string,
        message: formData.get("message") as string,
    };

    const { error } = await supabase.from("support_tickets").insert(data);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/support");
    revalidatePath("/admin/support");
    return { success: true };
}

export async function updateTicketStatus(id: string, status: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/support");
    revalidatePath("/dashboard/support");
    return { success: true };
}
