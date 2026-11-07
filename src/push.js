import { uploadMedia } from "./media.js";
import { requestOptions } from "./request-options.js";

const CHANNEL = "push";

/**
 * Push Channel methods. Leaves room for additive Channels (e.g. whatsapp) on the client.
 * Callers pass push Content fields only; the SDK sets channel and nests content.push.
 */
export function createPushApi(client) {
	return {
		uploadMedia(file, options) {
			return uploadMedia(client, file, options);
		},
		send(input) {
			assertSendTarget(input, "to", "push.send requires to.external_user_ids");
			if (input.to.endpoint_ids != null) {
				throw new TypeError(
					"push.send no longer accepts to.endpoint_ids; use to.external_user_ids",
				);
			}
			if (!Array.isArray(input.to.external_user_ids) || input.to.external_user_ids.length === 0) {
				throw new TypeError("push.send requires to.external_user_ids");
			}
			return createMessage(client, input);
		},
		broadcast(input) {
			assertSendTarget(input, "targeting", "push.broadcast requires targeting");
			return createMessage(client, input);
		},
		multiSend(input) {
			const { idempotencyKey, signal, recipients, ...rest } = input;
			if (!Array.isArray(recipients) || recipients.length === 0) {
				throw new TypeError("push.multiSend requires a non-empty recipients array");
			}
			return client.request(
				requestOptions({
					method: "POST",
					path: "/campaigns",
					idempotencyKey,
					signal,
					body: {
						...rest,
						channel: CHANNEL,
						recipients: recipients.map(wrapRecipient),
					},
				}),
			);
		},
	};
}

function assertSendTarget(input, key, message) {
	if (input?.[key] == null || typeof input[key] !== "object") {
		throw new TypeError(message);
	}
}

function createMessage(client, input) {
	const { idempotencyKey, signal, content, ...rest } = input;
	return client.request(
		requestOptions({
			method: "POST",
			path: "/messages",
			idempotencyKey,
			signal,
			body: {
				...rest,
				channel: CHANNEL,
				content: { push: content },
			},
		}),
	);
}

function wrapRecipient(recipient) {
	const { content, ...rest } = recipient;
	return {
		...rest,
		content: { push: content },
	};
}
