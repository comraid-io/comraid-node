import { ComraideError, ComraideTimeoutError } from "./errors.js";

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

export class FetchTransport {
	constructor({ apiKey, baseUrl, fetch: fetchImplementation = globalThis.fetch, timeoutMs = 15_000, maxRetries = 2 }) {
		if (!apiKey || typeof apiKey !== "string") throw new TypeError("apiKey is required");
		if (typeof fetchImplementation !== "function") throw new TypeError("A fetch implementation is required");
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be positive and finite");
		if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) throw new TypeError("maxRetries must be an integer from 0 to 10");
		this.apiKey = apiKey;
		this.baseUrl = normalizeBaseUrl(baseUrl);
		this.fetch = fetchImplementation;
		this.timeoutMs = timeoutMs;
		this.maxRetries = maxRetries;
	}

	async request(options) {
		buildUrl(this.baseUrl, options.path, options.query);
		const method = (options.method ?? "GET").toUpperCase();
		const mayRetry = IDEMPOTENT_METHODS.has(method) || Boolean(options.idempotencyKey);
		let lastError;

		for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
			try {
				const { response, value } = await this.#attempt({ ...options, method });
				if (!response.ok) {
					const error = responseError(response, value);
					if (!mayRetry || !error.retryable || attempt === this.maxRetries) throw error;
					await delay(retryDelay(response, attempt), options.signal);
					continue;
				}
				return value;
			} catch (error) {
				const normalized = normalizeError(error, this.timeoutMs);
				lastError = normalized;
				if (!mayRetry || !normalized.retryable || attempt === this.maxRetries || options.signal?.aborted) {
					throw normalized;
				}
				await delay(backoff(attempt), options.signal);
			}
		}
		throw lastError;
	}

	async #attempt(options) {
		const timeoutController = new AbortController();
		const timeout = setTimeout(() => timeoutController.abort(new ComraideTimeoutError(this.timeoutMs)), this.timeoutMs);
		const signal = combineSignals(options.signal, timeoutController.signal);
		const headers = new Headers(options.headers);
		headers.set("authorization", `Bearer ${this.apiKey}`);
		headers.set("accept", "application/json");
		headers.set("user-agent", "@comraide/node/0.1.0");
		if (options.idempotencyKey) headers.set("idempotency-key", options.idempotencyKey);

		let body;
		if (options.body !== undefined) {
			headers.set("content-type", "application/json");
			body = JSON.stringify(options.body);
		}

		try {
			const response = await this.fetch(buildUrl(this.baseUrl, options.path, options.query), {
				method: options.method,
				headers,
				body,
				signal,
				redirect: "error",
			});
			let value;
			try {
				value = await parseBody(response);
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				if (response.ok) {
					throw new ComraideError("API returned invalid JSON", { code: "INVALID_RESPONSE", cause: error });
				}
			}
			return { response, value };
		} catch (error) {
			if (timeoutController.signal.aborted) throw new ComraideTimeoutError(this.timeoutMs, { cause: error });
			if (options.signal?.aborted) {
				throw new ComraideError("Comraide request was aborted", {
					code: "REQUEST_ABORTED",
					retryable: false,
					cause: error,
				});
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}
}

function normalizeBaseUrl(value) {
	const url = new URL(value);
	if (!new Set(["http:", "https:"]).has(url.protocol)) throw new TypeError("baseUrl must use HTTP or HTTPS");
	return url.toString().replace(/\/$/, "");
}

function buildUrl(baseUrl, path, query) {
	if (typeof path !== "string" || !path.startsWith("/")) throw new TypeError("path must start with /");
	const url = new URL(path, `${baseUrl}/`);
	if (url.origin !== new URL(baseUrl).origin) throw new TypeError("path must stay on the configured API origin");
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
	}
	return url;
}

async function parseBody(response) {
	if (response.status === 204) return undefined;
	const text = await response.text();
	if (!text) return undefined;
	const contentType = response.headers.get("content-type") ?? "";
	return contentType.includes("application/json") ? JSON.parse(text) : text;
}

function responseError(response, details) {
	const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? undefined;
	const message = details?.message ?? details?.error?.message ?? `Comraide API request failed with status ${response.status}`;
	const code = details?.code ?? details?.error?.code ?? "API_ERROR";
	return new ComraideError(message, {
		code,
		status: response.status,
		requestId,
		retryable: RETRYABLE_STATUS.has(response.status),
		details,
	});
}

function normalizeError(error, timeoutMs) {
	if (error instanceof ComraideError) return error;
	if (error?.name === "AbortError") return new ComraideTimeoutError(timeoutMs, { cause: error });
	return new ComraideError(error instanceof Error ? error.message : "Network request failed", {
		code: "NETWORK_ERROR",
		retryable: true,
		cause: error,
	});
}

function combineSignals(external, timeout) {
	if (!external) return timeout;
	return AbortSignal.any([external, timeout]);
}

function retryDelay(response, attempt) {
	const retryAfter = response.headers.get("retry-after");
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
		const date = Date.parse(retryAfter);
		if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 30_000));
	}
	return backoff(attempt);
}

function backoff(attempt) {
	const ceiling = Math.min(250 * (2 ** attempt), 5_000);
	return Math.floor(Math.random() * ceiling);
}

function delay(ms, signal) {
	if (signal?.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timeout);
			reject(signal.reason);
		};
		const timeout = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
