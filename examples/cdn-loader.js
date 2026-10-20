// Alternative installation AFTER publishing your own GitHub repository.
// Replace both placeholders; use a release tag or commit you have tested.
(() => {
    'use strict';
    const repository = 'YOUR_GITHUB_USER/jellyfin-miru-ratings';
    const revision = 'v1.0.0';
    if (repository.includes('YOUR_GITHUB_USER')) {
        throw new Error('Configure the GitHub repository in the Miru loader first.');
    }
    const id = 'jellyfin-miru-ratings-loader';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = 'https://cdn.jsdelivr.net/gh/' + repository + '@' + revision + '/Jellyfin-Miru-Episode-Ratings.js';
    script.addEventListener('error', () => {
        console.error('[JF-Miru] Could not download script', script.src);
        script.remove();
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
})();
