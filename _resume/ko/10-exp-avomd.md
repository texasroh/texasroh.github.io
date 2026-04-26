---
section: experience
order: 10
company: "AvoMD"
role: "Senior Software Engineer (Full Stack)"
location: "Seoul"
period_start: "2023.05"
period_end: "현재"
description: "노코드 CDSS(Clinical Decision Support System) 플랫폼 개발 및 운영"
tech_stack: [Django, DRF, React, PostgreSQL, Firebase, AWS, OpenAI, Docker, ECS, Celery, MQ]
---

**팀 리드**

- 2024년~ 플랫폼 팀 (개발자 3명) 리드
- 2026년~ 한국 개발팀 전체 (8명) 리드
- 주니어 다수 멘토링 및 온보딩 주도
- 제안 → 논의 → 결정 프로세스 정립으로 누구나 아키텍처 결정에 기여할 수 있는 팀 문화 형성
- 제품팀 / 디자인팀과 로드맵 수립 및 우선순위 조율

**인프라 현대화 (Beanstalk → ECS)**

- **배포 자동화**와 **성능 예측 가능성** 확보를 목표로 Elastic Beanstalk → ECS 마이그레이션 주도
- 컨테이너 기반 배포로 인프라 구성·운영 방식 표준화 및 CI/CD 파이프라인 정비

**비동기 MSA 아키텍처 (Celery + RabbitMQ)**

- 대량의 메모리가 필요하고 응답 지연이 긴 AI 추론 작업이 웹 응답 스레드를 점유하던 구조적 문제 해결
- 해당 작업을 별도 워커 서비스로 분리하여 **웹 트래픽과 AI 작업 간 리소스 격리**
- 워커 오토스케일링 구조 설계로 피크 시 처리량 확보

**AI / RAG 기능 구현**

- 임상 가이드라인 문서 기반 RAG 파이프라인 설계 및 구현
- 벤더 락인 방지 및 모델별 강점 활용을 위해 provider-agnostic 추상화 레이어 설계 — 장애 대응용 응답 캐싱·재시도·자동 fallback 로직 포함

**인증 시스템 통합 (Django + Firebase)**

- Firebase Auth(OIDC / SAML / 소셜 로그인) 레거시를 유지한 채 Django 세션과 통합
- 분리되어 있던 **웹앱**과 **빌더** 두 서비스의 인증을 단일 SSO 체계로 통합
- ID 토큰 만료 시 silent refresh, Firebase custom claim ↔ Django 권한 동기화 등 엣지케이스 해결

**레거시 리팩토링 및 DB 최적화**

- 슬로우 쿼리 로그와 프로파일링 도구로 병목 식별 → **인덱스 추가 및 `select_related` / `prefetch_related`로 N+1 쿼리 제거**, 체감 로딩 속도 개선
- 사용되지 않는 모듈·엔드포인트 정리로 코드베이스 규모 축소 및 온보딩 난이도 개선
- React 컴포넌트 구조 정비 — 서버 상태와 클라이언트 상태를 분리하고 전역 상태 남용 정리

**AI 개발 도구 활용 문화**

- Claude Code, Codex, Gemini CLI 등을 실무에 적극 활용
- 개인 사용 경험과 프롬프트 / 워크플로우 노하우를 팀에 공유하며 모두가 함께 성장하는 분위기 형성
