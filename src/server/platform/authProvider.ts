/**
 * The provider-neutral authentication contract.
 *
 * Authority: taskplans/28_auth_provider_abstraction.md, Bible V5 §1.A.4
 * (single global authentication realm), PLA-IDE-003.
 *
 * `Principal` is deliberately the only thing an `AuthProvider` returns: the
 * identifier the provider assigns its authenticated subject, and — for
 * display only, never for identity matching (Bible V2 Primitive 2 §2 does
 * not treat email as the identity key; ADR-007 uniqueness is enforced over
 * verified contacts, not this field) — the email it reports, if any.
 * `resolveActor()` in `auth.ts` and everything downstream (`operator.ts`,
 * the shell/HQ layouts) touch only these two fields; nothing here carries a
 * provider's session shape, JWT claims, or client type. That is what makes
 * it possible to write a second `AuthProvider` (an OIDC one, say) without
 * touching `ActorContext`, `resolveActor()`, authorization, or any capability.
 *
 * No registry: today there is exactly one provider, chosen at compile time
 * (`SupabaseAuthProvider` in `auth.ts`), not switched at runtime — unlike
 * storage, where "no backend configured" is a real, valid deployment state.
 * Authentication is not optional the same way, so a pluggable registry with
 * a possibly-null active provider would model a state that cannot occur.
 * Swapping providers is a code change (implement `AuthProvider`, change the
 * one call site that constructs the active one), not a configuration one —
 * which is exactly the architectural compatibility this task asks for, not
 * immediate runtime provider selection.
 */

export type Principal = {
  /** The provider's identifier for this subject. Stored as `User.authUserId`. */
  id: string;
  /** Reported by the provider, if any. Display only — never an identity key. */
  email: string | null;
};

export interface AuthProvider {
  readonly name: string;
  /** The authenticated subject for the current request, or null. */
  getPrincipal(): Promise<Principal | null>;
}
