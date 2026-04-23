import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { MerchantWidget } from "@/components/analytics/MerchantWidget";
import { GTMHead, GTMBody } from "@/components/analytics/GTMProvider";
import { FBPixel } from "@/components/analytics/FBPixelProvider";
import { GclidCapture } from "@/components/analytics/GclidCapture";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateWebSiteSchema } from "@/lib/seo/structured-data";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Sistema Continuo — Sublimación, Estampadoras y Plotters | Argentina",
    template: "%s | Sistema Continuo",
  },
  description:
    "Tienda online de sublimación: estampadoras, sublimadoras, impresoras Epson, plotters Silhouette, tintas, papeles y +600 productos. Envíos a todo Argentina. Hasta 12 cuotas.",
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
        <FBPixel />
        <GclidCapture />
        <AttributionCapture />
        <JsonLd data={[generateOrganizationSchema(), generateWebSiteSchema()]} />
        <AuthProvider>
          <CartProvider>
            <Header />
            {children}
            <Footer />
            <WhatsAppFloat />
          </CartProvider>
        </AuthProvider>
        <MerchantWidget />
      </body>
    </html>
  );
}
