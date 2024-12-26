# Chrome extension for quick GMail filters.

The extension enhances GMail with two buttons to quickly access Today and Yesterday emails.
Today/Yesterday emails also contain highlighted date.

Table of contents:

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Open in Visual Studio Code](#open-in-visual-studio-code)
- [Build](#build)
- [Build in watch mode](#build-in-watch-mode)
  - [terminal](#terminal)
  - [Visual Studio Code](#visual-studio-code)
- [Load extension to chrome](#load-extension-to-chrome)
- [Test](#test)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Prerequisites

- [node + npm](https://nodejs.org/) (Current Version)

## Project Structure

| Folder       | Description                |
| ------------ | -------------------------- |
| `src/`       | TypeScript source files    |
| `public/`    | static files               |
| `dist`       | Chrome Extension directory |
| `dist/js`    | Generated JavaScript files |


## Setup

```
npm install
```

## Build

```
npm run build
```

## Build in watch mode

### terminal

```
npm run watch
```

### Visual Studio Code

Run watch mode.

type `Ctrl + Shift + B`

## Load extension to chrome

Load `dist` directory.

## Test

Run `npx jest` or `npm run test`.
