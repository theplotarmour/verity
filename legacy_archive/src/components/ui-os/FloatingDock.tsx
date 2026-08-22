'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface FloatingDockItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface FloatingDockProps {
  items: FloatingDockItem[];
}

export function FloatingDock({ items }: FloatingDockProps) {
  const pathname = usePathname();

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4 p-3 bg-white/40 backdrop-blur-2xl rounded-[2rem] shadow-glass border border-white/50 border-r-white/20">
      {items.map((item, idx) => {
        const isActive = pathname.startsWith(item.href) && (item.href !== '/owner' || pathname === '/owner/dashboard');
        
        return (
          <Link key={idx} href={item.href} className="relative group">
            <motion.div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors relative z-10",
                isActive ? "text-white" : "text-text-secondary hover:text-brand"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDockBubble"
                  className="absolute inset-0 bg-brand rounded-2xl shadow-neu-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-20 drop-shadow-sm">{item.icon}</span>
            </motion.div>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
              {item.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

