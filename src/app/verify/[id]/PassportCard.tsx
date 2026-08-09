"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Factory, User } from "lucide-react";

export function PassportCard({ data }: { data: any }) {
  const brandName = data.inspection.batch.order.itemName || data.inspection.batch.order.productName || "Premium";
  const modelName = `#${data.inspection.batch.order.orderNumber || ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative w-full aspect-[1.6/1] md:aspect-[1.8/1] rounded-[28px] overflow-hidden text-white shadow-2xl border border-white/10 shrink-0 min-w-0"
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
      }}
    >
      {/* Holographic animated shine overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0) 100%)",
        }}
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          repeat: Infinity,
          duration: 4.5,
          ease: "easeInOut",
        }}
      />

      {/* Noise background texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Transparent Watermark "Verity" */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span className="text-[12vw] font-black tracking-[0.1em] text-white/[0.02] uppercase leading-none font-display">
          Verity
        </span>
      </div>

      {/* Card Content Layout */}
      <div className="relative z-10 h-full w-full p-6 md:p-8 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="h-6.5 w-6.5 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center overflow-hidden shadow-md">
              {data.factory.logoUrl ? (
                <img src={data.factory.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Factory className="h-3.5 w-3.5" />
              )}
            </div>
            <div>
              <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest leading-none">
                Verity Verified
              </p>
              <h2 className="text-xs font-bold text-white tracking-wide mt-0.5">{data.factory.name}</h2>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 bg-success/10 border border-success/25 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-success">
            <BadgeCheck className="h-3.5 w-3.5" /> VERIFIED
          </div>
        </div>

        {/* Product Title */}
        <div className="my-auto pt-4 pb-2">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Product ID Birth Record</p>
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-white mt-1 uppercase">
            {brandName} {modelName}
          </h1>
        </div>

        {/* Footer Details */}
        <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/5 text-[10px]">
          <div>
            <span className="text-[7.5px] font-bold text-text-secondary uppercase tracking-wider block">Customer</span>
            <span className="font-bold text-slate-200 block truncate mt-0.5">
              {data.inspection.batch.order.customer.name}
            </span>
          </div>
          <div>
            <span className="text-[7.5px] font-bold text-text-secondary uppercase tracking-wider block">Passport #</span>
            <span className="font-mono font-bold text-slate-200 block truncate mt-0.5 uppercase tracking-wide">
              {data.verificationCode.slice(0, 10)}
            </span>
          </div>
          <div>
            <span className="text-[7.5px] font-bold text-text-secondary uppercase tracking-wider block">Date Certified</span>
            <span className="font-bold text-slate-200 block truncate mt-0.5">
              {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
