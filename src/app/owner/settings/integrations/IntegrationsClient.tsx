"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plug, Webhook } from "lucide-react";

import { Badge, Button, Card, Input } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  addMyWebhook,
  issueMyApiKey,
  revokeMyApiKey,
  setMyWebhookActive,
} from "@/server/actions/integrations";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  signingSecret: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

type Endpoint = {
  id: string;
  name: string;
  url: string;
  secret: string;
  isActive: boolean;
  failedDeliveries: number;
};

type Delivery = {
  id: string;
  event: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  endpoint: { name: string } | null;
};

export function IntegrationsClient({
  apiKeys,
  endpoints,
  deliveries,
  ingestUrl,
}: {
  apiKeys: ApiKey[];
  endpoints: Endpoint[];
  deliveries: Delivery[];
  ingestUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [keyName, setKeyName] = useState("");
  const [hook, setHook] = useState({ name: "", url: "" });
  /** The single moment the token is visible. */
  const [issued, setIssued] = useState<{ token: string; signingSecret: string } | null>(null);

  const copy = (label: string, value: string) =>
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Could not copy"));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Plug className="h-4 w-4 text-text-tertiary" />
          <h2 className="font-display text-[15px] font-semibold text-text-primary">API keys</h2>
        </div>

        <p className="mt-3 text-[13px] text-text-secondary">
          A key lets your storefront or dealer portal post orders straight into Verity at{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px]">{ingestUrl}</code>
          . Orders arrive as drafts — nothing reaches the floor until someone here releases it.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={keyName}
            onChange={(e) => setKeyName(e.currentTarget.value)}
            placeholder="Shopify storefront"
            aria-label="Key name"
            className="flex-1"
          />
          <Button
            disabled={pending || !keyName.trim()}
            onClick={() =>
              start(async () => {
                const result = await issueMyApiKey(keyName);
                if ("error" in result && result.error) {
                  toast.error(result.error);
                  return;
                }
                if ("credentials" in result && result.credentials) {
                  setKeyName("");
                  setIssued({
                    token: result.credentials.token,
                    signingSecret: result.credentials.signingSecret,
                  });
                  router.refresh();
                }
              })
            }
          >
            <KeyRound className="h-3.5 w-3.5" />
            Issue key
          </Button>
        </div>

        {apiKeys.length > 0 ? (
          <div className="mt-4 space-y-2">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-[13px] font-semibold text-text-primary">
                    {key.name}
                    {key.revokedAt ? <Badge className="bg-surface text-text-tertiary">revoked</Badge> : null}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-text-tertiary">
                    {key.prefix}… ·{" "}
                    {key.lastUsedAt
                      ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : "never used"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => copy("Signing secret", key.signingSecret)}>
                    <Copy className="h-3 w-3" />
                    Secret
                  </Button>
                  {!key.revokedAt ? (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: `Revoke "${key.name}"?`,
                          description:
                            "Anything using this key stops working immediately, and it cannot be undone. Issue a new key instead if you are rotating.",
                          confirmLabel: "Revoke",
                          variant: "danger",
                        });
                        if (!ok) return;
                        start(async () => {
                          const result = await revokeMyApiKey(key.id);
                          if ("error" in result && result.error) toast.error(result.error);
                          else {
                            toast.success("Key revoked");
                            router.refresh();
                          }
                        });
                      }}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-text-tertiary">No keys yet.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Webhook className="h-4 w-4 text-text-tertiary" />
          <h2 className="font-display text-[15px] font-semibold text-text-primary">Webhooks</h2>
        </div>

        <p className="mt-3 text-[13px] text-text-secondary">
          We POST order milestones to your endpoint, signed so you can verify they came from us.
          Failed deliveries are retried with backoff. Endpoints must be public https addresses.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
          <Input
            value={hook.name}
            onChange={(e) => setHook({ ...hook, name: e.currentTarget.value })}
            placeholder="Order sync"
            aria-label="Endpoint name"
          />
          <Input
            value={hook.url}
            onChange={(e) => setHook({ ...hook, url: e.currentTarget.value })}
            placeholder="https://shop.example.com/hooks/verity"
            aria-label="Endpoint URL"
          />
          <Button
            disabled={pending || !hook.name.trim() || !hook.url.trim()}
            onClick={() =>
              start(async () => {
                const result = await addMyWebhook({ name: hook.name, url: hook.url });
                if ("error" in result && result.error) {
                  toast.error(result.error);
                  return;
                }
                setHook({ name: "", url: "" });
                toast.success("Endpoint added");
                router.refresh();
              })
            }
          >
            Add
          </Button>
        </div>

        {endpoints.length > 0 ? (
          <div className="mt-4 space-y-2">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-text-primary">{endpoint.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-text-tertiary">{endpoint.url}</p>
                  {endpoint.failedDeliveries > 0 ? (
                    <p className="mt-1 text-[11px] text-[var(--brand)]">
                      {endpoint.failedDeliveries} delivery
                      {endpoint.failedDeliveries === 1 ? "" : "ies"} gave up after retrying
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => copy("Endpoint secret", endpoint.secret)}>
                    <Copy className="h-3 w-3" />
                    Secret
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await setMyWebhookActive(endpoint.id, !endpoint.isActive);
                        if ("error" in result && result.error) toast.error(result.error);
                        else router.refresh();
                      })
                    }
                  >
                    {endpoint.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-text-tertiary">No endpoints configured.</p>
        )}
      </Card>

      {deliveries.length > 0 ? (
        <Card>
          <div className="border-b border-border/60 pb-3">
            <h2 className="font-display text-[15px] font-semibold text-text-primary">
              Recent deliveries
            </h2>
          </div>
          <div className="mt-3 max-h-[320px] space-y-1.5 overflow-y-auto overscroll-contain">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-[12px]"
              >
                <div className="min-w-0">
                  <span className="font-mono text-text-primary">{delivery.event}</span>
                  <span className="ml-2 text-text-tertiary">
                    {delivery.endpoint?.name ?? "—"} · {new Date(delivery.createdAt).toLocaleString()}
                  </span>
                  {delivery.lastError ? (
                    <p className="mt-0.5 truncate text-[11px] text-[var(--brand)]">{delivery.lastError}</p>
                  ) : null}
                </div>
                <span
                  className={
                    delivery.status === "DELIVERED"
                      ? "shrink-0 text-success"
                      : delivery.status === "FAILED"
                        ? "shrink-0 text-[var(--brand)]"
                        : "shrink-0 text-text-tertiary"
                  }
                >
                  {delivery.status.toLowerCase()}
                  {delivery.attempts > 1 ? ` ·${delivery.attempts}` : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Shown once — closing this is the last time the token exists anywhere. */}
      {issued ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <h2 className="font-display text-[15px] font-semibold text-text-primary">Key issued</h2>
            <p className="mt-2 text-[12px] text-[var(--warning)]">
              Copy both now. The token cannot be shown again — if you lose it, revoke and issue
              another.
            </p>
            <div className="mt-4 space-y-3">
              {[
                ["Token", issued.token],
                ["Signing secret", issued.signingSecret],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] border border-border bg-surface-2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(label, value)}
                      className="text-[11px] font-semibold text-[var(--brand)]"
                    >
                      <Copy className="mr-1 inline h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 break-all font-mono text-[12px] text-text-primary">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setIssued(null)}>Done</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
