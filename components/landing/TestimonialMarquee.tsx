import Image from "next/image";
import type { Locale } from "@/lib/i18n/types";

// Bandeau défilant de vrais avis clients (fournis par l'équipe Folyo — noms,
// métiers, citations et photos réels, avec l'accord des personnes). Pur CSS
// (@keyframes ld-marquee dans globals.css), aucun JS : la liste est dupliquée
// pour boucler sans à-coup, pause au survol. `role`/`quote` traduits pour la
// version anglaise du site — nom et photo restent identiques.
const TESTIMONIALS = {
  fr: [
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
  ],
  en: [
    { name: "Lucas Martin",  role: "Freelance web developer", photo: "/testimonials/lucas-martin.png",  quote: "I built my portfolio in under an hour. The AI helped me present my projects properly, then I could tweak every detail myself." },
    { name: "Sarah Benali",  role: "Product Designer",          photo: "/testimonials/sarah-benali.png",  quote: "I didn't know how to organize my experience. The platform generated a clear, professional first version that I then easily customized." },
    { name: "Thomas Leroy",  role: "Computer science student",  photo: "/testimonials/thomas-leroy.png",  quote: "What I like most is that the AI doesn't block creativity. It proposes a foundation, but I keep full control over the content and design." },
    { name: "Inès Robert",   role: "UX Design student",    photo: "/testimonials/ines-robert.png",   quote: "I needed a portfolio quickly to apply for an internship. Within minutes I already had a clean, modern page ready to send to recruiters." },
    { name: "Mehdi Amari",   role: "Full-stack developer",    photo: "/testimonials/mehdi-amari.png",   quote: "Unlike other tools I've tried, I can really edit everything that's generated. The result doesn't look like a generic template." },
    { name: "Clara Moreau",  role: "Freelance graphic designer",       photo: "/testimonials/clara-moreau.png",  quote: "The AI turned my very basic notes and descriptions into much more compelling project presentations, without distorting my work." },
    { name: "Nathan Dubois", role: "Photographer",                photo: "/testimonials/nathan-dubois.png", quote: "I'd been putting off building my portfolio for months. The automatic generation let me start immediately and customize everything afterward." },
    { name: "Emma Laurent",  role: "Marketing & Communications", photo: "/testimonials/emma-laurent.png",  quote: "The tool strikes a great balance between speed and personalization. I save time with the AI, but my portfolio still feels truly mine." },
    { name: "Adam Diallo",   role: "Data Analyst",               photo: "/testimonials/adam-diallo.png",   quote: "I just added my projects and a bit of background. The AI handled the structure and suggested much more professional copy." },
    { name: "Léa Fontaine",  role: "Illustrator",               photo: "/testimonials/lea-fontaine.png",  quote: "It looks clean on both desktop and phone. I was able to share my portfolio from day one and keep improving it over time." },
  ],
  es: [
    { name: "Lucas Martin",  role: "Desarrollador web freelance", photo: "/testimonials/lucas-martin.png",  quote: "Creé mi portfolio en menos de una hora. La IA me ayudó a presentar mis proyectos correctamente, y luego pude modificar cada detalle yo mismo." },
    { name: "Sarah Benali",  role: "Product Designer",          photo: "/testimonials/sarah-benali.png",  quote: "No sabía cómo organizar mi experiencia. La plataforma generó una primera versión clara y profesional que luego personalicé fácilmente." },
    { name: "Thomas Leroy",  role: "Estudiante de informática",  photo: "/testimonials/thomas-leroy.png",  quote: "Lo que más me gusta es que la IA no bloquea la creatividad. Propone una base, pero mantengo el control total sobre el contenido y el diseño." },
    { name: "Inès Robert",   role: "Estudiante de UX Design",    photo: "/testimonials/ines-robert.png",   quote: "Necesitaba un portfolio rápidamente para solicitar unas prácticas. En pocos minutos ya tenía una página limpia, moderna y lista para enviar a los reclutadores." },
    { name: "Mehdi Amari",   role: "Desarrollador full-stack",    photo: "/testimonials/mehdi-amari.png",   quote: "A diferencia de otras herramientas que he probado, realmente puedo modificar todo lo generado. El resultado no parece una plantilla genérica." },
    { name: "Clara Moreau",  role: "Diseñadora gráfica freelance",       photo: "/testimonials/clara-moreau.png",  quote: "La IA transformó mis notas y descripciones muy simples en presentaciones de proyectos mucho más convincentes, sin desvirtuar mi trabajo." },
    { name: "Nathan Dubois", role: "Fotógrafo",                photo: "/testimonials/nathan-dubois.png", quote: "Llevaba meses posponiendo la creación de mi portfolio. La generación automática me permitió empezar de inmediato y personalizarlo todo después." },
    { name: "Emma Laurent",  role: "Marketing y Comunicación", photo: "/testimonials/emma-laurent.png",  quote: "La herramienta encuentra un muy buen equilibrio entre rapidez y personalización. Gano tiempo con la IA, pero mi portfolio sigue siendo realmente mío." },
    { name: "Adam Diallo",   role: "Data Analyst",               photo: "/testimonials/adam-diallo.png",   quote: "Simplemente añadí mis proyectos y algo de información sobre mi trayectoria. La IA se encargó de la estructura y me propuso textos mucho más profesionales." },
    { name: "Léa Fontaine",  role: "Ilustradora",               photo: "/testimonials/lea-fontaine.png",  quote: "El resultado se ve limpio tanto en ordenador como en móvil. Pude compartir mi portfolio desde el primer día y seguir mejorándolo con el tiempo." },
  ],
  de: [
    { name: "Lucas Martin",  role: "Freelance-Webentwickler", photo: "/testimonials/lucas-martin.png",  quote: "Ich habe mein Portfolio in unter einer Stunde erstellt. Die KI hat mir geholfen, meine Projekte richtig zu präsentieren, danach konnte ich jedes Detail selbst anpassen." },
    { name: "Sarah Benali",  role: "Product Designerin",          photo: "/testimonials/sarah-benali.png",  quote: "Ich wusste nicht, wie ich meine Erfahrungen strukturieren sollte. Die Plattform hat eine klare, professionelle erste Version generiert, die ich danach leicht angepasst habe." },
    { name: "Thomas Leroy",  role: "Informatikstudent",  photo: "/testimonials/thomas-leroy.png",  quote: "Am meisten gefällt mir, dass die KI die Kreativität nicht einschränkt. Sie liefert eine Grundlage, aber ich behalte die volle Kontrolle über Inhalt und Design." },
    { name: "Inès Robert",   role: "UX-Design-Studentin",    photo: "/testimonials/ines-robert.png",   quote: "Ich brauchte schnell ein Portfolio für eine Praktikumsbewerbung. In wenigen Minuten hatte ich schon eine saubere, moderne Seite, bereit für Recruiter." },
    { name: "Mehdi Amari",   role: "Full-Stack-Entwickler",    photo: "/testimonials/mehdi-amari.png",   quote: "Anders als bei anderen Tools, die ich ausprobiert habe, kann ich wirklich alles Generierte bearbeiten. Das Ergebnis wirkt nicht wie eine generische Vorlage." },
    { name: "Clara Moreau",  role: "Freelance-Grafikdesignerin",       photo: "/testimonials/clara-moreau.png",  quote: "Die KI hat meine sehr einfachen Notizen und Beschreibungen in viel überzeugendere Projektpräsentationen verwandelt, ohne meine Arbeit zu verfälschen." },
    { name: "Nathan Dubois", role: "Fotograf",                photo: "/testimonials/nathan-dubois.png", quote: "Ich habe die Erstellung meines Portfolios monatelang aufgeschoben. Die automatische Generierung ließ mich sofort loslegen und danach alles anpassen." },
    { name: "Emma Laurent",  role: "Marketing & Kommunikation", photo: "/testimonials/emma-laurent.png",  quote: "Das Tool findet eine sehr gute Balance zwischen Schnelligkeit und Individualisierung. Ich spare Zeit dank der KI, aber mein Portfolio bleibt wirklich meins." },
    { name: "Adam Diallo",   role: "Data Analyst",               photo: "/testimonials/adam-diallo.png",   quote: "Ich habe einfach meine Projekte und ein paar Infos zu meinem Werdegang hinzugefügt. Die KI hat sich um die Struktur gekümmert und viel professionellere Texte vorgeschlagen." },
    { name: "Léa Fontaine",  role: "Illustratorin",               photo: "/testimonials/lea-fontaine.png",  quote: "Das Ergebnis sieht auf dem Computer wie auf dem Handy sauber aus. Ich konnte mein Portfolio vom ersten Tag an teilen und es mit der Zeit weiter verbessern." },
  ],
};

export default function TestimonialMarquee({ locale }: { locale: Locale }) {
  const track = [...TESTIMONIALS[locale], ...TESTIMONIALS[locale]]; // doublé pour le bouclage seamless

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
