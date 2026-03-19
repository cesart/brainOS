import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DM_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const monaSans = localFont({
  src: [
    { path: "../public/fonts/MonaSans.woff2",        style: "normal", weight: "200 900" },
    { path: "../public/fonts/MonaSans-italic.woff2", style: "italic", weight: "200 900" },
  ],
  variable: "--font-sans",
  display: "block",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "block",
});

export const metadata: Metadata = {
  title: "brainOS",
  description: "brainOS is a personal life management system.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "brainOS",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
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
    <html lang="en" className={`${monaSans.variable} ${dmMono.variable} dark`}>
      <body className="antialiased overflow-hidden">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
