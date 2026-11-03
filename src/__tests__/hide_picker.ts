/**
 * @jest-environment jsdom
 */
import {
  applyHiddenStyle,
  HIDDEN_STYLE_ID,
  PICKER_BANNER_ID,
  pickTarget,
  selectorFor,
  startHidePicker,
} from "../hide_picker";

const el = (selector: string) => document.querySelector<HTMLElement>(selector)!;
const unique = (target: Element) => {
  const selector = selectorFor(target);
  const matches = document.querySelectorAll(selector);
  expect(matches).toHaveLength(1);
  expect(matches[0]).toBe(target);
  return selector;
};

describe("selectorFor", () => {
  test("uses a stable id when present", () => {
    document.body.innerHTML = `<div><span id="promo">x</span></div>`;
    expect(unique(el("#promo"))).toBe('span[id="promo"]');
  });

  test("ignores Gmail's per-session ':xx' ids", () => {
    document.body.innerHTML = `<div id=":1a" class="ad">x</div><div class="other"></div>`;
    expect(unique(el(".ad"))).toBe("div.ad");
  });

  test("uses role and aria-label attributes", () => {
    document.body.innerHTML = `
      <a role="button" aria-label="Upgrade"></a>
      <a role="button" aria-label="Help"></a>`;
    expect(unique(el('[aria-label="Upgrade"]'))).toBe(
      'a[role="button"][aria-label="Upgrade"]'
    );
  });

  test("escapes quotes in attribute values", () => {
    document.body.innerHTML = `<a aria-label='Say "hi"'></a><a></a>`;
    expect(unique(el("a"))).toBe('a[aria-label="Say \\"hi\\""]');
  });

  test("adds ancestors until the selector is unique", () => {
    document.body.innerHTML = `
      <div class="left"><span class="chip"></span></div>
      <div class="right"><span class="chip"></span></div>`;
    expect(unique(el(".right .chip"))).toBe("div.right > span.chip");
  });

  test("falls back to an nth-of-type path for identical siblings", () => {
    document.body.innerHTML = `<ul><li></li><li></li><li></li></ul>`;
    const second = document.querySelectorAll("li")[1];
    expect(unique(second)).toBe("li:nth-of-type(2)");
  });
});

describe("pickTarget", () => {
  test("widens to the outermost wrapper holding only that element", () => {
    document.body.innerHTML = `
      <div class="wrap"><div class="spacer"></div>
        <div class="bar"><span class="tab">Primary</span><span class="tab">Social</span></div>
      </div>
      <div class="list">mail</div>`;
    expect(pickTarget(el(".bar"))).toBe(el(".wrap"));
  });

  test("stops below an ancestor with other visible content", () => {
    document.body.innerHTML = `<div class="row"><span class="tab">Primary</span><span>Social</span></div>`;
    expect(pickTarget(el(".tab"))).toBe(el(".tab"));
  });

  test("treats images and icons as content", () => {
    document.body.innerHTML = `<div class="row"><span class="tab"></span><img /></div>`;
    expect(pickTarget(el(".tab"))).toBe(el(".tab"));
  });

  test("ignores siblings that are already hidden", () => {
    document.body.innerHTML = `
      <div class="wrap"><span class="tab">Primary</span><span style="display: none">x</span></div>`;
    expect(pickTarget(el(".tab"))).toBe(el(".wrap"));
  });

  test("never returns body", () => {
    document.body.innerHTML = `<span class="only">x</span>`;
    expect(pickTarget(el(".only"))).toBe(el(".only"));
  });
});

describe("applyHiddenStyle", () => {
  test("writes one style element and updates it in place", () => {
    applyHiddenStyle({ selectors: ["#a"], enabled: true });
    applyHiddenStyle({ selectors: ["#a", "#b"], enabled: true });
    const styles = document.querySelectorAll(`#${HIDDEN_STYLE_ID}`);
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain("#b { display: none !important; }");

    applyHiddenStyle({ selectors: ["#a"], enabled: false });
    expect(styles[0].textContent).toBe("");
  });
});

describe("startHidePicker", () => {
  let onPick: jest.Mock;
  let pageClick: jest.Mock;
  let stop: () => void;

  beforeEach(() => {
    document.body.innerHTML = `<div class="ad"><button class="cta">Buy</button><span>Now</span></div>`;
    pageClick = jest.fn();
    el(".cta").addEventListener("click", pageClick);
    onPick = jest.fn();
    stop = startHidePicker(onPick);
  });

  afterEach(() => stop());

  test("shows a banner, only once", () => {
    startHidePicker(onPick);
    expect(document.querySelectorAll(`#${PICKER_BANNER_ID}`)).toHaveLength(1);
  });

  test("clicking an element reports its selector and blocks the page action", () => {
    el(".cta").click();
    expect(onPick).toHaveBeenCalledWith("button.cta");
    expect(pageClick).not.toHaveBeenCalled();
  });

  test("ignores clicks on the picker's own UI", () => {
    el(`#${PICKER_BANNER_ID}`).click();
    expect(onPick).not.toHaveBeenCalled();
  });

  test("Done button stops picking and restores page clicks", () => {
    el(`#${PICKER_BANNER_ID} button`).click();
    expect(el(`#${PICKER_BANNER_ID}`)).toBeNull();
    el(".cta").click();
    expect(onPick).not.toHaveBeenCalled();
    expect(pageClick).toHaveBeenCalledTimes(1);
  });

  test("clicking picks the widened wrapper", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="tabs"><div class="inner"><b class="tab">Primary</b></div></div>`
    );
    el(".tab").click();
    expect(onPick).toHaveBeenCalledWith("div.tabs");
  });

  test("ArrowUp widens and ArrowDown narrows the selection; Enter picks it", () => {
    const key = (k: string) =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
    el(".cta").dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    key("ArrowUp");
    key("Enter");
    expect(onPick).toHaveBeenLastCalledWith("div.ad");
    key("ArrowUp"); // can't widen past body's children
    key("ArrowDown");
    key("Enter");
    expect(onPick).toHaveBeenLastCalledWith("button.cta");
  });

  test("Escape stops picking", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(el(`#${PICKER_BANNER_ID}`)).toBeNull();
  });
});
