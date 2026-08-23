import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh at the Next.js request boundary.
 *
 * Authority: implementation/03-platform-foundation/identity.md contract step 2,
 * which names "the Next.js middleware boundary". Next 16 renamed that convention
 * from `middleware` to `proxy` (node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md); this is the same boundary under its current name,
 * not a departure from the handoff.
 *
 * This refreshes the Supabase session cookie so Server Components — which cannot
 * write cookies — always observe a valid session. It deliberately performs no
 * authorization: the proxy runs before the platform can resolve a membership,
 * and duplicating permission logic here would create the second permission
 * system the brief forbids. Route protection is the page's own job, through
 * requireActor().
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    // Touching getUser() is what triggers the refresh.
    await supabase.auth.getUser();
  } catch (error) {
    /**
     * This function's contract with Next.js is that it resolves to a Response.
     * Everything above reaches an external service on every single request, so
     * it fails for ordinary reasons — a Supabase outage, DNS, a timeout, a
     * revoked refresh token, a missing environment variable at boot. Letting any
     * of those reject leaves Next with a rejected promise where a Response
     * belongs, which surfaces as
     *
     *     Uncaught (in promise) TypeError: Failed to convert value to 'Response'
     *
     * and takes down EVERY route at once, including /sign-in — the one page that
     * could have recovered the session.
     *
     * Degrading here is safe precisely because this boundary performs no
     * authorization: a request that fails to refresh simply carries no refreshed
     * session, and the page's own requireActor() redirects to sign-in. The
     * failure is logged rather than swallowed, because an operator has to be
     * able to tell a provider outage from users being randomly signed out.
     */
    console.error("[verity] session refresh failed; continuing without it", error);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
