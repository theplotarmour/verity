'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-neu-sm max-w-md w-full text-center border border-slate-100">
        <div className="w-16 h-16 bg-danger-soft/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-danger" />
        </div>
        <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-text-secondary mb-8">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full bg-surface-2 text-text-secondary font-bold py-3 px-4 rounded-xl hover:bg-surface-2 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
