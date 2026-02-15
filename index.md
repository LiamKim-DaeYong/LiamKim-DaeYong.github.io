---
layout: default
title: Home
---

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}

<div class="home-shell">
  <section class="hero">
    <p class="eyebrow">Backend Learning Journal</p>
    <h1>실험으로 검증하는 백엔드 학습 기록</h1>
    <p class="lead">개념 노트와 코드 실험 결과를 연결해서, 실제로 이해한 내용을 쌓아가는 개발 블로그입니다.</p>
    <div class="hero-actions">
      <a class="btn-primary" href="#latest-posts">최신 글 보기</a>
      <a class="btn-ghost" href="{{ '/about/' | relative_url }}">About</a>
    </div>
  </section>

  <section class="meta-strip">
    <article class="meta-card">
      <p class="meta-card-title">Published</p>
      <p class="meta-card-value">{{ visible_posts.size }} posts</p>
    </article>
    <article class="meta-card">
      <p class="meta-card-title">Workflow</p>
      <p class="meta-card-value">notes → blog</p>
    </article>
    <article class="meta-card">
      <p class="meta-card-title">Source</p>
      <p class="meta-card-value">dev-console</p>
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
</div>
