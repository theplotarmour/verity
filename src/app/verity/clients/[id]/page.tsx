import { notFound } from "next/navigation";

import {
  getClientDetail,
  listApiKeys,
  listVerticalPacks,
  listWebhookEndpoints,
} from "@/server/actions/hq";
import { ClientDetailClient } from "./ClientDetailClient";
import { IntegrationsPanel } from "./IntegrationsPanel";

export default async function HqClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, packs, apiKeys, webhooks] = await Promise.all([
    getClientDetail(id),
    listVerticalPacks(),
    listApiKeys(id),
    listWebhookEndpoints(id),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <ClientDetailClient
        factory={detail.factory}
        users={detail.users}
        modules={detail.modules}
        packs={packs}
        roles={detail.roles}
        brand={detail.brand}
      />
      <IntegrationsPanel factoryId={id} apiKeys={apiKeys} webhooks={webhooks} />
    </div>
  );
}
