import { createSyncStore } from "./storage";

/**
 * Page elements the user chose to hide ("Hide Distracting Items"), as CSS
 * selectors. `enabled` lets the user show them again temporarily without losing
 * the list.
 */
export interface HiddenItems {
  selectors: string[];
  enabled: boolean;
}

export const DEFAULT_HIDDEN_ITEMS: HiddenItems = {
  selectors: [],
  enabled: true,
};

export const HIDDEN_ITEMS_KEY = "hiddenItems";

// Message the popup sends to the Gmail tab to start picking items to hide.
export const START_HIDE_PICKER = "quickFilters:startHidePicker";

const store = createSyncStore(HIDDEN_ITEMS_KEY, DEFAULT_HIDDEN_ITEMS);
export const mergeHiddenItems = store.merge;
export const loadHiddenItems = store.load;
export const saveHiddenItems = store.save;
export const onHiddenItemsChanged = store.onChanged;

/**
 * Add a selector (once) and turn hiding back on, since the user just asked for
 * something to disappear.
 */
export const withSelector = (
  state: HiddenItems,
  selector: string
): HiddenItems => ({
  selectors: state.selectors.includes(selector)
    ? state.selectors
    : [...state.selectors, selector],
  enabled: true,
});

/**
 * Stylesheet hiding every selected item. One rule per selector, so a selector
 * that stops being valid can't invalidate the others.
 */
export const hideCss = ({ selectors, enabled }: HiddenItems): string =>
  enabled
    ? selectors.map((s) => `${s} { display: none !important; }`).join("\n")
    : "";
