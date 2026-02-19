(() => {
  const grid = document.getElementById("posts-grid");
  const pager = document.getElementById("posts-pagination");
  const summary = document.getElementById("posts-summary");
  const empty = document.getElementById("posts-empty");
  const sortTabs = document.getElementById("posts-sort");
  const tagFilter = document.getElementById("posts-tags-filter");
  const rawIndex = document.getElementById("posts-index");

  if (!grid || !pager || !summary || !empty || !sortTabs || !tagFilter || !rawIndex) {
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
  const validSorts = new Set(["latest", "oldest"]);
  const defaultSort = "latest";
  const basePosts = posts.map((post) => {
    const tags = (post.categories || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const wordCount = Number.parseInt(String(post.wordCount || "0"), 10);
    const charCount = Number.parseInt(String(post.charCount || "0"), 10);
    const fromWord = Number.isNaN(wordCount) ? 0 : Math.ceil(wordCount / 220);
    const fromChar = Number.isNaN(charCount) ? 0 : Math.ceil(charCount / 500);
    const readMinutes = Math.max(1, fromWord, fromChar);

    return {
      ...post,
      tags,
      readMinutes,
      timestamp: new Date(`${post.date}T00:00:00`).getTime()
    };
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get("sort") || defaultSort;
    const sort = validSorts.has(sortParam) ? sortParam : defaultSort;
    const tag = params.get("tag") || "all";
    const page = Math.max(1, toInt(params.get("page"), 1));
    return { sort, tag, page };
  };

  const state = getInitialState();

  const setState = () => {
    const params = new URLSearchParams(window.location.search);

    if (state.page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(state.page));
    }

    if (state.sort === defaultSort) {
      params.delete("sort");
    } else {
      params.set("sort", state.sort);
    }

    if (state.tag === "all") {
      params.delete("tag");
    } else {
      params.set("tag", state.tag);
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

  const tagCounts = new Map();
  basePosts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  const allTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([tag]) => tag);

  if (state.tag !== "all" && !allTags.includes(state.tag)) {
    state.tag = "all";
  }

  const getWorkingPosts = () => {
    let working = basePosts;

    if (state.tag !== "all") {
      working = working.filter((post) => post.tags.includes(state.tag));
    }

    working = [...working].sort((a, b) => {
      if (state.sort === "oldest") {
        return a.timestamp - b.timestamp;
      }
      return b.timestamp - a.timestamp;
    });

    return working;
  };

  const renderSortTabs = () => {
    sortTabs.querySelectorAll(".posts-sort-btn").forEach((button) => {
      const sort = button.getAttribute("data-sort");
      const isActive = sort === state.sort;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  };

  const renderTagFilters = () => {
    const chips = [
      `<button class="posts-filter-chip${state.tag === "all" ? " is-active" : ""}" type="button" data-tag="all">전체 <span>${basePosts.length}</span></button>`
    ];

    allTags.forEach((tag) => {
      const count = tagCounts.get(tag) || 0;
      const isActive = state.tag === tag;
      chips.push(
        `<button class="posts-filter-chip${isActive ? " is-active" : ""}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span>${count}</span></button>`
      );
    });

    tagFilter.innerHTML = chips.join("");
  };

  const makePageButton = (label, page, isActive = false, forceDisabled = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `posts-page-btn${isActive ? " is-active" : ""}`;
    button.textContent = label;
    button.disabled = isActive || forceDisabled;
    button.addEventListener("click", () => {
      state.page = page;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return button;
  };

  const renderPagination = (page, totalPages) => {
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

  const renderPosts = () => {
    const working = getWorkingPosts();
    const filteredTotal = working.length;

    if (filteredTotal === 0) {
      grid.hidden = true;
      pager.hidden = true;
      empty.hidden = false;
      summary.textContent = "조건에 맞는 글이 없습니다.";
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
    state.page = clamp(state.page, 1, totalPages);
    const start = (state.page - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredTotal);
    const current = working.slice(start, end);

    grid.innerHTML = current
      .map((post) => {
        const excerpt = makeExcerpt(post.excerpt, 138);
        const tagsHtml =
          post.tags.length > 0
            ? `<div class="posts-tags">${post.tags
                .map((tag) => `<span class="posts-tag">${escapeHtml(tag)}</span>`)
                .join("")}</div>`
            : "";

        return `
          <li class="posts-item">
            <a class="posts-link" href="${escapeHtml(post.url)}">
              <div class="posts-main">
                <p class="posts-meta-line">
                  <span class="posts-date">${escapeHtml(post.date)}</span>
                  <span class="posts-dot">•</span>
                  <span class="posts-read-time">${post.readMinutes}분 읽기</span>
                </p>
                <h3 class="posts-title">${escapeHtml(post.title)}</h3>
                ${excerpt ? `<p class="posts-excerpt">${excerpt}</p>` : ""}
                ${tagsHtml}
              </div>
            </a>
          </li>
        `;
      })
      .join("");

    grid.hidden = false;
    empty.hidden = true;
    const tagText = state.tag === "all" ? "전체" : state.tag;
    summary.textContent = `전체 ${basePosts.length}개 중 ${filteredTotal}개 표시 · ${start + 1}-${end}번 · ${tagText}`;
    renderPagination(state.page, totalPages);
  };

  sortTabs.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const sort = target.getAttribute("data-sort");
    if (!sort || !validSorts.has(sort) || sort === state.sort) {
      return;
    }

    state.sort = sort;
    state.page = 1;
    render();
  });

  tagFilter.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const chip = target.closest("[data-tag]");
    if (!(chip instanceof HTMLButtonElement)) {
      return;
    }

    const tag = chip.getAttribute("data-tag");
    if (!tag || tag === state.tag) {
      return;
    }

    state.tag = tag;
    state.page = 1;
    render();
  });

  const render = () => {
    renderSortTabs();
    renderTagFilters();
    renderPosts();
    setState();
  };

  render();
})();
