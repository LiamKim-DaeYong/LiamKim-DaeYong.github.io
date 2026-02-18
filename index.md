---
layout: default
title: Home
---

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}
{% assign latest_post = visible_posts.first %}
{% assign topic_count = site.categories | size %}

<div class="home-shell">
  <section class="hero">
    <p class="eyebrow">Raf Experiment Journal</p>
    <h1>라프의 실험일지</h1>
    <p class="lead">여러 주제를 직접 다뤄보며, 코드와 구조에서 확인한 내용을 정리합니다.</p>
    <div class="hero-actions">
      <a class="btn-primary" href="#latest-posts">최근 기록 보기</a>
      <a class="btn-ghost" href="{{ '/posts/' | relative_url }}">전체 글 보기</a>
      <a class="btn-ghost" href="{{ '/about/' | relative_url }}">소개</a>
    </div>
  </section>

  <section class="action-grid">
    <a class="action-card" href="{% if latest_post %}{{ latest_post.url | relative_url }}{% else %}#latest-posts{% endif %}">
      <p class="action-eyebrow">Now Reading</p>
      <h3>최신 글 바로 읽기</h3>
      <p class="action-text">
        {% if latest_post %}
          {{ latest_post.title | truncate: 56 }}
        {% else %}
          첫 글이 발행되면 여기에 표시됩니다.
        {% endif %}
      </p>
    </a>
    <a class="action-card" href="{{ '/posts/' | relative_url }}">
      <p class="action-eyebrow">Browse</p>
      <h3>전체 글 목록</h3>
      <p class="action-text">페이지별로 글을 탐색하고 필요한 주제로 빠르게 이동합니다.</p>
    </a>
    <a class="action-card" href="{{ '/about/' | relative_url }}">
      <p class="action-eyebrow">Guide</p>
      <h3>학습 방식 소개</h3>
      <p class="action-text">이 블로그의 기록 규칙과 학습 운영 방식을 확인할 수 있습니다.</p>
    </a>
  </section>

  <section class="meta-strip">
    <article class="meta-card">
      <p class="meta-card-title">기록 수</p>
      <p class="meta-card-value">{{ visible_posts.size }} posts</p>
    </article>
    <article class="meta-card">
      <p class="meta-card-title">최근 업데이트</p>
      <p class="meta-card-value">
        {% if latest_post %}{{ latest_post.date | date: "%Y-%m-%d" }}{% else %}-{% endif %}
      </p>
    </article>
    <article class="meta-card">
      <p class="meta-card-title">주제 수</p>
      <p class="meta-card-value">{{ topic_count }}</p>
    </article>
  </section>

  <section class="search-panel" id="post-search">
    <div class="section-head">
      <h2>글 검색</h2>
      <p>제목, 요약, 카테고리로 바로 찾을 수 있습니다.</p>
    </div>
    <div class="search-controls">
      <label class="search-label" for="post-search-input">검색어</label>
      <input
        id="post-search-input"
        class="search-input"
        type="search"
        placeholder="예: 캐시, DB, 동시성"
        autocomplete="off"
      />
    </div>
    <p id="post-search-status" class="search-status">검색어를 입력하면 결과가 표시됩니다.</p>
    <ul id="post-search-results" class="search-results" hidden></ul>
  </section>

  <section id="latest-posts" class="latest">
    <div class="section-head">
      <h2>최근 기록</h2>
      <p>최근에 올린 글입니다.</p>
    </div>

    {% if visible_posts.size > 0 %}
    <ul class="post-grid">
      {% for post in visible_posts %}
      <li class="post-card">
        <a class="card-link" href="{{ post.url | relative_url }}">
          <p class="post-date">{{ post.date | date: "%Y-%m-%d" }}</p>
          <h3 class="post-title">{{ post.title }}</h3>
          {% assign summary = post.excerpt | strip_html | normalize_whitespace %}
          {% if summary != "" %}
          <p class="post-excerpt">{{ summary | truncate: 110 }}</p>
          {% endif %}
          {% if post.categories and post.categories.size > 0 %}
          <p class="card-meta">{{ post.categories | join: " · " }}</p>
          {% endif %}
        </a>
      </li>
      {% endfor %}
    </ul>
    {% else %}
    <div class="empty-state">아직 게시된 글이 없습니다. 첫 글을 publish하면 여기에 나타납니다.</div>
    {% endif %}
  </section>

  <section class="topics">
    <div class="section-head">
      <h2>다룬 주제</h2>
      <p>지금까지 다룬 주제들입니다.</p>
    </div>
    {% if site.categories.size > 0 %}
    <ul class="topic-list">
      {% for category in site.categories limit: 12 %}
      <li><span class="topic-pill">{{ category[0] }} <em>{{ category[1].size }}</em></span></li>
      {% endfor %}
    </ul>
    {% else %}
    <div class="empty-state">첫 글이 쌓이면 여기에서 주제 지도를 볼 수 있습니다.</div>
    {% endif %}
  </section>
</div>

<script id="post-search-index" type="application/json">
[
{% for post in visible_posts %}
  {
    "title": {{ post.title | jsonify }},
    "url": {{ post.url | relative_url | jsonify }},
    "date": {{ post.date | date: "%Y-%m-%d" | jsonify }},
    "categories": {{ post.categories | join: ", " | jsonify }},
    "excerpt": {{ post.excerpt | strip_html | normalize_whitespace | truncate: 260 | jsonify }}
  }{% unless forloop.last %},{% endunless %}
{% endfor %}
]
</script>
<script src="{{ '/assets/search.js' | relative_url }}" defer></script>
