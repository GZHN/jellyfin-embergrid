# Jellyfin Miru Ratings

A Miru-inspired episode ratings grid for **Jellyfin Web**, installed through [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector).

A collapsible table appears between Seasons and Cast. Open it to fetch ratings. Use the top-left switch to swap seasons and episodes. There is no separate view selector.

**[Nederlandse installatiehandleiding](docs/INSTALL-NL.md)** · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Publishing](docs/PUBLISHING.md) · [Changelog](CHANGELOG.md)

## Features

- Miru's stepped rating colors and a compact legend.
- One table with horizontal/vertical axis switching; preference saved in the browser.
- Season averages calculated from rated episodes only.
- Episode and season links to your Jellyfin library, with IMDb season links as fallback.
- Episode metadata tooltips on hover; touch-and-hold support inherited from upstream.
- Closed by default to keep ratings hidden until you choose to open them.
- Cached metadata and ratings, isolated by server, web path and user.
- 15-second external dataset timeout, visible Retry on load errors, visible keyboard focus.
- No build step, account, API key or npm installation needed to use the script.

## Requirements and compatibility

- A Jellyfin server with [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) installed and working.
- A browser/client using Jellyfin Web and allowing the injected code to run. Native clients that do not load Jellyfin Web are outside scope.
- A modern browser with `fetch`, `AbortSignal.timeout`, local/session storage and CSS Grid.
- Series pages with season cards. Movies and individual episode pages are not targets.
- Internet access to jsDelivr for external ratings. Existing cached data can be used until it expires.

The user confirmed that the v3 predecessor mounted successfully in a local Jellyfin instance and supplied grid/list/wrapped screenshots. Later revisions removed the additional views. Exact Jellyfin, plugin and browser versions were not recorded; this is not a version-by-version compatibility certification.

## Install: paste the complete script (recommended)

1. Install JavaScript Injector using its own instructions and restart Jellyfin if required by the plugin.
2. Open **Dashboard → JavaScript Injector / JS Injector**.
3. Disable/remove any previous episode-ratings loader or script to avoid competing implementations.
4. Add a script named **Miru Episode Ratings**.
5. Open [Jellyfin-Miru-Episode-Ratings.js](Jellyfin-Miru-Episode-Ratings.js), select **Raw**, and copy the entire contents into **JavaScript Code**. Do not include Markdown fences or HTML script tags.
6. Enable the entry and save. If your plugin exposes a Script URL field, leave it empty for this installation method. This script is not an ES module.
7. Refresh Jellyfin with **Ctrl+F5**, open a series with seasons, and expand **IMDb Episodes Grid**.

Pasting the complete file needs **no hosting**. To update, replace the pasted contents with a newer tested version and refresh.

## Optional: load from your GitHub repository

After publishing your own repository, follow [the publishing guide](docs/PUBLISHING.md). The optional [loader template](examples/cdn-loader.js) points at your published script and prevents duplicate downloads. Configure its repository and tested revision before use. It is an alternative to full-file pasting, not an additional script to enable alongside it.

## Configuration

Edit the `CONFIG` object near the top before pasting:

| Option | Default | Purpose |
| --- | --- | --- |
| TITLE | IMDb Episodes Grid | Collapsible section heading |
| EMPTY_TEXT | No ratings available for this series. | No-data message |
| DEBUG | false | Temporary on-screen mount diagnostics |
| TOOLTIP | true | Metadata tooltips |
| TOOLTIP_DELAY_MS | 800 | Mouse hover delay |
| TOOLTIP_WIDTH_PX | 400 | Tooltip width, capped to viewport |
| CACHE_MINUTES | 120 | Browser-tab cache lifetime |
| MAX_SEASONS | 500 | Highest included season number |
| MAX_EPISODE_SPAN | 200 | Extra episode indices allowed for a combined file |
| DATASET_URL | ya0903 dataset on jsDelivr | External per-show ratings JSON folder |

The dataset request timeout is currently fixed at 15 seconds. Specials (season 0) are excluded. Switching axes uses the existing upstream local-storage preference key.

## Rating colors

| Rating | Legend | Color |
| --- | --- | --- |
| 9.6–10 | Masterpiece | Blue |
| 9.0–9.5 | Amazing | Dark green |
| 8.0–8.9 | Great | Green |
| 7.0–7.9 | Good | Yellow |
| 6.0–6.9 | Average | Orange |
| 5.0–5.9 | Bad | Red |
| Below 5 | Trash | Purple |

Missing ratings appear as an em dash and do not count toward averages. Averages are simple arithmetic means, rounded for display; they are not weighted by votes. A combined episode file may represent multiple numbered episodes.

## Data and privacy

On expansion, the script reads the current show's IMDb provider ID and episode/season metadata through your authenticated Jellyfin client. It fetches the matching show JSON from [ya0903/imdb-episode-dataset](https://github.com/ya0903/imdb-episode-dataset) through jsDelivr. Dataset ratings take precedence; Jellyfin CommunityRating is the fallback and is **not guaranteed to be an IMDb score**.

The external request contains the IMDb show ID, not your Jellyfin token or user ID. It uses `credentials: omit`. As with normal HTTPS requests, the dataset host can see connection metadata such as your IP address. A CDN-loader installation also contacts the script CDN at page load. There is no added telemetry.

Browser session storage contains cached metadata/ratings; local storage stores the axes preference. These stores are readable by other scripts running on the same origin. Metadata tooltips request additional information from your Jellyfin server.

## Known limitations

- Jellyfin DOM/custom-theme changes may require selector updates.
- Dataset season numbering can differ from your library; additional dataset-only episode cells can appear. This is not a guarantee of a playable local episode or perfect anime ordering.
- The grid falls back to IMDb season pages when a local target is unavailable.
- External request failures show Retry; data is not silently rendered partially in that case.
- Reconciliation runs every 800 ms while the page is open. Duplicate execution is guarded, but updating installed code requires a full refresh.
- A successful network download does not prove the grid initialized. See troubleshooting.

## Development and validation

Use **Node.js 22 or newer**. No dependencies need installing.

```sh
npm run check
npm test
```

The nine automated tests use mocked browser/API objects to check cache isolation, negative dataset caching, error retries, merged episodes, palette boundaries and the previously observed empty-URL regression. They do not replace rendering or real Jellyfin tests. CI runs syntax checks and tests on Node 22 and 24.

See [CONTRIBUTING.md](CONTRIBUTING.md) for manual validation before releasing.

## Credits and license

Derived from [Damocles-fr's Jellyfin Episodes Ratings Grid](https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid). This edition adds Miru-inspired styling, averages and reliability adjustments. Thanks to n00bcodr for JavaScript Injector, ya0903 for the dataset and upstream contributors including grimmdev for tooltip work. This project is not affiliated with Jellyfin or IMDb.

Distributed under the [MIT license](LICENSE), retaining the original copyright. See [NOTICE.md](NOTICE.md) for provenance. External services and data retain their own terms.
