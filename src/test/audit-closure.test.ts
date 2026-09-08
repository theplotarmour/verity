import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandAccessProvider, CommandButton } from "@/components/ui/CommandAccess";
import { sharedRateLimit } from "@/server/platform/shared-rate-limit";
import { installCapabilities } from "@/server/capabilities/registry";
import { installAdministration } from "@/server/platform/administration";
import { listCommands } from "@/server/platform/command";

it("shares atomic quotas across concurrent callers and keeps identities separate", async () => {
  const key = randomUUID();
  const results = await Promise.all(Array.from({ length: 15 }, () => sharedRateLimit(key, "chat")));
  expect(results.filter((r) => r.allowed)).toHaveLength(10);
  expect(results.filter((r) => !r.allowed).every((r) => r.retryAfterSeconds > 0)).toBe(true);
  expect((await sharedRateLimit(randomUUID(), "chat")).allowed).toBe(true);
  expect((await sharedRateLimit(key, "command")).allowed).toBe(true);
});

describe("permission-aware action controls", () => {
  it("hides forbidden mutations on the initial server render", () => {
    // createElement keeps this test in the project's .test.ts discovery pattern.
    /* eslint-disable react/no-children-prop */
    const button = createElement(CommandButton, { commands: "verity.trading.edit_supplier", children: "Edit supplier" });
    expect(renderToStaticMarkup(createElement(CommandAccessProvider, { commandKeys: [], children: button }))).toBe("");
    expect(renderToStaticMarkup(createElement(CommandAccessProvider, {
      commandKeys: ["verity.trading.edit_supplier"], children: button,
    }))).toContain("Edit supplier");
  });

  it("every declared UI command resolves in the installed registry", () => {
    installCapabilities();
    installAdministration();
    const keys = new Set(listCommands().map((c) => c.key));
    function visit(path: string) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (file.endsWith(".tsx")) {
          const source = readFileSync(file, "utf8");
          for (const match of source.matchAll(/commands=\{([^}]+)\}/g)) {
            for (const command of match[1]!.matchAll(/"(verity\.[\w.]+)"/g)) {
              expect(keys.has(command[1]!), `${file}: ${command[1]}`).toBe(true);
            }
          }
        }
      }
    }
    visit("src/app/(shell)");
  });
});
