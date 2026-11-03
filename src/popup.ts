import {
  DEFAULT_HIDDEN_ITEMS,
  HiddenItems,
  loadHiddenItems,
  saveHiddenItems,
  START_HIDE_PICKER,
} from "./hidden_items";

const GMAIL_URL = "https://mail.google.com/";

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const hideButton = byId<HTMLButtonElement>("hideItems");
const applyToggle = byId<HTMLInputElement>("applyHidden");
const hiddenCount = byId<HTMLElement>("hiddenCount");
const resetButton = byId<HTMLButtonElement>("resetHidden");
const notice = byId<HTMLElement>("popupNotice");

const showNotice = (text: string) => {
  notice.textContent = text;
  notice.hidden = false;
};

let state: HiddenItems = { ...DEFAULT_HIDDEN_ITEMS };

const render = () => {
  const empty = state.selectors.length === 0;
  hiddenCount.textContent = `Apply hidden items (${state.selectors.length})`;
  applyToggle.checked = state.enabled;
  applyToggle.disabled = empty;
  resetButton.disabled = empty;
};

// The popup only edits storage; the Gmail content script follows the changes.
const update = (next: HiddenItems) => {
  state = next;
  render();
  void saveHiddenItems(next);
};

const init = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // tab.url is only visible for hosts we have permission for, i.e. Gmail.
  const onGmail = !!tab?.url?.startsWith(GMAIL_URL);
  hideButton.disabled = !onGmail;
  if (!onGmail) showNotice("Open Gmail to hide distracting items.");

  hideButton.addEventListener("click", async () => {
    try {
      await chrome.tabs.sendMessage(tab.id!, { type: START_HIDE_PICKER });
      window.close();
    } catch {
      // No content script in tabs opened before the extension was (re)loaded.
      showNotice("Reload the Gmail tab and try again.");
    }
  });
  applyToggle.addEventListener("change", () =>
    update({ ...state, enabled: applyToggle.checked })
  );
  resetButton.addEventListener("click", () =>
    update({ ...DEFAULT_HIDDEN_ITEMS })
  );

  state = await loadHiddenItems();
  render();
};

void init();
