import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";

/**
 * CAPABILITY: Coupon — `verity.capability.coupon` (Colonel Kebabz Phase 2,
 * lean V1)
 *
 * Authority: `clients/colonel-kebabz/prd.md` §32 (Offers & Coupons), scoped
 * to percent/flat discount codes only per the 2026-09-10 lean-scope
 * correction — no Buy-X-Get-Y, item/category-scoped, first-order,
 * returning-customer, outlet-specific, or time-specific offer types.
 *
 * `applyCoupon` validates and increments usage but does NOT itself touch
 * the Bill — it returns the computed discount for a staff member to apply
 * through the existing `dinein.applyBillDiscount`, same decoupled posture
 * as `loyalty.redeemPoints`.
 */

export const COUPON_CAPABILITY = "verity.capability.coupon";
export const ENTITY_COUPON = "verity.coupon.coupon";

export const DISCOUNT_TYPES = ["Percent", "Flat"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const createCoupon: CommandDefinition<
  {
    code: string;
    discountType: DiscountType;
    value: number;
    minOrderValueMinor?: number;
    usageLimit?: number;
    expiresAt?: string;
  },
  { id: string }
> = {
  key: "verity.coupon.create_coupon",
  entity: ENTITY_COUPON,
  verb: "Create",
  input: z.object({
    code: z.string().min(2).max(40),
    discountType: z.enum(DISCOUNT_TYPES),
    // Basis points for Percent (2500 = 25%), paise for Flat.
    value: z.number().int().positive(),
    minOrderValueMinor: z.number().int().min(0).optional(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
  preconditions: async (ctx, input) => {
    if (input.discountType === "Percent" && input.value > 10_000) {
      throw new ValidationError("E_VALIDATION: a percent discount cannot exceed 100%");
    }
    const clash = await ctx.tx.coupon.findFirst({ where: { code: input.code } });
    if (clash) throw new ValidationError("E_VALIDATION: a coupon with that code already exists");
  },
  handler: async (ctx, input) => {
    const coupon = await ctx.tx.coupon.create({
      data: {
        tenantId: ctx.actor.tenantId,
        code: input.code,
        discountType: input.discountType,
        value: input.value,
        minOrderValueMinor: input.minOrderValueMinor ?? null,
        usageLimit: input.usageLimit ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
    return { result: { id: coupon.id }, events: [{ name: "verity.coupon.coupon_created", entityId: coupon.id }] };
  },
};

export const applyCoupon: CommandDefinition<{ billId: string; code: string }, { discountMinor: number }> = {
  key: "verity.coupon.apply_coupon",
  entity: ENTITY_COUPON,
  verb: "ActionExecute",
  input: z.object({ billId: z.string().uuid(), code: z.string().min(1) }),
  preconditions: async (ctx, input) => {
    const bill = await ctx.tx.bill.findUnique({ where: { id: input.billId } });
    if (!bill) throw new ValidationError("E_VALIDATION: bill not found");
    if (bill.state !== "open") throw new ValidationError("E_VALIDATION: that bill is closed");

    const coupon = await ctx.tx.coupon.findFirst({ where: { code: input.code } });
    if (!coupon) throw new ValidationError("E_VALIDATION: coupon not found");
    if (!coupon.active) throw new ValidationError("E_VALIDATION: coupon is not active");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new ValidationError("E_VALIDATION: coupon has expired");
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new ValidationError("E_VALIDATION: coupon usage limit reached");
    }
    if (coupon.minOrderValueMinor !== null && bill.subtotalMinor < coupon.minOrderValueMinor) {
      throw new ValidationError(
        `E_VALIDATION: order must be at least ${coupon.minOrderValueMinor} paise for this coupon`,
      );
    }
  },
  handler: async (ctx, input) => {
    const bill = await ctx.tx.bill.findUniqueOrThrow({ where: { id: input.billId } });
    const coupon = await ctx.tx.coupon.findFirstOrThrow({ where: { code: input.code } });

    const discountMinor =
      coupon.discountType === "Percent"
        ? Math.round((bill.subtotalMinor * coupon.value) / 10_000)
        : Math.min(coupon.value, bill.subtotalMinor);

    await ctx.tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 }, version: { increment: 1 } },
    });

    return {
      result: { discountMinor },
      events: [{ name: "verity.coupon.coupon_applied", entityId: coupon.id, payload: { billId: bill.id } }],
    };
  },
};

/* ============================== registration ============================== */

export function registerCouponCapability(): void {
  registerContribution({ capabilityId: COUPON_CAPABILITY, navigation: [] });
  registerCommand(createCoupon);
  registerCommand(applyCoupon);
}
