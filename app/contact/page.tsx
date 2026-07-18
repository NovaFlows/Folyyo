import Link from "next/link";

const CONTACTS = [
  {
    label: "Email",
    value: "novaflows.pro@gmail.com",
    href: "mailto:novaflows.pro@gmail.com",
    icon: "✉",
  },
  {
    label: "Téléphone",
    value: "06 84 14 04 38",
    href: "tel:+33684140438",
    icon: "☎",
  },
  {
    label: "WhatsApp",
    value: "06 84 14 04 38",
    href: "https://wa.me/33684140438",
    icon: "💬",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0", color: "#1c1917", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyyo
          </Link>
          <Link href="/" className="text-sm transition hover:opacity-70" style={{ color: "#78716c" }}>
            ← Accueil
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>contact</p>
        <h1 className="mb-3 text-4xl serif" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
          Une question ? Écris-nous.
        </h1>
        <p className="mb-10 max-w-md text-sm" style={{ color: "#78716c" }}>
          On répond au plus vite, par le canal qui t&apos;arrange le mieux.
        </p>

        <div className="flex flex-col gap-3">
          {CONTACTS.map((c) => (
            <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5"
              style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ background: "rgba(201,169,110,0.12)", color: "#c9a96e" }}>
                {c.icon}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#a09a94" }}>{c.label}</p>
                <p className="text-base font-medium" style={{ color: "#1c1917" }}>{c.value}</p>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-10 text-xs" style={{ color: "#c8c4bf" }}>
          Discord — bientôt disponible.
        </p>
      </div>
    </div>
  );
}
