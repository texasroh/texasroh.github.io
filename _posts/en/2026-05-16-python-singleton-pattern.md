---
title: "Singletons in Python: Skip the Class Tricks, Use a Module"
date: 2026-05-16
lang: en
tags: [python, design-pattern, singleton]
description: "Java/C++ style singleton patterns feel awkward when ported straight to Python. The right move is to use the singleton the module system already gives you for free."
---

I was using a singleton to load a config object once and reuse it everywhere, when a coworker asked: "Why aren't you doing the `__new__` trick on the class? Why a module-level global?" Good question — worth writing down.

The short answer: **if you need a singleton in Python, don't reach for class tricks — use a module-level variable plus a factory function.** Here's why.

## A module is already a singleton

Python caches every `import`ed module in a dictionary called `sys.modules`. No matter how many times or from where you import the same module, you get back **the same module object**.

```python
# config.py
_config = None
counter = 0
```

```python
# a.py
from myapp import config
config.counter += 1   # 1

# b.py (different file)
from myapp import config
print(config.counter)  # 1 — sees the mutation from a.py
```

Simplified, `import` works like this:

```python
def import_module(name):
    if name in sys.modules:
        return sys.modules[name]      # cache hit → same object
    module = load_and_execute(name)   # cache miss → load fresh
    sys.modules[name] = module
    return module
```

In other words, a global inside a module is **automatically a per-process single object**. Django's `from django.conf import settings` and `logging.getLogger()` returning the same logger both ride on this exact mechanism.

## The simplest form: module global + factory function

For something like a config object — non-trivial to build, but once is enough — the pattern I keep reaching for is:

```python
import threading
from typing import Optional

_config: Optional["Config"] = None
_config_lock = threading.Lock()


def get_config() -> "Config":
    """Double-checked locking — so concurrent requests during a cold
    start don't each create their own instance."""
    global _config
    if _config is None:
        with _config_lock:
            if _config is None:
                _config = Config()
    return _config
```

What's nice about this:

- `Config` itself stays a **plain class**. The "only one of these" policy lives outside the class, in the factory function
- `_config` is a module global, so it's automatically a singleton
- **Double-checked locking** makes it both thread-safe and fast — the lock is taken at most once, after that callers return immediately without contention

This is the idiomatic Python form.

## Why not class-level tricks?

Coming from Java or C++, the instinct is to push the singleton responsibility into the class itself. You *can* do that in Python — four ways, in fact. Each one is awkward in its own way.

### 1. Override `__new__`

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

**The trap**: even when `__new__` returns the same object, **`__init__` still runs on every call**. Call `Config()` twice and state gets initialized twice, silently clobbering itself. This is a common bug.

The workaround is a guard:

```python
def __init__(self):
    if hasattr(self, "_initialized"):
        return
    self._initialized = True
    ...
```

Ugly.

### 2. Metaclass

Intercept `__call__` so the class call itself is gated.

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
        self.settings = load_from_file(...)   # really only runs once
```

**Pros**: `__init__` runs exactly once. Reusable across multiple singleton classes.

**Cons**:
- Metaclasses are one of the hardest concepts in Python. A teammate who hasn't seen one before will be lost
- Conflicts with other metaclasses (Django's `ModelBase`, ABC's `ABCMeta`) are painful
- The "this class is a singleton" fact is hidden behind a single `metaclass=...` line, easy to miss when scanning code

### 3. Decorator

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

**Pros**: `@singleton` makes intent explicit at a glance.

**Cons**: the decorator **turns the class into a function**. `isinstance(x, Config)` breaks, you can't subclass it, you can't call classmethods directly. It fights the type system hard enough that nobody actually ships this in production.

### 4. `get_instance` classmethod

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

**Pros**: plain class + explicit factory. The least awful of the class-level tricks.

**Cons**: it doesn't stop someone from calling `Config()` directly. If anyone slips up, a fresh instance escapes. Blocking that requires adding a guard to `__init__` anyway.

## Comparison

| Approach | Learning curve | `__init__` runs once? | Blocks direct instantiation | Recommended |
|---|---|---|---|---|
| `__new__` | Low | ❌ (needs guard) | ✅ | ⚠️ Many footguns |
| Metaclass | High | ✅ | ✅ | Libraries only |
| Decorator | Low | ✅ | ✅ | ❌ Breaks types |
| `get_instance` | Very low | ✅ | ❌ (by convention) | ✅ |
| **Module global + factory** | **Very low** | **✅** | **✅** | **✅✅** |

## The real reasons the module approach wins

Past the table, the underlying reasons:

### 1. "Singleton" isn't domain logic

Using exactly one instance is a property of *how this app uses the class*, not *what the class is*. Keeping that responsibility outside the class is cleaner — you preserve the freedom to spin up a fresh instance in a different context for isolation.

### 2. It's explicit (Explicit > Implicit)

The name `get_config()` says exactly what it does: hand back a shared resource. The `__new__` trick lies to the caller — `Config()` *looks* like construction but isn't. Anyone reading the code has to pause and figure that out.

### 3. Easier to test

Unit tests can instantiate `Config()` directly in isolation. The class stays plain, so mock injection is trivial. With the `__new__` approach, every test has to reset `_instance = None`, and because the class refuses to produce new instances, mocking gets fiddly.

### 4. No `__init__` footgun

The classic mistake with `__new__`: `def __init__(self): self.x = []` runs on every call and silently wipes state. With the module-global + factory pattern, the `_config is None` check gates *instantiation itself*, so the failure mode literally cannot occur.

### 5. It composes with the module system

You're stacking on top of a mechanism that's *already* a singleton — no extra magic, no risk of fighting some other framework that also wants to intercept class construction.

## Caveats

This pattern isn't a cure-all.

- **Multi-process environments**: with multiple Gunicorn workers or Celery workers, each process has its own instance. If you need true global sharing across workers, you need an external store like Redis or a database
- **Test isolation**: module state can leak across tests. Reset `_config = None` in setup, or replace it with `monkeypatch`, to keep tests independent
- **`importlib.reload`**: an unintended reload will break the singleton — rare in practice, but worth knowing

## Wrap-up

What other languages call "the singleton pattern," Python's module system already hands you for free. Bolting `__new__` tricks or metaclasses onto a class is closer to **a Java pattern transliterated into Python than an idiom that belongs here**.

The one-liner worth remembering:

> In Python, singleton-ness is the module's responsibility, not the class's.

If you genuinely have to put the responsibility on the class, a `get_instance` classmethod is the least objectionable choice. Metaclasses and `__new__` tricks are tools for library authors — overkill in normal application code.
