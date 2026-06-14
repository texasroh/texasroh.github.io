---
title: "LangGraph Part 2 — State Design: Schema and Merge Rule"
date: 2026-05-22
lang: en
tags: [langgraph, langchain, llm, python]
description: "Two decisions go into LangGraph state design — the schema (TypedDict vs Pydantic), and the rule for merging when multiple nodes fill the same key (Reducer). This post lays out how to make each. Default: TypedDict with no reducer."
---

**LangGraph state design comes down to two decisions.** One is *the schema (TypedDict vs Pydantic)*, the other is *the merge rule (Reducer)*. The default is **TypedDict + no reducer**. This post walks through how to make each.

> **LangGraph Series**
> 1. [Your First Graph — Only Where LCEL Falls Short](/en/blog/langgraph-first-graph/)
> 2. **State Design — Schema and Merge Rule** ← this post
> 2.5. [MessagesState Isn't a Special State](/en/blog/langgraph-messages-state/)
> 3. [Send — Dynamic Fan-out Edges Can't Draw](/en/blog/langgraph-send/)
> 4. [An Interrupt Doesn't Pause the Graph](/en/blog/langgraph-human-in-the-loop/)
> 5. [A Checkpoint Isn't Only for Pausing](/en/blog/langgraph-checkpointer/)
> 6. [The Checkpointer Doesn't Cross Threads](/en/blog/langgraph-long-term-memory/)
> 7. [create_react_agent Is Not Magic](/en/blog/langgraph-react-agent/)
> 8. [Multi-Agent Doesn't Mean Agents Talk to Each Other](/en/blog/langgraph-multi-agent/)
> 8.5. [A Subgraph Can Share State, or Isolate It](/en/blog/langgraph-subgraph-state/)

> Versions: based on `langgraph >= 0.2, < 0.3`. Pydantic v2.

## State is the graph's shared notepad

A LangGraph graph is a structure where multiple nodes run. How do nodes pass information to each other? An LCEL chain feeds "previous node's output → next node's input." Straightforward.

LangGraph puts a **shared notepad (State)** in the middle, and every node looks at and edits the same notepad.

```python
class State(TypedDict):
    question: str         # user's question
    route: str | None     # where to send it
    answer: str | None    # final answer
```

Each node doesn't rewrite the whole notepad — it only returns **the cells it changed**.

```python
def classify(state: State) -> dict:
    return {"route": "faq"}     # only changed keys
```

The rest of the cells get **merged** by LangGraph. That merge rule is the reducer. The default reducer is *overwrite* — if two nodes touch the same key in the same step, they collide and you get `InvalidUpdateError`.

## Two decisions split here

To design this notepad, you have to settle two things.

1. **What form will the notepad take (the schema)** — **TypedDict vs Pydantic**
2. **When two nodes fill the same cell, how do they merge** — **default (overwrite) vs Reducer**

You can attach a reducer to a Pydantic state, and you can skip reducers on a TypedDict state. The two decisions mix freely.

## Decision 1: Schema — TypedDict by default, Pydantic where user input lands

### TypedDict — covers most cases

```python
from typing import TypedDict, Literal

class State(TypedDict):
    question: str
    route: Literal["faq", "deep"] | None
    answer: str | None

graph = StateGraph(State)
```

- No runtime validation. It's just a dict.
- If a node puts in a wrong key, the runtime won't catch it. Only the type checker (mypy / pyright) will.
- Lightweight. Inside the graph, you're running code you wrote yourself — most of the time this is plenty.

### Pydantic — when user input lands directly

```python
from pydantic import BaseModel, Field
from typing import Literal

class State(BaseModel):
    question: str = Field(min_length=1)
    route: Literal["faq", "deep"] | None = None
    answer: str | None = None

graph = StateGraph(State)
```

Since LangGraph 0.2.x, you can use a Pydantic v2 model as the state schema. Nodes still return partial dicts; LangGraph merges them into the model.

When to reach for Pydantic:

- **User input arrives directly from an HTTP body or the like.** Empty strings and bad enum values get filtered *before* the first node runs.
- **You want domain objects in state.** A `Finding(severity="high", ...)` reads far better in LangSmith traces than a dict-of-dicts.
- **The shared state has invariants worth enforcing.** Pin a rule like `0 <= confidence <= 1` once in the schema and any violation gets caught before a node runs.

When you don't need it:

- The graph is only called from your own code and validation happened there already. Doing the same job twice is waste.
- The state is genuinely simple — four or five keys. Wrapping it in Pydantic just piles on `Field` / `default_factory` noise. Listing keys and types in a TypedDict reads at a glance.

### Side by side

| | TypedDict | Pydantic v2 |
|---|---|---|
| Runtime validation | ❌ | ✅ |
| Fit for input-boundary checks | ❌ | ✅ |
| Domain object representation | dict | model |
| Performance overhead | ~0 | validation per merge |
| Default values | nodes fill them | `Field(default_factory=...)` |

One line to keep: **Start with TypedDict. Reach for Pydantic only where user input lands directly, or where strong invariants need enforcing.**

## Decision 2: Merge rule (Reducer) — required the moment join points appear

If there's any chance multiple nodes touch the same cell in the same step, you need a reducer.

The place you meet this most often is the **message list**. LLM nodes pile up messages every turn, so it's a clean case to see what a reducer actually does. This section walks through the message list example: *why you need one → how to attach it → how nodes use it*.

### 1. Without a reducer — nodes merge by hand

First, what does a node look like with no reducer attached?

```python
from typing import TypedDict
from langchain_core.messages import BaseMessage

class State(TypedDict):
    messages: list[BaseMessage]   # no reducer — defaults to overwrite

def call_llm(state: State) -> dict:
    new = llm.invoke(state["messages"])
    return {"messages": state["messages"] + [new]}   # hand-merge
```

The node has to hand-concatenate `state["messages"] + [new]` every time. Worse: the moment two nodes touch `messages` in the *same step*, **one result gets wiped clean.** LangGraph's default merge is "overwrite," so two partials coming in mean one clobbers the other.

### 2. With a reducer, nodes return only the delta

If a reducer is attached, the node above becomes:

```python
def call_llm(state: State) -> dict:
    new = llm.invoke(state["messages"])
    return {"messages": [new]}                       # delta only
```

The `state["messages"] + [new]` hand-merge disappears. LangGraph takes both partials and merges them by the rule you set. Even if two nodes touch `messages` in the same step, neither side gets dropped.

Now the only question — **"where and how do you tell LangGraph the rule?"** Answer: you pin it inside the schema with `Annotated`.

### 3. Where to attach: inside `Annotated`

`typing.Annotated` is essentially *"a sticky note attached to a type."* Shape:

```python
Annotated[OriginalType, metadata]
```

At runtime it behaves like `OriginalType`. The extra step LangGraph takes: at graph compile time it scans the schema and **registers** whatever sits in the second slot as the **reducer**. So `Annotated[list[BaseMessage], add_messages]` reads as "the type is `list[BaseMessage]`, and when two partials meet, merge them with `add_messages`."

#### Attaching in TypedDict

```python
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
```

`add_messages` is the reducer LangGraph ships with. New messages get **appended**; messages with a matching `id` **overwrite** the existing one.

#### Attaching in Pydantic

The same `Annotated` syntax works inside `BaseModel`.

```python
from pydantic import BaseModel, Field
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class State(BaseModel):
    messages: Annotated[list[BaseMessage], add_messages] = Field(default_factory=list)
```

Switching the schema to Pydantic doesn't change how you attach the reducer. The `Annotated` line stays the same. The only difference is setting the mutable default the Pydantic way via `Field(default_factory=list)`.

### 4. Other reducer options

You can write reducers freely beyond `add_messages`. The signature is always `(existing_value, new_value) -> merged_value`. What the node returned arrives as the second argument, and what you return becomes the next step's `existing`.

#### `operator.add` — the simplest reducer

```python
from operator import add
from typing import TypedDict, Annotated

class State(TypedDict):
    notes: Annotated[list[str], add]
```

`add` is just `+`. Lists concat, numbers sum. If you don't need ID-based merging like messages, this is enough.

#### Custom reducer — domain merge rule

Say several LLM nodes produce findings for the same patient and you want to merge them by ID. A pretty common shape in clinical LLM workflows.

```python
from typing import TypedDict, Annotated, Literal

class Finding(TypedDict):
    id: str
    severity: Literal["low", "med", "high"]
    note: str

def merge_findings(existing: list[Finding], new: list[Finding]) -> list[Finding]:
    by_id = {f["id"]: f for f in existing}
    for f in new:                      # same id → latest wins
        by_id[f["id"]] = f
    return list(by_id.values())

class State(TypedDict):
    findings: Annotated[list[Finding], merge_findings]
```

Centralizing the merge logic means every node just returns its partial, and the code stays clean.

## Wrap-up

State design comes down to two decisions — the schema, and the merge rule. **The schema decides *the shape of each cell*; the reducer decides *what happens when the same cell is filled at the same time*.** Hold onto the default and the exception cases for each, and state design stays simple.

Next up: control flow — [dynamic fan-out with `Send`](/en/blog/langgraph-send/).
