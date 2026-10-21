import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/**
 * Contact attribute methods — OpenAPI `PUT /contacts/{external_user_id}/attributes`.
 */
export function createAttributesApi(client) {
	return {
		upsert(externalUserId, input = {}) {
			const id = requireNonEmptyString(externalUserId, "attributes.upsert requires external_user_id");
			const { attributes, idempotencyKey, signal } = input;
			if (attributes == null || typeof attributes !== "object" || Array.isArray(attributes)) {
				throw new TypeError("attributes.upsert requires attributes");
			}
			return client.request(
				requestOptions({
					method: "PUT",
					path: `/contacts/${encodePathSegment(id)}/attributes`,
					body: { attributes },
					idempotencyKey,
					signal,
				}),
			);
		},
	};
}
