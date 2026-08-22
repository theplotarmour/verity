"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "./primitives";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "primary" | "danger";
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "primary"
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="relative w-full max-w-sm rounded-[24px] border border-border bg-surface p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
          >
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              variant === "danger" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-strong"
            }`}>
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-text-primary">
              {title}
            </h3>
            
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
            
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="w-full" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button 
                variant={variant === "danger" ? "danger" : "primary"} 
                className="w-full" 
                onClick={() => {
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
