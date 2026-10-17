import { randomUUID } from "node:crypto";
import { FetchTransport } from "./transport.js";

export { ComraideError, ComraideTimeoutError } from "./errors.js";
export { FetchTransport } from "./transport.js";

export class Comraide {
  constructor(options) {
    this.transport = options.transport ?? new FetchTransport(options);
  }

  request(options) {
    return this.transport.request(options);
  }

  createIdempotencyKey() {
    return randomUUID();
  }
}
