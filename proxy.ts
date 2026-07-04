import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = new Set([
  "/login",
  "/register",
  "/unauthorized",
  "/api/auth/login-lookup",
  "/api/auth/register",
  "/api/auth/register-roles",
  "/api/auth/setup-status",
  "/api/webhooks/whatsapp",
]);

function isPublicPath(pathname: string) {
  return publicPaths.has(pathname);
}

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname)) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
