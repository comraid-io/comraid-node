import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

const CHANNEL = "push";

/**
 * Push Channel methods. Leaves room for additive Channels (e.g. whatsapp) on the client.
 * Callers pass push Content fields only; the SDK sets channel and nests content.push.
 */
export function createPushApi(client) {
	return {
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
		listDeliveries(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "push.listDeliveries requires a message id");
			const { signal, limit, cursor, status, platform } = options;
			const query = {};
			if (limit !== undefined) query.limit = limit;
			if (cursor !== undefined) query.cursor = cursor;
			if (status !== undefined) query.status = status;
			if (platform !== undefined) query.platform = platform;
			return client.request(
				requestOptions({
					method: "GET",
					path: `/messages/${encodePathSegment(id)}/deliveries`,
					query: Object.keys(query).length > 0 ? query : undefined,
					signal,
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
