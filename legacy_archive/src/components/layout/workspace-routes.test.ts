import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Detail routes use the two-pane workspace.
 *
 * The point of the layout is that the queue stays on screen while you open one
 * record after another — a full-page navigation per record loses your place in
 * the list every time. A detail route that renders bare content still *works*,
 * which is exactly why this drifts: nothing breaks, the screen just quietly
 * behaves like the old one.
 *
 * The list is explicit rather than discovered, because not every `[id]` route
 * belongs in a queue: the inspection runner is a focused single task, and
 * wrapping it in a list of other inspections would be noise.
 */

const OWNER = path.resolve(__dirname, "../../app/owner");

const QUEUE_ROUTES = ["helpdesk", "projects", "assets", "billing", "sites"];

describe("two-pane detail routes", () => {
  it.each(QUEUE_ROUTES)("%s/[id] renders inside a Workspace", (route) => {
    const file = path.join(OWNER, route, "[id]", "page.tsx");
    expect(existsSync(file), `${route}/[id]/page.tsx is missing`).toBe(true);

    const source = readFileSync(file, "utf8");
    expect(source, `${route} detail should mount <Workspace>`).toMatch(/<Workspace\b/);
    expect(source, `${route} detail should supply a queue`).toMatch(/<QueuePane\b/);
    // Without selectedId the pane cannot mark the current row, and on mobile the
    // detail never shows.
    expect(source, `${route} should pass selectedId`).toMatch(/selectedId=/);
    // The mobile back affordance needs somewhere to go.
    expect(source, `${route} should pass backHref`).toMatch(/backHref=/);
  });

  it("loads the queue and the record together, not one after the other", () => {
    // Two sequential awaits doubles the round trips on the slowest connection
    // this app runs on.
    for (const route of QUEUE_ROUTES) {
      const source = readFileSync(path.join(OWNER, route, "[id]", "page.tsx"), "utf8");
      expect(source, `${route} should Promise.all the two loads`).toMatch(/Promise\.all\(/);
    }
  });

  it("keeps the workspace one pane on a phone", () => {
    // Rendering both and hiding one with CSS ships two copies of every detail
    // query to the device least able to afford it.
    const source = readFileSync(path.resolve(__dirname, "Workspace.tsx"), "utf8");
    expect(source).toMatch(/hasSelection \? "flex" : "hidden lg:flex"/);
    expect(source).toMatch(/hidden lg:flex/);
  });
});
