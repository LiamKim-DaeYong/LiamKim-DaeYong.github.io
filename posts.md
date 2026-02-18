---
layout: page
title: Posts
permalink: /posts/
---

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}

<div class="posts-shell">
  <p class="posts-intro">발행한 글을 날짜순으로 확인할 수 있습니다.</p>
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
    "categories": {{ post.categories | join: ", " | jsonify }},
    "excerpt": {{ post.excerpt | strip_html | normalize_whitespace | truncate: 180 | jsonify }}
  }{% unless forloop.last %},{% endunless %}
{% endfor %}
]
</script>
<script src="{{ '/assets/posts.js' | relative_url }}" defer></script>
