"use client";

import { MasterSheetView } from "../MasterSheetView";
import { useRouter } from "next/navigation";

// No page header: the studio has its own toolbar, so it gets the full height.
export function MasterDataPageClient({ masterData }: { masterData: any }) {
  const router = useRouter();
  return (
    <MasterSheetView
      isOpen
      asPage
      onClose={() => router.push("/owner/settings")}
      masterData={masterData}
    />
  );
}
