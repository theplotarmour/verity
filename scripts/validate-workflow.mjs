import { readdir, readFile } from "node:fs/promises";
import { parseDocument } from "yaml";

const workflowDir = new URL("../.github/workflows/", import.meta.url);
const files = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/.test(name));
const failures = [];

for (const file of files) {
  const source = await readFile(new URL(file, workflowDir), "utf8");
  const document = parseDocument(source, { uniqueKeys: true });
  for (const error of document.errors) failures.push(`${file}: ${error.message}`);
  const workflow = document.toJS();
  for (const [jobName, job] of Object.entries(workflow?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const uses = step?.uses;
      if (typeof uses === "string" && !uses.startsWith("./") && !/@[a-f0-9]{40}$/.test(uses)) {
        failures.push(`${file}:${jobName}: action is not pinned to a full commit SHA (${uses})`);
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`${files.length} workflows are valid and all external actions are commit-pinned`);
}
