(() => {
  const article = document.querySelector(".post");
  const content = document.querySelector(".post-content");
  const progress = document.getElementById("reading-progress");
  const tocCard = document.getElementById("toc-card");
  const tocList = document.getElementById("toc-list");

  if (!article || !content || !progress) {
    return;
  }

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const updateProgress = () => {
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const viewport = window.innerHeight;
    const start = articleTop - viewport * 0.2;
    const end = articleTop + articleHeight - viewport * 0.75;
    const ratio = clamp((window.scrollY - start) / Math.max(end - start, 1), 0, 1);
    progress.style.transform = `scaleX(${ratio})`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  if (!tocCard || !tocList) {
    return;
  }

  const headings = Array.from(content.querySelectorAll("h2, h3"));
  if (headings.length < 2) {
    return;
  }

  const ids = new Set();
  const toId = (text, index) => {
    const base = (text || "")
      .trim()
      .toLowerCase()
      .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "")
      .replace(/\s+/g, "-");
    const initial = base.length > 0 ? base : `section-${index + 1}`;
    let current = initial;
    let i = 2;
    while (ids.has(current)) {
      current = `${initial}-${i}`;
      i += 1;
    }
    ids.add(current);
    return current;
  };

  const links = [];
  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = toId(heading.textContent, index);
    }
    heading.style.scrollMarginTop = "88px";

    const item = document.createElement("li");
    item.className = `toc-item toc-${heading.tagName.toLowerCase()}`;

    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.className = "toc-link";

    item.appendChild(link);
    tocList.appendChild(item);
    links.push({ id: heading.id, link });
  });

  tocCard.hidden = false;

  const setActive = (id) => {
    links.forEach(({ id: targetId, link }) => {
      link.classList.toggle("is-active", targetId === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) {
        setActive(visible[0].target.id);
      }
    },
    { rootMargin: "-28% 0px -58% 0px", threshold: [0, 1] }
  );

  headings.forEach((heading) => observer.observe(heading));
})();
