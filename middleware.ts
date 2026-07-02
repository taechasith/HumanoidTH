import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/admin", "/data-pulls", "/api/ingest", "/api/export"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function unauthorized(message = "Authentication required") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Thailand Humanoid Atlas"'
    }
  });
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const expectedUser = process.env.ADMIN_BASIC_USER;
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD;

  if (!expectedUser || !expectedPassword || expectedPassword === "change-this-before-deploy") {
    return new NextResponse("Admin auth is not configured.", { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorized();
  }

  let user = "";
  let password = "";
  try {
    [user, password] = atob(header.slice("Basic ".length)).split(":");
  } catch {
    return unauthorized("Invalid authentication header");
  }

  if (user !== expectedUser || password !== expectedPassword) {
    return unauthorized("Invalid credentials");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/data-pulls/:path*", "/api/ingest/:path*", "/api/export"]
};
