/**
 * @jest-environment jsdom
 */
import { HIDDEN_ITEMS_KEY, START_HIDE_PICKER } from "../hidden_items";
import { flushPromises, installChromeStub } from "../test_support/chrome_stub";

const GMAIL_TAB = { id: 7, url: "https://mail.google.com/mail/u/0/#inbox" };

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const hideButton = () => byId<HTMLButtonElement>("hideItems");
const applyToggle = () => byId<HTMLInputElement>("applyHidden");
const resetButton = () => byId<HTMLButtonElement>("resetHidden");

const openPopup = async (
  tab: { id: number; url?: string },
  stored?: unknown
) => {
  jest.resetModules();
  const stub = installChromeStub();
  if (stored) stub.store[HIDDEN_ITEMS_KEY] = stored;
  stub.chrome.tabs.query.mockResolvedValue([tab]);
  stub.chrome.tabs.sendMessage.mockResolvedValue(undefined);
  (window as any).close = jest.fn();
  document.body.innerHTML = `
    <button id="hideItems"></button>
    <label><input type="checkbox" id="applyHidden" /> <span id="hiddenCount"></span></label>
    <button id="resetHidden"></button>
    <p id="popupNotice" hidden></p>`;
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
