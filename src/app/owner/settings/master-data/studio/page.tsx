import { redirect } from "next/navigation";

export default async function LegacySpecStudioRedirect({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (params.group) next.set("group", params.group);
  if (params.mode) next.set("mode", params.mode);
  redirect(`/owner/master-data${next.size ? `?${next.toString()}` : ""}`);
}
