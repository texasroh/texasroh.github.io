---
title: "LangGraph 6편 — checkpointer는 스레드를 넘지 못한다"
date: 2026-06-05
lang: ko
tags: [langgraph, langchain, llm, python]
description: "5편의 checkpointer는 '이 대화'를 기억한다. 그런데 thread_id가 바뀌면 그 기억은 통째로 사라진다. 사용자를 가로질러 남는 기억은 checkpointer가 아니라 Store다. short-term(thread)과 long-term(cross-thread)은 같은 축이 아니다 — Store 인터페이스, namespace, semantic search, 그리고 PHI가 영구히 검색 가능해진다는 문제까지."
---

**5편에서 checkpointer를 '그래프 실행에 깔린 persistence layer'라고 했다.** 맞다. 그런데 그 기억은 `thread_id` 하나를 못 넘는다. checkpointer가 기억하는 건 *이 대화*뿐이라서, 사용자가 새 창을 열어 `thread_id`가 바뀌면 어제 나눈 얘기는 다른 스레드에 남은 채 닿지 않는다. "checkpointer 깔았으니 메모리는 끝"이라고 넘기면, 사용자는 어제 한 말을 오늘 잊은 챗봇을 만난다.

대화를 건너뛰어 남는 기억은 종류가 다르다. LangGraph는 이걸 **Store**라고 부른다. checkpointer가 *이 대화*를 기억한다면, Store는 *이 사용자*를 기억한다 — 둘은 아예 다른 축이다.

> **LangGraph 시리즈**
> 1. [첫 그래프 — LCEL로 안 풀리는 것만 그래프로](/ko/blog/langgraph-first-graph/)
> 2. [State 설계 — 스키마와 머지 규칙](/ko/blog/langgraph-state-design/)
> 2.5. [MessagesState는 특별한 state가 아니다](/ko/blog/langgraph-messages-state/)
> 3. [Send — edge로 못 그리는 동적 fan-out](/ko/blog/langgraph-send/)
> 4. [인터럽트 — 그래프를 멈추는 게 아니다](/ko/blog/langgraph-human-in-the-loop/)
> 5. [체크포인트는 멈출 때만 찍히는 게 아니다](/ko/blog/langgraph-checkpointer/)
> 6. **checkpointer는 스레드를 넘지 못한다** ← 현재 글
> 7. [create_react_agent는 마법이 아니다](/ko/blog/langgraph-react-agent/)
> 8. [멀티 에이전트는 에이전트끼리 대화하지 않는다](/ko/blog/langgraph-multi-agent/)
> 8.5. [subgraph는 state를 공유할 수도, 격리할 수도 있다](/ko/blog/langgraph-subgraph-state/)

> 버전: `langgraph >= 0.2, < 0.3` 기준. Store도 패키지가 갈린다 — `BaseStore`/`InMemoryStore`는 `langgraph.store.*` 코어, `PostgresStore`는 `langgraph-checkpoint-postgres`에 들어간다. semantic search용 `index` 옵션은 비교적 최근에 안정화된 영역이라 버전마다 인자 형태가 자주 바뀐다. 본인 환경에서 확인하고 쓴다.

## checkpointer는 스레드 하나만 기억한다

5편의 멘탈모델은 "매 superstep마다 체크포인트가 찍힌다"였다. 그 체크포인트들은 전부 **하나의 `thread_id` 시퀀스 안**에 쌓인다. `thread_id`가 다르면 `get_state_history`로도 안 잡힌다 — 애초에 다른 시퀀스다.

```python
# 월요일 대화
cfg_mon = {"configurable": {"thread_id": "patient-42-mon"}}
app.invoke({"messages": [("user", "저 페니실린 알러지 있어요")]}, cfg_mon)

# 화요일, 새 대화창 → 새 thread_id
cfg_tue = {"configurable": {"thread_id": "patient-42-tue"}}
app.invoke({"messages": [("user", "두통약 추천해줘")]}, cfg_tue)
#   화요일 그래프는 "페니실린 알러지"를 모른다.
#   월요일 체크포인트는 patient-42-mon 시퀀스에만 남아 있다.
```

`thread_id`를 사용자별로 고정하면(`patient-42` 하나로) 되지 않냐고 할 수 있다. 된다 — 단, 그 사용자의 *모든 대화가 하나의 무한정 길어지는 스레드*가 된다는 뜻이다. 컨텍스트가 매번 통째로 부풀고, "이 세션만 따로" 같은 격리가 사라지고, 한 스레드의 손상이 그 사람의 전체 history를 오염시킨다. **대화 단위 격리(thread)와 사용자 단위 지속(memory)은 다른 요구사항인데, thread_id 하나로 둘을 같이 풀려는 순간 둘 다 어그러진다.**

그래서 LangGraph는 축을 둘로 나눈다.

| | checkpointer (short-term) | Store (long-term) |
|---|---|---|
| 범위 | `thread_id` 하나 | namespace (스레드 무관) |
| 단위 | superstep 체크포인트 시퀀스 | key-value (+선택적 임베딩) |
| 질문 | "이 대화 어디까지 왔나" | "이 사용자에 대해 뭘 아나" |
| 수명 | 대화가 끝나면 보통 무의미 | 대화를 넘어 명시적으로 지울 때까지 |
| 인터페이스 | `BaseCheckpointSaver` | `BaseStore` |

## Store는 namespace로 칸을 나눈 key-value다

`BaseStore`는 checkpointer처럼 **인터페이스**고, 구현체(`InMemoryStore`, `PostgresStore`)는 내구성만 다르다 — 5편의 Memory/Sqlite/Postgres 구도와 똑같다. 차이는 *무엇을* 저장하느냐다. checkpointer가 "그래프 state 스냅샷"을 통째로 저장한다면, Store는 **네가 직접 고른 사실들**을 namespace로 칸 나눠 넣는다.

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()

# namespace는 튜플 — 보통 (사용자, 카테고리) 식으로 칸을 나눈다
ns = ("patient-42", "facts")

store.put(ns, "allergy", {"text": "페니실린 알러지", "source": "2026-06-01 문진"})
store.put(ns, "pref",    {"text": "주사보다 경구약 선호"})

store.get(ns, "allergy").value        # {'text': '페니실린 알러지', ...}
[i.key for i in store.search(ns)]     # ['allergy', 'pref']  — 이 namespace 전체
```

핵심은 namespace가 **`thread_id`와 완전히 무관**하다는 점이다. `("patient-42", "facts")`는 월요일 스레드에서 쓰든 화요일 스레드에서 쓰든 같은 칸을 가리킨다. 이게 "스레드를 넘는 기억"의 정체다 — 마법이 아니라, 그냥 *대화 ID에 묶이지 않은 별도 저장소*다.

## 노드 안에서 Store를 쓰는 법: 주입받는다

Store는 `compile`에 checkpointer와 **나란히** 끼운다. 그리고 노드 함수가 `store` 파라미터를 선언하면 LangGraph가 런타임에 주입해준다 — `config`를 주입받는 것과 같은 방식이다.

```python
from langgraph.store.base import BaseStore
from langgraph.graph import StateGraph, START, END

def respond(state: State, config, *, store: BaseStore) -> dict:
    user = config["configurable"]["user_id"]
    ns = (user, "facts")

    # 1) 답하기 전에 이 사용자에 대해 아는 것을 꺼낸다 (다른 스레드에서 쌓인 것까지)
    known = "\n".join(i.value["text"] for i in store.search(ns))

    answer = llm.invoke(f"환자 정보:\n{known}\n\n질문: {state['question']}")

    # 2) 이번 대화에서 새로 알게 된 사실을 다음 스레드를 위해 적어둔다
    if fact := extract_fact(answer):
        store.put(ns, fact["key"], {"text": fact["text"]})

    return {"answer": answer}

# checkpointer와 store는 다른 축이라 같이 끼운다
app = graph.compile(checkpointer=checkpointer, store=store)

# thread_id는 대화별로 바뀌어도, user_id는 사용자별로 고정
app.invoke(
    {"question": "두통약 추천해줘"},
    {"configurable": {"thread_id": "patient-42-tue", "user_id": "patient-42"}},
)
#   화요일 스레드인데도 store.search가 월요일에 넣은 "페니실린 알러지"를 가져온다.
```

읽는 흐름이 보인다 — **노드 진입 시 long-term에서 읽고(`search`), 노드 종료 시 long-term에 쓴다(`put`).** checkpointer가 자동으로 state 전체를 찍어주는 것과 달리, Store는 *무엇을 기억할지 네가 명시적으로 고른다.* 이게 장점이자 부담이다: 자동이 아니라서 PHI를 통째로 흘리지 않을 수 있지만, "무엇이 기억할 가치가 있나"를 매번 결정해야 한다.

## semantic search: key를 몰라도 의미로 꺼낸다

`store.get(ns, "allergy")`는 key를 정확히 알아야 한다. 그런데 보통은 "이 질문과 관련된 과거 사실"을 꺼내고 싶지, key를 외우고 있지 않다. Store는 namespace에 임베딩 인덱스를 걸면 **의미 기반 검색**을 지원한다.

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore(
    index={"embed": embeddings, "dims": 1536, "fields": ["text"]}
)
# 'text' 필드를 임베딩해서 인덱싱

store.put(("patient-42", "facts"), "a1", {"text": "페니실린 알러지"})

# key를 모른 채, 질문의 의미로 검색
hits = store.search(("patient-42", "facts"), query="항생제 처방해도 되나?", limit=3)
#   "페니실린 알러지"가 의미적으로 걸려 올라온다 — 단어가 안 겹쳐도.
```

여기서 LangGraph가 RAG의 retrieval 절반을 흡수한다. 다만 *흡수한다*지 *대체한다*가 아니다 — 임베딩 모델, 차원, 어떤 필드를 인덱싱할지는 여전히 네가 정하고, 대규모 벡터 검색이 필요하면 전용 벡터 DB가 낫다. Store의 semantic search는 "에이전트가 사용자에 대해 기억하는 사실" 정도의 규모에 어울리는, 그래프에 *붙어 있는* 검색이다.

## 클리니컬 관점: long-term은 5편의 보안 문제를 더 키운다

5편 끝에서 "디스크에 남는 saver를 쓰는 순간 체크포인트는 또 하나의 데이터 저장소이고, PHI가 평문으로 남는다"고 했다. **Store는 그 문제를 그대로 물려받고, 두 가지를 더 얹는다.**

- **스레드를 넘어 *영구히* 남는다.** 체크포인트는 그래도 "대화 단위"라 보존 정책을 스레드 만료에 걸 수 있다. Store의 사실은 정의상 *대화를 넘어 계속 남으라고* 넣은 것이다. `("patient-42", "facts")`에 한 번 들어간 PHI는 명시적으로 지우기 전까지 모든 미래 대화에서 다시 읽힌다.
- **검색 가능해진다.** semantic index를 걸었다면 PHI가 *평문 저장*을 넘어 *임베딩으로도* 남는다. 임베딩은 마스킹의 사각지대다 — 원문을 토큰화해 가렸어도 임베딩 벡터에서 의미가 복원될 수 있다. 인덱싱할 `fields`를 PHI가 아닌 것으로 한정하는 설계가 필요하다.

실무에서 내가 잡는 규칙은 단순하다: **Store에는 식별자와 "기억할 가치가 검증된 사실의 포인터"만 넣고, 원문 PHI는 별도 보안 저장소에 둔다.** 그리고 namespace의 첫 키를 환자 식별자로 잡아두면, 삭제 요구(right-to-be-forgotten)가 들어왔을 때 그 환자의 namespace 하나만 지우면 된다.

이게 의미가 있는 건, 같은 일이 checkpointer 쪽에선 훨씬 까다롭기 때문이다. 5편에서 삭제권이 time-travel과 부딪혔던 이유는 둘이었다 — 한 사람의 state가 여러 thread에, 그 안에서도 매 superstep 체크포인트로 흩어져 쌓이고, 게다가 지운 줄 알았던 옛 state까지 과거 체크포인트에 남아 다시 조회된다. "이 환자 것만 골라 지우기"를 하려면 그 흩어진 걸 다 추적해야 한다. 반면 Store는 같은 사용자의 사실이 namespace 한 곳에 모여 있어서 "무엇을, 어디서 지울지"가 처음부터 명확하다. 단, 이건 Store가 알아서 해주는 게 아니라 위처럼 식별자 단위로 칸을 나눠 넣어둔 설계의 결과다.

## 마무리

5편이 "checkpointer = 그래프 실행에 깔린 persistence layer"였다면, 6편의 한 줄은 그 layer에 **경계선**이 있다는 것이다 — `thread_id`. 그 선 안쪽이 short-term(이 대화), 바깥쪽이 long-term(이 사용자)이고, 바깥쪽은 checkpointer가 아니라 **Store**가 맡는다. 둘은 `compile(checkpointer=..., store=...)`로 나란히 끼우는, 같은 축이 아닌 두 개의 기억이다.

그래서 "LangGraph로 메모리를 붙였다"는 말은 둘 중 어느 쪽인지를 물어야 한다. *이 대화를 이어가는* 거라면 checkpointer로 끝이고, *사용자를 가로질러 기억하는* 거라면 Store를 따로 설계해야 한다 — 그리고 그 순간 PHI가 영구적이고 검색 가능한 형태가 된다는 부담도 함께 떠안게 된다.

여기까지가 persistence 축의 마무리다. 다음 편(7편, Phase 5)에서는 이 checkpointer와 Store 위에 올라가는 `create_react_agent` 같은 **prebuilt 에이전트가 실제로 어떤 그래프인지** 직접 분해해 보고, 직접 그래프로 짤 때와의 trade-off까지 본다.
