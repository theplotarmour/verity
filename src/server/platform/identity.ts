import type { TenantScopedClient } from "./tenancy";

/**
 * Identity provisioning.
 *
 * Authority: Bible V2 Primitive 2 §2 (Party is global, "mapped to Organizations
 * via TenantMembership records") and §6 (actors are Tenant Administrators and
 * Platform Support); GOV-TER-006 and INV-003 (one Party per person, User 1:1
 * with Party); Spec PLA-IDE-001→002.
 *
 * Party and User are global tables with no tenant column, so a tenant reaches an
 * identity only through a TenantMembership it owns. That makes an identity with
 * no membership unreachable — including by whoever just created it — so the
 * three rows must be written together. Direct INSERT into `party` / `user` is
 * denied by RLS; this is the only supported path.
 */

export type ProvisionIdentityInput = {
  /** Must belong to the tenant of the surrounding `withTenant` scope. */
  organizationId: string;
  /** The Supabase Auth user id. Credentials live there, never here. */
  authUserId: string;
  displayName: string;
  givenName?: string | null;
  familyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ProvisionedIdentity = {
  partyId: string;
  userId: string;
  membershipId: string;
};

/**
 * Creates a Party, its User, and its first TenantMembership atomically.
 *
 * Must be called inside `withTenant`. The database re-checks the tenant context
 * and the organization's ownership itself, so a wrong or missing scope fails
 * there rather than relying on this caller.
 *
 * Note: this does not de-duplicate. Reachability means a tenant cannot see that
 * a Party already exists for the same human, so calling it twice for one person
 * across two tenants produces two Party rows and breaks INV-003. The matching
 * rule is an open platform decision — do not paper over it here.
 */
export async function provisionIdentity(
  tx: TenantScopedClient,
  input: ProvisionIdentityInput,
): Promise<ProvisionedIdentity> {
  const rows = await tx.$queryRaw<
    { party_id: string; user_id: string; membership_id: string }[]
  >`SELECT * FROM verity.provision_identity(
      ${input.organizationId}::uuid,
      ${input.authUserId}::uuid,
      ${input.displayName},
      ${input.givenName ?? null},
      ${input.familyName ?? null},
      ${input.email ?? null},
      ${input.phone ?? null}
    )`;

  const row = rows[0];
  if (!row) throw new Error("provisionIdentity: no row returned");

  return { partyId: row.party_id, userId: row.user_id, membershipId: row.membership_id };
}
