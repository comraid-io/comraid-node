import { uploadMedia } from "./media.js";
import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

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
		get(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "push.get requires a message id");
			return client.request(
				requestOptions({
					method: "GET",
					path: `/messages/${encodePathSegment(id)}`,
					signal: options.signal,
				}),
			);
		},
		cancel(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "push.cancel requires a message id");
			return client.request(
				requestOptions({
					method: "POST",
					path: `/messages/${encodePathSegment(id)}/cancel`,
					signal: options.signal,
				}),
			);
		},
		drafts: createDraftsApi(client),
	};
}

function createDraftsApi(client) {
	return {
		create(input) {
			const { idempotencyKey, signal, content, ...rest } = input ?? {};
			return client.request(
				requestOptions({
					method: "POST",
					path: "/messages",
					idempotencyKey,
					signal,
					body: {
						...rest,
						draft: true,
						channel: CHANNEL,
						content: { push: content },
					},
				}),
			);
		},
		update(messageId, input = {}) {
			const id = requireNonEmptyString(messageId, "push.drafts.update requires a message id");
			const { idempotencyKey, signal, content, updated_at, ...rest } = input;
			requireNonEmptyString(updated_at, "push.drafts.update requires updated_at");
			return client.request(
				requestOptions({
					method: "PATCH",
					path: `/messages/${encodePathSegment(id)}`,
					idempotencyKey,
					signal,
					body: {
						...rest,
						updated_at,
						channel: CHANNEL,
						content: { push: content },
					},
				}),
			);
		},
		list(options = {}) {
			const { signal, limit, offset, ...rest } = options;
			const query = { status: "draft", ...rest };
			if (limit !== undefined) query.limit = limit;
			if (offset !== undefined) query.offset = offset;
			return client.request(
				requestOptions({
					method: "GET",
					path: "/messages",
					query,
					signal,
				}),
			);
		},
		send(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "push.drafts.send requires a message id");
			return client.request(
				requestOptions({
					method: "POST",
					path: `/messages/${encodePathSegment(id)}/send`,
					signal: options.signal,
				}),
			);
		},
		archive(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "push.drafts.archive requires a message id");
			return client.request(
				requestOptions({
					method: "DELETE",
					path: `/messages/${encodePathSegment(id)}`,
					signal: options.signal,
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
