---
title: "LangGraph 2편 — State 설계: 스키마와 머지 규칙"
date: 2026-05-22
lang: ko
tags: [langgraph, langchain, llm, python]
description: "LangGraph State 설계에서 정해야 할 건 두 가지 — 스키마(TypedDict vs Pydantic) 와 같은 키를 동시에 채울 때 합치는 규칙(Reducer). 각 결정을 어디서 어떻게 잡는지 정리한다. 기본은 TypedDict + reducer 없음."
---

**LangGraph State 설계엔 결정해야 할 게 두 가지 있다.** 하나는 *스키마(TypedDict vs Pydantic)*, 다른 하나는 *머지 규칙(Reducer)*. 기본값은 **TypedDict + reducer 없음**. 이 글에선 각 결정을 어떻게 잡으면 되는지 정리한다.

> **LangGraph 시리즈**
> 1. [첫 그래프 — LCEL로 안 풀리는 것만 그래프로](/ko/blog/langgraph-first-graph/)
> 2. **State 설계 — 스키마와 머지 규칙** ← 현재 글
> 2.5. [MessagesState는 특별한 state가 아니다](/ko/blog/langgraph-messages-state/)
> 3. [Send — edge로 못 그리는 동적 fan-out](/ko/blog/langgraph-send/)
> 4. [인터럽트 — 그래프를 멈추는 게 아니다](/ko/blog/langgraph-human-in-the-loop/)
> 5. [체크포인트는 멈출 때만 찍히는 게 아니다](/ko/blog/langgraph-checkpointer/)
> 6. [checkpointer는 스레드를 넘지 못한다](/ko/blog/langgraph-long-term-memory/)
> 7. [create_react_agent는 마법이 아니다](/ko/blog/langgraph-react-agent/)
> 8. [멀티 에이전트는 에이전트끼리 대화하지 않는다](/ko/blog/langgraph-multi-agent/)
> 8.5. [subgraph는 state를 공유할 수도, 격리할 수도 있다](/ko/blog/langgraph-subgraph-state/)

> 버전: `langgraph >= 0.2, < 0.3` 기준. Pydantic은 v2.

## State는 그래프가 공유하는 메모지

LangGraph 그래프는 노드 여러 개가 도는 구조다. 노드들끼리 정보를 어떻게 주고받을까? LCEL 체인이라면 "앞 노드 출력 → 뒷 노드 입력" 으로 흘려보낸다. 단순하다.

LangGraph는 가운데에 **공유 메모지(State)** 를 하나 두고, 모든 노드가 그 메모지를 같이 보는 구조다.

```python
class State(TypedDict):
    question: str         # 사용자 질문
    route: str | None     # 어디로 보낼지
    answer: str | None    # 최종 답변
```

각 노드는 메모지 전체를 새로 쓰지 않고, **자기가 바꿀 칸만** 돌려준다.

```python
def classify(state: State) -> dict:
    return {"route": "faq"}     # 바꿀 키만
```

나머지 칸은 LangGraph가 알아서 **머지**해준다. 이 머지 규칙이 곧 reducer다. 기본 reducer는 *덮어쓰기* — 같은 step 안에서 두 노드가 같은 키를 동시에 건드리면 충돌이 나서 `InvalidUpdateError` 가 뜬다.

## 결정이 두 갈래로 갈린다

이 메모지를 설계하려면 두 가지를 정해야 한다.

1. **메모지 양식(스키마)을 뭘로 그릴까** — **TypedDict vs Pydantic**
2. **두 노드가 동시에 같은 칸을 채우면 어떻게 합칠까** — **기본(덮어쓰기) vs Reducer**

Pydantic state 에 reducer 를 박아도 되고, TypedDict state 에 reducer 를 안 박아도 된다. 두 결정은 자유롭게 섞어 쓴다.

## 결정 1: 스키마 — TypedDict가 기본, Pydantic은 사용자 입력 자리에서

### TypedDict — 대부분 이걸로 끝

```python
from typing import TypedDict, Literal

class State(TypedDict):
    question: str
    route: Literal["faq", "deep"] | None
    answer: str | None

graph = StateGraph(State)
```

- 런타임 검증이 없다. 그냥 dict.
- 노드가 엉뚱한 키를 넣어도 런타임에선 그대로 통과한다. 타입 체커(mypy / pyright) 가 잡아주는 게 전부.
- 가볍다. 그래프 안쪽은 어차피 내가 짠 노드들이 도는 자리라, 이거면 대부분 충분하다.

### Pydantic — 사용자 입력이 바로 들어올 때

```python
from pydantic import BaseModel, Field
from typing import Literal

class State(BaseModel):
    question: str = Field(min_length=1)
    route: Literal["faq", "deep"] | None = None
    answer: str | None = None

graph = StateGraph(State)
```

LangGraph 0.2.x부터 Pydantic v2 모델을 state schema로 받는다. 노드는 여전히 partial dict를 돌려주고, LangGraph가 그걸 모델에 머지해준다.

Pydantic으로 가야 할 때:

- **사용자 입력이 HTTP body 같은 데서 바로 들어올 때.** 빈 문자열이나 엉뚱한 enum 값을 노드 진입 *전에* 걸러준다.
- **State에 도메인 객체를 담고 싶을 때.** dict 속의 dict 보다 `Finding(severity="high", ...)` 같은 타입 있는 객체가 LangSmith 트레이스에서 훨씬 잘 보인다.
- **공유 state에 지켜야 할 invariant가 있을 때.** `0 <= confidence <= 1` 같은 규칙을 schema 한 곳에 박아두면, 위반은 노드 진입 전에 걸린다.

반대로 굳이 안 써도 될 때:

- 내 코드에서만 그래프를 호출하고, 검증도 거기서 이미 끝났을 때. 같은 일을 또 시키는 건 낭비다.
- state 가 4\~5개 키 정도로 단순할 때. Pydantic 으로 감싸면 `Field` / `default_factory` 같은 부가 코드만 늘어난다. TypedDict 로 키와 타입만 죽 적는 게 한눈에 들어온다.

### 비교표

| | TypedDict | Pydantic v2 |
|---|---|---|
| 런타임 검증 | ❌ | ✅ |
| 진입 입력 검증에 적합 | ❌ | ✅ |
| 도메인 객체 표현 | dict | 모델 |
| 성능 오버헤드 | 거의 0 | 머지마다 validation |
| 디폴트 값 | 노드가 직접 채움 | `Field(default_factory=...)` |

기억할 한 줄: **TypedDict로 시작하고, 사용자 입력이 바로 들어오거나 강한 invariant가 필요한 자리에서만 Pydantic으로 감싸라.**

## 결정 2: 머지 규칙(Reducer) — 합류가 생기는 순간부터 필수

같은 칸을 **여러 노드가 같은 step에 채울 여지**가 조금이라도 있으면 reducer가 있어야 한다.

가장 흔하게 마주치는 자리가 **메시지 리스트** 다. LLM 노드가 매번 메시지를 쌓아 올리는 패턴이라 reducer 가 어떤 일을 해주는지 비교하기 좋다. 여기선 그 메시지 리스트 예제로 reducer 가 *왜 필요한지 → 어떻게 다는지 → 노드가 어떻게 쓰는지* 순서로 따라가본다.

### 1. Reducer 없이 — 노드가 직접 합친다

reducer 없는 상태에서 노드가 어떤 모양이어야 하는지부터 보자.

```python
from typing import TypedDict
from langchain_core.messages import BaseMessage

class State(TypedDict):
    messages: list[BaseMessage]   # reducer 안 달림 — 기본 덮어쓰기

def call_llm(state: State) -> dict:
    new = llm.invoke(state["messages"])
    return {"messages": state["messages"] + [new]}   # 손머지
```

노드가 매번 `state["messages"] + [new]` 로 직접 이어붙여서 돌려준다. 게다가 두 노드가 *같은 step* 에 messages 를 건드리는 순간 **한쪽 결과가 통째로 날아간다.** LangGraph 의 기본 머지가 "덮어쓰기" 라서, 두 partial 이 같이 들어오면 한쪽이 다른 쪽을 지운다.

### 2. Reducer 달면 노드는 추가분만 돌려준다

reducer 가 달려 있으면 위 노드가 이렇게 바뀐다.

```python
def call_llm(state: State) -> dict:
    new = llm.invoke(state["messages"])
    return {"messages": [new]}                       # 추가분만
```

`state["messages"] + [new]` 손머지가 사라진다. LangGraph 가 양쪽 partial 을 다 받아서 정해진 규칙으로 합쳐준다. 두 노드가 같은 step 에 messages 를 건드려도 어느 한쪽이 묻히지 않는다.

이제 질문은 하나 — **"그 규칙을 어디에 어떻게 알려주느냐"**. 답은 schema 안에 `Annotated` 로 박는다.

### 3. 어디에 달지: `Annotated` 안에 박는다

`typing.Annotated` 는 *"이 타입 옆에 메타데이터 한 줌 달아두는 포스트잇"* 정도로 보면 된다. 형태:

```python
Annotated[원래_타입, 메타데이터]
```

런타임에선 그냥 `원래_타입` 으로 동작한다. LangGraph 는 거기에 한 단계 더 — 그래프 컴파일 시 schema 를 훑으면서 두 번째 자리에 달린 함수를 **reducer 로 등록** 한다. 즉 `Annotated[list[BaseMessage], add_messages]` 는 "타입은 `list[BaseMessage]` 인데, partial 두 개가 만나면 `add_messages` 로 합쳐달라" 는 표시.

#### TypedDict 에 달기

```python
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
```

`add_messages` 는 LangGraph 가 기본으로 들고 있는 reducer 다. 새 메시지면 뒤에 **append**, 같은 `id` 메시지면 **덮어쓰기**.

#### Pydantic 에 달기

`BaseModel` 안에서도 `Annotated` 문법이 그대로 동작한다.

```python
from pydantic import BaseModel, Field
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class State(BaseModel):
    messages: Annotated[list[BaseMessage], add_messages] = Field(default_factory=list)
```

스키마를 Pydantic 으로 바꿔도 reducer 다는 방식은 안 바뀐다. `Annotated` 한 줄 그대로. mutable default 를 `Field(default_factory=list)` 로 잡아준다는 게 유일한 차이다.

### 4. 다른 reducer 옵션

`add_messages` 말고도 reducer 는 자유롭게 만들어 쓸 수 있다. 시그니처는 항상 `(existing_value, new_value) -> merged_value`. 노드가 돌려준 값이 두 번째 인자로 들어오고, 그 결과가 다음 step 의 `existing` 이 된다.

#### `operator.add` — 가장 단순한 reducer

```python
from operator import add
from typing import TypedDict, Annotated

class State(TypedDict):
    notes: Annotated[list[str], add]
```

`add` 는 그냥 `+`. 리스트면 이어붙이고, 숫자면 더한다. ID 기준 머지 같은 게 필요 없으면 이걸로 끝.

#### 커스텀 reducer — 도메인 머지 규칙

여러 LLM 노드가 같은 환자에 대해 finding 을 뽑아내고 ID 기준으로 합쳐야 하는 경우를 가정해보자. 임상 LLM 워크플로에선 꽤 자주 나오는 모양이다.

```python
from typing import TypedDict, Annotated, Literal

class Finding(TypedDict):
    id: str
    severity: Literal["low", "med", "high"]
    note: str

def merge_findings(existing: list[Finding], new: list[Finding]) -> list[Finding]:
    by_id = {f["id"]: f for f in existing}
    for f in new:                      # 같은 id면 최신이 이긴다
        by_id[f["id"]] = f
    return list(by_id.values())

class State(TypedDict):
    findings: Annotated[list[Finding], merge_findings]
```

머지 로직을 한 군데에 모아두면 모든 노드가 그냥 partial 만 돌려주면 되고, 코드가 깔끔해진다.

## 마무리

State 설계엔 두 결정이 들어간다 — 스키마, 그리고 머지 규칙. **스키마는 *각 칸의 모양* 을, reducer는 *같은 칸이 동시에 채워졌을 때 어떻게 합칠지* 를 결정한다.** 각 결정의 디폴트와 예외 자리만 손에 쥐고 있으면 state 설계가 단순해진다.

다음 글은 제어 흐름 — [`Send`로 그리는 동적 fan-out](/ko/blog/langgraph-send/).
