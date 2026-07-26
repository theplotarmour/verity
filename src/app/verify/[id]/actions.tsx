"use client";

import { Printer, Share2, Check } from "lucide-react";
import { useState } from "react";

export function PassportActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quality Passport - ${title}`,
          text: `Verified authenticity certificate for ${title}`,
          url: url,
        });
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex justify-end gap-3 mb-8 print:hidden z-20 relative">
      <button 
        onClick={handlePrint}
        className="h-10 px-4 rounded-xl border border-border bg-white dark:bg-neutral-900 text-xs font-bold text-text-primary hover:bg-surface-2 transition flex items-center gap-2 shadow-sm"
      >
        <Printer className="w-4 h-4 text-text-secondary" /> Download PDF
      </button>
      <button 
        onClick={handleShare}
        className="h-10 px-4 rounded-xl border border-border bg-white dark:bg-neutral-900 text-xs font-bold text-text-primary hover:bg-surface-2 transition flex items-center gap-2 shadow-sm"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-success" /> Copied Link
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4 text-text-secondary" /> Share Passport
          </>
        )}
      </button>
    </div>
  );
}
