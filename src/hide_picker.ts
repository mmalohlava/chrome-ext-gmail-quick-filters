import { setStyle } from "./dom";
import { HiddenItems, hideCss } from "./hidden_items";

export const HIDDEN_STYLE_ID = "quickFiltersHiddenItems";
export const PICKER_BANNER_ID = "quickFiltersHidePicker";
const PICKER_OUTLINE_ID = "quickFiltersHideOutline";

const STABLE_ATTRIBUTES = ["role", "aria-label", "data-tooltip", "name"];
// Gmail generates ids like ":1x" anew on every page load, so they can't be saved.
const isStableId = (id: string) => !!id && !id.startsWith(":");
const isPlainClass = (name: string) => /^[A-Za-z_-][\w-]*$/.test(name);
const quote = (value: string) => `"${value.replace(/["\\]/g, "\\$&")}"`;

const nthOfType = (el: Element) => {
  let index = 1;
  for (let s = el.previousElementSibling; s; s = s.previousElementSibling) {
    if (s.tagName === el.tagName) index++;
  }
  return index;
};

// One compound selector for `el`, from attributes that survive Gmail reloads.
const stepFor = (el: Element, withIndex: boolean): string => {
  const tag = el.tagName.toLowerCase();
  if (isStableId(el.id)) return `${tag}[id=${quote(el.id)}]`;
  const classes = Array.from(el.classList)
    .filter(isPlainClass)
    .map((c) => `.${c}`)
    .join("");
  const attributes = STABLE_ATTRIBUTES.filter((a) => el.hasAttribute(a))
    .map((a) => `[${a}=${quote(el.getAttribute(a)!)}]`)
    .join("");
  const index = withIndex ? `:nth-of-type(${nthOfType(el)})` : "";
  return `${tag}${classes}${attributes}${index}`;
};

const matchesOnly = (selector: string, el: Element) => {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === el;
  } catch {
    return false;
  }
};

/**
 * Build the shortest selector (walking up through ancestors) that matches only
 * `el` now and is likely to match it again after Gmail reloads. Falls back to
 * positional :nth-of-type steps when attributes alone can't tell it apart.
 */
export const selectorFor = (el: Element): string => {
  let steps: string[] = [];
  for (const withIndex of [false, true]) {
    steps = [];
    for (
      let node: Element | null = el;
      node && node !== document.body && node !== document.documentElement;
      node = node.parentElement
    ) {
      steps.unshift(stepFor(node, withIndex));
      const selector = steps.join(" > ");
      if (matchesOnly(selector, el)) return selector;
    }
  }
  return `body > ${steps.join(" > ")}`;
};

/**
 * Hide the selected items with one injected stylesheet. CSS keeps applying as
 * Gmail re-renders, so no per-mutation work is needed.
 */
export const applyHiddenStyle = (state: HiddenItems) => {
  let style = document.getElementById(HIDDEN_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = HIDDEN_STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
  }
  const css = hideCss(state);
  if (style.textContent !== css) style.textContent = css;
};

const createBanner = (onDone: () => void) => {
  const banner = document.createElement("div");
  banner.id = PICKER_BANNER_ID;
  setStyle(banner, {
    position: "fixed",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 8px 8px 16px",
    borderRadius: "10px",
    backgroundColor: "#202124",
    color: "#ffffff",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
    font: '14px/1.4 "Google Sans", Roboto, Arial, sans-serif',
  });
  banner.textContent =
    "Click an item to hide it · ↑/↓ widen or narrow · Enter hides · Esc to finish";

  const done = document.createElement("button");
  done.textContent = "Done";
  setStyle(done, {
    padding: "6px 14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#1a73e8",
    color: "#ffffff",
    fontWeight: "500",
    cursor: "pointer",
  });
  done.addEventListener("click", onDone);
  banner.appendChild(done);
  return banner;
};

const createOutline = () => {
  const outline = document.createElement("div");
  outline.id = PICKER_OUTLINE_ID;
  setStyle(outline, {
    position: "fixed",
    display: "none",
    zIndex: "2147483646",
    pointerEvents: "none", // let the pointer reach the element underneath
    border: "2px solid #1a73e8",
    borderRadius: "4px",
    backgroundColor: "rgba(26, 115, 232, 0.15)",
  });
  return outline;
};

// Events Gmail could act on; all are swallowed while picking.
const BLOCKED_EVENTS = [
  "click",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
];

const NON_CONTENT = "script, style, template, noscript";
const MEDIA =
  "img, svg, video, canvas, iframe, input, button, select, textarea";

// Whether a node renders something the user would see (text, icon, control).
const isVisibleContent = (node: ChildNode): boolean => {
  if (node.nodeType === Node.TEXT_NODE) return !!node.textContent?.trim();
  if (!(node instanceof Element) || node.matches(NON_CONTENT)) return false;
  if (getComputedStyle(node).display === "none") return false;
  return (
    !!node.textContent?.trim() ||
    node.matches(MEDIA) ||
    !!node.querySelector(MEDIA)
  );
};

/**
 * Widen a picked element to the outermost ancestor that holds nothing else
 * visible. Hiding only the inner element would leave its wrappers' height and
 * padding behind as an empty band (e.g. Gmail's inbox tab bar).
 */
export const pickTarget = (el: Element): Element => {
  let target = el;
  for (
    let parent = el.parentElement;
    parent && parent !== document.body && parent !== document.documentElement;
    parent = parent.parentElement
  ) {
    const others = Array.from(parent.childNodes).filter((n) => n !== target);
    if (others.some(isVisibleContent)) break;
    target = parent;
  }
  return target;
};

/**
 * Let the user click page elements to hide them, Safari "Hide Distracting
 * Items" style. The hovered element (widened by `pickTarget`) is outlined;
 * ArrowUp/ArrowDown widen or narrow the selection and Enter or a click hides
 * it. Page clicks and keys never reach Gmail. Ends on Done or Escape.
 * @returns A function that stops picking.
 */
export const startHidePicker = (onPick: (selector: string) => void) => {
  const noop = () => undefined;
  if (document.getElementById(PICKER_BANNER_ID)) return noop; // already picking

  const outline = createOutline();
  const banner = createBanner(() => stop());
  const isPickable = (target: EventTarget | null): target is Element =>
    target instanceof Element &&
    target !== document.body &&
    target !== document.documentElement &&
    !banner.contains(target);

  let hovered: Element | null = null;
  let current: Element | null = null;
  const narrower: Element[] = []; // selections to return to on ArrowDown

  const select = (el: Element | null) => {
    current = el;
    if (!el) {
      outline.style.display = "none";
      return;
    }
    const rect = el.getBoundingClientRect();
    setStyle(outline, {
      display: "block",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };

  const pick = () => {
    if (!current) return;
    outline.style.display = "none";
    onPick(selectorFor(current));
  };

  const onMove = (e: Event) => {
    if (e.target === hovered) return; // keep a selection widened by keys
    hovered = e.target as Element | null;
    narrower.length = 0;
    select(isPickable(e.target) ? pickTarget(e.target) : null);
  };

  const onBlocked = (e: Event) => {
    if (!isPickable(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== "click") return;
    if (!current?.contains(e.target)) select(pickTarget(e.target));
    pick();
  };

  const keyActions: Record<string, () => void> = {
    Escape: () => stop(),
    Enter: pick,
    ArrowUp: () => {
      const parent = current?.parentElement ?? null;
      if (current && isPickable(parent)) {
        narrower.push(current);
        select(parent);
      }
    },
    ArrowDown: () => {
      const child = narrower.pop();
      if (child) select(child);
    },
  };
  const onKey = (e: KeyboardEvent) => {
    const action = keyActions[e.key];
    if (!action) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // keep Gmail's keyboard shortcuts out
    action();
  };

  const listeners: [string, EventListener][] = [
    ["mousemove", onMove],
    ["keydown", onKey as EventListener],
    ...BLOCKED_EVENTS.map((type): [string, EventListener] => [type, onBlocked]),
  ];
  // Capture phase on window runs before any of Gmail's handlers.
  listeners.forEach(([type, fn]) => window.addEventListener(type, fn, true));

  const stop = () => {
    listeners.forEach(([type, fn]) =>
      window.removeEventListener(type, fn, true)
    );
    outline.remove();
    banner.remove();
  };

  document.body.append(outline, banner);
  return stop;
};
