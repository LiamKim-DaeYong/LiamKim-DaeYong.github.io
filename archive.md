---
layout: page
title: Archive
permalink: /archive/
---

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}

<div class="archive-shell">
  <p class="archive-intro">발행한 글을 날짜순으로 모아봅니다.</p>

  {% if visible_posts.size > 0 %}
    {% assign current_year = "" %}
    {% for post in visible_posts %}
      {% assign post_year = post.date | date: "%Y" %}
      {% if post_year != current_year %}
        {% unless forloop.first %}</ul>{% endunless %}
        <h2 class="archive-year">{{ post_year }}</h2>
        <ul class="archive-list">
        {% assign current_year = post_year %}
      {% endif %}
      <li class="archive-item">
        <time class="archive-date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%m-%d" }}</time>
        <div class="archive-main">
          <a class="archive-link" href="{{ post.url | relative_url }}">{{ post.title }}</a>
          {% if post.categories and post.categories.size > 0 %}
            <span class="archive-meta">{{ post.categories | join: " · " }}</span>
          {% endif %}
        </div>
      </li>
      {% if forloop.last %}</ul>{% endif %}
    {% endfor %}
  {% else %}
    <div class="empty-state">아직 게시된 글이 없습니다.</div>
  {% endif %}
</div>
