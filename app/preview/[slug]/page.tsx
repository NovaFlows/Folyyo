import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPortfolioBySlugPublic, getPortfolioBySlugOrId } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import { hasActiveAccess } from "@/lib/billing/access";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import TrialExpiredNotice from "@/components/billing/TrialExpiredNotice";
import VisualEditor from "./VisualEditor";

// Route interne réservée à l'édition visuelle (liée uniquement depuis le
// dashboard, `?mode=edit`) — le rendu public canonique vit désormais à la
// racine (`app/[slug]/page.tsx`), vers laquelle on redirige sinon.
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { mode?: string };
}) {
  if (searchParams.mode !== "edit") {
    redirect(`/${params.slug}`);
  }

  const portfolio = await getPortfolioBySlugPublic(params.slug);
  if (!portfolio || !portfolio.site_json) notFound();

  const data = portfolio.site_json as ValidatedPortfolioJSON;

  const { userId } = await auth();
  if (!userId) redirect(`/login`);
  const owned = await getPortfolioBySlugOrId(params.slug, userId);
  if (!owned) notFound();

  if (!portfolio.owner_subscription_status || !hasActiveAccess({ subscription_status: portfolio.owner_subscription_status, trial_ends_at: portfolio.owner_trial_ends_at })) {
    const t = getDictionary(getLocale()).billing.editorLocked;
    return <TrialExpiredNotice t={t} portfolioId={portfolio.id} />;
  }

  return <VisualEditor initialData={data} portfolioId={portfolio.id} slug={params.slug} profileType={owned.profile_type} />;
}
