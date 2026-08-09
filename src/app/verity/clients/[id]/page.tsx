import { notFound } from "next/navigation";

import { getClientDetail, listVerticalPacks } from "@/server/actions/hq";
import { ClientDetailClient } from "./ClientDetailClient";

export default async function HqClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, packs] = await Promise.all([getClientDetail(id), listVerticalPacks()]);
  if (!detail) notFound();

  return (
    <ClientDetailClient
      factory={detail.factory}
      users={detail.users}
      modules={detail.modules}
      packs={packs}
    />
  );
}
