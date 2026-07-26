"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function VerifiedMoment({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-3 pt-4 pb-8 relative z-10 shrink-0">
      
      {/* Spring animated check circle */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.15,
        }}
        className="h-16 w-16 rounded-full bg-success text-white flex items-center justify-center shadow-lg shadow-emerald-500/20"
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Check className="h-9 w-9 stroke-[3px]" />
        </motion.div>
      </motion.div>

      {/* Heading Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="space-y-1.5"
      >
        <h2 className="text-2xl font-black tracking-tight text-text-primary">
          Verified Genuine
        </h2>
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
          {count} Quality checkpoints completed
        </p>
      </motion.div>

    </div>
  );
}
