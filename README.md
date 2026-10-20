# `@comraide/node`

Node.js client for the ComRaid API. Push Channel methods are thin clients over REST: **Single send** and **Broadcast** create **Messages** (`/messages`); on the push Channel those are **Notifications**. **Multi-send** creates a **Campaign** (`/campaigns`). Contacts are addressed by `external_user_id` via Endpoints / Subscriptions. The SDK sets `channel: push` and nests push Content under `content.push`.

```js
import { Comraide } from "@comraide/node";

const comraid = new Comraide({
  apiKey: process.env.COMRAID_API_KEY,
  baseUrl: process.env.COMRAID_BASE_URL,
});

// Single send — named Contacts by External user ID
await comraid.push.send({
  to: { external_user_ids: ["user_a", "user_b"] },
  content: { title: "Hello", body: "World" },
  idempotencyKey: comraid.createIdempotencyKey(),
});

// Broadcast — Segment, ad-hoc rules, or everyone
await comraid.push.broadcast({
  targeting: { everyone: true },
  content: { title: "Hello", body: "Everyone" },
});

// Multi-send — per-Contact Contents → Campaign
await comraid.push.multiSend({
  recipients: [
    { external_user_id: "user_a", content: { title: "Hi A", body: "Welcome A" } },
    { external_user_id: "user_b", content: { title: "Hi B", body: "Welcome B" } },
  ],
});
```

Further Channels can land as additive namespaces (for example `comraid.whatsapp.send`) without changing push.

The client also exposes a generic `request()` with bearer authentication, configurable fetch transport, timeouts, cancellation, bounded retries, `Retry-After` handling, idempotency keys, structured API errors, query encoding, and JSON parsing. Mutating requests are retried only when an idempotency key is present.

Push Content and response types in `src/index.d.ts` are derived from the public OpenAPI document (`docs/public/openapi.yaml`).
