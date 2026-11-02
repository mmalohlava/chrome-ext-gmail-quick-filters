/**
 * @jest-environment jsdom
 */
import { DEFAULT_CONFIG, STORAGE_KEY } from "../config";

let store: Record<string, unknown>;
let searchClick: jest.Mock;
const observers: MutationObserver[] = [];

const flushObservers = () => new Promise((resolve) => setTimeout(resolve, 0));
const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const searchValue = () =>
  document.querySelector<HTMLInputElement>('input[name="q"]')!.value;
const dialogInputs = () =>
  Array.from(
    byId("quickFiltersConfigDialog").querySelectorAll<HTMLInputElement>("input")
  );
const dialogButton = (text: string) =>
  Array.from(
    byId("quickFiltersConfigDialog").querySelectorAll<HTMLButtonElement>(
      "button"
    )
  ).find((b) => b.textContent === text)!;

beforeAll(() => {
  store = {};
  (global as any).chrome = {
    storage: {
      sync: {
        get: (key: string, cb: (items: Record<string, unknown>) => void) =>
          cb({ [key]: store[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(store, items);
          cb();
        },
      },
      onChanged: { addListener: () => undefined },
    },
  };
  (global as any).requestAnimationFrame = () => 0;
  const NativeObserver = MutationObserver;
  (global as any).MutationObserver = class extends NativeObserver {
    constructor(cb: MutationCallback) {
      super(cb);
      observers.push(this);
    }
  };

  document.body.innerHTML = `
    <div><form role="search"><input name="q" /></form></div>
    <button aria-label="Search mail"></button>
    <div role="main"></div>`;
  searchClick = jest.fn();
  document
    .querySelector('button[aria-label="Search mail"]')!
    .addEventListener("click", searchClick);

  require("../content_script");
});

afterEach(() => byId("quickFiltersConfigDialog")?.remove());
// Stop the script observing so no callback runs after jsdom is torn down.
afterAll(() => observers.forEach((o) => o.disconnect()));

describe("filter buttons", () => {
  test("inserts T, Y, S and gear buttons once", async () => {
    document.body.appendChild(document.createElement("div")); // trigger observer
    await flushObservers();
    const ids = [
      "todayFilterButton",
      "yesterdayFilterButton",
      "snoozeFilterButton",
      "configFilterButton",
    ];
    expect(ids.map((id) => byId(id)?.textContent)).toEqual([
      "T",
      "Y",
      "S",
      "⚙",
    ]);
    ids.forEach((id) =>
      expect(document.querySelectorAll(`#${id}`)).toHaveLength(1)
    );
  });

  test.each([
    ["todayFilterButton", DEFAULT_CONFIG.today],
    ["yesterdayFilterButton", DEFAULT_CONFIG.yesterday],
    ["snoozeFilterButton", DEFAULT_CONFIG.snooze],
  ])("%s runs its query", (id, query) => {
    searchClick.mockClear();
    byId(id).click();
    expect(searchValue()).toBe(query);
    expect(searchClick).toHaveBeenCalledTimes(1);
  });
});

describe("config dialog", () => {
  test("shows one field per filter, prefilled with current queries", () => {
    byId("configFilterButton").click();
    expect(dialogInputs().map((i) => i.value)).toEqual([
      DEFAULT_CONFIG.today,
      DEFAULT_CONFIG.yesterday,
      DEFAULT_CONFIG.snooze,
    ]);
  });

  test("opens only once", () => {
    byId("configFilterButton").click();
    byId("configFilterButton").click();
    expect(document.querySelectorAll("#quickFiltersConfigDialog")).toHaveLength(
      1
    );
  });

  test("save trims values, defaults blanks, persists and applies them", () => {
    byId("configFilterButton").click();
    const [today, yesterday, snooze] = dialogInputs();
    today.value = "  is:unread  ";
    yesterday.value = "   ";
    snooze.value = "is:starred";
    dialogButton("Save").click();

    const expected = {
      today: "is:unread",
      yesterday: DEFAULT_CONFIG.yesterday,
      snooze: "is:starred",
    };
    expect(store[STORAGE_KEY]).toEqual(expected);
    expect(byId("quickFiltersConfigDialog")).toBeNull();

    byId("todayFilterButton").click();
    expect(searchValue()).toBe("is:unread");
  });

  test("reset restores defaults in the fields", () => {
    byId("configFilterButton").click();
    dialogInputs().forEach((i) => (i.value = "x"));
    dialogButton("Reset to defaults").click();
    expect(dialogInputs().map((i) => i.value)).toEqual([
      DEFAULT_CONFIG.today,
      DEFAULT_CONFIG.yesterday,
      DEFAULT_CONFIG.snooze,
    ]);
  });

  test("cancel closes without saving", () => {
    const before = store[STORAGE_KEY];
    byId("configFilterButton").click();
    dialogInputs()[0].value = "changed";
    dialogButton("Cancel").click();
    expect(byId("quickFiltersConfigDialog")).toBeNull();
    expect(store[STORAGE_KEY]).toBe(before);
  });
});

describe("sender highlighting", () => {
  const openMessage = (email: string) => {
    byId("main")?.remove();
    const header = document.createElement("div");
    header.id = "main";
    header.className = "gE";
    header.innerHTML = `<span class="gD" email="${email}">Someone</span>`;
    document.body.appendChild(header);
    return header;
  };

  test("H2O.ai sender gets a yellow header", async () => {
    const header = openMessage("a@h2o.ai");
    await flushObservers();
    expect(header.style.backgroundColor).toBe("rgb(255, 221, 0)");
    expect(header.querySelector("[data-quick-filters-domain]")).toBeNull();
  });

  test("other sender gets a domain badge", async () => {
    const header = openMessage("a@Example.com");
    await flushObservers();
    expect(
      header.querySelector("[data-quick-filters-domain]")?.textContent
    ).toBe("example.com");
  });
});
