"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Rocket } from "lucide-react";

import { Button, Card, Input } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { launchOutlet } from "@/server/actions/franchise";

/**
 * "Launch outlet" — the franchise expansion flow.
 *
 * Creates a Site in *this* workspace, not a new tenant. A franchise network is
 * one workspace with many outlets; provisioning a tenant per store would give
 * fifty stores fifty dashboards and no network view, which is the one thing a
 * franchise HQ actually needs.
 *
 * The optional manager is the difference between a site record and an outlet
 * that can trade tomorrow morning: without an account, nobody on site can
 * complete the opening checklist that the SOP gate requires.
 */
export function LaunchOutletDialog({
  open,
  onClose,
  label = "outlet",
}: {
  open: boolean;
  onClose: () => void;
  /** "outlet" for QSR, "store" for retail — the word the operator uses. */
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: "", city: "", managerName: "", managerPhone: "" });
  const [issued, setIssued] = useState<{ name: string; phone: string; pin: string } | null>(null);

  if (!open && !issued) return null;

  function submit() {
    start(async () => {
      const result = await launchOutlet({
        name: form.name,
        city: form.city,
        manager:
          form.managerName.trim() || form.managerPhone.trim()
            ? { name: form.managerName, phone: form.managerPhone }
            : undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      setForm({ name: "", city: "", managerName: "", managerPhone: "" });
      router.refresh();

      if ("credentials" in result && result.credentials) {
        // Hold the dialog open on the credentials — closing here would lose the
        // PIN, which cannot be recovered.
        setIssued(result.credentials);
      } else {
        toast.success(`${label[0].toUpperCase()}${label.slice(1)} launched.`);
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        {issued ? (
          <>
            <h2 className="font-display text-[16px] font-semibold text-text-primary">
              {label[0].toUpperCase()}
              {label.slice(1)} launched
            </h2>
            <p className="mt-2 text-[12px] text-[var(--warning)]">
              Give the manager these now — the PIN cannot be shown again.
            </p>
            <div className="mt-4 space-y-2 rounded-[12px] border border-border bg-surface-2 p-3">
              <Row label="Name" value={issued.name} />
              <Row label="Phone" value={issued.phone} />
              <Row label="PIN" value={issued.pin} mono />
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      `Verity access\nName: ${issued.name}\nPhone: ${issued.phone}\nPIN: ${issued.pin}`,
                    )
                    .then(() => toast.success("Copied"))
                    .catch(() => toast.error("Could not copy"))
                }
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                onClick={() => {
                  setIssued(null);
                  onClose();
                }}
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-[16px] font-semibold text-text-primary">
              Launch a new {label}
            </h2>
            <p className="mt-1 text-[12px] text-text-secondary">
              Creates the {label} in this workspace, so it joins the network scorecard
              immediately.
            </p>

            <div className="mt-4 space-y-3">
              <Field label={`${label[0].toUpperCase()}${label.slice(1)} name`}>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
                  placeholder="Koramangala"
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.currentTarget.value })}
                  placeholder="Bengaluru"
                />
              </Field>

              <div className="border-t border-border/60 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  Manager (optional)
                </p>
                <p className="mt-1 text-[11px] text-text-tertiary">
                  Without an account, nobody on site can complete the opening checklist.
                </p>
              </div>
              <Field label="Manager name">
                <Input
                  value={form.managerName}
                  onChange={(e) => setForm({ ...form, managerName: e.currentTarget.value })}
                />
              </Field>
              <Field label="Manager phone">
                <Input
                  inputMode="numeric"
                  value={form.managerPhone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      managerPhone: e.currentTarget.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  placeholder="9876543210"
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending || !form.name.trim()}>
                <Rocket className="h-3.5 w-3.5" />
                {pending ? "Launching…" : "Launch"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className={`text-[13px] text-text-primary ${mono ? "font-mono font-bold" : ""}`}>
        {value}
      </span>
    </div>
  );
}
