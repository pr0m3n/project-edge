/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0a", // Deep black
                foreground: "#ededed", // Off-white
                primary: {
                    DEFAULT: "#00ff9d", // Neon Green
                    glow: "rgba(0, 255, 157, 0.5)",
                },
                secondary: {
                    DEFAULT: "#00e1ff", // Cyan/Blue
                    glow: "rgba(0, 225, 255, 0.5)",
                },
                glass: {
                    DEFAULT: "rgba(255, 255, 255, 0.05)",
                    border: "rgba(255, 255, 255, 0.1)",
                    highlight: "rgba(255, 255, 255, 0.15)",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "grid-pattern": "linear-gradient(to right, #2a2a2a 1px, transparent 1px), linear-gradient(to bottom, #2a2a2a 1px, transparent 1px)",
            },
            boxShadow: {
                "neon-green": "0 0 10px rgba(0, 255, 157, 0.5), 0 0 20px rgba(0, 255, 157, 0.3)",
                "neon-blue": "0 0 10px rgba(0, 225, 255, 0.5), 0 0 20px rgba(0, 225, 255, 0.3)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "glow": "glow 2s ease-in-out infinite alternate",
            },
            keyframes: {
                glow: {
                    "0%": { boxShadow: "0 0 5px rgba(0, 255, 157, 0.2)" },
                    "100%": { boxShadow: "0 0 20px rgba(0, 255, 157, 0.6), 0 0 10px rgba(0, 255, 157, 0.4)" },
                },
            },
        },
    },
    plugins: [],
};
