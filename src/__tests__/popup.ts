/**
 * @jest-environment jsdom
 */
import { readFileSync } from "fs";
import { join } from "path";
import { HIDDEN_ITEMS_KEY, START_HIDE_PICKER } from "../hidden_items";
import { HIDDEN_PROFILES_KEY } from "../hidden_profiles";
import { flushPromises, installChromeStub } from "../test_support/chrome_stub";

const GMAIL_TAB = { id: 7, url: "https://mail.google.com/mail/u/0/#inbox" };

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const hideButton = () => byId<HTMLButtonElement>("hideItems");
const applyToggle = () => byId<HTMLInputElement>("applyHidden");
const resetButton = () => byId<HTMLButtonElement>("resetHidden");

// The real popup markup, so tests and popup.html can't drift apart.
const POPUP_BODY = readFileSync(
  join(__dirname, "../../public/popup.html"),
  "utf8"
).match(/<body>([\s\S]*)<\/body>/)![1];

const openPopup = async (
  tab: { id: number; url?: string },
  stored?: unknown,
  profiles?: unknown
) => {
  jest.resetModules();
  const stub = installChromeStub();
  if (stored) stub.store[HIDDEN_ITEMS_KEY] = stored;
  if (profiles) stub.store[HIDDEN_PROFILES_KEY] = profiles;
  stub.chrome.tabs.query.mockResolvedValue([tab]);
  stub.chrome.tabs.sendMessage.mockResolvedValue(undefined);
  (window as any).close = jest.fn();
  document.body.innerHTML = POPUP_BODY; // scripts in it are not executed
  require("../popup");
  await flushPromises();
  return stub;
};

test("on Gmail, Hide Distracting Items starts the picker and closes", async () => {
  const stub = await openPopup(GMAIL_TAB);
  expect(hideButton().disabled).toBe(false);
  hideButton().click();
  await flushPromises();
  expect(stub.chrome.tabs.sendMessage).toHaveBeenCalledWith(7, {
    type: START_HIDE_PICKER,
  });
  expect(window.close).toHaveBeenCalled();
});

test("off Gmail, the picker is disabled with a notice", async () => {
  await openPopup({ id: 1, url: undefined });
  expect(hideButton().disabled).toBe(true);
  expect(byId("popupNotice").hidden).toBe(false);
});

test("asks to reload Gmail when its content script is not there", async () => {
  const stub = await openPopup(GMAIL_TAB);
  stub.chrome.tabs.sendMessage.mockRejectedValue(new Error("no receiver"));
  hideButton().click();
  await flushPromises();
  expect(window.close).not.toHaveBeenCalled();
  expect(byId("popupNotice").textContent).toMatch(/reload/i);
});

test("shows the hidden count and apply state", async () => {
  await openPopup(GMAIL_TAB, { selectors: ["#a", "#b", "#c"], enabled: false });
  expect(byId("hiddenCount").textContent).toBe("Apply hidden items (3)");
  expect(applyToggle().checked).toBe(false);
  expect(resetButton().disabled).toBe(false);
});

test("with nothing hidden, toggle and reset are disabled", async () => {
  await openPopup(GMAIL_TAB);
  expect(applyToggle().disabled).toBe(true);
  expect(resetButton().disabled).toBe(true);
});

test("toggling saves enabled without losing selectors", async () => {
  const stub = await openPopup(GMAIL_TAB, { selectors: ["#a"], enabled: true });
  applyToggle().checked = false;
  applyToggle().dispatchEvent(new Event("change"));
  await flushPromises();
  expect(stub.store[HIDDEN_ITEMS_KEY]).toEqual({
    selectors: ["#a"],
    enabled: false,
  });
});

test("reset clears the saved selectors", async () => {
  const stub = await openPopup(GMAIL_TAB, { selectors: ["#a"], enabled: true });
  resetButton().click();
  await flushPromises();
  expect(stub.store[HIDDEN_ITEMS_KEY]).toEqual({
    selectors: [],
    enabled: true,
  });
  expect(byId("hiddenCount").textContent).toBe("Apply hidden items (0)");
  expect(resetButton().disabled).toBe(true);
});

describe("saved configurations", () => {
  const nameInput = () => byId<HTMLInputElement>("profileName");
  const saveButton = () => byId<HTMLButtonElement>("saveProfile");
  const rows = () =>
    Array.from(byId("profileList").querySelectorAll<HTMLElement>("li"));
  const rowButton = (row: HTMLElement, label: string) =>
    row.querySelector<HTMLButtonElement>(`button[aria-label^="${label}"]`)!;
  const typeName = (name: string) => {
    nameInput().value = name;
    nameInput().dispatchEvent(new Event("input"));
  };
  const focus = { name: "Focus", selectors: ["#a", "#b"] };

  test("lists saved configurations, marking the active one", async () => {
    await openPopup(
      GMAIL_TAB,
      { selectors: ["#b", "#a"], enabled: true },
      { profiles: [focus, { name: "Minimal", selectors: ["#c"] }] }
    );
    expect(rows().map((r) => r.querySelector(".name")!.textContent)).toEqual([
      "✓ Focus (2)",
      "Minimal (1)",
    ]);
  });

  test("shows an empty hint when nothing is saved", async () => {
    await openPopup(GMAIL_TAB);
    expect(rows()).toHaveLength(0);
    expect(byId("profileEmpty").hidden).toBe(false);
  });

  test("save is enabled only with a name and something hidden", async () => {
    await openPopup(GMAIL_TAB, { selectors: ["#a"], enabled: true });
    expect(saveButton().disabled).toBe(true);
    typeName("   ");
    expect(saveButton().disabled).toBe(true);
    typeName("Focus");
    expect(saveButton().disabled).toBe(false);
  });

  test("saving stores the current hidden items under the name", async () => {
    const stub = await openPopup(GMAIL_TAB, {
      selectors: ["#a", "#b"],
      enabled: true,
    });
    typeName(" Focus ");
    saveButton().click();
    await flushPromises();
    expect(stub.store[HIDDEN_PROFILES_KEY]).toEqual({ profiles: [focus] });
    expect(nameInput().value).toBe("");
    expect(rows()).toHaveLength(1);
  });

  test("apply replaces the hidden items with the configuration", async () => {
    const stub = await openPopup(
      GMAIL_TAB,
      { selectors: ["#z"], enabled: false },
      { profiles: [focus] }
    );
    rowButton(rows()[0], "Apply").click();
    await flushPromises();
    expect(stub.store[HIDDEN_ITEMS_KEY]).toEqual({
      selectors: ["#a", "#b"],
      enabled: true,
    });
    expect(byId("hiddenCount").textContent).toBe("Apply hidden items (2)");
    expect(rows()[0].querySelector(".name")!.textContent).toBe("✓ Focus (2)");
  });

  test("delete removes the configuration", async () => {
    const stub = await openPopup(GMAIL_TAB, undefined, { profiles: [focus] });
    rowButton(rows()[0], "Delete").click();
    await flushPromises();
    expect(stub.store[HIDDEN_PROFILES_KEY]).toEqual({ profiles: [] });
    expect(rows()).toHaveLength(0);
  });

  test("renders names as text, not HTML", async () => {
    await openPopup(GMAIL_TAB, undefined, {
      profiles: [{ name: "<img src=x>", selectors: [] }],
    });
    expect(rows()[0].querySelector("img")).toBeNull();
  });
});
