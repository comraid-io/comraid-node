# `@comraid/node`

Node.js client for the ComRaid API. Push Channel methods are thin clients over REST: **Single send** and **Broadcast** create **Messages** (`/messages`); on the push Channel those are **Notifications**. **Multi-send** creates a **Campaign** (`/campaigns`). Contacts are addressed by `external_user_id` via Endpoints / Subscriptions. The SDK sets `channel: push` and nests push Content under `content.push`.

```js
import { ComRaid } from "@comraid/node";

const comraid = new ComRaid({
  apiKey: process.env.COMRAID_API_KEY,
  baseUrl: process.env.COMRAID_BASE_URL,
});

// Single send — named Contacts by External user ID
await comraid.push.send({
  to: { external_user_ids: ["user_a", "user_b"] },
  content: { title: "Hello", body: "World" },
  idempotencyKey: comraid.createIdempotencyKey(),
});

// Rich push fields (OpenAPI `content.push`) — optional; nested under content.push as-is.
// `deep_link` is delivered to devices as `cr_deep_link` in FCM/APNs data.
await comraid.push.send({
  to: { external_user_ids: ["user_a"] },
  content: {
    title: "Order shipped",
    body: "Your package is on the way",
    deep_link: "myapp://orders/42",
    sound: "shipping",
    subtitle: "Tracking update",
    badge: 3,
    thread_id: "orders",
  },
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

// Contacts + attributes
await comraid.contacts.create({
  external_user_id: "user_a",
  name: "Ada",
  attributes: { plan: "pro" },
});
await comraid.contacts.upsert("user_a", { locale: "en-US" });
await comraid.attributes.upsert("user_a", { attributes: { seats: 3 } });

// Message status / cancel
const detail = await comraid.messages.get(messageId);
await comraid.messages.cancel(messageId);

// Segments
const { segments } = await comraid.segments.list();
const created = await comraid.segments.create({
  name: "Pro users",
  rules: { operator: "and", conditions: [{ field: "attr.plan", op: "eq", value: "pro" }] },
});
await comraid.segments.archive(created.segment_id);
```

Further Channels can land as additive namespaces (for example `comraid.whatsapp.send`) without changing push.

The client also exposes a generic `request()` with bearer authentication, configurable fetch transport, timeouts, cancellation, bounded retries, `Retry-After` handling, idempotency keys, structured API errors, query encoding, and JSON parsing. Mutating requests are retried only when an idempotency key is present.

Types in `src/index.d.ts` track the public OpenAPI document (`server/src/openapi/openapi.yaml`). `test/openapi-types.test.js` asserts the schema and `operationId` names the SDK claims still exist (set `COMRAID_OPENAPI` if the sibling server checkout is not discoverable).
