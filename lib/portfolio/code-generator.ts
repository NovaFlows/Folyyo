import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import type { SourceCode } from "@/types/portfolio";

export function generateDeveloperCode(json: ValidatedPortfolioJSON, portfolioId: string): SourceCode {
  const { meta, theme, sections } = json;

  const heroSection = sections.find((s) => s.type === "hero");
  const aboutSection = sections.find((s) => s.type === "about");
  const skillsSection = sections.find((s) => s.type === "skills");
  const projectsSection = sections.find((s) => s.type === "projects");
  const experienceSection = sections.find((s) => s.type === "experience");
  const contactSection = sections.find((s) => s.type === "contact");

  return {
    "package.json": generatePackageJson(meta.name),
    "next.config.js": generateNextConfig(),
    "tailwind.config.js": generateTailwindConfig(theme),
    "postcss.config.js": generatePostcssConfig(),
    "app/layout.tsx": generateLayout(meta, theme, portfolioId),
    "app/page.tsx": generateMainPage(
      meta,
      theme,
      heroSection,
      aboutSection,
      skillsSection,
      projectsSection,
      experienceSection,
      contactSection
    ),
    "app/globals.css": generateGlobalsCss(theme),
  };
}

function generatePackageJson(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return JSON.stringify(
    {
      name: slug || "portfolio",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "14.2.5",
        react: "^18",
        "react-dom": "^18",
      },
      devDependencies: {
        typescript: "^5",
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        tailwindcss: "^3.4.1",
        postcss: "^8",
        autoprefixer: "^10.0.1",
      },
    },
    null,
    2
  );
}

function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
`;
}

function generateTailwindConfig(theme: ValidatedPortfolioJSON["theme"]): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${theme.primary_color}',
        accent: '${theme.accent_color}',
      },
      fontFamily: {
        heading: ['${theme.font_heading}', 'system-ui', 'sans-serif'],
        body: ['${theme.font_body}', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
`;
}

function generatePostcssConfig(): string {
  return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function generateGlobalsCss(theme: ValidatedPortfolioJSON["theme"]): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.font_heading)}:wght@300;400;500;600;700&display=swap');

:root {
  --primary: ${theme.primary_color};
  --accent: ${theme.accent_color};
  --bg: ${theme.background_color};
  --text: ${theme.text_color};
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: ${theme.background_color};
  color: ${theme.text_color};
  font-family: '${theme.font_body}', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

html { scroll-behavior: smooth; }

::selection { background: ${theme.primary_color}40; }
`;
}

function generateLayout(
  meta: ValidatedPortfolioJSON["meta"],
  theme: ValidatedPortfolioJSON["theme"],
  portfolioId: string
): string {
  // Beacon de vue anonyme (pas d'IP, pas de cookie) — voir app/api/track/route.ts.
  // navigator.sendBeacon évite le preflight CORS ; résolu au moment de la
  // génération (pas d'exécution serveur côté site déployé, domaine séparé).
  // Repli sur l'alias Vercel stable (folyyo.vercel.app, toujours la prod
  // courante) tant qu'aucun nom de domaine personnalisé n'est configuré.
  const trackBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://folyyo.vercel.app";
  const trackScript = `(function(){try{var u='${trackBase}/api/track?p=${portfolioId}&r='+encodeURIComponent(document.referrer||'');if(navigator.sendBeacon){navigator.sendBeacon(u)}else{fetch(u,{method:'POST',keepalive:true}).catch(function(){})}}catch(e){}})();`;

  return `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${escStr(meta.name)} — ${escStr(meta.title)}',
  description: '${escStr(meta.tagline)}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(trackScript)} }} />
      </body>
    </html>
  );
}
`;
}

function generateMainPage(
  meta: ValidatedPortfolioJSON["meta"],
  theme: ValidatedPortfolioJSON["theme"],
  hero: ValidatedPortfolioJSON["sections"][number] | undefined,
  about: ValidatedPortfolioJSON["sections"][number] | undefined,
  skills: ValidatedPortfolioJSON["sections"][number] | undefined,
  projects: ValidatedPortfolioJSON["sections"][number] | undefined,
  experience: ValidatedPortfolioJSON["sections"][number] | undefined,
  contact: ValidatedPortfolioJSON["sections"][number] | undefined
): string {
  const h = hero?.type === "hero" ? hero : null;
  const a = about?.type === "about" ? about : null;
  const sk = skills?.type === "skills" ? skills : null;
  const pr = projects?.type === "projects" ? projects : null;
  const ex = experience?.type === "experience" ? experience : null;
  const co = contact?.type === "contact" ? contact : null;

  return `import Image from 'next/image';

export default function Portfolio() {
  return (
    <main style={{ fontFamily: "'${theme.font_body}', system-ui, sans-serif" }}>
      {/* ── Nav ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl" style={{ background: '${theme.background_color}e0' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-bold" style={{ color: '${theme.primary_color}' }}>
            ${escStr(meta.name)}
          </span>
          <div className="flex gap-6 text-sm" style={{ color: '${theme.text_color}99' }}>
            <a href="#about" className="hover:text-white transition">À propos</a>
            <a href="#projects" className="hover:text-white transition">Projets</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center pt-20" style={{ background: '${theme.background_color}' }}>
        ${
          meta.avatar_url
            ? `<Image src="${escStr(meta.avatar_url)}" alt="${escStr(meta.name)}" width={96} height={96} className="mb-6 rounded-full ring-2" style={{ ringColor: '${theme.primary_color}' }} />`
            : ""
        }
        <h1 className="mb-4 text-5xl font-bold sm:text-7xl" style={{ color: '${theme.text_color}', fontFamily: "'${theme.font_heading}', sans-serif" }}>
          ${escStr(h?.title ?? meta.name)}
        </h1>
        <p className="mb-2 text-xl font-medium" style={{ color: '${theme.primary_color}' }}>
          ${escStr(meta.title)}
        </p>
        <p className="mb-10 max-w-2xl text-lg" style={{ color: '${theme.text_color}80' }}>
          ${escStr(h?.subtitle ?? meta.tagline)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#projects" className="rounded-xl px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: '${theme.primary_color}' }}>
            ${escStr(h?.cta_text ?? "Voir mes projets")}
          </a>
          ${meta.github_url ? `<a href="${escStr(meta.github_url)}" target="_blank" rel="noopener noreferrer" className="rounded-xl border px-8 py-3 text-sm font-medium transition hover:bg-white/5" style={{ borderColor: '${theme.text_color}20', color: '${theme.text_color}99' }}>GitHub →</a>` : ""}
        </div>
      </section>

      {/* ── About ── */}
      ${
        a
          ? `<section id="about" className="py-24 px-6" style={{ background: '${theme.background_color}f5' }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-3xl font-bold" style={{ color: '${theme.text_color}', fontFamily: "'${theme.font_heading}', sans-serif" }}>À propos</h2>
          <p className="text-lg leading-relaxed" style={{ color: '${theme.text_color}cc' }}>${escStr(a.content)}</p>
          ${a.highlight ? `<p className="mt-4 rounded-xl border-l-4 pl-4 py-2 text-base italic" style={{ borderColor: '${theme.primary_color}', color: '${theme.primary_color}' }}>${escStr(a.highlight)}</p>` : ""}
        </div>
      </section>`
          : ""
      }

      {/* ── Skills ── */}
      ${
        sk
          ? `<section id="skills" className="py-24 px-6" style={{ background: '${theme.background_color}' }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-3xl font-bold" style={{ color: '${theme.text_color}', fontFamily: "'${theme.font_heading}', sans-serif" }}>Compétences</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            ${sk.items
              .map(
                (skill) => `{/* ${skill.name} */}
            <div className="rounded-xl border p-4 transition hover:border-opacity-60" style={{ borderColor: '${theme.text_color}15', background: '${theme.text_color}05' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: '${theme.text_color}' }}>${escStr(skill.name)}</span>
                <span className="text-xs" style={{ color: '${theme.primary_color}' }}>${skill.level}/5</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: '${theme.text_color}15' }}>
                <div className="h-full rounded-full transition-all" style={{ width: '${(skill.level / 5) * 100}%', background: '${theme.primary_color}' }} />
              </div>
              <span className="mt-1.5 block text-xs" style={{ color: '${theme.text_color}50' }}>${escStr(skill.category)}</span>
            </div>`
              )
              .join("\n            ")}
          </div>
        </div>
      </section>`
          : ""
      }

      {/* ── Projects ── */}
      ${
        pr
          ? `<section id="projects" className="py-24 px-6" style={{ background: '${theme.background_color}f5' }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-3xl font-bold" style={{ color: '${theme.text_color}', fontFamily: "'${theme.font_heading}', sans-serif" }}>Projets</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            ${pr.items
              .map(
                (project) => `<div className="rounded-2xl border p-6 transition hover:border-opacity-60" style={{ borderColor: '${theme.text_color}15', background: '${theme.text_color}03' }}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold" style={{ color: '${theme.text_color}' }}>${escStr(project.name)}</h3>
                ${project.stars ? `<span className="shrink-0 text-xs" style={{ color: '${theme.primary_color}' }}>★ ${project.stars}</span>` : ""}
              </div>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: '${theme.text_color}80' }}>${escStr(project.description)}</p>
              <div className="mb-4 flex flex-wrap gap-2">
                ${project.tech_stack.map((tech) => `<span className="rounded-md px-2.5 py-1 text-xs font-medium" style={{ background: '${theme.primary_color}15', color: '${theme.primary_color}' }}>${escStr(tech)}</span>`).join("")}
              </div>
              <div className="flex gap-3">
                ${project.github_url ? `<a href="${escStr(project.github_url)}" target="_blank" rel="noopener noreferrer" className="text-xs transition hover:opacity-80" style={{ color: '${theme.text_color}60' }}>GitHub →</a>` : ""}
                ${project.live_url ? `<a href="${escStr(project.live_url)}" target="_blank" rel="noopener noreferrer" className="text-xs transition hover:opacity-80" style={{ color: '${theme.accent_color}' }}>Live →</a>` : ""}
              </div>
            </div>`
              )
              .join("\n            ")}
          </div>
        </div>
      </section>`
          : ""
      }

      {/* ── Experience ── */}
      ${
        ex
          ? `<section id="experience" className="py-24 px-6" style={{ background: '${theme.background_color}' }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-3xl font-bold" style={{ color: '${theme.text_color}', fontFamily: "'${theme.font_heading}', sans-serif" }}>Expérience</h2>
          <div className="space-y-8">
            ${ex.items
              .map(
                (exp) => `<div className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-full before:w-px" style={{ borderLeftColor: '${theme.primary_color}30' }}>
              <div className="absolute -left-1.5 top-2 h-3 w-3 rounded-full" style={{ background: '${theme.primary_color}' }} />
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h3 className="font-semibold" style={{ color: '${theme.text_color}' }}>${escStr(exp.role)}</h3>
                <span className="text-sm font-medium" style={{ color: '${theme.primary_color}' }}>${escStr(exp.company)}</span>
              </div>
              <p className="mb-2 text-xs" style={{ color: '${theme.text_color}40' }}>${escStr(exp.period)}</p>
              <p className="text-sm leading-relaxed" style={{ color: '${theme.text_color}80' }}>${escStr(exp.description)}</p>
            </div>`
              )
              .join("\n            ")}
          </div>
        </div>
      </section>`
          : ""
      }

      {/* ── Contact ── */}
      ${
        co
          ? `<section id="contact" className="py-24 px-6 text-center" style={{ background: '${theme.background_color}f5' }}>
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-3xl font-bold" style={{ color: '${theme.text_color}', fontFamily: "'${theme.font_heading}', sans-serif" }}>Contact</h2>
          <p className="mb-8 text-lg" style={{ color: '${theme.text_color}80' }}>${escStr(co.message)}</p>
          <a href="mailto:${escStr(co.email)}" className="inline-block rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 mb-8" style={{ background: '${theme.primary_color}' }}>
            ${escStr(co.email)}
          </a>
          <div className="flex justify-center gap-6">
            ${co.links.map((link) => `<a href="${escStr(link.url)}" target="_blank" rel="noopener noreferrer" className="text-sm transition hover:opacity-80" style={{ color: '${theme.text_color}60' }}>${escStr(link.label)}</a>`).join("")}
          </div>
        </div>
      </section>`
          : ""
      }

      {/* ── Footer ── */}
      <footer className="py-8 text-center text-xs" style={{ background: '${theme.background_color}', color: '${theme.text_color}30' }}>
        Built with <a href="https://folyyo.com" style={{ color: '${theme.primary_color}' }}>Folyyo</a>
      </footer>
    </main>
  );
}
`;
}

function escStr(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, " ");
}
