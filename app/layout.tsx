import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import OfflineSyncManager from "@/components/OfflineSyncManager";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DJI",
  description: "Portal Produksi dan Quality Control DJI",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full bg-[var(--background)] text-[#1f2d3d] flex flex-col font-sans">
        <AuthProvider>
          <div className="min-h-full flex flex-col flex-1">
            {children}
            <OfflineSyncManager />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
