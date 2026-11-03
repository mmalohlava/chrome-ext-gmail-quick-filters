import { HiddenItems } from "./hidden_items";
import { createSyncStore } from "./storage";

/**
 * A named, saved set of hidden items ("Focus", "Minimal", ...) the user can
 * apply later from the popup.
 */
export interface HiddenProfile {
  name: string;
  selectors: string[];
}

export interface HiddenProfiles {
  profiles: HiddenProfile[];
}

export const DEFAULT_HIDDEN_PROFILES: HiddenProfiles = { profiles: [] };

// A key of its own, so profiles don't eat into the hidden items' sync quota.
export const HIDDEN_PROFILES_KEY = "hiddenProfiles";

const store = createSyncStore(HIDDEN_PROFILES_KEY, DEFAULT_HIDDEN_PROFILES);
export const loadHiddenProfiles = store.load;
export const saveHiddenProfiles = store.save;

/**
 * Save `selectors` under `name` (trimmed), replacing a profile of the same name
 * in place or appending a new one.
 */
export const upsertProfile = (
  { profiles }: HiddenProfiles,
  name: string,
  selectors: string[]
): HiddenProfiles => {
  const profile = { name: name.trim(), selectors: [...selectors] };
  const exists = profiles.some((p) => p.name === profile.name);
  return {
    profiles: exists
      ? profiles.map((p) => (p.name === profile.name ? profile : p))
      : [...profiles, profile],
  };
};

export const removeProfile = (
  { profiles }: HiddenProfiles,
  name: string
): HiddenProfiles => ({ profiles: profiles.filter((p) => p.name !== name) });

export const applyProfile = ({ selectors }: HiddenProfile): HiddenItems => ({
  selectors: [...selectors],
  enabled: true,
});

/**
 * Whether the profile is what's currently being hidden (same selectors, in any
 * order, with hiding switched on).
 */
export const isActiveProfile = (
  { selectors }: HiddenProfile,
  items: HiddenItems
): boolean =>
  items.enabled &&
  selectors.length === items.selectors.length &&
  selectors.every((s) => items.selectors.includes(s));
