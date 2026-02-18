(() => {
  const currentBuild = document.documentElement.getAttribute("data-build") || "";
  const reloadKey = "cache-guard:reloaded-for";

  if (!currentBuild) {
    return;
  }

  const removeCacheParam = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("__cb")) {
      return;
    }
    url.searchParams.delete("__cb");
    window.history.replaceState(null, "", url.toString());
  };

  const checkLatestBuild = async () => {
    try {
      const response = await fetch(window.location.href, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      const dataBuildMatch = html.match(/data-build=["']([^"']+)["']/i);
      const metaMatch = html.match(/<meta\s+name=["']site-build["']\s+content=["']([^"']+)["']/i);
      const latestBuild = (dataBuildMatch && dataBuildMatch[1]) || (metaMatch && metaMatch[1]) || "";
      if (!latestBuild) {
        return;
      }
      if (latestBuild === currentBuild) {
        removeCacheParam();
        return;
      }

      const alreadyReloadedFor = window.sessionStorage.getItem(reloadKey);
      if (alreadyReloadedFor === latestBuild) {
        return;
      }

      window.sessionStorage.setItem(reloadKey, latestBuild);
      const next = new URL(window.location.href);
      next.searchParams.set("__cb", latestBuild);
      window.location.replace(next.toString());
    } catch (error) {
      // Keep page usable even when cache validation fails.
    }
  };

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });

  if (document.readyState === "complete") {
    checkLatestBuild();
  } else {
    window.addEventListener("load", checkLatestBuild, { once: true });
  }
})();
