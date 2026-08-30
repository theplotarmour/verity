"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";

type Settings = {
  legalName: string | null;
  tradeName: string | null;
  pan: string | null;
  registeredAddress: string | null;
  financialYearStartMonth: number;
  currencyCode: string;
  gstin: string | null;
  stateCode: string | null;
  registrationType: string | null;
  invoiceSeriesPrefix: string | null;
  outstanding: string[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Two panels, because they are two different kinds of fact.
 *
 * The profile can be corrected — a business genuinely does change its trade
 * name. The registration cannot be edited once it exists: a GSTIN is not a
 * typo to fix in place, because invoices have been raised under it and
 * reported. Replacing one is a real event with a date, which is why the
 * registration form disappears once a registration exists rather than becoming
 * an edit form that quietly rewrites tax history.
 */
export function BusinessSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(key: string, input: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const result = await runCommand(key, input);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {settings.outstanding.length > 0 && (
        <Panel title="Set up this business">
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {settings.outstanding.map((step) => (
              <li key={step} className="flex items-center gap-3 text-text-secondary">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-text-tertiary"
                />
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 mb-0 text-[13px] text-text-tertiary">
            Invoices cannot be raised until the tax registration exists — the place of
            supply decides the tax, and it is decided against this registration.
          </p>
        </Panel>
      )}

      {error && (
        <p role="alert" className="m-0 text-[14px] text-semantic-danger">
          {error}
        </p>
      )}

      <Panel title="Business details">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const text = (name: string) => String(data.get(name) ?? "").trim();
            submit("verity.plywood.set_business_profile", {
              legalName: text("legalName"),
              tradeName: text("tradeName") || undefined,
              pan: text("pan").toUpperCase() || undefined,
              registeredAddress: text("registeredAddress") || undefined,
              financialYearStartMonth: Number(data.get("financialYearStartMonth")),
              currencyCode: text("currencyCode") || "INR",
            });
          }}
        >
          <Field htmlFor="legalName" label="Legal name" hint="The name on the tax document.">
            <Input id="legalName" name="legalName" required defaultValue={settings.legalName ?? ""} />
          </Field>
          <Field htmlFor="tradeName" label="Trade name" hint="If the sign outside says something else.">
            <Input id="tradeName" name="tradeName" defaultValue={settings.tradeName ?? ""} />
          </Field>
          <Field htmlFor="pan" label="PAN">
            <Input
              id="pan" name="pan"
              defaultValue={settings.pan ?? ""}
              placeholder="AAAAA0000A"
              maxLength={10}
            />
          </Field>
          <Field htmlFor="registeredAddress" label="Registered address">
            <Input id="registeredAddress" name="registeredAddress" defaultValue={settings.registeredAddress ?? ""} />
          </Field>
          <Field
            htmlFor="financialYearStartMonth"
            label="Financial year starts"
            hint="April in India. Invoice numbering and every period boundary follow it."
          >
            <Select id="financialYearStartMonth" name="financialYearStartMonth" defaultValue={String(settings.financialYearStartMonth)}>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="currencyCode" label="Currency">
            <Input id="currencyCode" name="currencyCode" defaultValue={settings.currencyCode} maxLength={3} />
          </Field>
          <div>
            <Button type="submit" disabled={pending}>
              {settings.legalName ? "Save business details" : "Save and continue"}
            </Button>
          </div>
        </form>
      </Panel>

      {settings.gstin && (
        <Panel title="Tax rates">
          <p className="mt-0 mb-3 text-[14px] text-text-secondary">
            A rate applies to an HSN code from a date. Setting a new one supersedes
            the previous rate rather than replacing it, so an invoice raised last
            month keeps the rate it was raised under.
          </p>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              submit("verity.plywood.set_tax_rule", {
                hsnCode: String(data.get("taxHsnCode") ?? "").trim(),
                // Entered as a percentage, stored as basis points. 18 becomes
                // 1800; a percentage stored as a float is a rounding error
                // waiting for a filing.
                rateBp: Math.round(Number(data.get("ratePercent")) * 100),
                authority: String(data.get("authority") ?? "").trim() || undefined,
              });
            }}
          >
            <Field htmlFor="taxHsnCode" label="HSN code" hint="4, 6 or 8 digits.">
              <Input id="taxHsnCode" name="taxHsnCode" required placeholder="4412" maxLength={8} />
            </Field>
            <Field htmlFor="ratePercent" label="Rate %" hint="18 means 9% CGST + 9% SGST, or 18% IGST.">
              <Input id="ratePercent" name="ratePercent" type="number" min="0" max="100" step="0.01" required />
            </Field>
            <Field htmlFor="authority" label="Authority" hint="The notification an auditor will ask for.">
              <Input id="authority" name="authority" placeholder="Notification 1/2017" />
            </Field>
            <Button type="submit" disabled={pending}>
              Set rate
            </Button>
          </form>
        </Panel>
      )}

      <Panel title="Tax registration">
        {settings.gstin ? (
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
            <dt className="text-text-tertiary">GSTIN</dt>
            <dd className="m-0 font-mono">{settings.gstin}</dd>
            <dt className="text-text-tertiary">Registered state</dt>
            <dd className="m-0">{settings.stateCode}</dd>
            <dt className="text-text-tertiary">Registration</dt>
            <dd className="m-0 capitalize">{settings.registrationType}</dd>
            <dt className="text-text-tertiary">Invoice series</dt>
            <dd className="m-0 font-mono">{settings.invoiceSeriesPrefix}</dd>
          </dl>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              submit("verity.plywood.register_gst_registration", {
                gstin: String(data.get("gstin") ?? "").trim().toUpperCase(),
                registrationType: String(data.get("registrationType") ?? "regular"),
                invoiceSeriesPrefix: String(data.get("invoiceSeriesPrefix") ?? "").trim(),
              });
            }}
          >
            <Field
              htmlFor="gstin"
              label="GSTIN"
              hint="The registered state is taken from the first two characters — it is never asked for separately, because a state that disagrees with the GSTIN decides the wrong tax on every invoice."
            >
              <Input id="gstin" name="gstin" required maxLength={15} placeholder="07AAAAA0000A1Z5" />
            </Field>
            <Field htmlFor="registrationType" label="Registration type">
              <Select id="registrationType" name="registrationType" defaultValue="regular">
                <option value="regular">Regular</option>
                <option value="composition">Composition</option>
              </Select>
            </Field>
            <Field htmlFor="invoiceSeriesPrefix" label="Invoice series" hint="Printed before the number, e.g. NK/26-27/0001.">
              <Input id="invoiceSeriesPrefix" name="invoiceSeriesPrefix" required placeholder="NK/" maxLength={20} />
            </Field>
            <div>
              <Button type="submit" disabled={pending}>
                Add registration
              </Button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
