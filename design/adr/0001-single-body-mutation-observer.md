# 1. Drive all features from a single MutationObserver on document.body

Date: 2026-11-02

## Status

Accepted

## Context

Gmail is a long-lived SPA that renders asynchronously and constantly re-mounts large
parts of its DOM. When a search runs (for example after clicking a filter button), it
replaces `div[role="main"]`, so an observer attached to that container ends up watching
a detached node and silently stops working. Every feature (filter buttons, date
highlighting, sender cues, pinned header) needs to re-apply itself after re-renders.

## Decision

The content script registers one `MutationObserver` on `document.body`, which Gmail never
replaces, with `{ childList: true, subtree: true }`. Each mutation re-runs every feature.
Features re-query their Gmail containers on every run instead of caching them, and
recompute time- and theme-dependent values (today's date, dark mode) each time. The
pinned header is also driven by captured `scroll` and `resize` events and batched to one
update per animation frame.

## Consequences

- Features keep working across Gmail view changes, date rollovers and theme switches
  without a reload.
- Our own DOM writes trigger the observer, so every feature must be idempotent and must
  only write when the DOM actually needs to change (guard by element ID or data
  attribute, compare text before setting it). Otherwise the observer loops forever.
- Every mutation re-runs a few `querySelector` calls. That has been cheap in practice.
  If it ever becomes a problem, debounce the observer callback.
