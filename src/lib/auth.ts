import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function isAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    try {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        return profile?.role === "admin";
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

export async function requireAdmin() {
    const isAdm = await isAdmin();
    if (!isAdm) {
        throw new Error("Unauthorized: Admin access required");
    }
}

export async function requireAdminPage() {
    const isAdm = await isAdmin();
    if (!isAdm) {
        redirect("/dashboard");
    }
}
