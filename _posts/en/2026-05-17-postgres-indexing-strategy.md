---
title: "PostgreSQL Indexing: What to Check Before You Create One"
date: 2026-05-17
lang: en
tags: [postgresql, database, indexing]
description: "Column order for composite indexes, when boolean columns are actually worth indexing, and the things to check before adding any index at all."
---

I once added an index to fix a slow API response and was surprised when it barely got faster. `EXPLAIN` told me the planner wasn't even using it. Indexes don't make things faster just by existing — they have to **fit the query pattern**.

This post unpacks the three things I keep coming back to:

1. How to order columns in a composite index
2. When a boolean column is actually worth indexing
3. What to check before creating any index in the first place

## 1. Composite indexes follow the query pattern

The thing that matters most in a composite index is **the column order**.

Say this query runs a lot:

```sql
SELECT *
FROM orders
WHERE customer_id = ?
  AND status = ?
ORDER BY created_at DESC
LIMIT 20;
```

The matching index is usually:

```sql
CREATE INDEX idx_orders_customer_status_created_at
  ON orders (customer_id, status, created_at);
```

The rule is straightforward:

- Put the `WHERE` equality columns that show up together **first**.
- Put the `ORDER BY` column **last**.
- *Within* those constraints, then think about selectivity.

The non-obvious thing here is that the index doesn't say `DESC` even though the query orders by `created_at DESC`. That's intentional.

> PostgreSQL's B-tree indexes support **bidirectional scans**.
> So even though the data is stored ascending, the planner can read it *backwards* to satisfy `ORDER BY created_at DESC`.

`EXPLAIN` will show `Index Scan Backward`. For a single-column sort, you don't need to bake `DESC` into the index.

The case where index direction *does* matter is when a single-direction scan can't satisfy the sort:

```sql
ORDER BY customer_id ASC, created_at DESC
```

This **mixed-direction sort** needs an index like `(customer_id ASC, created_at DESC)` so a forward scan produces the right order out of the box.

### Left-prefix rule

A composite index is used *from the left*. `(a, b, c)` works well for queries that filter on `a`, `a+b`, or `a+b+c`, but it's essentially useless for queries that only filter on `b` or on `b+c`.

Before creating any index, I try to picture this first: **which `WHERE` + `ORDER BY` combinations in actual traffic will end up using it?** If nothing comes to mind, that's an index you shouldn't be creating.

Mechanically applying "highest-selectivity column first" leads to indexes that look right on paper but nothing actually uses.

## 2. Treat boolean columns as partial index predicates

Columns like `is_deleted`, `is_active`, `is_published` usually have heavily skewed values — most rows fall on one side.

Suppose 95% of rows have `is_active = true`. Then:

```sql
WHERE is_active = true
```

matches **too many rows** for an index to help. The planner correctly decides a sequential scan is cheaper and skips the index entirely.

Don't take the wrong lesson from this. What's weak isn't **the boolean column itself** — it's **looking up the low-selectivity value**. The same column, queried for `is_active = false` (5%), is a totally different story. So the first question is: *which side of the boolean do you actually query?*

There are two ways to handle this. Comparing them naturally leads to a partial index.

### Case 1: a plain index on the boolean column

The simplest move is just to index the boolean column directly.

```sql
CREATE INDEX idx_posts_is_deleted
  ON posts (is_deleted);
```

If `is_deleted = true` is under 1%, this index does work — for that 1%. The planner sees that `true` is selective enough and will use the index. Queries for `is_deleted = false` (99%) will skip it, since a sequential scan is cheaper when so many rows match.

It works, but two problems show up.

1. **99% of rows are indexed for nothing.** Only 1% of the rows are ever queried through this index, yet the other 99% are indexed too. That's wasted disk space, plus every `INSERT`/`UPDATE` has to update the index.
2. **Additional conditions don't get any help.** Real queries on that 1% usually look like `ORDER BY deleted_at DESC LIMIT 20`. The boolean index gets you to the 1%, but then you still need a separate sort.

In short, a plain boolean index *technically works*, but there's almost always something better.

### Case 2: replace it with a partial index

A **partial index** fixes both problems at once.

```sql
CREATE INDEX idx_posts_deleted_recent
  ON posts (deleted_at DESC)
  WHERE is_deleted = true;
```

This one-liner is actually two decisions. Keeping them separate in your head helps:

- `WHERE is_deleted = true` (partial predicate) — controls **which rows go into the index**. → "only deleted rows live here"
- `(deleted_at DESC)` (index key) — controls **how those rows are ordered inside the index**. → "newest deletions first"

Compared to Case 1, both pain points are gone:

- Only 1% of rows are indexed. The index is much smaller, and writes to the other 99% don't touch it at all.
- Inside that 1%, rows are already stored in `deleted_at DESC` order — so "last 20 deletions" needs no separate sort.

One common mistake to avoid: **don't also add `is_deleted` to the key, like `(is_deleted, deleted_at DESC)`.** Because of the partial predicate, every row in the index has the same `is_deleted = true` value, so that key slot contributes nothing — same value everywhere helps neither filtering nor sorting. Give that slot to a column that does actual work, like `deleted_at`.

### Same approach when other filters are involved

It's common for the boolean to show up next to other columns:

```sql
SELECT *
FROM posts
WHERE tenant_id = ?
  AND is_published = true
ORDER BY published_at DESC
LIMIT 20;
```

The conclusion is the same: don't bake the boolean into the key, push it into the partial predicate.

```sql
CREATE INDEX idx_posts_tenant_published
  ON posts (tenant_id, published_at DESC)
  WHERE is_published = true;
```

Only published rows enter the index. The key narrows on `tenant_id` and is already sorted by `published_at`. Small index, clean plan.

The summary: a boolean column is **almost never something you put in the index key — it's a predicate on a partial index.**

## 3. Things to check before creating an index

Don't index by feel. At minimum, walk through this:

### 1) Find actually-slow queries first

Index strategy starts from real slow queries, not abstract theory.

- Which `WHERE` filters show up often?
- Which `ORDER BY`, `LIMIT` clauses come with them?
- How many rows does the result typically narrow down to?

If `pg_stat_statements` is enabled, that's the first place to look.

### 2) Read the real plan with `EXPLAIN ANALYZE`

"If I have an index, it'll be fast" is wrong more often than people think. You have to see what plan the planner actually picks:

- Sequential Scan?
- Index Scan / Index Only Scan?
- Bitmap Heap Scan?
- An extra Sort step on top?

Creating an index is less important than *confirming the planner uses it*. An index nobody uses is dead weight that only slows writes down.

### 3) Don't optimize for reads only

More indexes mean higher `INSERT`, `UPDATE`, `DELETE` cost, plus storage. Check `pg_stat_user_indexes` — any index whose `idx_scan` is near zero is paying cost for no benefit.

Indexes aren't free. You're trading write cost for read speed.

## Short checklist

- Order composite index columns by **`WHERE` + `ORDER BY` pattern** first, selectivity second.
- For single-column sorts, don't worry about index direction — B-trees scan both ways. Only mixed-direction sorts need explicit `DESC`.
- A boolean column is **a partial index predicate, not an index key**.
- Always check `EXPLAIN ANALYZE` before and after.
- Unused indexes just make writes slower.

## Wrap-up

What matters in PostgreSQL indexing isn't a "correct formula" — it's **whether the index fits your actual query pattern**.

Composite indexes and booleans are the two spots where memorizing rules backfires the most. For composite indexes, column order is the lever; sort direction usually isn't. For booleans, the move is almost always a partial index predicate, not a key column.

> Before you create an index, look at the real query and its real plan.
