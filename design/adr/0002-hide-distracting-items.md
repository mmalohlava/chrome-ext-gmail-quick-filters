# 2. Hide distracting items with saved CSS selectors, controlled from a popup

Date: 2026-11-02

## Status

Accepted

## Context

Users want to hide Gmail UI elements the way Safari's "Hide Distracting Items" does:
pick elements by clicking them, have the choice remembered, temporarily show them again,
and reset. Gmail re-renders constantly, its element ids (`:1x`) change on every load, and
its class names are obfuscated but fairly stable.

## Decision

- **Entry point:** the extension's toolbar popup (`popup.html` / `src/popup.ts`), the
  first UI outside the content script. It shows *Hide Distracting Items…*, an *Apply
  hidden items (n)* toggle and *Reset hidden items*.
- **State:** `{ selectors: string[], enabled: boolean }` in `chrome.storage.sync`
  (key `hiddenItems`). The popup writes storage directly for toggle and reset, and
  the content script follows changes through `storage.onChanged`. Only starting the
  picker needs a message (`START_HIDE_PICKER`) to the active Gmail tab.
- **Identification:** each picked element is saved as a CSS selector built from
  attributes likely to survive reloads: tag, non-`:` ids, classes, `role`,
  `aria-label`, `data-tooltip`, `name`. Ancestors are added until the selector matches
  only that element. Positional `:nth-of-type` is a last resort.
- **Hiding:** one injected `<style>` with a `display: none !important` rule per
  selector. CSS applies automatically to Gmail's re-renders, so the body
  MutationObserver (ADR 1) needs no extra work.
- **Picking:** capture-phase listeners on `window` outline the hovered element and
  swallow pointer, click and handled key events so Gmail never acts on them. Done or
  Escape ends it.
- **Selection widening:** hiding only the clicked element left its wrappers' height and
  padding as an empty band (seen with Gmail's inbox tab bar). The hovered element is
  therefore widened to the outermost ancestor holding no other visible content
  (text, media or controls; `display: none` siblings don't count). ArrowUp/ArrowDown
  widen or narrow the selection manually and Enter hides it.

## Consequences

- Hiding is cheap and has no flicker. Toggling and resetting are instant in all open
  Gmail tabs and synced across devices.
- A selector can stop matching when Gmail changes its markup, or when it was built from a
  dynamic `aria-label` or a temporary hover/state class. The item then reappears and must
  be picked again. Reset clears selectors that no longer match.
- Per-item un-hiding isn't supported; Reset is all-or-nothing.
- `chrome.storage.sync` limits one item to about 8 KB, which is roughly a few dozen
  selectors.
