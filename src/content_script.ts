import { getYesterdayDate } from "./utils";
import { getTodayDate } from "./utils";
import {
  H2O_SENDER_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  HighlightColors,
  isDarkColor,
  isH2oSender,
  parseRgb,
  senderDomain,
} from "./utils";
import { formatSender, pickCurrentMessage } from "./pinned_header";
import {
  DEFAULT_CONFIG,
  FilterConfig,
  loadConfig,
  onConfigChanged,
  saveConfig,
} from "./config";

// The "T"/"Y" filter buttons keep a fixed, light-theme look regardless of Gmail's
// theme, so their backgrounds use the light highlight colors.
const TODAY_BUTTON_COLOR = HIGHLIGHT_COLORS.light.today.bg;
const YESTERDAY_BUTTON_COLOR = HIGHLIGHT_COLORS.light.yesterday.bg;
// Strong red chip so a non-H2O.ai sender's domain grabs attention.
const DOMAIN_BADGE_COLORS = {
  bg: "#d93025",
  text: "#ffffff",
  border: "#a50e0e",
};
const SNOOZE_BUTTON_COLOR = "#aecbfa"; // light blue, matching the fixed button look

// Live filter-query configuration. Seeded with defaults and kept up to date from
// chrome.storage so button clicks always use the latest queries without a reload.
let currentConfig: FilterConfig = { ...DEFAULT_CONFIG };

/**
 * Detect whether Gmail is rendering in a dark theme by inspecting the actual
 * background color of the email container (walking up to <body> when the
 * container's own background is transparent/unparseable).
 */
const detectDarkMode = (container: HTMLElement): boolean => {
  let node: HTMLElement | null = container;
  while (node) {
    const rgb = parseRgb(getComputedStyle(node).backgroundColor);
    if (rgb) return isDarkColor(rgb);
    node = node.parentElement;
  }
  const bodyRgb = parseRgb(getComputedStyle(document.body).backgroundColor);
  return bodyRgb ? isDarkColor(bodyRgb) : false;
};

const addFilterButtons = () => {
  const targetNode = document.querySelector('form[role="search"]')
    ?.parentNode as HTMLDivElement;

  if (!targetNode) return;

  // Create container div for buttons
  const buttonGroup = document.createElement("div");
  buttonGroup.style.display = "inline-flex";
  buttonGroup.style.gap = "4px";
  buttonGroup.style.marginLeft = "8px";
  buttonGroup.style.verticalAlign = "middle";

  // Check if buttons already exist
  if (
    document.querySelector("#todayFilterButton") ||
    document.querySelector("#yesterdayFilterButton")
  )
    return;

  // Create today and yesterday filter buttons. The queries are read lazily on
  // each click so edits made in the config dialog take effect immediately.
  const todayFilterButton = createFilterButton(
    "todayFilterButton",
    "T",
    "Today's Emails",
    TODAY_BUTTON_COLOR,
    () => currentConfig.today
  );
  const yesterdayFilterButton = createFilterButton(
    "yesterdayFilterButton",
    "Y",
    "Yesterday's Emails",
    YESTERDAY_BUTTON_COLOR,
    () => currentConfig.yesterday
  );
  const snoozeFilterButton = createFilterButton(
    "snoozeFilterButton",
    "S",
    "Snoozed Emails",
    SNOOZE_BUTTON_COLOR,
    () => currentConfig.snooze
  );

  // Gear button opens the configuration dialog.
  const configButton = document.createElement("button");
  configButton.id = "configFilterButton";
  configButton.className = "zo";
  configButton.textContent = "⚙";
  configButton.dataset.tooltip = "Edit filter queries";
  configButton.style.border = "1px solid #dadce0";
  configButton.style.borderRadius = "6px";
  configButton.style.padding = "4px 8px";
  configButton.style.cursor = "pointer";
  configButton.addEventListener("click", openConfigDialog);

  buttonGroup.appendChild(todayFilterButton);
  buttonGroup.appendChild(yesterdayFilterButton);
  buttonGroup.appendChild(snoozeFilterButton);
  buttonGroup.appendChild(configButton);

  // Insert buttons after the search bar
  targetNode.insertAdjacentElement("afterend", buttonGroup);
};

const runSearch = (query: string) => {
  const searchBar = document.querySelector(
    'input[name="q"]'
  ) as HTMLInputElement;

  if (searchBar) {
    searchBar.value = query;
    const searchButton = document.querySelector(
      'button[aria-label="Search mail"]'
    ) as HTMLButtonElement;
    searchButton?.click();
  }
};

const createFilterButton = (
  id: string,
  label: string,
  tooltip: string,
  buttonColor: string,
  getQuery: () => string
) => {
  const button = document.createElement("button");
  button.id = id;
  button.className = "zo";
  button.textContent = label;
  button.dataset.tooltip = tooltip;
  button.style.backgroundColor = buttonColor; // Default Gmail button color
  button.style.border = "1px solid #dadce0";
  button.style.borderRadius = "6px";
  button.style.padding = "4px 8px";
  button.style.cursor = "pointer";

  button.addEventListener("click", () => runSearch(getQuery()));
  return button;
};

const CONFIG_DIALOG_ID = "quickFiltersConfigDialog";

// Build and show the modal dialog for editing the T/Y filter queries.
const openConfigDialog = () => {
  if (document.getElementById(CONFIG_DIALOG_ID)) return; // already open

  const overlay = document.createElement("div");
  overlay.id = CONFIG_DIALOG_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "2147483647",
  } as CSSStyleDeclaration);

  const card = document.createElement("div");
  Object.assign(card.style, {
    backgroundColor: "#ffffff",
    color: "#202124",
    borderRadius: "12px",
    padding: "20px 24px",
    width: "440px",
    maxWidth: "90vw",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
    font: '14px/1.4 "Google Sans", Roboto, Arial, sans-serif',
  } as CSSStyleDeclaration);

  const title = document.createElement("h2");
  title.textContent = "Edit Filter Queries";
  Object.assign(title.style, {
    margin: "0 0 16px",
    fontSize: "18px",
    fontWeight: "500",
  } as CSSStyleDeclaration);

  const makeField = (labelText: string, value: string) => {
    const wrapper = document.createElement("label");
    Object.assign(wrapper.style, {
      display: "block",
      marginBottom: "14px",
      fontWeight: "500",
    } as CSSStyleDeclaration);
    wrapper.textContent = labelText;

    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    Object.assign(input.style, {
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      marginTop: "6px",
      padding: "8px 10px",
      border: "1px solid #dadce0",
      borderRadius: "6px",
      fontWeight: "400",
      fontFamily: "monospace",
    } as CSSStyleDeclaration);
    wrapper.appendChild(input);
    return { wrapper, input };
  };

  const today = makeField('"T" — Today\'s query', currentConfig.today);
  const yesterday = makeField(
    '"Y" — Yesterday\'s query',
    currentConfig.yesterday
  );
  const snooze = makeField('"S" — Snoozed query', currentConfig.snooze);

  const buttonRow = document.createElement("div");
  Object.assign(buttonRow.style, {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    marginTop: "8px",
  } as CSSStyleDeclaration);

  const close = () => overlay.remove();

  const styleButton = (btn: HTMLButtonElement, primary: boolean) => {
    Object.assign(btn.style, {
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      border: primary ? "none" : "1px solid #dadce0",
      backgroundColor: primary ? "#1a73e8" : "#ffffff",
      color: primary ? "#ffffff" : "#202124",
      fontWeight: "500",
    } as CSSStyleDeclaration);
  };

  const resetButton = document.createElement("button");
  resetButton.textContent = "Reset to defaults";
  styleButton(resetButton, false);
  resetButton.style.marginRight = "auto"; // push to the left
  resetButton.addEventListener("click", () => {
    today.input.value = DEFAULT_CONFIG.today;
    yesterday.input.value = DEFAULT_CONFIG.yesterday;
    snooze.input.value = DEFAULT_CONFIG.snooze;
  });

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  styleButton(cancelButton, false);
  cancelButton.addEventListener("click", close);

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  styleButton(saveButton, true);
  saveButton.addEventListener("click", () => {
    const next: FilterConfig = {
      today: today.input.value.trim() || DEFAULT_CONFIG.today,
      yesterday: yesterday.input.value.trim() || DEFAULT_CONFIG.yesterday,
      snooze: snooze.input.value.trim() || DEFAULT_CONFIG.snooze,
    };
    currentConfig = next;
    void saveConfig(next);
    close();
  });

  buttonRow.appendChild(resetButton);
  buttonRow.appendChild(cancelButton);
  buttonRow.appendChild(saveButton);

  card.appendChild(title);
  card.appendChild(today.wrapper);
  card.appendChild(yesterday.wrapper);
  card.appendChild(snooze.wrapper);
  card.appendChild(buttonRow);
  overlay.appendChild(card);

  // Dismiss when clicking the backdrop (but not the card itself).
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  today.input.focus();
};

const highlightDates = (
  emailListContainer: HTMLElement,
  dateTitle: string,
  colors: HighlightColors
) => {
  const emailRows = emailListContainer.querySelectorAll(
    `tr span[title*="${dateTitle}"] span`
  ); // Locate email rows

  emailRows.forEach((row) => {
    const dateElement = row.parentElement as HTMLElement;
    // Highlight based on the date — set background and text color so the
    // highlight stays readable in either Gmail theme, and render it as a padded,
    // rounded, bordered chip so the text doesn't touch the colored edge.
    dateElement.style.backgroundColor = colors.bg;
    dateElement.style.color = colors.text;
    dateElement.style.padding = "1px 6px";
    dateElement.style.borderRadius = "10px";
    dateElement.style.border = `1px solid ${colors.border}`;
  });
};

// Color today's/yesterday's dates in the currently rendered email list.
//
// This re-queries div[role="main"] on every call instead of capturing it once:
// clicking the T/Y filter buttons makes Gmail navigate to a search-results view
// and re-mount its main content, so an observer bound to the original container
// would be left watching a detached node and stop highlighting. Re-querying keeps
// it working across searches and view changes.
const applyHighlights = () => {
  const emailListContainer = document.querySelector(
    'div[role="main"]'
  ) as HTMLElement | null;
  if (!emailListContainer) return;

  // Recompute the dates AND theme on every render. Gmail is a long-lived SPA that
  // stays open for days; computing the dates once at startup would freeze
  // "today"/"yesterday" to the day the tab was first opened (so after midnight it
  // would keep highlighting a stale date). Recomputing keeps the highlight correct
  // across date rollovers and theme switches without a reload.
  const todayDate = getTodayDate();
  const yesterdayDate = getYesterdayDate();
  const theme = detectDarkMode(emailListContainer)
    ? HIGHLIGHT_COLORS.dark
    : HIGHLIGHT_COLORS.light;
  highlightDates(emailListContainer, todayDate, theme.today);
  highlightDates(emailListContainer, yesterdayDate, theme.yesterday);
};

// In an opened email Gmail renders each message's sender as `span.gD[email]`
// inside the message header block `.gE` (sender name, recipients, date and
// action icons).
const SENDER_SELECTOR = "span.gD[email]";
const senderHeader = (sender: HTMLElement): HTMLElement =>
  sender.closest<HTMLElement>(".gE") ?? sender;

const DOMAIN_BADGE_ATTR = "data-quick-filters-domain";

// Show a colored badge with the sender's domain centered in the header block.
const addDomainBadge = (header: HTMLElement, domain: string) => {
  const existing = header.querySelector(`[${DOMAIN_BADGE_ATTR}]`);
  // Only touch the DOM when needed: inserting fires the body MutationObserver,
  // which would otherwise call back here forever.
  if (existing?.getAttribute(DOMAIN_BADGE_ATTR) === domain) return;
  existing?.remove();

  const badge = document.createElement("span");
  badge.setAttribute(DOMAIN_BADGE_ATTR, domain);
  badge.textContent = domain;
  Object.assign(badge.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    padding: "2px 10px",
    borderRadius: "10px",
    backgroundColor: DOMAIN_BADGE_COLORS.bg,
    color: DOMAIN_BADGE_COLORS.text,
    border: `1px solid ${DOMAIN_BADGE_COLORS.border}`,
    fontSize: "13px",
    fontWeight: "500",
    whiteSpace: "nowrap",
    pointerEvents: "none", // never block clicks on the header underneath
  } as CSSStyleDeclaration);
  header.style.position = "relative"; // anchor for the centered badge
  header.appendChild(badge);
};

// Flag the sender of each opened message: the whole header turns yellow for
// H2O.ai senders, any other sender gets a badge with their domain.
const highlightSenders = () => {
  document.querySelectorAll<HTMLElement>(SENDER_SELECTOR).forEach((sender) => {
    const email = sender.getAttribute("email");
    if (!isH2oSender(email)) {
      const domain = senderDomain(email);
      if (domain) addDomainBadge(senderHeader(sender), domain);
      return;
    }
    const header = senderHeader(sender);
    header.style.backgroundColor = H2O_SENDER_HIGHLIGHT_COLOR;
    header.style.borderRadius = "8px";
    // Pad the text away from the colored edge; the matching negative horizontal
    // margin keeps the sender name aligned with the email body below.
    header.style.padding = "6px 12px";
    header.style.margin = "0 -12px";
  });
};

const PINNED_HEADER_ID = "quickFiltersPinnedHeader";

// Nearest ancestor that actually scrolls — Gmail's reading pane.
const findScroller = (el: HTMLElement): HTMLElement | null => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    )
      return node;
  }
  return null;
};

// The pinned bar is our own element (not a moved Gmail node) so it works however
// Gmail nests the subject and sender, which live in unrelated subtrees.
const getPinnedBar = () => {
  let bar = document.getElementById(PINNED_HEADER_ID);
  if (bar) return bar;
  bar = document.createElement("div");
  bar.id = PINNED_HEADER_ID;
  Object.assign(bar.style, {
    position: "fixed",
    display: "none",
    zIndex: "1000",
    boxSizing: "border-box",
    padding: "8px 16px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
    font: '14px/1.4 "Google Sans", Roboto, Arial, sans-serif',
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as CSSStyleDeclaration);
  const subject = document.createElement("div");
  subject.style.fontSize = "16px";
  subject.style.fontWeight = "500";
  subject.style.overflow = "hidden";
  subject.style.textOverflow = "ellipsis";
  const sender = document.createElement("div");
  sender.style.overflow = "hidden";
  sender.style.textOverflow = "ellipsis";
  bar.append(subject, sender);
  document.body.appendChild(bar);
  return bar;
};

// Only touch text when it changes: rewriting it fires the body MutationObserver,
// which would otherwise schedule another update forever.
const setText = (el: Element, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

// Show the subject and current message's sender in a bar pinned to the top of
// the reading pane once the real header has scrolled out of view.
const updatePinnedHeader = () => {
  const bar = getPinnedBar();
  const hide = () => {
    bar.style.display = "none";
  };

  const subject = document.querySelector<HTMLElement>("h2.hP");
  const scroller = subject && findScroller(subject);
  if (!subject || !scroller) return hide();

  // Skip senders Gmail keeps in the DOM but doesn't render (zero-size rects).
  const senders = Array.from(
    document.querySelectorAll<HTMLElement>(SENDER_SELECTOR)
  ).filter((s) => s.getClientRects().length > 0);
  const pane = scroller.getBoundingClientRect();
  const index = pickCurrentMessage(
    senders.map((s) => senderHeader(s).getBoundingClientRect().top),
    pane.top
  );
  if (index === null) return hide();

  const sender = senders[index];
  const email = sender.getAttribute("email");
  const date = senderHeader(sender).querySelector(".g3")?.textContent?.trim();
  const [subjectLine, senderLine] = Array.from(bar.children);
  setText(subjectLine, subject.textContent?.trim() ?? "");
  setText(
    senderLine,
    [
      formatSender(sender.getAttribute("name") ?? sender.textContent, email),
      date,
    ]
      .filter(Boolean)
      .join(" · ")
  );

  const dark = detectDarkMode(scroller);
  const h2o = isH2oSender(email);
  bar.style.backgroundColor = h2o
    ? H2O_SENDER_HIGHLIGHT_COLOR
    : dark
    ? "#2d2e30"
    : "#ffffff";
  bar.style.color = h2o || !dark ? "#202124" : "#e8eaed";
  bar.style.top = `${pane.top}px`;
  bar.style.left = `${pane.left}px`;
  bar.style.width = `${scroller.clientWidth}px`; // leave the scrollbar uncovered
  bar.style.display = "block";
};

// Coalesce bursts of scroll/mutation events into one update per frame.
let pinnedUpdateScheduled = false;
const schedulePinnedHeaderUpdate = () => {
  if (pinnedUpdateScheduled) return;
  pinnedUpdateScheduled = true;
  requestAnimationFrame(() => {
    pinnedUpdateScheduled = false;
    updatePinnedHeader();
  });
};

//
// Register event observers
//

// Load saved filter queries and keep them in sync across tabs/devices.
void loadConfig().then((config) => {
  currentConfig = config;
});
onConfigChanged((config) => {
  currentConfig = config;
});

// Run once for the initial render, then keep both features in sync on every
// Gmail re-render. A single observer on document.body (which is never replaced)
// drives both button injection and date highlighting, so highlighting keeps
// working even when Gmail swaps out the main content for a search-results view.
addFilterButtons();
applyHighlights();
highlightSenders();
schedulePinnedHeaderUpdate();

const observer = new MutationObserver(() => {
  addFilterButtons();
  applyHighlights();
  highlightSenders();
  schedulePinnedHeaderUpdate();
});
// Start observing the body for Gmail UI changes
observer.observe(document.body, { childList: true, subtree: true });

// Scroll events don't bubble, so capture them from Gmail's inner scroll panes.
document.addEventListener("scroll", schedulePinnedHeaderUpdate, {
  capture: true,
  passive: true,
});
window.addEventListener("resize", schedulePinnedHeaderUpdate);
