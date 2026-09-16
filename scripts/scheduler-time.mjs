/** Next UTC boundary for Verity's closed cadence vocabulary. */
export function nextBoundary(cadence, from = new Date()) {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  if (cadence === "frequent") next.setUTCMinutes(next.getUTCMinutes() + 1);
  else if (cadence === "hourly") next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  else if (cadence === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
  } else if (cadence === "weekly") {
    const days = ((8 - next.getUTCDay()) % 7) || 7;
    next.setUTCDate(next.getUTCDate() + days);
    next.setUTCHours(0, 0, 0, 0);
  } else throw new Error(`unknown cadence: ${cadence}`);
  return next;
}
