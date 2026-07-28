"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import type { Locale } from "@/lib/i18n/types";

export interface DashboardNavLabels {
  myPortfolios: string;
  community: string;
  settings: string;
  billing: string;
  support: string;
  newPortfolio: string;
  newPortfolioShort: string;
  logout: string;
}

// Nav du dashboard. Sur desktop : barre horizontale classique. Sur mobile :
// bouton hamburger (☰) en haut à gauche qui déplie un menu vertical — évite
// l'empilement brouillon des liens sur petit écran.
export default function DashboardNav({ locale, labels, canCreateMore }: {
  locale: Locale;
  labels: DashboardNavLabels;
  canCreateMore: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Ferme le menu sur Échap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/dashboard", label: labels.myPortfolios },
    { href: "/community", label: labels.community },
    { href: "/settings", label: labels.settings },
    { href: "/billing", label: labels.billing },
    { href: "/support", label: labels.support },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Gauche : hamburger (mobile) + logo */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="sm:hidden inline-flex items-center justify-center rounded-lg transition hover:opacity-70"
            style={{ width: 38, height: 38, color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)", background: "white" }}
          >
            {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
          <Link href="/dashboard" onClick={() => setOpen(false)}
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyo
          </Link>
        </div>

        {/* Nav horizontale — desktop uniquement */}
        <div className="hidden items-center gap-x-4 gap-y-2 sm:flex sm:gap-5">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="nav-link text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {l.label}
            </Link>
          ))}
          <LanguageToggle locale={locale} />
          {canCreateMore && (
            <Link href="/onboarding"
              className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-80 sm:px-5"
              style={{ background: "#1c1917" }}>
              {labels.newPortfolio}
            </Link>
          )}
          <SignOutButton redirectUrl="/">
            <button className="text-sm transition hover:opacity-60" style={{ color: "#a09a94" }}>
              {labels.logout}
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Menu déroulant — mobile uniquement */}
      {open && (
        <nav className="sm:hidden flex flex-col" style={{ marginTop: 12, paddingTop: 4 }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="transition hover:opacity-70"
              style={{ color: "#1c1917", fontSize: "0.95rem", fontWeight: 500, padding: "13px 4px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              {l.label}
            </Link>
          ))}
          {canCreateMore && (
            <Link href="/onboarding" onClick={() => setOpen(false)}
              className="rounded-full text-center text-white transition hover:opacity-80"
              style={{ background: "#1c1917", fontSize: "0.9rem", fontWeight: 500, padding: "12px", marginTop: 14 }}>
              {labels.newPortfolioShort}
            </Link>
          )}
          <div className="flex items-center justify-between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <LanguageToggle locale={locale} />
            <SignOutButton redirectUrl="/">
              <button className="transition hover:opacity-60" style={{ color: "#a09a94", fontSize: "0.9rem", padding: "8px 4px" }}>
                {labels.logout}
              </button>
            </SignOutButton>
          </div>
        </nav>
      )}
    </div>
  );
}
