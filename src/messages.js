import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/** Message resource methods — OpenAPI `/messages/{id}` and `/messages/{id}/cancel`. */
export function createMessagesApi(client) {
	return {
		get(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "messages.get requires a message id");
			return client.request(
				requestOptions({
					method: "GET",
					path: `/messages/${encodePathSegment(id)}`,
					signal: options.signal,
				}),
			);
		},
		cancel(messageId, options = {}) {
			const id = requireNonEmptyString(messageId, "messages.cancel requires a message id");
			return client.request(
				requestOptions({
					method: "POST",
					path: `/messages/${encodePathSegment(id)}/cancel`,
					signal: options.signal,
				}),
			);
		},
	};
}
