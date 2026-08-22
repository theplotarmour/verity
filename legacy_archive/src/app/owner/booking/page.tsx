import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";
import { getBookingWeek, getBookingStaff } from "@/server/actions/booking";
import { BookingClient } from "./client";

/**
 * The appointment book.
 *
 * Gated on `booking.view` rather than a job title: a one-chair salon where the
 * owner is also the stylist is the normal case, and a role check would lock them
 * out of their own diary.
 */
export default async function BookingPage() {
  const user = await getOwnerUser();
  if (!user) redirect("/onboarding");
  await guardModulePage("booking");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("booking.view")) redirect("/unauthorized");

  const [initialWeek, staff] = await Promise.all([getBookingWeek(), getBookingStaff()]);

  return (
    <BookingClient
      initialWeek={initialWeek}
      staff={staff}
      canManage={access.permissions.has("booking.manage")}
    />
  );
}
