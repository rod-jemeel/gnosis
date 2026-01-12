import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/layout";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AetherCore",
  description: "RAG Q&A over your PDF documents with page-accurate citations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
        {/* Nutrient PDF Viewer SDK */}
        <Script
          src="https://cdn.cloud.pspdfkit.com/nutrient/latest/nutrient-viewer.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
