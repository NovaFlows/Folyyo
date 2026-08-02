import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { getPortfolioBySlugPublic, logPortfolioView } from "@/lib/db/queries";
import { SITE_URL } from "@/lib/seo";
import { isBotUserAgent } from "@/lib/tracking/is-bot";
import type { ValidatedPortfolioJSON, ContentAside, BlockRow, GridItem } from "@/lib/anthropic/schema";
import type { PortfolioWithOwnerAccess } from "@/types";
import Image from "next/image";
import { BlockContent, BlockRowsStatic, GridStatic, WidgetFrame, type WidgetStyle } from "@/components/portfolio/blocks";
import HeroBackgroundCarousel from "@/components/portfolio/HeroBackgroundCarousel";
import HeroDecoration from "@/components/portfolio/HeroDecoration";
import RichText from "@/components/portfolio/RichText";
import { stripRichTags, isSafeRichTextUrl } from "@/lib/portfolio/rich-text";
import { hasActiveAccess } from "@/lib/billing/access";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import PortfolioPausedNotice from "@/components/billing/PortfolioPausedNotice";

function BackgroundPatternStatic({ pattern, color }: { pattern: string; color: string }) {
  if (!pattern || pattern === "none") return null;
  const seed = (i: number, o = 0) => Math.abs(Math.sin(i * 127.1 + o * 311.7));
  const style: React.CSSProperties = { position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 };

  if (pattern === "lines") {
    const lines = Array.from({ length: 28 }, (_, i) => ({
      x1: seed(i, 0) * 100, y1: seed(i, 1) * 100,
      x2: seed(i, 0) * 100 + (seed(i, 2) - 0.5) * 40,
      y2: seed(i, 1) * 100 + (seed(i, 3) - 0.5) * 60,
      opacity: 0.06 + seed(i, 4) * 0.1, width: 0.3 + seed(i, 5) * 0.5,
    }));
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={style}>
        {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={l.width} opacity={l.opacity} />)}
      </svg>
    );
  }
  if (pattern === "dots") {
    const dots = Array.from({ length: 80 }, (_, i) => ({ cx: seed(i,0)*100, cy: seed(i,1)*100, r: 0.15+seed(i,2)*0.3, opacity: 0.05+seed(i,3)*0.12 }));
    return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={style}>{dots.map((d,i)=><circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} opacity={d.opacity}/>)}</svg>;
  }
  if (pattern === "grid") {
    const s = Array.from({length:11},(_,i)=>i*10);
    return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={style}>{s.map(v=><><line key={`h${v}`} x1={0} y1={v} x2={100} y2={v} stroke={color} strokeWidth={0.15} opacity={0.08}/><line key={`v${v}`} x1={v} y1={0} x2={v} y2={100} stroke={color} strokeWidth={0.15} opacity={0.08}/></>)}</svg>;
  }
  if (pattern === "crosshatch") {
    const n=15;
    return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={style}>{Array.from({length:n},(_,i)=>{const v=(i/n)*140-20;return<><line key={`d1${i}`} x1={v} y1={0} x2={v+60} y2={100} stroke={color} strokeWidth={0.3} opacity={0.07}/><line key={`d2${i}`} x1={v} y1={100} x2={v+60} y2={0} stroke={color} strokeWidth={0.3} opacity={0.07}/></>;})}</svg>;
  }
  return null;
}

function sectionDefaultTitle(type: string): string {
  const map: Record<string, string> = {
    about: "À propos", skills: "Compétences", projects: "Projets",
    experience: "Expérience", contact: "Contact",
  };
  return map[type] ?? type;
}

// Mémoïsé par requête : generateMetadata ET la page appellent ce getter — cache()
// évite la double requête DB pour un même rendu.
const getPortfolio = cache((slug: string) => getPortfolioBySlugPublic(slug));

function ownerActive(p: PortfolioWithOwnerAccess): boolean {
  return Boolean(p.owner_subscription_status && hasActiveAccess({ subscription_status: p.owner_subscription_status, trial_ends_at: p.owner_trial_ends_at }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const portfolio = await getPortfolio(params.slug);
  if (!portfolio?.site_json) return { title: "Portfolio", robots: { index: false, follow: false } };
  const site = portfolio.site_json as ValidatedPortfolioJSON;
  const name = stripRichTags(site.meta.name).trim();
  const role = stripRichTags(site.meta.title).trim();
  const tagline = stripRichTags(site.meta.tagline).trim();
  const displayTitle = role ? `${name} — ${role}` : name;
  const description = (tagline || `Portfolio de ${name}${role ? `, ${role}` : ""}.`).slice(0, 200);
  const image = site.theme.hero_image_url || site.meta.avatar_url || undefined;
  const url = `/${portfolio.slug ?? params.slug}`;
  return {
    title: { absolute: `${displayTitle} · Folyo` },
    description,
    alternates: { canonical: url },
    // Un portfolio en pause (essai/abonnement inactif) ne rend pas son contenu
    // → on ne le laisse pas s'indexer tant qu'il est indisponible.
    robots: ownerActive(portfolio) ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "profile", title: displayTitle, description, url, images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title: displayTitle, description, images: image ? [image] : undefined },
  };
}

export default async function PublicPortfolioPage({ params }: { params: { slug: string } }) {
  const portfolio = await getPortfolio(params.slug);
  if (!portfolio || !portfolio.site_json) notFound();

  // Slug jamais supprimé/désactivé en base — juste masqué tant que l'essai/
  // abonnement du propriétaire n'est pas actif (voir lib/billing/access.ts).
  if (!portfolio.owner_subscription_status || !hasActiveAccess({ subscription_status: portfolio.owner_subscription_status, trial_ends_at: portfolio.owner_trial_ends_at })) {
    const t = getDictionary(getLocale()).billing.publicPaused;
    return <PortfolioPausedNotice t={t} />;
  }

  // Suivi de vue best-effort — ne doit jamais faire échouer le rendu de la page.
  // Dédoublonné par appareil (cookie pf_vid posé par middleware.ts) : une
  // vue par portfolio et par jour, un rafraîchissement ne recompte pas.
  try {
    const h = headers();
    const ua = h.get("user-agent") ?? "";
    if (!isBotUserAgent(ua)) {
      const visitorId = cookies().get("pf_vid")?.value ?? null;
      await logPortfolioView(portfolio.id, h.get("referer"), visitorId);
    }
  } catch (err) {
    console.error("[portfolio view] tracking error:", err);
  }

  const data = portfolio.site_json as ValidatedPortfolioJSON;
  const { meta, theme, sections } = data;

  const bg   = theme.background_color;
  const txt  = theme.text_color;
  const pri  = theme.primary_color;
  const acc  = theme.accent_color;
  const hFont = `'${theme.font_heading}', Georgia, serif`;
  const bFont = `'${theme.font_body}', system-ui, sans-serif`;

  const pattern = (theme as { background_pattern?: string }).background_pattern ?? "none";
  const widgetStyle: WidgetStyle = (theme as { widget_style?: WidgetStyle }).widget_style ?? "strict";

  // Effets visuels — public uniquement (l'éditeur garde tout visible/statique
  // pour pouvoir sélectionner/éditer sans que le contenu apparaisse/disparaisse).
  const fx = theme as { smooth_scroll?: boolean; scroll_reveal?: boolean; scroll_reveal_intensity?: number; hero_parallax?: boolean };
  const smoothScroll = fx.smooth_scroll ?? false;
  const scrollReveal = fx.scroll_reveal ?? false;
  const heroParallax = fx.hero_parallax ?? false;
  // 0 → pas de glissement (fondu seul), 100 → glissement prononcé. 50 (défaut) = 28px, la valeur historique.
  const revealDistance = ((fx.scroll_reveal_intensity ?? 50) / 100) * 56;

  // Widgets ajoutés dans l'éditeur visuel — grille libre (nouveau) ou lignes (legacy)
  const gridOf = (s: object) => (s as { grid?: GridItem[] }).grid;
  const rowsOf = (s: object) => (s as { blocks?: BlockRow[] }).blocks;
  const widgetsOf = (s: object) => {
    const grid = gridOf(s);
    if (grid && grid.length > 0) return <GridStatic items={grid} widgetStyle={widgetStyle} pri={pri} txt={txt} bg={bg} hFont={hFont} />;
    return <BlockRowsStatic rows={rowsOf(s)} pri={pri} txt={txt} hFont={hFont} widgetStyle={widgetStyle} bg={bg} />;
  };
  // Corps de section : si la grille contient le contenu natif (item
  // "section_content", portfolios re-sauvés depuis la grille libre), tout est
  // rendu dans la grille ; sinon rendu legacy (natif + aside + widgets dessous).
  // `title` : le <h2> de la section — rendu positionné dans la grille si elle
  // contient déjà un item "section_title" (portfolios migrés depuis ce
  // chantier), sinon affiché fixe au-dessus (portfolios legacy pas encore
  // resauvés depuis l'éditeur).
  const sectionBody = (s: object, native: React.ReactNode, title: React.ReactNode) => {
    const grid = gridOf(s);
    const hasTitleItem = grid?.some((it) => it.block.type === "section_title") ?? false;
    if (grid && grid.some((it) => it.block.type === "section_content")) {
      return (
        <>
          {!hasTitleItem && title}
          <GridStatic items={grid} widgetStyle={widgetStyle} pri={pri} txt={txt} bg={bg} hFont={hFont}
            renderNative={() => native} renderTitle={hasTitleItem ? () => title : undefined} />
        </>
      );
    }
    return <>{title}{withAside(s, native)}{widgetsOf(s)}</>;
  };
  // Pile de widgets accolée au contenu natif (disposition 2 colonnes)
  // Gère aussi l'ancien format { block, side }
  const withAside = (s: object, children: React.ReactNode) => {
    const raw = (s as { content_aside?: ContentAside & { block?: ContentAside["blocks"][number] } }).content_aside;
    if (!raw) return children;
    const blocks = raw.blocks ?? (raw.block ? [raw.block] : []);
    if (blocks.length === 0) return children;
    const w = (
      <div style={{ flex: "2 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {blocks.map((b, i) => (
          <WidgetFrame key={i} widgetStyle={widgetStyle} block={b} bg={bg} txt={txt}>
            <BlockContent block={b} pri={pri} txt={txt} hFont={hFont} />
          </WidgetFrame>
        ))}
      </div>
    );
    const c = <div style={{ flex: "3 1 300px", minWidth: 0 }}>{children}</div>;
    return (
      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {raw.side === "left" ? <>{w}{c}</> : <>{c}{w}</>}
      </div>
    );
  };

  // Données structurées Schema.org (ProfilePage/Person) — résultats enrichis
  // dans Google, et l'IA/robots comprennent que c'est le profil d'une personne.
  const slug = portfolio.slug ?? params.slug;
  const socials = [meta.github_url, meta.linkedin_url, meta.twitter_url, meta.instagram_url, meta.youtube_url].filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: stripRichTags(meta.name).trim(),
      jobTitle: stripRichTags(meta.title).trim() || undefined,
      description: stripRichTags(meta.tagline).trim() || undefined,
      url: `${SITE_URL}/${slug}`,
      image: theme.hero_image_url || meta.avatar_url || undefined,
      sameAs: socials.length ? socials : undefined,
    },
  };

  return (
    <main style={{ fontFamily: bFont, background: bg, color: txt, minHeight: "100vh", position: "relative",
      ...(scrollReveal ? { ["--pf-reveal-distance" as string]: `${revealDistance}px` } : {}) } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* scroll-behavior s'applique au document entier — sans effet sur l'éditeur,
          qui rend ce composant dans un <div> scrollable distinct, pas <html>. */}
      {smoothScroll && <style>{`html{scroll-behavior:smooth}`}</style>}
      <BackgroundPatternStatic pattern={pattern} color={txt} />
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, zIndex: 50, width: "100%", borderBottom: `1px solid ${txt}10`, background: `${bg}e8`, backdropFilter: "blur(12px)" }}>
        <div className="pf-nav-inner" style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, color: pri, fontFamily: hFont, flexShrink: 0 }}><RichText html={meta.name}/></span>
          <div className="pf-nav-links" style={{ fontSize: "0.875rem", color: `${txt}80` }}>
            {sections.filter((s) => s.type !== "hero").map((s) => {
              const title = (s as { section_title?: string }).section_title;
              return (
                <a key={s.type} href={`#${s.type}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {title ? <RichText html={title}/> : sectionDefaultTitle(s.type)}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sections in order */}
      {sections.map((section, i) => {
        switch (section.type) {
          case "hero": {
          const heroImages = theme.hero_images ?? [];
          const hasCarousel = heroImages.length > 0;
          return (
            <section key={i} className="pf-hero" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", backgroundImage: !hasCarousel && theme.hero_image_url ? `url(${theme.hero_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: heroParallax && !hasCarousel && theme.hero_image_url ? "fixed" : undefined }}>
              {hasCarousel && <HeroBackgroundCarousel images={heroImages} intervalSeconds={theme.hero_interval ?? 5} />}
              {(hasCarousel || theme.hero_image_url) && <div style={{ position: "absolute", inset: 0, background: bg, opacity: theme.overlay_opacity ?? 0.8 }} />}
              <HeroDecoration variant={theme.hero_decoration} color={acc} />
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {meta.avatar_url && (
                <Image src={meta.avatar_url} alt={stripRichTags(meta.name)} width={96} height={96}
                  style={{ borderRadius: "50%", marginBottom: "1.5rem", border: `2px solid ${pri}` }} />
              )}
              <h1 style={{ fontSize: "clamp(2.5rem,6vw,4rem)", fontWeight: 700, fontFamily: hFont, color: txt, marginBottom: "1rem", lineHeight: 1.1 }}>
                <RichText html={section.title || meta.name}/>
              </h1>
              <p style={{ fontSize: "1.125rem", fontWeight: 500, color: pri, marginBottom: "0.5rem" }}><RichText html={meta.title}/></p>
              <p style={{ fontSize: "1.125rem", color: `${txt}70`, maxWidth: 560, marginBottom: "2.5rem" }}>
                <RichText html={section.subtitle || meta.tagline}/>
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                <a href="#projects" style={{ background: pri, color: "#fff", padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
                  <RichText html={section.cta_text}/>
                </a>
                {meta.github_url && isSafeRichTextUrl(meta.github_url) && (
                  <a href={meta.github_url} target="_blank" rel="noopener noreferrer"
                    style={{ border: `1px solid ${txt}20`, color: `${txt}80`, padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontSize: "0.875rem" }}>
                    GitHub →
                  </a>
                )}
              </div>
              <div style={{ maxWidth: 640, width: "100%", textAlign: "left" }}>
                {widgetsOf(section)}
              </div>
              </div>
              {!hasCarousel && theme.hero_image_credit && (
                <p style={{ position: "absolute", bottom: "0.75rem", right: "0.75rem", zIndex: 2, fontSize: "0.6875rem", color: `${txt}60`, margin: 0 }}>
                  Photo :{" "}
                  <a href={`${theme.hero_image_credit.profileUrl}?utm_source=folyo&utm_medium=referral`} target="_blank" rel="noopener noreferrer" style={{ color: `${txt}60` }}>
                    {theme.hero_image_credit.name}
                  </a>
                  {" / "}
                  <a href="https://unsplash.com/?utm_source=folyo&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: `${txt}60` }}>
                    Unsplash
                  </a>
                </p>
              )}
            </section>
          );
          }

          case "about": return (
            <section key={i} id="about" className={`pf-section${scrollReveal?" pf-reveal":""}`} style={{ background: `${bg}f0` }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                {sectionBody(section, <>
                  <p style={{ fontSize: "1.0625rem", lineHeight: 1.75, color: `${txt}cc` }}><RichText html={section.content}/></p>
                  {section.highlight && (
                    <p style={{ marginTop: "1rem", borderLeft: `3px solid ${pri}`, paddingLeft: "1rem", color: pri, fontStyle: "italic" }}><RichText html={section.highlight}/></p>
                  )}
                </>, (
                  <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "1.5rem", textAlign: section.title_align ?? "left" }}>
                    {section.section_title ? <RichText html={section.section_title}/> : "À propos"}
                  </h2>
                ))}
              </div>
            </section>
          );

          case "skills": {
            const hideLevel = (section as { hide_level?: boolean }).hide_level === true;
            return (
              <section key={i} id="skills" className={`pf-section${scrollReveal?" pf-reveal":""}`} style={{ background: bg }}>
                <div style={{ maxWidth: 960, margin: "0 auto" }}>
                  {sectionBody(section, hideLevel ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
                      {section.items.map((skill) => (
                        <div key={skill.name} style={{ border: `1px solid ${pri}30`, borderRadius: "2rem", padding: "0.5rem 1.125rem", background: `${pri}0a` }}>
                          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: txt }}><RichText html={skill.name}/></span>
                          {skill.category && <span style={{ fontSize: "0.75rem", color: `${txt}50`, marginLeft: "0.5rem" }}><RichText html={skill.category}/></span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                      {section.items.map((skill) => (
                        <div key={skill.name} style={{ border: `1px solid ${txt}12`, borderRadius: "0.75rem", padding: "1rem", background: `${txt}04` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: txt }}><RichText html={skill.name}/></span>
                            <span style={{ fontSize: "0.75rem", color: pri }}>{skill.level}/5</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: `${txt}15`, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(skill.level / 5) * 100}%`, background: pri, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: "0.75rem", color: `${txt}50`, marginTop: "0.25rem", display: "block" }}><RichText html={skill.category}/></span>
                        </div>
                      ))}
                    </div>
                  ), (
                    <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "2.5rem", textAlign: section.title_align ?? "left" }}>
                      {section.section_title ? <RichText html={section.section_title}/> : "Compétences"}
                    </h2>
                  ))}
                </div>
              </section>
            );
          }

          case "projects": return (
            <section key={i} id="projects" className={`pf-section${scrollReveal?" pf-reveal":""}`} style={{ background: `${bg}f0` }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                {sectionBody(section,
                <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {section.items.map((p) => {
                    const imgUrl = (p as { image_url?: string }).image_url;
                    return (
                      <div key={p.name} style={{ border: `1px solid ${txt}12`, borderRadius: "1rem", overflow: "hidden", background: `${txt}03` }}>
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={stripRichTags(p.name)} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
                        ) : null}
                        <div style={{ padding: "1.25rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                            <h3 style={{ fontWeight: 600, color: txt }}><RichText html={p.name}/></h3>
                            {p.stars ? <span style={{ fontSize: "0.75rem", color: pri }}>★ {p.stars}</span> : null}
                          </div>
                          <p style={{ fontSize: "0.875rem", color: `${txt}80`, marginBottom: "1rem", lineHeight: 1.6 }}><RichText html={p.description}/></p>
                          {p.tech_stack.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                              {p.tech_stack.map((t) => (
                                <span key={t} style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "0.375rem", background: `${pri}18`, color: pri }}>{t}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "1rem" }}>
                            {p.github_url && isSafeRichTextUrl(p.github_url) && <a href={p.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: `${txt}60`, textDecoration: "none" }}>GitHub →</a>}
                            {p.live_url   && isSafeRichTextUrl(p.live_url)   && <a href={p.live_url}   target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: acc, textDecoration: "none" }}>Live →</a>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                , (
                  <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "2.5rem", textAlign: section.title_align ?? "left" }}>
                    {section.section_title ? <RichText html={section.section_title}/> : "Projets"}
                  </h2>
                ))}
              </div>
            </section>
          );

          case "experience": return (
            <section key={i} id="experience" className={`pf-section${scrollReveal?" pf-reveal":""}`} style={{ background: bg }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                {sectionBody(section,
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {section.items.map((exp) => (
                    <div key={exp.company} style={{ borderLeft: `2px solid ${pri}30`, paddingLeft: "1.5rem", position: "relative" }}>
                      <div style={{ position: "absolute", left: -5, top: 4, width: 8, height: 8, borderRadius: "50%", background: pri }} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 600, color: txt }}><RichText html={exp.role}/></span>
                        <span style={{ color: pri, fontWeight: 500 }}><RichText html={exp.company}/></span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: `${txt}40`, marginBottom: "0.5rem" }}><RichText html={exp.period}/></p>
                      <p style={{ fontSize: "0.875rem", color: `${txt}80`, lineHeight: 1.6 }}><RichText html={exp.description}/></p>
                    </div>
                  ))}
                </div>
                , (
                  <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "2.5rem", textAlign: section.title_align ?? "left" }}>
                    {section.section_title ? <RichText html={section.section_title}/> : "Expérience"}
                  </h2>
                ))}
              </div>
            </section>
          );

          case "contact": return (
            <section key={i} id="contact" className={`pf-section${scrollReveal?" pf-reveal":""}`} style={{ textAlign: "center", background: `${bg}f0` }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                {sectionBody(section, <>
                  <p style={{ color: `${txt}80`, marginBottom: "2rem" }}><RichText html={section.message}/></p>
                  <a href={`mailto:${section.email}`}
                    style={{ display: "inline-block", background: pri, color: "#fff", padding: "0.875rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 600, marginBottom: "2rem" }}>
                    {section.email}
                  </a>
                  <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
                    {section.links.filter((l) => isSafeRichTextUrl(l.url)).map((l) => (
                      <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "0.875rem", color: `${txt}60`, textDecoration: "none" }}><RichText html={l.label}/></a>
                    ))}
                  </div>
                </>, (
                  <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "1rem", textAlign: section.title_align || undefined }}>
                    {section.section_title ? <RichText html={section.section_title}/> : "Contact"}
                  </h2>
                ))}
              </div>
            </section>
          );

          default: return null;
        }
      })}

      <footer style={{ padding: "2rem", textAlign: "center", fontSize: "0.75rem", color: `${txt}30`, background: bg }}>
        Créé avec <a href="https://folyo.page" style={{ color: pri, textDecoration: "none" }}>Folyo</a>
      </footer>

      {/* Apparition au défilement : JS pur (pas de composant client requis ici),
          révèle chaque section .pf-reveal une seule fois quand elle entre à l'écran. */}
      {scrollReveal && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              if (!('IntersectionObserver' in window)) { document.querySelectorAll('.pf-reveal').forEach(function(el){el.classList.add('pf-visible')}); return; }
              var io = new IntersectionObserver(function(entries){
                entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('pf-visible'); io.unobserve(e.target); } });
              }, { threshold: 0.15 });
              document.querySelectorAll('.pf-reveal').forEach(function(el){ io.observe(el); });
            })();`,
          }}
        />
      )}
    </main>
  );
}
