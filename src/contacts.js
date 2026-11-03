import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/** Endpoint helpers under a Contact — OpenAPI Endpoints tag. */
function createContactsEndpointsApi(client) {
	return {
		register(input) {
			const { external_user_id, idempotencyKey, signal, ...body } = input ?? {};
			const id = requireNonEmptyString(external_user_id, "contacts.endpoints.register requires external_user_id");
			requireNonEmptyString(body.address, "contacts.endpoints.register requires address");
			requireNonEmptyString(body.platform, "contacts.endpoints.register requires platform");
			return client.request(
				requestOptions({
					method: "POST",
					path: `/contacts/${encodePathSegment(id)}/endpoints`,
					body,
					idempotencyKey,
					signal,
				}),
			);
		},
		deactivate(endpointId, options = {}) {
			const id = requireNonEmptyString(endpointId, "contacts.endpoints.deactivate requires an endpoint id");
			return client.request(
				requestOptions({
					method: "DELETE",
					path: `/endpoints/${encodePathSegment(id)}`,
					signal: options.signal,
				}),
			);
		},
		list(externalUserId, options = {}) {
			const id = requireNonEmptyString(externalUserId, "contacts.endpoints.list requires external_user_id");
			return client.request(
				requestOptions({
					method: "GET",
					path: `/contacts/${encodePathSegment(id)}/endpoints`,
					signal: options.signal,
				}),
			);
		},
	};
}

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
		endpoints: createContactsEndpointsApi(client),
	};
}
