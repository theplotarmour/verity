import { getClientsList, listVerticalPacks } from "@/server/actions/hq";
import { ClientsClient } from "./ClientsClient";

export default async function HqClientsPage() {
  // The HQ layout already ran requireHqPage; these actions guard themselves too,
  // because a server action is reachable without ever rendering the page.
  const [clients, packs] = await Promise.all([getClientsList(), listVerticalPacks()]);

  return <ClientsClient clients={clients} packs={packs} />;
}
