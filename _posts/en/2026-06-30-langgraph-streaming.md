---
title: "LangGraph Part 9 — Streaming Isn't Token Streaming"
date: 2026-06-30
lang: en
tags: [langgraph, langchain, llm, python]
series: langgraph
seriesOrder: 9
description: "Say 'streaming' and people picture the ChatGPT effect — characters dropping in one at a time. LangGraph's .stream() does that too, but it's only one of five modes. The more fundamental thing is that the graph sends out each step as it advances — at the same superstep boundary where Part 5 wrote a checkpoint, this time it emits instead of saves. stream_mode picks what comes out at that boundary. We take apart the output shapes to show values/updates are step-unit while messages is token-unit, on a different axis, and end by wiring the graph to a FastAPI SSE endpoint."
---

**In [Part 5](/en/blog/langgraph-checkpointer/) I said "a checkpoint is written at every superstep."** That meant state gets saved at that boundary each time the graph advances a step. Streaming is a different action at the same boundary — instead of saving, it sends the state out.

Say "streaming" and people picture the ChatGPT effect, characters dropping in one at a time. LangGraph's `.stream()` does that too. But that's only one of five stream modes, and the other four emit not tokens but **the graph's progress**. So in LangGraph, streaming is less about flushing tokens and more about **watching the graph execute, one step at a time**, and `stream_mode` is the knob for picking what you pull out at that boundary.

> Versions: based on `langgraph >= 0.2, < 0.3`. `get_stream_writer` lives in `langgraph.config` and landed mid-0.2.x (before that, a node received a `StreamWriter` injected into its signature). Use `astream_events` with an explicit `version="v2"` — the v1/v2 event schemas differ, and the 1.0 line changes it again, so check it in your own environment.

## `.stream()` emits steps

Start with the smallest graph. Run a two-node, sequential graph through `.stream()` and instead of a single final value like `.invoke()`, you get **one chunk per step**.

```python
for chunk in graph.stream(inputs, stream_mode="updates"):
    print(chunk)
```

The same step comes out in a different shape depending on the `stream_mode` you pass. Here are two modes side by side.

```python
# stream_mode="updates" — only what the node that ran "returned," keyed by node name
{"retrieve": {"docs": ["doc1", "doc2"]}}
{"generate": {"messages": [AIMessage("...")]}}

# stream_mode="values" — the "full accumulated state" after that step
{"question": "recommend a headache med", "docs": []}
{"question": "recommend a headache med", "docs": ["doc1", "doc2"]}
{"question": "recommend a headache med", "docs": ["doc1", "doc2"], "messages": [AIMessage("...")]}
```

The two modes are two representations of the same event at the same superstep boundary.

- `updates` is exactly the **node return convention** from [Part 2](/en/blog/langgraph-state-design/) — a node returns a partial dict, and `updates` streams that partial dict as-is, keyed by node name. You see "who changed what this step."
- `values` is the **full snapshot** after that partial dict has been merged into the accumulated state by the reducer. You see "what the state looks like when this step ends."

So fold `updates` together with the reducer from the start and you get `values`. Which one you want is up to the consumer — if you only need the per-step delta (logging, a progress display), `updates`; if you need the full state at each step (drawing state straight into a UI), `values`.

Keying by node name earns its keep in something like the fan-out from [Part 3](/en/blog/langgraph-send/). When several nodes run in parallel within one superstep, each node's return is carried out **keyed by its name**, so you can tell which output came from whom.

## `messages` mode is tokens, not steps

The two modes so far come out at superstep boundaries — one chunk each time a node finishes. But that token stream people call "streaming" has a different boundary: it comes out each time the LLM **inside** a node emits a single token.

```python
for chunk, metadata in graph.stream(inputs, stream_mode="messages"):
    print(chunk.content, end="")        # AIMessageChunk — a token piece
    # metadata["langgraph_node"] == "generate" tells you which node the token came from
```

A chunk in `messages` mode is a `(message_chunk, metadata)` tuple. `message_chunk` is the token piece the model emitted (`AIMessageChunk`), and `metadata` carries **which model call in which node** produced it. It doesn't wait for the node to finish — it flows out as the model generates.

So `messages` is on a different axis from the other two. `values`/`updates` are keyed on "a step finished"; `messages` is keyed on "a token came out." If a model generates 200 tokens inside one node, `messages` streams 200 chunks, while that node emits just one chunk in `updates` (when the node ends). To draw a token-level UI you have to split on `metadata`'s `langgraph_node` — "is the token streaming right now from the answer node or from an intermediate summary node?" — otherwise the tokens meant for the user get mixed in with internal ones.

## The five stream modes

There are five `stream_mode`s, each showing a different face of the superstep.

| Mode | Chunk unit | Chunk shape | When |
| --- | --- | --- | --- |
| `values` | step | full accumulated state | drawing the whole state each step |
| `updates` | step | `{node_name: return dict}` | per-step delta / progress log |
| `messages` | token | `(AIMessageChunk, metadata)` | streaming the answer token by token |
| `custom` | arbitrary | whatever the node writes | in-node progress ("12 of 50 processed") |
| `debug` | step (detailed) | task start/result and other detailed events | tracing / debugging graph behavior |

`custom` is for when you want to emit something directly from inside a node — not LLM tokens, not a step boundary, but e.g. a progress message like "processing 12 of 50 documents."

```python
from langgraph.config import get_stream_writer

def process_docs(state):
    writer = get_stream_writer()
    for i, doc in enumerate(state["docs"]):
        writer({"progress": f"{i + 1}/{len(state['docs'])}"})   # flows out on the custom stream
        ...
    return {...}
```

Whatever you write with `writer(...)` comes out to a consumer reading `stream_mode="custom"`. It's the place to show the user "not stuck, actually working" in tool or retrieval nodes where the model isn't emitting tokens.

You can turn on several modes at once. Pass a list and each chunk comes prefixed with **which mode it came from**.

```python
for mode, chunk in graph.stream(inputs, stream_mode=["updates", "messages"]):
    if mode == "messages":
        token, meta = chunk
        ...                     # update the token UI
    elif mode == "updates":
        ...                     # step progress log
```

When you want to stream tokens and also receive step progress — nearly every real chat UI is this combination. The answer is drawn a character at a time with `messages`, and step indicators like "searching → generating" come through `updates`.

## Inside a subgraph is invisible by default

With the multi-agent setup from [Part 8](/en/blog/langgraph-multi-agent/), or a structure with a graph nested inside a node ([Part 8.5](/en/blog/langgraph-subgraph-state/)), there's a trap. `.stream()` on the outer graph emits chunks **at the outer-node granularity only** by default — a subgraph is treated as a single node, so what runs inside it is invisible. While an agent node spins for a while calling three tools, from the outside it shows up as one lump: "agent node running."

To see inside, turn on `subgraphs=True`.

```python
for namespace, chunk in graph.stream(inputs, stream_mode="updates", subgraphs=True):
    # namespace == () is the outer graph; ("agent:<id>",) means a step inside that subgraph
    print(namespace, chunk)
```

Now each chunk is prefixed with a namespace tuple pointing at **which graph it came from**. An empty tuple is the outer graph; a non-empty one is inside that subgraph. You need this to see "which step of which agent is running right now" in a multi-agent graph. Turn on several modes and namespace, mode, and chunk all come attached together.

## Exposing the graph to a server

Streaming actually earns its keep when you push these chunks out to an external client like a browser, in real time. Use the async `astream` and each chunk that flows out becomes one SSE (Server-Sent Events) event, with almost nothing to convert in between.

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
            yield f"data: {token.content}\n\n"      # the token straight to SSE
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

`stream_mode` isn't always enough. When you need **finer-grained events** like "a model call started / a tool finished / entered this step of the chain," you go to `astream_events(..., version="v2")`. Events like `on_chat_model_stream` and `on_tool_end` come out by type. But the event volume is high and the schema is version-sensitive, so for the common case where you only need tokens and step progress, `stream_mode` is easier to work with. If what you actually want is to inspect the execution as a trace, you generally reach for an observability tool like LangSmith.

## Wrapping up

LangGraph's streaming isn't about flushing tokens — it's about watching the graph execute one step at a time from the outside, and `stream_mode` picks what you pull out at each step. `values` and `updates` are step-unit chunks from the superstep boundary, so the return convention and reducer from [Part 2](/en/blog/langgraph-state-design/) show through directly; `messages` comes out token-by-token from a model call inside a node, on a different axis. `custom` is progress the node emits itself, and `subgraphs=True` is the switch that opens up the inner graph.
