import { Role } from '@prisma/client';

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
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
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

export type PermissionMatrix = Partial<Record<Role, Permission[]>>;

// `matrix` is the factory's saved override (Settings → Permissions). Roles the
// factory has not customised fall back to the defaults above, so a partial
// override never accidentally strips a role of everything.
export function can(
  user: { role: Role } | Role | null | undefined,
  action: Permission,
  matrix?: PermissionMatrix | null
): boolean {
  if (!user) return false;
  const role = typeof user === 'string' ? user : user.role;
  const allowed = matrix?.[role] ?? DEFAULT_ROLE_PERMISSIONS[role];
  return allowed?.includes(action) ?? false;
}

