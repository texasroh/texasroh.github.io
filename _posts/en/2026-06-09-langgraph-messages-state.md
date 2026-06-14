---
title: "LangGraph Part 2.5 — MessagesState Isn't a Special State"
date: 2026-06-09
lang: en
tags: [langgraph, langchain, llm, python]
description: "Part 2 taught reducers in the abstract. But open any agent code and suddenly MessagesState, add_messages, and last.tool_calls show up as if they were obvious. messages isn't a new type — it's Part 2's reducer applied to one particular data shape: a list of message objects. That messages are objects rather than strings, what add_messages actually does, why MessagesState is not a mandatory key, and the convention for how a node returns messages — laid down before we climb up to agents."
---

**In Part 2 I covered reducers as the merge rule for state.** `add_messages` flashed by once as an example. But the moment you open agent code, `MessagesState`, `add_messages`, and `state["messages"][-1].tool_calls` show up *as if they were obvious*. Wasn't `messages` a string? Where did `.tool_calls` come from? Do I have to use `MessagesState`?

The short answer: **`messages` is neither a new type nor a required key.** It's the reducer you learned in Part 2, applied to one particular data shape — a list of message objects. This post is the bridge between Part 2 (reducers in general) and the agent-flavored posts (Part 3 onward). Cross it and Part 7's `create_react_agent` stops being confusing.

> **LangGraph Series**
> 1. [Your First Graph — Only Where LCEL Falls Short](/en/blog/langgraph-first-graph/)
> 2. [State Design — Schema and Merge Rule](/en/blog/langgraph-state-design/)
> 2.5. **MessagesState Isn't a Special State** ← this post
> 3. [Send — Dynamic Fan-out Edges Can't Draw](/en/blog/langgraph-send/)
> 4. [An Interrupt Doesn't Pause the Graph](/en/blog/langgraph-human-in-the-loop/)
> 5. [A Checkpoint Isn't Only for Pausing](/en/blog/langgraph-checkpointer/)
> 6. [The Checkpointer Doesn't Cross Threads](/en/blog/langgraph-long-term-memory/)
> 7. [create_react_agent Is Not Magic](/en/blog/langgraph-react-agent/)
> 8. [Multi-Agent Doesn't Mean Agents Talk to Each Other](/en/blog/langgraph-multi-agent/)
> 8.5. [A Subgraph Can Share State, or Isolate It](/en/blog/langgraph-subgraph-state/)

> Versions: based on `langgraph >= 0.2, < 0.3`. Message classes live in `langchain_core.messages`; `add_messages`/`MessagesState` in `langgraph.graph.message`.

## There's no such thing as a mandatory state key

Let's break the misconception first. There is **no** key that *must* be present in a LangGraph state. The routing graph from Parts 1 and 2 makes it clear.

```python
class State(TypedDict):
    question: str
    route: str | None
    answer: str | None
#   ← not a single "messages" in sight. Still a perfectly working graph.
```

State is just *a TypedDict you define*, and you put whatever data the graph handles into keys. `messages` is simply **the particular shape you use when handling a conversation**. So don't memorize the order backwards — `question/route/answer` is closer to the baseline, and `MessagesState` is the special case.

## messages is a list of objects, not strings

Here's the first trap. What goes into `messages` isn't strings — it's **message objects**.

```python
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

[
    HumanMessage(content="I'm allergic to penicillin"),
    AIMessage(content="", tool_calls=[{"name": "lookup_allergy", "args": {"patient_id": "42"}, "id": "call_abc"}]),
    ToolMessage(content="penicillin allergy on record", tool_call_id="call_abc"),
    AIMessage(content="Avoid the penicillin class."),
]
```

Among these, **`AIMessage` is exactly what comes back when you call an LLM** — a chat model's `.invoke()` returns an `AIMessage` object, not a string. (Why that matters comes back in "The convention for returning messages from a node" below.) `HumanMessage` holds user input; `ToolMessage` holds the result of a tool execution.

Each message is an object with fields *beyond* `content` (a string). That's what makes possible things a plain `list[str]` never could:

- **`AIMessage.tool_calls`** — where the model's decision to "call this tool" is stored. This field is the starting point of an agent using tools.
- **`ToolMessage.tool_call_id`** — the key that ties this result back to *which* tool call it answers.
- **`.type` (role)** — who said it: human / ai / tool / system.

So the reason Part 7 could pull `state["messages"][-1].tool_calls` is that the last item was an **`AIMessage` object**, not a string. (For reference, every message class subclasses `BaseMessage`, and `MessagesState` types them with the union `AnyMessage`.)

### tool_calls isn't always there

An important caveat. `tool_calls` is filled **only on an `AIMessage`, and only when the model decided to call a tool.**

```python
HumanMessage(content="recommend something for a headache")
#   → no tool_calls at all (a human said it)
AIMessage(content="Avoid the penicillin class.", tool_calls=[])
#   → the model just answered, no tools → empty list
AIMessage(content="", tool_calls=[{...}])
#   → the model said "call this tool" → filled here
```

So if you assume "the last message always has tool_calls," it breaks. *Where* that check happens is the heart of Part 7's graph (`tools_condition` does it), but I'll leave that to Part 7. Here, just remember: it may or may not be there.

## The three things add_messages actually does

In Part 2 I called `add_messages` an "append + overwrite-on-same-id" reducer. Viewed through the message-channel lens, this reducer actually does **three** things — and these three explain "why the node code is so simple."

1. **Append** — when a node returns `{"messages": [new_message]}`, it *appends* to the existing conversation. It doesn't overwrite. (That's how the conversation accumulates.)
2. **Coerce to objects** — even if you pass input as a tuple `("user", "...")` or a dict `{"role": "user", "content": "..."}`, the moment it enters the state it's **converted into an object** like `HumanMessage`.
3. **Update on same id** — if a message with an identical `id` arrives, it updates that slot instead of appending. (Used when streaming fills in the same message progressively.)

```python
app.invoke({"messages": [("user", "recommend something for a headache")]}, cfg)
#   you pass a tuple, but
#   inside the state it's converted to HumanMessage(content="...") and appended.
```

The point is: **input stays easy as strings/tuples, internal storage is objects.** Because the reducer does this conversion for you, you almost never construct a message object by hand.

## MessagesState is a one-line TypedDict

Now look at what `MessagesState` actually is and it's almost anticlimactic.

```python
from typing import Annotated, TypedDict
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
```

That's it. LangGraph predefined the combination of **"a list of message objects + the `add_messages` reducer"** because it's tedious to repeat every time you build an agent. That line you wrote by hand in Part 2 — `Annotated[list[BaseMessage], add_messages]` — *is* the whole of `MessagesState`. Not a special new type, just **shorthand**.

So if you want to add domain keys, just subclass it.

```python
class State(MessagesState):     # inherit messages
    patient_id: str             # add only the domain keys
    risk_score: float | None
```

`messages` (the conversation log) and `patient_id` (a fixed slot) coexist in one state. The `question/route/answer` style from Part 2 and the message-channel style are **not an either-or — you can mix them.**

## The convention for returning messages from a node

The last piece. "So how does a node that calls an LLM *match* this shape on return?" The answer — **there's almost nothing to match.** Because the chat model already hands you an `AIMessage` object.

```python
model = ChatAnthropic(model="claude-haiku-4-5-20251001").bind_tools(tools)

def call_model(state: MessagesState) -> dict:
    response = model.invoke(state["messages"])   # ← returns an AIMessage object
    return {"messages": [response]}              # ← put it in a list and the reducer appends
```

What happens in those two lines:

- **`.bind_tools(tools)`** — tells the model "these tools exist," handing it the schemas (name/description/args). This is what lets the model fill `tool_calls` in its response. Without it, the model doesn't know the tools exist and only emits text.
- **`.invoke(state["messages"])`** — pass the whole message list so far, and the model **returns a finished `AIMessage`**. You don't construct `AIMessage(...)` by hand. If it decided to call a tool, `.tool_calls` is filled; if it's just answering, it's empty.
- **`return {"messages": [response]}`** — put that object in a list and return it, and `add_messages` slots it into the conversation.

In short, a node "matching the MessagesState shape" comes down to this one line:

```python
return {"messages": [model.invoke(state["messages"])]}
```

**The chat model builds the object; the reducer does the append and conversion.** The node just connects the two.

## Wrapping up

`MessagesState` isn't special. It's a "message-object channel" laid on top of Part 2's reducer, and its true form is a one-line TypedDict. Once you've laid this down, agent code reads differently:

- because `messages` is a list of objects → you can pull `last.tool_calls`, and
- because `add_messages` does the append/coercion → a node ends in `{"messages": [...]}`, and
- because `MessagesState` isn't mandatory → you can mix in domain keys, or not use it at all.

When `ToolNode`, `tools_condition`, and `create_react_agent` show up in the next posts, they're all **parts that run on top of this message channel** — and Part 7 in particular unfolds a prebuilt agent into a graph and dissects those parts one by one.
