"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface NeonButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "outline";
    glow?: boolean;
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
    ({ className, variant = "primary", glow = true, children, ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-black hover:bg-primary/90 border-transparent",
            secondary: "bg-secondary text-black hover:bg-secondary/90 border-transparent",
            outline: "bg-transparent text-primary border-primary hover:bg-primary/10",
        };

        const glowStyles = glow
            ? variant === "primary"
                ? "shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.5)]"
                : variant === "secondary"
                    ? "shadow-[0_0_20px_rgba(0,225,255,0.3)] hover:shadow-[0_0_30px_rgba(0,225,255,0.5)]"
                    : "shadow-[0_0_10px_rgba(0,255,157,0.1)] hover:shadow-[0_0_20px_rgba(0,255,157,0.3)]"
            : "";

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "px-6 py-3 rounded-lg font-bold transition-all duration-300 border",
                    variants[variant],
                    glowStyles,
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);

NeonButton.displayName = "NeonButton";

export { NeonButton };
