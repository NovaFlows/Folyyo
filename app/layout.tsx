import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // `default` sert de repli ; les pages (landing, portfolios) posent leur
  // propre titre. `template` ajoute le suffixe de marque aux titres enfants.
  title: {
    default: "Folyo — Crée ton portfolio professionnel avec l'IA",
    template: "%s · Folyo",
  },
  description: "Génère et déploie ton portfolio professionnel en quelques minutes avec l'IA. Import de CV, GitHub ou YouTube, édition visuelle et assistant IA. Hébergé sur folyo.page/ton-nom.",
  applicationName: "Folyo",
  robots: { index: true, follow: true },
  openGraph: { type: "website", siteName: "Folyo", locale: "fr_FR" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

// Empêche le pinch-to-zoom sur mobile — sans ça, dézoomer sur les mises en
// page pensées pour occuper tout l'écran (hero plein écran, éditeur visuel à
// positionnement absolu…) révèle des espaces vides et des éléments mal
// proportionnés plutôt qu'une vraie vue d'ensemble utile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr" className="dark">
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}
