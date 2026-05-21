---
title: "Django Migration Cleanup: squashmigrations, Not Reset"
date: 2026-05-19
lang: en
tags: [django, postgres, migration, devops]
description: "When Django migrations get bloated, most guides reach for 'delete everything + fake migration'. That approach is hard to adopt once a real production DB is running. This post walks through the full lifecycle of cleaning up migrations with squashmigrations through a small example, without downtime."
---

**Django migration cleanup == delete everything + `migrate --fake-initial`** — search for it and 90% of results say this. It's the right call for a side project, but **once production is actually running, you can't just adopt it as-is**. The answer is `squashmigrations`.

This tool has been in Django since 1.7 (2014), but it's rarely covered in intro material. You won't run into it until you touch a bloated company project.

## The core difference

| Approach | Production DB impact |
|---|---|
| **Reset + fake** | New files diverge from the `django_migrations` table → humans have to sync manually |
| **squashmigrations** | `replaces` field gives Django auto-recognition → zero downtime |

The difference fits in one line. **squash doesn't touch your production DB.**

## Walking through a small example

Say the `blog` app has accumulated 5 migrations.

```
blog/migrations/
├── 0001_initial.py
├── 0002_add_author.py
├── 0003_add_tags.py
├── 0004_alter_title.py
└── 0005_add_published.py
```

Cleaning this up is a **3-step** lifecycle.

### Step 1: squash

```bash
# End number only: collapse everything from 0001 through 0005
python manage.py squashmigrations blog 0005

# Start + end: collapse only 0002~0005 (leave 0001 alone)
python manage.py squashmigrations blog 0002 0005

# Custom filename
python manage.py squashmigrations blog 0005 --squashed-name cleanup
```

After interactive confirmation, a new file appears. Two naming patterns:

- **No start** (`squashmigrations blog 0005`): `0001_squashed_<last_full_name>.py` → e.g., `0001_squashed_0005_add_published.py`. Only this form gets `initial = True`.
- **Start + end** (`squashmigrations blog 0002 0005`): `<start_full_name>_squashed_<last_full_name>.py` → e.g., `0002_add_author_squashed_0005_add_published.py`.

The example in this post uses the first form.

```
blog/migrations/
├── 0001_initial.py
├── 0001_squashed_0005_add_published.py   ← new file
├── 0002_add_author.py
├── 0003_add_tags.py
├── 0004_alter_title.py
└── 0005_add_published.py
```

The contents look like this:

```python
# 0001_squashed_0005_add_published.py
class Migration(migrations.Migration):

    replaces = [
        ("blog", "0001_initial"),
        ("blog", "0002_add_author"),
        ("blog", "0003_add_tags"),
        ("blog", "0004_alter_title"),
        ("blog", "0005_add_published"),
    ]

    initial = True
    dependencies = []          # usually empty for an initial squash. Populated if other apps are referenced
    operations = [
        # Final schema of 0001~0005, applied in one go
        migrations.CreateModel(name="Post", fields=[...]),
        migrations.CreateModel(name="Tag", fields=[...]),
        ...
    ]
```

`replaces` is the whole trick. That's the magic of squashmigrations.

### Step 2: deploy (zero-downtime for prod)

Commit and deploy the squashed file **together with the existing files** — both stay in place.

| Environment | `django_migrations` state | Behavior |
|---|---|---|
| Existing prod | 0001~0005 already applied | "All IDs in replaces are applied → mark squashed as applied too." No actual change |
| Fresh env | Empty | Only the squashed runs → same final schema |

The production DB is **not touched**. Django handles the bookkeeping.

### Step 3: weeks or months later — delete the old files

Once every environment (dev/staging/prod) has been running on the squashed migration stably, do the cleanup **in a single PR**. Removing `replaces` and deleting old files must ship in the same deploy — splitting them creates a broken intermediate state.

```python
# 0001_squashed_0005_add_published.py (after edit)
class Migration(migrations.Migration):
    # replaces = [...]  ← removed

    initial = True
    dependencies = []
    operations = [...]
```

```bash
rm blog/migrations/0001_initial.py
rm blog/migrations/0002_add_author.py
rm blog/migrations/0003_add_tags.py
rm blog/migrations/0004_alter_title.py
rm blog/migrations/0005_add_published.py
```

Only the squashed file remains in the folder, and subsequent migrations continue cleanly as `0002_xxx → 0003_xxx → ...`.

```
blog/migrations/
└── 0001_squashed_0005_add_published.py
```

#### Cleaning up the `django_migrations` table (optional)

Even after deleting the old files, the `django_migrations` table still holds rows for `0001_initial` through `0005_add_published`. **This is functionally fine** — Django identifies the squashed migration by **name**, so production keeps running and `migrate` keeps passing.

If you want `showmigrations` output or audit logs to stay tidy:

```bash
# Django 5.1+
python manage.py migrate --prune blog
```

`--prune` deletes rows in the table **that no longer have a corresponding file**. Order matters — run this **after** the old files are deleted and the deploy has finished (running it before the deploy would delete valid migrations).

For Django < 5.1, fall back to manual SQL:

```sql
DELETE FROM django_migrations
WHERE app = 'blog'
  AND name IN (
    '0001_initial',
    '0002_add_author',
    '0003_add_tags',
    '0004_alter_title',
    '0005_add_published'
  );
```

If running DELETE in production makes you nervous, just leave the rows there. Even across several squash cycles, the accumulation stays small.

#### Step 3 in order

1. Remove `replaces = [...]` + delete old files + update any cross-app dependency IDs → **one PR / one deploy**
2. After the deploy lands and all environments are stable, (optional) run `migrate --prune blog` or manual SQL to tidy the table

Step 1 alone is enough to keep production healthy. Step 2 is hygiene.

> ⚠️ **Step 3 timing — not too early, not too late.**
>
> **Why not too early** — the moment `replaces` is removed, two safety nets disappear.
> 1. **Backup recovery auto-detection**: With `replaces` in place, restoring an old backup (only 0001~0005 applied) still works — Django sees "all IDs in replaces are applied → squashed is applied too." Without it, the restored env looks fresh, so Django tries to apply the squashed migration again and conflicts.
> 2. **Rollback path**: Once the old files are gone too, you can't easily roll back to a pre-squash revision. Restoring them requires hand-fetching from git history.
>
> **Why not too late — you can't start the next squash cycle** — while `replaces` is alive, the squashed migration is still a "temporary" form. Django's docs explicitly say not to re-squash in this state ("you should not then re-squash that squashed migration until you have fully transitioned it to a normal migration"). Nested `replaces` tangles the graph. So step 3 has to be finished before migrations get bloated again and you need another cleanup cycle.
>
> **Guideline**: After every environment (dev/staging/prod/long-lived branches/replicas) has been running on the squashed migration for at least one stable cycle, do step 3 — and finish it before the next squash is needed.

## Verification

Before opening the squash PR, check two things.

```bash
# 1) Do the models and migrations match exactly — did squash miss any operation?
python manage.py makemigrations --check --dry-run

# 2) Does a clean DB run through migrate end-to-end?
docker compose down -v
docker compose up -d db
python manage.py migrate
python manage.py test
```

`makemigrations --check` is the real guard. Rare, but squash can drop an operation like `AlterField`; if this passes, no such omission. Wiring it into CI also catches everyday "forgot to run makemigrations after a model change" PRs, not just squash regressions.

## Pitfalls (only the ones that matter)

### `RunPython` isn't merged automatically

The Django optimizer only compresses schema operations. `RunPython` / `RunSQL` can have arbitrary side effects (Django can't introspect what's inside), so they land in the squashed file **sequentially, every one of them**.

To drop them at squash time, mark them with `elidable=True` when you write the migration:

```python
migrations.RunPython(
    backfill_authors,
    reverse_code=migrations.RunPython.noop,
    elidable=True,   # auto-removed during squash
)
```

The rule is simple — **code that should re-run in fresh environments stays `elidable=False`** (the default); one-shot backfills get `elidable=True`. Seed data that's still meaningful (initial categories, default permissions, etc.) either stays as-is or moves to a fixture. If you forgot to mark something, you can delete it from the squashed file by hand, but marking it at creation time documents intent and gets handled automatically in future squash cycles.

When `CreateModel` + `RunPython` end up in the same squashed file, they run in a single transaction on fresh environments. Postgres is usually fine with this, but if a `RunPython` calls something like `CREATE INDEX CONCURRENTLY` that can't run inside a transaction, it breaks — set `atomic = False` on the migration.

### Cross-app dependency

If another app's migration directly references one of the IDs being squashed (e.g., `dependencies = [("blog", "0003_add_tags")]`), nothing breaks right after squash — the old files are still there to resolve the ID. The problem hits **when step 3 deletes those old files** and the dependency snaps.

So the step 3 PR has to bundle the `replaces` removal and old-file deletion together with **rewriting any cross-app dependencies to point at the new squashed ID**. Single-app squash is the common case, but trace the dependency graph before you start.

### Don't `import` from `models.py` inside a migration

```python
# ❌ Breaks after squash
from blog.models import Post

# ✅ Use historical models
def forward(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
```

If existing migrations break this rule, fresh environments will fail after squash.

## Which one, when

| Situation | Recommendation |
|---|---|
| Side project, learning | reset + fake |
| Production DB exists, migrations bloated | **squashmigrations** |
| Multi-person team, separate dev/staging/prod | **squashmigrations** only |

## A few more things for production

- **Backups**: Take a prod DB backup right before step 3. squash itself doesn't touch the DB, but removing `replaces` retires the safety net. If a subsequent migration breaks, recovery gets awkward.
- **CI guard**: Pin `makemigrations --check --dry-run` into CI. Beyond squash validation, it also catches everyday model/migration drift.
- **Fresh environments aren't always fast**: squashed migrations don't touch existing prod, but when you spin up a new staging/replica, `CreateModel` + `AlterField` run all at once. With large seed data, the apply time can be longer than expected.
- **Rollback path**: Treat the step 3 deploy as the moment you close the door on rolling back to a pre-squash revision. After it, the only way back is hand-restoring old files from git history.

## Why does everyone only know about reset?

Without production, reset is fast and simple. Most people's first Django experience is a side project, so that's the right answer for them — squash only shows up the first time you touch a years-old company project.

> If you didn't know this until now, it's not your fault — **you just hadn't been in a situation where squash was needed**.

## Short checklist

- Migration cleanup = `squashmigrations`. reset is for side projects only.
- Lifecycle: **squash → deploy → (much later) remove `replaces` + delete old files in one PR**.
- Don't delete old files immediately. Wait until every environment is on the squashed migration.
- Verification: `makemigrations --check --dry-run` + clean DB run-through with `migrate`.
- Mark one-shot `RunPython` / `RunSQL` with `elidable=True`. If any mixed-in DDL has to run outside a transaction, consider `atomic = False`.
- Check the dependency graph for any other app referencing IDs you're about to collapse. If so, rewrite them to the new squashed ID in the step 3 PR.

## Wrap-up

The one thing that sets `squashmigrations` apart from reset: **it doesn't touch the production DB.** A single `replaces` field tells Django "this file represents these N old migrations," and the production `django_migrations` table picks up the squashed migration as already-applied automatically.

The lifecycle in one line:

> squash → deploy → forget about it for a while → much later, remove `replaces` and delete the old files.
