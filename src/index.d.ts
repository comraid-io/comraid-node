export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  path: `/${string}`;
  query?: Record<string, QueryValue>;
  body?: TBody;
  headers?: HeadersInit;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface Transport {
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
}

export interface FetchTransportOptions {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  maxRetries?: number;
}

export type ComraideOptions =
  | (FetchTransportOptions & { transport?: never })
  | { transport: Transport; apiKey?: never; baseUrl?: never; fetch?: never; timeoutMs?: never; maxRetries?: never };

export class ComraideError extends Error {
  code?: string;
  status?: number;
  requestId?: string;
  retryable: boolean;
  details?: unknown;
}

export class ComraideTimeoutError extends ComraideError {
  timeoutMs: number;
}

export class FetchTransport implements Transport {
  constructor(options: FetchTransportOptions);
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
}

export class Comraide {
  constructor(options: ComraideOptions);
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
  createIdempotencyKey(): string;
}
