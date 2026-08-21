import Link from "next/link";
import { Globe, PenLine, Link2, RotateCcw, Layers, Lock } from "lucide-react";
import PortfolioPreviews from "@/components/landing/PortfolioPreviews";
import HeroVisual from "@/components/landing/HeroVisual";
import AnimatedCounter from "@/components/landing/AnimatedCounter";
import TestimonialMarquee from "@/components/landing/TestimonialMarquee";
import EditChatMock from "@/components/landing/EditChatMock";
import CvTeaser from "@/components/landing/CvTeaser";
import SlugChecker from "@/components/landing/SlugChecker";
import FAQ from "@/components/landing/FAQ";
import Pricing from "@/components/landing/Pricing";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import FilmSection from "@/components/landing/FilmSection";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { countPortfoliosCreatedSince } from "@/lib/db/queries";

// Point de départ du compteur "portfolios créés" affiché sur la landing —
// choisi par l'exploitant (2026-08-02) plutôt que le vrai total DB (qui
// inclut les portfolios de démo communauté). À partir de cette date, chaque
// nouveau portfolio créé s'ajoute réellement à ce nombre de base.
const COUNTER_BASELINE = 87;
const COUNTER_BASELINE_DATE = new Date("2026-08-02T00:00:00Z");

// SEO de la landing, par langue — titre, description et mots-clés cibles.
const LANDING_SEO = {
  fr: {
    title: "Folyo — Crée ton portfolio professionnel en ligne avec l'IA",
    description: "Génère et déploie ton portfolio pro en 60 secondes avec l'IA. Import CV, GitHub ou YouTube, éditeur visuel, assistant IA. Ton site sur folyo.page/ton-nom. Essai gratuit.",
    keywords: ["créer un portfolio", "portfolio en ligne", "générateur de portfolio", "portfolio IA", "créer un site portfolio", "portfolio développeur", "portfolio étudiant", "portfolio designer", "portfolio photographe", "cv en ligne", "site portfolio gratuit"],
  },
  en: {
    title: "Folyo — Build your professional portfolio online with AI",
    description: "Generate and deploy your professional portfolio in 60 seconds with AI. Import your resume, GitHub or YouTube, visual editor, AI assistant. Your site at folyo.page/your-name. Free trial.",
    keywords: ["portfolio maker", "online portfolio", "portfolio generator", "AI portfolio", "create a portfolio website", "developer portfolio", "student portfolio", "designer portfolio", "photographer portfolio", "resume website", "free portfolio site"],
  },
  es: {
    title: "Folyo — Crea tu portfolio profesional online con IA",
    description: "Genera y publica tu portfolio profesional en 60 segundos con IA. Importa tu CV, GitHub o YouTube, editor visual, asistente IA. Tu sitio en folyo.page/tu-nombre. Prueba gratis.",
    keywords: ["crear portfolio", "portfolio online", "generador de portfolio", "portfolio IA", "crear web de portfolio", "portfolio desarrollador", "portfolio estudiante", "portfolio diseñador", "cv online", "portfolio gratis"],
  },
  de: {
    title: "Folyo — Erstelle dein professionelles Portfolio online mit KI",
    description: "Generiere und veröffentliche dein professionelles Portfolio in 60 Sekunden mit KI. Importiere Lebenslauf, GitHub oder YouTube, visueller Editor, KI-Assistent. Deine Seite auf folyo.page/dein-name. Kostenlos testen.",
    keywords: ["portfolio erstellen", "online portfolio", "portfolio generator", "KI portfolio", "portfolio website erstellen", "entwickler portfolio", "studenten portfolio", "designer portfolio", "lebenslauf website", "kostenloses portfolio"],
  },
} as const;

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const seo = LANDING_SEO[locale];
  const ogLocale = { fr: "fr_FR", en: "en_US", es: "es_ES", de: "de_DE" }[locale];
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: [...seo.keywords],
    alternates: { canonical: "/" },
    openGraph: { title: seo.title, description: seo.description, url: "/", type: "website", siteName: "Folyo", locale: ogLocale, images: [{ url: "/og", width: 1200, height: 630, alt: "Folyo" }] },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: ["/og"] },
  };
}

function Lines({ text }: { text: string }) {
  return <>{text.split("\n").map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>)}</>;
}

function PostIt({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: "relative",
      width: 152,
      background: "#fef08a",
      borderRadius: 2,
      padding: "20px 16px 22px",
      boxShadow: "2px 2px 0 rgba(0,0,0,0.04), 3px 8px 24px rgba(0,0,0,0.14)",
    }}>
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: 32,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.055) 0%, transparent 100%)",
        borderRadius: "2px 2px 0 0",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: 0, right: 0,
        width: 18, height: 18,
        background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.10) 50%)",
        borderRadius: "0 0 2px 0",
        pointerEvents: "none",
      }} />
      <p style={{
        fontFamily: "'Kalam', cursive",
        fontSize: "1.15rem",
        fontWeight: 700,
        color: "#1a3a8f",
        lineHeight: 1.35,
        position: "relative",
        zIndex: 1,
      }}>
        {children}
      </p>
    </div>
  );
}

export default async function LandingPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  // Ne bloque jamais le rendu de la landing si la DB a un souci — repli sur
  // le seul point de départ.
  const newSinceBaseline = await countPortfoliosCreatedSince(COUNTER_BASELINE_DATE).catch(() => 0);
  const portfoliosCount = COUNTER_BASELINE + newSinceBaseline;

  // Données structurées Schema.org — aide Google ET les IA (ChatGPT, Gemini,
  // Perplexity…) à identifier clairement Folyo comme un générateur de portfolio.
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "Folyo", url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Folyo", url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` }, inLanguage: "fr" },
      {
        "@type": "SoftwareApplication",
        name: "Folyo",
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: "Folyo est un générateur de portfolio par intelligence artificielle : crée et héberge un portfolio professionnel en moins de 60 secondes à partir d'un CV, d'un profil GitHub ou YouTube, avec éditeur visuel et assistant IA. Adresse du type folyo.page/ton-nom. Essai gratuit de 3 jours.",
        offers: { "@type": "Offer", price: "5.99", priceCurrency: "EUR" },
      },
    ],
  };

  return (
    <div style={{ background: "#f8f5f0", color: "#1c1917", fontFamily: "Inter, system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav
        className="fixed top-0 z-50 w-full"
        style={{ background: "rgba(248,245,240,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight" style={{ color: "#1c1917" }}>
            folyo
          </Link>

          <div className="hidden items-center gap-8 text-sm md:flex" style={{ color: "#78716c" }}>
            <a href="#how"      className="nav-link hover:text-[#1c1917] transition-colors">{t.nav.how}</a>
            <a href="#examples" className="nav-link hover:text-[#1c1917] transition-colors">{t.nav.examples}</a>
            <a href="#features" className="nav-link hover:text-[#1c1917] transition-colors">{t.nav.features}</a>
            <a href="#tarifs"   className="nav-link hover:text-[#1c1917] transition-colors">{t.nav.pricing}</a>
            <a href="#faq"      className="nav-link hover:text-[#1c1917] transition-colors">{t.nav.faq}</a>
            <Link href="/blog"    className="nav-link hover:text-[#1c1917] transition-colors">Blog</Link>
            <Link href="/contact" className="nav-link hover:text-[#1c1917] transition-colors">{t.nav.contact}</Link>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle locale={locale} />
            <Link href="/login" className="text-sm transition-colors" style={{ color: "#78716c" }}>
              {t.nav.login}
            </Link>
            <Link
              href="/signup"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: "#1c1917" }}
            >
              {t.nav.signup}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="flex min-h-screen items-center px-6 pt-24 pb-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row lg:gap-20 lg:items-center">

          {/* Left column: copy */}
          <div className="flex-1 min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1
              className="mb-6 leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              {t.hero.titleLine1}<br />
              <em style={{ color: "#c9a96e", fontStyle: "italic" }}>{t.hero.titleEm}</em><br />
              {t.hero.titleLine2}
            </h1>

            <div className="mb-6 flex flex-col items-center lg:items-start gap-4">
              <SlugChecker locale={locale} />
              <a
                href="#examples"
                className="text-sm transition hover:text-[#1c1917]"
                style={{ color: "#78716c" }}
              >
                {t.hero.ctaSecondary}
              </a>
            </div>

            {/* Sur desktop, cette explication vit à droite sous l'illustration
                (voir plus bas) pour que la colonne de gauche tienne dans un
                seul écran sans être coupée — gardée ici pour le mobile/tablette,
                où la page défile de toute façon normalement. */}
            <p className="mb-10 max-w-md text-base leading-relaxed lg:hidden" style={{ color: "#78716c" }}>
              {t.hero.subtitle}
            </p>

            {/* Stats — compact row under CTAs */}
            <div className="mt-14 flex flex-wrap items-center justify-center lg:justify-start gap-8">
              {([
                { value: "< 60s", label: t.hero.statGeneration },
                { value: "6",     label: t.hero.statProfiles },
                { value: t.hero.statTrialValue, label: t.hero.statTrialLabel, sub: t.hero.statTrialSub },
              ] as { value: string; label: string; sub?: string }[]).map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="mono text-xl font-medium mb-0.5" style={{ color: "#1c1917" }}>{s.value}</p>
                  <p className="text-xs" style={{ color: "#a09a94" }}>{s.label}</p>
                  {s.sub && <p className="mt-0.5" style={{ fontSize: "0.625rem", color: "#c8c4bf" }}>{s.sub}</p>}
                </div>
              ))}
              <div className="h-8 w-px hidden sm:block" style={{ background: "rgba(0,0,0,0.08)" }} />
              <p className="text-xs" style={{ color: "#a09a94" }}>
                <span style={{ color: "#c9a96e", fontWeight: 600 }}>
                  <AnimatedCounter value={portfoliosCount} />
                </span> {t.hero.portfoliosCreated}
              </p>
            </div>
          </div>

          {/* Right column: decorative visual + explication (desktop uniquement —
              gardée courte à gauche pour que cette colonne tienne dans un seul
              écran ; voir le paragraphe équivalent lg:hidden plus haut) */}
          <div className="hidden lg:flex flex-shrink-0 flex-col items-center justify-center gap-6" style={{ padding: "8px 48px 24px" }}>
            <HeroVisual locale={locale} portfoliosCount={portfoliosCount} />
            <p className="max-w-xs text-center text-sm leading-relaxed" style={{ color: "#78716c" }}>
              {t.hero.subtitle}
            </p>
          </div>

        </div>
      </section>

      {/* ── TEASER CV (sans compte) ───────────────────*/}
      <section className="ld-reveal px-6 pb-24">
        <div className="mx-auto max-w-xl text-center mb-8">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.teaser.kicker}</p>
          <h2 className="text-3xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {t.teaser.titlePre}<em className="font-normal" style={{ color: "#c9a96e" }}>{t.teaser.titleEm}</em>{t.teaser.titlePost}
          </h2>
        </div>
        <CvTeaser locale={locale} />
      </section>

      {/* ── FILM DE PRÉSENTATION ───────────────────── */}
      <section className="ld-reveal px-6 pb-24">
        <div className="mx-auto max-w-xl text-center mb-8">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.film.kicker}</p>
          <h2 className="text-3xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {t.film.titlePre}<em className="font-normal" style={{ color: "#c9a96e" }}>{t.film.titleEm}</em>{t.film.titlePost}
          </h2>
        </div>
        <FilmSection locale={locale} />
      </section>
      {/* ── EXAMPLES ───────────────────────────────── */}
      <section id="examples" className="ld-reveal px-6 py-24" style={{ background: "#f0ece6" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.examples.kicker}</p>
            <h2
              className="text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              {t.examples.titleLine1}<br />
              <em className="font-normal" style={{ color: "#c9a96e" }}>{t.examples.titleEm}</em>
            </h2>
          </div>
          <PortfolioPreviews locale={locale} />
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section id="how" className="ld-reveal px-6 py-24 relative overflow-visible">

        {/* Post-it LEFT — "Aucun code à écrire !" */}
        <div className="hidden xl:block" style={{
          position: "absolute", left: 20, top: "52%",
          transform: "rotate(-5.5deg)", zIndex: 10,
        }}>
          <PostIt><Lines text={t.how.postit1} /></PostIt>
        </div>

        {/* Post-it RIGHT 1 — GitHub auto */}
        <div className="hidden xl:block" style={{
          position: "absolute", right: 18, top: "32%",
          transform: "rotate(4deg)", zIndex: 10,
        }}>
          <PostIt><Lines text={t.how.postit2} /></PostIt>
        </div>

        {/* Post-it RIGHT 2 — URL */}
        <div className="hidden xl:block" style={{
          position: "absolute", right: 24, top: "65%",
          transform: "rotate(-3.5deg)", zIndex: 10,
        }}>
          <PostIt><Lines text={t.how.postit3} /></PostIt>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.how.kicker}</p>
            <h2
              className="text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              {t.how.titleLine1}<br />
              <em className="font-normal" style={{ color: "#c9a96e" }}>{t.how.titleEm}</em>
            </h2>
          </div>

          <div className="ld-stagger grid gap-6 md:grid-cols-3">
            {t.how.steps.map((s) => (
              <div
                key={s.num}
                className="rounded-2xl p-8"
                style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)", position: "relative" }}
              >
                {/* Trait qui se dessine : coche tracée au scroll (stroke-dashoffset,
                    pathLength normalise le chemin quelle que soit sa géométrie réelle) */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ position: "absolute", top: 20, right: 20 }} aria-hidden="true">
                  <circle className="ld-draw-path" cx="14" cy="14" r="11" pathLength={1} stroke="#c9a96e" strokeWidth="1.5" opacity="0.45" />
                  <path className="ld-draw-path" d="M9 14.5l3.2 3.2L19.5 10" pathLength={1} stroke="#c9a96e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p
                  className="text-6xl font-light mb-6"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "rgba(201,169,110,0.25)" }}
                >
                  {s.num}
                </p>
                <h3 className="text-lg font-semibold mb-3" style={{ color: "#1c1917" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#78716c" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section id="features" className="ld-reveal px-6 py-24" style={{ background: "#f0ece6" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.features.kicker}</p>
            <h2
              className="text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              {t.features.titleLine1}<br />
              <em className="font-normal" style={{ color: "#c9a96e" }}>{t.features.titleEm}</em>
            </h2>
          </div>

          <div className="ld-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [Globe, PenLine, Link2, RotateCcw, Layers, Lock]
            ).map((Icon, i) => {
              const { title, desc } = t.features.items[i];
              return (
              <div
                key={title}
                className="ld-tilt rounded-2xl p-6"
                style={{ background: "#f8f5f0", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="mb-5">
                  <Icon size={18} strokeWidth={1.5} color="#c9a96e" />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#1c1917" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#78716c" }}>{desc}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EDIT SECTION ───────────────────────────── */}
      <section className="ld-reveal px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 items-center md:grid-cols-2">
            <div>
              <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "#a09a94" }}>{t.edit.kicker}</p>
              <h2
                className="text-4xl mb-5 leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
              >
                <Lines text={t.edit.title} />
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: "#78716c" }}>
                {t.edit.subtitle}
              </p>
              <div className="space-y-3">
                {t.edit.examples.map((ex) => (
                  <div key={ex} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 shrink-0 text-base" style={{ color: "#c9a96e" }}>—</span>
                    <span className="italic" style={{ color: "#78716c" }}>&ldquo;{ex}&rdquo;</span>
                  </div>
                ))}
              </div>
            </div>

            <EditChatMock locale={locale} />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────── */}
      <section className="ld-reveal py-16">
        <div className="mb-10 text-center px-6">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.testimonials.kicker}</p>
          <h2 className="text-4xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {t.testimonials.titlePre}<em className="font-normal" style={{ color: "#c9a96e" }}>{t.testimonials.titleEm}</em>
          </h2>
        </div>
        <TestimonialMarquee locale={locale} />
      </section>

      {/* ── TARIFS ─────────────────────────────────── */}
      <Pricing locale={locale} />

      {/* ── FAQ ────────────────────────────────────── */}
      <FAQ locale={locale} />

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ background: "#1c1917", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4">
          <Link href="/" className="text-base font-semibold" style={{ color: "rgba(248,245,240,0.4)" }}>folyo</Link>
          <div className="flex items-center gap-6">
            <div className="flex gap-8 text-sm" style={{ color: "rgba(248,245,240,0.25)" }}>
              <Link href="/login"  className="hover:text-white/50 transition-colors">{t.nav.login}</Link>
              <Link href="/signup" className="hover:text-white/50 transition-colors">{t.nav.signup}</Link>
              <Link href="/contact" className="hover:text-white/50 transition-colors">{t.nav.contact}</Link>
              <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
              <Link href="/mentions-legales" className="hover:text-white/50 transition-colors">{t.nav.legal}</Link>
              <Link href="/confidentialite" className="hover:text-white/50 transition-colors">{t.nav.privacy}</Link>
              <Link href="/cgu" className="hover:text-white/50 transition-colors">{t.nav.terms}</Link>
            </div>
            <LanguageToggle locale={locale} dark />
          </div>
          <span className="text-sm" style={{ color: "rgba(248,245,240,0.15)" }}>{t.footer.copyright}</span>
        </div>
      </footer>

      {/* Apparition au défilement des sections .ld-reveal — JS pur, une fois par section */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            if (!('IntersectionObserver' in window)) { document.querySelectorAll('.ld-reveal').forEach(function(el){el.classList.add('ld-visible')}); return; }
            var io = new IntersectionObserver(function(entries){
              entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('ld-visible'); io.unobserve(e.target); } });
            }, { threshold: 0.12 });
            document.querySelectorAll('.ld-reveal').forEach(function(el){ io.observe(el); });
          })();`,
        }}
      />
    </div>
  );
}

