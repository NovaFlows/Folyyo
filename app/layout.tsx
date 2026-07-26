import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folyo — Portfolio generator",
  description: "Génère et déploie ton portfolio professionnel en quelques minutes avec l'IA.",
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
