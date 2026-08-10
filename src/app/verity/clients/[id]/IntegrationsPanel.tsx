"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plug, Webhook } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  addWebhookEndpoint,
  issueApiKey,
  revokeApiKey,
  setWebhookEndpointActive,
} from "@/server/actions/hq";
import { HqButton, HqCard, HqDialog, HqField, HqInput } from "../../ui";

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  signingSecret: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  failedDeliveries: number;
};

/**
 * Integration credentials for one tenant.
 *
 * Lives in the operator console rather than the tenant's own settings: a key
 * here can write production work, and that is not a self-service control. It is
 * set up once during onboarding by whoever is wiring the storefront up.
 */
export function IntegrationsPanel({
  factoryId,
  apiKeys,
  webhooks,
}: {
  factoryId: string;
  apiKeys: ApiKeyRow[];
  webhooks: WebhookRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [naming, setNaming] = useState(false);
  const [keyName, setKeyName] = useState("");
  /** The one and only time the token is visible. */
  const [issued, setIssued] = useState<{ token: string; signingSecret: string } | null>(null);

  const [addingHook, setAddingHook] = useState(false);
  const [hook, setHook] = useState({ name: "", url: "" });

  function copy(label: string, value: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Could not copy"));
  }

  function createKey() {
    start(async () => {
      const result = await issueApiKey(factoryId, keyName);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("credentials" in result && result.credentials) {
        setNaming(false);
        setKeyName("");
        setIssued({
          token: result.credentials.token,
          signingSecret: result.credentials.signingSecret,
        });
        router.refresh();
      }
    });
  }

  function createHook() {
    start(async () => {
      const result = await addWebhookEndpoint({ factoryId, name: hook.name, url: hook.url });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setAddingHook(false);
      setHook({ name: "", url: "" });
      toast.success("Endpoint added");
      router.refresh();
    });
  }

  return (
    <>
      <HqCard>
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white">API keys</h2>
          </div>
          <HqButton onClick={() => setNaming(true)} disabled={pending}>
            Issue key
          </HqButton>
        </div>

        <div className="divide-y divide-white/6">
          {apiKeys.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-white/40">
              No keys yet. A key is what lets this client&apos;s storefront POST orders to{" "}
              <code className="text-white/60">/api/orders/receive</code>.
            </p>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">
                    {key.name}
                    {key.revokedAt ? (
                      <span className="ml-2 rounded-full border border-white/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
                        revoked
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-white/35">
                    {key.prefix}… ·{" "}
                    {key.lastUsedAt
                      ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : "never used"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy("Signing secret", key.signingSecret)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/25"
                  >
                    <Copy className="mr-1 inline h-3 w-3" />
                    Secret
                  </button>
                  {!key.revokedAt ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: `Revoke "${key.name}"?`,
                          description:
                            "Any integration using this key stops working immediately. This cannot be undone — issue a new key instead.",
                          confirmLabel: "Revoke",
                          variant: "danger",
                        });
                        if (!ok) return;
                        start(async () => {
                          const result = await revokeApiKey(key.id);
                          if ("error" in result && result.error) toast.error(result.error);
                          else {
                            toast.success("Key revoked");
                            router.refresh();
                          }
                        });
                      }}
                      className="rounded-lg border border-red-400/25 px-2.5 py-1.5 text-[11px] text-red-300 transition hover:border-red-400/50 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </HqCard>

      <HqCard>
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white">Webhook endpoints</h2>
          </div>
          <HqButton onClick={() => setAddingHook(true)} disabled={pending}>
            Add endpoint
          </HqButton>
        </div>

        <div className="divide-y divide-white/6">
          {webhooks.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-white/40">
              No endpoints. Order milestones will be recorded but not delivered anywhere.
            </p>
          ) : (
            webhooks.map((endpoint) => (
              <div key={endpoint.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">{endpoint.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-white/35">
                    {endpoint.url}
                  </p>
                  {endpoint.failedDeliveries > 0 ? (
                    <p className="mt-1 text-[11px] text-red-300">
                      {endpoint.failedDeliveries} delivery
                      {endpoint.failedDeliveries === 1 ? "" : "ies"} gave up after retrying
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy("Endpoint secret", endpoint.secret)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/25"
                  >
                    <Copy className="mr-1 inline h-3 w-3" />
                    Secret
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await setWebhookEndpointActive(
                          endpoint.id,
                          !endpoint.isActive,
                        );
                        if ("error" in result && result.error) toast.error(result.error);
                        else router.refresh();
                      })
                    }
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/25 disabled:opacity-50"
                  >
                    {endpoint.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </HqCard>

      <HqDialog open={naming} onClose={() => setNaming(false)} title="Issue an API key">
        <div className="space-y-4">
          <HqField label="Name" hint="So it can be told apart later — and revoked without guessing.">
            <HqInput
              value={keyName}
              onChange={(e) => setKeyName(e.currentTarget.value)}
              placeholder="Shopify storefront"
            />
          </HqField>
          <p className="text-[12px] text-white/40">
            The token is shown once and stored only as a hash. If it is lost, revoke it and issue
            another — it cannot be recovered.
          </p>
          <div className="flex justify-end gap-2">
            <HqButton variant="ghost" onClick={() => setNaming(false)}>
              Cancel
            </HqButton>
            <HqButton onClick={createKey} disabled={pending || !keyName.trim()}>
              Issue
            </HqButton>
          </div>
        </div>
      </HqDialog>

      {/* Shown once. Closing this is the last time anyone sees the token. */}
      <HqDialog open={!!issued} onClose={() => setIssued(null)} title="Key issued">
        {issued ? (
          <div className="space-y-4">
            <p className="text-[12px] text-amber-200/80">
              Copy both now. The token cannot be shown again.
            </p>
            <Secret label="Token" value={issued.token} onCopy={copy} />
            <Secret label="Signing secret" value={issued.signingSecret} onCopy={copy} />
            <div className="flex justify-end">
              <HqButton onClick={() => setIssued(null)}>Done</HqButton>
            </div>
          </div>
        ) : null}
      </HqDialog>

      <HqDialog open={addingHook} onClose={() => setAddingHook(false)} title="Add webhook endpoint">
        <div className="space-y-4">
          <HqField label="Name">
            <HqInput
              value={hook.name}
              onChange={(e) => setHook({ ...hook, name: e.currentTarget.value })}
              placeholder="Storefront order sync"
            />
          </HqField>
          <HqField label="URL" hint="Must be a public https address. Private ranges are refused.">
            <HqInput
              value={hook.url}
              onChange={(e) => setHook({ ...hook, url: e.currentTarget.value })}
              placeholder="https://shop.example.com/hooks/verity"
            />
          </HqField>
          <div className="flex justify-end gap-2">
            <HqButton variant="ghost" onClick={() => setAddingHook(false)}>
              Cancel
            </HqButton>
            <HqButton onClick={createHook} disabled={pending || !hook.name.trim() || !hook.url.trim()}>
              Add
            </HqButton>
          </div>
        </div>
      </HqDialog>
    </>
  );
}

function Secret({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</span>
        <button
          type="button"
          onClick={() => onCopy(label, value)}
          className="text-[11px] text-white/60 transition hover:text-white"
        >
          <Copy className="mr-1 inline h-3 w-3" />
          Copy
        </button>
      </div>
      <p className="mt-2 break-all font-mono text-[12px] text-white">{value}</p>
    </div>
  );
}
