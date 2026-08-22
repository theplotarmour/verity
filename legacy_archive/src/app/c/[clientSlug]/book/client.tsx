"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { formatPaise } from "@/lib/money";
import { createPortalBooking, getPortalSlots } from "@/server/actions/portal";

/**
 * The four-step booking flow, as one client component.
 *
 * One component rather than four routes because the whole point is that a
 * customer never loses their place: picking a stylist and then a time is one
 * decision made in two taps, and a route change between them costs a round trip
 * and the browser back button starts undoing the booking instead of the step.
 *
 * Styled against the tenant's `--brand`, injected by the portal layout. Nothing
 * here names Verity.
 */

type Service = { id: string; name: string; description: string | null; pricePaise: number };
type Staff = { id: string; name: string };
type Step = "service" | "staff" | "time" | "details" | "done";

const IST = "Asia/Kolkata";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: IST });
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
});
const dayLabelFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** The next 14 IST days, as calendar keys. The window a customer may book into. */
function nextDays(count = 14): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    out.push(dayKeyFmt.format(new Date(now.getTime() + i * 86_400_000)));
  }
  return out;
}

const labelOf = (key: string) => dayLabelFmt.format(new Date(`${key}T12:00:00+05:30`));

export function BookClient({
  slug,
  tenantName,
  services,
  staff,
}: {
  slug: string;
  tenantName: string;
  services: Service[];
  staff: Staff[];
}) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<Service | null>(null);
  const [person, setPerson] = useState<Staff | null>(null);
  const [dayKey, setDayKey] = useState<string>(() => nextDays(1)[0]);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const days = nextDays();

  // Slots are fetched per (staff, day) rather than shipped with the page: a
  // roster of fourteen days for every person is most of a month of the shop's
  // schedule handed to anyone who loads the page.
  useEffect(() => {
    if (step !== "time" || !person) return;
    let cancelled = false;
    setSlots(null);
    setSlot(null);
    getPortalSlots(slug, person.id, dayKey).then((result) => {
      if (!cancelled) setSlots(result);
    });
    return () => {
      cancelled = true;
    };
  }, [step, person, dayKey, slug]);

  function submit() {
    if (!service || !person || !slot) return;
    setError(null);
    startTransition(async () => {
      const result = await createPortalBooking({
        slug,
        serviceId: service.id,
        staffId: person.id,
        startTime: slot,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        notes,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep("done");
    });
  }

  if (services.length === 0) {
    return (
      <Empty
        title="Nothing to book just yet"
        body={`${tenantName} has not published any services for online booking.`}
      />
    );
  }

  if (step === "done") {
    return (
      <div className="py-10 text-center">
        <span
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
        >
          <Check className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
          You&apos;re booked
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {service?.name} with {person?.name}
          <br />
          {slot ? `${labelOf(dayKey)} at ${timeFmt.format(new Date(slot))}` : null}
        </p>
        <p className="mt-4 text-xs text-text-tertiary">
          We&apos;ve sent the details to {tenantName}. They&apos;ll be in touch if anything changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header
        step={step}
        onBack={() =>
          setStep(step === "details" ? "time" : step === "time" ? "staff" : "service")
        }
      />

      {step === "service" && (
        <Section title="What would you like?">
          {services.map((s) => (
            <Row
              key={s.id}
              title={s.name}
              subtitle={s.description}
              trailing={formatPaise(s.pricePaise)}
              onClick={() => {
                setService(s);
                setStep(staff.length === 1 ? "time" : "staff");
                if (staff.length === 1) setPerson(staff[0]);
              }}
            />
          ))}
        </Section>
      )}

      {step === "staff" && (
        <Section title="Who with?">
          {staff.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nobody is taking online bookings at the moment.
            </p>
          ) : (
            staff.map((p) => (
              <Row
                key={p.id}
                title={p.name}
                onClick={() => {
                  setPerson(p);
                  setStep("time");
                }}
              />
            ))
          )}
        </Section>
      )}

      {step === "time" && (
        <Section title="When suits?">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((key) => (
              <button
                key={key}
                onClick={() => setDayKey(key)}
                className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition"
                style={
                  key === dayKey
                    ? {
                        background: "var(--brand)",
                        color: "var(--brand-contrast)",
                        borderColor: "var(--brand)",
                      }
                    : undefined
                }
              >
                {labelOf(key)}
              </button>
            ))}
          </div>

          {slots === null ? (
            <p className="flex items-center gap-2 py-6 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding free times…
            </p>
          ) : slots.length === 0 ? (
            <p className="py-6 text-sm text-text-secondary">
              {person?.name} has nothing free on {labelOf(dayKey)}. Try another day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((iso) => (
                <button
                  key={iso}
                  onClick={() => {
                    setSlot(iso);
                    setStep("details");
                  }}
                  className="rounded-xl border border-border py-3 text-sm font-semibold text-text-primary transition active:scale-[0.98]"
                >
                  {timeFmt.format(new Date(iso))}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {step === "details" && (
        <Section title="Your details">
          <p className="text-sm text-text-secondary">
            {service?.name} with {person?.name} ·{" "}
            {slot ? `${labelOf(dayKey)}, ${timeFmt.format(new Date(slot))}` : null}
          </p>

          <Field label="Name" value={name} onChange={setName} autoFocus />
          <Field label="Phone" value={phone} onChange={setPhone} inputMode="tel" />
          <Field label="Email (optional)" value={email} onChange={setEmail} inputMode="email" />
          <Field label="Anything we should know? (optional)" value={notes} onChange={setNotes} />

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={submit}
            disabled={pending}
            className="w-full rounded-xl py-4 text-base font-semibold transition active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
          >
            {pending ? "Booking…" : `Confirm · ${formatPaise(service?.pricePaise ?? 0)}`}
          </button>
        </Section>
      )}
    </div>
  );
}

function Header({ step, onBack }: { step: Step; onBack: () => void }) {
  if (step === "service") return null;
  return (
    <button
      onClick={onBack}
      className="-ml-1 flex items-center gap-1.5 text-sm font-medium text-text-secondary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h1>
      {children}
    </section>
  );
}

/** Touch targets are a minimum of 56px tall — this is a phone screen in a shop. */
function Row({
  title,
  subtitle,
  trailing,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  trailing?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block line-clamp-2 text-xs text-text-secondary">{subtitle}</span>
        )}
      </span>
      {trailing && (
        <span className="shrink-0 font-mono text-sm font-semibold text-text-primary">
          {trailing}
        </span>
      )}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel" | "email";
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-base text-text-primary outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
    </div>
  );
}
