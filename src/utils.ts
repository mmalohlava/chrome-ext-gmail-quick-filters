/**
 * Get today's date in the "Tue, Dec 24, 2024, 1:36 PM" format.
 */
export const getTodayDate = (): string => {
  const today = new Date();
  return formatDate(today);
};

/**
 * Get yesterday's date in the "Tue, Dec 24, 2024, 1:36 PM" format.
 */
export const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

/**
 * Format a Date object into "Tue, Dec 24, 2024, 1:36 PM".
 * @param date The Date object to format.
 * @returns Formatted date string.
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};
