---
title: "Django 마이그레이션 정리: reset 말고 squashmigrations"
date: 2026-05-19
lang: ko
tags: [django, postgres, migration, devops]
description: "Django 마이그레이션이 비대해졌을 때 흔히 '전부 삭제 + fake migration'을 쓴다. 실제 프로덕션 운영 중엔 도입하기 어려운 방식이다. squashmigrations로 무중단 정리하는 라이프사이클 전체를 작은 예제로 본다."
---

**Django 마이그레이션 정리 == 전부 삭제 + `migrate --fake-initial`** — 검색하면 90% 이게 나온다. 사이드 프로젝트라면 정답이지만, **실제 프로덕션이 굴러가는 중엔 그대로 도입하기 어렵다**. 정답은 `squashmigrations`.

이 도구는 Django 1.7(2014)부터 있었지만 입문 자료에서 잘 안 다뤄서, 회사에서 비대한 프로젝트를 만지기 전엔 만날 일이 없다.

## 두 방식의 핵심 차이

| 방식 | 운영 DB 영향 |
|---|---|
| **Reset + fake** | `django_migrations` 테이블과 새 파일이 어긋남 → 사람이 직접 동기화 |
| **squashmigrations** | `replaces` 필드로 자동 인식 → 무중단 |

차이는 한 줄이다. **squash는 운영 DB를 건드리지 않는다.**

## 작은 예제로 끝까지 가보기

`blog` 앱에 마이그레이션이 5개 쌓였다고 하자.

```
blog/migrations/
├── 0001_initial.py
├── 0002_add_author.py
├── 0003_add_tags.py
├── 0004_alter_title.py
└── 0005_add_published.py
```

이걸 정리하는 전체 흐름은 **3단계**다.

### 1단계: squash

```bash
# 끝 번호만: 처음(0001)부터 0005까지 전부 합침
python manage.py squashmigrations blog 0005

# 시작·끝 명시: 0002~0005 만 합침 (0001은 그대로 둠)
python manage.py squashmigrations blog 0002 0005

# 파일명 직접 지정
python manage.py squashmigrations blog 0005 --squashed-name cleanup
```

대화형 확인 후, 새 파일이 생긴다. 명명 규칙은 두 가지:

- **시작 없이** (`squashmigrations blog 0005`): `0001_squashed_<마지막_전체이름>.py` → 예: `0001_squashed_0005_add_published.py`. 이 케이스만 `initial = True` 가 붙는다.
- **시작·끝 명시** (`squashmigrations blog 0002 0005`): `<시작_전체이름>_squashed_<마지막_전체이름>.py` → 예: `0002_add_author_squashed_0005_add_published.py`.

이 글의 예제는 첫 번째 케이스다.

```
blog/migrations/
├── 0001_initial.py
├── 0001_squashed_0005_add_published.py   ← 새 파일
├── 0002_add_author.py
├── 0003_add_tags.py
├── 0004_alter_title.py
└── 0005_add_published.py
```

내용은 이렇게 생겼다.

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
    dependencies = []          # initial squash 면 보통 빈 리스트. 다른 앱 참조가 있으면 채워짐
    operations = [
        # 0001~0005 의 최종 결과 schema 한 번에 생성
        migrations.CreateModel(name="Post", fields=[...]),
        migrations.CreateModel(name="Tag", fields=[...]),
        ...
    ]
```

`replaces` 가 전부다. 이게 squashmigrations 의 마법.

### 2단계: 배포 (운영 DB 무중단)

squashed 파일 + 기존 파일 **둘 다 그대로 커밋·배포**한다.

| 환경 | DB의 `django_migrations` 상태 | 동작 |
|---|---|---|
| 기존 운영 | 0001~0005 이미 applied | "replaces 안의 모든 ID가 applied → squashed도 applied로 간주". 아무 변화 없음 |
| 신규 환경 | 비어있음 | squashed 하나만 실행 → 동일한 schema |

운영 DB는 **건드리지 않는다**. Django가 알아서 인식해준다.

### 3단계: 시간이 지난 후 (몇 주~몇 달 뒤) — 옛 파일 삭제

모든 환경(dev/staging/prod)이 squashed 상태로 안정적으로 굴러간 뒤, **한 PR로** 정리한다. `replaces` 제거와 옛 파일 삭제는 같은 배포에서 같이 가야 한다 — 따로 가면 중간 상태에서 동기화가 깨진다.

```python
# 0001_squashed_0005_add_published.py (수정 후)
class Migration(migrations.Migration):
    # replaces = [...]  ← 삭제

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

폴더는 squashed 하나만 남고, 다음 마이그레이션부터는 `0002_xxx → 0003_xxx → ...` 로 깔끔하게 이어진다.

```
blog/migrations/
└── 0001_squashed_0005_add_published.py
```

#### `django_migrations` 테이블 정리 (선택)

옛 파일을 지워도 DB 의 `django_migrations` 테이블엔 `0001_initial` ~ `0005_add_published` 행이 그대로 남는다. Django 는 squashed 마이그레이션을 **이름**으로 식별하므로 기능적으론 문제 없다 — 운영 동작에 영향 없음, `migrate` 도 통과.

그래도 `showmigrations` 출력이나 감사 로그를 깔끔하게 두고 싶으면:

```bash
# Django 5.1+
python manage.py migrate --prune blog
```

`--prune` 은 **파일이 없는데 테이블에 남아있는 항목**을 지운다. 그래서 순서가 중요하다 — 옛 파일을 다 삭제하고 배포가 끝난 뒤 실행해야 한다 (배포 전에 돌리면 멀쩡한 마이그레이션을 지울 수 있다).

Django 5.1 미만이면 수동 SQL:

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

운영에서 직접 DELETE 돌리는 게 부담이면 그냥 두는 것도 정답이다. 다음 squash 사이클까지 가도 누적되는 행이 많지 않다.

#### 3단계 전체 순서 정리

1. `replaces = [...]` 제거 + 옛 파일 삭제 + 다른 앱의 dependency ID 갈아끼우기 → **한 PR / 한 배포**
2. 배포가 끝나고 모든 환경이 안정화된 뒤 (선택) `migrate --prune blog` 또는 수동 SQL 로 테이블 정리

1번이 끝나도 운영은 멀쩡히 굴러간다. 2번은 어디까지나 위생 작업.

> ⚠️ **3단계 타이밍 — 너무 일찍도, 너무 늦게도 안 된다.**
>
> **너무 일찍 하면 안 되는 이유** — `replaces` 가 떼이는 순간 두 가지 안전망이 같이 사라진다.
> 1. **백업 복구 자동화**: `replaces` 가 있으면 옛 백업(0001~0005만 applied 상태)을 복구해도 Django 가 "replaces 의 ID 가 전부 applied → squashed 도 applied" 로 자동 인식한다. 떼고 나면 신규 환경 취급이 돼서 squashed 를 다시 적용하려다 conflict 가 난다.
> 2. **롤백 경로**: 옛 파일까지 같이 지우면 pre-squash 리비전으로 손쉽게 못 돌아간다. 다시 살리려면 git 히스토리에서 옛 파일을 수동 복구해야 한다.
>
> **너무 늦으면 다음 squash 를 못 돈다** — `replaces` 가 살아있는 동안 그 squashed 파일은 아직 "임시 상태"다. Django 공식 문서도 임시 상태에서 다시 squash 하지 말라고 명시한다 ("you should not then re-squash that squashed migration until you have fully transitioned it to a normal migration"). 중첩 `replaces` 가 그래프를 꼬이게 만들기 때문이다. 마이그레이션이 또 비대해져서 다음 정리 사이클이 필요해지기 전에 3단계가 끝나 있어야 한다.
>
> **가이드라인**: 모든 환경(dev/staging/prod/장수 브랜치/replica 포함)이 squashed 를 한 사이클 이상 안정적으로 굴린 뒤, 다음 squash 가 필요해지기 전 구간에서 3단계를 해치운다.

## 검증

squash 후 PR 올리기 전 두 가지를 본다.

```bash
# 1) model 과 마이그레이션이 정확히 일치하는지 — squash 가 빠뜨린 operation 없는지
python manage.py makemigrations --check --dry-run

# 2) 깨끗한 DB 로 처음부터 migrate 가 끝까지 가는지
docker compose down -v
docker compose up -d db
python manage.py migrate
python manage.py test
```

`makemigrations --check` 가 진짜 중요한 가드다. 드물지만 squash 가 `AlterField` 같은 operation 을 빠뜨리는 경우가 있는데, 이게 통과하면 그런 누락이 없다는 뜻이다. CI 에도 박아두면 squash 외에 model 변경 후 마이그레이션 깜빡한 PR 도 같이 잡힌다.

## 함정 (꼭 알아야 할 것만)

### `RunPython` 은 자동으로 안 합쳐진다

Django optimizer 는 schema operation 만 압축한다. `RunPython` / `RunSQL` 은 임의 사이드이펙트가 있을 수 있어서 (Django 가 안에 뭐가 있는지 introspect 못 함) squashed 파일에 **순차적으로 다 들어간다**.

빼고 싶으면 마이그레이션 작성 시점에 `elidable=True` 로 명시한다:

```python
migrations.RunPython(
    backfill_authors,
    reverse_code=migrations.RunPython.noop,
    elidable=True,   # squash 때 자동 제거
)
```

기준은 단순하다 — **신규 환경에서 다시 굴어야 의미 있는 코드면 `elidable=False`** (기본값), 한 번 굴리고 끝나는 백필이면 `elidable=True`. 현재도 의미 있는 seed (초기 카테고리, 기본 권한 등) 면 그대로 두거나 fixture 로 분리. 깜빡하고 마킹 안 했으면 squashed 결과 파일에서 손으로 지워도 되지만, 처음부터 표시해두는 게 의도가 문서화되고 다음 squash 사이클에서도 자동 처리된다.

`CreateModel` + `RunPython` 이 한 squashed 파일에 섞이면 신규 환경에서 한 트랜잭션으로 돈다. Postgres 는 보통 괜찮지만 `RunPython` 안에서 `CREATE INDEX CONCURRENTLY` 같이 트랜잭션 밖에서만 도는 DDL 을 건드리면 깨지니, 필요하면 `atomic = False` 를 명시한다.

### Cross-app dependency

다른 앱이 합쳐질 옛 마이그레이션 ID 를 직접 참조하고 있다면 (`dependencies = [("blog", "0003_add_tags")]` 같은 식), squash 직후엔 멀쩡하다 — 옛 파일이 그대로 남아 있어서 ID 가 resolve 된다. 문제는 **3단계에서 옛 파일을 지우는 순간** 그쪽 dependency 가 끊긴다는 것.

그래서 3단계 PR 에선 `replaces` 제거·옛 파일 삭제와 함께 **다른 앱의 dependency 도 새 squashed ID 로 갈아끼우는 작업**을 같은 PR 에 묶어야 한다. 단일 앱 squash 가 흔하지만, 들어가기 전에 의존성 그래프 한 번 훑는 게 안전하다.

### Migration 안에서 `models.py` 를 import 하지 마라

```python
# ❌ squash 후 깨짐
from blog.models import Post

# ✅ historical model 사용
def forward(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
```

기존 마이그레이션이 이 규칙을 깨고 있다면 squash 후 신규 환경에서 깨진다.

## 어느 쪽을 언제 쓰나

| 상황 | 추천 |
|---|---|
| 사이드 프로젝트, 학습용 | reset + fake |
| 운영 DB 있음, 마이그레이션 비대 | **squashmigrations** |
| 팀 여러 명, dev/staging/prod 분리 | **squashmigrations** 한정 |

## 프로덕션에서 한 번 더 확인할 것

- **백업**: 3단계 직전 운영 DB 백업. squash 자체는 DB 를 안 건드리지만, `replaces` 떼는 순간 안전망이 사라진다. 다음 마이그레이션이 깨지면 복구가 까다롭다.
- **CI 가드**: `makemigrations --check --dry-run` 을 CI 에 박아둔다. squash 검증뿐 아니라 일상적인 model/마이그레이션 동기화 사고도 같이 막힌다.
- **신규 환경은 항상 빠르지 않다**: squashed 는 운영 DB 를 안 건드리지만, 신규 staging/replica 를 띄울 땐 `CreateModel` + `AlterField` 를 한 번에 다 적용한다. 시드 데이터가 크면 적용 시간이 의외로 늘어난다.
- **롤백 경로**: 3단계 배포는 pre-squash 리비전 롤백 가능성을 닫는 시점이라고 보고 진행한다. 이후엔 git 히스토리에서 옛 파일을 수동 복구해야 되돌릴 수 있다.

## 왜 다들 reset 만 알까

운영이 없으면 reset 이 빠르고 단순하다. 대부분 Django 첫 경험은 사이드 프로젝트라서 그게 정답이고, squash 는 회사에서 수년 된 프로젝트 만질 때 처음 마주친다.

> 지금까지 몰랐다면 당신 잘못이 아니라, **squash 가 필요한 상황이 지금까지는 없었던 것**이다.

## 짧은 체크리스트

- 마이그레이션 정리 = `squashmigrations`. reset 은 사이드 프로젝트 한정.
- 라이프사이클: **squash → 배포 → (한참 후) `replaces` 제거 + 옛 파일 삭제 한 PR**.
- 옛 파일은 즉시 지우지 마라. 모든 환경이 squashed 적용된 뒤에 정리.
- 검증: `makemigrations --check --dry-run` + 깨끗한 DB 로 처음부터 migrate.
- 일회성 `RunPython` / `RunSQL` 은 `elidable=True` 로 마킹. 트랜잭션 밖에서만 도는 DDL 섞이면 `atomic = False` 검토.
- 다른 앱이 합쳐질 ID 를 직접 참조하는지 미리 그래프로 확인. 있다면 3단계 PR 에서 새 squashed ID 로 같이 갈아끼운다.

## 마무리

`squashmigrations` 가 reset과 다른 건 한 가지다. **운영 DB를 건드리지 않는다.** `replaces` 한 필드가 "이 파일이 옛날 N개를 대체한다"고 Django에게 알려주고, 운영 DB의 `django_migrations` 테이블은 자동으로 squashed를 applied로 인식한다.

라이프사이클 한 줄로 요약하면:

> squash → 배포 → 잊고 살다가, 한참 뒤에 `replaces` 떼고 옛 파일 삭제.
