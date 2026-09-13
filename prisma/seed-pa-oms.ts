/**
 * Bootstraps PlotArmour Studio as a NEW Verity tenant (taskplan 105's
 * resolved tenant-boundary decision) and seeds the real 19-person org
 * roster given by the product owner 2026-09-12: Tenant, one root
 * Organization (no sub-units — teams are capability-private
 * `OutreachTeam` rows, not `Organization` nodes, per the taskplan), a real
 * Supabase Auth login for every person, three Roles (Founders / Senior /
 * Junior) with Tenant-scope permissions over the `outreach` capability's
 * entities, two `OutreachTeam`s with their Juniors, and the `outreach`
 * capability activated.
 *
 * Company Core (Divo, Naksh, Ayush, Shubhankar) now have real
 * `@plotarmour.in` emails, given 2026-09-12. The two Seniors (Kulsoom,
 * Radhika) still had none given — they get synthesized internal logins
 * (`<name>@plotarmour.verity.app`), the same shape `seed-colonel-kebabz.ts`
 * uses for its owner login. The 13 Juniors keep their real given
 * emails/phones exactly as provided; phone formats are stored as-is
 * (leading `0`, `+62` country code, no country code) per taskplan 105's
 * explicit "don't silently normalize" note.
 *
 * `email_confirm: true` with no SMTP send means nothing is emailed to
 * anyone — this only creates a Supabase Auth row under each real address.
 * Each login's password is printed to this console ONCE, at creation time,
 * and nowhere else — there is no way to retrieve it after this run exits.
 *
 * Modelled directly on `seed-colonel-kebabz.ts` — same `withTenant` raw-row
 * bootstrap, same `executeCommand`-through-commands discipline for
 * everything the capability itself owns.
 *
 * Idempotency: NONE. Run once. A second run creates a second tenant and
 * 19 duplicate Supabase Auth accounts.
 *
 * Run: npx tsx prisma/seed-pa-oms.ts
 */

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { installCapabilities } from "../src/server/capabilities/registry";
import { provisionIdentity } from "../src/server/platform/identity";
import { activateCapability } from "../src/server/platform/capability";
import { executeCommand, type ActorContext } from "../src/server/platform/command";
import {
  createOutreachTeam,
  addTeamMember,
  OUTREACH_CAPABILITY,
  ENTITY_TEAM,
  ENTITY_TEAM_MEMBERSHIP,
  ENTITY_LEAD,
  ENTITY_ACTIVITY,
  ENTITY_TARGET,
  ENTITY_CHECK_IN,
  ENTITY_WEEKLY_REPORT,
  ENTITY_TEAM_WEEKLY_ASSESSMENT,
  ENTITY_DIRECTION,
} from "../src/server/capabilities/outreach";

const TENANT_NAME = "PlotArmour Studio";

function suggestPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  let out = "";
  for (let i = 0; i < 14; i += 1) {
    out += alphabet[parseInt(bytes.slice(i * 2, i * 2 + 2), 16) % alphabet.length];
  }
  return out;
}

type Person = {
  displayName: string;
  email: string;
  phone?: string;
  location?: string;
};

const COMPANY_CORE: Person[] = [
  { displayName: "Divo", email: "divyom.sharma@plotarmour.in" },
  { displayName: "Naksh", email: "nakshshatra.aggarwal@plotarmour.in" },
  { displayName: "Ayush", email: "ayushmaan.gaur@plotarmour.in" },
  { displayName: "Shubhankar", email: "shubhankar.rakshit@plotarmour.in" },
];

const TEAM_1_LEADER: Person = { displayName: "Kulsoom", email: "kulsoom@plotarmour.verity.app" };
const TEAM_1_JUNIORS: Person[] = [
  { displayName: "Shreya Bansal", email: "shreyabansal2806@gmail.com", phone: "8383014672", location: "Dehradun, Uttarakhand, India" },
  { displayName: "Prakhar Maheshwari", email: "prakharm385@gmail.com", phone: "9981146588" },
  { displayName: "Hikari Permana Putri", email: "hikaripermana@gmail.com", phone: "+6282318443511", location: "Kota Bandung, Jawa Barat, Indonesia" },
  { displayName: "Mehak Bhatia", email: "bhatiamehak091007@gmail.com", phone: "8080440426", location: "India" },
  { displayName: "Abhishek Singh Chauhan", email: "chauhanabhishek5881@gmail.com", phone: "09336156736", location: "Lucknow, Uttar Pradesh, India" },
  { displayName: "Nishika", email: "nishikaaggarwal84@gmail.com", phone: "8595893323", location: "Delhi, Delhi, India" },
  { displayName: "Khushboo", email: "khushbooyadav6675@gmail.com", phone: "8750074191", location: "Faridabad, Haryana, India" },
];

const TEAM_2_LEADER: Person = { displayName: "Radhika", email: "radhika@plotarmour.verity.app" };
const TEAM_2_JUNIORS: Person[] = [
  { displayName: "Ananya Sree Pentakota", email: "ananyasree1677@gmail.com", phone: "9490185801" },
  { displayName: "Gaurav Thakur", email: "gaurax.3@gmail.com", phone: "8219636135" },
  { displayName: "Neeraj Kumar", email: "neeraj18official@gmail.com", phone: "9315281029" },
  { displayName: "Alvina Sheikh", email: "alvinasheikh.as@gmail.com", phone: "8447155785" },
  { displayName: "Jyoti Tiwari", email: "jt933558@gmail.com", phone: "7835879829" },
  { displayName: "Ananya Tripathi", email: "tripathiananya964@gmail.com", phone: "7897477936" },
];

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

async function withTenant<T>(tenantId: string, fn: (tx: typeof admin) => Promise<T>): Promise<T> {
  return admin.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('verity.tenant_id', ${tenantId}, true)`;
    return fn(tx as typeof admin);
  });
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required to create real logins.");
  }

  installCapabilities();

  const tenantId = randomUUID();
  const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const createdAuthUserIds: string[] = [];

  async function createLogin(person: Person): Promise<string> {
    const password = suggestPassword();
    const created = await supabaseAdmin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: person.displayName },
    });
    if (created.error || !created.data.user) {
      throw new Error(`could not create login for ${person.displayName}: ${created.error?.message}`);
    }
    createdAuthUserIds.push(created.data.user.id);
    console.log(`  ${person.displayName.padEnd(24)} ${person.email.padEnd(34)} ${password}`);
    return created.data.user.id;
  }

  try {
    console.log("Creating logins (password printed once, right here, for each person):\n");

    // All 19 Supabase Auth calls happen BEFORE the DB transaction opens —
    // network round-trips inside an interactive transaction blew its 5s
    // default timeout on the first attempt (rolled back clean, verified).
    // colonel-kebazb's seed only ever had one such call before its
    // transaction; this mirrors that shape at 19x the count instead of
    // nesting the calls inside it.
    console.log("Company Core:");
    const authUserIds = new Map<string, string>(); // email -> authUserId
    for (const p of COMPANY_CORE) authUserIds.set(p.email, await createLogin(p));
    console.log("Team 1:");
    authUserIds.set(TEAM_1_LEADER.email, await createLogin(TEAM_1_LEADER));
    for (const p of TEAM_1_JUNIORS) authUserIds.set(p.email, await createLogin(p));
    console.log("Team 2:");
    authUserIds.set(TEAM_2_LEADER.email, await createLogin(TEAM_2_LEADER));
    for (const p of TEAM_2_JUNIORS) authUserIds.set(p.email, await createLogin(p));

    const { rootOrgId, founderRoleId, byPartyId, byEmail } = await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: TENANT_NAME, timeZone: "Asia/Kolkata" } });
      const rootOrg = await tx.organization.create({ data: { tenantId, name: TENANT_NAME, parentId: null } });

      const founderRole = await tx.role.create({ data: { tenantId, name: "Founders' Office" } });
      const seniorRole = await tx.role.create({ data: { tenantId, name: "Senior Outreach Officer" } });
      const juniorRole = await tx.role.create({ data: { tenantId, name: "Junior Outreach Officer" } });

      const outreachEntities = [
        ENTITY_TEAM,
        ENTITY_TEAM_MEMBERSHIP,
        ENTITY_LEAD,
        ENTITY_ACTIVITY,
        ENTITY_TARGET,
        ENTITY_CHECK_IN,
        ENTITY_WEEKLY_REPORT,
        ENTITY_TEAM_WEEKLY_ASSESSMENT,
      ];
      // Founders' Office: full company-wide visibility (master-context §7-10).
      await tx.permission.createMany({
        data: outreachEntities.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: founderRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });
      // Senior: same entity access at Tenant scope for this MVP — real
      // per-team row narrowing happens in query params today, not an
      // Organization-scope grant (teams are capability-private, per the
      // taskplan's resolved decision). Known P0 limitation.
      await tx.permission.createMany({
        data: outreachEntities.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: seniorRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });
      // Junior: can create/read/act on their own work; cannot edit team or
      // membership rows (master-context §16/§68 — Juniors don't reassign
      // ownership or set targets).
      await tx.permission.createMany({
        data: [
          ...[ENTITY_LEAD, ENTITY_ACTIVITY, ENTITY_CHECK_IN, ENTITY_WEEKLY_REPORT].flatMap((entity) =>
            (["Read", "Create", "ActionExecute"] as const).map((verb) => ({
              tenantId,
              roleId: juniorRole.id,
              verb,
              entity,
              scope: "Tenant" as const,
            })),
          ),
          { tenantId, roleId: juniorRole.id, verb: "Read" as const, entity: ENTITY_TEAM, scope: "Tenant" as const },
          { tenantId, roleId: juniorRole.id, verb: "Read" as const, entity: ENTITY_TARGET, scope: "Tenant" as const },
          { tenantId, roleId: juniorRole.id, verb: "Read" as const, entity: ENTITY_DIRECTION, scope: "Tenant" as const },
        ],
      });

      // Company Direction (master-context §10-11): only Founders post it —
      // a separate, narrower grant from the shared `outreachEntities` loop
      // above, which both Founders and Seniors get in full. Senior gets
      // read-only here too (added just above for Junior).
      await tx.permission.createMany({
        data: [
          ...(["Read", "Create", "Edit"] as const).map((verb) => ({
            tenantId,
            roleId: founderRole.id,
            verb,
            entity: ENTITY_DIRECTION,
            scope: "Tenant" as const,
          })),
          { tenantId, roleId: seniorRole.id, verb: "Read" as const, entity: ENTITY_DIRECTION, scope: "Tenant" as const },
        ],
      });

      const byPartyId = new Map<string, { userId: string; membershipId: string }>();
      const byEmail = new Map<string, string>(); // email -> partyId

      async function provision(person: Person, roleId: string) {
        const authUserId = authUserIds.get(person.email)!;
        const identity = await provisionIdentity(tx, {
          organizationId: rootOrg.id,
          authUserId,
          displayName: person.displayName,
          email: person.email,
          phone: person.phone ?? null,
        });
        await tx.tenantMembership.update({ where: { id: identity.membershipId }, data: { roleId } });
        byPartyId.set(person.email, { userId: identity.userId, membershipId: identity.membershipId });
        byEmail.set(person.email, identity.partyId);
      }

      for (const p of COMPANY_CORE) await provision(p, founderRole.id);
      await provision(TEAM_1_LEADER, seniorRole.id);
      for (const p of TEAM_1_JUNIORS) await provision(p, juniorRole.id);
      await provision(TEAM_2_LEADER, seniorRole.id);
      for (const p of TEAM_2_JUNIORS) await provision(p, juniorRole.id);

      await activateCapability(tx, tenantId, OUTREACH_CAPABILITY);

      return { rootOrgId: rootOrg.id, founderRoleId: founderRole.id, byPartyId, byEmail };
    });

    // The first Founder acts as the seeding actor for the outreach commands
    // below — a one-time bootstrap action, not a live product action.
    const founder = COMPANY_CORE[0];
    const founderIdentity = byPartyId.get(founder.email)!;
    const actor: ActorContext = {
      tenantId,
      userId: founderIdentity.userId,
      membershipId: founderIdentity.membershipId,
      organizationId: rootOrgId,
      roleId: founderRoleId,
    };

    const team1 = await executeCommand(actor, createOutreachTeam, {
      name: "Team 1",
      leaderId: byEmail.get(TEAM_1_LEADER.email)!,
    });
    for (const j of TEAM_1_JUNIORS) {
      await executeCommand(actor, addTeamMember, { teamId: team1.id, partyId: byEmail.get(j.email)! });
    }

    const team2 = await executeCommand(actor, createOutreachTeam, {
      name: "Team 2",
      leaderId: byEmail.get(TEAM_2_LEADER.email)!,
    });
    for (const j of TEAM_2_JUNIORS) {
      await executeCommand(actor, addTeamMember, { teamId: team2.id, partyId: byEmail.get(j.email)! });
    }

    console.log("\nPlotArmour Studio is live.\n");
    console.log(`Tenant:        ${tenantId}`);
    console.log(`Organization:  ${rootOrgId}`);
    console.log(`Team 1:        ${team1.id} (Kulsoom + ${TEAM_1_JUNIORS.length} Juniors)`);
    console.log(`Team 2:        ${team2.id} (Radhika + ${TEAM_2_JUNIORS.length} Juniors)`);
    console.log(`\nEvery password above was printed exactly once. Nothing was emailed to anyone.`);
  } catch (error) {
    for (const id of createdAuthUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {});
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.$disconnect();
  });
