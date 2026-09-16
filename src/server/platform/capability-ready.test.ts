import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantScopedClient } from "./tenancy";
import {
  invalidateCapabilityCache,
  requireCapabilityReady,
} from "./capability";

const TENANT = "00000000-0000-4000-8000-000000000001";
const CAPABILITY = "verity.capability.child";
const DEPENDENCY = "verity.capability.parent";

function fakeClient(
  active: string[],
  dependencies: string[],
  versions: { pinned: string | null; loaded: string } = { pinned: "1.0.0", loaded: "1.0.0" },
): TenantScopedClient {
  return {
    tenantActivation: {
      findMany: vi.fn().mockResolvedValue(active.map((capabilityId) => ({ capabilityId }))),
    },
    capabilityDefinition: {
      findUnique: vi.fn().mockResolvedValue({
        dependencies,
        version: versions.loaded,
        activations: [{ pinnedVersion: versions.pinned }],
      }),
    },
  } as unknown as TenantScopedClient;
}

describe("requireCapabilityReady", () => {
  beforeEach(() => invalidateCapabilityCache());

  it("allows an active capability when every dependency is active", async () => {
    await expect(
      requireCapabilityReady(
        fakeClient([CAPABILITY, DEPENDENCY], [DEPENDENCY]),
        TENANT,
        CAPABILITY,
      ),
    ).resolves.toBeUndefined();
  });

  it("fails closed when the capability itself is inactive", async () => {
    await expect(
      requireCapabilityReady(fakeClient([DEPENDENCY], [DEPENDENCY]), TENANT, CAPABILITY),
    ).rejects.toMatchObject({
      code: "E_CAPABILITY_INACTIVE",
    });
  });

  it("fails closed when a declared dependency is inactive", async () => {
    await expect(
      requireCapabilityReady(fakeClient([CAPABILITY], [DEPENDENCY]), TENANT, CAPABILITY),
    ).rejects.toThrow(/E_CAPABILITY_DEPENDENCY_INACTIVE/);
  });

  it("fails closed when the tenant pin differs from the loaded contract", async () => {
    await expect(
      requireCapabilityReady(
        fakeClient([CAPABILITY, DEPENDENCY], [DEPENDENCY], {
          pinned: "1.0.0",
          loaded: "2.0.0",
        }),
        TENANT,
        CAPABILITY,
      ),
    ).rejects.toMatchObject({ code: "E_CAPABILITY_VERSION_INCOMPATIBLE" });
  });

  it("fails closed when an active capability has no version pin", async () => {
    await expect(
      requireCapabilityReady(
        fakeClient([CAPABILITY], [], { pinned: null, loaded: "1.0.0" }),
        TENANT,
        CAPABILITY,
      ),
    ).rejects.toThrow(/pinned to none/);
  });
});
