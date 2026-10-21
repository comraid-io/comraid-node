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

export type ComRaidOptions =
  | (FetchTransportOptions & { transport?: never })
  | { transport: Transport; apiKey?: never; baseUrl?: never; fetch?: never; timeoutMs?: never; maxRetries?: never };

export class ComRaidError extends Error {
  code?: string;
  status?: number;
  requestId?: string;
  retryable: boolean;
  details?: unknown;
}

export class ComRaidTimeoutError extends ComRaidError {
  timeoutMs: number;
}

export class FetchTransport implements Transport {
  constructor(options: FetchTransportOptions);
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
}

/** Derived from OpenAPI `PushAction`. */
export interface PushAction {
  id: string;
  text: string;
  icon?: string;
}

/**
 * Push Content fields the push Channel supports (OpenAPI `content.push`).
 * Callers pass these flat; the SDK nests them under `content.push`.
 */
export interface PushContent {
  title: string;
  body: string;
  image_url?: string | null;
  platforms?: Array<"android" | "ios">;
  actions?: PushAction[];
}

/** OpenAPI `SegmentRules` (Broadcast ad-hoc targeting). */
export interface SegmentRules {
  operator: "and" | "or";
  conditions: Array<{
    field: string;
    key?: string;
    op: string;
    value?: unknown;
  }>;
}

/**
 * OpenAPI `TargetingSpec`. Exactly one of `everyone`, `segment_id`, or `rules`.
 */
export interface TargetingSpec {
  everyone?: boolean;
  segment_id?: string;
  rules?: SegmentRules;
}

export type MessageStatus =
  | "queued"
  | "scheduled"
  | "processing"
  | "completed"
  | "partial_complete"
  | "failed"
  | "cancelled";

export type CampaignStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial_complete"
  | "failed"
  | "cancelled";

export interface MessageAccepted {
  message_id: string;
  channel: string;
  status: MessageStatus;
  delivery_count?: number;
  recipients?: Array<Record<string, unknown>>;
}

export interface CampaignAccepted {
  campaign_id: string;
  channel: string;
  status: CampaignStatus;
  message_count?: number;
  messages: Array<{
    message_id: string;
    external_user_id: string;
    status: MessageStatus;
    delivery_count?: number;
  }>;
}

export interface PushSendInput {
  to: { external_user_ids: string[] };
  content: PushContent;
  category?: string;
  type?: string;
  name?: string;
  priority?: "high" | "normal";
  data?: Record<string, unknown>;
  send_at?: string | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface PushBroadcastInput {
  targeting: TargetingSpec;
  content: PushContent;
  category?: string;
  type?: string;
  name?: string;
  priority?: "high" | "normal";
  data?: Record<string, unknown>;
  send_at?: string | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface PushMultiSendRecipient {
  external_user_id: string;
  content: PushContent;
  category?: string;
  type?: string;
  name?: string;
  priority?: "high" | "normal";
  data?: Record<string, unknown>;
}

export interface PushMultiSendInput {
  recipients: [PushMultiSendRecipient, ...PushMultiSendRecipient[]];
  name?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface PushApi {
  /** Single send → `POST /messages` with `to.external_user_ids`. */
  send(input: PushSendInput): Promise<MessageAccepted>;
  /** Broadcast → `POST /messages` with `targeting`. */
  broadcast(input: PushBroadcastInput): Promise<MessageAccepted>;
  /** Multi-send → `POST /campaigns` with per-Contact Contents. */
  multiSend(input: PushMultiSendInput): Promise<CampaignAccepted>;
}

export class ComRaid {
  readonly push: PushApi;
  constructor(options: ComRaidOptions);
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
  createIdempotencyKey(): string;
}
