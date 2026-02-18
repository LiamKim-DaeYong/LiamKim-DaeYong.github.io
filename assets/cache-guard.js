(() => {
  const currentBuild = document.documentElement.getAttribute("data-build") || "";
  const reloadKey = "cache-guard:reloaded-for";
  const lastBuildKey = "cache-guard:last-build";

  if (!currentBuild) {
    return;
  }

  const unregisterServiceWorkers = async () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      // Ignore and continue.
    }
  };

  const sanitizeUrl = (url) => {
    url.searchParams.delete("__cb");
    url.searchParams.delete("__vprobe");
    return url;
  };

  const getLocal = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return "";
    }
  };

  const setLocal = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore and continue.
    }
  };

  const getSession = (key) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return "";
    }
  };

  const setSession = (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      // Ignore and continue.
    }
  };

  const reloadWithBuild = (build) => {
    const alreadyReloadedFor = getSession(reloadKey);
    if (alreadyReloadedFor === build) {
      return;
    }
    setSession(reloadKey, build);
    const next = sanitizeUrl(new URL(window.location.href));
    next.searchParams.set("__cb", build);
    window.location.replace(next.toString());
  };

  const removeCacheParam = () => {
    const url = sanitizeUrl(new URL(window.location.href));
    const hadCb = window.location.href.includes("__cb=");
    const hadProbe = window.location.href.includes("__vprobe=");
    if (!hadCb && !hadProbe) {
      return;
    }
    window.history.replaceState(null, "", url.toString());
  };

  const parseBuildFromHtml = (html) => {
    const dataBuildMatch = html.match(/data-build=["']([^"']+)["']/i);
    const metaMatch = html.match(/<meta\s+name=["']site-build["']\s+content=["']([^"']+)["']/i);
    return (dataBuildMatch && dataBuildMatch[1]) || (metaMatch && metaMatch[1]) || "";
  };

  const checkLatestBuild = async (attempt) => {
    try {
      const probeUrl = sanitizeUrl(new URL(window.location.href));
      probeUrl.searchParams.set("__vprobe", `${Date.now()}-${attempt}`);

      const response = await fetch(probeUrl.toString(), {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      const latestBuild = parseBuildFromHtml(html);
      if (!latestBuild) {
        return;
      }

      if (latestBuild === currentBuild) {
        setLocal(lastBuildKey, currentBuild);
        removeCacheParam();
        return;
      }

      reloadWithBuild(latestBuild);
    } catch (error) {
      // Keep page usable even when cache validation fails.
    }
  };

  const knownBuild = getLocal(lastBuildKey);
  if (knownBuild && knownBuild !== currentBuild) {
    reloadWithBuild(currentBuild);
    return;
  }

  setLocal(lastBuildKey, currentBuild);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });

  unregisterServiceWorkers();

  const runCheck = () => {
    checkLatestBuild(1);
    window.setTimeout(() => checkLatestBuild(2), 1400);
  };

  if (document.readyState === "complete") {
    runCheck();
  } else {
    window.addEventListener("load", runCheck, { once: true });
  }
})();
