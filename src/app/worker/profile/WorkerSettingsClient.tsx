'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { updateUserLanguage } from '@/server/actions/user'
import { changeOwnPin } from '@/server/actions/auth'
import { NotificationPrefsCard } from '@/components/settings/NotificationPrefsCard'
import { useLanguage } from '@/components/providers/language-provider'
import { Loader2, Globe, Moon, Sun, Phone, KeyRound } from 'lucide-react'

export function WorkerSettingsClient({ initialLanguage, ownerPhone }: { initialLanguage: string, ownerPhone?: string }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState(initialLanguage)
  const [isLoading, setIsLoading] = useState(false)
  const { dictionary: dict, setLanguage } = useLanguage()

  // Self-service PIN change
  const [pinOpen, setPinOpen] = useState(false)
  const [curPin, setCurPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submitPin = async () => {
    setPinBusy(true); setPinMsg(null)
    const res = await changeOwnPin(curPin, newPin)
    if ((res as any)?.error) setPinMsg({ ok: false, text: (res as any).error })
    else { setPinMsg({ ok: true, text: 'PIN updated' }); setCurPin(''); setNewPin(''); setTimeout(() => { setPinOpen(false); setPinMsg(null) }, 1200) }
    setPinBusy(false)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as 'en' | 'hi'
    const previousLanguage = lang
    setLang(newLang)
    setLanguage(newLang)
    setIsLoading(true)
    const result = await updateUserLanguage(newLang)
    if (result?.error) {
      setLang(previousLanguage)
      setLanguage(previousLanguage as 'en' | 'hi')
    } else {
      window.location.reload()
    }
    setIsLoading(false)
  }

  if (!mounted) return null

  return (
    <div className="mt-4 grid gap-2.5">
      {/* Language Setting */}
      <div className="rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-slate-100 dark:border-neutral-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{dict.appLanguage}</p>
            <p className="text-[11px] text-text-secondary">{dict.chooseLanguage}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />}
          <select 
            value={lang} 
            onChange={handleLanguageChange}
            disabled={isLoading}
            className="bg-white dark:bg-neutral-900 border border-border dark:border-neutral-750 text-text-primary text-xs rounded-xl focus:ring-brand focus:border-brand block p-1.5 outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </div>
      </div>

      {/* Theme Setting */}
      <div className="rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-slate-100 dark:border-neutral-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            {theme === 'dark' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{dict.appearance}</p>
            <p className="text-[11px] text-text-secondary">{dict.chooseAppearance}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 border border-border dark:border-neutral-700 rounded-xl">
          <button
            onClick={() => setTheme('light')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${theme === 'light' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {dict.light}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${theme === 'dark' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {dict.dark}
          </button>
        </div>
      </div>

      {/* Notification preferences */}
      <NotificationPrefsCard compact />

      {/* Change PIN */}
      <div className="rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-slate-100 dark:border-neutral-700/60">
        <button onClick={() => { setPinOpen(!pinOpen); setPinMsg(null) }} className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Change PIN</p>
              <p className="text-[11px] text-text-secondary">Update your login PIN</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-brand">{pinOpen ? 'Close' : 'Change'}</span>
        </button>
        {pinOpen && (
          <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-neutral-700/60 pt-3">
            <input type="password" inputMode="numeric" placeholder="Current PIN" value={curPin} onChange={(e) => setCurPin(e.target.value)}
              className="w-full rounded-xl border border-border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand" />
            <input type="password" inputMode="numeric" placeholder="New PIN (4–6 digits)" value={newPin} onChange={(e) => setNewPin(e.target.value)}
              className="w-full rounded-xl border border-border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand" />
            {pinMsg && <p className={`text-[11px] font-semibold ${pinMsg.ok ? 'text-success' : 'text-danger'}`}>{pinMsg.text}</p>}
            <button onClick={submitPin} disabled={pinBusy || !curPin || !newPin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pinBusy && <Loader2 className="h-4 w-4 animate-spin" />} Update PIN
            </button>
          </div>
        )}
      </div>

      {/* Contact Support */}
      <a
        href={ownerPhone ? `tel:${ownerPhone}` : '#'}
        className="w-full rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-slate-100 dark:border-neutral-700/60 flex items-center justify-between hover:bg-surface-2 dark:hover:bg-neutral-700/40 transition-colors text-left border-t"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <Phone className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{dict.contactSupervisor}</p>
            <p className="text-[11px] text-text-secondary">{dict.callManager}</p>
          </div>
        </div>
      </a>
    </div>
  )
}
