import { getUserClaims } from "@/lib/actions/claims";
import ClaimsClient from "./ClaimsClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ClaimsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const claims = await getUserClaims();

    return <ClaimsClient initialClaims={claims} />;
}
