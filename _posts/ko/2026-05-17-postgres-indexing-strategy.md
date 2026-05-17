---
title: "PostgreSQL 인덱싱, 만들기 전에 이것부터 본다"
date: 2026-05-17
lang: ko
tags: [postgresql, database, indexing]
description: "복합 인덱스의 컬럼 순서, boolean 컬럼은 언제 의미가 있는지, 그리고 인덱스를 추가하기 전에 먼저 확인해야 할 것들을 짧게 정리했다."
---

API 응답이 느려져서 인덱스를 추가했는데 별로 빨라지지 않은 적이 있다. `EXPLAIN` 을 찍어보고 나서야, 플래너가 그 인덱스를 안 쓰고 있었다는 걸 알았다. 인덱스는 만들면 자동으로 빨라지는 게 아니라, **쿼리 패턴에 맞아야** 빨라진다.

이 글은 그때 정리해둔 세 가지를 풀어 쓴다.

1. 복합 인덱스는 어떤 순서로 잡아야 하는가
2. boolean 컬럼 인덱스는 언제 의미가 있는가
3. 인덱스를 만들기 전에 무엇부터 봐야 하는가

## 1. 복합 인덱스는 쿼리 패턴부터 본다

복합 인덱스에서 가장 중요한 건 **컬럼을 어떤 순서로 잡느냐**다.

예를 들어 이런 쿼리가 자주 돈다고 하자.

```sql
SELECT *
FROM orders
WHERE customer_id = ?
  AND status = ?
ORDER BY created_at DESC
LIMIT 20;
```

대응되는 인덱스는 보통 이렇게 잡는다.

```sql
CREATE INDEX idx_orders_customer_status_created_at
  ON orders (customer_id, status, created_at);
```

규칙은 단순하다.

- `WHERE` 에서 자주 같이 쓰는 equality 조건을 **앞에** 둔다.
- `ORDER BY` 에 쓰는 컬럼을 **뒤에** 둔다.
- 이 두 가지가 정해진 다음, 그 안에서 selectivity를 고려한다.

여기서 헷갈리기 쉬운 게 `ORDER BY created_at DESC` 인데 인덱스에 `DESC` 를 안 붙였다는 점이다. 이건 의도한 거다.

> PostgreSQL의 B-tree 인덱스는 **양방향 스캔**이 가능하다.
> 그래서 `(created_at)` 으로 저장돼 있어도, 플래너는 그걸 *뒤에서부터* 읽어 `ORDER BY created_at DESC` 를 만족시킨다.

`EXPLAIN` 을 보면 `Index Scan Backward` 라고 찍힌다. 단일 컬럼 정렬에서는 인덱스에 `DESC` 를 박을 필요가 없다.

`DESC` 를 명시해야 하는 건 단일 방향 스캔으로 못 푸는 경우다. 예를 들면:

```sql
ORDER BY customer_id ASC, created_at DESC
```

이렇게 **혼합 정렬**이면 인덱스도 `(customer_id ASC, created_at DESC)` 로 맞춰야 한 번에 정렬을 만족시킨다.

### 왼쪽부터 쓰인다

복합 인덱스는 *왼쪽부터(left prefix)* 활용된다. `(a, b, c)` 인덱스는 `a`, `a+b`, `a+b+c` 패턴엔 강하지만, `b` 만 또는 `b+c` 만 쓰는 쿼리엔 거의 못 쓴다.

그래서 인덱스를 만들기 전엔 항상 이걸 먼저 떠올린다. **실제 트래픽에서 어떤 `WHERE` + `ORDER BY` 조합이 이 인덱스를 쓰는가?** 답이 안 나오면, 만들지 말아야 할 인덱스다.

"selectivity가 높은 컬럼부터" 같은 규칙을 *기계적으로* 적용하다 보면, 만들어놓고 정작 안 쓰이는 인덱스가 생긴다.

## 2. boolean 컬럼은 partial index로 본다

`is_deleted`, `is_active`, `is_published` 같은 boolean 컬럼은, 값이 사실상 둘 중 하나로 쏠려 있는 경우가 많다.

전체의 95%가 `is_active = true` 라고 해보자.

```sql
WHERE is_active = true
```

이 조건만으로 인덱스를 타려고 하면 **너무 많은 행이 잡힌다**. 플래너 입장에선 그냥 순차 스캔이 더 싸다고 판단하고 인덱스를 안 쓴다.

여기서 헷갈리지 말 것. 약한 건 **boolean 컬럼 자체**가 아니라, **selectivity가 낮은 값을 조회할 때**다. 같은 컬럼이라도 `is_active = false` (5%) 쪽으로 조회하면 얘기가 완전히 달라진다. 그래서 boolean 인덱스를 설계할 땐 "어느 쪽 값을 자주 찾는가" 가 먼저다.

두 가지 방향으로 풀 수 있는데, 차이를 따져보면 자연스럽게 partial index 로 흘러간다.

### 경우 1. 그냥 boolean 컬럼에 인덱스를 거는 경우

가장 단순한 접근은 boolean 컬럼에 그대로 인덱스를 거는 거다.

```sql
CREATE INDEX idx_posts_is_deleted
  ON posts (is_deleted);
```

`is_deleted = true` 가 1% 미만이라면, 이 인덱스는 그 1% 조회에 한해 동작한다. 플래너가 보기에 `true` 쪽은 충분히 selective하니까 인덱스를 쓸 만하다고 판단해서 잡아준다. 반대로 `is_deleted = false` (99%) 쪽으로는 인덱스를 거의 안 쓴다. 너무 많은 행이 잡혀서 순차 스캔이 더 싸기 때문이다.

여기까진 동작은 한다. 그런데 문제가 두 개 있다.

1. **인덱스에 99%가 같이 들어 있다.** 실제 쓰이는 건 1% 인데, 안 쓰이는 99% 까지 모두 인덱스에 저장된다. 디스크도 더 먹고, `INSERT`/`UPDATE` 마다 인덱스도 갱신해야 하니까 쓰기 비용도 같이 올라간다.
2. **추가 조건이 붙으면 별 도움이 안 된다.** 실제로 그 1% 를 볼 땐 보통 `ORDER BY deleted_at DESC LIMIT 20` 같은 게 따라붙는다. `is_deleted` 만 인덱스로 좁히고 나면 정렬은 따로 해야 한다.

요약하면, plain boolean 인덱스는 "**되긴 되는데 거의 항상 더 좋은 방법이 있는**" 자리다.

### 경우 2. partial index 로 바꾸는 경우

위의 두 문제를 동시에 해결하는 게 **partial index** 다.

```sql
CREATE INDEX idx_posts_deleted_recent
  ON posts (deleted_at DESC)
  WHERE is_deleted = true;
```

이 한 줄짜리 정의에 사실 두 가지 결정이 들어 있다. 분리해서 보면 헷갈리지 않는다.

- `WHERE is_deleted = true` (partial 조건) — **어떤 행을 인덱스에 넣을지** 정한다. → "삭제된 글만 들어오는 인덱스"
- `(deleted_at DESC)` (인덱스 키) — **그 안에서 어떻게 정렬해 저장할지** 정한다. → "최근 삭제 순으로 정렬"

경우 1과 비교해보면 좋아진 점이 분명해진다.

- 인덱스에 1% 만 들어간다. 크기가 훨씬 작아지고, 99% 행을 `INSERT`/`UPDATE` 할 때는 이 인덱스가 아예 영향을 안 받는다.
- 그 1% 안에서 `deleted_at DESC` 로 정렬돼 저장되니까, "최근 삭제 20건" 같은 쿼리가 별도 Sort 없이 끝난다.

여기서 자주 나오는 실수 하나. **`(is_deleted, deleted_at DESC)` 처럼 boolean 을 키 자리에 또 끼울 필요가 없다.** partial 조건 때문에 인덱스 안의 행들은 전부 `is_deleted = true` 라서, 그 컬럼이 키에 있어도 모두 같은 값이라 정렬에도 검색에도 도움이 안 된다. 자리만 잡아먹는다. 그 자리는 *실제로 정렬하거나 좁히는 데 쓰일* 컬럼 — 여기선 `deleted_at` — 한테 주는 게 맞다.

### 다른 조건과 함께 쓸 때도 마찬가지다

쿼리에 boolean 이 다른 컬럼이랑 같이 등장하는 경우도 흔하다.

```sql
SELECT *
FROM posts
WHERE tenant_id = ?
  AND is_published = true
ORDER BY published_at DESC
LIMIT 20;
```

이때도 결론은 같다. boolean 은 키로 끼우지 말고, partial 조건으로 빼는 쪽이 깔끔하다.

```sql
CREATE INDEX idx_posts_tenant_published
  ON posts (tenant_id, published_at DESC)
  WHERE is_published = true;
```

publish된 글만 인덱스에 들어가고, 키는 `tenant_id` 로 좁힌 다음 `published_at` 으로 정렬된 상태로 저장된다. 인덱스 크기도 작고, 쿼리도 깨끗하게 잡힌다.

요약하면, boolean 은 **인덱스 키에 박는 컬럼이 아니라, partial index의 조건**으로 보는 게 거의 항상 낫다.

## 3. 인덱스를 만들기 전에 먼저 볼 것

인덱스는 감으로 만들면 안 된다. 최소한 이 순서로는 본다.

### 1) 실제 느린 쿼리부터 찾기

인덱스 전략은 추상 이론이 아니라, **실제 느린 쿼리**에서 출발해야 한다.

- 어떤 `WHERE` 조건이 자주 쓰이는가
- 어떤 `ORDER BY`, `LIMIT` 이 붙는가
- 결과가 보통 몇 건까지 줄어드는가

`pg_stat_statements` 가 켜져 있다면 거기서 먼저 본다.

### 2) `EXPLAIN ANALYZE` 로 실제 계획을 본다

"인덱스가 있으면 빠르겠지" 는 자주 틀린다. 플래너가 실제로 어떤 계획을 선택했는지를 봐야 한다.

- Sequential Scan 인가
- Index Scan / Index Only Scan 인가
- Bitmap Heap Scan 인가
- 별도 Sort 가 끼어 있는가

인덱스는 만드는 것보다, *플래너가 실제로 쓰는지* 확인하는 게 더 중요하다. 만들어놓고 안 쓰이는 인덱스는, 그냥 쓰기 비용만 더하는 짐이다.

### 3) 읽기 성능만 보지 않기

인덱스가 늘어나면 `INSERT`, `UPDATE`, `DELETE` 비용이 올라가고, 저장 공간도 더 먹는다. `pg_stat_user_indexes` 의 `idx_scan` 이 0에 가까운 인덱스가 있다면, 그건 그냥 비용만 내고 있는 것이다.

인덱스는 공짜가 아니다. 읽기 성능을 위해 쓰기 비용을 사는 거래다.

## 짧은 체크리스트

- 복합 인덱스는 **`WHERE` + `ORDER BY` 패턴**으로 컬럼 순서를 잡는다.
- 단일 컬럼 정렬은 인덱스 방향을 안 맞춰도 된다. 혼합 정렬일 때만 신경 쓴다.
- boolean 컬럼은 **인덱스 키가 아니라 partial 조건**으로 빼는 게 거의 항상 낫다.
- 인덱스 추가 전후에는 반드시 `EXPLAIN ANALYZE` 로 확인한다.
- 안 쓰는 인덱스는 결국 쓰기만 느리게 만든다.

## 마무리

PostgreSQL 인덱싱에서 중요한 건 "정답 공식"이 아니라, **실제 쿼리 패턴에 맞는가**다.

특히 복합 인덱스와 boolean 컬럼은 원칙만 외우면 오히려 실수하기 쉽다. 복합 인덱스는 컬럼 순서가 핵심이고 정렬 방향은 보통 신경 쓸 필요가 없다. boolean 은 키에 박지 말고 partial index 조건으로 빼는 쪽을 먼저 생각한다.

> 인덱스를 만들기 전에, 실제 쿼리와 실행 계획부터 본다.
