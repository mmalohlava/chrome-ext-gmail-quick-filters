import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  FILTERS,
  mergeConfig,
  resolveConfig,
  loadConfig,
  saveConfig,
  onConfigChanged,
  FilterConfig,
} from "../config";
import { installChromeStub } from "../test_support/chrome_stub";

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

describe("FILTERS", () => {
  test("defines one filter per config key, in button order", () => {
    expect(FILTERS.map((f) => f.key)).toEqual(Object.keys(DEFAULT_CONFIG));
    expect(FILTERS.map((f) => f.label)).toEqual(["T", "Y", "S"]);
  });
});

describe("resolveConfig", () => {
  test("trims entered queries", () => {
    expect(
      resolveConfig({ today: " a ", yesterday: "b\t", snooze: "\nc" })
    ).toEqual({ today: "a", yesterday: "b", snooze: "c" });
  });

  test("falls back to defaults for blank queries", () => {
    expect(resolveConfig({ today: "", yesterday: "  ", snooze: "c" })).toEqual({
      today: DEFAULT_CONFIG.today,
      yesterday: DEFAULT_CONFIG.yesterday,
      snooze: "c",
    });
  });
});

describe("storage integration", () => {
  let stub: ReturnType<typeof installChromeStub>;

  beforeEach(() => {
    stub = installChromeStub();
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
    expect(stub.store[STORAGE_KEY]).toEqual(config);
    expect(await loadConfig()).toEqual(config);
  });

  test("onConfigChanged fires for sync changes to our key", () => {
    const cb = jest.fn();
    onConfigChanged(cb);
    stub.emitChange({ [STORAGE_KEY]: { newValue: { today: "x" } } }, "sync");
    expect(cb).toHaveBeenCalledWith({
      today: "x",
      yesterday: DEFAULT_CONFIG.yesterday,
      snooze: DEFAULT_CONFIG.snooze,
    });
  });

  test("onConfigChanged ignores other areas and keys", () => {
    const cb = jest.fn();
    onConfigChanged(cb);
    stub.emitChange({ [STORAGE_KEY]: { newValue: {} } }, "local");
    stub.emitChange({ somethingElse: { newValue: {} } }, "sync");
    expect(cb).not.toHaveBeenCalled();
  });
});
