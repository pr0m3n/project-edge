import { ImageResponse } from "next/og";

export const alt = "ProjectEdge – Prémium weboldalak és digitális rendszerek";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dinamikusan generált OG-kép (nem kell statikus /og-image.png fájl).
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#11171c",
          color: "#f5f5f5",
          padding: "80px",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 32, color: "#76abae" }}>
          <div style={{ width: 28, height: 28, background: "#76abae", borderRadius: 8 }} />
          ProjectEdge
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
            Nem weboldalt adok át. Egy rendszert, amin ügyfelek érkeznek.
          </div>
          <div style={{ fontSize: 30, color: "rgba(245,245,245,0.65)", maxWidth: 860 }}>
            Egyedi weboldalak, ügyfélkapuk és üzleti rendszerek — egy kézben.
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#ff5722" }}>projectedge.hu</div>
      </div>
    ),
    { ...size }
  );
}
