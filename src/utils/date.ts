import dayjs from "dayjs";
import type { ConfigType } from "dayjs";

// Format "date" to local time. Fall back to "-" if it is invalid.
export const formatDateToLocal = (date?: ConfigType) => {
  const fallback = "-";

  // Fall back if it is null/undefined/emptystr
  if (date === null || date === undefined || date === "") return fallback;

  const d = dayjs(date);

  // Fall back if it is invalid
  if (!d.isValid()) {
    return fallback; 
  }

  return d.format("YYYY/MM/DD HH:mm:ss");
};