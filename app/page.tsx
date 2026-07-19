import Link from "next/link";
import { Globe, PenLine, Link2, RotateCcw, Layers, Lock } from "lucide-react";
import PortfolioPreviews from "@/components/landing/PortfolioPreviews";
import HeroVisual from "@/components/landing/HeroVisual";
import AnimatedCounter from "@/components/landing/AnimatedCounter";
import TestimonialMarquee from "@/components/landing/TestimonialMarquee";
import EditChatMock from "@/components/landing/EditChatMock";
import CvTeaser from "@/components/landing/CvTeaser";
import type { ReactNode } from "react";

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

export default function LandingPage() {
  return (
    <div style={{ background: "#f8f5f0", color: "#1c1917", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav
        className="fixed top-0 z-50 w-full"
        style={{ background: "rgba(248,245,240,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight" style={{ color: "#1c1917" }}>
            folyyo
          </Link>

          <div className="hidden items-center gap-8 text-sm md:flex" style={{ color: "#78716c" }}>
            <a href="#how"      className="nav-link hover:text-[#1c1917] transition-colors">Comment</a>
            <a href="#examples" className="nav-link hover:text-[#1c1917] transition-colors">Exemples</a>
            <a href="#features" className="nav-link hover:text-[#1c1917] transition-colors">Fonctionnalités</a>
            <Link href="/contact" className="nav-link hover:text-[#1c1917] transition-colors">Contact</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm transition-colors" style={{ color: "#78716c" }}>
              Connexion
            </Link>
            <Link
              href="/signup"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: "#1c1917" }}
            >
              Inscription
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="flex min-h-screen items-center px-6 pt-24 pb-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row lg:gap-20 lg:items-center">

          {/* Left column: copy */}
          <div className="flex-1 min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
              style={{ background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.25)", color: "#c9a96e" }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#c9a96e" }} />
              Bêta ouverte · 100% gratuit
            </div>

            <h1
              className="mb-6 leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              Ton portfolio,<br />
              <em style={{ color: "#c9a96e", fontStyle: "italic" }}>généré et déployé</em><br />
              en 60 secondes.
            </h1>

            <p className="mb-10 max-w-md text-base leading-relaxed" style={{ color: "#78716c" }}>
              Upload ton CV, connecte tes réseaux. On génère un portfolio professionnel et le met en ligne automatiquement. Édite-le ensuite en décrivant ce que tu veux.
            </p>

            <div className="flex flex-col items-center lg:items-start gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-2xl px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: "#1c1917", boxShadow: "0 8px 32px rgba(28,25,23,0.18)" }}
              >
                Créer mon portfolio →
              </Link>
              <a
                href="#examples"
                className="rounded-2xl px-8 py-4 text-sm transition hover:text-[#1c1917]"
                style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c" }}
              >
                Voir des exemples ↓
              </a>
            </div>

            {/* Stats — compact row under CTAs */}
            <div className="mt-14 flex flex-wrap items-center justify-center lg:justify-start gap-8">
              {[
                { value: "< 60s", label: "génération" },
                { value: "3",     label: "profils" },
                { value: "0€",    label: "bêta" },
              ].map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="mono text-xl font-medium mb-0.5" style={{ color: "#1c1917" }}>{s.value}</p>
                  <p className="text-xs" style={{ color: "#a09a94" }}>{s.label}</p>
                </div>
              ))}
              <div className="h-8 w-px hidden sm:block" style={{ background: "rgba(0,0,0,0.08)" }} />
              <p className="text-xs" style={{ color: "#a09a94" }}>
                <span style={{ color: "#c9a96e", fontWeight: 600 }}>
                  <AnimatedCounter value={1247} />
                </span> portfolios créés
              </p>
            </div>
          </div>

          {/* Right column: decorative visual */}
          <div className="hidden lg:flex flex-shrink-0 items-center justify-center" style={{ padding: "40px 48px" }}>
            <HeroVisual />
          </div>

        </div>
      </section>

      {/* ── TEASER CV (sans compte) ───────────────────*/}
      <section className="ld-reveal px-6 pb-24">
        <div className="mx-auto max-w-xl text-center mb-8">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>Essaie tout de suite</p>
          <h2 className="text-3xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            Vois ce que l&apos;IA <em className="font-normal" style={{ color: "#c9a96e" }}>comprend de toi</em> — sans compte.
          </h2>
        </div>
        <CvTeaser />
      </section>

      {/* ── EXAMPLES ───────────────────────────────── */}
      <section id="examples" className="ld-reveal px-6 py-24" style={{ background: "#f0ece6" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>Exemples réels</p>
            <h2
              className="text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              Différents profils,<br />
              <em className="font-normal" style={{ color: "#c9a96e" }}>différents univers.</em>
            </h2>
          </div>
          <PortfolioPreviews />
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section id="how" className="ld-reveal px-6 py-24 relative overflow-visible">

        {/* Post-it LEFT — "Aucun code à écrire !" */}
        <div className="hidden xl:block" style={{
          position: "absolute", left: 20, top: "52%",
          transform: "rotate(-5.5deg)", zIndex: 10,
        }}>
          <PostIt>Aucun code<br />à écrire !</PostIt>
        </div>

        {/* Post-it RIGHT 1 — GitHub auto */}
        <div className="hidden xl:block" style={{
          position: "absolute", right: 18, top: "32%",
          transform: "rotate(4deg)", zIndex: 10,
        }}>
          <PostIt>L&apos;IA s&apos;adapte<br />à ton métier ✓</PostIt>
        </div>

        {/* Post-it RIGHT 2 — URL */}
        <div className="hidden xl:block" style={{
          position: "absolute", right: 24, top: "65%",
          transform: "rotate(-3.5deg)", zIndex: 10,
        }}>
          <PostIt>Ton URL prête<br />en 60 secondes !</PostIt>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>Comment ça marche</p>
            <h2
              className="text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              Trois étapes.<br />
              <em className="font-normal" style={{ color: "#c9a96e" }}>C&apos;est tout.</em>
            </h2>
          </div>

          <div className="ld-stagger grid gap-6 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Tu partages tes infos",
                desc: "CV en PDF, pseudo GitHub, liens sociaux. On récupère automatiquement tes projets, ton expérience et tes informations clés.",
              },
              {
                num: "02",
                title: "On crée ton portfolio",
                desc: "Notre moteur analyse tes données et génère un portfolio complet, avec les textes, le design et la structure adaptés à ton profil.",
              },
              {
                num: "03",
                title: "Il est en ligne",
                desc: "Ton portfolio est déployé automatiquement et accessible publiquement. Tu reçois ton URL en quelques secondes.",
              },
            ].map((s) => (
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
            <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>Fonctionnalités</p>
            <h2
              className="text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
            >
              Tout ce dont tu as besoin.<br />
              <em className="font-normal" style={{ color: "#c9a96e" }}>Rien de superflu.</em>
            </h2>
          </div>

          <div className="ld-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { icon: Globe,      title: "Mise en ligne automatique",  desc: "Ton portfolio est publié automatiquement dès qu'il est généré. Aucune configuration requise." },
                { icon: PenLine,    title: "Édition en langage naturel", desc: "Décris ce que tu veux changer. Notre système comprend et applique tes modifications instantanément." },
                { icon: Link2,      title: "Une adresse simple à partager", desc: "folyyo.com/ton-nom. Pas de configuration technique, pas de nom de domaine à acheter." },
                { icon: RotateCcw,  title: "Historique des versions",    desc: "Tes 5 dernières versions sont sauvegardées. Reviens en arrière en un clic si besoin." },
                { icon: Layers,     title: "Design adapté à ton profil", desc: "Design sombre et technique pour les devs, galerie épurée pour les artistes, plein-écran pour la mode." },
                { icon: Lock,       title: "Sécurisé et privé",         desc: "Connexion via email ou GitHub. Tes données restent les tiennes, isolées et protégées." },
              ] as const
            ).map(({ icon: Icon, title, desc }) => (
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
            ))}
          </div>
        </div>
      </section>

      {/* ── EDIT SECTION ───────────────────────────── */}
      <section className="ld-reveal px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 items-center md:grid-cols-2">
            <div>
              <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "#a09a94" }}>Édition naturelle</p>
              <h2
                className="text-4xl mb-5 leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}
              >
                Modifie ton site
                comme tu parles.
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: "#78716c" }}>
                Plus besoin de toucher au code. Tu décris ce que tu veux, on s&apos;occupe du reste. Si quelque chose ne te convient pas, un message suffit pour le corriger.
              </p>
              <div className="space-y-3">
                {[
                  "Change la couleur principale en terracotta",
                  "Ajoute une section témoignages",
                  "Mets ma photo en fond du hero",
                  "Réécris mon intro, je veux quelque chose de plus percutant",
                ].map((ex) => (
                  <div key={ex} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 shrink-0 text-base" style={{ color: "#c9a96e" }}>—</span>
                    <span className="italic" style={{ color: "#78716c" }}>&ldquo;{ex}&rdquo;</span>
                  </div>
                ))}
              </div>
            </div>

            <EditChatMock />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────── */}
      <section className="ld-reveal py-16">
        <div className="mb-10 text-center px-6">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>Ils l&apos;ont utilisé</p>
          <h2 className="text-4xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            Ce qu&apos;ils en <em className="font-normal" style={{ color: "#c9a96e" }}>disent.</em>
          </h2>
        </div>
        <TestimonialMarquee />
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="ld-reveal px-6 py-32" style={{ background: "#1c1917" }}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm tracking-widest uppercase mb-5" style={{ color: "rgba(201,169,110,0.6)" }}>Prêt ?</p>
          <h2
            className="mb-6 leading-tight"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 500,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              color: "#f8f5f0",
            }}
          >
            Ton portfolio mérite<br />
            <em style={{ color: "#c9a96e", fontStyle: "italic" }}>mieux qu&apos;un template.</em>
          </h2>
          <p className="mb-10 text-lg leading-relaxed" style={{ color: "rgba(248,245,240,0.4)" }}>
            Génère et publie ton portfolio en quelques minutes. Gratuit pendant toute la bêta.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 rounded-2xl px-10 py-5 text-lg font-medium transition hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "#c9a96e", color: "#1c1917" }}
          >
            Commencer gratuitement →
          </Link>
          <p className="mt-5 text-sm" style={{ color: "rgba(248,245,240,0.2)" }}>
            Aucune carte bancaire · Ton code t&apos;appartient
          </p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ background: "#1c1917", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4">
          <Link href="/" className="text-base font-semibold" style={{ color: "rgba(248,245,240,0.4)" }}>folyyo</Link>
          <div className="flex gap-8 text-sm" style={{ color: "rgba(248,245,240,0.25)" }}>
            <Link href="/login"  className="hover:text-white/50 transition-colors">Connexion</Link>
            <Link href="/signup" className="hover:text-white/50 transition-colors">Inscription</Link>
            <Link href="/contact" className="hover:text-white/50 transition-colors">Contact</Link>
          </div>
          <span className="text-sm" style={{ color: "rgba(248,245,240,0.15)" }}>© 2026</span>
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

