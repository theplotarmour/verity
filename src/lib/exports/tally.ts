/**
 * Tally-compatible dispatch export.
 *
 * Verity does not keep ledgers — the books live in Tally or Busy. What it has
 * that they need is the dispatch record: what left, to whom, when, and for how
 * much. This turns that into a file their import understands.
 *
 * Pure, and free of `server-only`, so the column contract can be tested without
 * a database. The shape below *is* the contract: Tally's import maps on header
 * text, so renaming a column silently breaks somebody's month-end.
 */

export interface TallyRow {
  voucherDate: string;
  voucherNumber: string;
  partyName: string;
  partyGstin: string;
  address: string;
  itemName: string;
  quantity: number;
  rate: number;
  amount: number;
  narration: string;
}

/**
 * Tally's import reads these header names. They are ordered as Tally's own
 * Voucher import template orders them, which is what lets an operator import
 * without remapping columns by hand every month.
 */
export const TALLY_COLUMNS: { key: keyof TallyRow; header: string }[] = [
  { key: "voucherDate", header: "Voucher Date" },
  { key: "voucherNumber", header: "Voucher Number" },
  { key: "partyName", header: "Party Name" },
  { key: "partyGstin", header: "Party GSTIN" },
  { key: "address", header: "Address" },
  { key: "itemName", header: "Item Name" },
  { key: "quantity", header: "Quantity" },
  { key: "rate", header: "Rate" },
  { key: "amount", header: "Amount" },
  { key: "narration", header: "Narration" },
];

/**
 * Quote a single CSV field.
 *
 * The leading apostrophe on values starting with `=`, `+`, `-` or `@` is not
 * decoration: a customer named "=cmd|..." is a formula-injection payload that
 * executes when the file is opened in Excel, and this file is *going* to be
 * opened in Excel on the way to Tally. The value is preserved; only the
 * interpretation changes.
 */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  // Quote when the field contains anything the parser would otherwise act on,
  // doubling embedded quotes as CSV requires.
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Tally reads dates as DD-MM-YYYY. An ISO date silently imports as the wrong day. */
export function tallyDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
}

export function toTallyCsv(rows: TallyRow[]): string {
  const header = TALLY_COLUMNS.map((column) => csvField(column.header)).join(",");
  const body = rows.map((row) =>
    TALLY_COLUMNS.map((column) => csvField(row[column.key])).join(","),
  );
  // CRLF: Tally's importer is a Windows program and treats a bare LF as one
  // long line.
  return [header, ...body].join("\r\n") + "\r\n";
}
