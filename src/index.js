import { randomUUID } from "node:crypto";
import { createAttributesApi } from "./attributes.js";
import { createContactsApi } from "./contacts.js";
import { createMessagesApi } from "./messages.js";
import { createPushApi } from "./push.js";
import { createSegmentsApi } from "./segments.js";
import { FetchTransport } from "./transport.js";

export {
	ComRaidError,
	ComRaidTimeoutError,
} from "./errors.js";
export { FetchTransport } from "./transport.js";

export class ComRaid {
	constructor(options) {
		this.transport = options.transport ?? new FetchTransport(options);
		this.push = createPushApi(this);
		this.messages = createMessagesApi(this);
		this.contacts = createContactsApi(this);
		this.attributes = createAttributesApi(this);
		this.segments = createSegmentsApi(this);
	}

	request(options) {
		return this.transport.request(options);
	}

	createIdempotencyKey() {
		return randomUUID();
	}
}

