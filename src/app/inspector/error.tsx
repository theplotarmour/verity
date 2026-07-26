"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/primitives";
import { AlertCircle } from "lucide-react";

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Worker Error:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="rounded-full bg-danger-soft p-4 mb-6">
        <AlertCircle className="h-10 w-10 text-danger-strong" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
        Something went wrong
      </h2>
      <p className="text-text-secondary max-w-md mb-8">
        We encountered an error while loading your workspace. Don't worry, your offline data is safe.
      </p>
      <Button onClick={() => reset()} variant="primary">
        Try Again
      </Button>
    </div>
  );
}
