# Contributing

Use Node.js 22+ and run `npm run check` and `npm test`. There is no build step or dependency install. Edit the root JavaScript file directly. Keep the original MIT attribution.

Before releasing, manually verify in your own Jellyfin Web instance:

- Fresh page load and navigation into/out of series pages; no duplicate blocks.
- Block appears before Cast, including when season cards are loaded late.
- Expand/collapse; local Jellyfin ratings when IMDb lookup or CDN fails; retry optional IMDb data without losing currently displayed ratings; empty/no-dataset and complete local-request failure states.
- Both axes orientations and remembered preference after refresh.
- Season averages exclude missing scores, include all rated episodes when rendering is capped, match displayed rounded heatmap colors, and distinguish single-source from mixed-source averages.
- Episode/season links, hover metadata, touch-and-hold and keyboard-focused tooltips; moving rapidly between cells must not let stale requests hide a newer tooltip.
- Native table row/column headers with a screen reader; keyboard focus after changing axes; narrow-screen scrolling and zoomed/touch layouts.
- Switching accounts/servers does not reuse another account's metadata.
- Navigation events, late-loaded season cards, inactive/visible browser tabs and resuming after navigation; no duplicate blocks.
- A previous injected version is disabled; refresh between versions.

Automated tests use VM mocks rather than a browser, so a green CI run does not certify layout, accessibility or API compatibility. Record actual Jellyfin, plugin, browser and theme versions with release validation. Keep screenshots focused on the component and free of private information.

Do not bundle dataset JSON or API credentials. Dataset schema changes should include fixtures representing the relevant shape and tests. Changes to selectors should document the observed Jellyfin layout.
