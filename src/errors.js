export class ComraideError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "ComraideError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

export class ComraideTimeoutError extends ComraideError {
  constructor(timeoutMs, options = {}) {
    super(`Comraide request timed out after ${timeoutMs}ms`, {
      ...options,
      code: "TIMEOUT",
      retryable: true,
    });
    this.name = "ComraideTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}
