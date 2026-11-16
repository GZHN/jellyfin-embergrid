// Embergrid loader for JavaScript Injector: paste this instead of the full script.
// Pinned to a release tag; change the version to update. Running a fork? Replace
// GZHN/jellyfin-embergrid with your repository and a tag you have tested.
(() => {
  if (document.querySelector("#jellyfin-embergrid-loader")) return;

  const script = document.createElement("script");
  script.id = "jellyfin-embergrid-loader";
  script.src =
    "https://cdn.jsdelivr.net/gh/GZHN/jellyfin-embergrid@v1.1.1/Jellyfin-Embergrid-Episode-Ratings.js";
  script.async = true;
  script.onerror = () => {
    console.error("[JF-Embergrid] Could not download script", script.src);
    script.remove();
  };
  document.head.appendChild(script);
})();
