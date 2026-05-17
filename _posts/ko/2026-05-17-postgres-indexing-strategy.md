---
title: "PostgreSQL 인덱싱 전략, 이것만 먼저 보면 된다"
date: 2026-05-17
lang: ko
tags: [postgresql, database, indexing]
description: "복합 인덱스의 순서, boolean 컬럼 인덱스가 의미 있어지는 조건, 그리고 실제로 먼저 봐야 할 판단 기준만 짧게 정리했다."
---

PostgreSQL 인덱스 이야기를 할 때 제일 흔한 실수는, 인덱스를 "많이" 만드는 것이다. 실제로는 반대다. **자주 쓰는 쿼리를 기준으로, 필요한 인덱스만 정확하게 만들어야 한다.**

이 글은 세 가지만 짧게 정리한다.

1. 복합 인덱스는 어떤 순서로 잡아야 하는가
2. boolean 컬럼 인덱스는 언제 의미가 있는가
3. 인덱스를 만들기 전에 무엇부터 봐야 하는가

## 1. 복합 인덱스는 "카디널리티"보다 "쿼리 패턴"이 먼저다

복합 인덱스에서 가장 중요한 건 컬럼을 어떤 순서로 조회하느냐다.

예를 들어 이런 쿼리가 많다고 하자.

```sql
SELECT *
FROM orders
WHERE customer_id = ?
  AND status = ?
ORDER BY created_at DESC
LIMIT 20;
```

이 경우엔 보통 아래처럼 접근한다.

```sql
CREATE INDEX idx_orders_customer_status_created_at
  ON orders (customer_id, status, created_at DESC);
```

핵심은 이거다.

- `WHERE` 에서 자주 같이 쓰는 조건을 앞에 둔다.
- 그 다음 `ORDER BY` 에 쓰는 컬럼을 둔다.
- "선택도가 높은 컬럼부터" 같은 규칙을 기계적으로 적용하면 자주 틀린다.

복합 인덱스는 *왼쪽부터(left prefix)* 활용된다. 그래서 `(a, b, c)` 인덱스는 `a`, `a+b`, `a+b+c` 패턴엔 강하지만, `b` 나 `b+c` 만 쓰는 쿼리엔 잘 못 쓴다.

결국 질문은 단순하다.

> 이 인덱스를, 실제 트래픽의 어떤 WHERE + ORDER BY 패턴이 쓰는가?

이 질문에 답이 안 되면, 좋은 인덱스가 아니다.

## 2. boolean 인덱스는 보통 약하다, 하지만 예외는 분명히 있다

`is_deleted`, `is_active`, `is_public` 같은 boolean 컬럼은 값이 거의 둘 중 하나라서, 단독 인덱스 효율이 낮은 경우가 많다.

예를 들어 전체 행의 95%가 `is_active = true` 라면,

```sql
WHERE is_active = true
```

이 조건만으로는 인덱스가 큰 도움이 안 될 수 있다. 너무 많은 행이 걸리기 때문이다. PostgreSQL 입장에선 그냥 순차 스캔이 더 쌀 수 있다.

하지만 아래 경우엔 의미가 생긴다.

### 경우 1. 희소한 값만 자주 찾을 때

예를 들어 `is_deleted = false` 는 대부분이지만, `is_deleted = true` 는 1% 미만이고 운영 도구에서 그 1%만 자주 본다면 얘기가 달라진다.

```sql
CREATE INDEX idx_posts_deleted_true
  ON posts (is_deleted)
  WHERE is_deleted = true;
```

이런 *partial index* 는 boolean 인덱스가 빛나는 대표 사례다.

### 경우 2. 다른 조건과 함께 좁혀질 때

boolean 단독은 약해도, 다른 컬럼과 같이 쓰이면 쓸 만해진다.

```sql
SELECT *
FROM posts
WHERE tenant_id = ?
  AND is_published = true
ORDER BY published_at DESC
LIMIT 20;
```

이럴 땐 이렇게 설계할 수 있다.

```sql
CREATE INDEX idx_posts_tenant_published_published_at
  ON posts (tenant_id, published_at DESC)
  WHERE is_published = true;
```

포인트는 boolean 을 굳이 인덱스 키에 넣는 것보다, **partial index 조건으로 빼는 쪽이 더 좋은 경우가 많다**는 점이다.

### 경우 3. "활성 데이터"만 따로 관리하고 싶을 때

서비스에서 실제 조회는 대부분 활성 데이터만 보고, 비활성 데이터는 거의 안 보는 경우가 많다.
이때는 `active only` partial index 가 매우 실용적이다.

```sql
CREATE INDEX idx_users_active_created_at
  ON users (created_at DESC)
  WHERE is_active = true;
```

이렇게 하면 인덱스 크기도 줄고, 쓰기 비용도 덜고, 자주 쓰는 조회도 빨라진다.

## 3. 인덱스를 만들기 전에 먼저 볼 것

인덱스는 감으로 만들면 안 된다. 최소한 아래 순서로 보는 게 좋다.

### 1) 실제 느린 쿼리를 먼저 찾기

인덱스 전략은 추상 이론보다, 실제 느린 쿼리에서 출발해야 한다.

- 어떤 `WHERE` 조건이 자주 쓰이는가
- 어떤 `ORDER BY`, `LIMIT` 이 붙는가
- 조회 결과가 보통 몇 건까지 줄어드는가

### 2) `EXPLAIN ANALYZE` 로 실행 계획 보기

"인덱스가 있으면 빠르겠지" 는 자주 틀린다. PostgreSQL 이 실제로 어떤 계획을 선택하는지 봐야 한다.

- Sequential Scan 인가
- Index Scan 인가
- Bitmap Heap Scan 인가
- Sort 를 별도로 하고 있는가

인덱스는 만드는 것보다, *플래너가 실제로 쓰는지* 확인하는 게 더 중요하다.

### 3) 읽기 성능만 보지 말기

인덱스가 늘어나면 `INSERT`, `UPDATE`, `DELETE` 비용도 늘어난다. 저장 공간도 더 먹는다.

즉, 인덱스는 공짜가 아니다. 읽기 성능을 위해 쓰기 비용을 사는 것이다.

## 실무용 짧은 기준

아주 짧게 정리하면 이렇다.

- 복합 인덱스는 실제 `WHERE + ORDER BY` 패턴 기준으로 만든다.
- boolean 컬럼 단독 인덱스는 대개 약하다.
- 대신 partial index 는 자주 강력하다.
- 인덱스 추가 전후는 반드시 `EXPLAIN ANALYZE` 로 확인한다.
- 안 쓰는 인덱스는 결국 쓰기만 느리게 만든다.

## 마무리

PostgreSQL 인덱싱에서 중요한 건 "정답 공식"이 아니라, **실제 쿼리 패턴에 맞는가**다.

특히 복합 인덱스와 boolean 인덱스는 원칙만 외우면 오히려 실수하기 쉽다. 복합 인덱스는 컬럼 순서가 핵심이고, boolean 은 단독 인덱스보다 partial index 관점에서 봐야 할 때가 많다.

결국 먼저 할 일은 하나다.

> 인덱스를 만들기 전에, 실제 쿼리와 실행 계획부터 본다.
