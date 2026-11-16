# Changelog

## 1.1.1 — 2026-11-16

- **Ratings:** Match Jellyfin episodes to IMDb by absolute episode number when the library and IMDb split a show into seasons differently (e.g. Jellyfin S2E61 versus IMDb S1E61). Previously such episodes appeared twice, in an extra season column. Newly aired episodes not yet on IMDb stay in their own season.

## 1.1.0 — 2026-11-04

- **Reliability:** Continue displaying available Jellyfin ratings when IMDb identification or external dataset fetching fails; show a notice and allow the optional IMDb source to be retried without clearing existing ratings.
- **Tooltips:** Prevent stale asynchronous requests from closing the currently active tooltip, and make episode descriptions available on keyboard focus.
- **Accessibility:** Render the heatmap as a semantic HTML table with season and episode headers, improve axis-switch labels and keyboard focus behavior, and preserve both orientations.
- **Ratings:** Identify IMDb versus Jellyfin rating sources, flag mixed-source season averages, and make average colors match their displayed rounded scores.
- **Performance:** Use efficient episode lookups, cap episode indices and rendered grid cells, and improve narrow-screen and touch layouts.
- **Requests:** Add configurable time limits to Jellyfin API operations and external dataset fetching. Jellyfin request timeouts limit the UI wait but do not cancel the underlying request.
- **Lifecycle:** Replace frequent DOM polling with navigation events and mutation observation, retaining a reduced, visibility-aware fallback check.
- **Documentation:** Update usage, limitations and manual release validation guidance. The automated test harness now provides the browser observer used by the script.

## 1.0.0 — 2026-10-20

First release of Embergrid, a collapsible episode ratings heatmap for Jellyfin Web.

- Heatmap colors with a compact legend, and season averages in both orientations.
- One table that swaps seasons and episodes, with the choice remembered in the browser.
- Episode and season links into the local library, plus metadata tooltips.
- Ratings cached per server, web path, and signed-in user.
- External ratings time out after 15 seconds. A missing show is remembered; a temporary failure stays retryable.
- Visible keyboard focus, and optional on-screen diagnostics that stay off unless you turn them on.
- The table is inserted again if season cards appear after the page first loads.
