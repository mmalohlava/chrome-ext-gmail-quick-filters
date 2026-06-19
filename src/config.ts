/**
 * Persistent, user-editable Gmail search queries for the "T" / "Y" filter
 * buttons. Stored in chrome.storage.sync so the configuration follows the user
 * across devices.
 */
export interface FilterConfig {
  today: string;
  yesterday: string;
}

// Exclude noisy automated senders (GitHub notifications and Google Calendar
// invites/notifications) and the LISTS/privacy-atlas label from the default
// quick filters.
const EXCLUDE_NOISE =
  "-from:github.com -from:calendar-notification@google.com -label:LISTS/privacy-atlas";

export const DEFAULT_CONFIG: FilterConfig = {
  today: `newer_than:1d ${EXCLUDE_NOISE}`,
  yesterday: `newer_than:2d older_than:1d ${EXCLUDE_NOISE}`,
};

export const STORAGE_KEY = "filterConfig";

/**
 * Merge stored (possibly partial) values onto the defaults so a missing or
 * partially-written config still yields a complete, valid FilterConfig.
 */
export const mergeConfig = (stored?: Partial<FilterConfig> | null): FilterConfig => ({
  ...DEFAULT_CONFIG,
  ...(stored ?? {}),
});

/**
 * Load the saved configuration, falling back to defaults for any missing field.
 */
export const loadConfig = (): Promise<FilterConfig> =>
  new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (items) => {
      resolve(mergeConfig(items?.[STORAGE_KEY] as Partial<FilterConfig>));
    });
  });

/**
 * Persist the configuration.
 */
export const saveConfig = (config: FilterConfig): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: config }, () => resolve());
  });

/**
 * Subscribe to configuration changes (e.g. edited in another Gmail tab) so the
 * buttons stay in sync without a reload.
 */
export const onConfigChanged = (callback: (config: FilterConfig) => void): void => {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      callback(mergeConfig(changes[STORAGE_KEY].newValue as Partial<FilterConfig>));
    }
  });
};
