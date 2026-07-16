import type { Metadata } from "next";
import { Alfa_Slab_One, Geist, Oswald } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Zephyriov — Chess Opening Trainer",
  description:
    "Learn the chess openings you actually play, with spaced repetition.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const alfaSlab = Alfa_Slab_One({
  weight: "400",
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-label",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${alfaSlab.variable} ${oswald.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
