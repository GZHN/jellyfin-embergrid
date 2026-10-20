# Publish on GitHub

The export is a standalone folder. It contains no Miru runtime dependencies, git history, user data or secrets. No remote repository has been created by this export.

## Browser upload

1. Create a new repository on GitHub; suggested name: **jellyfin-miru-ratings**.
2. Upload the **contents** of this project folder to the repository root, preserving docs, tests, examples and the hidden .github folder. Do not upload only the ZIP if you want browseable code and CI.
3. Keep LICENSE and NOTICE.md. Review README and replace any example repository owner placeholders used in the loader.
4. Open the Actions tab and confirm checks pass.
5. Perform the manual checks in CONTRIBUTING.md, recording the versions tested.
6. Create a release tagged **v1.0.0**. Clearly describe the manual validation that actually ran.

GitHub's browser upload may omit hidden dotfiles if your file picker hides them. Check that .github/workflows/check.yml is present; otherwise upload it separately or use Git.

## Git upload from this standalone folder

Use these commands only in this exported project folder, not the parent Miru repository. Replace YOUR_GITHUB_USER with your account and create the remote repository first:

```sh
git init -b main
git add .
git commit -m "Initial standalone Miru ratings release"
git remote add origin https://github.com/YOUR_GITHUB_USER/jellyfin-miru-ratings.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

## CDN installation after publication

Edit examples/cdn-loader.js: set repository to YOUR_GITHUB_USER/jellyfin-miru-ratings and revision to the tag you published. Paste that configured loader into the Injector field instead of the full script. The file must exist at the repository root at that tag.

Example published URL shape:

```text
https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/jellyfin-miru-ratings@v1.0.0/Jellyfin-Miru-Episode-Ratings.js
```

This example is a template, not a live project URL. CDN propagation/caching can delay new content. Prefer immutable tested tags or commits; do not move an existing release tag. To upgrade, change the loader revision, save and fully refresh. An @latest/main reference tracks future upstream changes and reduces predictability.

## Release checklist

- Run npm run check and npm test; confirm GitHub Actions passes.
- Perform manual Jellyfin checks and record versions/results.
- Update script version, package.json and CHANGELOG consistently.
- Keep upstream license/attribution; review external dataset terms if changing how it is used.
- Ensure DEBUG is false by default; no private screenshots or tokens in the repository.
- Configure issue templates and optionally enable private vulnerability reporting.

Suggested description: **Miru-inspired episode ratings table for Jellyfin Web, with switchable axes, season averages and library links.**
Suggested topics: jellyfin, jellyfin-web, episode-ratings, heatmap, javascript.
