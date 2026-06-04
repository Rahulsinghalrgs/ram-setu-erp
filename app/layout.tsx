import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShellRegistration } from "@/components/app-shell-registration";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ram Setu ERP | Richa Global Sales",
  description:
    "Ram Setu ERP control system for Richa Global Sales connector pins, CCTV components, premium wires, inventory, dispatch, and GST billing",
  applicationName: "Ram Setu ERP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ram Setu ERP",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <AppShellRegistration />
      </body>
    </html>
  );
}
