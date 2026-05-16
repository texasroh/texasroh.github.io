---
title: "파이썬에서 싱글톤: 클래스 트릭 말고 모듈을 써라"
date: 2026-05-16
lang: ko
tags: [python, design-pattern, singleton]
description: "자바·C++ 스타일의 싱글톤 패턴을 파이썬에 그대로 옮기면 어색해진다. 모듈 시스템이 이미 무료로 주는 싱글톤을 활용하는 게 정석이다."
---

설정 객체를 한 번만 로드해 전역에서 재사용하려고 싱글톤을 쓰던 중, 동료가 물었다. "왜 클래스에 `__new__` 트릭을 안 쓰고 모듈 전역 변수를 쓰지?" 좋은 질문이라 정리해둔다.

결론부터 말하면, **파이썬에서 싱글톤이 필요하면 클래스 트릭을 쓰지 말고 모듈 레벨 변수 + factory 함수로 가는 게 정석**이다. 이유를 따져본다.

## 모듈 자체가 이미 싱글톤이다

파이썬은 `import` 한 모듈을 `sys.modules` 라는 딕셔너리에 캐싱한다. 같은 모듈을 어디서 몇 번을 import 해도 모두 **같은 모듈 객체**를 가리킨다.

```python
# config.py
_config = None
counter = 0
```

```python
# a.py
from myapp import config
config.counter += 1   # 1

# b.py (다른 파일)
from myapp import config
print(config.counter)  # 1 — a.py 의 변경이 그대로 보임
```

`import` 의 동작을 단순화하면 이렇다.

```python
def import_module(name):
    if name in sys.modules:
        return sys.modules[name]      # 캐시 히트 → 같은 객체
    module = load_and_execute(name)   # 캐시 미스 → 새로 로드
    sys.modules[name] = module
    return module
```

즉, 모듈 안의 전역 변수는 **자동으로 프로세스 단위 단일 객체**가 된다. Django 의 `from django.conf import settings`, `logging.getLogger()` 가 같은 로거를 돌려주는 것 모두 이 원리다.

## 가장 단순한 형태: 모듈 전역 + factory 함수

설정 객체처럼 "초기화 비용은 있지만 한 번만 만들면 끝" 인 자원에 자주 쓰는 패턴은 이렇다.

```python
import threading
from typing import Optional

_config: Optional["Config"] = None
_config_lock = threading.Lock()


def get_config() -> "Config":
    """Double-checked locking — 콜드 스타트 동시 요청에서
    각자 인스턴스를 만들지 않도록."""
    global _config
    if _config is None:
        with _config_lock:
            if _config is None:
                _config = Config()
    return _config
```

특징:

- `Config` 클래스 자체는 **평범한 클래스**. "한 개만 만든다" 라는 정책은 외부 함수가 강제한다
- `_config` 는 모듈 전역이라 자동 싱글톤
- **double-checked locking** 으로 멀티스레드에서도 안전하면서 빠름. 처음 한 번만 락을 잡고 이후엔 락 없이 바로 반환

이게 파이썬 커뮤니티의 표준 관용구다.

## 왜 클래스 트릭이 아닌가

자바·C++ 출신이면 본능적으로 클래스 안에 싱글톤 책임을 넣고 싶어진다. 파이썬에서도 가능하긴 하다. 4가지 방법을 살펴보고 왜 다 어색한지 보자.

### 1. `__new__` 오버라이드

```python
class Config:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.settings = load_from_file(...)
```

**함정**: `__new__` 가 같은 객체를 돌려줘도 **`__init__` 은 매 호출마다 실행**된다. `Config()` 를 두 번 부르면 상태가 두 번 초기화되어 리셋되는 버그가 흔하다.

회피하려면 가드를 둬야 한다.

```python
def __init__(self):
    if hasattr(self, "_initialized"):
        return
    self._initialized = True
    ...
```

지저분하다.

### 2. 메타클래스

`__call__` 을 가로채서 클래스 호출 자체를 통제한다.

```python
class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.settings = load_from_file(...)   # 진짜 한 번만 호출됨
```

**장점**: `__init__` 도 한 번만. 여러 클래스를 싱글톤으로 만들고 싶을 때 재사용 가능.

**단점**:
- 메타클래스는 파이썬에서 가장 어려운 개념 중 하나다. 모르는 동료가 보면 멘붕
- 다른 메타클래스(Django `ModelBase`, ABC `ABCMeta`)와 충돌하면 머리 아프다
- "이 클래스가 싱글톤" 이라는 사실이 `metaclass=...` 한 줄로만 드러나서 놓치기 쉽다

### 3. 데코레이터

```python
def singleton(cls):
    instances = {}
    lock = threading.Lock()

    def get_instance(*args, **kwargs):
        if cls not in instances:
            with lock:
                if cls not in instances:
                    instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance


@singleton
class Config:
    ...
```

**장점**: `@singleton` 한 줄로 의도가 명확.

**단점**: 데코레이터가 클래스를 **함수로 바꿔버린다**. `isinstance(x, Config)` 가 안 되고, 상속도 안 되고, 클래스 메서드 직접 호출도 깨진다. 타입 시스템과 안 맞아 실무에선 잘 안 쓴다.

### 4. `get_instance` 클래스 메서드

```python
class Config:
    _instance = None
    _lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "Config":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance


config = Config.get_instance()
```

**장점**: 평범한 클래스 + 명시적인 factory. 클래스 트릭 중에선 가장 무난.

**단점**: `Config()` 직접 호출은 막지 않는다. 누군가 실수로 호출하면 새 인스턴스가 생긴다. 막으려면 `__init__` 에 가드 추가 필요.

## 비교 요약

| 방법 | 진입 장벽 | `__init__` 한 번만? | 직접 인스턴스화 차단 | 추천 |
|---|---|---|---|---|
| `__new__` | 낮음 | ❌ (가드 필요) | ✅ | ⚠️ 함정 많음 |
| 메타클래스 | 높음 | ✅ | ✅ | 라이브러리 한정 |
| 데코레이터 | 낮음 | ✅ | ✅ | ❌ 타입 깨짐 |
| `get_instance` | 매우 낮음 | ✅ | ❌ (규율) | ✅ |
| **모듈 전역 + factory** | **매우 낮음** | **✅** | **✅** | **✅✅** |

## 모듈 전역 방식이 더 나은 진짜 이유

표 너머의 본질을 정리하면:

### 1. "싱글톤"은 도메인 로직이 아니다

한 인스턴스만 쓴다는 건 *이 앱에서 사용하는 방식*이지, *클래스의 본질*은 아니다. 책임을 클래스 외부에 두는 게 더 깔끔하다. 같은 클래스를 다른 컨텍스트에서 새로 만들어 격리해서 쓸 자유가 남는다.

### 2. 명시적이다 (Explicit > Implicit)

`get_config()` 라는 이름이 "공유 자원을 가져온다" 는 걸 그대로 드러낸다. `__new__` 트릭은 호출자를 속인다 — `Config()` 가 새 객체를 만드는 것처럼 보이지만 실제론 안 만든다. 코드를 읽는 사람이 한 번에 파악하기 어렵다.

### 3. 테스트가 쉽다

단위 테스트에서 `Config()` 를 직접 만들어 격리해 쓸 수 있다. 클래스가 평범한 채로 남아 있으니 mock 주입도 자유롭다. `__new__` 방식이면 테스트마다 `_instance = None` 으로 리셋해야 하고, 새 인스턴스를 만들 수 없는 클래스가 되어 mock 이 까다롭다.

### 4. `__init__` 함정이 없다

`__new__` 방식의 가장 큰 실수 패턴 — `def __init__(self): self.x = []` 가 매 호출마다 실행되어 상태가 리셋된다. 모듈 전역 + factory 방식에서는 `_config is None` 체크로 인스턴스화 자체를 한 번만 하므로 이 문제가 발생할 여지가 없다.

### 5. 모듈 시스템과 자연스럽게 맞물린다

이미 자동으로 싱글톤인 모듈 메커니즘 위에 얹는 거라 추가 마법이 필요 없다. 다른 메커니즘과 충돌할 일도 없다.

## 주의할 점

이 패턴이 만능은 아니다.

- **멀티 프로세스 환경**: Gunicorn worker 여러 개, Celery worker 여러 개를 띄우면 각 프로세스마다 별도 인스턴스를 가진다. 진짜 전역 공유가 필요하면 Redis · DB 같은 외부 저장소가 필요하다
- **테스트 격리**: 모듈 상태가 테스트 간에 누수될 수 있다. 각 테스트 시작 시 `_config = None` 으로 리셋하거나 `monkeypatch` 로 갈아끼우는 정리가 필요하다
- **`importlib.reload`**: 의도치 않은 reload 가 일어나면 싱글톤이 깨질 수 있다 — 일반적으로 잘 안 일어나지만 알아두면 좋다

## 정리

다른 언어에서 "싱글톤 패턴" 이라고 부르는 걸, 파이썬은 모듈 시스템이 이미 무료로 제공하고 있다. 클래스 안에 `__new__` 트릭이나 메타클래스를 욱여넣는 건 **자바 패턴을 파이썬으로 직역한 안티패턴**에 가깝다.

기억할 한 줄:

> 파이썬에서 싱글톤은 클래스의 책임이 아니라 모듈의 책임이다.

만약 정말 클래스 안에 책임을 넣어야 한다면 `get_instance` 클래스 메서드 정도가 무난하다. 메타클래스나 `__new__` 트릭은 라이브러리 만들 때나 쓸 만한 도구이고, 일반 앱 코드에서는 과하다.
