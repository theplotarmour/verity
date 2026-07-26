"use client";

import { Inbox, ShieldAlert, BadgeCheck, User, Search } from 'lucide-react'
import { BottomNav, BottomNavItem } from '@/components/ui-os/BottomNav'
import { useLanguage } from '@/components/providers/language-provider'

export function InspectorNav() {
  const { dictionary: dict } = useLanguage()

  const navItems: BottomNavItem[] = [
    { icon: <Inbox className="w-5 h-5" />, label: dict.queue || 'Queue', href: '/inspector' },
    { icon: <BadgeCheck className="w-5 h-5" />, label: dict.approved || 'Approved', href: '/inspector/verified' },
    { icon: <ShieldAlert className="w-5 h-5" />, label: dict.issues || 'Issues', href: '/inspector/rejected' },
    { icon: <User className="w-5 h-5" />, label: dict.profile || 'Profile', href: '/inspector/profile' },
  ]

  return <BottomNav items={navItems} />
}
