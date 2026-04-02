import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GTMHead, GTMBody } from "@/components/analytics/GTMProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sistema Continuo — Maquinaria de Impresión y Sublimación",
    template: "%s | Sistema Continuo",
  },
  description:
    "E-commerce de maquinaria de impresión, estampadoras, papelería profesional, tintas, papeles y productos para sublimación.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar"
  ),
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Sistema Continuo",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <head>
        <GTMHead />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <GTMBody />
        <CartProvider>
          <Header />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
