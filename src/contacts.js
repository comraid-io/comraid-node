import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/** Contact resource methods — OpenAPI `/contacts` and `/contacts/{external_user_id}`. */
export function createContactsApi(client) {
	return {
		create(input) {
			const { idempotencyKey, signal, ...body } = input ?? {};
			requireNonEmptyString(body.external_user_id, "contacts.create requires external_user_id");
			return client.request(
				requestOptions({
					method: "POST",
					path: "/contacts",
					body,
					idempotencyKey,
					signal,
				}),
			);
		},
		upsert(externalUserId, input = {}) {
			const id = requireNonEmptyString(externalUserId, "contacts.upsert requires external_user_id");
			const { idempotencyKey, signal, ...body } = input;
			return client.request(
				requestOptions({
					method: "PUT",
					path: `/contacts/${encodePathSegment(id)}`,
					body,
					idempotencyKey,
					signal,
				}),
			);
		},
	};
}
