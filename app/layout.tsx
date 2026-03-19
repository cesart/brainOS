import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "brainOS",
  description: "brainOS is a personal life management system.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(max-width: 767px)", color: "#1c1917" },
    { media: "(min-width: 768px)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="antialiased overflow-hidden">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
