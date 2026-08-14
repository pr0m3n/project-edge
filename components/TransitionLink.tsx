"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";

type TransitionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function TransitionLink({ href, children, onClick, ...rest }: TransitionLinkProps) {
  return (
    <Link href={href} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
