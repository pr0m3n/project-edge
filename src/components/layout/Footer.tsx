"use client";

import Link from "next/link";
import { Github, Twitter, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function Footer() {
    const pathname = usePathname();
    const isDashboard = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");

    if (isDashboard) return null;

    return (
        <footer className="border-t border-white/10 bg-black py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <h3 className="text-lg font-bold tracking-tighter text-white">
                        PROJECT <span className="text-primary">EDGE</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                        &copy; {new Date().getFullYear()} Project Edge. Minden jog fenntartva.
                    </p>
                </div>

                <div className="flex gap-6">
                    <Link href="#" className="text-gray-500 hover:text-primary transition-colors">
                        <Twitter className="w-5 h-5" />
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-primary transition-colors">
                        <Github className="w-5 h-5" />
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-primary transition-colors">
                        <MessageCircle className="w-5 h-5" />
                    </Link>
                </div>

                <div className="flex gap-6 text-sm text-gray-500">
                    <Link href="#" className="hover:text-white transition-colors">Felhasználási Feltételek</Link>
                    <Link href="#" className="hover:text-white transition-colors">Adatvédelmi Irányelvek</Link>
                    <Link href="#" className="hover:text-white transition-colors">Kapcsolat</Link>
                </div>
            </div>
        </footer>
    );
}
