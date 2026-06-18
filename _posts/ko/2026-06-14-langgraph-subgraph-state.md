---
title: "LangGraph 8.5편 — subgraph는 state를 공유할 수도, 격리할 수도 있다"
date: 2026-06-14
lang: ko
tags: [langgraph, langchain, llm, python]
series: langgraph
seriesOrder: 8.5
description: "8편에서 agent를 노드로 꽂으면 둘이 같은 messages를 공유한다고 했다. 그런데 그 공유는 마법이 아니라 선택이다. subgraph가 바깥 그래프와 state를 주고받느냐는 단 하나 — 같은 이름의 키를 공유하느냐 — 로 갈린다. compile된 그래프를 그대로 노드로 꽂으면 공유 키를 parent의 reducer가 자동으로 합쳐주고, 함수로 감싸면 무엇을 넣고 무엇을 올릴지 직접 통제한다. 멀티 에이전트의 컨텍스트 오염도, 그걸 막는 격리도 전부 이 한 가지로 설명된다."
---

**8편에서 "agent는 노드고, 둘은 같은 `messages`를 공유한다"고 했다.** 그런데 그 공유는 LangGraph가 알아서 해주는 마법이 아니라 *선택*이다. subgraph(노드 안에 든 또 하나의 그래프)가 바깥 그래프와 state를 주고받을지는 단 하나로 갈린다 — **같은 이름의 키를 공유하느냐.** 이 한 가지가 멀티 에이전트의 컨텍스트 오염도, 그걸 막는 격리도 전부 설명한다.

> **LangGraph 시리즈**
> 1. [첫 그래프 — LCEL로 안 풀리는 것만 그래프로](/ko/blog/langgraph-first-graph/)
> 2. [State 설계 — 스키마와 머지 규칙](/ko/blog/langgraph-state-design/)
> 2.5. [MessagesState는 특별한 state가 아니다](/ko/blog/langgraph-messages-state/)
> 3. [Send — edge로 못 그리는 동적 fan-out](/ko/blog/langgraph-send/)
> 4. [인터럽트 — 그래프를 멈추는 게 아니다](/ko/blog/langgraph-human-in-the-loop/)
> 5. [체크포인트는 멈출 때만 찍히는 게 아니다](/ko/blog/langgraph-checkpointer/)
> 6. [checkpointer는 스레드를 넘지 못한다](/ko/blog/langgraph-long-term-memory/)
> 7. [create_react_agent는 마법이 아니다](/ko/blog/langgraph-react-agent/)
> 8. [멀티 에이전트는 에이전트끼리 대화하지 않는다](/ko/blog/langgraph-multi-agent/)
> 8.5. **subgraph는 state를 공유할 수도, 격리할 수도 있다** ← 현재 글

> 버전: `langgraph >= 0.2, < 0.3` 기준.

## subgraph가 바깥과 대화하는 규칙은 하나다

subgraph를 바깥 그래프의 노드로 붙이는 방법은 두 가지고, 그게 곧 공유와 격리를 가른다.

1. **compile된 subgraph를 그대로 `add_node`에 꽂는다** → 같은 이름의 키가 자동으로 공유된다.
2. **subgraph를 함수 노드로 감싼다** → 무엇을 넣고 무엇을 올릴지 직접 매핑한다 (자동 공유 없음).

핵심 규칙은 (1)에 있다: **바깥 그래프와 subgraph가 *같은 이름의 state 키*를 가지면, 그 키만 서로 공유된다.** 이름이 안 겹치는 키는 공유되지 않는다. 이게 전부다.

## 방식 (1) — 키를 공유한다

8편의 멀티 에이전트가 이 방식이었다. 바깥도 `MessagesState`, agent도 `MessagesState`라 둘 다 `messages` 키를 가지므로 자동으로 공유된다.

```python
from langgraph.graph import StateGraph, MessagesState
from langgraph.prebuilt import create_react_agent

subgraph = create_react_agent(model, tools=[...])   # 7편의 agent — state는 MessagesState

parent = StateGraph(MessagesState)  # 바깥도 messages를 가진다
parent.add_node("agent", subgraph)  # ← compile된 그래프를 노드로 직접 꽂는다
```

그래서 공유 키 `messages`는 진입·종료 두 시점에 처리된다.

- **진입 시 (parent → sub):** 바깥의 `messages` 현재값이 subgraph 입력으로 전달된다.
- **종료 시 (sub → parent):** subgraph가 돌려준 `messages`가 **parent의 reducer로 머지된다.**

특별한 양방향 채널이 있는 게 아니다. subgraph도 결국 *노드 하나*라, **노드가 부분 dict를 리턴하면 parent의 reducer가 해당 키에 합친다**는 2편 규칙이 그대로 적용될 뿐이다. '같은 이름의 키'가 조건인 것도 그래서다 — 그래야 진입 때 그 값을 물려받을 수 있고, 종료 때 돌려준 값을 parent가 같은 키에 합칠 수 있다.

여기서 한 가지 의심이 든다 — 종료 시 subgraph가 돌려주는 `messages`엔 **진입 때 받은 원본까지 들어있다.** 그걸 parent에 다시 머지하면 앞 메시지가 2배가 되는 것 아닌가? reducer가 단순 이어붙이기라면 정확히 그렇게 된다.

그 전에 `messages`의 실제 형태부터. 리스트 안 원소는 문자열이 아니라 **`id`를 가진 메시지 객체**다(2.5편). 머지 키가 되는 게 바로 이 `id`다.

```python
messages = [
    HumanMessage(id="h1", content="두통약 추천해줘"),         # 아래 표기의 m1
    AIMessage(id="a1", content="", tool_calls=[...]),         # 아래 표기의 m2
]
# add_messages는 이 .id로 머지한다 — 아래 m1·m2·m3·m4는 각각 id를 가진 이런 객체다
```

```python
# messages가 단순 list 합치기 reducer라면 (id를 안 본다)
[m1, m2]  +  [m1, m2, m3, m4]  =  [m1, m2, m1, m2, m3, m4]   # ❌ h1·a1이 두 번

# add_messages는 id(h1, a1, ...) 기준 upsert
add_messages([m1, m2], [m1, m2, m3, m4]) = [m1, m2, m3, m4]   # ✅ 같은 id는 제자리 교체
```

`add_messages`는 같은 `id`를 만나면 append가 아니라 *제자리 교체*를 하므로, 원본(`m1`, `m2`)은 갱신되고 새 메시지(`m3`, `m4`)만 쌓인다. **그리고 이게 기본 제공 `MessagesState`가 이 문제를 자동으로 막아주는 이유다.** `MessagesState`는 `messages` 키에 `add_messages`를 미리 박아둔 `TypedDict`일 뿐이고(2.5편), 그 박혀 있는 reducer가 subgraph 경계의 중복까지 알아서 처리한다. 직접 `messages: list`로 state를 짰다면 이 보호가 없어 위의 2배 중복이 그대로 일어난다.

> 이 `id`는 그래프 엔진이 아니라 **`add_messages`가 채운다.** 그냥 만든 메시지(`HumanMessage(content=...)`)의 `id`는 `None`이지만, `add_messages`가 머지할 때 빈 id마다 uuid를 박아주고(그래서 `RemoveMessage`로 id를 찍어 지울 수도 있다), 모델이 돌려준 메시지엔 보통 id가 이미 붙어 있다. 즉 id 자동 부여는 `add_messages`의 기능이지 그래프의 기능이 아니다 — `MessagesState`를 쓰면 그 reducer가 딸려와 자동으로 채워질 뿐이다.

여기서 두 가지가 중요하다.

**안쪽 전용 키는 밖으로 안 샌다.** subgraph에만 있고 바깥 스키마엔 없는 키는 subgraph 안에서만 살고 parent로 전파되지 않는다.

```python
class SubState(TypedDict):
    messages: Annotated[list, add_messages]   # parent에도 있는 키 → 리턴하면 parent에 머지
    scratch: list                             # 안쪽 전용 → 밖으로 안 샌다
```

agent 내부의 스크래치패드·중간 플래그를 바깥에 노출하지 않고 숨길 수 있다는 뜻이다.

**그리고 이렇게 공유 키를 그대로 이어받는 게 곧 8편에서 말한 "오염"이다.** agent가 루프를 돌며 쌓은 도구 호출 메시지(`lookup_drug` 호출과 그 결과)까지 공유 `messages`에 올라오고, 다음 agent가 그 채널을 통째로 이어받기 때문이다. 편하지만 agent가 늘수록 채널은 남이 부른 도구 찌꺼기로 불어난다.

## 방식 (2) — 격리한다

오염이 *공유* 때문이라면, 공유를 끊으면 된다. compile된 그래프를 그냥 꽂는 대신 **함수 노드로 감싸서**, 안쪽으로 넣을 입력과 밖으로 올릴 출력을 직접 고른다.

```python
def call_agent(state: ParentState) -> dict:
    summary = summarize(state)                                # 넣을 것만 추린다
    out = subgraph.invoke({"messages": [HumanMessage(summary)]})
    return {"answer": out["messages"][-1].content}            # 올릴 것만 반환한다

parent.add_node("agent", call_agent)   # 함수 노드로 감싼다
```

이 경우 바깥의 `messages`와 subgraph의 `messages`는 이름이 같아도 **서로 다른 채널**이다 — 함수가 둘 사이를 손으로 잇기 때문이다. subgraph는 우리가 `invoke`에 넣어준 것만 보고, 바깥의 raw 히스토리는 아예 못 본다. 즉 **필요한 것만 골라 넘기는 셈이다.** 8편에서 "공유 채널에선 요약을 더해도 raw 메시지가 남아 안 통한다"고 했는데, 격리는 채널 자체가 다르니 그 한계를 비켜간다.

격리가 **선택이 아니라 필수**인 경우도 있다 — 바깥과 subgraph의 스키마가 아예 다를 때다. 바깥은 점수·단계 플래그 중심 state인데 안쪽 agent는 `messages` 중심이라면, 공유할 키가 없으니 (1)로는 붙지 않는다. 이때는 함수 노드로 감싸 "바깥 state → subgraph 입력", "subgraph 출력 → 바깥 state"를 변환하는 수밖에 없다.

## 언제 공유하고, 언제 격리하나

| | 공유 (방식 1) | 격리 (방식 2) |
| --- | --- | --- |
| 붙이는 법 | compile된 그래프를 `add_node` | 함수 노드로 감싸기 |
| state 흐름 | 같은 이름 키 → reducer가 자동 머지 | 직접 매핑(넣을 것/올릴 것) |
| 컨텍스트 | 전체가 그대로 보인다 | 추려준 것만 보인다 |
| 코드량 | 적다 | 매핑 코드가 는다 |

**공유가 맞는 곳:** 하나의 대화 흐름을 여러 노드가 자연스럽게 이어갈 때. 단일 agent 루프, 또는 swarm에서 "전체 맥락을 일부러 다 공유"하는 경우. 코드가 적고 직관적이다.

**격리가 맞는 곳:** *경계*가 필요할 때. (a) 컨텍스트 오염을 끊어 각 agent에 깨끗한 입력을 줄 때, (b) agent별로 도메인 컨텍스트를 분리할 때, (c) 안팎 스키마가 다를 때, 그리고 (d) **민감 정보의 최소 권한** — 앞단이 본 민감 정보를 하위 agent에 통째로 흘리지 않고, 그 agent에 꼭 필요한 것만 매핑해 내려보낼 때. 8편에선 "handoff `update`에 뭘 담을지 매번 명시적으로 추려야 한다"고 했는데, 격리는 그 추리기를 **그래프 구조로 강제**하는 방법이다 — 채널을 분리해두면 필요한 것만 들어가도록 애초에 정해진다.

그리고 격리하더라도 *여러 agent가 공유해야 하는 사실*은 있다 — 그건 `messages`로 넘기지 말고 6편의 `Store`에 둔다. 정리하면 축이 둘이다: **대화 흐름은 공유/격리로, 공유 사실은 Store로.**

## 정리

subgraph가 바깥과 state를 주고받는 길은 둘뿐이다. **같은 이름의 키를 두면 subgraph가 돌려준 값을 parent의 reducer가 그 키에 합치고(공유), 함수로 감싸면 무엇을 넣고 올릴지 내가 정한다(격리).**
