/**
 * A value persisted in chrome.storage.sync under one key, so it follows the user
 * across devices. Stored (possibly partial) values are merged onto the defaults
 * so a missing or partially-written entry still yields a complete value.
 */
export const createSyncStore = <T extends object>(key: string, defaults: T) => {
  const merge = (stored?: Partial<T> | null): T => ({
    ...defaults,
    ...(stored ?? {}),
  });

  return {
    merge,

    load: (): Promise<T> =>
      new Promise((resolve) => {
        chrome.storage.sync.get(key, (items) => {
          resolve(merge(items?.[key] as Partial<T>));
        });
      }),

    save: (value: T): Promise<void> =>
      new Promise((resolve) => {
        chrome.storage.sync.set({ [key]: value }, () => resolve());
      }),

    // Fires for changes made in any context (other tabs, devices, the popup).
    onChanged: (callback: (value: T) => void): void => {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && changes[key]) {
          callback(merge(changes[key].newValue as Partial<T>));
        }
      });
    },
  };
};
