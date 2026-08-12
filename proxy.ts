import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const protectedPrefixes = ["/dashboard", "/admin"];
const authRoutes = ["/login", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));
  const isAuthRoute = authRoutes.includes(path);

  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  const isUser = !!session?.userId;
  const isAdmin = !!session?.isAdmin;
  const isAuthenticated = isUser || isAdmin;

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL(isUser ? "/dashboard" : "/login", request.url));
  }

  if (path.startsWith("/dashboard") && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
