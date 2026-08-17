/**
 * Borítóábra cikkenként.
 *
 * Nem stock fotó és nem gradiens: mindegyik ábra a cikk állítását rajzolja le.
 * Inline SVG, tehát nincs képfájl, nincs külön kérés, és a méretezés is
 * veszteségmentes. Új poszthoz elég ide egy új ág — ha nincs, a semleges
 * rácsminta jön, szóval sosem marad üresen a kártya.
 */

const INK = "#1c232a";
const FOG = "rgba(245,245,245,0.14)";
const FOG_STRONG = "rgba(245,245,245,0.26)";
const EMBER = "#ff5722";
const AQUA = "#76abae";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg className="blog-cover" viewBox="0 0 400 210" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="210" fill={INK} />
      {children}
    </svg>
  );
}

/** „Miért nem hoz ügyfelet a szép weboldal?" — sok egyforma, egy kitűnik. */
function CoverSameness() {
  const cells = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const highlighted = row === 2 && column === 4;
      cells.push(
        <rect
          key={`${row}-${column}`}
          x={38 + column * 46}
          y={30 + row * 38}
          width={34}
          height={26}
          rx={5}
          fill={highlighted ? EMBER : FOG}
        />
      );
    }
  }
  return <Frame>{cells}</Frame>;
}

/** „Mennyibe kerül egy weboldal?" — egymásra rakott ársávok. */
function CoverPrice() {
  const bars = [
    { w: 96, y: 40 },
    { w: 158, y: 78 },
    { w: 232, y: 116, on: true },
    { w: 128, y: 154 }
  ];
  return (
    <Frame>
      {bars.map((bar) => (
        <g key={bar.y}>
          <rect x={38} y={bar.y} width={296} height={24} rx={12} fill="rgba(245,245,245,0.07)" />
          <rect x={38} y={bar.y} width={bar.w} height={24} rx={12} fill={bar.on ? EMBER : FOG_STRONG} />
        </g>
      ))}
    </Frame>
  );
}

/** „Domain, tárhely, SSL" — három egymásba ágyazott réteg. */
function CoverLayers() {
  return (
    <Frame>
      <rect x={64} y={26} width={272} height={158} rx={18} fill="none" stroke={FOG} strokeWidth={2} />
      <rect x={98} y={50} width={204} height={110} rx={14} fill="none" stroke={AQUA} strokeOpacity={0.6} strokeWidth={2} />
      <rect x={134} y={74} width={132} height={62} rx={10} fill={EMBER} fillOpacity={0.9} />
      <circle cx={200} cy={105} r={12} fill={INK} />
      <path d="M194 105v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
      <rect x={193} y={104} width={14} height={11} rx={2.5} fill="#fff" />
    </Frame>
  );
}

/** „Helyi vállalkozás a Google-ben" — térképrács egy pulzáló ponttal. */
function CoverLocal() {
  const lines = [];
  for (let i = 1; i < 6; i += 1) {
    lines.push(<line key={`h${i}`} x1={0} y1={i * 35} x2={400} y2={i * 35} stroke={FOG} strokeWidth={1} />);
  }
  for (let i = 1; i < 9; i += 1) {
    lines.push(<line key={`v${i}`} x1={i * 44} y1={0} x2={i * 44} y2={210} stroke={FOG} strokeWidth={1} />);
  }
  return (
    <Frame>
      {lines}
      <circle cx={224} cy={105} r={46} fill={EMBER} fillOpacity={0.12} />
      <circle cx={224} cy={105} r={26} fill={EMBER} fillOpacity={0.2} />
      <path
        d="M224 78a19 19 0 0 0-19 19c0 14 19 34 19 34s19-20 19-34a19 19 0 0 0-19-19z"
        fill={EMBER}
      />
      <circle cx={224} cy={96} r={7} fill={INK} />
    </Frame>
  );
}

/** Tartalék: semleges rács, hogy új poszt se maradjon borító nélkül. */
function CoverFallback() {
  return (
    <Frame>
      <rect x={38} y={44} width={190} height={16} rx={8} fill={FOG_STRONG} />
      <rect x={38} y={74} width={288} height={12} rx={6} fill={FOG} />
      <rect x={38} y={98} width={244} height={12} rx={6} fill={FOG} />
      <rect x={38} y={122} width={266} height={12} rx={6} fill={FOG} />
      <rect x={38} y={158} width={84} height={14} rx={7} fill={EMBER} />
    </Frame>
  );
}

const COVERS: Record<string, () => React.ReactElement> = {
  "miert-nem-hoz-ugyfelet-a-szep-weboldal": CoverSameness,
  "mennyibe-kerul-egy-weboldal": CoverPrice,
  "domain-tarhely-ssl-mi-micsoda": CoverLayers,
  "helyi-vallalkozas-google-kereses": CoverLocal
};

export function BlogCover({ slug }: { slug: string }) {
  const Cover = COVERS[slug] ?? CoverFallback;
  return <Cover />;
}
