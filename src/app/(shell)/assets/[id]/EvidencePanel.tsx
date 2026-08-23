"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button, ErrorState, Field, Input, SectionHeading, Select, Surface,
} from "@/components/ui/primitives";
import { runCommand, type ActionFailure } from "@/server/actions/platform";

/**
 * Evidence attached to a record (§21).
 *
 * Immutability is shown, not merely enforced: evidence rows carry no edit or
 * delete control anywhere in the interface, because the platform refuses those
 * operations at the database. Offering a control the backend rejects would
 * teach users to distrust the interface.
 *
 * The geofence verdict is displayed as recorded at capture time. It is a
 * historical fact, not a live computation, so a fence moved afterwards does not
 * change what this says.
 */
export function EvidencePanel({
  assetId,
  canCapture,
  evidence,
}: {
  assetId: string;
  canCapture: boolean;
  evidence: Array<{
    id: string;
    kind: string;
    capturedAt: string;
    withinFence: boolean | null;
    uri: string | null;
  }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section>
      <SectionHeading note="Immutable once recorded">Evidence</SectionHeading>

      <Surface className="p-1">
        {evidence.length === 0 ? (
          <p className="text-text-secondary px-4 py-6 m-0">
            No evidence captured against this asset.
          </p>
        ) : (
          <ul className="list-none m-0 p-0">
            {evidence.map((item) => (
              <li key={item.id} className="px-4 py-3 border-b border-line last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-text font-medium">{item.kind}</span>
                  <time dateTime={item.capturedAt} className="text-[13px] text-text-tertiary tabular shrink-0">
                    {item.capturedAt.replace("T", " ").slice(0, 16)}
                  </time>
                </div>
                <p className="text-[13px] text-text-secondary m-0 mt-0.5">
                  {item.withinFence === null
                    ? "No geofence evaluated at capture"
                    : item.withinFence
                      ? "Inside the geofence at capture time"
                      : "Outside the geofence at capture time"}
                  {item.uri ? ` · ${item.uri}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      {canCapture && !open && (
        <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
          Capture evidence
        </Button>
      )}

      {canCapture && open && (
        <form
          className="mt-3 bg-surface rounded-lg p-4 flex flex-col gap-4 max-w-md"
          action={(formData) => {
            setFailure(null);
            startTransition(async () => {
              const kind = String(formData.get("kind") ?? "Reading");
              const lat = formData.get("latitude");
              const lng = formData.get("longitude");

              const result = await runCommand(
                "verity.evidence.capture",
                {
                  entityKey: "verity.asset.asset",
                  entityId: assetId,
                  kind,
                  uri: String(formData.get("uri") ?? "") || undefined,
                  latitude: lat ? Number(lat) : undefined,
                  longitude: lng ? Number(lng) : undefined,
                  capturedAt: new Date().toISOString(),
                },
                `/assets/${assetId}`,
              );
              if (result.ok) {
                setOpen(false);
                router.refresh();
              } else {
                setFailure(result);
              }
            });
          }}
        >
          {failure && (
            <ErrorState
              title="Could not capture evidence"
              message={failure.message}
              issues={failure.issues}
              retryable={failure.retryable}
            />
          )}

          <Field label="Kind" htmlFor="kind" required>
            <Select id="kind" name="kind" defaultValue="Reading">
              <option value="Reading">Reading</option>
              <option value="GeoPoint">Geo point</option>
              <option value="Photo">Photo</option>
              <option value="Document">Document</option>
              <option value="Signature">Signature</option>
            </Select>
          </Field>

          <Field label="Artefact reference" htmlFor="uri" hint="Required for a photo or document.">
            <Input id="uri" name="uri" placeholder="storage://…" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" htmlFor="latitude">
              <Input id="latitude" name="latitude" type="number" step="any" />
            </Field>
            <Field label="Longitude" htmlFor="longitude">
              <Input id="longitude" name="longitude" type="number" step="any" />
            </Field>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Capturing…" : "Capture"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
