import { Card } from "@/components/ui/primitives";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
          Offline
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text-primary">
          You are offline
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Verity keeps the shell available. Reconnect to sync the latest
          assignments and proof pages.
        </p>
      </Card>
    </div>
  );
}
