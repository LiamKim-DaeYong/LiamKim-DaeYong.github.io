# LiamKim-DaeYong.github.io

GitHub Pages(Jekyll) 기반 개인 기술 블로그 저장소입니다.

## 구조

```text
.
├── _config.yml
├── _posts/
│   └── YYYY-MM-DD-title.md
├── index.md
├── about.md
└── .github/workflows/
    ├── markdown-lint.yml
    └── pages-deploy.yml
```

## 글 작성 규칙

- 경로: `_posts/YYYY-MM-DD-title.md`
- Frontmatter 필수: `title`, `date`, `categories`, `tags`
- 임시 초안은 `draft: true` 사용 가능 (홈 목록에서는 자동 제외)

예시:

```yaml
---
title: "data structures"
date: 2026-02-15
categories: [learning]
tags: [algorithm]
draft: false
---
```

## 권장 본문 구조

아래 구조로 쓰면 포스트 가독성이 좋아집니다.

```markdown
## 배경
- 왜 이걸 해봤는지

## 시도
- 어떤 방식으로 구현/설정했는지

## 확인한 점
- 직접 확인한 결과
- 예상과 달랐던 부분

## 정리
- 다음에 다시 볼 핵심 메모
```

## 배포

- `main` 브랜치 push 시 `pages-deploy.yml`이 실행되어 GitHub Pages에 배포됩니다.
- 배포가 처음 실패하면 저장소 `Settings > Pages`에서 `Build and deployment`를 `GitHub Actions`로 설정하세요.
