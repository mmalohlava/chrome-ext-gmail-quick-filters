# Gmail Quick Filters

A Chrome extension (Manifest V3) that adds quick search filters and visual cues to Gmail.

## Features

- **Filter buttons** next to the Gmail search bar:
  - **T**: today's email (`newer_than:1d`, excluding GitHub, calendar notifications and
    `LISTS/privacy-atlas`)
  - **Y**: yesterday's email (`newer_than:2d older_than:1d`, same exclusions)
  - **S**: snoozed/pinned email (`label:pinned`)
  - **⚙**: edits the queries. They are saved in `chrome.storage.sync`, so they follow you
    across devices; leaving a query blank restores its default.
- **Date highlighting**: today's and yesterday's dates in the email list are shown as
  colored chips, adapted to Gmail's light or dark theme.
- **Sender cues**: in an opened email, H2O.ai senders get a yellow header; every other
  sender gets a red badge with their domain.
- **Pinned header**: when you scroll through a thread, a bar at the top of the reading
  pane shows the subject and the current message's sender and date.

## Development

Requires [Node.js](https://nodejs.org/) 20 or later.

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Production build into `dist/` | `npm run build` |
| Watch mode (VS Code: `Ctrl+Shift+B`) | `npm run watch` |
| Run tests | `npm test` |
| Format source | `npm run style` |

| Folder | Content |
| --- | --- |
| `src/` | TypeScript sources and tests (`src/__tests__/`) |
| `public/` | `manifest.json` and icon, copied into `dist/` |
| `dist/` | Built, loadable extension |
| `design/adr/` | Architecture decision records |

## Load into Chrome

Open `chrome://extensions`, enable Developer mode, click **Load unpacked** and select
`dist/`. After rebuilding, reload the extension.
