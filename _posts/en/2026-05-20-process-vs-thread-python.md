---
title: "Python Threads Aren't Java Threads: How the GIL Rewrites Concurrency"
date: 2026-05-20
lang: en
tags: [python, concurrency, threading, multiprocessing, gil]
description: "Processes and threads are the same OS concept everywhere — but CPython's GIL rewrites the rulebook in Python. Why you can't parallelize CPU-bound work with threads, and what to reach for instead."
---

**If you came from Java or C++, your instinct is to reach for threads.** They're cheap, share memory, and N cores buys you an N× speedup. That instinct breaks in Python. CPython has a GIL (Global Interpreter Lock), which means **only one thread can execute Python bytecode at a time**. Throwing `threading` at a CPU-bound workload won't make it faster.

This post covers two things:

1. **Process vs Thread** — the OS-level definitions that hold everywhere
2. **What's different in Python** — the GIL forces a different toolset

## The general concept: process vs thread

Before language specifics, the OS view that's true regardless of language.

| Aspect | Process | Thread |
|---|---|---|
| Memory | Isolated (separate virtual address space) | Shared (within one process) |
| Creation cost | Heavy (fork/spawn, page tables) | Light |
| Context switch | Heavy (TLB flush etc.) | Light |
| Communication | Needs IPC (pipes, queues, shared mem) | Just share variables |
| Isolation | Crash in one doesn't affect another | One thread crash → whole process dies |
| Synchronization | Mostly unnecessary | Mutexes / locks required |

In short: **processes give you isolation, threads give you efficiency.** Both are scheduled by the OS onto cores, so on a multi-core machine **both run truly in parallel** — in most languages.

## In Java / C++ / Go: threads = real parallelism

Launch 4 Java threads on a 4-core machine and the OS will pin each to a core and run them simultaneously. For CPU-bound work that's roughly a 4× speedup.

```java
// Java — uses all N cores
IntStream.range(0, 4).parallel()
    .forEach(i -> heavyCompute());
```

Go's goroutines (M:N model — fewer OS threads underneath, but still real OS threads) end up spread across cores in parallel. C++'s `std::thread` is the same. Thread = OS thread = real parallelism.

**That's the default in most languages.**

## So why use processes in those languages at all?

If threads give you CPU parallelism for free, why ever pick a process? The answer always collapses to one word: **isolation.** There's something you can't put in the same address space, with the same permissions, sharing the same fate.

Concretely, it shows up as one of three boundaries.

| Boundary | What you're isolating | Examples |
|---|---|---|
| **Trust boundary** | Untrusted/user code, permission separation | Chrome's site-per-process, AWS Lambda tenant isolation, OpenSSH privsep |
| **Failure boundary** | Crash / leak propagation | Postgres process-per-connection, Gunicorn `--max-requests`, unstable native libraries |
| **Lifecycle boundary** | Independent deploy / restart / scaling | Microservices, VS Code extension host, LSP language servers |

Threads share an address space, a UID, and a process fate, so if any of those three boundaries matter you reach for a process. If none of them apply, **threads are the right answer** — parallel execution of the same code, shared data you can manage with locks, using N CPU cores: all the thread's job.

In other words, in general-purpose languages the process-vs-thread decision is **"how isolated does this need to be?" — not "how fast?"** CPU parallelism isn't a variable in the choice. Python adds one extra item to that list: the GIL.

## In Python: only one thread runs Python bytecode at a time

CPython (the implementation you're almost certainly using) has the **GIL**, an interpreter-wide lock. At any moment, **only one thread can execute Python bytecode.**

Easiest to just see it.

```python
import threading
import time

def heavy():
    # CPU-bound: pure-Python loop
    total = 0
    for i in range(100_000_000):
        total += i

# Single-threaded
t0 = time.perf_counter()
heavy(); heavy()
print(f"sequential: {time.perf_counter() - t0:.2f}s")

# Two threads
t0 = time.perf_counter()
threads = [threading.Thread(target=heavy) for _ in range(2)]
for t in threads: t.start()
for t in threads: t.join()
print(f"threaded:   {time.perf_counter() - t0:.2f}s")
```

Measured on Python 3.14, Apple Silicon (averaged over 3 runs):

```
sequential: 6.18s
threaded:   6.20s   ← slightly slower (lock contention + context switches)
```

Two threads don't speed it up — they make it marginally worse. That's the GIL.

### Why does the GIL exist?

The interesting question isn't "why is this annoying lock here" but "why has it survived 30 years?"

CPython manages memory via **reference counting**. Every object has a refcount integer that goes +1 when referenced and −1 when released; it's freed when it hits zero. If multiple threads update refcounts freely, you race and corrupt memory. Per-object locks cost more than they save, so CPython went with **one big interpreter-wide lock** — the GIL.

It's the canonical example of a "simplicity vs. performance" tradeoff. CPython traded multi-threaded CPU parallelism for single-thread speed and dead-simple C extension authoring.

## So what do you actually use in Python?

The split that matters is **CPU-bound vs I/O-bound**.

### I/O-bound: threads are fine

Network and disk syscalls **release the GIL** while they wait. Another Python thread can grab the GIL and work during that time. So the GIL is not the bottleneck while you're waiting on I/O.

```python
import threading, requests, time

URLS = ["https://example.com"] * 10

def fetch(url):
    requests.get(url, timeout=5)

# Sequential
t0 = time.perf_counter()
for u in URLS: fetch(u)
print(f"sequential: {time.perf_counter() - t0:.2f}s")

# 10 threads
t0 = time.perf_counter()
threads = [threading.Thread(target=fetch, args=(u,)) for u in URLS]
for t in threads: t.start()
for t in threads: t.join()
print(f"threaded:   {time.perf_counter() - t0:.2f}s")  # close to 10× faster
```

`asyncio` works for the same reason and is lighter — **one OS thread, cooperative yielding**.

### CPU-bound: use processes

To parallelize pure-Python compute you need **multiple interpreters = multiple processes**. Each process has its own GIL, so they run truly in parallel.

```python
from concurrent.futures import ProcessPoolExecutor
import time

def heavy(n):
    total = 0
    for i in range(n):
        total += i
    return total

if __name__ == "__main__":
    t0 = time.perf_counter()
    with ProcessPoolExecutor(max_workers=2) as ex:
        list(ex.map(heavy, [100_000_000, 100_000_000]))
    print(f"multiproc: {time.perf_counter() - t0:.2f}s")  # ~2× faster (3.34s here)
```

The API mirrors `ThreadPoolExecutor` almost exactly. The only difference is whether the pool is processes or threads.

### C extensions like NumPy / PyTorch: threads work too

This is the part that confuses people. A call like `np.dot(A, B)` **drops the GIL while running C code**. Other Python threads in the same process can use the CPU during that window.

The rule: **Python bytecode = GIL held; native C code = GIL released** (when the extension is well-behaved). So numeric workloads built on NumPy / SciPy / PyTorch parallelize well with threads — assuming those libraries cooperate, which the mainstream ones do.

## A quick selection guide

| Workload | Tool | Why |
|---|---|---|
| HTTP / DB / file I/O, many calls | `threading` or `asyncio` | GIL released during I/O |
| Pure-Python CPU work (parsing, algorithms) | `multiprocessing` / `ProcessPoolExecutor` | Separate interpreters = separate GILs |
| NumPy / PyTorch numerics | `threading` is fine | C code releases the GIL |
| Many tiny tasks | `asyncio` | Process startup is expensive |
| You need isolation (one crash ≠ everything dies) | `multiprocessing` | Process boundary |

## Costs of using processes

`multiprocessing` isn't free. Things to watch.

### 1. Resources must be built inside each worker, not in main

The natural pattern from threads — build a resource once in main and let workers share it — falls apart with processes. Processes **don't share memory**, so a child process can't simply receive the parent's object.

A DB connection is the classic case.

```python
# Worked in a thread pool — breaks in a process pool
conn = psycopg2.connect(DSN)

def fetch_user(user_id):
    with conn.cursor() as cur:
        cur.execute("SELECT ... WHERE id = %s", (user_id,))
        return cur.fetchone()

with ProcessPoolExecutor() as ex:
    list(ex.map(fetch_user, ids))     # ❌
```

With threads, all workers saw the same `conn` because they shared memory. With processes the child has no way to receive the parent's `conn` object — and even if it did, sharing a socket FD across `fork` corrupts the protocol.

The fix is to **let each worker build its own**, once at boot via `initializer`:

```python
def init_worker():
    global conn
    conn = psycopg2.connect(DSN)

def fetch_user(user_id):
    with conn.cursor() as cur:
        ...

with ProcessPoolExecutor(initializer=init_worker) as ex:
    list(ex.map(fetch_user, ids))     # ✅
```

The same pattern applies to **heavy objects**. You might want to load an embedding model once in main and have workers share it — but memory isolation makes that impossible.

```python
def init_worker():
    global model
    model = SentenceTransformer("all-MiniLM-L6-v2")

def embed(text):
    return model.encode(text)

with ProcessPoolExecutor(initializer=init_worker) as ex:
    list(ex.map(embed, texts))   # ✅ loaded once per worker at boot
```

Different resources, same prescription: **each worker builds its own.**

| Resource | Why each worker must build its own |
|---|---|
| DB connections (psycopg2, etc.) | Child can't receive the parent's connection object; sockets corrupt across fork |
| `requests.Session`, redis client | Internal OS handles — same reason |
| Open files / sockets | fd-sharing problems |
| ML models, large embedding tables | Memory is separate anyway, so amortize the load cost to once per worker |
| Large lookup dicts / caches | Same reason |

If you genuinely need shared memory, you need a separate mechanism: `multiprocessing.shared_memory`, `Manager`, or an external store (Redis, etc.).

### 2. Startup overhead is real

Spawning a process costs milliseconds. Throw thousands of tiny tasks at a pool and the IPC overhead will dwarf the work itself. Size your pool to roughly **the number of CPU cores.**

## A no-GIL Python is coming — slowly

PEP 703 (the free-threaded build) shipped experimentally in Python 3.13 (2024) and is moving to a supported-but-opt-in state in 3.14. With the GIL off, threads parallelize for real, Java-style.

It's **not yet a sensible production default**, though:

- Single-thread perf is slightly worse (atomic refcount overhead)
- C extensions need to be re-audited for thread safety — that ecosystem migration is in progress
- It's a separate build (`python3.13t`, etc.)

On a 5–10 year horizon this changes the game. Until then the rules above (**CPU = processes, I/O = threads / async**) still hold.

## Takeaways

> In other languages threads give you concurrency and parallelism in one package. In Python (CPython) threads give you **concurrency only**. If you need CPU parallelism, you go to processes.

Checklist:

- The OS-level process / thread distinction (shared vs isolated memory, light vs heavy) is the same everywhere
- CPython's GIL means **only one Python thread runs bytecode at a time**
- The GIL releases during I/O syscalls and inside cooperative C extensions — threads help there
- For CPU-bound pure Python, use `multiprocessing` / `ProcessPoolExecutor`
- `multiprocessing` costs: resources must be built inside each worker, startup overhead, shared memory needs separate plumbing
- PEP 703 (no-GIL) is coming but isn't a production default yet

One-liner for the Java veteran on your team: "The `threading` module here is for concurrency, not parallelism. If you want N cores, go to `multiprocessing`."
