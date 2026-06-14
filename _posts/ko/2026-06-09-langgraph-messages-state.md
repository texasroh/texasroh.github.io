---
title: "LangGraph 2.5편 — MessagesState는 특별한 state가 아니다"
date: 2026-06-09
lang: ko
tags: [langgraph, langchain, llm, python]
description: "2편에서 reducer를 일반론으로 배웠다. 그런데 agent 코드만 보면 갑자기 MessagesState, add_messages, last.tool_calls가 당연한 듯 나온다. messages는 새로운 타입이 아니라 2편의 reducer를 '메시지 객체 리스트'에 적용한 한 가지 패턴일 뿐이다. 메시지가 str이 아니라 객체라는 것, add_messages가 실제로 하는 일, MessagesState가 강제 키가 아니라는 것, 그리고 노드가 메시지를 반환하는 규약까지 — agent로 올라가기 전에 깔아둔다."
---

**2편에서 state의 머지 규칙으로 reducer를 다뤘다.** `add_messages`도 그때 예시로 한 번 스쳤다. 그런데 막상 agent 코드를 열면 `MessagesState`, `add_messages`, `state["messages"][-1].tool_calls` 같은 게 *당연한 듯* 등장한다. messages는 문자열 아니었나? `.tool_calls`는 어디서 나온 거지? `MessagesState`는 꼭 써야 하나?

결론부터: **`messages`는 새로운 타입도, 필수 키도 아니다.** 2편에서 배운 reducer를 *메시지 객체 리스트*라는 한 가지 데이터 모양에 적용한 패턴일 뿐이다. 이 편은 2편(reducer 일반론)과 agent류 글(3편 이후) 사이의 다리다 — 여기를 건너야 7편의 `create_react_agent`가 안 헷갈린다.

> **LangGraph 시리즈**
> 1. [첫 그래프 — LCEL로 안 풀리는 것만 그래프로](/ko/blog/langgraph-first-graph/)
> 2. [State 설계 — 스키마와 머지 규칙](/ko/blog/langgraph-state-design/)
> 2.5. **MessagesState는 특별한 state가 아니다** ← 현재 글
> 3. [Send — edge로 못 그리는 동적 fan-out](/ko/blog/langgraph-send/)
> 4. [인터럽트 — 그래프를 멈추는 게 아니다](/ko/blog/langgraph-human-in-the-loop/)
> 5. [체크포인트는 멈출 때만 찍히는 게 아니다](/ko/blog/langgraph-checkpointer/)
> 6. [checkpointer는 스레드를 넘지 못한다](/ko/blog/langgraph-long-term-memory/)
> 7. [create_react_agent는 마법이 아니다](/ko/blog/langgraph-react-agent/)
> 8. [멀티 에이전트는 에이전트끼리 대화하지 않는다](/ko/blog/langgraph-multi-agent/)
> 8.5. [subgraph는 state를 공유할 수도, 격리할 수도 있다](/ko/blog/langgraph-subgraph-state/)

> 버전: `langgraph >= 0.2, < 0.3` 기준. 메시지 클래스는 `langchain_core.messages`, `add_messages`/`MessagesState`는 `langgraph.graph.message`에 있다.

## state에 필수 키 같은 건 없다

먼저 오해부터 깨자. LangGraph state에 *반드시* 들어가야 하는 키는 **없다.** 1편·2편의 라우팅 그래프를 떠올리면 명확하다.

```python
class State(TypedDict):
    question: str
    route: str | None
    answer: str | None
#   ← messages 같은 거 한 글자도 없다. 그래도 완벽히 도는 그래프였다.
```

state는 그냥 *네가 정의하는 TypedDict*고, 그래프가 다루는 데이터가 뭐든 그걸 키로 담으면 된다. `messages`는 그중 **대화를 다룰 때 쓰는 특정 모양**일 뿐이다. 그러니 순서를 거꾸로 외우면 안 된다 — `question/route/answer`가 더 기본에 가깝고, `MessagesState`가 특수 케이스다.

## messages는 str이 아니라 객체 리스트다

여기가 첫 번째 함정이다. `messages`에 들어가는 건 문자열이 아니라 **메시지 객체**들이다.

```python
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

[
    HumanMessage(content="저 페니실린 알러지 있어요"),
    AIMessage(content="", tool_calls=[{"name": "lookup_allergy", "args": {"patient_id": "42"}, "id": "call_abc"}]),
    ToolMessage(content="페니실린 알러지 있음", tool_call_id="call_abc"),
    AIMessage(content="페니실린 계열은 피하세요."),
]
```

이 중 **`AIMessage`가 바로 LLM을 호출했을 때 돌아오는 출력**이다 — chat model의 `.invoke()`는 문자열이 아니라 `AIMessage` 객체를 반환한다. (이게 왜 중요한지는 아래 "노드가 메시지를 반환하는 규약"에서 다시 짚는다.) `HumanMessage`는 사용자 입력, `ToolMessage`는 도구 실행 결과를 담는 자리다.

각 메시지는 `content`(문자열) *말고도* 필드를 더 가진 객체다. 그래서 단순 `list[str]`이었다면 불가능한 일들이 가능해진다:

- **`AIMessage.tool_calls`** — 모델이 "이 도구를 불러줘"라고 한 결정이 여기 담긴다. agent가 도구를 쓰는 출발점이 바로 이 필드다.
- **`ToolMessage.tool_call_id`** — 이 결과가 *어느* 도구 호출에 대한 답인지 묶는 키.
- **`.type` (role)** — human / ai / tool / system 중 누가 한 말인지.

즉 7편에서 `state["messages"][-1].tool_calls`를 꺼낼 수 있었던 건, 그 마지막 항목이 문자열이 아니라 **`AIMessage` 객체**였기 때문이다. (참고로 모든 메시지 클래스는 `BaseMessage`를 상속하고, `MessagesState`는 이들을 묶은 유니온 `AnyMessage`로 타입을 단다.)

### tool_calls는 항상 있는 게 아니다

중요한 단서. `tool_calls`는 **`AIMessage`에만, 그것도 모델이 도구를 부르기로 했을 때만** 채워진다.

```python
HumanMessage(content="두통약 추천해줘")
#   → tool_calls 자체가 없다 (사람이 한 말)
AIMessage(content="페니실린 계열은 피하세요.", tool_calls=[])
#   → 모델이 도구 없이 그냥 답함 → 빈 리스트
AIMessage(content="", tool_calls=[{...}])
#   → 모델이 "도구 불러줘"라고 함 → 여기에만 채워짐
```

그래서 "마지막 메시지엔 무조건 tool_calls가 있다"고 가정하면 깨진다. 이 검사를 *어디서* 하느냐가 7편 그래프의 핵심인데(`tools_condition`이 한다), 그 얘기는 7편으로 미룬다. 여기선 "있을 수도, 없을 수도 있다"만 기억하면 된다.

## add_messages가 실제로 하는 세 가지

2편에서 `add_messages`를 "append + 같은 id면 덮어쓰기" reducer라고 했다. 메시지 채널 관점에서 보면 이 reducer는 사실 **세 가지**를 한다. 그리고 이 셋이 "노드 코드가 왜 그렇게 단순한가"를 설명한다.

1. **append** — 노드가 `{"messages": [새_메시지]}`를 반환하면 기존 대화에 *덧붙인다*. 덮어쓰지 않는다. (그래서 대화가 쌓인다.)
2. **객체로 coerce** — 입력을 튜플 `("user", "...")`이나 dict `{"role": "user", "content": "..."}`로 넣어도, state에 들어가는 순간 `HumanMessage` 같은 **객체로 변환**한다.
3. **같은 id면 업데이트** — 동일 `id`를 가진 메시지가 오면 append 대신 그 자리를 갱신한다. (스트리밍 중 같은 메시지를 채워나갈 때 쓰인다.)

```python
app.invoke({"messages": [("user", "두통약 추천해줘")]}, cfg)
#   넣을 땐 튜플이지만,
#   state 안에선 HumanMessage(content="두통약 추천해줘")로 변환되어 append된다.
```

핵심은 **입력은 문자열/튜플로 편하게, 내부 저장은 객체로** 라는 점이다. 이 변환을 reducer가 대신 해주기 때문에, 우리가 메시지 객체를 손으로 만들 일이 거의 없다.

## MessagesState는 한 줄짜리 TypedDict다

이제 `MessagesState`의 정체를 보면 허무할 정도로 단순하다.

```python
from typing import Annotated, TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
```

끝이다. **"메시지 객체 리스트 + `add_messages` reducer"** 조합을, agent 만들 때마다 반복하기 귀찮으니 LangGraph가 미리 정의해 둔 것뿐이다. 2편에서 `Annotated[list[BaseMessage], add_messages]`를 직접 썼던 그 줄, 그게 `MessagesState`의 전부다. 특별한 새 타입이 아니라 **단축키**다.

그래서 도메인 키를 더 붙이고 싶으면 그냥 상속하면 된다.

```python
class State(MessagesState):     # messages는 물려받고
    patient_id: str             # 도메인 키만 추가
    risk_score: float | None
```

`messages`(대화 로그)와 `patient_id`(정해진 칸)가 한 state에 공존한다. 2편의 `question/route/answer` 스타일과 메시지 채널 스타일은 **양자택일이 아니라 섞을 수 있다.**

## 노드가 메시지를 반환하는 규약

마지막 조각. "그럼 LLM을 부르는 노드는 이 모양을 *어떻게* 맞춰서 반환하나?" 답은 — **거의 맞출 게 없다.** chat model이 이미 `AIMessage` 객체를 돌려주기 때문이다.

```python
model = ChatAnthropic(model="claude-haiku-4-5-20251001").bind_tools(tools)

def call_model(state: MessagesState) -> dict:
    response = model.invoke(state["messages"])   # ← AIMessage 객체를 반환
    return {"messages": [response]}              # ← 리스트에 담으면 reducer가 append
```

두 줄에서 일어나는 일:

- **`.bind_tools(tools)`** — 모델에게 "이런 도구들이 있다"고 스키마(이름/설명/인자)를 알려준다. 이게 있어야 모델이 응답에 `tool_calls`를 채울 수 있다. 안 묶으면 모델은 도구 존재를 몰라 텍스트만 뱉는다.
- **`.invoke(state["messages"])`** — 지금까지의 메시지 리스트를 통째로 넘기면, 모델은 **완성된 `AIMessage`를 반환**한다. 우리가 `AIMessage(...)`를 손으로 만드는 게 아니다. 도구를 부르기로 했으면 `.tool_calls`가 채워져 있고, 그냥 답할 거면 비어 있다.
- **`return {"messages": [response]}`** — 그 객체를 리스트에 담아 반환만 하면, `add_messages`가 대화에 끼워넣는다.

정리하면 노드가 "MessagesState 모양을 맞춘다"는 건 결국 이 한 줄로 끝난다:

```python
return {"messages": [model.invoke(state["messages"])]}
```

**객체 만들기는 chat model이, append와 변환은 reducer가** 한다. 노드는 그 사이를 잇기만 한다.

## 마무리

`MessagesState`는 특별한 게 아니다. 2편 reducer 위에 올린 "메시지 객체 채널"일 뿐이고, 정체는 한 줄짜리 TypedDict다. 이걸 깔고 나면 agent 코드가 다르게 읽힌다:

- `messages`가 객체 리스트라서 → `last.tool_calls`를 꺼낼 수 있고
- `add_messages`가 append/coerce를 해줘서 → 노드가 `{"messages": [...]}` 한 줄로 끝나고
- `MessagesState`가 강제가 아니라서 → 도메인 키를 섞거나, 아예 안 써도 된다

다음 글들에서 `ToolNode`, `tools_condition`, `create_react_agent`가 나올 때, 그것들은 전부 **이 메시지 채널 위에서 도는 부품**이다 — 특히 7편에서 prebuilt agent를 그래프로 펼쳐 그 부품들을 하나씩 까본다.
