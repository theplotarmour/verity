"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

let toastIdCounter = 0;

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: number;
  message: string;
  type: ToastType;
  onClose: (id: number) => void;
}

function ToastItem({ id, message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger entry animation
    requestAnimationFrame(() => setIsVisible(true));
    // Errors stay up longer — they usually explain why an action was refused
    // and the operator needs time to read them.
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, type === "error" ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [id, onClose, type]);

  const colorClasses = {
    success: "bg-success-soft text-success border-success/20",
    error: "bg-danger-soft text-danger border-danger/20",
    info: "bg-brand-soft text-[var(--brand)] border-[var(--brand)]/20",
  }[type];

  const Icon = type === "success" ? CheckCircle2 : type === "error" ? XCircle : CheckCircle2;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-border shadow-lg transition-all duration-300 transform bg-surface/95 backdrop-blur-md ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClasses}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="min-w-0 flex-1 font-semibold leading-snug tracking-[-0.01em] text-[13px] text-text-primary">{message}</span>
    </div>
  );
}

// Global toast manager
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

function ToastContainer() {
  const [toasts, setToasts] = useState<Omit<ToastProps, "onClose">[]>([]);

  useEffect(() => {
    addToastFn = (message: string, type: ToastType) => {
      const id = toastIdCounter++;
      setToasts((prev) => [...prev, { id, message, type }]);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    // Top-centred and above the bottom nav (z-[100]) — toasts used to sit at
    // bottom-right underneath the worker nav bar, so errors were invisible and
    // an action looked like it had silently done nothing.
    <div className="fixed top-[calc(12px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[200] flex w-[min(92vw,26rem)] flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  );
}

// Ensure container exists
if (typeof window !== "undefined") {
  const containerId = "toast-container-root";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<ToastContainer />);
  }
}

export const toast = {
  success: (message: string) => addToastFn?.(message, "success"),
  error: (message: string) => addToastFn?.(message, "error"),
  info: (message: string) => addToastFn?.(message, "info"),
};
