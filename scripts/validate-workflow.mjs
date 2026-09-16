import { readFile } from "node:fs/promises";
import { parseDocument } from "yaml";

const workflowPath = new URL("../.github/workflows/verify.yml", import.meta.url);
const source = await readFile(workflowPath, "utf8");
const document = parseDocument(source, { uniqueKeys: true });

if (document.errors.length > 0) {
  for (const error of document.errors) console.error(error.message);
  process.exitCode = 1;
} else {
  console.log("verify.yml is valid YAML with unique mapping keys");
}
