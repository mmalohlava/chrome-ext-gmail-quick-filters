import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  mergeConfig,
  loadConfig,
  saveConfig,
  onConfigChanged,
  FilterConfig,
} from "../config";

describe("mergeConfig", () => {
  test("returns defaults when nothing stored", () => {
    expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(null)).toEqual(DEFAULT_CONFIG);
  });

  test("fills missing fields from defaults", () => {
    expect(mergeConfig({ today: "is:unread" })).toEqual({
      today: "is:unread",
      yesterday: DEFAULT_CONFIG.yesterday,
      snooze: DEFAULT_CONFIG.snooze,
    });
  });

  test("stored values override defaults", () => {
    const stored: FilterConfig = { today: "a", yesterday: "b", snooze: "c" };
    expect(mergeConfig(stored)).toEqual(stored);
  });

  test("default snooze query is label:pinned", () => {
    expect(DEFAULT_CONFIG.snooze).toBe("label:pinned");
  });
});

describe("storage integration", () => {
  let store: Record<string, unknown>;
  let changeListener: ((changes: any, area: string) => void) | undefined;

  beforeEach(() => {
    store = {};
    changeListener = undefined;
    (global as any).chrome = {
      storage: {
        sync: {
          get: (key: string, cb: (items: Record<string, unknown>) => void) =>
            cb({ [key]: store[key] }),
          set: (items: Record<string, unknown>, cb: () => void) => {
            Object.assign(store, items);
            cb();
          },
        },
        onChanged: {
          addListener: (cb: (changes: any, area: string) => void) => {
            changeListener = cb;
          },
        },
      },
    };
  });

  test("loadConfig returns defaults when storage empty", async () => {
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  test("saveConfig then loadConfig round-trips", async () => {
    const config: FilterConfig = {
      today: "is:starred",
      yesterday: "is:unread",
      snooze: "label:pinned",
    };
    await saveConfig(config);
    expect(store[STORAGE_KEY]).toEqual(config);
    expect(await loadConfig()).toEqual(config);
  });

  test("onConfigChanged fires for sync changes to our key", () => {
    const cb = jest.fn();
    onConfigChanged(cb);
    changeListener!(
      { [STORAGE_KEY]: { newValue: { today: "x" } } },
      "sync"
    );
    expect(cb).toHaveBeenCalledWith({
      today: "x",
      yesterday: DEFAULT_CONFIG.yesterday,
      snooze: DEFAULT_CONFIG.snooze,
    });
  });

  test("onConfigChanged ignores other areas and keys", () => {
    const cb = jest.fn();
    onConfigChanged(cb);
    changeListener!({ [STORAGE_KEY]: { newValue: {} } }, "local");
    changeListener!({ somethingElse: { newValue: {} } }, "sync");
    expect(cb).not.toHaveBeenCalled();
  });
});
