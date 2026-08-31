"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  DefinitionList,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Row,
  RowList,
  Select,
} from "@/components/ui/primitives";
import { day } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Settings = Awaited<
  ReturnType<typeof import("@/server/capabilities/plywood").taxSettings.handler>
>;

/** Basis points to the percentage a person says out loud. */
function percent(bp: number): string {
  return `${(bp / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

export function TaxSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const [gstin, setGstin] = useState("");
  const [seriesPrefix, setSeriesPrefix] = useState("");
  const [registrationType, setRegistrationType] = useState("regular");

  const [hsn, setHsn] = useState("");
  const [rate, setRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/settings/tax");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {failure && (
        <ErrorState
          title="That was refused"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}

      {settings.registration ? (
        <Panel title="GST registration">
          <DefinitionList
            items={[
              { term: "GSTIN", value: settings.registration.gstin },
              {
                term: "Registration",
                value:
                  settings.registration.registrationType === "composition"
                    ? "Composition"
                    : "Regular",
              },
              // The state code is not a separate thing a person types. It is
              // the first two digits of the GSTIN, and asking for it twice
              // invites the two to disagree.
              { term: "Registered state", value: `State code ${settings.registration.stateCode}` },
              { term: "Invoice series", value: settings.registration.invoiceSeriesPrefix },
              { term: "Effective from", value: day(settings.registration.effectiveFrom) },
            ]}
          />
        </Panel>
      ) : (
        <Panel title="GST registration">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[13px] text-text-secondary">
              Invoices cannot be raised until the business is registered here. The state code is
              read from the GSTIN rather than asked for again.
            </p>
            <Field label="GSTIN" htmlFor="gstin" required hint="15 characters">
              <Input
                id="gstin"
                value={gstin}
                onChange={(event) => setGstin(event.target.value.toUpperCase())}
                placeholder="07AABCU9603R1ZX"
              />
            </Field>
            <Field label="Registration type" htmlFor="reg-type">
              <Select
                id="reg-type"
                value={registrationType}
                onChange={(event) => setRegistrationType(event.target.value)}
              >
                <option value="regular">Regular</option>
                <option value="composition">Composition</option>
              </Select>
            </Field>
            <Field
              label="Invoice series"
              htmlFor="series"
              required
              hint="The prefix printed on every tax invoice, e.g. NK/26-27/"
            >
              <Input
                id="series"
                value={seriesPrefix}
                onChange={(event) => setSeriesPrefix(event.target.value)}
              />
            </Field>
            <div>
              <Button
                variant="primary"
                disabled={pending || gstin.trim().length === 0 || seriesPrefix.trim().length === 0}
                onClick={() =>
                  run(
                    "verity.plywood.register_gst_registration",
                    {
                      gstin: gstin.trim(),
                      registrationType,
                      invoiceSeriesPrefix: seriesPrefix.trim(),
                    },
                    () => {
                      setGstin("");
                      setSeriesPrefix("");
                    },
                  )
                }
              >
                {pending ? "Registering…" : "Register"}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {settings.registration && (
        <Panel title="Add or change a rate">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[13px] text-text-secondary">
              One rate, not three. 18% is 18% whether it is collected as 9 + 9 within the state or
              as 18 across a border, and asking for three numbers invites two of them to disagree.
            </p>
            <Field label="HSN code" htmlFor="hsn" required hint="4, 6 or 8 digits">
              <Input
                id="hsn"
                value={hsn}
                onChange={(event) => setHsn(event.target.value)}
                placeholder="4412"
              />
            </Field>
            <Field label="Rate" htmlFor="rate" required hint="A percentage, e.g. 18">
              <Input
                id="rate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </Field>
            <Field
              label="Effective from"
              htmlFor="effective"
              hint="Leave blank for today. Invoices already issued keep the rate they were billed at."
            >
              <Input
                id="effective"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </Field>
            <div>
              <Button
                variant="primary"
                disabled={pending || hsn.trim().length === 0 || rate.trim().length === 0}
                onClick={() =>
                  run(
                    "verity.plywood.set_tax_rule",
                    {
                      hsnCode: hsn.trim(),
                      // The command takes basis points; a person types percent.
                      rateBp: Math.round(Number.parseFloat(rate) * 100),
                      ...(effectiveFrom
                        ? { effectiveFrom: new Date(`${effectiveFrom}T00:00:00Z`).toISOString() }
                        : {}),
                    },
                    () => {
                      setHsn("");
                      setRate("");
                      setEffectiveFrom("");
                    },
                  )
                }
              >
                {pending ? "Saving…" : "Set rate"}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      <Panel flush title="Rates">
        {settings.rules.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              compact
              title="No rates set"
              description="An invoice for an HSN with no rate is refused rather than billed at zero — a zero-rated invoice is a filing error with a paper trail."
            />
          </div>
        ) : (
          <RowList>
            {settings.rules.map((rule) => (
              <Row key={rule.id}>
                <div className="min-w-0">
                  <p className="m-0 flex items-center gap-2 text-[14px] text-text">
                    HSN {rule.hsnCode}
                    {rule.inForce ? <Badge tone="accent">In force</Badge> : <Badge>Superseded</Badge>}
                  </p>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    From {day(rule.effectiveFrom)}
                    {rule.effectiveTo ? ` until ${day(rule.effectiveTo)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular m-0 text-[14px] text-text">{percent(rule.igstRateBp)}</p>
                  <p className="m-0 text-[12px] text-text-tertiary">
                    {percent(rule.cgstRateBp)} + {percent(rule.sgstRateBp)} within the state
                  </p>
                </div>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>

      <Related
        links={[
          { href: "/settings/business", label: "Business settings", note: "Legal identity" },
          { href: "/tax", label: "Tax & Compliance" },
          { href: "/tax/exceptions", label: "Exceptions" },
        ]}
      />
    </div>
  );
}
