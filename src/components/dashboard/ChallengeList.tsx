import { getChallenges } from "@/lib/actions/challenges";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";

export async function ChallengeList() {
    const challenges = await getChallenges();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge: any) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}

            {challenges.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <p className="text-lg font-medium text-white mb-2">Nincs aktív kihívásod</p>
                    <p className="text-sm">Adj hozzá egyet, hogy elkezdhesd a visszatérítés követését.</p>
                </div>
            )}
        </div>
    );
}
