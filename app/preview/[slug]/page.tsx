import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPortfolioBySlugPublic, getPortfolioBySlugOrId } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import Image from "next/image";
import VisualEditor from "./VisualEditor";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { mode?: string };
}) {
  const portfolio = await getPortfolioBySlugPublic(params.slug);
  if (!portfolio || !portfolio.site_json) notFound();

  const data = portfolio.site_json as ValidatedPortfolioJSON;

  // Edit mode: verify ownership
  if (searchParams.mode === "edit") {
    const { userId } = await auth();
    if (!userId) redirect(`/login`);
    const owned = await getPortfolioBySlugOrId(params.slug, userId);
    if (!owned) notFound();
    return <VisualEditor initialData={data} portfolioId={portfolio.id} slug={params.slug} profileType={owned.profile_type} />;
  }

  // View mode (public)
  const { meta, theme, sections } = data;
  const hero       = sections.find((s) => s.type === "hero");
  const about      = sections.find((s) => s.type === "about");
  const skills     = sections.find((s) => s.type === "skills");
  const projects   = sections.find((s) => s.type === "projects");
  const experience = sections.find((s) => s.type === "experience");
  const contact    = sections.find((s) => s.type === "contact");

  const bg   = theme.background_color;
  const txt  = theme.text_color;
  const pri  = theme.primary_color;
  const acc  = theme.accent_color;
  const hFont = `'${theme.font_heading}', Georgia, serif`;
  const bFont = `'${theme.font_body}', system-ui, sans-serif`;

  return (
    <main style={{ fontFamily: bFont, background: bg, color: txt, minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, zIndex: 50, width: "100%", borderBottom: `1px solid ${txt}10`, background: `${bg}e8`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, color: pri, fontFamily: hFont }}>{meta.name}</span>
          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: `${txt}80` }}>
            {about  && <a href="#about"    style={{ color: "inherit", textDecoration: "none" }}>À propos</a>}
            {projects && <a href="#projects" style={{ color: "inherit", textDecoration: "none" }}>Projets</a>}
            {contact  && <a href="#contact"  style={{ color: "inherit", textDecoration: "none" }}>Contact</a>}
          </div>
        </div>
      </nav>

      {/* Sections in order */}
      {sections.map((section, i) => {
        switch (section.type) {
          case "hero": return (
            <section key={i} style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6rem 1.5rem 3rem", textAlign: "center", backgroundImage: theme.hero_image_url ? `url(${theme.hero_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
              {theme.hero_image_url && <div style={{ position: "absolute", inset: 0, background: bg, opacity: theme.overlay_opacity ?? 0.8 }} />}
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {meta.avatar_url && (
                <Image src={meta.avatar_url} alt={meta.name} width={96} height={96}
                  style={{ borderRadius: "50%", marginBottom: "1.5rem", border: `2px solid ${pri}` }} />
              )}
              <h1 style={{ fontSize: "clamp(2.5rem,6vw,4rem)", fontWeight: 700, fontFamily: hFont, color: txt, marginBottom: "1rem", lineHeight: 1.1 }}>
                {section.title || meta.name}
              </h1>
              <p style={{ fontSize: "1.125rem", fontWeight: 500, color: pri, marginBottom: "0.5rem" }}>{meta.title}</p>
              <p style={{ fontSize: "1.125rem", color: `${txt}70`, maxWidth: 560, marginBottom: "2.5rem" }}>
                {section.subtitle || meta.tagline}
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                <a href="#projects" style={{ background: pri, color: "#fff", padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
                  {section.cta_text}
                </a>
                {meta.github_url && (
                  <a href={meta.github_url} target="_blank" rel="noopener noreferrer"
                    style={{ border: `1px solid ${txt}20`, color: `${txt}80`, padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontSize: "0.875rem" }}>
                    GitHub →
                  </a>
                )}
              </div>
              </div>
            </section>
          );

          case "about": return (
            <section key={i} id="about" style={{ padding: "5rem 1.5rem", background: `${bg}f0` }}>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "1.5rem" }}>À propos</h2>
                <p style={{ fontSize: "1.0625rem", lineHeight: 1.75, color: `${txt}cc` }}>{section.content}</p>
                {section.highlight && (
                  <p style={{ marginTop: "1rem", borderLeft: `3px solid ${pri}`, paddingLeft: "1rem", color: pri, fontStyle: "italic" }}>{section.highlight}</p>
                )}
              </div>
            </section>
          );

          case "skills": return (
            <section key={i} id="skills" style={{ padding: "5rem 1.5rem", background: bg }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "2.5rem" }}>Compétences</h2>
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {section.items.map((skill) => (
                    <div key={skill.name} style={{ border: `1px solid ${txt}12`, borderRadius: "0.75rem", padding: "1rem", background: `${txt}04` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: txt }}>{skill.name}</span>
                        <span style={{ fontSize: "0.75rem", color: pri }}>{skill.level}/5</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: `${txt}15`, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(skill.level / 5) * 100}%`, background: pri, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: `${txt}50`, marginTop: "0.25rem", display: "block" }}>{skill.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );

          case "projects": return (
            <section key={i} id="projects" style={{ padding: "5rem 1.5rem", background: `${bg}f0` }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "2.5rem" }}>Projets</h2>
                <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {section.items.map((p) => (
                    <div key={p.name} style={{ border: `1px solid ${txt}12`, borderRadius: "1rem", padding: "1.5rem", background: `${txt}03` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                        <h3 style={{ fontWeight: 600, color: txt }}>{p.name}</h3>
                        {p.stars ? <span style={{ fontSize: "0.75rem", color: pri }}>★ {p.stars}</span> : null}
                      </div>
                      <p style={{ fontSize: "0.875rem", color: `${txt}80`, marginBottom: "1rem", lineHeight: 1.6 }}>{p.description}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                        {p.tech_stack.map((t) => (
                          <span key={t} style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "0.375rem", background: `${pri}18`, color: pri }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: `${txt}60`, textDecoration: "none" }}>GitHub →</a>}
                        {p.live_url   && <a href={p.live_url}   target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: acc, textDecoration: "none" }}>Live →</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );

          case "experience": return (
            <section key={i} id="experience" style={{ padding: "5rem 1.5rem", background: bg }}>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "2.5rem" }}>Expérience</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {section.items.map((exp) => (
                    <div key={exp.company} style={{ borderLeft: `2px solid ${pri}30`, paddingLeft: "1.5rem", position: "relative" }}>
                      <div style={{ position: "absolute", left: -5, top: 4, width: 8, height: 8, borderRadius: "50%", background: pri }} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 600, color: txt }}>{exp.role}</span>
                        <span style={{ color: pri, fontWeight: 500 }}>{exp.company}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: `${txt}40`, marginBottom: "0.5rem" }}>{exp.period}</p>
                      <p style={{ fontSize: "0.875rem", color: `${txt}80`, lineHeight: 1.6 }}>{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );

          case "contact": return (
            <section key={i} id="contact" style={{ padding: "5rem 1.5rem", textAlign: "center", background: `${bg}f0` }}>
              <div style={{ maxWidth: 480, margin: "0 auto" }}>
                <h2 style={{ fontFamily: hFont, fontSize: "1.875rem", fontWeight: 700, color: txt, marginBottom: "1rem" }}>Contact</h2>
                <p style={{ color: `${txt}80`, marginBottom: "2rem" }}>{section.message}</p>
                <a href={`mailto:${section.email}`}
                  style={{ display: "inline-block", background: pri, color: "#fff", padding: "0.875rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 600, marginBottom: "2rem" }}>
                  {section.email}
                </a>
                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
                  {section.links.map((l) => (
                    <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.875rem", color: `${txt}60`, textDecoration: "none" }}>{l.label}</a>
                  ))}
                </div>
              </div>
            </section>
          );

          default: return null;
        }
      })}

      <footer style={{ padding: "2rem", textAlign: "center", fontSize: "0.75rem", color: `${txt}30`, background: bg }}>
        Créé avec <a href="https://folyyo.com" style={{ color: pri, textDecoration: "none" }}>Folyyo</a>
      </footer>
    </main>
  );
}
