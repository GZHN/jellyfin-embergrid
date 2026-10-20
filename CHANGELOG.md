# Changelog

## 1.0.0 — 2026-10-20

First standalone export of the Miru edition.

- Retain the collapsible upstream ratings table, library links, tooltips and axes switch.
- Add Miru colors and legend, plus season averages in both orientations.
- Isolate cached metadata by server, web path and current user.
- Preserve negative dataset caching and add a 15-second external request timeout.
- Keep failed panel loads retryable with a Retry button.
- Restore visible keyboard focus and add optional mounting diagnostics (off by default).
- Retry page reconciliation when Jellyfin mounts season cards late.
- Remove experimental Grid/Wrapped/List selection; ship only the table.
- Fix the empty URL-name error introduced during development.
- Add dependency-free tests, GitHub CI, installation, attribution and publishing docs.
