"use client";
import { SiteNav } from "@/components/SiteNav";
import { PosterHero, PosterHeroFollow } from "@/components/PosterHero";
import { NextSection } from "./NextSection";

/* Ez a route már csak egy elszigetelt próbapad: a hero maga a főoldalon él,
   itt ugyanaz a komponens fut, hogy ne legyen két különböző igazság. */
export function HeroPrototype() {
  return (
    <main>
      <SiteNav />
      <PosterHero />
      <PosterHeroFollow>
        <NextSection />
      </PosterHeroFollow>
    </main>
  );
}
