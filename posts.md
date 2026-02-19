---
layout: page
title: Posts
permalink: /posts/
---

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}
{% assign latest_post = visible_posts.first %}

<div class="posts-shell">
  <section class="posts-hero">
    <h2>글 목록</h2>
    <p>발행한 글을 최신순으로 모아둔 목록입니다.</p>
    <div class="posts-hero-meta">
      <span class="posts-chip">총 {{ visible_posts.size }}개 글</span>
      <span class="posts-chip">
        최근 업데이트:
        {% if latest_post %}{{ latest_post.date | date: "%Y-%m-%d" }}{% else %}-{% endif %}
      </span>
    </div>
  </section>

  <section class="posts-controls" aria-label="Posts controls">
    <div class="posts-sort" id="posts-sort" role="tablist" aria-label="정렬">
      <button class="posts-sort-btn" type="button" data-sort="latest" role="tab" aria-selected="true">최신순</button>
      <button class="posts-sort-btn" type="button" data-sort="oldest" role="tab" aria-selected="false">오래된순</button>
    </div>
    <div class="posts-tags-filter" id="posts-tags-filter" aria-label="태그 필터"></div>
  </section>

  <p class="posts-summary" id="posts-summary">로딩 중...</p>
  <ul class="posts-grid" id="posts-grid" hidden></ul>
  <div class="posts-empty" id="posts-empty" hidden>아직 게시된 글이 없습니다.</div>
  <nav class="posts-pagination" id="posts-pagination" aria-label="Posts pagination" hidden></nav>
</div>

<script id="posts-index" type="application/json">
[
{% for post in visible_posts %}
  {
    "title": {{ post.title | jsonify }},
    "url": {{ post.url | relative_url | jsonify }},
    "date": {{ post.date | date: "%Y-%m-%d" | jsonify }},
    "wordCount": {{ post.content | number_of_words | jsonify }},
    "charCount": {{ post.content | strip_html | normalize_whitespace | size | jsonify }},
    "categories": {{ post.categories | join: ", " | jsonify }},
    "excerpt": {{ post.excerpt | strip_html | normalize_whitespace | truncate: 180 | jsonify }}
  }{% unless forloop.last %},{% endunless %}
{% endfor %}
]
</script>
<script src="{{ '/assets/posts.js' | relative_url }}" defer></script>
