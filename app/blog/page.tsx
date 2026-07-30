import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog/posts";
import { BlogHeader, BlogCta, formatBlogDate } from "./BlogChrome";

const TITLE = "Blog Folyo — Conseils pour créer ton portfolio";
const DESC = "Guides pratiques pour créer un portfolio professionnel qui décroche des opportunités : développeur, designer, photographe, étudiant, freelance et plus.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESC, url: "/blog", type: "website", siteName: "Folyo", locale: "fr_FR" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <BlogHeader />
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>Blog</p>
        <h1 className="mb-3 text-4xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Conseils pour créer ton portfolio
        </h1>
        <p className="mb-12 max-w-xl text-sm" style={{ color: "#78716c" }}>
          Des guides pratiques pour faire un portfolio qui te démarque — quel que soit ton métier.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`}
              className="block rounded-2xl p-6 transition hover:-translate-y-0.5"
              style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "#a09a94" }}>
                <time dateTime={p.date}>{formatBlogDate(p.date)}</time>
                <span>·</span>
                <span>{p.readingMinutes} min de lecture</span>
              </div>
              <h2 className="mb-1.5 text-lg font-semibold" style={{ color: "#1c1917" }}>{p.title}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#78716c" }}>{p.excerpt}</p>
            </Link>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <BlogCta />
        </div>
      </div>
    </div>
  );
}
