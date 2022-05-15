import { useRef } from "react";

export function useDay() {
  const dayOffset = 19125 - 4;
  /* Needs to be a ref so we don't accidentally switch days while playing. */
  const currentDay = useRef((+new Date() / 1000 / 60 / 60 / 24) | 0);
  const todaysIndex = currentDay.current - dayOffset;
  return { dayOffset, currentDay, todaysIndex };
}
