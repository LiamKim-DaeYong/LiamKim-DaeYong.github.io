---
layout: default
title: Home
---

# LiamKim Dev Blog

학습 노트와 실험 기록을 정리하는 블로그입니다.

## Latest Posts

{% assign visible_posts = site.posts | where_exp: "post", "post.draft != true" %}
{% if visible_posts.size > 0 %}
{% for post in visible_posts %}
- [{{ post.title }}]({{ post.url | relative_url }}) - {{ post.date | date: "%Y-%m-%d" }}
{% endfor %}
{% else %}
아직 게시된 글이 없습니다.
{% endif %}
