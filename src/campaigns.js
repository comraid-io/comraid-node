import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/** Campaign resource methods — OpenAPI `/campaigns/{id}` and `/campaigns/{id}/cancel`. */
export function createCampaignsApi(client) {
	return {
		get(campaignId, options = {}) {
			const id = requireNonEmptyString(campaignId, "campaigns.get requires a campaign id");
			return client.request(
				requestOptions({
					method: "GET",
					path: `/campaigns/${encodePathSegment(id)}`,
					signal: options.signal,
				}),
			);
		},
		cancel(campaignId, options = {}) {
			const id = requireNonEmptyString(campaignId, "campaigns.cancel requires a campaign id");
			return client.request(
				requestOptions({
					method: "POST",
					path: `/campaigns/${encodePathSegment(id)}/cancel`,
					signal: options.signal,
				}),
			);
		},
	};
}
