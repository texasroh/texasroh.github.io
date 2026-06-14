---
title: "LangGraph Part 6 — The Checkpointer Doesn't Cross Threads"
date: 2026-06-05
lang: en
tags: [langgraph, langchain, llm, python]
description: "Part 5's checkpointer remembers 'this conversation.' But change the thread_id and that memory is gone whole. Memory that persists across a user lives in the Store, not the checkpointer. short-term (thread) and long-term (cross-thread) aren't the same axis — the Store interface, namespaces, semantic search, and the problem that PHI becomes permanent and searchable."
---

**In Part 5 I called the checkpointer 'the persistence layer under the graph run.'** True. But that memory can't get past a single `thread_id`. What the checkpointer remembers is *this conversation* — so the moment a user opens a new window and the `thread_id` changes, yesterday's conversation sits in another thread, out of reach. Wave it off with "I added a checkpointer, so memory's done," and your user meets a chatbot that forgot what they said yesterday.

Memory that survives *across* conversations is a different kind of thing. LangGraph calls it the **Store**. If the checkpointer remembers *this conversation*, the Store remembers *this user* — they're not even the same axis.

> **LangGraph Series**
> 1. [Your First Graph — Only Where LCEL Falls Short](/en/blog/langgraph-first-graph/)
> 2. [State Design — Schema and Merge Rule](/en/blog/langgraph-state-design/)
> 2.5. [MessagesState Isn't a Special State](/en/blog/langgraph-messages-state/)
> 3. [Send — Dynamic Fan-out Edges Can't Draw](/en/blog/langgraph-send/)
> 4. [An Interrupt Doesn't Pause the Graph](/en/blog/langgraph-human-in-the-loop/)
> 5. [A Checkpoint Isn't Only for Pausing](/en/blog/langgraph-checkpointer/)
> 6. **The Checkpointer Doesn't Cross Threads** ← this post
> 7. [create_react_agent Is Not Magic](/en/blog/langgraph-react-agent/)
> 8. [Multi-Agent Doesn't Mean Agents Talk to Each Other](/en/blog/langgraph-multi-agent/)
> 8.5. [A Subgraph Can Share State, or Isolate It](/en/blog/langgraph-subgraph-state/)

> Versions: based on `langgraph >= 0.2, < 0.3`. The Store is split across packages too — `BaseStore`/`InMemoryStore` live in the `langgraph.store.*` core, `PostgresStore` in `langgraph-checkpoint-postgres`. The `index` option for semantic search stabilized relatively recently, so the argument shape changes often between versions. Check yours before relying on it.

## The checkpointer remembers only one thread

Part 5's mental model was "a checkpoint is written at every superstep." Those checkpoints all pile up **inside a single `thread_id` sequence**. A different `thread_id` won't even show up in `get_state_history` — it's a different sequence to begin with.

```python
# Monday's conversation
cfg_mon = {"configurable": {"thread_id": "patient-42-mon"}}
app.invoke({"messages": [("user", "I'm allergic to penicillin")]}, cfg_mon)

# Tuesday, a new chat window -> a new thread_id
cfg_tue = {"configurable": {"thread_id": "patient-42-tue"}}
app.invoke({"messages": [("user", "recommend something for a headache")]}, cfg_tue)
#   Tuesday's graph has no idea about the "penicillin allergy."
#   Monday's checkpoints live only in the patient-42-mon sequence.
```

You might ask: can't I just pin one `thread_id` per user (a single `patient-42`)? You can — but it means *all of that user's conversations become one thread that grows without bound.* The context balloons whole every time, isolation like "just this session, separately" disappears, and corruption in one thread poisons that person's entire history. **Per-conversation isolation (thread) and per-user persistence (memory) are different requirements, and the moment you try to solve both with a single thread_id, you break both.**

So LangGraph splits the axis in two.

| | checkpointer (short-term) | Store (long-term) |
|---|---|---|
| Scope | one `thread_id` | namespace (thread-independent) |
| Unit | superstep checkpoint sequence | key-value (+ optional embedding) |
| Question | "how far has this conversation gotten" | "what do I know about this user" |
| Lifetime | usually meaningless once the chat ends | across conversations, until explicitly deleted |
| Interface | `BaseCheckpointSaver` | `BaseStore` |

## The Store is a key-value partitioned by namespace

`BaseStore` is an **interface**, like the checkpointer, and the implementations (`InMemoryStore`, `PostgresStore`) differ only in durability — the same Memory/Sqlite/Postgres setup as Part 5. The difference is *what* you store. Where the checkpointer saves a whole "graph state snapshot," the Store holds **facts you pick yourself**, partitioned into cells by namespace.

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()

# A namespace is a tuple — usually (user, category) to carve out cells
ns = ("patient-42", "facts")

store.put(ns, "allergy", {"text": "penicillin allergy", "source": "2026-06-01 intake"})
store.put(ns, "pref",    {"text": "prefers oral meds over injections"})

store.get(ns, "allergy").value        # {'text': 'penicillin allergy', ...}
[i.key for i in store.search(ns)]     # ['allergy', 'pref']  — the whole namespace
```

The key point is that the namespace is **completely independent of `thread_id`**. `("patient-42", "facts")` points at the same cell whether you use it from Monday's thread or Tuesday's. That's what "memory across threads" really is — not magic, just *a separate store that isn't tied to a conversation ID*.

## Using the Store inside a node: it gets injected

You plug the Store into `compile` **alongside** the checkpointer. Then, if a node function declares a `store` parameter, LangGraph injects it at runtime — the same way `config` is injected.

```python
from langgraph.store.base import BaseStore
from langgraph.graph import StateGraph, START, END

def respond(state: State, config, *, store: BaseStore) -> dict:
    user = config["configurable"]["user_id"]
    ns = (user, "facts")

    # 1) Before answering, pull what we know about this user (even from other threads)
    known = "\n".join(i.value["text"] for i in store.search(ns))

    answer = llm.invoke(f"Patient info:\n{known}\n\nQuestion: {state['question']}")

    # 2) Write down what we learned this turn, for the next thread
    if fact := extract_fact(answer):
        store.put(ns, fact["key"], {"text": fact["text"]})

    return {"answer": answer}

# checkpointer and store are different axes, so you plug in both
app = graph.compile(checkpointer=checkpointer, store=store)

# thread_id changes per conversation, but user_id is pinned per user
app.invoke(
    {"question": "recommend something for a headache"},
    {"configurable": {"thread_id": "patient-42-tue", "user_id": "patient-42"}},
)
#   Even on Tuesday's thread, store.search pulls the "penicillin allergy" saved Monday.
```

You can see the flow — **read from long-term on node entry (`search`), write to long-term on node exit (`put`).** Unlike the checkpointer, which automatically snapshots the entire state, the Store makes *you explicitly choose what to remember.* That's both its strength and its burden: because it isn't automatic, you can avoid leaking PHI wholesale, but you have to decide "what's worth remembering" every time.

## Semantic search: pull by meaning without knowing the key

`store.get(ns, "allergy")` requires the exact key. But usually you want "past facts relevant to this question," not a key you've memorized. The Store supports **meaning-based search** if you attach an embedding index to the namespace.

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore(
    index={"embed": embeddings, "dims": 1536, "fields": ["text"]}
)
# Embeds and indexes the 'text' field

store.put(("patient-42", "facts"), "a1", {"text": "penicillin allergy"})

# Search by the meaning of the question, without knowing the key
hits = store.search(("patient-42", "facts"), query="is it safe to prescribe antibiotics?", limit=3)
#   "penicillin allergy" surfaces by semantic relevance — even with no overlapping words.
```

Here LangGraph absorbs half of RAG's retrieval. But *absorbs* doesn't mean *replaces* — the embedding model, the dimensions, which fields to index are still yours to set, and if you need large-scale vector search a dedicated vector DB is better. The Store's semantic search is the kind that's *attached to* the graph, suited to the scale of "facts an agent remembers about a user."

## Clinical angle: long-term magnifies Part 5's security problem

At the end of Part 5 I said "the moment you use a saver that writes to disk, the checkpoint is another data store, and PHI stays there in plaintext." **The Store inherits that problem as-is, and adds two more.**

- **It persists *permanently*, across threads.** Checkpoints are at least "per conversation," so you can hang a retention policy on thread expiry. A Store fact is by definition something you put there *to outlive the conversation.* PHI that lands once in `("patient-42", "facts")` gets re-read in every future conversation until you explicitly delete it.
- **It becomes searchable.** If you attached a semantic index, PHI lives not just as *plaintext storage* but *as embeddings* too. Embeddings are a blind spot for masking — even if you tokenized and hid the source text, meaning can be reconstructed from the embedding vector. You need a design that limits the indexed `fields` to non-PHI.

The rule I hold in practice is simple: **put only identifiers and "pointers to facts whose worth has been verified" in the Store; keep raw PHI in a separate secure store.** And if you make the first key of the namespace the patient identifier, then when a right-to-be-forgotten request comes in, you just delete that patient's one namespace.

This matters because the same thing is far harder on the checkpointer side. In Part 5 the deletion right collided with time-travel for two reasons — a person's state is scattered across multiple threads, and within each across every superstep checkpoint, and on top of that, old state you thought you'd deleted lingers in past checkpoints and gets queried again. To "delete just this patient's data," you'd have to track down all of that scatter. The Store, by contrast, keeps a given user's facts gathered in one namespace, so "what to delete, and where" is clear from the start. The catch: this isn't the Store doing it for you — it's the payoff of partitioning by identifier, as above.

## Wrapping up

If Part 5 was "checkpointer = the persistence layer under the graph run," Part 6's one line is that the layer has a **boundary** — the `thread_id`. Inside that line is short-term (this conversation), outside it is long-term (this user), and the outside belongs to the **Store**, not the checkpointer. They're two memories on different axes, plugged in side by side via `compile(checkpointer=..., store=...)`.

So "I added memory with LangGraph" deserves the question: which of the two? If it's *continuing this conversation*, the checkpointer is the whole story. If it's *remembering across the user*, you design a Store separately — and the moment you do, you also take on the burden that PHI becomes a permanent, searchable artifact.

That closes out the persistence axis. In the next post (Part 7, Phase 5), I take apart what a prebuilt agent like `create_react_agent` — sitting on top of this checkpointer and Store — **actually is as a graph**, and weigh it against building the graph yourself.
