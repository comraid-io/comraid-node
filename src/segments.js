import { encodePathSegment, requestOptions, requireNonEmptyString } from "./request-options.js";

/** Segment resource methods — OpenAPI `/segments` CRUD + restore. */
export function createSegmentsApi(client) {
	return {
		list(options = {}) {
			return client.request(
				requestOptions({
					method: "GET",
					path: "/segments",
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
	};
}
