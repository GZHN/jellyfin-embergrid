// Alternative installation AFTER publishing your own GitHub repository.
// Replace both placeholders; use a release tag or commit you have tested.
(() => {
    'use strict';
    const repository = 'YOUR_GITHUB_USER/jellyfin-embergrid';
    const revision = 'v1.0.0';
    if (repository.includes('YOUR_GITHUB_USER')) {
        throw new Error('Configure the GitHub repository in the Embergrid loader first.');
    }
    const id = 'jellyfin-embergrid-loader';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = 'https://cdn.jsdelivr.net/gh/' + repository + '@' + revision + '/Jellyfin-Embergrid-Episode-Ratings.js';
    script.addEventListener('error', () => {
        console.error('[JF-Embergrid] Could not download script', script.src);
        script.remove();
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
})();
