"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { getNotificationSettings, updateNotificationSettings } from "@/server/actions/user";

// Per-user notification channel opt-in. In-app is always on; email and WhatsApp
// are delivered by the server only when those channels are configured.
export function NotificationPrefsCard({ compact = false }: { compact?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getNotificationSettings().then((s) => {
      setEmail(s.email); setWhatsapp(s.whatsapp); setContactEmail(s.contactEmail); setLoaded(true);
    });
  }, []);

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await updateNotificationSettings({ email, whatsapp, contactEmail });
    if ((res as any)?.error) setMsg({ ok: false, text: (res as any).error });
    else { setMsg({ ok: true, text: "Saved" }); setTimeout(() => setMsg(null), 1500); }
    setBusy(false);
  };

  const wrap = compact
    ? "rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-slate-100 dark:border-neutral-700/60"
    : "rounded-[20px] border border-border bg-surface p-5";

  return (
    <div className={wrap}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Bell className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Notifications</p>
          <p className="text-[11px] text-text-secondary">In-app is always on. Add email or WhatsApp alerts.</p>
        </div>
      </div>

      {!loaded ? (
        <div className="mt-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-text-tertiary" /></div>
      ) : (
        <div className="mt-3 space-y-3">
          <Toggle label="Email alerts" checked={email} onChange={setEmail} />
          {email && (
            <input type="email" placeholder="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-xl border border-border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand" />
          )}
          <Toggle label="WhatsApp alerts" checked={whatsapp} onChange={setWhatsapp} hint="QC rejections & deliveries" />
          {msg && <p className={`text-[11px] font-semibold ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
          <button onClick={save} disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
          </button>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between">
      <div className="text-left">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="text-[11px] text-text-secondary">{hint}</p>}
      </div>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand" : "bg-slate-300 dark:bg-neutral-600"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
