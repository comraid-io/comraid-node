import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/** Segment resource methods — OpenAPI `/segments` CRUD + restore. */
export function createSegmentsApi(client) {
	return {
		list(options = {}) {
			const query = {};
			if (options.include_archived === true) {
				query.include_archived = "true";
			}
			return client.request(
				requestOptions({
					method: "GET",
					path: "/segments",
					query: Object.keys(query).length > 0 ? query : undefined,
					signal: options.signal,
				}),
			);
		},
		create(input) {
			const { idempotencyKey, signal, ...body } = input ?? {};
			requireNonEmptyString(body.name, "segments.create requires name");
			if (body.rules == null || typeof body.rules !== "object") {
				throw new TypeError("segments.create requires rules");
			}
			return client.request(
				requestOptions({
					method: "POST",
					path: "/segments",
					body,
					idempotencyKey,
					signal,
				}),
			);
		},
		get(segmentId, options = {}) {
			const id = requireNonEmptyString(segmentId, "segments.get requires a segment id");
			return client.request(
				requestOptions({
					method: "GET",
					path: `/segments/${encodePathSegment(id)}`,
					signal: options.signal,
				}),
			);
		},
		update(segmentId, input = {}) {
			const id = requireNonEmptyString(segmentId, "segments.update requires a segment id");
			const { idempotencyKey, signal, ...body } = input;
			return client.request(
				requestOptions({
					method: "PUT",
					path: `/segments/${encodePathSegment(id)}`,
					body,
					idempotencyKey,
					signal,
				}),
			);
		},
		archive(segmentId, options = {}) {
			const id = requireNonEmptyString(segmentId, "segments.archive requires a segment id");
			return client.request(
				requestOptions({
					method: "DELETE",
					path: `/segments/${encodePathSegment(id)}`,
					signal: options.signal,
				}),
			);
		},
		restore(segmentId, options = {}) {
			const id = requireNonEmptyString(segmentId, "segments.restore requires a segment id");
			return client.request(
				requestOptions({
					method: "POST",
					path: `/segments/${encodePathSegment(id)}/restore`,
					signal: options.signal,
				}),
			);
		},
		counts(segmentIds, options = {}) {
			if (!Array.isArray(segmentIds) || segmentIds.length === 0) {
				throw new TypeError("segments.counts requires a non-empty segmentIds array");
			}
			return client.request(
				requestOptions({
					method: "POST",
					path: "/segments/counts",
					body: { segment_ids: segmentIds },
					signal: options.signal,
				}),
			);
		},
	};
}
