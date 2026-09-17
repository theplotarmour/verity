/**
 * Canonical inventory of capability-owned pages that perform direct server
 * reads. Every listed page must execute the active/dependency guard before its
 * page function starts; the conformance test enforces that source contract.
 */
export const CAPABILITY_PAGE_SURFACES = [
  { capabilityId: "verity.capability.approval", route: "/approvals", file: "src/app/(shell)/approvals/page.tsx" },
  { capabilityId: "verity.capability.asset", route: "/assets", file: "src/app/(shell)/assets/page.tsx" },
  { capabilityId: "verity.capability.asset", route: "/assets/[id]", file: "src/app/(shell)/assets/[id]/page.tsx" },
  { capabilityId: "verity.capability.evidence", route: "/evidence", file: "src/app/(shell)/evidence/page.tsx" },
  { capabilityId: "verity.capability.location", route: "/locations", file: "src/app/(shell)/locations/page.tsx" },
  { capabilityId: "verity.capability.location", route: "/locations/[id]", file: "src/app/(shell)/locations/[id]/page.tsx" },
  { capabilityId: "verity.capability.scheduling", route: "/scheduling", file: "src/app/(shell)/scheduling/page.tsx" },
  { capabilityId: "verity.capability.outreach", route: "/outreach", file: "src/app/(shell)/outreach/page.tsx" },
  { capabilityId: "verity.capability.outreach", route: "/outreach/[id]", file: "src/app/(shell)/outreach/[id]/page.tsx" },
  { capabilityId: "verity.capability.outreach", route: "/outreach/intelligence", file: "src/app/(shell)/outreach/intelligence/page.tsx" },
  { capabilityId: "verity.capability.outreach", route: "/outreach/prospects", file: "src/app/(shell)/outreach/prospects/page.tsx" },
  { capabilityId: "verity.capability.outreach", route: "/outreach/team", file: "src/app/(shell)/outreach/team/page.tsx" },
  { capabilityId: "verity.capability.outreach", route: "/outreach/workspace", file: "src/app/(shell)/outreach/workspace/page.tsx" },
] as const;

