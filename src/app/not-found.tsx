import Link from "next/link";
import { Button, Card } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
          Verity
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-text-primary">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          The screen you are looking for does not exist or requires authentication.
        </p>
        <Link href="/" className="mt-5 inline-block">
          <Button>Back to home</Button>
        </Link>
      </Card>
    </div>
  );
}
