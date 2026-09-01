/**
 * Creates a Supabase auth user and links it to a platform identity.
 *
 * Normally this is the auth admin API's job, but SUPABASE_SERVICE_ROLE_KEY is
 * a deployment secret and is not in the local environment, so the row is
 * written through the privileged migration connection instead. The password is
 * hashed with bcrypt by the database — never stored or transmitted in the
 * clear, and never written to this repository.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { withTenant } from "../src/server/platform/tenancy";
import { provisionIdentity } from "../src/server/platform/identity";

const TENANT_ID = "96793a76-ddbf-458f-8610-7606c56ad575";
const ORG_ID = "036e03cd-126b-4972-a14d-9a275f20680c";
const OWNER_ROLE = "9108d7b2-4b64-4e41-82a6-53cd8190a19b";

const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4] ?? "Naksh";
if (!email || !password) {
  throw new Error("usage: create-login.ts <email> <password> [displayName]");
}

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

async function main() {
  const existing = await admin.$queryRaw<{ id: string }[]>`
    SELECT id FROM auth.users WHERE email = ${email}`;
  if (existing.length > 0) {
    // Reset rather than duplicate: two auth rows for one address is a login
    // that sometimes works.
    await admin.$executeRaw`
      UPDATE auth.users
         SET encrypted_password = crypt(${password}, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now()
       WHERE email = ${email}`;
    console.log(`Password reset for existing auth user ${email}`);
    return;
  }

  const authUserId = randomUUID();
  await admin.$executeRaw`
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      ${authUserId}::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated', 'authenticated', ${email},
      crypt(${password}, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    )`;

  // GoTrue scans these into non-nullable Go strings. Left NULL, every sign-in
  // fails with a 500 "Database error querying schema" — which the application
  // surfaces as "those credentials were not accepted", so the account looks
  // like it has the wrong password rather than a malformed row. Supabase's own
  // admin API writes empty strings here; so does this.
  await admin.$executeRaw`
    UPDATE auth.users
       SET confirmation_token = '', recovery_token = '',
           email_change_token_new = '', email_change = '',
           email_change_token_current = '', phone_change = '',
           phone_change_token = '', reauthentication_token = ''
     WHERE id = ${authUserId}::uuid`;

  // GoTrue authenticates a password against auth.identities, not against
  // auth.users alone: without an 'email' provider row the account exists and
  // every sign-in is rejected as bad credentials, which is indistinguishable
  // from a wrong password.
  await admin.$executeRaw`
    INSERT INTO auth.identities (
      id, user_id, provider, provider_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), ${authUserId}::uuid, 'email', ${authUserId},
      jsonb_build_object(
        'sub', ${authUserId},
        'email', ${email},
        'email_verified', true,
        'phone_verified', false
      ),
      now(), now(), now()
    )`;

  const identity = await withTenant(TENANT_ID, (tx) =>
    provisionIdentity(tx, {
      organizationId: ORG_ID,
      authUserId,
      displayName,
    }),
  );
  await admin.tenantMembership.update({
    where: { id: identity.membershipId },
    data: { roleId: OWNER_ROLE },
  });

  console.log(`Created ${email} as ${displayName}, Owner of Shri Ganesh.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => admin.$disconnect());
