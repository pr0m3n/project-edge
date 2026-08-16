import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Minimális szövegformázás a blokkokban: `**félkövér**`, `` `kód` `` és
 * `[felirat](/cél)`.
 *
 * Szándékosan nem teljes Markdown-értelmező: pontosan annyit tud, amennyit a
 * cikkek használnak, és semmilyen nyers HTML-t nem enged át — a szöveg végig
 * React csomópontként épül fel, tehát injektálni sem lehet vele.
 */
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];

  text.split(TOKEN).forEach((part, index) => {
    if (!part) return;

    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={index}>{part.slice(2, -2)}</strong>);
      return;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(<code key={index}>{part.slice(1, -1)}</code>);
      return;
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      const external = /^https?:\/\//.test(href);
      nodes.push(
        external ? (
          <a href={href} key={index} rel="noreferrer" target="_blank">{label}</a>
        ) : (
          <Link href={href} key={index}>{label}</Link>
        )
      );
      return;
    }

    nodes.push(part);
  });

  return <>{nodes}</>;
}
