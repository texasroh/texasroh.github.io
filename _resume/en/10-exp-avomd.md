---
section: experience
order: 10
company: "AvoMD"
role: "Senior Software Engineer (Full Stack)"
location: "Seoul"
period_start: "2023.05"
period_end: "Present"
description: "Development and operation of a no-code CDSS (Clinical Decision Support System) platform"
tech_stack: [Django, DRF, React, PostgreSQL, Firebase, AWS, OpenAI, Docker, ECS, Celery, MQ]
---

**Team Leadership**

- Led platform team (3 developers) from 2024
- Expanded to lead the entire Korea dev team (8 developers) from 2026
- Mentored and onboarded multiple junior engineers
- Established a proposal → discussion → decision process, fostering a culture where anyone can contribute to architectural decisions
- Coordinated roadmap and priorities with product and design teams

**Infrastructure Modernization (Beanstalk → ECS)**

- Led migration from Elastic Beanstalk to ECS, targeting **deployment automation** and **predictable performance**
- Standardized infrastructure setup and operations via container-based deployment, and refined the CI/CD pipeline

**Asynchronous MSA Architecture (Celery + RabbitMQ)**

- Resolved a structural issue where memory-heavy, long-running AI inference tasks occupied web response threads
- Isolated such tasks into dedicated worker services, achieving **resource separation between web traffic and AI workloads**
- Designed worker autoscaling structure to maintain throughput at peak load

**AI / RAG Implementation**

- Designed and implemented a RAG pipeline grounded in clinical guideline documents
- Designed a **provider-agnostic abstraction layer** to avoid vendor lock-in and leverage each model's strengths — including response caching, retries, and automatic fallback for resilience

**Auth System Integration (Django + Firebase)**

- Integrated legacy Firebase Auth (OIDC / SAML / social login) with Django sessions without removing Firebase
- Unified the **webapp** and **builder** services — previously operating as separate auth systems — into a single SSO scheme
- Resolved edge cases such as silent refresh on ID token expiry and Firebase custom claim ↔ Django permission synchronization

**Legacy Refactoring & DB Optimization**

- Identified bottlenecks via slow query logs and profiling tools → **added indexes and eliminated N+1 queries with `select_related` / `prefetch_related`**, yielding perceivable load-time improvements
- Removed unused modules and endpoints, reducing codebase size and improving onboarding
- Restructured React components — separated server state from client state and cleaned up overuse of global state

**AI Dev Tools Culture**

- Active use of Claude Code, Codex, and Gemini CLI in daily work
- Shared personal usage experiences and prompt/workflow know-how with the team, contributing to a culture of mutual growth
