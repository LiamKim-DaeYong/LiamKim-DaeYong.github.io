(() => {
  const grid = document.getElementById("posts-grid");
  const pager = document.getElementById("posts-pagination");
  const summary = document.getElementById("posts-summary");
  const empty = document.getElementById("posts-empty");
  const rawIndex = document.getElementById("posts-index");

  if (!grid || !pager || !summary || !empty || !rawIndex) {
    return;
  }

  let posts = [];
  try {
    posts = JSON.parse(rawIndex.textContent || "[]");
  } catch (error) {
    summary.textContent = "목록을 불러오지 못했습니다.";
    return;
  }

  const pageSize = 8;
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getCurrentPage = () => {
    const params = new URLSearchParams(window.location.search);
    return clamp(toInt(params.get("page"), 1), 1, totalPages);
  };

  const setCurrentPage = (page) => {
    const params = new URLSearchParams(window.location.search);
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", next);
  };

  const makeExcerpt = (text, limit) => {
    const value = (text || "").trim();
    if (value.length <= limit) {
      return value;
    }
    return `${value.slice(0, limit - 1)}...`;
  };

  const renderPosts = (page) => {
    if (total === 0) {
      grid.hidden = true;
      pager.hidden = true;
      empty.hidden = false;
      summary.textContent = "게시된 글이 없습니다.";
      return;
    }

    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const current = posts.slice(start, end);

    grid.innerHTML = current
      .map((post) => {
        const category = (post.categories || "").trim();
        const excerpt = makeExcerpt(post.excerpt, 120);
        return `
          <li class="posts-item">
            <a class="posts-link" href="${post.url}">
              <p class="posts-date">${post.date}</p>
              <h3 class="posts-title">${post.title}</h3>
              ${excerpt ? `<p class="posts-excerpt">${excerpt}</p>` : ""}
              ${category ? `<p class="posts-meta">${category}</p>` : ""}
            </a>
          </li>
        `;
      })
      .join("");

    grid.hidden = false;
    empty.hidden = true;
    summary.textContent = `전체 ${total}개 중 ${start + 1}-${end}번 글`;
  };

  const makePageButton = (label, page, isActive = false, forceDisabled = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `posts-page-btn${isActive ? " is-active" : ""}`;
    button.textContent = label;
    button.disabled = isActive || forceDisabled;
    button.addEventListener("click", () => {
      setCurrentPage(page);
      render(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return button;
  };

  const renderPagination = (page) => {
    if (totalPages <= 1) {
      pager.hidden = true;
      pager.innerHTML = "";
      return;
    }

    pager.hidden = false;
    pager.innerHTML = "";

    pager.appendChild(makePageButton("Prev", clamp(page - 1, 1, totalPages), false, page <= 1));

    for (let p = 1; p <= totalPages; p += 1) {
      pager.appendChild(makePageButton(String(p), p, p === page));
    }

    pager.appendChild(makePageButton("Next", clamp(page + 1, 1, totalPages), false, page >= totalPages));
  };

  const render = (page) => {
    renderPosts(page);
    renderPagination(page);
  };

  render(getCurrentPage());
})();
