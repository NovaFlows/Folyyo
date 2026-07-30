import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllPosts, type Block } from "@/lib/blog/posts";
import { SITE_URL } from "@/lib/seo";
import { BlogHeader, BlogCta, formatBlogDate } from "../BlogChrome";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Article", robots: { index: false, follow: false } };
  const url = `/blog/${post.slug}`;
  return {
    title: { absolute: `${post.title} · Folyo` },
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title, description: post.description, url, type: "article",
      siteName: "Folyo", locale: "fr_FR", publishedTime: post.date, modifiedTime: post.updated ?? post.date,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

function renderBlock(b: Block, i: number) {
  switch (b.type) {
    case "h2":
      return <h2 key={i} className="mt-10 mb-3 text-2xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>{b.text}</h2>;
    case "h3":
      return <h3 key={i} className="mt-6 mb-2 text-lg font-semibold" style={{ color: "#1c1917" }}>{b.text}</h3>;
    case "p":
      return <p key={i} className="mb-4 leading-relaxed" style={{ color: "#44403c" }} dangerouslySetInnerHTML={{ __html: b.html }} />;
    case "list": {
      const cls = `mb-4 ml-5 flex flex-col gap-1.5 ${b.ordered ? "list-decimal" : "list-disc"}`;
      const items = b.items.map((it, j) => (
        <li key={j} className="pl-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: it }} />
      ));
      return b.ordered
        ? <ol key={i} className={cls} style={{ color: "#44403c" }}>{items}</ol>
        : <ul key={i} className={cls} style={{ color: "#44403c" }}>{items}</ul>;
    }
    case "cta":
      return <div key={i} className="my-9"><BlogCta /></div>;
  }
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: "Folyo", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Folyo", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    inLanguage: "fr-FR",
  };

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <BlogHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/blog" className="mb-8 inline-block text-sm transition hover:opacity-70" style={{ color: "#a09a94" }}>
          ← Blog
        </Link>

        <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: "#a09a94" }}>
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          <span>·</span>
          <span>{post.readingMinutes} min de lecture</span>
        </div>

        <h1 className="mb-8 text-3xl sm:text-4xl serif" style={{ fontWeight: 500, color: "#1c1917", lineHeight: 1.15 }}>
          {post.title}
        </h1>

        <div style={{ fontSize: "1.0625rem" }}>
          {post.body.map(renderBlock)}
        </div>
      </article>
    </div>
  );
}
