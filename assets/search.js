(() => {
  const input = document.getElementById("post-search-input");
  const status = document.getElementById("post-search-status");
  const resultList = document.getElementById("post-search-results");
  const rawIndex = document.getElementById("post-search-index");

  if (!input || !status || !resultList || !rawIndex) {
    return;
  }

  let posts = [];
  try {
    posts = JSON.parse(rawIndex.textContent || "[]");
  } catch (error) {
    status.textContent = "검색 인덱스를 읽지 못했습니다.";
    return;
  }

  const normalize = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const escapeHtml = (value) =>
    (value || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const makeSnippet = (text, limit) => {
    if (!text) {
      return "";
    }
    if (text.length <= limit) {
      return text;
    }
    return `${text.slice(0, limit - 1)}...`;
  };

  const score = (post, queryTokens) => {
    const title = normalize(post.title);
    const categories = normalize(post.categories);
    const excerpt = normalize(post.excerpt);

    let points = 0;
    for (const token of queryTokens) {
      if (title.includes(token)) {
        points += 4;
      }
      if (categories.includes(token)) {
        points += 2;
      }
      if (excerpt.includes(token)) {
        points += 1;
      }
    }
    return points;
  };

  const render = (matches, keyword) => {
    if (!keyword) {
      resultList.hidden = true;
      resultList.innerHTML = "";
      status.textContent = "검색어를 입력하면 결과가 표시됩니다.";
      return;
    }

    if (matches.length === 0) {
      resultList.hidden = true;
      resultList.innerHTML = "";
      status.textContent = "일치하는 글이 없습니다.";
      return;
    }

    resultList.hidden = false;
    status.textContent = `${matches.length}개 결과`;
    resultList.innerHTML = matches
      .slice(0, 12)
      .map((post) => {
        const title = escapeHtml(post.title);
        const date = escapeHtml(post.date);
        const categories = escapeHtml(post.categories || "");
        const excerpt = escapeHtml(makeSnippet(post.excerpt, 120));
        const url = escapeHtml(post.url);
        return `
          <li class="search-result-item">
            <a class="search-result-link" href="${url}">
              <p class="search-result-date">${date}</p>
              <h3 class="search-result-title">${title}</h3>
              ${excerpt ? `<p class="search-result-excerpt">${excerpt}</p>` : ""}
              ${categories ? `<p class="search-result-meta">${categories}</p>` : ""}
            </a>
          </li>
        `;
      })
      .join("");
  };

  const onSearch = () => {
    const keyword = normalize(input.value);
    const queryTokens = keyword.split(" ").filter(Boolean);

    if (queryTokens.length === 0) {
      render([], "");
      return;
    }

    const matches = posts
      .map((post) => ({ ...post, _score: score(post, queryTokens) }))
      .filter((post) => post._score > 0)
      .sort((a, b) => b._score - a._score || (b.date || "").localeCompare(a.date || ""));

    render(matches, keyword);
  };

  input.addEventListener("input", onSearch);
})();
