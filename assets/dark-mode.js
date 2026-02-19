(() => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const getTheme = () => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
    );
  };

  applyTheme(getTheme());

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
})();
