import { randomUUID } from "node:crypto";
import { createPushApi } from "./push.js";
import { FetchTransport } from "./transport.js";

export {
	ComRaidError,
	ComRaidTimeoutError,
	ComraideError,
	ComraideTimeoutError,
} from "./errors.js";
export { FetchTransport } from "./transport.js";

export class ComRaid {
	constructor(options) {
		this.transport = options.transport ?? new FetchTransport(options);
		this.push = createPushApi(this);
	}

	request(options) {
		return this.transport.request(options);
	}

	createIdempotencyKey() {
		return randomUUID();
	}
}

/** @deprecated Use ComRaid */
export const Comraide = ComRaid;
