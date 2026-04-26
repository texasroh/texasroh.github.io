---
title: "Next.js로 블로그 시작하기"
date: 2026-04-19
lang: ko
tags: [nextjs, blog, github-pages]
description: "Jekyll에서 Next.js static export로 옮긴 이야기와, GitHub Pages에서 다국어 블로그를 운영하는 구조 정리."
---

## 왜 Next.js로 옮겼나

처음엔 Jekyll로 시작했다. GitHub Pages가 공식 지원하고 컨벤션이 표준화되어 있어 빠르게 띄울 수 있었다. 며칠 써보니 몇 가지 마찰이 누적됐고, 결국 Next.js static export로 갈아탔다.

- **Liquid 템플릿의 한계** — collection·필터링이 복잡해지면 디버깅이 고통스럽다. JSX/TS 환경이 훨씬 익숙하고 강력하다.
- **MDX 지원** — Jekyll에선 자연스럽지 않은데, Next.js에선 본문 안에 React 컴포넌트를 그대로 박을 수 있다.
- **타입 안전성** — 콘텐츠 로더, i18n 사전 등을 타입스크립트로 관리할 수 있어 안전하다.
- **개발 환경 일관성** — Ruby/Bundler 환경 대신 Node 한 도구로 끝난다.

GitHub Pages는 정적 파일 호스팅에만 쓴다. `output: 'export'`로 빌드한 `out/` 디렉토리를 GitHub Actions가 업로드하는 구조.

## 구조

```
app/
  (site)/[lang]/
    blog/
      page.tsx              # 글 목록
      [slug]/page.tsx       # 글 상세
    resume/page.tsx         # 이력서
components/                  # 공용 UI
lib/                         # 콘텐츠 로더, i18n
_posts/{ko,en}/             # 블로그 글 (Markdown / MDX)
_resume/{ko,en}/            # 이력서
public/assets/              # 정적 자원
```

이력서·블로그 모두 마크다운으로 둔다. 글쓰기·편집은 에디터에서, 빌드·배포는 자동으로.

## URL 정책

블로그 URL은 슬러그만 쓴다. 짧고 깔끔하고, 시간 지나도 안 변한다.

```
/ko/blog/hello-nextjs/
```

연·월·일은 빼고, **같은 언어 안에서 슬러그가 겹치면 빌드가 실패하도록** 막아뒀다. 두 글이 한 URL을 두고 충돌하는 상황은 사전에 차단.

## 다국어

`/ko/...`, `/en/...` 두 트리. 각 글은 `_posts/ko/YYYY-MM-DD-slug.md`와 `_posts/en/YYYY-MM-DD-slug.md`로 같은 슬러그를 쓰면 자동 매칭된다. 헤더의 언어 토글이 같은 슬러그를 찾아 이동하고, 번역본이 없으면 해당 언어의 블로그 목록으로 떨어진다.

## 남은 숙제

- [ ] 댓글 (Giscus)
- [ ] 조회수 / 방문자 통계
- [ ] 라이트모드 토글
- [ ] 코드 블록 복사 버튼
