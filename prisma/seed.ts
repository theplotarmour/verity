/**
 * DEVELOPMENT FIXTURE — not production data.
 *
 * §31 of the experience brief permits explicit development fixtures provided
 * they are clearly labelled. Every record created here is prefixed "Demo" and
 * belongs to a tenant named "Demo Operations", so nothing in the interface can
 * be mistaken for system truth.
 *
 * Creates a real Supabase auth user by direct SQL rather than through the admin
 * API, because the service-role key was retired during secret rotation and
 * re-issuing one to seed a database would be a poor trade. The insert sets
 * email_confirmed_at so the account is immediately usable.
 *
 * Run: npm run seed
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

process.loadEnvFile(".env");

const DEMO_EMAIL = "admin@demo.verity.local";
const DEMO_PASSWORD = "verity-demo-password";

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

async function main() {
  console.log("Seeding development fixtures...\n");

  // ---- Supabase auth user -------------------------------------------------
  const existing = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM auth.users WHERE email = ${DEMO_EMAIL}`;

  let authUserId: string;
  if (existing[0]) {
    authUserId = existing[0].id;
    console.log(`  auth user exists: ${DEMO_EMAIL}`);
  } else {
    authUserId = randomUUID();
    await db.$executeRawUnsafe(
      `INSERT INTO auth.users
         (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
       VALUES
         ('00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated',
          $2, crypt($3, gen_salt('bf')), now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)`,
      authUserId, DEMO_EMAIL, DEMO_PASSWORD,
    );
    console.log(`  auth user created: ${DEMO_EMAIL}`);
  }

  // GoTrue scans several of these columns into non-nullable Go strings, so a
  // NULL makes every sign-in fail with "Database error querying schema" — a
  // message that points at the schema rather than at the row. Normalising them
  // to empty strings is what makes a hand-inserted user actually usable.
  await db.$executeRawUnsafe(
    `UPDATE auth.users SET
       confirmation_token = coalesce(confirmation_token, ''),
       recovery_token = coalesce(recovery_token, ''),
       email_change_token_new = coalesce(email_change_token_new, ''),
       email_change = coalesce(email_change, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone = coalesce(phone, ''),
       phone_change = coalesce(phone_change, ''),
       phone_change_token = coalesce(phone_change_token, ''),
       reauthentication_token = coalesce(reauthentication_token, '')
     WHERE id = $1::uuid`,
    authUserId,
  );

  // GoTrue resolves a password sign-in through auth.identities, not auth.users
  // alone. A user row with a valid password hash and no identity authenticates
  // as "credentials not accepted", which is indistinguishable from a wrong
  // password and was exactly the symptom hit here.
  const identity = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM auth.identities WHERE user_id = ${authUserId}::uuid AND provider = 'email'`;
  if (!identity[0]) {
    await db.$executeRawUnsafe(
      `INSERT INTO auth.identities
         (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1::uuid,
          jsonb_build_object('sub', $1::text, 'email', $2, 'email_verified', true, 'phone_verified', false),
          'email', $1::text, now(), now(), now())`,
      authUserId, DEMO_EMAIL,
    );
    console.log("  auth identity created (email provider)");
  }

  // ---- Tenant, organizations ---------------------------------------------
  const tenantId = randomUUID();
  await db.$executeRaw`SELECT set_config('verity.tenant_id', ${tenantId}, false)`;

  await db.tenant.create({ data: { id: tenantId, name: "Demo Operations" } });
  const hq = await db.organization.create({ data: { tenantId, name: "Demo HQ" } });
  const north = await db.organization.create({ data: { tenantId, name: "Demo North Region", parentId: hq.id } });
  const depotOrg = await db.organization.create({ data: { tenantId, name: "Demo Depot", parentId: north.id } });
  console.log("  tenant + 3 nested organizations");

  // ---- Capabilities -------------------------------------------------------
  const capabilities = [
    "verity.capability.location",
    "verity.capability.asset",
    "verity.capability.evidence",
    "verity.capability.scheduling",
    "verity.capability.approval",
  ];
  for (const capabilityId of capabilities) {
    const def = await db.capabilityDefinition.findUnique({ where: { id: capabilityId } });
    await db.tenantActivation.create({
      data: { tenantId, capabilityId, status: "Active", pinnedVersion: def?.version ?? null },
    });
  }
  console.log(`  ${capabilities.length} capabilities activated`);

  // ---- Roles and permissions ---------------------------------------------
  const admin = await db.role.create({ data: { tenantId, name: "Platform Administrator" } });
  const supervisor = await db.role.create({ data: { tenantId, name: "Supervisor" } });
  const viewer = await db.role.create({ data: { tenantId, name: "Read Only" } });

  const entityKeys = (await db.entityDefinition.findMany()).map((e) => e.key);
  const verbs = ["Read", "Create", "Edit", "Delete", "ActionExecute"] as const;

  await db.permission.createMany({
    data: entityKeys.flatMap((entity) =>
      verbs.map((verb) => ({ tenantId, roleId: admin.id, verb, entity, scope: "Tenant" as const })),
    ),
  });
  await db.permission.createMany({
    data: entityKeys.flatMap((entity) =>
      (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
        tenantId, roleId: supervisor.id, verb, entity, scope: "Organization" as const,
      })),
    ),
  });
  await db.permission.createMany({
    data: entityKeys.map((entity) => ({
      tenantId, roleId: viewer.id, verb: "Read" as const, entity, scope: "Organization" as const,
    })),
  });
  console.log("  3 roles with graded permissions");

  // ---- Identity -----------------------------------------------------------
  const provisioned = await db.$queryRaw<Array<{ user_id: string; membership_id: string }>>`
    SELECT user_id, membership_id FROM verity.provision_identity(
      ${hq.id}::uuid, ${authUserId}::uuid, 'Demo Administrator', 'Demo', 'Administrator',
      ${DEMO_EMAIL}, NULL)`;
  await db.tenantMembership.update({
    where: { id: provisioned[0]!.membership_id },
    data: { roleId: admin.id },
  });
  // A second membership so organization switching is demonstrable.
  await db.tenantMembership.create({
    data: { tenantId, organizationId: depotOrg.id, userId: provisioned[0]!.user_id, roleId: supervisor.id },
  });
  console.log("  identity provisioned with 2 memberships");

  // ---- Capability records -------------------------------------------------
  const place = await db.place.create({
    data: { tenantId, name: "Demo Yard", latitude: 55.9533, longitude: -3.1883 },
  });
  const depot = await db.location.create({
    data: { tenantId, organizationId: depotOrg.id, name: "Demo Depot Site", placeId: place.id },
  });
  await db.location.create({
    data: { tenantId, organizationId: north.id, name: "Demo Northern Yard" },
  });
  await db.geofence.create({
    data: { tenantId, locationId: depot.id, name: "Demo Perimeter",
            centreLat: 55.9533, centreLng: -3.1883, radiusMetres: 250 },
  });

  const asset = await db.asset.create({
    data: { tenantId, name: "Demo Inspection Unit", reference: "DEMO-001", locationId: depot.id },
  });
  await db.asset.create({
    data: { tenantId, name: "Demo Support Vehicle", reference: "DEMO-002", locationId: depot.id },
  });

  const resource = await db.resource.create({
    data: { tenantId, name: "Demo Inspection Unit", assetId: asset.id },
  });
  await db.booking.create({
    data: {
      tenantId, resourceId: resource.id,
      subjectEntityKey: "verity.asset.asset", subjectEntityId: asset.id,
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 86_400_000 + 7_200_000),
    },
  });

  const approval = await db.approvalRequest.create({
    data: {
      tenantId, subjectEntityKey: "verity.asset.asset", subjectEntityId: asset.id,
      requestedById: provisioned[0]!.user_id,
    },
  });
  await db.approvalStep.create({
    data: { tenantId, requestId: approval.id, sequence: 0, approverRoleId: admin.id },
  });
  console.log("  location, assets, resource, booking, pending approval\n");

  console.log("Sign in with:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
