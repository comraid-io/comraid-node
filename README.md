# `@comraid/node`

Node.js client for the ComRaid API. Push Channel methods are thin clients over REST: **Single send** and **Broadcast** create **Messages** (`/messages`); on the push Channel those are **Notifications**. **Multi-send** creates a **Campaign** (`/campaigns`). Contacts are addressed by `external_user_id` via Endpoints / Subscriptions. The SDK sets `channel: push` and nests push Content under `content.push`.

Canonical long-form docs (Install, Getting started, Method reference): [docs.comraid.io/sdks/node](https://docs.comraid.io/sdks/node). This README stays at method-reference parity with that page.

API keys (`cr_sk_…`) are **backend-only** — never ship them in a mobile or browser app. Use an App ID with the mobile SDKs instead.

## Install

```bash
pnpm add @comraid/node
# or: npm install @comraid/node
```

Requires Node.js 20+.

## Getting started

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

// Single send — Anonymous / known Endpoints by Endpoint id (exactly one of
// external_user_ids or endpoint_ids)
await comraid.push.send({
  to: { endpoint_ids: ["2344b756-df66-4311-b3a9-433fd48e8e59"] },
  content: { title: "Hello", body: "Endpoint" },
  ttl: 3600,
  collapse_key: "order-42",
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

// Segments (full CRUD + restore)
const { segments } = await comraid.segments.list();
const rules = {
  operator: "and",
  conditions: [{ field: "attr.plan", op: "eq", value: "pro" }],
};
const created = await comraid.segments.create({ name: "Pro users", rules });
await comraid.segments.get(created.segment_id);
await comraid.segments.update(created.segment_id, {
  name: "Pro users (v2)",
  rules,
});
await comraid.segments.archive(created.segment_id);
await comraid.segments.restore(created.segment_id);

// Escape hatch — any OpenAPI path the SDK does not wrap
const campaign = await comraid.request({
  method: "GET",
  path: `/campaigns/${campaignId}`,
});
```

Further Channels can land as additive namespaces (for example `comraid.whatsapp.send`) without changing push.

Types in `src/index.d.ts` track the public OpenAPI document (`server/src/openapi/openapi.yaml`). `test/openapi-types.test.js` asserts the schema and `operationId` names the SDK claims still exist (set `COMRAID_OPENAPI` if the sibling server checkout is not discoverable).

---

## Method reference

Grouped by lifecycle. Depth: signature, purpose, parameters, returns. Clustered examples live under [Getting started](#getting-started).

### Configure / client

#### `new ComRaid(options)`

Constructs a client. By default builds a [`FetchTransport`](#fetchtransportoptions) from `apiKey` / `baseUrl`. Pass a custom `transport` instead when you need a different HTTP stack.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `options.apiKey` | `string` | yes\* | Project API key (`cr_sk_…`). Backend only. |
| `options.baseUrl` | `string` | yes\* | API origin (no trailing slash required). |
| `options.fetch` | `typeof fetch` | no | Override `globalThis.fetch`. |
| `options.timeoutMs` | `number` | no | Per-attempt timeout; default `15000`. |
| `options.maxRetries` | `number` | no | Retries after the first attempt; `0`–`10`, default `2`. |
| `options.transport` | `Transport` | yes\* | Custom transport; mutually exclusive with the Fetch options above. |

\*Either (`apiKey` + `baseUrl`) **or** `transport`.

**Returns:** `ComRaid` with `push`, `messages`, `contacts`, `attributes`, `segments`, `request`, and `createIdempotencyKey`.

#### `comraid.createIdempotencyKey()`

Generates a UUID suitable for the `Idempotency-Key` header on mutating requests.

**Returns:** `string`

#### `comraid.request(options)`

Generic authenticated request. Use for OpenAPI operations the SDK does not wrap (see [Not wrapped](#not-wrapped)). Mutating methods are retried only when `idempotencyKey` is set (or the HTTP method is inherently idempotent: GET/HEAD/OPTIONS/PUT/DELETE).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `options.method` | `HttpMethod` | no | Default `GET`. |
| `options.path` | `` `/${string}` `` | yes | Path under `baseUrl` (must start with `/`). |
| `options.query` | `Record<string, QueryValue>` | no | Query string values. |
| `options.body` | `unknown` | no | JSON-encoded request body. |
| `options.headers` | `HeadersInit` | no | Extra headers (Authorization is set by the transport). |
| `options.idempotencyKey` | `string` | no | Sent as `Idempotency-Key`. |
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<TResponse>` — parsed JSON body (or empty for no-content responses).

#### `FetchTransport`

Default HTTP transport: bearer auth, JSON encode/decode, timeouts, cancellation, bounded retries, and `Retry-After` handling.

```ts
new FetchTransport(options: FetchTransportOptions)
request<TResponse>(options: RequestOptions): Promise<TResponse>
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `options.apiKey` | `string` | yes | Bearer token. |
| `options.baseUrl` | `string` | yes | API origin. |
| `options.fetch` | `typeof fetch` | no | Fetch implementation. |
| `options.timeoutMs` | `number` | no | Default `15000`. |
| `options.maxRetries` | `number` | no | Default `2`. |

Implement `Transport.request` yourself if you inject a custom `transport` into `ComRaid`.

### Send (push Notifications)

Helpers set `channel: push` and nest caller Content under `content.push`. Full HTTP shapes: [API Reference](https://docs.comraid.io/api-reference).

#### `comraid.push.send(input)` → OpenAPI `createMessage` (Single send)

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `input.to` | `PushSendTo` | yes | Exactly one of `external_user_ids` (named Contacts) or `endpoint_ids` (Endpoint ids). |
| `input.content` | `PushContent` | yes | Push title/body and optional rich fields. |
| `input.category` | `string` | no | Notification category. |
| `input.type` | `string` | no | Message type label. |
| `input.name` | `string` | no | Dashboard / reporting name. |
| `input.priority` | `"high" \| "normal"` | no | Delivery priority. |
| `input.ttl` | `number` | no | Time-to-live in seconds from send time (or from `send_at` when scheduled). |
| `input.collapse_key` | `string` | no | Collapse key so later sends with the same key replace earlier ones on device. |
| `input.data` | `Record<string, unknown>` | no | Custom data object. |
| `input.send_at` | `string \| null` | no | Absolute UTC send time (ISO 8601). Mutually exclusive with `send_at_local`. |
| `input.send_at_local` | `string` | no | Local wall-clock datetime without timezone. Mutually exclusive with `send_at`. |
| `input.idempotencyKey` | `string` | no | Idempotency key. |
| `input.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<MessageAccepted>` (`message_id`, `status`, …).

#### `comraid.push.broadcast(input)` → OpenAPI `createMessage` (Broadcast)

Same optional fields as `send`, except targeting is `targeting` instead of `to`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `input.targeting` | `TargetingSpec` | yes | Exactly one of `everyone`, `segment_id`, or `rules`. |
| `input.content` | `PushContent` | yes | Push Content. |
| … | | | Same optional fields as `push.send` (`ttl`, `collapse_key`, `send_at` / `send_at_local`, …). |

**Returns:** `Promise<MessageAccepted>`

#### `comraid.push.multiSend(input)` → OpenAPI `createCampaign`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `input.recipients` | `PushMultiSendRecipient[]` | yes | Non-empty; each entry has `external_user_id` + `content` (and optional per-recipient `ttl`, `collapse_key`, …). |
| `input.name` | `string` | no | Campaign name. |
| `input.idempotencyKey` | `string` | no | Idempotency key. |
| `input.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<CampaignAccepted>` (`campaign_id`, per-Message statuses, …).

### Messages

#### `comraid.messages.get(messageId, options?)` → OpenAPI `getMessage`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | `string` | yes | Message id. |
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<MessageDetail>` — includes rollup statuses such as `partial_complete`.

#### `comraid.messages.cancel(messageId, options?)` → OpenAPI `cancelMessage`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | `string` | yes | Message id. |
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<MessageCancelled>`

### Contacts and attributes

#### `comraid.contacts.create(input)` → OpenAPI `createContact`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `input.external_user_id` | `string` | yes | External user ID. |
| `input.name` | `string` | no | Display name. |
| `input.locale` | `string` | no | Locale Property. |
| `input.timezone` | `string` | no | Timezone Property. |
| `input.metadata` | `Record<string, unknown>` | no | Opaque metadata. |
| `input.attributes` | `Record<string, unknown>` | no | Initial Attributes. |
| `input.idempotencyKey` | `string` | no | Idempotency key. |
| `input.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<ContactResponse>`

#### `comraid.contacts.upsert(externalUserId, input?)` → OpenAPI `upsertContact`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | `string` | yes | External user ID path segment. |
| `input` | `ContactUpsert` + keys | no | Partial Contact fields (`name`, `locale`, `timezone`, `metadata`, `attributes`) plus optional `idempotencyKey` / `signal`. |

**Returns:** `Promise<ContactResponse>`

#### `comraid.attributes.upsert(externalUserId, input)` → OpenAPI `upsertContactAttributes`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | `string` | yes | External user ID. |
| `input.attributes` | `Record<string, unknown>` | yes | Attribute map to upsert. |
| `input.idempotencyKey` | `string` | no | Idempotency key. |
| `input.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<ContactResponse>`

### Segments

#### `comraid.segments.list(options?)` → OpenAPI `listSegments`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<SegmentListResponse>` (`{ segments: SegmentSummary[] }`).

#### `comraid.segments.create(input)` → OpenAPI `createSegment`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `input.name` | `string` | yes | Segment name. |
| `input.rules` | `SegmentRules` | yes | `operator` + `conditions`. |
| `input.description` | `string` | no | Description. |
| `input.idempotencyKey` | `string` | no | Idempotency key. |
| `input.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<SegmentCreated>`

#### `comraid.segments.get(segmentId, options?)` → OpenAPI `getSegment`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `segmentId` | `string` | yes | Segment id. |
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<SegmentSummary>`

#### `comraid.segments.update(segmentId, input)` → OpenAPI `updateSegment`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `segmentId` | `string` | yes | Segment id. |
| `input.name` | `string` | yes | Name. |
| `input.rules` | `SegmentRules` | yes | Rules. |
| `input.description` | `string` | no | Description. |
| `input.idempotencyKey` | `string` | no | Idempotency key. |
| `input.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<SegmentSummary>`

#### `comraid.segments.archive(segmentId, options?)` → OpenAPI `archiveSegment`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `segmentId` | `string` | yes | Segment id. |
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<unknown>` (OpenAPI archive response body).

#### `comraid.segments.restore(segmentId, options?)` → OpenAPI `restoreSegment`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `segmentId` | `string` | yes | Segment id. |
| `options.signal` | `AbortSignal` | no | Cancellation. |

**Returns:** `Promise<unknown>` (OpenAPI restore response body).

---

## Errors

Thrown by `FetchTransport` / `request` (and thus every namespace helper):

| Type | When | Notable fields |
|------|------|----------------|
| `ComRaidError` | Non-OK HTTP response, invalid JSON on success, or normalized transport failures | `code?`, `status?`, `requestId?`, `retryable`, `details?` |
| `ComRaidTimeoutError` | Per-attempt timeout (`timeoutMs`) | extends `ComRaidError`; `timeoutMs`; `code: "TIMEOUT"`; `retryable: true` |

Retryable HTTP statuses include `408`, `409`, `425`, `429`, and `5xx`. Mutating non-idempotent methods (e.g. POST without `idempotencyKey`) are **not** retried.

```js
import { ComRaid, ComRaidError, ComRaidTimeoutError } from "@comraid/node";

try {
  await comraid.push.send({ /* … */ });
} catch (err) {
  if (err instanceof ComRaidTimeoutError) {
    // timed out; may retry with a fresh idempotency key if appropriate
  } else if (err instanceof ComRaidError && err.retryable) {
    // transient API / network failure
  } else {
    throw err;
  }
}
```

---

## Not wrapped

These public OpenAPI `operationId`s have **no** dedicated helper. Call them with [`request()`](#comraidrequestoptions) or raw HTTP, and use the [API Reference](https://docs.comraid.io/api-reference) for schemas. Mobile routes are intended for App ID clients (Android / iOS / React Native SDKs), not this API-key package.

| Tag | operationId | Method + path |
|-----|-------------|----------------|
| Ops | `healthz` | `GET /healthz` |
| Ops | `readyz` | `GET /readyz` |
| Contacts | `listContactPreferences` | `GET /contacts/{external_user_id}/preferences` |
| Contacts | `upsertContactPreferences` | `PUT /contacts/{external_user_id}/preferences` |
| Contacts | `listContactOptOuts` | `GET /contacts/{external_user_id}/opt-outs` |
| Contacts | `putContactChannelOptOut` | `PUT /contacts/{external_user_id}/opt-outs/{channel}` |
| Endpoints | `registerEndpoint` | `POST /contacts/{external_user_id}/endpoints` |
| Endpoints | `deactivateEndpoint` | `DELETE /endpoints/{endpoint_id}` |
| Messages | `previewTargeting` | `POST /messages/targeting/preview` |
| Media | `uploadMedia` | `POST /media` |
| Campaigns | `getCampaign` | `GET /campaigns/{id}` |
| Deliveries | `markDeliveryDelivered` | `POST /deliveries/{id}/delivered` |
| Deliveries | `markDeliveryOpened` | `POST /deliveries/{id}/opened` |
| Mobile | `mobileListCategories` | `GET /mobile/notification-categories` |
| Mobile | `mobileRegisterSubscription` | `POST /mobile/subscriptions` |
| Mobile | `mobileSubscriptionLogin` | `POST /mobile/subscriptions/{id}/login` |
| Mobile | `mobileReplaceSubscriptionToken` | `POST /mobile/subscriptions/{id}/token` |
| Mobile | `mobileSubscriptionSession` | `POST /mobile/subscriptions/{id}/session` |
| Mobile | `mobileSubscriptionLogout` | `POST /mobile/subscriptions/{id}/logout` |
| Mobile | `mobileSubscriptionOptOut` | `POST /mobile/subscriptions/{id}/opt-out` |
| Mobile | `mobileSubscriptionOptIn` | `POST /mobile/subscriptions/{id}/opt-in` |
| Mobile | `mobileSubscriptionUpsertAttributes` | `PUT /mobile/subscriptions/{id}/attributes` |

Wrapped elsewhere in this package: `createContact`, `upsertContact`, `upsertContactAttributes`, `createMessage` (via `push.send` / `push.broadcast`), `getMessage`, `cancelMessage`, `createCampaign` (via `push.multiSend`), and all six Segment operations.
