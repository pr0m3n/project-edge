import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "./ProductDetail";
import { findProduct, products } from "../../data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(slug);

  return {
    title: product
      ? `${product.name} — Zamat mintaprojekt | ProjectEdge`
      : "Zamat mintaprojekt | ProjectEdge",
    description: product?.short,
    robots: { index: false, follow: false }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = findProduct(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
