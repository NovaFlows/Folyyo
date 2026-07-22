import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folyo — Portfolio generator",
  description: "Génère et déploie ton portfolio professionnel en quelques minutes avec l'IA.",
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
