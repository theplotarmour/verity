import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { PageHeader } from "@/components/design/PageHeader";
import {
  listMyApiKeys,
  listMyDeliveries,
  listMyWebhooks,
} from "@/server/actions/integrations";
import { IntegrationsClient } from "./IntegrationsClient";

/**
 * A tenant's own integration credentials.
 *
 * The operator console has the same controls for support purposes, but an owner
 * wiring up their own storefront should not have to ask us to mint them a key.
 * The actions behind this page read the factory from the session rather than
 * taking it as an argument — see `server/actions/integrations.ts`.
 */
export default async function OwnerIntegrationsPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  if (!(await canUser(dbUser, "ACCESS_SETTINGS"))) redirect("/unauthorized");

  const [apiKeys, endpoints, deliveries, headerList] = await Promise.all([
    listMyApiKeys(),
    listMyWebhooks(),
    listMyDeliveries(),
    headers(),
  ]);

  // The real address to POST to, taken from the request rather than hardcoded,
  // so the page is correct on localhost, a preview deployment and production
  // without three different builds.
  const host = headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const ingestUrl = host ? `${proto}://${host}/api/orders/receive` : "/api/orders/receive";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrations"
        description="Connect your storefront, and send order milestones onward."
      />
      <IntegrationsClient
        apiKeys={apiKeys}
        endpoints={endpoints}
        deliveries={deliveries}
        ingestUrl={ingestUrl}
      />
    </div>
  );
}
