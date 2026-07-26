import { getAgreement } from "@/server/actions/hq";
import { notFound } from "next/navigation";
import AgreementPortalClient from "./client";

export const dynamic = "force-dynamic";

export default async function AgreementPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agreement = await getAgreement(id);

  if (!agreement) {
    notFound();
  }

  return <AgreementPortalClient agreement={agreement} />;
}
