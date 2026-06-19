# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension that injects UI into Gmail (`https://mail.google.com/*`)
via a single content script. It adds two search-filter buttons ("T" / "Y") next to the
Gmail search bar and highlights today's/yesterday's dates in the email list.

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

The whole extension is one content script — there is no background/service worker or popup.

- **`src/content_script.ts`** — webpack entry point; the entire runtime. Two independent
  features, each driven by its own `MutationObserver` because Gmail's SPA renders the DOM
  asynchronously and re-renders constantly:
  - `addFilterButtons()` — waits for `form[role="search"]`, inserts buttons that write a
    query (`newer_than:1d`, `newer_than:2d older_than:1d`) into `input[name="q"]` and click
    `button[aria-label="Search mail"]`. Guards against duplicate insertion by checking for
    existing button IDs.
  - `highlightEmailDates()` → `highlightDates()` — finds rows via `tr span[title*="<date>"]`
    and sets a background color. Re-runs on every mutation inside `div[role="main"]`.
- **`src/utils.ts`** — date helpers (`getTodayDate`, `getYesterdayDate`, `formatDate`)
  producing strings like `"Tue, Dec 24, 2024"` via `Intl.DateTimeFormat`. This string format
  must match the `title` attribute Gmail puts on date elements — the highlight selector
  depends on it.

Because all DOM targeting relies on Gmail's CSS classes and ARIA attributes
(`role="search"`, `aria-label="Search mail"`, class `zo`, etc.), these selectors are the
fragile part: Gmail markup changes break the extension, not the build.

## Build & config

- **Webpack** (`webpack/`): `webpack.common.js` holds shared config (single `content_script`
  entry, `ts-loader`, copies everything from `public/` into `dist/`), merged with
  `webpack.dev.js` / `webpack.prod.js`. `public/manifest.json` and `public/icon.png` are
  copied verbatim into `dist/` — edit them in `public/`, never in `dist/`.
- **TypeScript**: `tsconfig.json` for the build, `tsconfig.test.json` for ts-jest.
- **CI** (`.github/workflows/build.yml`): runs `npm ci`, build, and tests on `master`. Note
  the workflow targets the `master` branch while the working branch here is `main`.

