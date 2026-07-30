// Articles de blog — contenu SEO ciblant les requêtes informationnelles autour
// des portfolios (« comment faire un portfolio », « portfolio développeur »…).
// Stockés en données typées (pas de dépendance markdown) : chaque article est
// une liste de blocs rendus par app/blog/[slug]/page.tsx.

export type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; html: string }               // peut contenir <strong>, <a href>
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "cta" };                            // encart d'appel à l'action Folyo

export interface BlogPost {
  slug: string;
  title: string;        // H1 + titre SEO
  description: string;  // meta description (~150-160 car.)
  keywords: string[];
  date: string;         // ISO
  updated?: string;
  readingMinutes: number;
  excerpt: string;      // résumé pour la liste
  body: Block[];
}

const CTA: Block = { type: "cta" };

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "comment-faire-un-portfolio",
    title: "Comment faire un portfolio professionnel en 2026 (guide complet)",
    description: "Le guide pas à pas pour créer un portfolio professionnel qui décroche des opportunités : structure, contenu, design et mise en ligne. Débutants bienvenus.",
    keywords: ["comment faire un portfolio", "créer un portfolio", "faire un portfolio", "portfolio professionnel", "portfolio en ligne"],
    date: "2026-07-31",
    readingMinutes: 7,
    excerpt: "Structure, contenu, design, mise en ligne : tout ce qu'il faut pour créer un portfolio qui te démarque, même si tu débutes.",
    body: [
      { type: "p", html: "Un bon portfolio, c'est souvent ce qui fait la différence entre un profil qu'on oublie et un profil qu'on rappelle. Que tu sois développeur, designer, photographe, étudiant ou freelance, ce guide te montre <strong>comment faire un portfolio</strong> professionnel de A à Z — sans compétences techniques." },
      { type: "h2", text: "1. Clarifie l'objectif de ton portfolio" },
      { type: "p", html: "Avant de foncer, demande-toi : à qui s'adresse-t-il et quel résultat tu vises (décrocher un emploi, des clients freelance, un stage) ? Cet objectif guide tout : le ton, les projets à mettre en avant, le call-to-action." },
      { type: "h2", text: "2. Les sections essentielles d'un portfolio" },
      { type: "p", html: "Un portfolio efficace tient en quelques sections claires :" },
      { type: "list", items: [
        "<strong>Accroche (hero)</strong> : ton nom, ton métier, une phrase qui résume ta valeur.",
        "<strong>À propos</strong> : qui tu es, ton parcours, ce qui te distingue (courte et humaine).",
        "<strong>Projets / réalisations</strong> : le cœur du portfolio — montre, ne raconte pas.",
        "<strong>Compétences</strong> : outils, technologies ou spécialités.",
        "<strong>Contact</strong> : email, réseaux, un moyen simple de te joindre.",
      ] },
      { type: "h2", text: "3. Soigne tes projets : montre des résultats" },
      { type: "p", html: "C'est la partie la plus regardée. Pour chaque projet : un visuel, une phrase de contexte, ton rôle, et si possible un <strong>résultat concret</strong> (« +30% de conversions », « 150 mariages couverts »). Mieux vaut 3 projets soignés que 10 bâclés." },
      { type: "h2", text: "4. Un design simple, lisible, mobile" },
      { type: "p", html: "Pas besoin d'être graphiste. Vise la lisibilité : une police propre, beaucoup d'espace, une couleur d'accent, et surtout un rendu <strong>parfait sur téléphone</strong> (la moitié des visites viennent du mobile). Évite le surchargé." },
      { type: "h2", text: "5. Mets-le en ligne (et rends-le trouvable)" },
      { type: "p", html: "Un portfolio doit vivre à une adresse partageable (ex. <em>tonsite.com/ton-nom</em>). Ajoute un titre et une description clairs pour que Google et LinkedIn l'affichent correctement quand on le partage." },
      { type: "h2", text: "La méthode rapide : générer ton portfolio avec l'IA" },
      { type: "p", html: "Tout faire à la main prend des heures. Un outil comme <strong>Folyo</strong> génère un premier portfolio complet en moins de 60 secondes à partir de ton CV, ton GitHub ou ton YouTube, puis te laisse tout personnaliser (textes, photos, couleurs) — ou demander les modifs à une IA. Résultat : une base pro en quelques minutes, éditable à l'infini." },
      CTA,
    ],
  },
  {
    slug: "quoi-mettre-dans-un-portfolio",
    title: "Que mettre dans son portfolio ? Les 7 sections essentielles",
    description: "Tu ne sais pas quoi mettre dans ton portfolio ? Voici les 7 sections indispensables (et les erreurs à éviter) pour un portfolio qui convertit.",
    keywords: ["quoi mettre dans un portfolio", "que mettre dans son portfolio", "sections portfolio", "contenu portfolio"],
    date: "2026-07-31",
    readingMinutes: 5,
    excerpt: "Les 7 sections indispensables d'un portfolio qui convertit — et les erreurs classiques à éviter.",
    body: [
      { type: "p", html: "La page blanche est le pire ennemi du portfolio. Voici exactement <strong>quoi mettre dans ton portfolio</strong>, section par section." },
      { type: "list", ordered: true, items: [
        "<strong>Une accroche claire</strong> : nom + métier + une phrase de valeur.",
        "<strong>Une bio courte</strong> : ton parcours en 2-3 phrases, ce qui te rend unique.",
        "<strong>Tes meilleurs projets</strong> : visuel, contexte, ton rôle, résultat.",
        "<strong>Tes compétences</strong> : outils, technos ou spécialités concrètes.",
        "<strong>Des preuves</strong> : témoignages, clients, distinctions, chiffres.",
        "<strong>Un peu de personnalité</strong> : ce qui te rend mémorable.",
        "<strong>Un contact évident</strong> : email + réseaux + un CTA.",
      ] },
      { type: "h2", text: "Les erreurs qui font fuir" },
      { type: "list", items: [
        "Trop de projets moyens au lieu de quelques-uns excellents.",
        "Des pavés de texte sans visuels.",
        "Aucun résultat concret, que des descriptions.",
        "Un contact caché ou absent.",
      ] },
      { type: "h2", text: "Le raccourci" },
      { type: "p", html: "Si tu bloques sur le contenu, Folyo pré-remplit toutes ces sections à partir de ton CV ou tes profils, puis tu ajustes. Fini la page blanche." },
      CTA,
    ],
  },
  {
    slug: "portfolio-developpeur",
    title: "Portfolio développeur : le guide pour le réussir (avec exemples)",
    description: "Comment faire un portfolio développeur qui décroche des entretiens : quels projets montrer, comment présenter ton code, et les erreurs à éviter.",
    keywords: ["portfolio développeur", "portfolio developpeur", "portfolio dev", "portfolio programmeur", "portfolio github"],
    date: "2026-07-31",
    readingMinutes: 6,
    excerpt: "Quels projets montrer, comment présenter ton code et ton GitHub, et les erreurs qui coûtent des entretiens.",
    body: [
      { type: "p", html: "Un <strong>portfolio développeur</strong> ne se résume pas à un lien GitHub. Les recruteurs veulent comprendre vite ce que tu sais faire. Voici comment t'y prendre." },
      { type: "h2", text: "Quels projets mettre" },
      { type: "list", items: [
        "2 à 4 projets qui montrent des <strong>compétences variées</strong> (front, back, data…).",
        "Au moins un projet <strong>abouti et déployé</strong> (lien live).",
        "Du code lisible et un README clair sur GitHub.",
      ] },
      { type: "h2", text: "Comment présenter chaque projet" },
      { type: "p", html: "Pour chaque projet : le problème résolu, ta <strong>stack</strong>, ton rôle, un lien démo et un lien code. Ajoute une capture ou un GIF — un visuel vaut mille lignes." },
      { type: "h2", text: "Les incontournables" },
      { type: "list", items: [
        "Tes technologies (langages, frameworks, outils).",
        "Un lien GitHub actif et un LinkedIn.",
        "Un contact simple.",
      ] },
      { type: "h2", text: "Gagner du temps" },
      { type: "p", html: "Folyo peut importer automatiquement ton <strong>GitHub</strong> (repos, langages, stars) pour générer un portfolio développeur pré-rempli, puis tu ajustes le style et le contenu." },
      CTA,
    ],
  },
  {
    slug: "portfolio-etudiant-sans-experience",
    title: "Portfolio étudiant sans expérience : comment le remplir",
    description: "Pas d'expérience pro ? Voici comment faire un portfolio étudiant convaincant avec tes projets d'école, perso et tes compétences, pour décrocher un stage.",
    keywords: ["portfolio étudiant", "portfolio sans expérience", "portfolio stage", "portfolio étudiant sans expérience"],
    date: "2026-07-31",
    readingMinutes: 5,
    excerpt: "Pas d'expérience pro ? Voici comment remplir un portfolio étudiant convaincant pour décrocher un stage ou une alternance.",
    body: [
      { type: "p", html: "« Je n'ai rien à montrer » : faux. Un <strong>portfolio étudiant</strong> se construit très bien sans expérience professionnelle. La preuve." },
      { type: "h2", text: "Ce que tu peux montrer (même sans job)" },
      { type: "list", items: [
        "<strong>Projets d'école</strong> : présente-les comme de vrais projets (contexte, rôle, résultat).",
        "<strong>Projets personnels</strong> : un site, une app, une série photo, un EP…",
        "<strong>Compétences</strong> : outils et matières maîtrisées.",
        "<strong>Associatif / bénévolat</strong> : ça compte aussi.",
      ] },
      { type: "h2", text: "Mets en avant ta progression et ta motivation" },
      { type: "p", html: "Les recruteurs de stage cherchent du <strong>potentiel</strong> et de la curiosité, pas 10 ans de carrière. Montre ce que tu apprends et ce qui te passionne." },
      { type: "h2", text: "Reste simple et rapide" },
      { type: "p", html: "Tu as besoin d'un portfolio propre <em>vite</em> (candidatures, deadlines). Folyo t'en génère un en quelques minutes à partir de ton CV et de tes projets — parfait pour postuler dès aujourd'hui." },
      CTA,
    ],
  },
  {
    slug: "portfolio-designer",
    title: "Portfolio designer & UX : que montrer et comment le présenter",
    description: "Comment faire un portfolio designer (graphique, UI/UX) qui décroche des clients : études de cas, sélection de projets, mise en page et erreurs à éviter.",
    keywords: ["portfolio designer", "portfolio graphiste", "portfolio ui ux", "portfolio ux designer", "book designer"],
    date: "2026-07-31",
    readingMinutes: 6,
    excerpt: "Études de cas, sélection de projets, mise en page : comment présenter un portfolio designer qui convertit.",
    body: [
      { type: "p", html: "En design, ton <strong>portfolio designer</strong> EST ta candidature. On te juge sur ce que tu montres et comment tu le montres." },
      { type: "h2", text: "Privilégie les études de cas" },
      { type: "p", html: "Ne te contente pas d'images : raconte le <strong>problème</strong>, ton processus, tes décisions et le <strong>résultat</strong>. Une bonne étude de cas prouve ta réflexion, pas juste ton coup de crayon." },
      { type: "h2", text: "Sélectionne (moins, mais mieux)" },
      { type: "list", items: [
        "3 à 5 projets forts, cohérents avec le poste visé.",
        "Des visuels haute qualité et bien cadrés.",
        "Une mise en page épurée qui laisse respirer le travail.",
      ] },
      { type: "h2", text: "Soigne la forme" },
      { type: "p", html: "Un portfolio de designer mal mis en page décrédibilise. Typo maîtrisée, grille, contrastes, cohérence : la forme fait partie du fond." },
      { type: "h2", text: "Le démarrer vite" },
      { type: "p", html: "Folyo propose des ambiances pensées pour les créatifs (studio, blocs colorés, minimal typographique) et une galerie visuelle — tu obtiens une base élégante puis tu remplaces par tes projets." },
      CTA,
    ],
  },
  {
    slug: "portfolio-photographe",
    title: "Portfolio photographe : comment le présenter pour décrocher des clients",
    description: "Comment faire un portfolio photographe qui attire des clients : sélection des images, mise en page plein écran, spécialités et contact. Le guide 2026.",
    keywords: ["portfolio photographe", "site photographe", "book photographe", "portfolio photo", "site portfolio photographe"],
    date: "2026-07-31",
    readingMinutes: 5,
    excerpt: "Sélection des images, mise en page plein écran, spécialités : comment présenter un portfolio photographe qui décroche des clients.",
    body: [
      { type: "p", html: "Pour un photographe, tout se joue sur l'image. Un <strong>portfolio photographe</strong> doit laisser tes photos parler — sans distraction." },
      { type: "h2", text: "Sélectionne impitoyablement" },
      { type: "p", html: "On te juge sur ta <strong>plus faible</strong> photo, pas ta meilleure. Garde uniquement tes images les plus fortes et cohérentes avec ce que tu veux vendre (mariage, portrait, culinaire…)." },
      { type: "h2", text: "Mise en page : grand, plein écran, sobre" },
      { type: "list", items: [
        "Des visuels grands et de qualité.",
        "Un fond neutre qui met la photo en valeur.",
        "Une navigation minimale.",
      ] },
      { type: "h2", text: "Précise ta spécialité et facilite le contact" },
      { type: "p", html: "Indique clairement ce que tu fais et où, puis un moyen de te contacter/réserver en un clic. Un client pressé ne doit jamais chercher ton email." },
      { type: "h2", text: "Un rendu pro en quelques minutes" },
      { type: "p", html: "Folyo propose des ambiances galerie (noir, argentique, studio blanc) parfaites pour la photo, avec un rendu impeccable sur mobile — idéal pour partager ton book." },
      CTA,
    ],
  },
  {
    slug: "creer-portfolio-en-ligne-gratuit",
    title: "Créer un portfolio en ligne gratuit : les étapes (2026)",
    description: "Comment créer un portfolio en ligne gratuitement, étape par étape : choisir une adresse, remplir les sections, soigner le design et le partager.",
    keywords: ["créer un portfolio en ligne gratuit", "portfolio en ligne gratuit", "faire un portfolio gratuit", "site portfolio gratuit"],
    date: "2026-07-31",
    readingMinutes: 5,
    excerpt: "Étape par étape : comment créer un portfolio en ligne gratuitement et le mettre en ligne aujourd'hui.",
    body: [
      { type: "p", html: "Bonne nouvelle : <strong>créer un portfolio en ligne gratuitement</strong> est à la portée de tout le monde. Voici les étapes." },
      { type: "list", ordered: true, items: [
        "<strong>Choisis une adresse</strong> claire et pro (idéalement ton nom).",
        "<strong>Rassemble ton contenu</strong> : bio, projets, visuels, contact.",
        "<strong>Remplis les sections essentielles</strong> (accroche, projets, compétences, contact).",
        "<strong>Soigne le design</strong> : lisible, aéré, parfait sur mobile.",
        "<strong>Mets-le en ligne</strong> et partage-le (LinkedIn, signature, CV).",
      ] },
      { type: "h2", text: "Gratuit sans y passer des heures" },
      { type: "p", html: "Coder ou bricoler un site prend du temps. Avec Folyo, tu <strong>génères</strong> un portfolio complet en moins d'une minute (essai gratuit de 3 jours, sans carte), puis tu le personnalises entièrement." },
      { type: "h2", text: "Quelle adresse ?" },
      { type: "p", html: "Ton portfolio vit à une adresse du type <em>folyo.page/ton-nom</em> — courte, mémorable et facile à partager." },
      CTA,
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
