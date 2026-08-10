/**
 * Phone number comparison.
 *
 * Every number this app *stores* is the 10-digit national form: each input
 * strips non-digits and slices to 10 (`src/app/client.tsx`, `team.ts`,
 * `employee.ts`, `hq.ts`), and login looks accounts up by that exact string.
 *
 * Numbers that arrive from *outside* the app — an operator typing an
 * environment variable by hand — carry whatever form a human writes:
 * `+91 70114 40350`, `091-7011440350`, `917011440350`. Stripping non-digits is
 * not enough to make those equal to `7011440350`, and comparing the stripped
 * strings is how a correctly-configured allowlist silently matches nobody.
 */

/**
 * Canonical comparison key for a phone number: the last 10 digits.
 *
 * Any country/trunk prefix is dropped, because the stored side never has one.
 * Numbers shorter than 10 digits are returned as-is so a malformed entry still
 * compares exactly rather than against a suffix of a real number.
 */
export function phoneKey(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** True when two numbers are the same number, whatever form each was written in. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = phoneKey(a);
  return left.length > 0 && left === phoneKey(b);
}

/**
 * Parse a comma-separated list of phone numbers into comparison keys.
 * Blank and non-numeric entries are dropped, so a trailing comma or a stray
 * space is not an entry that matches everything.
 */
export function parsePhoneList(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map(phoneKey)
    .filter((entry) => entry.length > 0);
}
