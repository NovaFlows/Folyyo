// Personas de démonstration pour peupler la galerie Communauté.
// Calqués sur les témoignages de la landing (components/landing/TestimonialMarquee)
// : mêmes noms, mêmes métiers, même photo (avatarUrl) → cohérence totale entre
// les avis affichés et les portfolios réels de la Communauté.
// `background` sert de "cv_text" à la génération : la matière que Claude exploite
// pour produire un portfolio riche (bio, sections, projets, ton).
// Utilisé UNIQUEMENT par l'outil de seed dev (app/api/admin/seed-community).

export interface SeedPersona {
  profileType: "developer" | "designer" | "photographe" | "artist" | "fashion" | "musicien" | "other";
  name: string;
  title: string;
  slug: string;
  email: string;
  country: string;
  language: "fr" | "en" | "es" | "de";
  background: string;
  avatarUrl?: string; // photo du témoignage, réutilisée comme avatar du portfolio
  website?: string;
}

export const SEED_PERSONAS: SeedPersona[] = [
  {
    profileType: "developer", name: "Lucas Martin", title: "Développeur web freelance",
    slug: "lucas-martin", email: "lucas.martin@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/lucas-martin.png",
    background: "Développeur web freelance, 4 ans. Crée des sites et applications sur mesure pour PME et startups avec React, Next.js, Node et Tailwind. A livré une quinzaine de projets clients (e-commerce, SaaS, sites vitrines). Attentif à la performance, au SEO et à un code maintenable. Disponible en freelance.",
  },
  {
    profileType: "designer", name: "Sarah Benali", title: "Product Designer",
    slug: "sarah-benali", email: "sarah.benali@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/sarah-benali.png",
    background: "Product Designer, 5 ans. Conçoit des expériences produit de bout en bout : recherche utilisateur, wireframes, design systems, prototypes. A travaillé sur des apps SaaS et mobiles, améliorant l'onboarding et la rétention. Maîtrise Figma et la conception centrée utilisateur.",
  },
  {
    profileType: "developer", name: "Thomas Leroy", title: "Étudiant en informatique",
    slug: "thomas-leroy", email: "thomas.leroy@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/thomas-leroy.png",
    background: "Étudiant en informatique (Master), passionné de développement web et d'algorithmique. Projets académiques et personnels en Python, Java et React : un agrégateur d'actualités, un bot Discord, un mini-moteur de recherche. Cherche un stage ou une alternance en développement. Curieux, autonome, bon esprit d'équipe.",
  },
  {
    profileType: "designer", name: "Inès Robert", title: "Étudiante en UX Design",
    slug: "ines-robert", email: "ines.robert@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/ines-robert.png",
    background: "Étudiante en UX Design, en quête d'un stage. Travaux d'école et projets perso : refonte d'app mobile, études utilisateurs, maquettes Figma, prototypes interactifs. Sensible à l'accessibilité et au design inclusif. Portfolio de cas d'études en cours de constitution.",
  },
  {
    profileType: "developer", name: "Mehdi Amari", title: "Développeur full-stack",
    slug: "mehdi-amari", email: "mehdi.amari@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/mehdi-amari.png",
    background: "Développeur full-stack, 5 ans, spécialisé JavaScript/TypeScript (React, Node, Nest) et bases SQL/NoSQL. A conçu des plateformes B2B, des dashboards temps réel et des intégrations d'API. Aime résoudre des problèmes complexes et livrer du code testé. Basé à Toulouse.",
  },
  {
    profileType: "designer", name: "Clara Moreau", title: "Graphiste freelance",
    slug: "clara-moreau", email: "clara.moreau@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/clara-moreau.png",
    background: "Graphiste freelance, 6 ans. Identité visuelle, direction artistique, print et digital pour marques, culture et associations. Projets : logos, chartes graphiques, affiches, supports de communication. Style épuré et éditorial. Travaille avec la suite Adobe et Figma.",
  },
  {
    profileType: "photographe", name: "Nathan Dubois", title: "Photographe",
    slug: "nathan-dubois", email: "nathan.dubois@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/nathan-dubois.png",
    background: "Photographe portrait, mariage et reportage, basé à Paris, 8 ans. Style naturel et lumineux, attaché aux moments spontanés. Plus de 150 mariages couverts en France et en Italie, portraits corporate et éditoriaux. Publié dans des magazines lifestyle. Sony A7 IV, optiques fixes.",
  },
  {
    profileType: "other", name: "Emma Laurent", title: "Marketing & Communication",
    slug: "emma-laurent", email: "emma.laurent@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/emma-laurent.png",
    background: "Chargée de marketing et communication, 5 ans. Stratégie de contenu, réseaux sociaux, campagnes emailing et branding pour PME et startups. A piloté des lancements produits et augmenté l'engagement social de 60%. Aime raconter des histoires de marque qui convertissent.",
  },
  {
    profileType: "developer", name: "Adam Diallo", title: "Data Analyst",
    slug: "adam-diallo", email: "adam.diallo@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/adam-diallo.png",
    background: "Data Analyst, 4 ans. Transforme la donnée en décisions : SQL, Python (pandas), dashboards Power BI et Looker, A/B testing. A construit des reportings automatisés et des modèles de segmentation client. Rigoureux, orienté impact business.",
  },
  {
    profileType: "artist", name: "Léa Fontaine", title: "Illustratrice",
    slug: "lea-fontaine", email: "lea.fontaine@example.com", country: "FR", language: "fr",
    avatarUrl: "/testimonials/lea-fontaine.png",
    background: "Illustratrice freelance. Illustration éditoriale, jeunesse et digitale, univers coloré et poétique. Collabore avec l'édition, la presse et des marques. Travaille à l'aquarelle et en numérique (Procreate). Réalise des commandes et des licences d'images.",
  },
];
