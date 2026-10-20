# Changelog

## 1.0.0 — 2026-10-20

First release of Embergrid, a collapsible episode ratings heatmap for Jellyfin Web.

- Heatmap colors with a compact legend, and season averages in both orientations.
- One table that swaps seasons and episodes, with the choice remembered in the browser.
- Episode and season links into the local library, plus metadata tooltips.
- Ratings cached per server, web path, and signed-in user.
- External ratings time out after 15 seconds. A missing show is remembered; a temporary failure stays retryable.
- Visible keyboard focus, and optional on-screen diagnostics that stay off unless you turn them on.
- The table is inserted again if season cards appear after the page first loads.
