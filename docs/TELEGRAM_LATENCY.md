# Why Telegram wizard replies can take 60–90+ seconds

## What’s going on

The webhook returns **200 immediately** and handles the message in the background. The reply is only sent **after** the full wizard run finishes. Cloud Run logs showed a single run taking **~88 seconds** (`durationMs: 88599`), so users see a long pause before the bot answers.

## Why the wizard run is slow

1. **Plan tier and SDK**
   - **Starter**: `openai-chat`, 1 turn → usually fast (one LLM call).
   - **Professional**: `openai-agents`, up to 6 turns → can be 20–60s.
   - **Enterprise / custom**: `anthropic-agentic`, up to **20** (or 50) turns → often **60–90+ seconds**.
   - The tenant (e.g. TIN) is likely on **enterprise** or **custom**, so every message runs the full Anthropic Agent SDK.

2. **Multiple turns**
   - Each “turn” is: call Claude → optional tool/MCP use → call again. The SDK keeps going until it decides it’s done or hits `maxTurns`.
   - Builder wizard allows **14 turns**; enterprise overrides to **20**. So one “hello” can still trigger a full agent loop (reasoning + tool consideration + reply).

3. **No streaming**
   - We wait for the **entire** agent run to complete, then send one final message. There is no streaming of tokens to Telegram, so the user sees nothing until the run finishes.

4. **Extra work before/after**
   - Optional **orchestrator** (one cheap LLM call to route to a wizard).
   - **Memory** (semantic / episodic / working) can add a few seconds.
   - **MCP** setup and any tool calls add latency.

So the 88s is mostly: **Anthropic Agent SDK doing multiple round-trips (and possibly tool steps) with no streaming.**

## What we did to improve UX

- **Typing indicator**: The webhook sends `sendChatAction(typing)` right away and every 4s until the reply is sent, so the user sees “MagicWizard is typing…” instead of no feedback.

- **Telegram max-turns cap**: When `channel === "telegram"`, the wizard run uses at most 3 turns (see `wizard-service.ts`), so replies typically finish in 10–30 seconds instead of 60–90+.

## Options to make replies faster

1. **Use a faster plan for Telegram**
   - Put the Telegram-linked tenant on **starter** (or a plan that uses `openai-chat` and 1 turn) if you want quick, single-turn replies. Trade-off: no multi-turn agent or MCP for that tenant.

2. **Lower `maxTurns` for Telegram**
   - In code, you could cap `maxTurns` when `channel === "telegram"` (e.g. 2–3) so the agent stops after a couple of steps. Fewer turns → lower latency, but less capable for complex tasks.

3. **Faster model**
   - Tenant or default model: e.g. **claude-3-5-haiku** or **gpt-4.1-mini** instead of sonnet/opus. Shorter time-to-first-token and total time, at the cost of quality.

4. **Streaming (larger change)**
   - Use Telegram “edit message” or send a first chunk quickly, then stream/append. Requires changing the agentic adapter and Telegram sender to support streaming; not implemented today.

5. **Immediate “hold on” message**
   - Send a short message like “One moment…” right away, then send the full reply when the run completes. Simple to add; user gets two messages.

## Where it’s configured

- **Plan → SDK / maxTurns**: `packages/@magicwizards/wizards-core/src/cost-routing.ts` (`COST_PROFILES`).
- **Wizard maxTurns**: `packages/@magicwizards/wizards-core/src/definitions.ts` (e.g. Builder `maxTurns: 14`).
- **Default model**: `apps/wizards-api/src/config.ts` (`runtime.defaultModel`); tenant override in DB `tenants.wizard_model`.
