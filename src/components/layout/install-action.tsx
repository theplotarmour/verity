"use client";

import { Download, Wifi, WifiOff } from "lucide-react";
import { usePwa } from "@/components/providers/pwa-provider";
import { Button } from "@/components/ui/primitives";

export function InstallAction() {
  const { canInstall, install, online } = usePwa();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm md:flex">
        {online ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-danger" />}
        {online ? "Online sync ready" : "Offline mode active"}
      </div>
      {canInstall ? (
        <Button variant="secondary" onClick={() => void install()} className="min-h-10 px-4">
          <Download className="h-4 w-4" />
          Install app
        </Button>
      ) : null}
    </div>
  );
}
