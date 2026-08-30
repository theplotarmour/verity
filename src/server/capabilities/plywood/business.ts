import { z } from "zod";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import { ENTITY_BUSINESS_PROFILE, ENTITY_GST_REGISTRATION } from "./keys";

/**
 * The business's own legal identity, and its GST registration.
 *
 * Authority: taskplans/45_plywood_workflow_program.md §D-03 and §4.4;
 * PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-09.
 *
 * WHAT THIS REPLACES
 * A raw configuration key holding a two-character state code, and the live
 * tenant name read off the invoice page. Neither is master data: one is an
 * untyped string an administrator could set to anything, and the other changes
 * an invoice that was raised, given to a customer and reported to the portal.
 *
 * The specification's §5 is explicit that the accountant must never enter the
 * business's own GSTIN on an individual invoice. That is only possible if the
 * business has one, recorded once, in a place invoices can read.
 *
 * WHY REGISTRATION-KEYED WHEN THERE IS ONLY ONE
 * §D-03 decided a single registration. Everything downstream — tax rules,
 * invoice series, returns — is nevertheless keyed by registration id rather
 * than by tenant, so a Delhi business that later registers in Uttar Pradesh
 * adds a row instead of a migration. The single-registration rule is enforced
 * by a partial unique index, which is one line to relax when that decision
 * changes.
 */

/** The identity an invoice snapshots at the moment it is raised. */
export type SellerIdentity = {
  legalName: string | null;
  gstin: string | null;
  stateCode: string | null;
  invoiceSeriesPrefix: string | null;
};

/**
 * The seller identity for this tenant, or nulls where it has not been set up.
 *
 * Returns nulls rather than throwing: a tenant part-way through onboarding is a
 * real state, and the refusal belongs at the point a tax document is raised —
 * where it can say which specific field is missing — not at every read.
 */
export async function sellerIdentity(tx: TenantScopedClient): Promise<SellerIdentity> {
  const [profile, registration] = await Promise.all([
    tx.plywoodBusinessProfile.findFirst(),
    tx.plywoodGstRegistration.findFirst({ where: { active: true } }),
  ]);

  return {
    legalName: profile?.legalName ?? null,
    gstin: registration?.gstin ?? null,
    stateCode: registration?.stateCode ?? null,
    invoiceSeriesPrefix: registration?.invoiceSeriesPrefix ?? null,
  };
}

export const setBusinessProfile: CommandDefinition<
  {
    legalName: string;
    tradeName?: string;
    pan?: string;
    registeredAddress?: string;
    financialYearStartMonth?: number;
    currencyCode?: string;
  },
  { id: string; legalName: string }
> = {
  key: "verity.plywood.set_business_profile",
  entity: ENTITY_BUSINESS_PROFILE,
  verb: "Edit",
  input: z.object({
    legalName: z.string().min(1).max(200),
    tradeName: z.string().max(200).optional(),
    // Shape only. Validity belongs to the income tax department; this catches
    // a phone number typed into the wrong box.
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must be 5 letters, 4 digits, 1 letter").optional(),
    registeredAddress: z.string().max(500).optional(),
    financialYearStartMonth: z.number().int().min(1).max(12).optional(),
    currencyCode: z.string().length(3).optional(),
  }),
  handler: async (ctx, input) => {
    const existing = await ctx.tx.plywoodBusinessProfile.findFirst();

    // Upsert by tenant rather than by id: there is exactly one profile per
    // tenant, and asking a caller to know its id to change the trade name
    // would be a foreign key masquerading as a form field.
    const profile = existing
      ? await ctx.tx.plywoodBusinessProfile.update({
          where: { id: existing.id },
          data: {
            legalName: input.legalName,
            tradeName: input.tradeName ?? null,
            pan: input.pan ?? null,
            registeredAddress: input.registeredAddress ?? null,
            ...(input.financialYearStartMonth ? { financialYearStartMonth: input.financialYearStartMonth } : {}),
            ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
          },
        })
      : await ctx.tx.plywoodBusinessProfile.create({
          data: {
            tenantId: ctx.actor.tenantId,
            legalName: input.legalName,
            tradeName: input.tradeName ?? null,
            pan: input.pan ?? null,
            registeredAddress: input.registeredAddress ?? null,
            financialYearStartMonth: input.financialYearStartMonth ?? 4,
            currencyCode: input.currencyCode ?? "INR",
          },
        });

    return {
      result: { id: profile.id, legalName: profile.legalName },
      events: [
        {
          name: "verity.plywood.business_profile_set",
          entityId: profile.id,
          payload: { legalName: profile.legalName },
        },
      ],
    };
  },
};

export const registerGstRegistration: CommandDefinition<
  {
    gstin: string;
    registrationType?: "regular" | "composition";
    invoiceSeriesPrefix: string;
  },
  { id: string; gstin: string; stateCode: string }
> = {
  key: "verity.plywood.register_gst_registration",
  entity: ENTITY_GST_REGISTRATION,
  verb: "Create",
  input: z.object({
    gstin: z
      .string()
      .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/,
        "GSTIN must be 15 characters: 2 state digits, 10 PAN characters, an entity code, Z, and a checksum",
      ),
    registrationType: z.enum(["regular", "composition"]).optional(),
    invoiceSeriesPrefix: z.string().min(1).max(20),
  }),
  handler: async (ctx, input) => {
    // The state code is NOT asked for. It is the first two characters of the
    // GSTIN, always, and asking for it separately creates a field that can
    // disagree with the number it came from — a disagreement that decides
    // CGST+SGST against IGST on every invoice the business ever raises.
    const stateCode = input.gstin.slice(0, 2);

    const active = await ctx.tx.plywoodGstRegistration.findFirst({ where: { active: true } });
    if (active) {
      throw new ValidationError(
        `E_VALIDATION: this business already has an active GST registration (${active.gstin}). ` +
          "One registration is supported; a second state is a product decision, not a form.",
      );
    }

    const registration = await ctx.tx.plywoodGstRegistration.create({
      data: {
        tenantId: ctx.actor.tenantId,
        gstin: input.gstin,
        stateCode,
        registrationType: input.registrationType ?? "regular",
        invoiceSeriesPrefix: input.invoiceSeriesPrefix,
      },
    });

    return {
      result: {
        id: registration.id,
        gstin: registration.gstin,
        stateCode: registration.stateCode,
      },
      events: [
        {
          name: "verity.plywood.gst_registration_added",
          entityId: registration.id,
          // The GSTIN is not a secret — it is printed on every invoice — but
          // the event carries the state code because that is the fact other
          // parts of the system react to.
          payload: { stateCode: registration.stateCode },
        },
      ],
    };
  },
};

export const businessSettings: QueryDefinition<
  Record<string, never>,
  {
    legalName: string | null;
    tradeName: string | null;
    pan: string | null;
    registeredAddress: string | null;
    financialYearStartMonth: number;
    currencyCode: string;
    gstin: string | null;
    stateCode: string | null;
    registrationType: string | null;
    invoiceSeriesPrefix: string | null;
    /** What onboarding still needs, in the order a person would do it. */
    outstanding: string[];
  }
> = {
  key: "verity.plywood.business_settings",
  entity: ENTITY_BUSINESS_PROFILE,
  input: z.object({}),
  handler: async (ctx) => {
    const [profile, registration] = await Promise.all([
      ctx.tx.plywoodBusinessProfile.findFirst(),
      ctx.tx.plywoodGstRegistration.findFirst({ where: { active: true } }),
    ]);

    // Named steps rather than a boolean "configured": the specification's §3
    // asks for a resumable checklist, and "not ready" with no reason is the
    // least useful thing an onboarding screen can say.
    const outstanding: string[] = [];
    if (!profile) outstanding.push("Business details");
    if (!registration) outstanding.push("Tax details");

    return {
      legalName: profile?.legalName ?? null,
      tradeName: profile?.tradeName ?? null,
      pan: profile?.pan ?? null,
      registeredAddress: profile?.registeredAddress ?? null,
      financialYearStartMonth: profile?.financialYearStartMonth ?? 4,
      currencyCode: profile?.currencyCode ?? "INR",
      gstin: registration?.gstin ?? null,
      stateCode: registration?.stateCode ?? null,
      registrationType: registration?.registrationType ?? null,
      invoiceSeriesPrefix: registration?.invoiceSeriesPrefix ?? null,
      outstanding,
    };
  },
};

export function registerBusinessIdentity(): void {
  registerCommand(setBusinessProfile);
  registerCommand(registerGstRegistration);
  registerQuery(businessSettings);
}
