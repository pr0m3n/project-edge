"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useCallback } from "react";

type TransitionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * next/link wrapper, ami a navigációt a natív View Transitions API-ba csomagolja.
 * Progressive enhancement: ha a böngésző nem támogatja vagy a user csökkentett
 * mozgást kért, sima Link-navigáció történik átmenet nélkül.
 */
export function TransitionLink({ href, children, onClick, ...rest }: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      // csak sima bal-klikk, belső útvonalra
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !href.startsWith("/")
      ) {
        return;
      }

      const startViewTransition = (
        document as Document & {
          startViewTransition?: (callback: () => Promise<void> | void) => unknown;
        }
      ).startViewTransition;

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (typeof startViewTransition !== "function" || prefersReduced) {
        return; // hagyjuk a sima Link-navigációt
      }

      event.preventDefault();
      startViewTransition.call(
        document,
        () =>
          new Promise<void>((resolve) => {
            router.push(href);
            // adunk egy pillanatot a Next-nek, hogy az (előtöltött) útvonalat kirenderelje
            window.setTimeout(resolve, 80);
          })
      );
    },
    [href, onClick, router]
  );

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
