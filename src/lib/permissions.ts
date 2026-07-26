import { SystemRole } from '@prisma/client';

/**
 * @deprecated Superseded by the module-contributed permission registry in
 * `@/platform/rbac/permissions`, which supports custom roles and lets modules
 * add permissions without editing this file.
 *
 * Still live because seven call sites read it. Do not add permissions here —
 * add them to the owning module in `@/platform/modules/registry`. `LEGACY_KEY_MAP`
 * below is the single mapping between the two vocabularies; keep it exhaustive
 * so the old and new systems can never disagree about what a check means.
 *
 * Removal plan: migrate the seven call sites to `requirePermission`, then
 * delete this file.
 */
export type Permission = 
  | 'ACCESS_BILLING'
  | 'ACCESS_SETTINGS'
  | 'ACCESS_BRANDING'
  | 'ACCESS_MASTER_DATA'
  | 'CREATE_ORDER'
  | 'DELETE_ORDER'
  | 'MANAGE_TEAM'
  | 'ASSIGN_ROLES'
  | 'TRANSFER_OWNERSHIP'
  | 'EXPORT_REPORTS'
  | 'VIEW_DASHBOARD'
  | 'VIEW_REPORTS'
  | 'QC_QUEUE'
  | 'INSPECT_CHECKPOINT'
  | 'WORKER_JOBS';

export const ALL_PERMISSIONS: Permission[] = [
  'ACCESS_BILLING',
  'ACCESS_SETTINGS',
  'ACCESS_BRANDING',
  'ACCESS_MASTER_DATA',
  'CREATE_ORDER',
  'DELETE_ORDER',
  'MANAGE_TEAM',
  'ASSIGN_ROLES',
  'TRANSFER_OWNERSHIP',
  'EXPORT_REPORTS',
  'VIEW_DASHBOARD',
  'VIEW_REPORTS',
  'QC_QUEUE',
  'INSPECT_CHECKPOINT',
  'WORKER_JOBS',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  ACCESS_BILLING: 'Billing',
  ACCESS_SETTINGS: 'Settings',
  ACCESS_BRANDING: 'Branding',
  ACCESS_MASTER_DATA: 'Master Data',
  CREATE_ORDER: 'Create production',
  DELETE_ORDER: 'Delete production',
  MANAGE_TEAM: 'Manage team',
  ASSIGN_ROLES: 'Assign roles',
  TRANSFER_OWNERSHIP: 'Transfer ownership',
  EXPORT_REPORTS: 'Export reports',
  VIEW_DASHBOARD: 'View dashboard',
  VIEW_REPORTS: 'View reports',
  QC_QUEUE: 'QC queue',
  INSPECT_CHECKPOINT: 'Inspect checkpoints',
  WORKER_JOBS: 'Worker jobs',
};

// A factory may override these from Settings; they are the fallback whenever a
// role has no stored entry.
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  OWNER: [
    'ACCESS_BILLING',
    'ACCESS_SETTINGS',
    'ACCESS_BRANDING',
    'ACCESS_MASTER_DATA',
    'CREATE_ORDER',
    'DELETE_ORDER',
    'MANAGE_TEAM',
    'ASSIGN_ROLES',
    'TRANSFER_OWNERSHIP',
    'EXPORT_REPORTS',
    'VIEW_DASHBOARD',
    'VIEW_REPORTS',
    'QC_QUEUE',
    'INSPECT_CHECKPOINT',
    'WORKER_JOBS'
  ],
  CO_OWNER: [
    'ACCESS_BILLING',
    'ACCESS_SETTINGS',
    'ACCESS_BRANDING',
    'ACCESS_MASTER_DATA',
    'CREATE_ORDER',
    'DELETE_ORDER',
    'MANAGE_TEAM',
    'ASSIGN_ROLES',
    'TRANSFER_OWNERSHIP',
    'EXPORT_REPORTS',
    'VIEW_DASHBOARD',
    'VIEW_REPORTS',
    'QC_QUEUE',
    'INSPECT_CHECKPOINT',
    'WORKER_JOBS'
  ],
  MANAGER: [
    'CREATE_ORDER',
    'MANAGE_TEAM',
    'ASSIGN_ROLES',
    'VIEW_DASHBOARD',
    'VIEW_REPORTS',
    'QC_QUEUE'
  ],
  // A supervisor runs a department. When that department is QC, this is the role
  // that inspects — so QC/inspection permissions live here, not on a separate
  // inspector role.
  SUPERVISOR: [
    'QC_QUEUE',
    'INSPECT_CHECKPOINT',
    'VIEW_DASHBOARD',
    'MANAGE_TEAM',
    'WORKER_JOBS'
  ],
  WORKER: [
    'WORKER_JOBS'
  ],
  // Store manager: books customer (on-ordered) productions only. They cannot
  // create stock productions and cannot release drafts to production — that is
  // gated to manager/owner in releaseDrafts.
  STORE_MANAGER: [
    'CREATE_ORDER',
    'VIEW_DASHBOARD'
  ]
};

export type PermissionMatrix = Partial<Record<SystemRole, Permission[]>>;

// `matrix` is the factory's saved override (Settings → Permissions). Roles the
// factory has not customised fall back to the defaults above, so a partial
// override never accidentally strips a role of everything.
export function can(
  user: { role: SystemRole } | SystemRole | null | undefined,
  action: Permission,
  matrix?: PermissionMatrix | null
): boolean {
  if (!user) return false;
  const role = typeof user === 'string' ? user : user.role;
  const allowed = matrix?.[role] ?? DEFAULT_ROLE_PERMISSIONS[role];
  return allowed?.includes(action) ?? false;
}


/**
 * Bridge between the legacy permission vocabulary and the module registry keys.
 *
 * Exhaustive by construction: `Record<Permission, string>` means adding a
 * legacy permission without mapping it is a compile error. That is what stops
 * the two systems drifting while both exist.
 */
export const LEGACY_KEY_MAP: Record<Permission, string> = {
  ACCESS_BILLING: 'billing.access',
  ACCESS_SETTINGS: 'settings.access',
  ACCESS_BRANDING: 'branding.access',
  ACCESS_MASTER_DATA: 'master_data.access',
  CREATE_ORDER: 'sales_order.create',
  DELETE_ORDER: 'sales_order.delete',
  MANAGE_TEAM: 'team.manage',
  ASSIGN_ROLES: 'team.assign_roles',
  TRANSFER_OWNERSHIP: 'org.transfer_ownership',
  EXPORT_REPORTS: 'reports.export',
  VIEW_DASHBOARD: 'dashboard.view',
  VIEW_REPORTS: 'reports.view',
  QC_QUEUE: 'quality.queue',
  INSPECT_CHECKPOINT: 'quality.inspect',
  WORKER_JOBS: 'production.jobs',
};

/** Reverse lookup, for reading a registry key back into the legacy UI. */
export const KEY_TO_LEGACY: Record<string, Permission> = Object.fromEntries(
  Object.entries(LEGACY_KEY_MAP).map(([legacy, key]) => [key, legacy as Permission]),
) as Record<string, Permission>;
