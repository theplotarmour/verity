"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Surface } from "./Surface";

export function Sheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="mx-auto mt-16 w-[min(92vw,480px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <Surface className="overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
              </div>
              <div className="p-5">{children}</div>
            </Surface>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

