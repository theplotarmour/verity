#!/usr/bin/env python3
"""
Model normaliser.

The canonical model is hand-authored, and prose values inside YAML flow mappings
break the parse the moment a human writes a comma, colon or question mark:

    - {key: x, note: nullable because staff onboard by phone, not email}
                                                            ^ read as a separator

Forbidding prose in the model would push detail out of the PRD, which is the
opposite of the goal. So this tool repairs the source in place instead.

Algorithm, per line containing a trailing flow mapping:
  1. `key:{` -> `key: {`
  2. Split the mapping body on `,\\s+`, then re-merge any fragment that does not
     begin with `identifier: ` back onto the previous value (that comma was prose).
  3. Fully unwrap any existing quoting on each value, then re-quote once if the
     value contains a character that would change the parse.

Step 3 makes the tool idempotent: running it twice cannot double-quote.
Exits non-zero if any model file still fails to parse.
"""
import re, sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
PAIR = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*:\s')
NEEDS_QUOTE = re.compile(r"""[,:{}\[\]#&*!|>?'"%@`]""")
RESERVED = {"true", "false", "null", "~", "yes", "no", "on", "off"}


def unwrap(v: str) -> str:
    v = v.strip()
    while len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
        v = v[1:-1].replace("''", "'")
        v = v.strip()
    return v.rstrip("'").strip() if v.endswith("'") and v.count("'") % 2 == 1 else v


def fix_flow(inner: str) -> str:
    frags, cur = [], ""
    for f in [x.strip() for x in re.split(r",\s+", inner) if x.strip() != ""]:
        if PAIR.match(f):
            if cur:
                frags.append(cur)
            cur = f
        else:
            cur = f"{cur}, {f}" if cur else f
    if cur:
        frags.append(cur)

    out = []
    for f in frags:
        if ": " not in f:
            out.append(f)
            continue
        k, v = f.split(": ", 1)
        v = unwrap(v)
        if v.startswith("[") and v.endswith("]"):
            out.append(f"{k}: {v}")
            continue
        if v.lower() in RESERVED or re.fullmatch(r"-?\d+(\.\d+)?", v):
            out.append(f"{k}: {v}")
            continue
        if NEEDS_QUOTE.search(v):
            v = "'" + v.replace("'", "''") + "'"
        out.append(f"{k}: {v}")
    return ", ".join(out)


def fix_line(line: str) -> str:
    line = re.sub(r'([A-Za-z0-9_]):\{', r'\1: {', line)
    m = re.search(r'\{(.*)\}\s*$', line)
    if not m:
        return line
    return line[:m.start(1)] + fix_flow(m.group(1)) + line[m.end(1):]


def main():
    failed = []
    for f in sorted((ROOT / "_model").rglob("*.yaml")):
        src = f.read_text()
        out = "\n".join(fix_line(l) for l in src.split("\n"))
        if out != src:
            f.write_text(out)
        try:
            yaml.safe_load(f.read_text())
            print(f"ok    {f.relative_to(ROOT)}")
        except yaml.YAMLError as e:
            failed.append(f)
            print(f"FAIL  {f.relative_to(ROOT)}\n{e}\n")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
