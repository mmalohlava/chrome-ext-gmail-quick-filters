/**
 * Get today's date in the "Tue, Dec 24, 2024" format.
 */
export const getTodayDate = (): string => {
  const today = new Date();
  return formatDate(today);
};

/**
 * Get yesterday's date in the "Tue, Dec 24, 2024" format.
 */
export const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

/**
 * Format a Date object into "Tue, Dec 24, 2024".
 *
 * The day is intentionally NOT zero-padded ("Jul 8", not "Jul 08"): this string
 * is matched as a substring against Gmail's date `title` attribute, which uses a
 * non-padded day. Zero-padding here silently breaks highlighting on days 1–9.
 * @param date The Date object to format.
 * @returns Formatted date string.
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * A background/text/border color set applied to a highlighted date cell.
 */
export interface HighlightColors {
  bg: string;
  text: string;
  border: string;
}

/**
 * Theme-aware, high-contrast colors for highlighting today's/yesterday's emails.
 * Light text is paired with dark backgrounds (and vice versa) so the highlight
 * is clearly visible regardless of Gmail's active theme. The border is a subtle
 * edge that separates the colored chip from the surrounding UI.
 */
export const HIGHLIGHT_COLORS: {
  light: { today: HighlightColors; yesterday: HighlightColors };
  dark: { today: HighlightColors; yesterday: HighlightColors };
} = {
  light: {
    today: { bg: "#ffd54f", text: "#000000", border: "#c8a415" }, // strong amber
    yesterday: { bg: "#ef9a9a", text: "#000000", border: "#c46d6d" }, // strong red/pink
  },
  dark: {
    today: { bg: "#8d6e00", text: "#ffffff", border: "#c2a23a" }, // deep amber, light text
    yesterday: { bg: "#b71c1c", text: "#ffffff", border: "#e57373" }, // deep red, light text
  },
};

/**
 * Parse a CSS color string of the form "rgb(r, g, b)" or "rgba(r, g, b, a)"
 * (the shape returned by getComputedStyle) into its channel values.
 * @returns The parsed channels, or null for transparent/empty/unparseable input.
 */
export const parseRgb = (value: string): Rgb | null => {
  if (!value) return null;
  const match = value.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/i
  );
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
};

/**
 * Compute the sRGB relative luminance (0 = black, 1 = white) of a color.
 * Follows the WCAG definition.
 */
export const relativeLuminance = ({ r, g, b }: Rgb): number => {
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/**
 * Whether a color is dark enough that light text reads well on top of it.
 */
export const isDarkColor = (color: Rgb): boolean => relativeLuminance(color) < 0.5;
