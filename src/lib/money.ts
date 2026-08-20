/**
 * Money formatting for the paise-denominated side of the platform.
 *
 * Appointments (and the dining models before them) store integer paise, because
 * a float rupee that has been through three arithmetic steps stops summing to
 * the number on the bill. Rendering is the only place that converts.
 *
 * Display only. Never parse the output back into a number.
 */

/** Paise to "₹249". */
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
