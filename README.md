# `@comraide/node`

Node.js client foundation for the existing Comraide service. This package deliberately has no hard-coded resource endpoints yet; those will be generated or added after the backend OpenAPI/API contract is supplied.

```js
import { Comraide } from "@comraide/node";

const comraide = new Comraide({
  apiKey: process.env.COMRAIDE_API_KEY,
  baseUrl: process.env.COMRAIDE_BASE_URL,
});

const result = await comraide.request({
  method: "POST",
  path: "/path-from-your-api-contract",
  idempotencyKey: comraide.createIdempotencyKey(),
  body: { /* contract-defined input */ },
});
```

The client includes bearer authentication, configurable fetch transport, request timeout, cancellation, bounded retries, `Retry-After` handling, idempotency keys, structured API errors, query encoding, and JSON parsing. Mutating requests are retried only when an idempotency key is present.
