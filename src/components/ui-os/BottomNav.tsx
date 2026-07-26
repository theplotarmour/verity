"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface BottomNavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isAction?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border/90 dark:border-neutral-800/90 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl select-none will-change-transform">
      <div 
        className="flex items-center justify-around max-w-md mx-auto px-4"
        style={{ height: '72px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {items.map((item, idx) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !item.isAction);
          
          if (item.isAction) {
            return (
              <Link key={idx} href={item.href} className="px-2">
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-[0_8px_20px_rgba(0,122,255,0.2)]"
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon}
                </motion.div>
              </Link>
            );
          }

          return (
            <Link key={idx} href={item.href} className="relative group px-3 py-1 flex flex-col items-center gap-0.5 min-w-[64px]">
              <motion.div
                className={cn(
                  "relative z-10 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive ? "text-brand" : "text-text-secondary hover:text-text-primary"
                )}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomIndicator"
                    className="absolute -top-[14px] w-8 h-[3px] rounded-b-full bg-[var(--brand)]"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="mb-0.5">{item.icon}</span>
                <span className={cn("text-[10px] font-medium tracking-wide", isActive ? "opacity-100 font-bold" : "opacity-75")}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
