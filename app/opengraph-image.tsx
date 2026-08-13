import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "ProjectEdge – Egyedi weboldalak és digitális rendszerek";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Megosztási kép (Facebook, LinkedIn, iMessage előnézet).
 *
 * Korábban egy türkiz négyzet állt a logó helyén, és a régi palettát használta.
 * Most a weboldalon és a böngészőfülön is használt PE jel van rajta, a levelekkel
 * egyező sötét (#1c1d20 / #24262b) + ember (#ff5722) színvilágban.
 */
export default async function OpenGraphImage() {
  const mark = await readFile(path.join(process.cwd(), "public/logo/pe-mark-white.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1c1d20",
          color: "#eeede8",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "#ff5722" }} />
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "rgba(255, 87, 34, 0.14)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -100,
            width: 460,
            height: 460,
            borderRadius: 460,
            background: "rgba(118, 171, 174, 0.14)"
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <img src={markSrc} alt="ProjectEdge" width={132} height={72} style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 26, letterSpacing: 3, color: "#76abae", fontWeight: 700 }}>PROJECTEDGE</div>
            <div style={{ fontSize: 20, color: "rgba(238,237,232,0.55)", letterSpacing: 1 }}>DIGITAL BUILD STUDIO</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05, maxWidth: 940, letterSpacing: -1 }}>
            Nem weboldalt adok át. Egy rendszert, amin ügyfelek érkeznek.
          </div>
          <div style={{ fontSize: 28, color: "rgba(238,237,232,0.62)", maxWidth: 880 }}>
            Egyedi weboldalak, ügyfélkapuk és üzleti rendszerek — egy kézben.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#ff5722", fontWeight: 700 }}>
          <div style={{ width: 42, height: 4, background: "#ff5722" }} />
          projectedge.hu
        </div>
      </div>
    ),
    { ...size }
  );
}
