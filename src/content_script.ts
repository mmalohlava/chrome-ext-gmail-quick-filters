import { getYesterdayDate } from "./utils";
import { getTodayDate } from "./utils";
import {
  HIGHLIGHT_COLORS,
  HighlightColors,
  isDarkColor,
  parseRgb,
} from "./utils";
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

// Color dates in the email list
const highlightEmailDates = () => {
  // Locate the email list container
  const emailListContainer = (document.querySelector('div[role="main"]') ||
    document.body) as HTMLElement;

  if (!emailListContainer) return;

  // Function to highlight dates
  // Create a MutationObserver to watch for changes in the email list
  const todayDate = getTodayDate();
  const yesterdayDate = getYesterdayDate();

  const observer = new MutationObserver(() => {
    // Recompute the theme on every render so switching Gmail's theme updates the
    // highlights without a reload.
    const theme = detectDarkMode(emailListContainer)
      ? HIGHLIGHT_COLORS.dark
      : HIGHLIGHT_COLORS.light;
    highlightDates(emailListContainer, todayDate, theme.today);
    highlightDates(emailListContainer, yesterdayDate, theme.yesterday);
  });

  // Observe the email list container for child changes
  observer.observe(emailListContainer, { childList: true, subtree: true });
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

// Call the function to start observing
highlightEmailDates();

// Observe changes in the DOM to ensure Gmail UI is loaded
const observer = new MutationObserver(() => {
  addFilterButtons();
});
// Start observing the body for Gmail UI changes
observer.observe(document.body, { childList: true, subtree: true });
