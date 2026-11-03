import {
  DEFAULT_HIDDEN_ITEMS,
  HiddenItems,
  loadHiddenItems,
  saveHiddenItems,
  START_HIDE_PICKER,
} from "./hidden_items";
import {
  applyProfile,
  DEFAULT_HIDDEN_PROFILES,
  HiddenProfile,
  HiddenProfiles,
  isActiveProfile,
  loadHiddenProfiles,
  removeProfile,
  saveHiddenProfiles,
  upsertProfile,
} from "./hidden_profiles";

const GMAIL_URL = "https://mail.google.com/";

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const hideButton = byId<HTMLButtonElement>("hideItems");
const applyToggle = byId<HTMLInputElement>("applyHidden");
const hiddenCount = byId<HTMLElement>("hiddenCount");
const resetButton = byId<HTMLButtonElement>("resetHidden");
const notice = byId<HTMLElement>("popupNotice");
const profileList = byId<HTMLUListElement>("profileList");
const profileEmpty = byId<HTMLElement>("profileEmpty");
const profileForm = byId<HTMLFormElement>("profileForm");
const profileName = byId<HTMLInputElement>("profileName");
const saveProfileButton = byId<HTMLButtonElement>("saveProfile");

const showNotice = (text: string) => {
  notice.textContent = text;
  notice.hidden = false;
};

let state: HiddenItems = { ...DEFAULT_HIDDEN_ITEMS };
let profiles: HiddenProfiles = { ...DEFAULT_HIDDEN_PROFILES };

const rowButton = (text: string, label: string, onClick: () => void) => {
  const button = document.createElement("button");
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", onClick);
  return button;
};

const profileRow = (profile: HiddenProfile) => {
  const row = document.createElement("li");
  const name = document.createElement("span");
  name.className = "name";
  const active = isActiveProfile(profile, state) ? "✓ " : "";
  // textContent, never innerHTML: names are user input.
  name.textContent = `${active}${profile.name} (${profile.selectors.length})`;
  row.append(
    name,
    rowButton("Apply", `Apply ${profile.name}`, () =>
      update(applyProfile(profile))
    ),
    rowButton("🗑", `Delete ${profile.name}`, () =>
      updateProfiles(removeProfile(profiles, profile.name))
    )
  );
  return row;
};

const render = () => {
  const empty = state.selectors.length === 0;
  hiddenCount.textContent = `Apply hidden items (${state.selectors.length})`;
  applyToggle.checked = state.enabled;
  applyToggle.disabled = empty;
  resetButton.disabled = empty;

  profileList.replaceChildren(...profiles.profiles.map(profileRow));
  profileEmpty.hidden = profiles.profiles.length > 0;
  saveProfileButton.disabled = empty || !profileName.value.trim();
};

// The popup only edits storage; the Gmail content script follows the changes.
const update = (next: HiddenItems) => {
  state = next;
  render();
  void saveHiddenItems(next);
};

const updateProfiles = (next: HiddenProfiles) => {
  profiles = next;
  render();
  void saveHiddenProfiles(next);
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

  profileName.addEventListener("input", render);
  profileForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Enter in the name field saves too
    if (saveProfileButton.disabled) return;
    const next = upsertProfile(profiles, profileName.value, state.selectors);
    profileName.value = "";
    updateProfiles(next);
  });

  [state, profiles] = await Promise.all([
    loadHiddenItems(),
    loadHiddenProfiles(),
  ]);
  render();
};

void init();
