# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension that injects UI into Gmail (`https://mail.google.com/*`)
via a content script, plus a toolbar popup. There is no background/service worker.
Features: T/Y/S filter buttons plus a ⚙ config dialog, today/yesterday date
highlighting, sender cues (H2O.ai header highlight, domain badge for others), a pinned
thread header, and Safari-style "Hide Distracting Items".

## Commands

| Task | Command |
| --- | --- |
| Install deps | `npm install` |
| Production build → `dist/` | `npm run build` |
| Dev build, rebuild on change | `npm run watch` (VS Code: `Ctrl+Shift+B`) |
| Run tests | `npm test` (or `npx jest`) |
| Run a single test file | `npx jest src/__tests__/utils.ts` |
| Run tests matching a name | `npx jest -t "<test name>"` |
| Format source | `npm run style` (prettier over `src/**/*.{ts,tsx}`) |
| Clean build output | `npm run clean` |

To load the extension: open `chrome://extensions`, enable Developer mode, and "Load
unpacked" the `dist/` directory. After a build, reload the extension to pick up changes.

## Architecture

- **`src/content_script.ts`**: webpack entry point and the whole runtime (DOM code).
  One `MutationObserver` on `document.body` (never replaced by Gmail) re-runs every
  feature on each re-render; see `design/adr/0001-single-body-mutation-observer.md`.
  Because the observer fires on our own DOM writes, every feature must be idempotent and
  only touch the DOM when something actually changed (otherwise it loops).
  - `addFilterButtons()`: inserts the button group (`#quickFiltersButtons`) after
    `form[role="search"]`. Buttons write a query into `input[name="q"]` and click
    `button[aria-label="Search mail"]`. Queries are read from `currentConfig` on each
    click.
  - `openConfigDialog()`: modal for editing the queries; saves via `saveConfig`.
  - `applyHighlights()`: re-queries `div[role="main"]` and recomputes dates and theme
    on every call (the SPA stays open across midnight and theme switches).
  - `highlightSenders()`: opened-message senders are `span.gD[email]` inside header
    `.gE`.
  - `updatePinnedHeader()`: our own fixed bar (not a moved Gmail node), driven by
    scroll/resize/mutations and batched with `requestAnimationFrame`.
- **`src/config.ts`**: `FILTERS` is the single source of truth for the buttons and
  dialog fields (key, letter, name). To add a filter, add a key to `FilterConfig`, a
  default query to `DEFAULT_CONFIG`, an entry to `FILTERS`, and a color to
  `FILTER_BUTTON_COLORS` in `content_script.ts`. Also holds storage helpers
  (`chrome.storage.sync`, key `filterConfig`) and `resolveConfig` (trim, blank →
  default).
- **Hide distracting items** (`design/adr/0002-hide-distracting-items.md`):
  - `src/hidden_items.ts`: state `{ selectors, enabled }` in storage key
    `hiddenItems`, `withSelector`, `hideCss`, and the `START_HIDE_PICKER` message
    type.
  - `src/hide_picker.ts`: `selectorFor` (stable selector for a clicked element;
    skips Gmail's `:xx` ids), `applyHiddenStyle` (one `<style>` element), `pickTarget` (widens a
    hovered element to the outermost wrapper with no other visible content, so no
    empty band is left behind), and `startHidePicker` (capture-phase listeners,
    outline, ↑/↓/Enter/Esc keys, Done banner).
  - `src/hidden_profiles.ts`: named saved sets of selectors (storage key
    `hiddenProfiles`), with `upsertProfile` (same name replaces), `removeProfile`,
    `applyProfile` and `isActiveProfile`.
  - `src/popup.ts` + `public/popup.html`: the toolbar popup, including the "Saved
    configurations" list. Popup tests load the real `popup.html` body. Toggle and reset write
    storage directly; the content script follows `storage.onChanged`. Only starting
    the picker sends a message to the active Gmail tab.
- **`src/storage.ts`**: `createSyncStore(key, defaults)` gives `merge`, `load`, `save`
  and `onChanged` for a `chrome.storage.sync` value; used by config and hidden items.
- **`src/dom.ts`**: shared `setStyle` helper.
- **`src/utils.ts`**: date formatting, theme colors and luminance, sender domain
  helpers. `formatDate` produces `"Tue, Dec 8, 2024"` (non-padded day) because it is
  substring-matched against Gmail's date `title` attribute.
- **`src/pinned_header.ts`**: pure logic for the pinned header.

All DOM targeting relies on Gmail's classes and ARIA attributes (`role="search"`,
`aria-label="Search mail"`, `.zo`, `.gD`, `.gE`, `.g3`, `h2.hP`). These selectors are the
fragile part: Gmail markup changes break the extension, not the build.

## Testing

- Pure modules are tested under the default node environment; DOM modules use jsdom
  via an `@jest-environment jsdom` docblock.
- `src/test_support/chrome_stub.ts` (outside `__tests__/`, so Jest doesn't run it as a
  test) installs an in-memory `chrome` global: `storage.sync` (fires `onChanged` like
  Chrome), `runtime.onMessage`, and mockable `tabs`.
- Entry-point tests (`content_script.ts`, `popup.ts`) build minimal markup and then
  `require` the module. The content-script test disconnects its observers in
  `afterAll`.

## Build & config

- **Webpack** (`webpack/`): `webpack.common.js` holds shared config (`content_script`
  and `popup` entries, `ts-loader`, copies everything from `public/` into `dist/`),
  merged with `webpack.dev.js` / `webpack.prod.js`. Edit `public/manifest.json` and
  `public/icon.png`, never the copies in `dist/`.
- **TypeScript**: `tsconfig.json` for the build, `tsconfig.test.json` for ts-jest.
- **CI** (`.github/workflows/build.yml`): `npm ci`, build and test on Node 20/22 for
  pushes and PRs to `main`.
- ADRs live in `design/adr/`.
