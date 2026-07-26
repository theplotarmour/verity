"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Printer, Share2, Check, Footprints, X, CheckCircle2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DesignReference } from "@/components/factory/DesignReference";
import { EvidenceLightbox } from "@/components/factory/EvidenceLightbox";

export function VerificationPanel({ data, qrCodeUrl, url, submissions, allEvidences }: any) {
  const [copied, setCopied] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quality Passport - ${
            data.inspection.batch.order.vehicleBrand?.name 
              ? `${data.inspection.batch.order.vehicleBrand.name} ${data.inspection.batch.order.vehicleModel?.name || ""}`
              : (data.inspection.batch.order.productType?.name || "Product")
          }`,
          text: `Verified authenticity certificate`,
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
    <div className="flex flex-col h-full gap-6">
      {/* Verification Card */}
      <div className="rounded-[28px] border border-border bg-white dark:bg-neutral-900 p-6 shadow-sm flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <div className="text-[10px] text-text-tertiary uppercase tracking-[0.2em] font-bold">Verification Details</div>
          
          {/* Action icon buttons */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              title="Download PDF"
              className="p-2 rounded-lg border border-border hover:bg-surface-secondary/40 text-text-secondary hover:text-text-primary transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleShare}
              title="Share Link"
              className="p-2 rounded-lg border border-border hover:bg-surface-secondary/40 text-text-secondary hover:text-text-primary transition cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center gap-4">
          <div className="inline-flex items-center rounded-xl bg-success-soft border border-success/15 px-3 py-1.5 text-xs font-bold text-success">
            <BadgeCheck className="mr-1.5 h-4 w-4" /> Verified Authentic
          </div>

          <button
            onClick={() => setShowJourney(true)}
            className="h-8 px-4 rounded-xl bg-text-primary text-background hover:opacity-90 text-[11px] font-semibold transition flex items-center gap-1.5 print:hidden shadow cursor-pointer"
          >
            <Footprints className="h-3.5 w-3.5" /> Journey
          </button>
        </div>

        <div className="space-y-4 text-xs pt-4 border-t border-border">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-text-tertiary font-medium">Passport ID</p>
              <p className="font-mono font-bold text-text-primary mt-1 tracking-wider uppercase">{data.verificationCode}</p>
            </div>
            {allEvidences?.length > 0 && (
              <button
                onClick={() => setShowEvidence(true)}
                className="h-7 px-3 rounded-lg border border-border hover:bg-surface-secondary text-text-primary text-[10px] font-bold tracking-wide uppercase transition flex items-center gap-1 print:hidden cursor-pointer"
              >
                <Camera className="h-3 w-3" /> Evidence
              </button>
            )}
          </div>
          <div>
            <p className="text-text-tertiary font-medium">Certification Date</p>
            <p className="font-bold text-text-primary mt-1">
              {new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* QR Card */}
      <div className="rounded-[28px] border border-border bg-white dark:bg-neutral-900 p-6 shadow-sm flex items-center justify-between gap-4 flex-1">
        <div className="min-w-0">
          <p className="text-[10px] text-text-tertiary uppercase tracking-[0.2em] font-bold">Secure Verify</p>
          <p className="text-[11px] text-text-secondary mt-1">Scan this code to verify product birth logs live.</p>
        </div>
        <div className="bg-white p-2 border border-border rounded-xl shrink-0">
          <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
        </div>
      </div>

      {(data.inspection.batch.order.designImages?.length ?? 0) > 0 && (
        <div className="rounded-[28px] border border-border bg-white dark:bg-neutral-900 p-6 shadow-sm">
          <DesignReference images={data.inspection.batch.order.designImages} designName={data.inspection.batch.order.designName} />
        </div>
      )}

      {/* Journey Modal Popup */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showJourney && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowJourney(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-lg"
              />
              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[28px] border border-border p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
              >
                <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
                  <div>
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Birth Log Checklist</span>
                    <h3 className="text-lg font-bold text-text-primary mt-0.5">Inspection Journey</h3>
                  </div>
                  <button
                    onClick={() => setShowJourney(false)}
                    className="p-1.5 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Steps Scroll container */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
                  {submissions.length === 0 ? (
                    <div className="text-center text-text-tertiary py-12 text-xs">
                      No inspection checkpoints recorded for this product passport.
                    </div>
                  ) : (
                    submissions.map((sub: any, index: number) => (
                      <div key={sub.id} className="relative text-left pl-6 border-l border-border ml-2 group">
                        <div className="absolute -left-[9px] top-1.5 bg-white dark:bg-neutral-900 rounded-full text-success">
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        </div>
                        <div className="bg-surface-secondary/40 dark:bg-neutral-800/40 p-4 rounded-2xl border border-border/60">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-text-tertiary">Step {index + 1}</span>
                            <span className="text-[8px] font-bold text-success bg-success-soft px-2 py-0.5 rounded-md">
                              PASSED
                            </span>
                          </div>
                          <h4 className="font-bold text-text-primary text-sm mt-1">{sub.checkpoint?.name || "Checkpoint"}</h4>
                          {sub.remarks && <p className="text-xs text-text-secondary mt-1.5 italic">"{sub.remarks}"</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Evidence Modal Popup */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showEvidence && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEvidence(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-lg"
              />
              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[28px] border border-border p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
              >
                <div className="flex justify-between items-start mb-6 border-b border-border pb-4 shrink-0">
                  <div>
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Visual Verification</span>
                    <h3 className="text-lg font-bold text-text-primary mt-0.5">Evidence Gallery</h3>
                  </div>
                  <button
                    onClick={() => setShowEvidence(false)}
                    className="p-1.5 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Grid Scroll container */}
                <div className="flex-1 overflow-y-auto pr-1 py-1">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {allEvidences?.map((ev: any, i: number) => (
                      <button key={ev.id} onClick={() => setLightboxIndex(i)} className="group relative aspect-video rounded-xl overflow-hidden border border-border shadow-sm text-left cursor-pointer">
                        <img src={ev.publicUrl} alt="evidence" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white">
                          <p className="text-[10px] font-medium truncate">{ev.checkpointName}</p>
                          {(ev.uploadedByName || ev.createdAt) && (
                            <p className="text-[8.5px] text-white/70 truncate">
                              {[ev.uploadedByName, ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : null].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {lightboxIndex !== null && (
        <EvidenceLightbox
          items={allEvidences ?? []}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
