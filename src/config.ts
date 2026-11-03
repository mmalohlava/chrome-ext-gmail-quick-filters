import { createSyncStore } from "./storage";

/**
 * Persistent, user-editable Gmail search queries for the "T" / "Y" filter
 * buttons. Stored in chrome.storage.sync so the configuration follows the user
 * across devices.
 */
export interface FilterConfig {
  today: string;
  yesterday: string;
  snooze: string;
}

// Exclude noisy automated senders (GitHub notifications and Google Calendar
// invites/notifications) and the LISTS/privacy-atlas label from the default
// quick filters.
const EXCLUDE_NOISE =
  "-from:github.com -from:calendar-notification@google.com -label:LISTS/privacy-atlas";

export const DEFAULT_CONFIG: FilterConfig = {
  today: `newer_than:1d ${EXCLUDE_NOISE}`,
  yesterday: `newer_than:2d older_than:1d ${EXCLUDE_NOISE}`,
  // Snoozed mail (including past-due snooze dates) is surfaced via label:pinned.
  snooze: "label:pinned",
};

export type FilterKey = keyof FilterConfig;

/**
 * A quick-filter button: its config key, one-letter label and display name
 * (used for the tooltip and the config dialog field).
 */
export interface FilterDefinition {
  key: FilterKey;
  label: string;
  name: string;
}

// Single source of truth for the filter buttons, in the order they are shown.
export const FILTERS: FilterDefinition[] = [
  { key: "today", label: "T", name: "Today's" },
  { key: "yesterday", label: "Y", name: "Yesterday's" },
  { key: "snooze", label: "S", name: "Snoozed" },
];

export const STORAGE_KEY = "filterConfig";

// Persisted so the queries follow the user across tabs and devices.
const store = createSyncStore(STORAGE_KEY, DEFAULT_CONFIG);
export const mergeConfig = store.merge;
export const loadConfig = store.load;
export const saveConfig = store.save;
export const onConfigChanged = store.onChanged;

/**
 * Turn queries entered by the user into a config: trim each one and fall back
 * to the default for any left blank.
 */
export const resolveConfig = (entered: FilterConfig): FilterConfig => {
  const config = { ...DEFAULT_CONFIG };
  FILTERS.forEach(({ key }) => {
    config[key] = entered[key].trim() || DEFAULT_CONFIG[key];
  });
  return config;
};
