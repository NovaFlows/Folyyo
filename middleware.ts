import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/portfolio(.*)",
  "/settings(.*)",
  "/billing(.*)",
]);

// Identifiant anonyme par appareil (aucune donnée personnelle) utilisé pour
// dédoublonner le comptage de vues des portfolios (voir app/[slug]/page.tsx)
// — sans ça, rafraîchir une page compterait une nouvelle vue à chaque fois.
const VISITOR_COOKIE = "pf_vid";

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();

  const res = NextResponse.next();
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
