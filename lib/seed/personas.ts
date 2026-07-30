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

  // ── Métiers à étoffer — noms d'origines variées, pas de photo (fond Unsplash) ──
  // ── Mode ──
  {
    profileType: "fashion", name: "Aïcha Traoré", title: "Mannequin & Directrice de Casting",
    slug: "aicha-traore", email: "aicha.traore@example.com", country: "FR", language: "fr",
    background: "Mannequin (Paris, Milan) et directrice de casting. A défilé et posé pour des maisons de luxe et des créateurs émergents, éditoriaux dans la presse mode. Dirige désormais des castings inclusifs pour des campagnes. Book éditorial et campagnes disponibles.",
  },
  {
    profileType: "fashion", name: "Yuna Park", title: "Styliste & Créatrice de mode",
    slug: "yuna-park", email: "yuna.park@example.com", country: "FR", language: "fr",
    background: "Styliste et créatrice de mode, univers mêlant minimalisme coréen et couture parisienne. Collections capsules autoproduites, vendues en concept-stores. Anciennement assistante studio dans une maison parisienne. Sensibilité slow fashion et matières nobles.",
  },
  {
    profileType: "fashion", name: "Sofia Ferreira", title: "Directrice Artistique Mode",
    slug: "sofia-ferreira", email: "sofia.ferreira@example.com", country: "FR", language: "fr",
    background: "Directrice artistique mode. Conçoit l'image de marques et de campagnes : éditos, lookbooks, défilés. Collabore avec photographes, stylistes et magazines. Esthétique éditoriale et sensorielle. Travaille entre Lisbonne et Paris.",
  },
  // ── Musicien ──
  {
    profileType: "musicien", name: "Kwame Mensah", title: "Producteur & Beatmaker",
    slug: "kwame-mensah", email: "kwame.mensah@example.com", country: "FR", language: "fr",
    background: "Producteur et beatmaker, sonorités afrobeat, hip-hop et électronique. A produit pour des artistes de la scène émergente, plusieurs sorties en streaming. Compose, mixe et masterise. Univers chaud et groovy. Studio à Paris.",
  },
  {
    profileType: "musicien", name: "Elena Kovač", title: "Violoniste & Compositrice",
    slug: "elena-kovac", email: "elena.kovac@example.com", country: "FR", language: "fr",
    background: "Violoniste et compositrice formée au conservatoire, passerelle entre classique et musiques actuelles. Concerts en salles et festivals, compositions pour l'image (film, publicité). Collaborations avec ensembles et artistes pop. Originaire de Zagreb.",
  },
  {
    profileType: "musicien", name: "Diego Herrera", title: "Chanteur & Guitariste",
    slug: "diego-herrera", email: "diego.herrera@example.com", country: "FR", language: "fr",
    background: "Chanteur et guitariste, univers latino-folk teinté de pop. Un EP autoproduit, concerts en clubs et festivals. Écrit et compose ses titres en français et en espagnol. Voix chaude, mélodies solaires.",
  },
  // ── Photographe ──
  {
    profileType: "photographe", name: "Mei Chen", title: "Photographe Mode & Portrait",
    slug: "mei-chen", email: "mei.chen@example.com", country: "FR", language: "fr",
    background: "Photographe mode et portrait, esthétique épurée et lumière naturelle. Éditoriaux pour magazines, campagnes de marques, portraits d'artistes. Assure la direction artistique de ses shootings. Basée à Paris, disponible en studio et en extérieur.",
  },
  {
    profileType: "photographe", name: "Omar El-Amrani", title: "Photographe Documentaire & Rue",
    slug: "omar-el-amrani", email: "omar.elamrani@example.com", country: "FR", language: "fr",
    background: "Photographe documentaire et de rue, capte l'humain et l'instant. Reportages en France et au Maghreb, séries personnelles exposées en galerie. Publié dans la presse. Argentique et numérique, regard sensible et engagé.",
  },
  // ── Artiste ──
  {
    profileType: "artist", name: "Fatou Ndiaye", title: "Peintre & Muraliste",
    slug: "fatou-ndiaye", email: "fatou.ndiaye@example.com", country: "FR", language: "fr",
    background: "Peintre et muraliste, couleurs vives et motifs inspirés des textiles ouest-africains. Fresques dans l'espace public, expositions en galeries. Commandes pour marques et institutions culturelles. Basée à Paris.",
  },
  {
    profileType: "artist", name: "Luca Romano", title: "Sculpteur & Céramiste",
    slug: "luca-romano", email: "luca.romano@example.com", country: "FR", language: "fr",
    background: "Sculpteur et céramiste, formes organiques en terre et bronze inspirées de la Méditerranée. Expositions en galeries et résidences d'artiste. Réalise des pièces uniques et des collaborations avec des architectes d'intérieur. Atelier près de Naples.",
  },
  // ── Autre (image de fond sur le titre) ──
  {
    profileType: "other", name: "Priya Sharma", title: "Coach bien-être & Sophrologue",
    slug: "priya-sharma", email: "priya.sharma@example.com", country: "FR", language: "fr",
    background: "Coach en bien-être et sophrologue, accompagne particuliers et entreprises vers l'équilibre et la gestion du stress. Ateliers, séances individuelles et en ligne. Approche mêlant respiration, méditation et développement personnel.",
  },
  {
    profileType: "other", name: "Rayan Haddad", title: "Chef & Consultant culinaire",
    slug: "rayan-haddad", email: "rayan.haddad@example.com", country: "FR", language: "fr",
    background: "Chef et consultant culinaire, cuisine méditerranéenne et levantine revisitée. Menus pour restaurants, ateliers et événements privés. Création de cartes et formation d'équipes. Produits de saison, dressage soigné.",
  },
];
