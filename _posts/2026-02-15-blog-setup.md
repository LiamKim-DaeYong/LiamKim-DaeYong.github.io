---
title: "blog setup"
date: 2026-02-15
categories: [learning]
tags: [blog, setup]
draft: false
---

블로그 기본 구성을 초기화했습니다.

## 배경

처음에는 저장소가 거의 비어 있어서, 글을 올리고 배포하는 최소 흐름부터 먼저 맞췄습니다.

## 시도한 내용

- Jekyll + minima 테마 적용
- GitHub Actions 기반 Pages 배포 워크플로 추가
- Markdown lint(MD040) 적용

## 확인한 점

배포 워크플로가 통과하면 바로 사이트 반영까지 연결됐습니다.

```yaml
name: Deploy Pages
on:
  push:
    branches: [main]
```

## 간단 비교

| 항목 | 적용 전 | 적용 후 |
| --- | --- | --- |
| 페이지 구성 | 없음 | 홈/소개/포스트 |
| 배포 방식 | 수동 | GitHub Actions |
| 문서 검증 | 없음 | Markdown lint |

## 정리

초기 뼈대를 먼저 만든 뒤, 디자인과 글쓰기 규칙을 순차적으로 다듬는 방식이 안정적이었습니다.
