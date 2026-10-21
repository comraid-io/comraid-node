/**
 * Build transport request options, omitting undefined optional fields.
 */
export function requestOptions({ method, path, body, query, idempotencyKey, signal }) {
	const options = { method, path };
	if (body !== undefined) options.body = body;
	if (query !== undefined) options.query = query;
	if (idempotencyKey !== undefined) options.idempotencyKey = idempotencyKey;
	if (signal !== undefined) options.signal = signal;
	return options;
}

/** Encode a single path segment so External user IDs stay on the API origin. */
export function encodePathSegment(value) {
	return encodeURIComponent(String(value));
}

export function requireNonEmptyString(value, message) {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(message);
	}
	return value;
}
