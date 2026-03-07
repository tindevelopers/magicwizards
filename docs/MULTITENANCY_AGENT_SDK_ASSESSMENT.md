# Multi-Tenancy and Anthropic Agent SDK — Assessment

This document assesses whether Magic Wizards agents are built for multi-tenancy **relative to Anthropic’s official guidance** (container-per-task / container-per-tenant, not shared process), and what the three deployment patterns imply for us.

**References:**

- [Hosting the Agent SDK](https://docs.anthropic.com/en/api/agent-sdk/hosting) — container-based sandboxing, ephemeral vs long-running vs hybrid patterns.
- [Enterprise deployment overview](https://docs.anthropic.com/en/docs/claude-code/third-party-integrations) — Teams/Enterprise vs self-hosted.
- Community reports: SDK init ~20–30s when **new SDK instances** are created in server environments; Anthropic recommends **container-per-tenant** (ephemeral or persistent), not a shared process.

---

## 1. What We Have Today

### 1.1 Data-level multi-tenancy ✅

- **Tenant boundary on every wizard run:** `runWizardForTenant({ tenantId, tenant, prompt, ... })`.
- **Tenant-scoped data:** Sessions, usage, memory, and MCP config are keyed by `tenant_id`; RLS and indexes enforce isolation.
- **No cross-tenant leakage in app logic:** Session, usage, and memory services always take `tenantId`; Telegram resolution yields `identity.tenantId` before running a wizard.

So we are **multi-tenant aware** and safe at the **data layer**.

### 1.2 Process / runtime model ⚠️

- **Single shared process:** `wizards-api` is one Node process (e.g. one Cloud Run container or one server instance).
- **Single shared WizardRuntime:** One `WizardRuntime` instance is created at module load in `wizard-service.ts` and reused for all tenants and all requests.
- **Anthropic adapter:** Uses `@anthropic-ai/claude-agent-sdk` via dynamic `import()` and calls `query(input)` per request. There is **no** per-tenant or per-task container; all tenants share the same process and the same runtime.

So we use a **shared-process** model, not a **container-per-tenant** or **container-per-task** model.

### 1.3 Deployment

- **wizards-api:** Deployed as one service (e.g. Cloud Run: one container type, N instances for scaling). Not “one container per tenant” or “one container per task.”
- **Admin/Portal:** On Vercel; they call wizards-api. No agent SDK runs in Vercel.

---

## 2. Anthropic’s Official Multi-Tenant / Hosting Guidance

From **Hosting the Agent SDK**:

- The SDK **should run inside a container-based sandbox** (process isolation, resource limits, network control).
- **Multi-tenancy** is supported by using **containers per tenant/task**, not by running many tenants in one process.

The three patterns that match your note (plus the fourth from the docs):

| Pattern | Description | Pros | Cons |
|--------|-------------|------|------|
| **1. Ephemeral containers** | New container per user task → run SDK → destroy. | Strong isolation, scale-to-zero, no cross-tenant state. | Cold start (~3–5s Cloud Run), cost per invocation. |
| **2. Persistent warm containers** | One (or more) long-lived container(s) per tenant, SDK runs inside. | No cold start, conversational context. | ~\$0.05/hr per container → e.g. \$3,600/mo for 100 always-on tenants before API cost. |
| **3. Pooled containers + queue** | Requests → queue → pool of warm containers → route to free container. | Good cost/performance at scale. | More complex: queue, session affinity, routing. |
| **4. Single container, multiple agents** | Multiple SDK processes in one container. | Possible. | Least recommended; must avoid agents stepping on each other. |

So **multi-tenancy with the Agent SDK is intended to be done via container-per-task or container-per-tenant**, not a single shared process handling all tenants.

---

## 3. Gap: We Are Not Aligned With Container-Per-Tenant/Task

- We do **not** today:
  - Spin up an ephemeral container per wizard run (Pattern 1).
  - Assign a dedicated long-lived container per tenant (Pattern 2).
  - Use a pool of containers with a queue (Pattern 3).
- We **do**:
  - Run one wizards-api process (and one `WizardRuntime`) that serves all tenants and calls the SDK’s `query()` from that shared process.

So by Anthropic’s hosting guide, we are **not** using the recommended multi-tenant **runtime** model (container-based isolation). We are using a **shared process** model with strong **data** isolation.

---

## 4. Implications

### 4.1 Isolation and security

- **Data:** Tenant data is isolated by `tenant_id` and RLS; we do not leak sessions, memory, or usage across tenants in app code.
- **Process:** All tenants share the same Node process and same runtime. The SDK’s `query()` may spawn subprocesses or do per-call work; that runs in the same OS process as other tenants. So we have **no process/container-level isolation** between tenants, only application-level isolation.

For many SaaS use cases this is acceptable; for strict “strongest isolation” requirements (e.g. regulatory or threat model requiring process/container boundaries), we would need to move toward Pattern 1, 2, or 3.

### 4.2 Performance (20–30s init)

- Community reports: **creating new SDK instances** in a server can take ~20–30s. In our code we do **not** explicitly create “SDK instances”; we call `query(input)` once per request after a dynamic `import()` of the SDK.
- If `query()` (or the SDK internals) effectively creates a new heavy context/subprocess per call, we could see high latency or serialization under concurrency. If it reuses internal state, we avoid that cost but still run in a shared process.
- **Recommendation:** Under load, measure wizard latency and concurrency; if we see ~20–30s spikes or serialization, treat that as evidence the SDK is doing heavy per-request init and consider moving to **ephemeral containers (Pattern 1)** so each task gets its own container (and cold start is bounded and explicit).

### 4.3 Cost and scale

- **Current:** One wizards-api service; cost is API tokens + compute for that service. No per-tenant container cost.
- **Pattern 1 (ephemeral):** Cost per invocation + cold start; good for task-based, scale-to-zero.
- **Pattern 2 (warm per tenant):** High baseline cost at many tenants; good for always-on conversational agents.
- **Pattern 3 (pool):** Balances cost and latency; more engineering (queue, routing, affinity).

---

## 5. Summary Table

| Dimension | Current state | Anthropic recommendation (multi-tenant) |
|----------|----------------|------------------------------------------|
| **Data isolation** | ✅ tenant_id everywhere, RLS, no cross-tenant leakage | N/A (app responsibility) |
| **Process/container isolation** | ❌ Single process, single runtime, all tenants shared | ✅ Container-per-task or container-per-tenant (ephemeral or long-running) |
| **SDK usage** | `query()` from shared process, no per-tenant container | Run SDK inside dedicated sandboxed container per task/tenant |
| **Deployment** | One wizards-api service (e.g. Cloud Run, N replicas) | Ephemeral containers, or warm containers per tenant, or pool + queue |

---

## 6. Recommendations

1. **Keep current design for now**  
   Data-level multi-tenancy is solid. For moderate scale and non-extreme isolation requirements, the shared-process model is a valid tradeoff.

2. **Document the tradeoff**  
   In architecture and ops docs, state explicitly that we use **shared-process** multi-tenancy with **data** isolation, and that we do **not** use container-per-tenant/task as in Anthropic’s hosting guide.

3. **Validate SDK behavior under load**  
   Run load tests (concurrent wizard runs, multiple tenants). If latency approaches 20–30s or requests serialize, assume per-request SDK init and plan for **Pattern 1 (ephemeral containers)** so each task gets its own container.

4. **When to move to container-based patterns**  
   - **Pattern 1 (ephemeral):** When we need stronger isolation or hit SDK init bottlenecks; accept cold start and per-invocation cost.  
   - **Pattern 2 (warm per tenant):** When we offer “always-on” conversational agents and can afford ~\$0.05/hr per tenant.  
   - **Pattern 3 (pool):** When we need both scale and acceptable latency and are ready to build queue + routing + session affinity.

5. **Cursor rule**  
   Add a rule (see below) so that future work on agent deployment and scaling assumes Anthropic’s container-based hosting and the three patterns above, and avoids relying on “many tenants in one SDK process” as the long-term production model.

---

## 7. Cursor Rule Snippet (Agent SDK Hosting)

Add to `.cursor/rules` (e.g. in `magicwizards.mdc` or a dedicated `agent-sdk-hosting.mdc`):

```markdown
## Agent SDK hosting (Anthropic)

- Multi-tenancy with the Claude Agent SDK should follow Anthropic’s hosting guide: container-based sandboxing, not a single shared process for all tenants.
- Prefer: (1) Ephemeral container per task, or (2) Persistent container per tenant, or (3) Pooled containers + queue. Avoid relying on one process running the SDK for many tenants as the only isolation.
- When changing wizards-api deployment or scaling, consider cold start (ephemeral) vs always-on cost (warm) and document which pattern is in use.
```

---

*Last updated: 2025-02-28*
