# Attribution and provenance

This is a derivative of:

- Project: https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid
- File: Jellyfin-Episodes-Ratings-Grid-JF-Library-Links.js
- Original copyright: Copyright (c) 2026 Damocles-fr
- Original license: MIT; original notice and permission text preserved in LICENSE.

The starting source was retrieved from main on 2026-10-20, then compared with the exact @latest jsDelivr script on the same day. The downloaded original CDN file has SHA-256:

4a20d4029c18e2a22c8fc4f5b75303f2bfab35846d7c86ac1795901af3a2641a

The latest commit reported by GitHub for the upstream script when preparing this package was 115ab175cae79d948d0d3d144fc7978eaf26fda6. This is reference metadata, not a claim that the downloaded CDN artifact exactly matched that commit.

Changes in this edition include the Miru rating palette/legend, season averages in both orientations, visible keyboard focus, server/user cache scope, timeout and retry handling, and repeated page reconciliation. Grid-only behavior follows user feedback. Earlier development-only Wrapped/List versions are not distributed.

Other acknowledgments:

- n00bcodr/Jellyfin-JavaScript-Injector: installation integration, no plugin code bundled.
- ya0903/imdb-episode-dataset: external ratings source, no dataset bundled.
- grimmdev and upstream contributors: tooltip work credited by upstream.
- Miru: palette and presentation inspiration from the local MyAnimeList companion project.

The upstream license covers code, not rights to external datasets, trademarks or media. No personal Jellyfin screenshots, credentials, library exports or Miru database are bundled. AI-assisted development was used; the validation scope is documented in README and CONTRIBUTING.
