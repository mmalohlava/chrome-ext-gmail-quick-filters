import {
  DEFAULT_HIDDEN_ITEMS,
  HIDDEN_ITEMS_KEY,
  hideCss,
  loadHiddenItems,
  mergeHiddenItems,
  onHiddenItemsChanged,
  saveHiddenItems,
  withSelector,
} from "../hidden_items";
import { installChromeStub } from "../test_support/chrome_stub";

describe("mergeHiddenItems", () => {
  test("defaults to nothing hidden and hiding enabled", () => {
    expect(mergeHiddenItems(undefined)).toEqual({
      selectors: [],
      enabled: true,
    });
  });

  test("keeps stored values", () => {
    expect(mergeHiddenItems({ selectors: ["a"], enabled: false })).toEqual({
      selectors: ["a"],
      enabled: false,
    });
  });
});

describe("withSelector", () => {
  test("appends a new selector and re-enables hiding", () => {
    expect(withSelector({ selectors: ["a"], enabled: false }, "b")).toEqual({
      selectors: ["a", "b"],
      enabled: true,
    });
  });

  test("does not duplicate an existing selector", () => {
    expect(withSelector({ selectors: ["a"], enabled: true }, "a")).toEqual({
      selectors: ["a"],
      enabled: true,
    });
  });
});

describe("hideCss", () => {
  test("one display:none rule per selector so a bad one can't void the rest", () => {
    expect(hideCss({ selectors: ["#a", ".b > c"], enabled: true })).toBe(
      "#a { display: none !important; }\n.b > c { display: none !important; }"
    );
  });

  test("is empty when hiding is disabled or nothing is hidden", () => {
    expect(hideCss({ selectors: ["#a"], enabled: false })).toBe("");
    expect(hideCss(DEFAULT_HIDDEN_ITEMS)).toBe("");
  });
});

describe("storage", () => {
  test("round-trips and notifies listeners", async () => {
    const stub = installChromeStub();
    const listener = jest.fn();
    onHiddenItemsChanged(listener);

    expect(await loadHiddenItems()).toEqual(DEFAULT_HIDDEN_ITEMS);
    const state = { selectors: ["#x"], enabled: false };
    await saveHiddenItems(state);

    expect(stub.store[HIDDEN_ITEMS_KEY]).toEqual(state);
    expect(await loadHiddenItems()).toEqual(state);
    expect(listener).toHaveBeenCalledWith(state);
  });
});
