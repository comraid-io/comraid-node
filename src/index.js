import { randomUUID } from "node:crypto";
import { createAttributesApi } from "./attributes.js";
import { createCampaignsApi } from "./campaigns.js";
import { createContactsApi } from "./contacts.js";
import { createToken, identity } from "./identity.js";
import { createPushApi } from "./push.js";
import { createSegmentsApi } from "./segments.js";
import { FetchTransport } from "./transport.js";

export {
	ComRaidError,
	ComRaidTimeoutError,
} from "./errors.js";
export { FetchTransport } from "./transport.js";
export { createToken, identity };

export class ComRaid {
	static identity = identity;

	constructor(options) {
		this.transport = options.transport ?? new FetchTransport(options);
		this.push = createPushApi(this);
		this.campaigns = createCampaignsApi(this);
		this.contacts = createContactsApi(this);
		this.attributes = createAttributesApi(this);
		this.segments = createSegmentsApi(this);
		this.identity = identity;
	}

	request(options) {
		return this.transport.request(options);
	}

	createIdempotencyKey() {
		return randomUUID();
	}
}
