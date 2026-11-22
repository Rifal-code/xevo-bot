import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "PECADO Web Platform — WhatsApp Bot Multi-Session",
  description: "Platform web modern untuk pairing dan automasi WhatsApp terisolasi per tenant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceMono.variable}`}>
      <body className="bg-xevo-bg text-xevo-text selection:bg-xevo-red selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
