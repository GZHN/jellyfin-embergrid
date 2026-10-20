# Contributing

Use Node.js 22+ and run `npm run check` and `npm test`. There is no build step or dependency install. Edit the root JavaScript file directly. Keep the original MIT attribution.

Before releasing, manually verify in your own Jellyfin Web instance:

- Fresh page load and navigation into/out of series pages; no duplicate blocks.
- Block appears before Cast, including when season cards are loaded late.
- Expand/collapse, Retry after a failed request, and empty/no-dataset cases.
- Both axes orientations and remembered preference after refresh.
- Season averages exclude missing scores.
- Episode/season links, hover metadata and touch behavior where available.
- Keyboard focus and small-screen horizontal scrolling.
- Switching accounts/servers does not reuse another account's metadata.
- A previous injected version is disabled; refresh between versions.

Automated tests use VM mocks rather than a browser, so a green CI run does not certify layout, accessibility or API compatibility. Record actual Jellyfin, plugin, browser and theme versions with release validation. Keep screenshots focused on the component and free of private information.

Do not bundle dataset JSON or API credentials. Dataset schema changes should include fixtures representing the relevant shape and tests. Changes to selectors should document the observed Jellyfin layout.
