/**
 * Runs a seed script that reaches into `src/server`.
 *
 * Those modules import `server-only`, which throws on import outside a Next
 * bundle. The test suite handles this with a vitest alias; a plain script has
 * no bundler, so the resolver is patched to the same stub before anything is
 * loaded. This is the same trick and the same justification: the marker exists
 * to stop server code reaching a browser bundle, and a CLI script is neither.
 */
const path = require("node:path");
const Module = require("node:module");

const stub = path.resolve(__dirname, "server-only-stub.cjs");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return stub;
  return resolve.call(this, request, ...rest);
};

require("tsx/cjs");

// The script name is consumed here, so the script itself sees its own
// arguments at the usual offsets rather than one place to the right.
const script = process.argv[2];
process.argv.splice(1, 2, path.resolve(__dirname, script));
require(path.resolve(__dirname, script));
