import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortfolioBySlugPublic } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import VisualEditor from "@/app/preview/[slug]/VisualEditor";
import { assertLocalOnly } from "../../config";

// Jamais prérendu au build (sinon Next tenterait un accès Neon au moment du
// build) et jamais mis en cache — voir app/shot/config.ts pour le mode d'emploi.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Capture de l'éditeur visuel (équivalent de /preview/<slug>?mode=edit) :
//   http://localhost:3000/shot/editor/<slug>
// Contrairement à la vraie page, ni vérification de propriété ni vérification
// d'abonnement — c'est le but (rendre l'éditeur sans session Clerk), et c'est
// précisément pourquoi la route 404 hors développement local.
export default async function ShotEditorPage({ params }: { params: { slug: string } }) {
  assertLocalOnly();

  const portfolio = await getPortfolioBySlugPublic(params.slug);
  if (!portfolio || !portfolio.site_json) notFound();

  const data = portfolio.site_json as ValidatedPortfolioJSON;

  return (
    <VisualEditor
      initialData={data}
      portfolioId={portfolio.id}
      slug={params.slug}
      profileType={portfolio.profile_type}
      hideTour
    />
  );
}
