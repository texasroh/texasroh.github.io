---
title: "파이썬의 스레드는 자바의 스레드가 아니다 — GIL이 바꾼 동시성의 의미"
date: 2026-05-20
lang: ko
tags: [python, concurrency, threading, multiprocessing, gil]
description: "프로세스와 스레드는 OS 수업 기준으론 어디서나 같은 개념이지만, CPython의 GIL이 파이썬에서만 게임의 룰을 바꿔놓았다. CPU-bound 병렬화에 스레드를 쓰면 안 되는 이유와 그래서 무엇을 써야 하는지."
---

**자바·C++ 출신은 본능적으로 스레드부터 꺼낸다.** 가볍고, 메모리 공유되고, N코어 쓰면 N배 빨라지니까. 그 직관은 파이썬에서 무너진다. CPython에는 GIL(Global Interpreter Lock)이 있어서 **한 번에 하나의 스레드만 파이썬 바이트코드를 실행**한다. CPU-bound 작업에 `threading` 을 써도 빨라지지 않는다.

이 글은 두 가지를 정리한다.

1. **프로세스 vs 스레드** — OS 수업 수준의 공통 개념
2. **파이썬에서 무엇이 다른가** — GIL 때문에 도구 선택 규칙이 바뀐다

## 일반 개념: 프로세스 vs 스레드

먼저 언어에 관계없이 OS가 정의하는 둘의 차이부터.

| 항목 | 프로세스 | 스레드 |
|---|---|---|
| 메모리 공간 | 독립 (각자 가상 주소 공간) | 공유 (같은 프로세스 안) |
| 생성 비용 | 무거움 (fork/spawn, page table 등) | 가벼움 |
| 컨텍스트 스위치 | 무거움 (TLB flush 등) | 가벼움 |
| 통신 | IPC 필요 (파이프, 큐, 공유 메모리) | 그냥 변수 공유 |
| 격리성 | 한 쪽이 죽어도 다른 쪽 영향 X | 한 스레드 크래시 → 프로세스 전체 다운 |
| 동기화 | 거의 불필요 | mutex / lock 필수 |

요약하면 **프로세스는 격리성, 스레드는 효율성**이 강점이다. 둘 다 OS 스케줄러가 코어에 배분하므로 코어가 여러 개면 **둘 다 진짜 병렬**로 돈다 — 적어도 일반 언어에서는.

## 자바·C++·Go에서 스레드 = 진짜 병렬

자바에서 4코어 머신에 스레드 4개를 띄우면, OS가 4개 코어에 하나씩 박아넣고 동시에 돌린다. CPU-bound 작업이면 거의 4배 가까이 빨라진다.

```java
// Java — N코어 다 쓴다
IntStream.range(0, 4).parallel()
    .forEach(i -> heavyCompute());
```

Go의 goroutine도 (M:N 모델이라 OS 스레드는 더 적게 쓰지만) 결국 여러 OS 스레드에 분산되어 진짜 병렬로 돈다.

C++의 `std::thread` 도 동일. 스레드 = OS 스레드 = 진짜 병렬.

**여기까지가 다른 언어들의 디폴트다.**

## 그런데 일반 언어에서도 프로세스를 쓰는 이유

스레드가 CPU 병렬성을 잘 주는데 왜 프로세스를 고를 일이 생기나? 답은 한 가지로 모인다. **격리.** 같은 주소공간 / 같은 권한 / 같은 운명에 두면 안 되는 무언가가 있을 때.

구체적으론 세 가지 경계 중 하나가 들어오는 순간이다.

| 경계 | 무엇을 격리? | 대표 사례 |
|---|---|---|
| **신뢰 경계** | 외부/사용자 코드, 권한 분리 | Chrome 사이트별 프로세스, AWS Lambda 테넌트 격리, OpenSSH privsep |
| **장애 경계** | 크래시·누수의 전파 차단 | Postgres 연결별 프로세스, Gunicorn `--max-requests`, 불안정한 네이티브 라이브러리 격리 |
| **lifecycle 경계** | 독립 배포·재시작·스케일링 | 마이크로서비스, VS Code extension host, LSP 언어 서버 |

스레드끼리는 같은 주소공간 · 같은 UID · 같은 프로세스 운명을 공유하므로, 이 셋 중 하나라도 필요하면 자연스레 프로세스로 간다. 반대로 이 셋 중 어느 것도 안 걸리면 **스레드가 정답**이다 — 같은 코드의 병렬 실행, lock 으로 다스릴 수 있는 공유 데이터, CPU N 코어 활용은 모두 스레드의 영역.

즉 일반 언어에서 프로세스 vs 스레드의 결정 축은 **"얼마나 빠른가" 가 아니라 "얼마나 분리되어야 하는가"** 다. CPU 병렬성 자체는 변수에 안 들어간다. 그런데 파이썬은 여기에 한 항목이 더 붙는다 — GIL.

## 파이썬: 한 번에 한 스레드만 바이트코드를 실행한다

CPython(가장 널리 쓰이는 파이썬 구현체)에는 **GIL** 이라는 인터프리터 단위 락이 있다. 어떤 시점에도 **파이썬 바이트코드는 단 하나의 스레드만 실행**할 수 있다.

직접 보면 가장 빠르다.

```python
import threading
import time

def heavy():
    # CPU-bound: 그냥 큰 수 더하기
    total = 0
    for i in range(100_000_000):
        total += i

# 싱글 스레드
t0 = time.perf_counter()
heavy(); heavy()
print(f"sequential: {time.perf_counter() - t0:.2f}s")

# 두 스레드로
t0 = time.perf_counter()
threads = [threading.Thread(target=heavy) for _ in range(2)]
for t in threads: t.start()
for t in threads: t.join()
print(f"threaded:   {time.perf_counter() - t0:.2f}s")
```

Python 3.14, M-시리즈 맥에서 측정한 결과 (3회 평균):

```
sequential: 6.18s
threaded:   6.20s   ← 더 느림 (락 경합 + 컨텍스트 스위치 비용)
```

스레드 2개를 띄워도 빨라지기는커녕 미세하게 느리다. GIL 때문이다.

### GIL은 왜 있나

질문을 뒤집어볼 만하다. "왜 그 거추장스러운 락이 30년째 남아있는가?"

CPython의 메모리 관리가 **참조 카운트(reference counting)** 기반이라서다. 객체마다 refcount 라는 정수 필드가 있고, 참조가 늘면 +1 / 줄면 −1 한다. 0이 되면 즉시 해제. 멀티스레드에서 이 카운터가 자유롭게 갱신되면 race condition으로 메모리가 깨진다. 모든 카운터에 락을 따로 거는 건 비용이 더 크고, 그래서 인터프리터 전체에 **하나의 큰 락** — GIL — 을 두는 결정을 내렸다.

이 결정은 30년 동안 "단순함과 성능의 트레이드오프" 의 살아있는 예시였다. 싱글 스레드 성능과 C 확장 모듈 작성의 단순함을 위해 멀티스레드 CPU 병렬성을 포기한 셈.

## 그래서 파이썬에선 무엇을 쓰는가

CPU-bound와 I/O-bound를 구분하는 게 핵심이다.

### I/O-bound: 스레드 OK

네트워크·디스크 같은 I/O 호출은 OS 시스템콜 동안 **GIL을 풀어준다**. 그동안 다른 파이썬 스레드가 GIL을 잡고 일할 수 있다. 즉 I/O 대기 중에는 GIL이 병목이 아니다.

```python
import threading, requests, time

URLS = ["https://example.com"] * 10

def fetch(url):
    requests.get(url, timeout=5)

# 싱글 스레드
t0 = time.perf_counter()
for u in URLS: fetch(u)
print(f"sequential: {time.perf_counter() - t0:.2f}s")

# 스레드 10개
t0 = time.perf_counter()
threads = [threading.Thread(target=fetch, args=(u,)) for u in URLS]
for t in threads: t.start()
for t in threads: t.join()
print(f"threaded:   {time.perf_counter() - t0:.2f}s")  # 10배 가까이 빨라짐
```

`asyncio` 도 같은 의미에서 I/O-bound에 적합한 선택지다. 스레드와 비교하면 **하나의 OS 스레드 안에서 협력적으로 양보**해서 더 가볍다.

### CPU-bound: 프로세스를 써라

순수 파이썬 계산을 병렬화하려면 **여러 인터프리터 = 여러 프로세스**가 필요하다. 프로세스마다 별도의 GIL을 가지므로 진짜로 동시에 돈다.

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
    print(f"multiproc: {time.perf_counter() - t0:.2f}s")  # ≈ 2배 빨라짐 (여기선 3.34s)
```

스레드 풀과 거의 같은 API다 (`ThreadPoolExecutor` ↔ `ProcessPoolExecutor`). 차이는 풀이 프로세스인지 스레드인지뿐.

### NumPy·PyTorch 같은 C 확장: 스레드도 OK

이게 가장 헷갈리는 부분이다. NumPy의 `np.dot(A, B)` 같은 호출은 **C 코드로 들어가는 동안 GIL을 풀어버린다**. 그러면 같은 프로세스의 다른 파이썬 스레드가 그 사이에 CPU를 쓸 수 있다.

즉 **"파이썬 바이트코드는 GIL 잠금, 네이티브 C 코드는 GIL 비잠금"** 이다. 그래서 NumPy/SciPy/PyTorch 위주의 수치 연산은 스레드로도 어느 정도 병렬화된다 — 그 라이브러리들이 GIL을 잘 풀어주도록 작성되어 있다는 전제 아래.

## 작업 유형별 선택 가이드

| 작업 유형 | 추천 도구 | 이유 |
|---|---|---|
| HTTP 요청, DB 호출, 파일 I/O 다수 | `threading` 또는 `asyncio` | I/O 대기 중 GIL이 풀림 |
| 순수 파이썬 CPU 계산 (파싱, 알고리즘) | `multiprocessing` / `ProcessPoolExecutor` | 별 인터프리터 = 별 GIL |
| NumPy/PyTorch 수치 연산 | `threading` 으로도 충분히 빠름 | C 코드가 GIL을 풀어줌 |
| 짧은 작업 × 매우 많이 | `asyncio` | 프로세스 생성 오버헤드가 크다 |
| 격리성이 중요 (한 쪽 크래시 ≠ 전체 다운) | `multiprocessing` | 프로세스 격리 |

## 프로세스를 쓸 때의 주의점

`multiprocessing` 이 만능 같지만 비용이 있다.

### 1. 자원은 메인이 아니라 각 워커가 만든다

스레드에서 자연스럽던 패턴 — 메인에서 자원을 하나 만들어 워커들이 같이 쓰기 — 가 프로세스에서는 깨진다. 프로세스는 **메모리가 분리** 되어 있어서 부모의 객체를 자식이 그대로 받을 수 없다.

DB 커넥션이 전형적인 사례다.

```python
# 스레드 풀에선 잘 됐는데 프로세스 풀에선 깨진다
conn = psycopg2.connect(DSN)

def fetch_user(user_id):
    with conn.cursor() as cur:
        cur.execute("SELECT ... WHERE id = %s", (user_id,))
        return cur.fetchone()

with ProcessPoolExecutor() as ex:
    list(ex.map(fetch_user, ids))     # ❌
```

스레드 풀에서는 같은 메모리라 모든 워커가 동일한 `conn` 을 그대로 봤지만, 프로세스 풀에서는 자식 프로세스가 부모의 `conn` 객체를 가져올 길이 없다 (게다가 fork 시엔 소켓 FD 공유로 프로토콜이 깨진다).

해결은 **워커 자신이 만드는 것**. `initializer` 로 워커 부팅 시 1회만:

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

같은 패턴이 **무거운 객체** 에도 적용된다. 임베딩 모델을 메인에서 한 번 로드해 워커들이 공유하길 기대하지만, 메모리 분리라 그게 불가능하다.

```python
def init_worker():
    global model
    model = SentenceTransformer("all-MiniLM-L6-v2")

def embed(text):
    return model.encode(text)

with ProcessPoolExecutor(initializer=init_worker) as ex:
    list(ex.map(embed, texts))   # ✅ 워커 부팅 시 1회만 로드
```

자원의 종류는 달라도 처방은 같다: **각 워커가 자기 것을 만든다.**

| 자원 | 워커가 자기 것을 만들어야 하는 이유 |
|---|---|
| DB 커넥션 (psycopg2 등) | 부모의 커넥션 객체를 자식이 못 받음, fork 시 소켓 충돌 |
| `requests.Session`, redis 클라이언트 | 내부에 OS 핸들 — 같은 이유 |
| 열린 파일 / 소켓 | fd 공유 문제 |
| ML 모델, 큰 임베딩 테이블 | 메모리 분리라 어차피 복사돼야 함 — 워커당 1회로 비용 분산 |
| 큰 룩업 dict / 캐시 | 같은 이유 |

진짜로 메모리까지 공유하고 싶다면 `multiprocessing.shared_memory`, `Manager`, 또는 외부 저장소(Redis 등) 같은 별도 메커니즘이 필요하다.

### 2. 시작 오버헤드가 크다

프로세스 생성은 ms 단위 비용이다. 짧은 작업 수천 개를 풀에 던지면 작업 자체보다 IPC 오버헤드가 더 클 수 있다. 풀 사이즈는 보통 **CPU 코어 수** 정도가 적정선.

## "GIL 없는 파이썬" 은 오고 있다 — 하지만 천천히

PEP 703 (no-GIL build, "free-threaded Python") 가 Python 3.13(2024)부터 실험적으로 들어왔다. 3.14에서는 옵션이지만 안정 단계로 이동 중이다. GIL을 끄면 스레드가 자바처럼 진짜로 병렬화된다.

다만 **지금 당장 production 디폴트로 바꾸기엔 이르다.**

- 싱글 스레드 성능이 약간 떨어진다 (refcount 동기화 비용 때문에)
- C 확장 모듈들이 thread-safe 하게 다시 작성되어야 한다 — 생태계 마이그레이션 진행 중
- 빌드 옵션이 따로 (`python3.13t` 등)

5~10년 시야에서는 게임이 바뀌겠지만, 그동안은 위의 룰 (**CPU = 프로세스, I/O = 스레드/async**) 이 그대로 유효하다.

## 정리: 기억할 한 줄

> 다른 언어에서 스레드는 병렬성과 동시성을 한꺼번에 주지만, 파이썬(CPython)에서 스레드는 **동시성만** 준다. CPU 병렬성이 필요하면 프로세스로 간다.

체크리스트:

- 스레드와 프로세스의 OS 수준 차이는 어디서나 동일 (메모리 공유 / 격리, 가벼움 / 무거움)
- CPython의 GIL 때문에 **파이썬 바이트코드는 한 번에 한 스레드만 실행**
- I/O 대기와 C 확장 실행 중에는 GIL이 풀린다 → 그 영역에서는 스레드도 효과적
- CPU-bound 순수 파이썬은 `multiprocessing` / `ProcessPoolExecutor`
- `multiprocessing` 의 제약: 자원은 워커 안에서 생성, 시작 비용, 공유 메모리는 별도 도구 필요
- PEP 703 (no-GIL) 은 오고 있지만 production 디폴트는 아직 아님

자바를 오래 한 동료에게 한 마디로 설명한다면 이렇다. "여기 `threading` 모듈은 동시성용 도구지, 병렬성용 도구가 아니다. 진짜 코어 N개 쓰고 싶으면 `multiprocessing` 으로 가."
