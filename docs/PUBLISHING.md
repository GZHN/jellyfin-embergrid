# Publish on GitHub

This folder is the complete project. It contains no private runtime dependencies, user data, or secrets.

## Browser upload

1. Create a new repository on GitHub; suggested name: **jellyfin-embergrid**.
2. Upload the **contents** of this project folder to the repository root, preserving docs, tests, examples and the hidden .github folder. Do not upload only the ZIP if you want browseable code and CI.
3. Keep LICENSE and NOTICE.md. Review README and replace any example repository owner placeholders used in the loader.
4. Open the Actions tab and confirm checks pass.
5. Perform the manual checks in CONTRIBUTING.md, recording the versions tested.
6. Create a release tagged **v1.0.0**. Clearly describe the manual validation that actually ran.

GitHub's browser upload may omit hidden dotfiles if your file picker hides them. Check that .github/workflows/check.yml is present; otherwise upload it separately or use Git.

## Git upload from this standalone folder

Run these commands in this project folder. Replace YOUR_GITHUB_USER with your account and create the remote repository first:

```sh
git init -b main
git add .
git commit -m "Initial Embergrid release"
git remote add origin https://github.com/YOUR_GITHUB_USER/jellyfin-embergrid.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

## CDN installation after publication

examples/cdn-loader.js and the loader snippet in the README point at GZHN/jellyfin-embergrid. For a fork, change the repository and tag in the script URL to your own repository and the tag you published. Paste that loader into the Injector field instead of the full script. The script file must exist at the repository root at that tag.

Example published URL shape:

```text
https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/jellyfin-embergrid@v1.0.0/Jellyfin-Embergrid-Episode-Ratings.js
```

This example is a template, not a live project URL. CDN propagation/caching can delay new content. Prefer immutable tested tags or commits; do not move an existing release tag. To upgrade, change the loader revision, save and fully refresh. An @latest/main reference tracks future upstream changes and reduces predictability.

## Release checklist

- Run npm run check and npm test; confirm GitHub Actions passes.
- Perform manual Jellyfin checks and record versions/results.
- Update script version, package.json and CHANGELOG consistently.
- After tagging, update the pinned tag in the README loader snippet and examples/cdn-loader.js.
- Keep upstream license/attribution; review external dataset terms if changing how it is used.
- Ensure DEBUG is false by default; no private screenshots or tokens in the repository.
- Configure issue templates and optionally enable private vulnerability reporting.

Suggested description: **Episode ratings heatmap for Jellyfin Web, with switchable axes, season averages and library links.**
Suggested topics: jellyfin, jellyfin-web, episode-ratings, heatmap, javascript.
