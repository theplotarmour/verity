import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * A session check in front of every signed-in area.
 *
 * Defence in depth, not the authorisation itself: each page still resolves the
 * user and enforces its own role, because only the page knows whether a store
 * manager may see it. What this adds is a floor — before this, a route that
 * forgot to call getOwnerUser() would render to anyone who asked for it, and
 * nothing in the codebase would have said so.
 *
 * Signature only. Middleware runs on the edge, where Prisma cannot follow, so
 * "is this cookie real" is the most that can be answered here; "does this user
 * still exist" stays with the pages.
 */
// `/verity` is the cross-tenant HQ. The signature floor here is not its
// authorisation — `requireHqPage` checks the operator allowlist — but an
// unauthenticated request should never reach that far.
const PROTECTED = ["/owner", "/worker", "/inspector", "/supervisor", "/verity"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("verity_session")?.value;
  if (token) {
    try {
      // Read at request time. The same fallback rule as the rest of the app: a
      // missing secret in production must fail the request rather than quietly
      // verify against a string that is public in this repository.
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET is not set");
      }
      await jwtVerify(token, new TextEncoder().encode(secret || "fallback-secret-key-for-dev"), {
        algorithms: ["HS256"],
      });
      return NextResponse.next();
    } catch {
      // Expired, tampered with, or signed by something else — treat as absent.
    }
  }

  // Back to the login screen, remembering where they were headed.
  const login = request.nextUrl.clone();
  login.pathname = "/";
  login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own assets, the service worker, icons, and the
  // two public surfaces left: a passport QR, and the API routes, which carry
  // their own maintenance-token guard.
  matcher: ["/((?!_next/|api/|sw\\.js|offline|verify|unauthorized|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)$).*)"],
};
