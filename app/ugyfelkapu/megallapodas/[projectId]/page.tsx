import type { Metadata } from "next";
import { AgreementView } from "@/components/portal/AgreementView";

export const metadata: Metadata = {
  title: "Megállapodás | ProjectEdge",
  robots: { index: false, follow: false }
};

/**
 * A SZOLGÁLTATÁSI MEGÁLLAPODÁS visszanézhető változata.
 *
 * Miért kellett: a kézzel felvett ügyféllel a megállapodás telefonon és
 * emailben született. A `contract_accepted` mező igazra állt, de MÖGÖTTE nem
 * volt semmi, amit az ügyfél később elő tudott volna venni. Fél évvel később
 * a „mit is tartalmaz a csomagom?" kérdésre se neki, se nekem nem lett volna
 * egyetlen hiteles forrásunk — csak egy régi levélszál.
 *
 * Ez az oldal nem szerződéskötés, hanem ELSZÁMOLÁS arról, miben állapodtunk
 * meg: csomag, díj, ciklus, kezdés, mit tartalmaz, mit nem, és hogyan lehet
 * felmondani. Nyomtatással PDF-be menthető — ehhez nem kell szerveroldali
 * PDF-generálás, tehát nincs se Playwright a futásidőben, se külön tárolt
 * fájl, ami elavulhatna a valósághoz képest.
 */
export default async function AgreementPage(props: PageProps<"/ugyfelkapu/megallapodas/[projectId]">) {
  const { projectId } = await props.params;
  return (
    <main className="site-shell agreement-page">
      <AgreementView projectId={projectId} />
    </main>
  );
}
