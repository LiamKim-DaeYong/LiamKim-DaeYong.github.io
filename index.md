---
layout: default
title: Home
---

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}
{% assign latest_post = visible_posts.first %}
{% assign topic_count = site.categories | size %}

<div class="home-shell">
  <section class="hero">
    <p class="eyebrow">Backend Learning Journal</p>
    <h1>현업에 바로 쓰는 백엔드 학습 기록</h1>
    <p class="lead">개념 설명에서 끝내지 않고, 실험과 적용 관점까지 정리한 실전형 기술 노트입니다.</p>
    <div class="hero-actions">
      <a class="btn-primary" href="#latest-posts">최신 글 보기</a>
      <a class="btn-ghost" href="{{ '/about/' | relative_url }}">About</a>
    </div>
  </section>

  <section class="intro-grid">
    <article class="intro-card">
      <h3>Concept Notes</h3>
      <p>핵심 개념을 짧고 명확하게 정리합니다. 왜 중요한지, 실무에서 언제 쓰는지까지 함께 다룹니다.</p>
    </article>
    <article class="intro-card">
      <h3>Lab Results</h3>
      <p>아이디어를 코드로 검증한 뒤 결과를 기록합니다. 성능, 트레이드오프, 실패 사례를 포함합니다.</p>
    </article>
    <article class="intro-card">
      <h3>Practical Takeaways</h3>
      <p>읽고 바로 적용할 수 있게 체크리스트와 의사결정 포인트를 남깁니다.</p>
    </article>
  </section>

  <section class="meta-strip">
    <article class="meta-card">
      <p class="meta-card-title">Published</p>
      <p class="meta-card-value">{{ visible_posts.size }} posts</p>
    </article>
    <article class="meta-card">
      <p class="meta-card-title">Latest Update</p>
      <p class="meta-card-value">
        {% if latest_post %}{{ latest_post.date | date: "%Y-%m-%d" }}{% else %}-{% endif %}
      </p>
    </article>
    <article class="meta-card">
      <p class="meta-card-title">Topics</p>
      <p class="meta-card-value">{{ topic_count }}</p>
    </article>
  </section>

  <section id="latest-posts" class="latest">
    <div class="section-head">
      <h2>Latest Posts</h2>
      <p>최근 학습 노트와 실험 기록입니다.</p>
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
          <p class="post-meta">{{ post.categories | join: " · " }}</p>
          {% endif %}
        </a>
      </li>
      {% endfor %}
    </ul>
    {% else %}
    <div class="empty-state">아직 게시된 글이 없습니다. 첫 노트를 push하면 자동으로 여기에 나타납니다.</div>
    {% endif %}
  </section>

  <section class="topics">
    <div class="section-head">
      <h2>Topic Map</h2>
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
