"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, RotateCcw } from "lucide-react";
import { SystemRole } from "@prisma/client";
import { Button } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  type Permission,
  type PermissionMatrix,
} from "@/lib/permissions";
import { savePermissionMatrix } from "@/server/actions/permissions";
import { scopeLegacyPermissions } from "@/platform/modules/permission-scope";
import type { ModuleKey } from "@/platform/modules/registry";

const ROLES = Object.keys(DEFAULT_ROLE_PERMISSIONS) as SystemRole[];
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  CO_OWNER: "Co-owner",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  STORE_MANAGER: "Store Manager",
  WORKER: "Worker",
};

export function PermissionMatrixCard({
  saved,
  enabledModules,
}: {
  saved: PermissionMatrix;
  /**
   * Modules this tenant is entitled to. Omitted means unknown, and every
   * permission shows — the same degradation the nav uses, because stripping an
   * owner's ability to configure roles is worse than showing one extra row.
   */
  enabledModules?: ModuleKey[];
}) {
  const router = useRouter();

  /**
   * Only permissions belonging to active modules.
   *
   * A row for a module the tenant does not have is a switch that does nothing,
   * and it implies the feature merely needs enabling — so an owner grants
   * "Perform inspections" and then cannot find the QC queue.
   *
   * Grants already saved against an inactive module are **kept**, not stripped:
   * disabling Billing for a month must not silently cost everyone their invoice
   * access when it comes back.
   */
  const permissions = scopeLegacyPermissions(ALL_PERMISSIONS, enabledModules);
  const hiddenCount = ALL_PERMISSIONS.length - permissions.length;
  const [matrix, setMatrix] = useState<PermissionMatrix>(() => {
    const initial: PermissionMatrix = {};
    for (const role of ROLES) initial[role] = saved[role] ?? DEFAULT_ROLE_PERMISSIONS[role];
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (role: SystemRole, permission: Permission) => {
    // The owner role is deliberately not editable — it's the lockout guard.
    if (role === "OWNER") return;
    setMatrix((prev) => {
      const current = prev[role] ?? [];
      const next = current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission];
      return { ...prev, [role]: next };
    });
  };

  const reset = () => {
    const defaults: PermissionMatrix = {};
    for (const role of ROLES) defaults[role] = [...DEFAULT_ROLE_PERMISSIONS[role]];
    setMatrix(defaults);
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await savePermissionMatrix(matrix);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Permissions saved");
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-border bg-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Role Permissions</h2>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Which modules each role can reach. Owner is fixed so the factory can never lock itself out.
          </p>
          {/* Say that rows are hidden rather than leaving the list mysteriously
              short — an owner comparing notes with another tenant should know
              why their matrix differs. */}
          {hiddenCount > 0 ? (
            <p className="mt-1 text-[11px] text-text-tertiary">
              {hiddenCount} permission{hiddenCount === 1 ? "" : "s"} hidden — the module
              {hiddenCount === 1 ? " it belongs" : "s they belong"} to {hiddenCount === 1 ? "is" : "are"} not
              active on this workspace.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to defaults
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save permissions"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-bold text-text-tertiary uppercase tracking-wider text-[10px] sticky left-0 bg-surface">
                Permission
              </th>
              {ROLES.map((role) => (
                <th key={role} className="py-2 px-2 font-bold text-text-tertiary uppercase tracking-wider text-[10px] text-center whitespace-nowrap">
                  {ROLE_LABELS[role] ?? role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 font-medium text-text-primary whitespace-nowrap sticky left-0 bg-surface">
                  {PERMISSION_LABELS[permission]}
                </td>
                {ROLES.map((role) => {
                  const locked = role === "OWNER";
                  const checked = (matrix[role] ?? []).includes(permission);
                  return (
                    <td key={role} className="py-2 px-2 text-center">
                      {locked ? (
                        <Lock className="h-3.5 w-3.5 text-text-tertiary inline" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(role, permission)}
                          aria-label={`${PERMISSION_LABELS[permission]} for ${ROLE_LABELS[role] ?? role}`}
                          className="h-4 w-4 rounded border-border accent-[var(--brand)] cursor-pointer"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
