export class ComRaidError extends Error {
	constructor(message, options = {}) {
		super(message, { cause: options.cause });
		this.name = "ComRaidError";
		this.code = options.code;
		this.status = options.status;
		this.requestId = options.requestId;
		this.retryable = options.retryable ?? false;
		this.details = options.details;
	}
}

export class ComRaidTimeoutError extends ComRaidError {
	constructor(timeoutMs, options = {}) {
		super(`ComRaid request timed out after ${timeoutMs}ms`, {
			...options,
			code: "TIMEOUT",
			retryable: true,
		});
		this.name = "ComRaidTimeoutError";
		this.timeoutMs = timeoutMs;
	}
}

/** @deprecated Use ComRaidError */
export const ComraideError = ComRaidError;
/** @deprecated Use ComRaidTimeoutError */
export const ComraideTimeoutError = ComRaidTimeoutError;
