---
title: "LangGraph 9편 — 스트리밍은 토큰을 흘리는 게 아니다"
date: 2026-06-30
lang: ko
tags: [langgraph, langchain, llm, python]
series: langgraph
seriesOrder: 9
description: "스트리밍이라고 하면 ChatGPT처럼 글자가 한 자씩 흐르는 화면을 떠올린다. LangGraph의 .stream()도 그걸 하긴 하지만, 그건 다섯 모드 중 하나일 뿐이다. 더 근본은 그래프가 한 단계 돌 때마다 그 단계를 밖으로 내보내는 것 — 5편에서 체크포인트가 찍히던 그 superstep 경계에서, 이번엔 저장 대신 방출이 일어난다. stream_mode는 그 경계에서 무엇을 내보낼지를 고른다. values/updates는 단계 단위, messages는 토큰 단위로 축이 다르다는 걸 출력 형태로 까보고, 마지막에 그래프를 FastAPI SSE로 내보내는 자리까지 잇는다."
---

**[5편](/ko/blog/langgraph-checkpointer/)에서 "매 superstep마다 체크포인트가 찍힌다"고 했다.** 그래프가 한 단계 돌 때마다 그 경계에서 상태가 저장된다는 얘기였다. 스트리밍은 같은 경계에서 일어나는 다른 동작이다 — 저장하는 대신 밖으로 내보낸다.

"스트리밍"이라고 하면 ChatGPT처럼 글자가 한 자씩 떨어지는 화면을 떠올린다. LangGraph의 `.stream()`도 그걸 하긴 한다. 그런데 그건 다섯 가지 스트림 모드 중 하나일 뿐이고, 나머지 넷은 토큰이 아니라 **그래프의 진행 상태**를 내보낸다. 그래서 LangGraph에서 스트리밍은 토큰을 흘리는 일이 아니라 **그래프 실행을 한 단계씩 관찰하는 일**에 가깝고, `stream_mode`는 그 경계에서 무엇을 꺼내 볼지를 고르는 손잡이다.

> 버전: `langgraph >= 0.2, < 0.3` 기준. `get_stream_writer`는 `langgraph.config`에 있고 0.2.x 중반에 들어왔다(그 전에는 노드 시그니처에 `StreamWriter`를 주입받는 형태였다). `astream_events`는 `version="v2"`를 명시해서 쓴다 — v1/v2 이벤트 스키마가 다르고 1.0 계열에서 또 바뀌므로 본인 환경에서 확인하고 쓴다.

## `.stream()`은 단계를 내보낸다

가장 작은 그래프부터. 두 노드가 차례로 도는 그래프를 `.stream()`으로 돌리면, `.invoke()`처럼 최종값 하나가 아니라 **단계마다 한 조각씩** 나온다.

```python
for chunk in graph.stream(inputs, stream_mode="updates"):
    print(chunk)
```

`stream_mode`를 뭘로 주느냐에 따라 같은 단계가 다른 모양으로 나온다. 먼저 두 모드를 나란히 보자.

```python
# stream_mode="updates" — 그 단계에 실행된 노드가 "반환한 것"만, 노드 이름으로 묶여서
{"retrieve": {"docs": ["doc1", "doc2"]}}
{"generate": {"messages": [AIMessage("...")]}}

# stream_mode="values" — 그 단계가 끝난 뒤의 "누적 전체 state"
{"question": "두통약 추천", "docs": []}
{"question": "두통약 추천", "docs": ["doc1", "doc2"]}
{"question": "두통약 추천", "docs": ["doc1", "doc2"], "messages": [AIMessage("...")]}
```

두 모드는 같은 superstep 경계에서 나오는 같은 사건의 두 표현이다.

- `updates`는 [2편](/ko/blog/langgraph-state-design/)에서 본 **노드의 반환 규약 그대로**다 — 노드는 부분 dict를 반환하고, `updates`는 그 부분 dict를 노드 이름에 묶어 그대로 흘려준다. "이번 단계에 누가 무엇을 바꿨나"가 보인다.
- `values`는 그 부분 dict를 reducer로 누적 state에 합친 뒤의 **전체 스냅샷**이다. "이번 단계가 끝났을 때 state가 어떤 모습인가"가 보인다.

그래서 `updates`를 처음부터 차곡차곡 reducer로 합치면 `values`가 된다. 단계별 델타만 필요하면(로그, 진행 표시) `updates`, 매 단계의 전체 state가 필요하면(state를 그대로 UI에 그리는 경우) `values`.

`updates`가 노드 이름으로 묶이는 건 [3편](/ko/blog/langgraph-send/)의 fan-out 같은 데서 쓸모가 있다. 한 superstep에서 노드 여러 개가 병렬로 돌면, 각 노드의 반환이 **이름을 키로** 따로 실려 나와 어느 게 누구 것인지 구분된다.

## `messages` 모드는 단계가 아니라 토큰이다

여기까지의 두 모드는 superstep 경계에서 나온다 — 노드가 하나 끝날 때마다 한 조각. 그런데 사람들이 "스트리밍"이라 부르는 그 토큰 흐름은 경계가 다르다. 노드 **안에서** LLM이 토큰을 한 개씩 뱉을 때마다 나온다.

```python
for chunk, metadata in graph.stream(inputs, stream_mode="messages"):
    print(chunk.content, end="")        # AIMessageChunk — 토큰 조각
    # metadata["langgraph_node"] == "generate" 처럼 어느 노드에서 나온 토큰인지 들어있다
```

`messages` 모드의 한 조각은 `(message_chunk, metadata)` 튜플이다. `message_chunk`는 모델이 뱉은 토큰 조각(`AIMessageChunk`)이고, `metadata`에는 그 토큰이 **어느 노드의 어느 모델 호출**에서 나왔는지가 들어있다. 노드가 끝나길 기다리지 않고, 모델이 생성하는 족족 흘러나온다.

그래서 `messages`는 앞의 둘과 축이 다르다. `values`/`updates`는 "단계가 끝났다"를 단위로 하고, `messages`는 "토큰이 하나 나왔다"를 단위로 한다. 한 노드 안에서 모델이 200토큰을 생성하면 `messages`로는 200조각이 흐르지만, 그 노드는 `updates`로는 단 한 조각(노드가 끝날 때)만 낸다. 토큰 단위 UI를 그리려면 `metadata`의 `langgraph_node`로 "지금 스트리밍되는 토큰이 답변 노드 것인지, 중간 요약 노드 것인지"를 갈라야 한다 — 안 그러면 사용자에게 보여줄 토큰과 내부용 토큰이 섞인다.

## 다섯가지 스트림모드

`stream_mode`는 다섯 개고, 각각 superstep의 다른 면을 본다.

| 모드       | 한 조각의 단위 | 한 조각의 모양                  | 언제                                 |
| ---------- | -------------- | ------------------------------- | ------------------------------------ |
| `values`   | 단계           | 누적 전체 state                 | 매 단계 state 전체를 그릴 때         |
| `updates`  | 단계           | `{노드이름: 반환 dict}`         | 단계별 델타·진행 로그                |
| `messages` | 토큰           | `(AIMessageChunk, metadata)`    | 답변을 토큰 단위로 흘릴 때           |
| `custom`   | 임의           | 노드가 직접 쓴 값               | 노드 안 진행 상황("3건 중 1건 처리") |
| `debug`    | 단계(상세)     | 태스크 시작/결과 등 상세 이벤트 | 그래프 동작 추적·디버깅              |

`custom`은 노드 안에서 내가 직접 무언가를 흘려보내고 싶을 때 쓴다. LLM 토큰도, 단계 경계도 아닌 — 예컨대 "문서 50건 중 12건 처리 중" 같은 진행 메시지다.

```python
from langgraph.config import get_stream_writer

def process_docs(state):
    writer = get_stream_writer()
    for i, doc in enumerate(state["docs"]):
        writer({"progress": f"{i + 1}/{len(state['docs'])}"})   # custom 스트림으로 흘러나온다
        ...
    return {...}
```

이 `writer(...)`로 쓴 값이 `stream_mode="custom"`으로 받는 쪽에 그대로 나온다. 모델이 토큰을 안 뱉는 도구 노드·검색 노드에서 "멈춰 있는 게 아니라 일하는 중"을 사용자에게 보여줄 때 쓸 자리다.

모드는 동시에 여러 개 켤 수 있다. 리스트로 주면, 각 조각이 **어느 모드에서 나왔는지** 앞에 붙어 나온다.

```python
for mode, chunk in graph.stream(inputs, stream_mode=["updates", "messages"]):
    if mode == "messages":
        token, meta = chunk
        ...                     # 토큰 UI 갱신
    elif mode == "updates":
        ...                     # 단계 진행 로그
```

토큰은 토큰대로 흘리면서 단계 진행도 같이 받고 싶을 때 — 실제 챗 UI가 거의 이 조합이다. 답변은 `messages`로 한 자씩 그리고, "검색 중 → 생성 중" 같은 단계 표시는 `updates`로 받는다.

## subgraph 안은 기본적으로 안 보인다

[8편](/ko/blog/langgraph-multi-agent/)의 멀티 에이전트나, 노드 안에 또 그래프가 든 구조([8.5편](/ko/blog/langgraph-subgraph-state/))에서는 함정이 하나 있다. 바깥 그래프를 `.stream()`하면 기본적으로 **바깥 노드 단위로만** 조각이 나온다 — subgraph가 노드 하나로 취급되니, 그 안에서 무슨 일이 도는지는 안 보인다. agent 노드가 도구를 세 번 부르며 한참 도는 동안, 바깥에서는 "agent 노드 실행 중" 하나로 뭉쳐 보인다.

안쪽까지 보려면 `subgraphs=True`를 켠다.

```python
for namespace, chunk in graph.stream(inputs, stream_mode="updates", subgraphs=True):
    # namespace == () 면 바깥 그래프, ("agent:<id>",) 처럼 붙으면 그 subgraph 안의 단계
    print(namespace, chunk)
```

이러면 각 조각 앞에 **어느 그래프에서 나왔는지**를 가리키는 namespace 튜플이 붙는다. 빈 튜플이면 바깥, 값이 있으면 그 subgraph 안이다. 멀티 에이전트에서 "지금 어느 agent의 어느 단계가 도는지"를 보려면 이게 필요하다. 모드를 여러 개 켜면 namespace·모드·조각이 함께 붙어 나온다.

## 그래프를 서버로 내보낼 때

스트리밍이 실제로 쓸모 있는 건 이 조각들을 브라우저 같은 **외부 클라이언트로 실시간 전송할 때**다. 비동기 버전 `astream`을 쓰면 흘러나온 조각 하나가 그대로 SSE(Server-Sent Events) 이벤트 하나가 되어서, 사이에서 따로 변환할 게 거의 없다.

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat")
async def chat(req: ChatRequest):
    async def event_stream():
        async for token, meta in graph.astream(
            {"messages": [("user", req.text)]},
            config={"configurable": {"thread_id": req.thread_id}},
            stream_mode="messages",
        ):
            yield f"data: {token.content}\n\n"      # 토큰을 그대로 SSE로
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

`stream_mode`로 부족한 경우가 있긴 하다. "모델 호출이 시작됐다 / 도구가 끝났다 / 체인의 이 단계에 들어왔다" 같은 **더 잘게 쪼갠 이벤트**가 필요하면 `astream_events(..., version="v2")`로 간다. `on_chat_model_stream`, `on_tool_end` 같은 이벤트가 타입별로 나온다. 다만 이벤트 양이 많고 스키마가 버전에 민감해서, 토큰과 단계 진행만 필요한 대부분의 경우엔 `stream_mode` 쪽이 다루기 쉽다. 실행 과정을 트레이스로 들여다보려는 거라면 보통 LangSmith 같은 관측 도구를 쓴다.

## 정리

LangGraph의 스트리밍은 토큰을 흘리는 일이 아니라 그래프 실행을 한 단계씩 밖에서 보는 일이고, `stream_mode`가 그 단계에서 무엇을 꺼낼지 고른다. `values`와 `updates`는 superstep 경계에서 나오는 단계 단위라 [2편](/ko/blog/langgraph-state-design/)의 반환 규약·reducer가 그대로 보이고, `messages`는 노드 안 모델 호출에서 토큰 단위로 나와 축이 다르다. `custom`은 노드가 직접 흘리는 진행, `subgraphs=True`는 안쪽 그래프까지 여는 스위치다.