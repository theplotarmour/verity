"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, LogOut, Menu, Factory as FactoryIcon, ChevronDown, Sparkles } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge, Button } from "@/components/ui/primitives";

export interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/owner/dashboard" },
  { label: "Orders", href: "/owner/production" },
  { label: "Production", href: "/owner/qc-floor" },
  { label: "Reports", href: "/owner/reports" },
];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
};

export function Navbar({ factoryName, userName }: { factoryName: string; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      setLoadingNotifications(true);
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { notifications?: NotificationItem[] };
        setNotifications(payload.notifications ?? []);
      } finally {
        setLoadingNotifications(false);
      }
    }

    void loadNotifications();
  }, []);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4 px-4 md:px-6">
        <Link href="/owner/dashboard" className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] shadow-[0_14px_30px_rgba(12,76,181,0.18)] transition-transform duration-200 hover:scale-[1.03]">
            <FactoryIcon className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold tracking-[0.08em] text-text-tertiary uppercase">Verity</div>
            <div className="text-sm font-medium text-text-primary">{factoryName}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            className="md:hidden h-10 w-10 rounded-full px-0"
            onClick={() => setMobileNavOpen((value) => !value)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifs((value) => !value);
                setShowProfile(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-white" />
              ) : null}
            </button>

            <AnimatePresence>
              {showNotifs ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-3 w-[22rem] overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Notifications</p>
                      <p className="text-xs text-text-secondary">
                        {unreadCount ? `${unreadCount} unread` : "No unread items"}
                      </p>
                    </div>
                    <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="px-4 py-6 text-sm text-text-secondary">Loading notifications...</div>
                    ) : notifications.length ? (
                      notifications.map((item) => (
                        <div key={item.id} className="border-b border-slate-50 px-4 py-4 last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                              <p className="mt-1 text-sm text-text-secondary">{item.message}</p>
                            </div>
                            {!item.read ? <Badge className="bg-brand-soft text-brand">New</Badge> : null}
                          </div>
                          <p className="mt-2 text-xs text-text-tertiary">{formatDate(item.createdAt)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-3 text-sm font-medium text-text-secondary">You're all caught up</p>
                        <p className="mt-1 text-xs text-text-tertiary">New QC events will appear here.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="relative hidden sm:block" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setShowProfile((value) => !value);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-white px-2 pr-3 py-1.5 text-sm text-text-secondary transition hover:border-[var(--brand)]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] font-semibold text-white">
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            </button>

            <AnimatePresence>
              {showProfile ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]"
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">{userName}</p>
                    <p className="mt-1 text-xs text-text-secondary">{factoryName}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/owner/dashboard" className="block rounded-2xl px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-2">
                      View dashboard
                    </Link>
                    <div className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm text-text-secondary">
                      <span>Theme</span>
                      <ThemeToggle />
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-danger transition hover:bg-danger-soft"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-border bg-white px-4 py-4 md:hidden"
          >
            <div className="grid gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className="rounded-2xl px-3 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface-2">
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl px-3 py-3 text-left text-sm font-medium text-danger transition hover:bg-danger-soft"
              >
                Logout
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
