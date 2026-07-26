"use client";

import { Home, Clock, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { BottomNav, BottomNavItem } from '@/components/ui-os/BottomNav'
import { useLanguage } from '@/components/providers/language-provider'

// Shared floor nav. The base path follows the role's home (workers under
// /worker, non-QC supervisors under /supervisor) so a supervisor's Home/Profile
// never bounce them into worker-only pages. Both roles get History — a worker
// sees their own jobs, a supervisor sees their whole department's.
export function WorkerNav() {
  const { dictionary: dict } = useLanguage()
  const pathname = usePathname() || '/worker'
  const base = pathname.startsWith('/supervisor') ? '/supervisor' : '/worker'

  const navItems: BottomNavItem[] = [
    { icon: <Home className="w-5 h-5" />, label: dict.home || 'Home', href: base },
    { icon: <Clock className="w-5 h-5" />, label: dict.history || 'History', href: `${base}/history` },
    { icon: <User className="w-5 h-5" />, label: dict.profile || 'Profile', href: `${base}/profile` },
  ]

  return <BottomNav items={navItems} />
}
