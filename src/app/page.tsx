import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PartnersSection } from "@/components/landing/PartnersSection";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getPartners } from "@/lib/actions/partners";

export default async function Home() {
  const partners = await getPartners();

  return (
    <main className="min-h-screen bg-black text-white selection:bg-primary/30">
      <Hero />
      <PartnersSection partners={partners} />
      <HowItWorks />
    </main>
  );
}
