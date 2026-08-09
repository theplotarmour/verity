/**
 * The secret that signs session tokens.
 *
 * Falling back to a constant is harmless on a developer's machine and
 * catastrophic in production: the fallback string is committed to this
 * repository, so anyone reading it could mint a session cookie for any user in
 * any factory — owner included — without ever seeing a PIN.
 *
 * Read per call rather than at module load. A throw at import time would fail
 * `next build`, which runs with NODE_ENV=production and has no reason to hold
 * runtime secrets; a throw at request time fails the thing that actually needs
 * the secret, loudly, on the first request.
 */
export function signingSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign sessions with the development fallback, " +
        "which is public in the repository and would let anyone forge an owner session."
    );
  }

  return "fallback-secret-key-for-dev";
}
