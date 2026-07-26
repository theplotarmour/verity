'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type Status = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusPillProps {
  status: Status;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function StatusPill({ status, label, icon, className, pulse = false }: StatusPillProps) {
  
  const variants: Record<Status, string> = {
    success: "bg-success-soft text-success border border-success/20",
    warning: "bg-warning-soft text-warning border border-warning/20",
    danger: "bg-danger-soft text-danger border border-danger/20",
    neutral: "bg-surface-2 text-text-secondary border border-border"
  };

  const dotColors: Record<Status, string> = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-surface-2"
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
      variants[status],
      className
    )}>
      {pulse ? (
        <div className="relative flex h-2 w-2">
          <motion.span 
            className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", dotColors[status])}
            animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColors[status])} />
        </div>
      ) : icon ? (
        <span className="w-3 h-3">{icon}</span>
      ) : (
        <span className={cn("rounded-full h-2 w-2", dotColors[status])} />
      )}
      {label}
    </div>
  );
}


