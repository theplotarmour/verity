import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getSchedulingData } from "@/server/actions/scheduling";
import { SchedulingClient } from "./SchedulingClient";

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  await guardModulePage("scheduling");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  // The visible week is a URL parameter, not client state, so a link to a
  // specific week is shareable and a refresh keeps you where you were.
  const { from } = await searchParams;
  const data = await getSchedulingData({ from });

  return (
    <SchedulingClient
      from={data.from}
      to={data.to}
      schedules={data.schedules}
      shifts={data.shifts}
      staff={data.staff}
      sites={data.sites}
      swaps={data.swaps}
    />
  );
}
