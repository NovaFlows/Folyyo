import Image from "next/image";

// Bandeau défilant de vrais avis clients (fournis par l'équipe Folyyo — noms,
// métiers, citations et photos réels, avec l'accord des personnes). Pur CSS
// (@keyframes ld-marquee dans globals.css), aucun JS : la liste est dupliquée
// pour boucler sans à-coup, pause au survol.
const TESTIMONIALS = [
  { name: "Lucas Martin",  role: "Développeur web freelance", photo: "/testimonials/lucas-martin.png",  quote: "J'ai créé mon portfolio en moins d'une heure. L'IA m'a aidé à présenter mes projets correctement, puis j'ai pu modifier chaque détail moi-même." },
  { name: "Sarah Benali",  role: "Product Designer",          photo: "/testimonials/sarah-benali.png",  quote: "Je ne savais pas comment organiser mes expériences. La plateforme a généré une première version claire et professionnelle que j'ai ensuite personnalisée facilement." },
  { name: "Thomas Leroy",  role: "Étudiant en informatique",  photo: "/testimonials/thomas-leroy.png",  quote: "Ce que j'aime le plus, c'est que l'IA ne bloque pas la créativité. Elle propose une base, mais je garde le contrôle total sur le contenu et le design." },
  { name: "Inès Robert",   role: "Étudiante en UX Design",    photo: "/testimonials/ines-robert.png",   quote: "J'avais besoin d'un portfolio rapidement pour postuler à un stage. En quelques minutes, j'avais déjà une page propre, moderne et prête à être envoyée aux recruteurs." },
  { name: "Mehdi Amari",   role: "Développeur full-stack",    photo: "/testimonials/mehdi-amari.png",   quote: "Contrairement aux autres outils que j'ai testés, je peux vraiment modifier tout ce qui est généré. Le résultat ne ressemble pas à un template générique." },
  { name: "Clara Moreau",  role: "Graphiste freelance",       photo: "/testimonials/clara-moreau.png",  quote: "L'IA a transformé mes notes et mes descriptions très simples en présentations de projets beaucoup plus convaincantes, sans dénaturer mon travail." },
  { name: "Nathan Dubois", role: "Photographe",                photo: "/testimonials/nathan-dubois.png", quote: "Je repoussais la création de mon portfolio depuis plusieurs mois. La génération automatique m'a permis de commencer immédiatement et de tout personnaliser ensuite." },
  { name: "Emma Laurent",  role: "Marketing & Communication", photo: "/testimonials/emma-laurent.png",  quote: "L'outil trouve un très bon équilibre entre rapidité et personnalisation. Je gagne du temps avec l'IA, mais mon portfolio reste vraiment personnel." },
  { name: "Adam Diallo",   role: "Data Analyst",               photo: "/testimonials/adam-diallo.png",   quote: "J'ai simplement ajouté mes projets et quelques informations sur mon parcours. L'IA s'est occupée de la structure et m'a proposé des textes beaucoup plus professionnels." },
  { name: "Léa Fontaine",  role: "Illustratrice",               photo: "/testimonials/lea-fontaine.png",  quote: "Le rendu est propre sur ordinateur comme sur téléphone. J'ai pu partager mon portfolio dès le premier jour et continuer à l'améliorer au fil du temps." },
];

export default function TestimonialMarquee() {
  const track = [...TESTIMONIALS, ...TESTIMONIALS]; // doublé pour le bouclage seamless

  return (
    <div className="ld-marquee-wrap overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)" }}>
      <div className="ld-marquee-track flex w-max gap-4 py-1" style={{ animationDuration: "70s" }}>
        {track.map((t, i) => (
          <figure key={i}
            className="flex w-[320px] shrink-0 flex-col justify-between rounded-2xl p-6"
            style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
            <blockquote className="mb-5 text-sm leading-relaxed" style={{ color: "#57534e" }}>
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <Image
                src={t.photo} alt={t.name} width={36} height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                style={{ border: "1px solid rgba(0,0,0,0.06)" }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold" style={{ color: "#1c1917" }}>{t.name}</span>
                <span className="block truncate text-xs" style={{ color: "#a09a94" }}>{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
