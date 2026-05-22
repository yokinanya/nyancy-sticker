import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isLoggedIn = !!req.auth;
  const canEdit = role === "editor" || role === "admin";

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(url);
    }
    if (!canEdit) return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname === "/submit" && !isLoggedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/submit"],
};
