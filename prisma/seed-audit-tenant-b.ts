/**
 * Creates the second tenant the adversarial audit needs.
 *
 * `taskplans/102_adversarial_black_box_audit_prompt.md` makes a second tenant
 * mandatory, and the reason is not convenience: half of this system's threat
 * model is cross-tenant (INV-001), and isolation cannot be tested with one
 * tenant. An audit run against a single tenant can only ever prove that a user
 * can see their own data.
 *
 * WHAT THIS BUILDS
 *   - a client tenant, deliberately NOT the platform tenant,
 *   - a root organization and one child organization, so organization-scope
 *     isolation (PLA-ORG-002 downward visibility, PLA-ORG-003 sibling
 *     isolation) has something to be tested against,
 *   - two godowns, so multi-godown stock allocation can be exercised here too,
 *   - two roles plus a membership holding NO role at all — because "a
 *     membership with no role grants nothing" is an invariant nobody can test
 *     without a subject for it,
 *   - a capability set that DIFFERS from the demo tenant's, so the audit can
 *     prove one tenant does not inherit another's navigation,
 *   - three sign-in-able logins,
 *   - real business data, written through the commands, so there are genuine
 *     ids for IDOR attempts and genuine documents for the tax checks.
 *
 * WHY RAW WRITES FOR THE BOOTSTRAP HALF
 * `executeCommand` runs inside the ACTOR's tenant scope, and the tenant policy's
 * WITH CHECK requires the row's own id to equal the current scope — so no
 * command can create the tenant it would then run in. `createClient` in
 * `src/server/platform/operator.ts` solves this the same way and documents it:
 * set the scope to the id being created. That function additionally requires a
 * live operator session, which a CLI does not have, so its shape is reproduced
 * here rather than called. Everything after the bootstrap goes through the
 * commands, exactly as `seed-plywood-demo.ts` does, so no seeded row can be
 * consistent in a way the product is not.
 *
 * IDEMPOTENT. Fixed UUIDs, every write guarded. Run it as many times as you
 * like; it will not duplicate a tenant, a membership, or a purchase order.
 *
 * Run:  npm run seed:audit-tenant   (or: npx tsx prisma/seed-audit-tenant-b.ts)
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { installCapabilities } from "../src/server/capabilities/registry";
import { withTenant } from "../src/server/platform/tenancy";
import { provisionIdentity } from "../src/server/platform/identity";
import { activateCapability } from "../src/server/platform/capability";
import { executeCommand, type ActorContext } from "../src/server/platform/command";
import {
  approveCredit,
  createBrand,
  createCustomer,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  dispatchOrder,
  receiveGoods,
  recordPartyPayment,
  registerGstRegistration,
  reserveForOrder,
  setBusinessProfile,
  setPriceSheet,
  setTaxRule,
  submitPurchaseOrder,
} from "../src/server/capabilities/plywood";

/* --------------------------------------------------------------------------
 * Fixed identifiers.
 *
 * Every id is prefixed `b0000000` so that anything found in a database, a log
 * or a bug report is instantly recognisable as an audit fixture rather than a
 * real client's data. The audit prompt can also quote them directly, which is
 * what makes a cross-tenant IDOR test reproducible by a stranger.
 * -------------------------------------------------------------------------- */

const TENANT_ID = "b0000000-0000-4000-8000-000000000001";
const ROOT_ORG_ID = "b0000000-0000-4000-8000-000000000002";
const CHILD_ORG_ID = "b0000000-0000-4000-8000-000000000003";
const OWNER_ROLE_ID = "b0000000-0000-4000-8000-000000000004";
const STAFF_ROLE_ID = "b0000000-0000-4000-8000-000000000005";
const YARD_ID = "b0000000-0000-4000-8000-000000000006";
const ANNEXE_ID = "b0000000-0000-4000-8000-000000000007";

const TENANT_NAME = "Vireshwar Timber Mart (audit tenant B)";

/**
 * The capability set, in dependency order.
 *
 * DELIBERATELY NARROWER than the demo tenant, which also runs `approval` and
 * `scheduling`. Two tenants with identical capability sets cannot demonstrate
 * that a capability's navigation, entities and queues are confined to the
 * tenants that activated it — the audit would pass whether or not the shell
 * still held a capability-to-route map.
 *
 * A database trigger enforces dependencies on write, so the order below is
 * load bearing rather than stylistic: `plywood` depends on trading, asset,
 * location and evidence (ADR-018), and `asset` and `evidence` each depend on
 * `location`.
 */
const CAPABILITIES = [
  "verity.capability.location",
  "verity.capability.asset",
  "verity.capability.evidence",
  "verity.capability.trading",
  "verity.capability.plywood",
] as const;

/**
 * What the Owner may do here.
 *
 * Every entity the activated capabilities own, at Tenant scope. Written out
 * rather than derived from a registry so that widening it looks like a
 * decision — the same reasoning `operatorRoleFor` gives for keeping the
 * operator role narrow.
 */
const OWNER_ENTITIES = [
  "verity.platform.tenant",
  "verity.platform.organization",
  "verity.platform.membership",
  "verity.platform.role",
  "verity.location.location",
  "verity.location.place",
  "verity.location.address",
  "verity.location.geofence",
  "verity.asset.asset",
  "verity.evidence.evidence",
  "verity.trading.brand",
  "verity.trading.product",
  "verity.trading.godown_rack",
  "verity.trading.stock_ledger",
  "verity.trading.stock_balance",
  "verity.trading.supplier",
  "verity.trading.supplier_price",
  "verity.trading.customer",
  "verity.trading.customer_price",
  "verity.trading.purchase_order",
  "verity.trading.purchase_order_line",
  "verity.trading.sales_order",
  "verity.trading.sales_order_line",
  "verity.trading.reservation",
  "verity.trading.business_profile",
  "verity.trading.gst_registration",
  "verity.trading.accounting_period",
  "verity.trading.invoice",
  "verity.trading.payment",
  "verity.trading.ledger_entry",
  "verity.plywood.product_detail",
];

const ALL_VERBS = ["Read", "Create", "Edit", "Delete", "ActionExecute"] as const;

/**
 * What Counter Staff may do — and, far more importantly, what they may not.
 *
 * Read the catalogue and the stock, take an order. No invoice, no payment, no
 * ledger, no tax registration, no configuration, no roles, no memberships.
 * This is the identity the audit uses to prove Layer 1 of the authorization
 * stack actually refuses, so the gaps in this list are the point of it.
 *
 * Granted at Organization scope, not Tenant, so Layer 2 has something to do:
 * this person sits in the child organization and must not reach the root's
 * records.
 */
const STAFF_GRANTS: Array<{ verb: (typeof ALL_VERBS)[number]; entity: string }> = [
  { verb: "Read", entity: "verity.trading.brand" },
  { verb: "Read", entity: "verity.trading.product" },
  { verb: "Read", entity: "verity.plywood.product_detail" },
  { verb: "Read", entity: "verity.trading.stock_balance" },
  { verb: "Read", entity: "verity.trading.customer" },
  { verb: "Read", entity: "verity.trading.sales_order" },
  { verb: "Create", entity: "verity.trading.sales_order" },
  { verb: "Read", entity: "verity.trading.sales_order_line" },
  { verb: "Create", entity: "verity.trading.sales_order_line" },
];

/** Owner, Counter Staff, and a membership deliberately left with no role. */
const PEOPLE = [
  {
    key: "owner",
    email: "owner@tenant-b.audit.local",
    displayName: "Bhavna Rathi",
    roleId: OWNER_ROLE_ID as string | null,
    organizationId: ROOT_ORG_ID,
  },
  {
    key: "staff",
    email: "staff@tenant-b.audit.local",
    displayName: "Imran Qureshi",
    roleId: STAFF_ROLE_ID as string | null,
    // The CHILD organization, not the root. An owner at the root sees the whole
    // subtree; this one must see only its own node, and that difference is what
    // Layer 2 exists to enforce.
    organizationId: CHILD_ORG_ID,
  },
  {
    key: "roleless",
    email: "roleless@tenant-b.audit.local",
    displayName: "Devika Nair",
    // No role. A membership with no role must grant nothing — `roleId` is
    // nullable precisely so an unassigned membership fails closed, and that
    // claim needs a subject to be tested against.
    roleId: null,
    organizationId: ROOT_ORG_ID,
  },
];

/**
 * The migration connection.
 *
 * Same reasoning as `bootstrap-operator.ts`: this provisions a tenant, so there
 * is no tenant scope to run it under, and the auth-schema writes cross tenancy
 * by nature. That makes it operational provisioning run by a human, never
 * request traffic — which is what CLAUDE.md's rule about the bypassing role is
 * protecting.
 */
const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

function password(): string {
  // Generated, never authored. A password written into a repository is a
  // credential the repository now owns forever.
  return `Aud!${randomBytes(9).toString("base64url")}`;
}

/**
 * Creates a Supabase auth login without the service-role key.
 *
 * The key is a deployment secret and is not in the local environment, so the
 * rows are written through the privileged connection instead — the approach
 * `create-login.ts` already documents, including the two traps it records:
 * GoTrue scans the token columns into non-nullable Go strings, and it
 * authenticates the password against `auth.identities` rather than
 * `auth.users`. Miss either and the account exists while every sign-in is
 * rejected as a wrong password.
 */
async function ensureLogin(email: string, secret: string): Promise<string> {
  const existing = await admin.$queryRaw<{ id: string }[]>`
    SELECT id FROM auth.users WHERE email = ${email}`;
  if (existing[0]) {
    await admin.$executeRaw`
      UPDATE auth.users
         SET encrypted_password = crypt(${secret}, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now()
       WHERE id = ${existing[0].id}::uuid`;
    return existing[0].id;
  }

  const rows = await admin.$queryRaw<{ id: string }[]>`
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token,
      reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated', 'authenticated', ${email},
      crypt(${secret}, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '', '', '', '', '', '', ''
    )
    RETURNING id`;
  const authUserId = rows[0]!.id;

  await admin.$executeRaw`
    INSERT INTO auth.identities (
      id, user_id, provider, provider_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), ${authUserId}::uuid, 'email', ${authUserId},
      ${JSON.stringify({ sub: authUserId, email, email_verified: true })}::jsonb,
      now(), now(), now()
    )`;

  return authUserId;
}

async function main(): Promise<void> {
  installCapabilities();

  const already = await admin.$queryRaw<{ id: string }[]>`
    SELECT id FROM tenant WHERE id = ${TENANT_ID}::uuid`;
  console.log(
    already.length > 0
      ? `tenant ${TENANT_ID} already present — topping up`
      : `creating tenant ${TENANT_ID}`,
  );

  /* ------------------------------ bootstrap ------------------------------ */

  await withTenant(TENANT_ID, async (tx) => {
    await tx.$executeRaw`
      INSERT INTO tenant (id, name, time_zone, is_platform, created_at, updated_at)
      VALUES (${TENANT_ID}::uuid, ${TENANT_NAME}, 'Asia/Kolkata', false, now(), now())
      ON CONFLICT (id) DO NOTHING`;

    await tx.$executeRaw`
      INSERT INTO organization (id, tenant_id, name, parent_id, created_at, updated_at)
      VALUES (${ROOT_ORG_ID}::uuid, ${TENANT_ID}::uuid, ${TENANT_NAME}, NULL, now(), now())
      ON CONFLICT (id) DO NOTHING`;
    await tx.$executeRaw`
      INSERT INTO organization (id, tenant_id, name, parent_id, created_at, updated_at)
      VALUES (${CHILD_ORG_ID}::uuid, ${TENANT_ID}::uuid, 'Counter — Nizamuddin',
              ${ROOT_ORG_ID}::uuid, now(), now())
      ON CONFLICT (id) DO NOTHING`;

    await tx.$executeRaw`
      INSERT INTO role (id, tenant_id, name, created_at, updated_at)
      VALUES (${OWNER_ROLE_ID}::uuid, ${TENANT_ID}::uuid, 'Owner', now(), now())
      ON CONFLICT (id) DO NOTHING`;
    await tx.$executeRaw`
      INSERT INTO role (id, tenant_id, name, created_at, updated_at)
      VALUES (${STAFF_ROLE_ID}::uuid, ${TENANT_ID}::uuid, 'Counter Staff', now(), now())
      ON CONFLICT (id) DO NOTHING`;

    // Through the Prisma client rather than raw SQL, so the two permission
    // enums are the generated types and a typo becomes a compile error instead
    // of a runtime cast failure. `skipDuplicates` leans on the
    // (roleId, verb, entity, scope) unique index, which is what makes a re-run
    // a no-op rather than a pile of duplicate grants.
    await tx.permission.createMany({
      data: OWNER_ENTITIES.flatMap((entity) =>
        ALL_VERBS.map((verb) => ({
          tenantId: TENANT_ID,
          roleId: OWNER_ROLE_ID,
          verb,
          entity,
          scope: "Tenant" as const,
        })),
      ),
      skipDuplicates: true,
    });

    await tx.permission.createMany({
      data: STAFF_GRANTS.map((grant) => ({
        tenantId: TENANT_ID,
        roleId: STAFF_ROLE_ID,
        verb: grant.verb,
        entity: grant.entity,
        scope: "Organization" as const,
      })),
      skipDuplicates: true,
    });

    for (const capabilityId of CAPABILITIES) {
      const live = await tx.tenantActivation.findFirst({
        where: { capabilityId, status: "Active" },
      });
      if (!live) await activateCapability(tx, TENANT_ID, capabilityId);
    }

    await tx.$executeRaw`
      INSERT INTO location (id, tenant_id, organization_id, name, active, created_at, updated_at)
      VALUES (${YARD_ID}::uuid, ${TENANT_ID}::uuid, ${ROOT_ORG_ID}::uuid,
              'Vireshwar Main Yard', true, now(), now())
      ON CONFLICT (id) DO NOTHING`;
    await tx.$executeRaw`
      INSERT INTO location (id, tenant_id, organization_id, name, active, created_at, updated_at)
      VALUES (${ANNEXE_ID}::uuid, ${TENANT_ID}::uuid, ${CHILD_ORG_ID}::uuid,
              'Nizamuddin Annexe', true, now(), now())
      ON CONFLICT (id) DO NOTHING`;
  });

  /* ------------------------------ identities ----------------------------- */

  const credentials: Array<{ role: string; email: string; secret: string }> = [];
  const actors: Record<string, ActorContext> = {};

  for (const person of PEOPLE) {
    const secret = password();
    const authUserId = await ensureLogin(person.email, secret);
    credentials.push({ role: person.key, email: person.email, secret });

    const membership = await withTenant(TENANT_ID, async (tx) => {
      const user = await tx.user.findFirst({ where: { authUserId } });
      if (user) {
        const existing = await tx.tenantMembership.findFirst({
          where: { userId: user.id },
        });
        if (existing) {
          // Re-run: keep the role and organization honest without creating a
          // second membership. An identity accumulating one membership per
          // visit is the bug `enterClient` explicitly avoids.
          await tx.tenantMembership.update({
            where: { id: existing.id },
            data: { roleId: person.roleId, organizationId: person.organizationId },
          });
          return { userId: user.id, membershipId: existing.id };
        }
      }

      const provisioned = await provisionIdentity(tx, {
        organizationId: person.organizationId,
        authUserId,
        displayName: person.displayName,
        email: person.email,
      });
      await tx.tenantMembership.update({
        where: { id: provisioned.membershipId },
        data: { roleId: person.roleId },
      });
      return { userId: provisioned.userId, membershipId: provisioned.membershipId };
    });

    actors[person.key] = {
      tenantId: TENANT_ID,
      userId: membership.userId,
      membershipId: membership.membershipId,
      organizationId: person.organizationId,
      roleId: person.roleId ?? undefined,
    } as ActorContext;

    console.log(`  ${person.key.padEnd(8)} ${person.email}`);
  }

  const owner = actors.owner!;

  /* --------------------------- business data ----------------------------- */
  // From here on, everything goes through the commands. A tenant seeded by raw
  // insert can hold a state no command could produce, and then the audit is
  // testing a database rather than the product.

  const has = async (table: string, extra = ""): Promise<boolean> => {
    const rows = await admin.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::bigint AS n FROM "${table}" WHERE tenant_id = $1::uuid ${extra}`,
      TENANT_ID,
    );
    return (rows[0]?.n ?? 0n) > 0n;
  };

  /**
   * Find by name, or make it.
   *
   * Every step below is guarded on its own row rather than on one coarse
   * "has any brand?" flag. The first version of this script used the coarse
   * form and a failure halfway through left it permanently half-built: the
   * guard was satisfied, so a re-run skipped the whole block including the
   * parts that had never happened. Resumability is the property that makes a
   * seed safe to run unattended.
   */
  const findOrMake = async (
    table: string,
    column: string,
    value: string,
    make: () => Promise<{ id: string }>,
  ): Promise<string> => {
    const rows = await admin.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${table}" WHERE tenant_id = $1::uuid AND "${column}" = $2 LIMIT 1`,
      TENANT_ID,
      value,
    );
    if (rows[0]) return rows[0].id;
    return (await make()).id;
  };

  if (!(await has("trading_business_profile"))) {
    await executeCommand(owner, setBusinessProfile, {
      legalName: "Vireshwar Timber Mart",
      tradeName: "Vireshwar Timber",
      pan: "AAECV1234K",
      addressLine1: "14, Timber Market",
      addressLine2: "Nizamuddin East",
      city: "New Delhi",
      stateCode: "07",
      postalCode: "110013",
    });
  }

  if (!(await has("trading_gst_registration"))) {
    // The state code is not passed: the command derives it from the first two
    // characters of the GSTIN, deliberately, so the two cannot disagree.
    await executeCommand(owner, registerGstRegistration, {
      gstin: "07AAECV1234K1Z9",
      registrationType: "regular",
      invoiceSeriesPrefix: "VTM",
    });
  }

  if (!(await has("trading_tax_rule"))) {
    await executeCommand(owner, setTaxRule, {
      hsnCode: "4412",
      rateBp: 1800,
      // An ISO string, not a Date: the command takes a datetime string and
      // parses it itself, so a Date object is rejected at the schema.
      effectiveFrom: "2026-04-01T00:00:00.000Z",
    });
  }

  const brandId = await findOrMake("trading_brand", "name", "Vireshwar House Brand", () =>
    executeCommand(owner, createBrand, { name: "Vireshwar House Brand" }),
  );

  const sheetId = await findOrMake("trading_product", "name", "Gurjan BWP Ply", () =>
    executeCommand(owner, createProduct, {
      brandId,
      name: "Gurjan BWP Ply",
      hsnCode: "44121000",
      category: "PLYWOOD",
      thicknessTenthMm: 180,
      grade: "BWP",
      reorderLevelUnits: 20,
      unitLabel: "sheets",
    }),
  );

  // A laminate design with a shade x texture matrix, so the newest and least
  // exercised path in the catalogue exists in this tenant too — and so the
  // audit has a TEMPLATE product to try to order and to move stock against,
  // both of which must be refused.
  await findOrMake("trading_product", "name", "Vireshwar Signature Laminate", () =>
    executeCommand(owner, createProduct, {
      brandId,
      name: "Vireshwar Signature Laminate",
      hsnCode: "48239019",
      category: "LAMINATE",
      newShades: ["1104 Walnut", "2207 Teak", "3310 Ash"],
      newTextures: ["Suede", "Gloss"],
      unitLabel: "sheets",
    }),
  );

  const supplierId = await findOrMake(
    "trading_supplier",
    "display_name",
    "Kandla Timber Imports",
    () =>
      executeCommand(owner, createSupplier, {
        displayName: "Kandla Timber Imports",
        // Gujarat, not Delhi — so an inter-state purchase exists here and the
        // IGST path has a document of its own to be checked against.
        gstin: "24AAACK5678M1Z4",
        stateCode: "24",
        phone: "9820011223",
      }),
  );

  const customerId = await findOrMake(
    "trading_customer",
    "display_name",
    "Sandeep Interiors",
    () =>
      executeCommand(owner, createCustomer, {
        displayName: "Sandeep Interiors",
        stateCode: "07",
        phone: "9811044556",
        creditLimitPaise: 5_000_000,
      }),
  );

  if (!(await has("trading_customer_price"))) {
    await executeCommand(owner, setPriceSheet, {
      side: "customer",
      partyId: customerId,
      prices: [{ productId: sheetId, pricePaise: 245_000 }],
    });
  }

  // A purchase, received, so there is real stock at a real weighted cost.
  if (!(await has("trading_purchase_order"))) {
    const po = await executeCommand(owner, createPurchaseOrder, {
      supplierId,
      locationId: YARD_ID,
      gstApplicable: true,
      lines: [{ productId: sheetId, qtyOrdered: 120, unitCostPaise: 196_000 }],
    });
    await executeCommand(owner, submitPurchaseOrder, { orderId: po.id });
    await executeCommand(owner, receiveGoods, {
      orderId: po.id,
      supplierChallanNumber: "KTI/2026/0417",
      lines: [{ productId: sheetId, qtyReceived: 120 }],
    });
  }

  // A sale, taken all the way to a gate pass and an invoice, so the tax and
  // ledger surfaces have documents of their own to reconcile.
  // Driven by the order's own state rather than by "does an order exist?".
  // A run that failed between reserving and dispatching leaves an order that
  // exists but never shipped, and an existence guard would skip it forever.
  {
    const [existing] = await admin.$queryRawUnsafe<{ id: string; state: string }[]>(
      `SELECT id, state FROM trading_sales_order WHERE tenant_id = $1::uuid LIMIT 1`,
      TENANT_ID,
    );
    const orderId =
      existing?.id ??
      (
        await executeCommand(owner, createSalesOrder, {
          customerId,
          locationId: YARD_ID,
          lines: [{ productId: sheetId, qtyOrdered: 40, unitPricePaise: 245_000 }],
        })
      ).id;

    const stateOf = async (): Promise<string> => {
      const [row] = await admin.$queryRawUnsafe<{ state: string }[]>(
        `SELECT state FROM trading_sales_order WHERE id = $1::uuid`,
        orderId,
      );
      return row?.state ?? "";
    };

    // An order within the customer's agreed credit limit is approved on
    // creation; only one that breaches it stops at `pending_credit`. Calling
    // `approveCredit` unconditionally asks the state machine for an
    // approved -> approved transition, which does not exist and should not.
    if ((await stateOf()) === "pending_credit") {
      await executeCommand(owner, approveCredit, {
        orderId,
        reason: "Audit fixture: released against the agreed credit limit.",
      });
    }
    if ((await stateOf()) === "approved") {
      await executeCommand(owner, reserveForOrder, { orderId });
    }
    if ((await stateOf()) === "dispatching") {
      await executeCommand(owner, dispatchOrder, {
        orderId,
        collectedBy: "Sandeep Interiors driver",
      });
    }
  }

  if (!(await has("trading_payment"))) {
    await executeCommand(owner, recordPartyPayment, {
      party: { customerId },
      direction: "in",
      amountPaise: 5_000_000,
      method: "bank",
      reference: "NEFT/AUDIT/0001",
    });
  }

  /* ------------------------------- report -------------------------------- */

  const roleNameOf = (roleId: string | null): string =>
    roleId === OWNER_ROLE_ID
      ? "Owner"
      : roleId === STAFF_ROLE_ID
        ? "Counter Staff"
        : "**none — must grant nothing**";

  const report = [
    "# Audit tenant B — credentials",
    "",
    "Generated by `npm run seed:audit-tenant`. **Not committed** — see .gitignore.",
    "Re-running the script is safe and resets these passwords to new values.",
    "",
    `- Tenant id: \`${TENANT_ID}\``,
    `- Tenant name: ${TENANT_NAME}`,
    `- Root organization: \`${ROOT_ORG_ID}\``,
    `- Child organization: \`${CHILD_ORG_ID}\``,
    `- Godowns: \`${YARD_ID}\` (main, root org), \`${ANNEXE_ID}\` (annexe, child org)`,
    "",
    "| Who | Email | Password | Role | Organization |",
    "|---|---|---|---|---|",
    ...credentials.map((row) => {
      const person = PEOPLE.find((candidate) => candidate.key === row.role)!;
      const org = person.organizationId === ROOT_ORG_ID ? "root" : "child";
      return `| ${row.role} | ${row.email} | \`${row.secret}\` | ${roleNameOf(person.roleId)} | ${org} |`;
    }),
    "",
    `Capabilities active here: ${CAPABILITIES.join(", ")}`,
    "",
    "Deliberately NOT active — the demo tenant has these and this one does not,",
    "and that difference is what proves capability confinement:",
    "`verity.capability.approval`, `verity.capability.scheduling`.",
    "",
  ];
  writeFileSync(".audit-tenant-b.local.md", report.join("\n"));

  console.log("");
  console.log(`tenant   ${TENANT_ID}  ${TENANT_NAME}`);
  console.log(`orgs     root ${ROOT_ORG_ID}   child ${CHILD_ORG_ID}`);
  console.log(`godowns  ${YARD_ID}  ${ANNEXE_ID}`);
  console.log("");
  for (const row of credentials) {
    console.log(`  ${row.role.padEnd(8)} ${row.email.padEnd(34)} ${row.secret}`);
  }
  console.log("");
  console.log("credentials also written to .audit-tenant-b.local.md (gitignored)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => admin.$disconnect());
