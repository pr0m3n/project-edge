import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Edge | Trade Funded, Get Refunded",
  description: "The first prop firm ecosystem that pays you back. Pass the challenge, get your fee refunded.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen flex flex-col pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
