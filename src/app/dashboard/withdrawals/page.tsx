import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserBalance, getUserWithdrawals } from "@/lib/actions/withdrawals";
import WithdrawalsClient from "./WithdrawalsClient";

export default async function WithdrawalsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [balance, withdrawals] = await Promise.all([
        getUserBalance(),
        getUserWithdrawals(),
    ]);

    return <WithdrawalsClient balance={balance} withdrawals={withdrawals} />;
}
