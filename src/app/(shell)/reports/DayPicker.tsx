"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";

/**
 * Which day to report on.
 *
 * The date is in the URL rather than in component state, so a manager can send
 * "look at the 14th" to someone else as a link, and a reload does not silently
 * jump back to today.
 */
export function DayPicker({ day }: { day: string }) {
  const router = useRouter();

  function shift(days: number) {
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    router.push(`/reports?day=${date.toISOString().slice(0, 10)}`);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={(formData) => router.push(`/reports?day=${String(formData.get("day") ?? day)}`)}
    >
      <div className="w-[190px]">
        <Field label="Service day" htmlFor="day">
          <Input id="day" name="day" type="date" defaultValue={day} key={day} />
        </Field>
      </div>
      <Button type="submit" variant="primary">
        Show
      </Button>
      <Button type="button" onClick={() => shift(-1)}>
        Previous day
      </Button>
      <Button type="button" onClick={() => shift(1)}>
        Next day
      </Button>
    </form>
  );
}
