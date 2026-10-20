# Troubleshooting

## No ratings section

- Confirm the Injector entry is enabled and saved, and refresh the browser fully.
- Open a **series page with season cards**. The section is inserted before Cast, or after the season container when Cast is absent.
- Disable any other episode-ratings script. Run only one implementation.
- Copy the complete raw JavaScript file, not the GitHub HTML page, a Markdown link, or code containing literal HTML entities.
- Set `CONFIG.DEBUG` to `true`, save and refresh. On-screen status reports the mounting stage; console errors include additional detail. Restore `false` when finished.
- If an old status remains after updating, verify the saved code and fully reload. The initialization guard intentionally prevents multiple executions in one page lifetime.
- A custom theme or changed Jellyfin layout may use different season selectors. Report the layout and versions.

## Empty URL error

Early development versions called Jellyfin's URL builder with an empty name while computing the cache scope. The release no longer calls the URL builder for that scope. Check for obsolete enabled entries before reporting this error against 1.0.0.

## Loading failed / Retry

Confirm you remain signed in. Check browser network requests to your Jellyfin server and to the configured dataset host. External dataset requests time out after 15 seconds. Retry the panel or close and reopen it. A missing dataset (404) is cached as unavailable; a temporary network/server error is not cached as success.

## Unexpected episodes or ratings

Dataset numbering can differ from your Jellyfin metadata, especially for anime, specials and combined files. The script merges by positive season and episode number. Local CommunityRating is used where the external dataset lacks a score. External-only cells need not correspond to playable local files. Season 0 is not included.

## Cached results / reset

Cache expires after CACHE_MINUTES (120 by default). Closing the tab ends its session storage. To clear only this script's cache, use the browser console:

```javascript
Object.keys(sessionStorage)
  .filter(key => key.startsWith('embergrid-v1:'))
  .forEach(key => sessionStorage.removeItem(key));
localStorage.removeItem('jf-imdb-episodes-grid-inverted-v1');
location.reload();
```

This also resets the axes preference. Do not clear all site storage unnecessarily; it may affect your Jellyfin sign-in and other preferences.

## Reporting a problem

Use the GitHub bug template. Include Jellyfin / Injector / browser versions, theme name, installation method, exact error, steps and expected behavior. Remove tokens, private hostnames, user details and private library information from logs/screenshots. A screenshot of only the grid is usually enough.
