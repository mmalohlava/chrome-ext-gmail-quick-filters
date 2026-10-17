/**
 * Pick the message the reader is currently in: the last one whose sender header
 * has scrolled above the top of the reading pane.
 * @param headerTops Viewport `top` of each message's sender header, in thread order.
 * @param paneTop Viewport `top` of the scrolling reading pane.
 * @returns Index into `headerTops`, or null while no header has scrolled away.
 */
export const pickCurrentMessage = (
  headerTops: number[],
  paneTop: number
): number | null => {
  let current: number | null = null;
  headerTops.forEach((top, i) => {
    if (top < paneTop) current = i;
  });
  return current;
};

/**
 * Format a sender as "Name <address>", collapsing to whichever part is present
 * (or just the address when Gmail uses the address as the display name).
 */
export const formatSender = (
  name: string | null | undefined,
  email: string | null | undefined
): string => {
  const n = (name ?? "").trim();
  const e = (email ?? "").trim();
  if (!n || n === e) return e;
  if (!e) return n;
  return `${n} <${e}>`;
};
