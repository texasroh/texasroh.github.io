---
title: "LangGraph Part 8.5 — A Subgraph Can Share State, or Isolate It"
date: 2026-06-14
lang: en
tags: [langgraph, langchain, llm, python]
series: langgraph
seriesOrder: 8.5
description: "Part 8 said that dropping an agent in as a node makes the two share the same messages. But that sharing isn't magic — it's a choice. Whether a subgraph exchanges state with the outer graph comes down to one thing: whether they share a key by name. Drop a compiled graph straight in as a node and the parent's reducer merges the shared key automatically; wrap it in a function and you control exactly what goes in and what comes out. Multi-agent context pollution, and the isolation that prevents it, are both explained by this one thing."
---

**Part 8 said "an agent is a node, and the two share the same `messages`."** But that sharing isn't magic LangGraph does for you — it's a *choice*. Whether a subgraph (another graph living inside a node) exchanges state with the outer graph comes down to one thing — **whether they share a key by name.** This single fact explains both multi-agent context pollution and the isolation that prevents it.

> **LangGraph Series**
> 1. [Your First Graph — Only Where LCEL Falls Short](/en/blog/langgraph-first-graph/)
> 2. [State Design — Schema and Merge Rule](/en/blog/langgraph-state-design/)
> 2.5. [MessagesState Isn't a Special State](/en/blog/langgraph-messages-state/)
> 3. [Send — Dynamic Fan-out Edges Can't Draw](/en/blog/langgraph-send/)
> 4. [An Interrupt Doesn't Pause the Graph](/en/blog/langgraph-human-in-the-loop/)
> 5. [A Checkpoint Isn't Only for Pausing](/en/blog/langgraph-checkpointer/)
> 6. [The Checkpointer Doesn't Cross Threads](/en/blog/langgraph-long-term-memory/)
> 7. [create_react_agent Is Not Magic](/en/blog/langgraph-react-agent/)
> 8. [Multi-Agent Doesn't Mean Agents Talk to Each Other](/en/blog/langgraph-multi-agent/)
> 8.5. **A Subgraph Can Share State, or Isolate It** ← this post

> Versions: based on `langgraph >= 0.2, < 0.3`.

## The Rule for a Subgraph Talking to the Outside Is One Thing

There are two ways to attach a subgraph as a node of the outer graph, and that's exactly what splits sharing from isolation.

1. **Drop the compiled subgraph straight into `add_node`** → keys with the same name are shared automatically.
2. **Wrap the subgraph in a function node** → you map what goes in and what comes out yourself (no automatic sharing).

The core rule is in (1): **if the outer graph and the subgraph have a *state key with the same name*, only that key is shared between them.** Keys whose names don't overlap aren't shared. That's all.

## Way (1) — Share the Keys

Part 8's multi-agent used this way. The outer graph is `MessagesState`, the agent is `MessagesState`, so both have a `messages` key and it's shared automatically.

```python
from langgraph.graph import StateGraph, MessagesState
from langgraph.prebuilt import create_react_agent

subgraph = create_react_agent(model, tools=[...])   # the Part 7 agent — its state is MessagesState

parent = StateGraph(MessagesState)  # the outer graph also has messages
parent.add_node("agent", subgraph)  # ← drop the compiled graph straight in as a node
```

So the shared key `messages` is handled at two moments — entry and exit.

- **On entry (parent → sub):** the outer graph's current `messages` is passed in as the subgraph's input.
- **On exit (sub → parent):** the `messages` the subgraph returns is **merged via the parent's reducer.**

There's no special two-way channel. A subgraph is, after all, *just one node*, so the Part 2 rule — **a node returns a partial dict, and the parent's reducer merges it into that key** — simply applies as-is. That's also why "a key with the same name" is the condition — only then can the subgraph inherit the value on entry, and only then does the parent have the same key to merge the returned value into on exit.

This raises a suspicion — on exit, the `messages` the subgraph returns **includes the originals it received on entry.** Merge that back into the parent and won't the earlier messages double? If the reducer were a plain concatenation, that's exactly what would happen.

First, the actual shape of `messages`. Each element in the list isn't a string but a **message object with an `id`** (Part 2.5). That `id` is precisely the merge key.

```python
messages = [
    HumanMessage(id="h1", content="Recommend a headache med"),   # m1 below
    AIMessage(id="a1", content="", tool_calls=[...]),            # m2 below
]
# add_messages merges on this .id — m1·m2·m3·m4 below are each such an object with an id
```

```python
# if messages used a plain list-concat reducer (doesn't look at id)
[m1, m2]  +  [m1, m2, m3, m4]  =  [m1, m2, m1, m2, m3, m4]   # ❌ h1·a1 appear twice

# add_messages upserts by id (h1, a1, ...)
add_messages([m1, m2], [m1, m2, m3, m4]) = [m1, m2, m3, m4]   # ✅ same id replaced in place
```

When `add_messages` meets the same `id`, it does an *in-place replace* instead of an append, so the originals (`m1`, `m2`) are updated and only the new messages (`m3`, `m4`) accumulate. **And this is exactly why the built-in `MessagesState` prevents the problem automatically.** `MessagesState` is just a `TypedDict` with `add_messages` pre-attached to the `messages` key (Part 2.5), and that baked-in reducer handles even subgraph-boundary duplication on its own. Build your own state with a plain `messages: list` and there's no such protection — you get the doubling above as-is.

> This `id` is filled in by **`add_messages`, not by the graph engine.** A freshly built message (`HumanMessage(content=...)`) has `id=None`, but `add_messages` stamps a uuid on every id-less message when it merges (which is also how `RemoveMessage` can delete by pointing at an id), and messages returned by the model usually already carry one. So auto-assigning ids is a feature of `add_messages`, not of the graph — using `MessagesState` just brings that reducer along so it's filled in automatically.

Two things matter here.

**Subgraph-only keys don't leak out.** A key that exists only in the subgraph and not in the outer schema lives inside the subgraph and isn't propagated to the parent.

```python
class SubState(TypedDict):
    messages: Annotated[list, add_messages]   # also in parent → returning it merges into parent
    scratch: list                             # subgraph-only → never leaves
```

It means you can hide an agent's internal scratchpad or intermediate flags from the outside.

**And inheriting the shared key as-is is exactly the "pollution" from Part 8.** The tool-call messages the agent piled up looping (the `lookup_drug` call and its result) also rise into the shared `messages`, and the next agent inherits the whole channel. Convenient, but as agents multiply the channel swells with tool leftovers others called.

## Way (2) — Isolate

If the pollution comes from *sharing*, then cut the sharing. Instead of dropping the compiled graph straight in, **wrap it in a function node** and pick yourself what input goes in and what output comes up.

```python
def call_agent(state: ParentState) -> dict:
    summary = summarize(state)                                # pick only what to send in
    out = subgraph.invoke({"messages": [HumanMessage(summary)]})
    return {"answer": out["messages"][-1].content}            # return only what to bubble up

parent.add_node("agent", call_agent)   # wrap in a function node
```

In this case the outer `messages` and the subgraph's `messages` are **different channels** even with the same name — because the function stitches the two by hand. The subgraph sees only what we put into `invoke` and can't see the outer raw history at all. In other words, **you pass only what's needed.** Part 8 noted "in a shared channel, adding a summary doesn't work because the raw messages stay"; isolation sidesteps that limit because the channel itself is different.

There are also cases where isolation is **not a choice but a must** — when the outer and subgraph schemas are entirely different. If the outer state is centered on scores and stage flags while the inner agent is centered on `messages`, there's no key to share, so (1) won't attach. Then you have no choice but to wrap it in a function node and convert "outer state → subgraph input" and "subgraph output → outer state."

## When to Share, When to Isolate

| | Share (way 1) | Isolate (way 2) |
| --- | --- | --- |
| How to attach | drop the compiled graph into `add_node` | wrap in a function node |
| State flow | same-name key → reducer merges automatically | manual mapping (in / out) |
| Context | the whole thing is visible | only what you curated |
| Code | less | more mapping code |

**Where sharing fits:** when several nodes naturally continue one conversation thread. A single agent loop, or a swarm where you *deliberately* share the full context. Less code, more intuitive.

**Where isolation fits:** when you need a *boundary*. (a) cutting context pollution to give each agent a clean input, (b) separating per-agent domain context, (c) when inner and outer schemas differ, and (d) **least privilege for sensitive info** — not letting an upstream agent's sensitive data flow wholesale to downstream agents, but mapping down only what that agent needs. Part 8 said "you must explicitly curate what goes into the handoff `update` each time"; isolation is the way to **enforce that curation through graph structure** — split the channels and only the necessary bits are wired to go in, by construction.

And even when you isolate, there are *facts several agents must share* — don't pass those via `messages`; put them in Part 6's `Store`. Two axes, then: **the conversation thread via share/isolate, shared facts via the Store.**

## Wrap-up

There are only two ways a subgraph exchanges state with the outside. **Give them a key with the same name and the parent's reducer merges what the subgraph returns into that key (share); wrap it in a function and you decide what goes in and what comes up (isolate).**
