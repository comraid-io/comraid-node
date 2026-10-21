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

/** OpenAPI `SegmentRules`. */
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

/** OpenAPI `MessageAccepted` (202 create response). */
export interface MessageAccepted {
  message_id: string;
  channel: string;
  status: MessageStatus;
  delivery_count?: number;
  recipients?: Array<Record<string, unknown>>;
}

/** OpenAPI `MessageDetail` (GET /messages/{id}). */
export interface MessageDetail {
  message_id: string;
  status: MessageStatus;
  status_summary?: Record<string, unknown>;
  recipient?: Record<string, unknown> | null;
  channel?: string;
  message?: Record<string, unknown>;
  targeting?: Record<string, unknown> | null;
  timing?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
  deliveries?: Array<Record<string, unknown>>;
}

/** OpenAPI cancel Message response. */
export interface MessageCancelled {
  message_id: string;
  status: "cancelled";
}

/** OpenAPI `CampaignAccepted`. */
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

/** OpenAPI `ContactCreate`. */
export interface ContactCreate {
  external_user_id: string;
  name?: string;
  locale?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

/** OpenAPI `ContactUpsert`. */
export interface ContactUpsert {
  name?: string;
  locale?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

/** OpenAPI `ContactResponse`. */
export interface ContactResponse {
  contact_id: string;
  external_user_id: string;
  updated_attributes?: string[];
}

/** OpenAPI `SegmentCreate`. */
export interface SegmentCreate {
  name: string;
  description?: string;
  rules: SegmentRules;
}

/** Segment list/detail shapes returned by public `/segments` routes. */
export interface SegmentSummary {
  id?: string;
  segment_id: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
  archived_at?: string | null;
}

export interface SegmentListResponse {
  segments: SegmentSummary[];
}

export interface SegmentCreated {
  segment_id: string;
  status?: string;
}

export interface RequestSignalOptions {
  signal?: AbortSignal;
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

export interface MessagesApi {
  /** `GET /messages/{id}` → OpenAPI `getMessage`. */
  get(messageId: string, options?: RequestSignalOptions): Promise<MessageDetail>;
  /** `POST /messages/{id}/cancel` → OpenAPI `cancelMessage`. */
  cancel(messageId: string, options?: RequestSignalOptions): Promise<MessageCancelled>;
}

export type ContactCreateInput = ContactCreate & {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type ContactUpsertInput = ContactUpsert & {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export interface ContactsApi {
  /** `POST /contacts` → OpenAPI `createContact`. */
  create(input: ContactCreateInput): Promise<ContactResponse>;
  /** `PUT /contacts/{external_user_id}` → OpenAPI `upsertContact`. */
  upsert(externalUserId: string, input?: ContactUpsertInput): Promise<ContactResponse>;
}

export interface AttributesUpsertInput {
  attributes: Record<string, unknown>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface AttributesApi {
  /** `PUT /contacts/{external_user_id}/attributes` → OpenAPI `upsertContactAttributes`. */
  upsert(externalUserId: string, input: AttributesUpsertInput): Promise<ContactResponse>;
}

export type SegmentCreateInput = SegmentCreate & {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type SegmentUpdateInput = SegmentCreate & {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export interface SegmentsApi {
  /** `GET /segments` → OpenAPI `listSegments`. */
  list(options?: RequestSignalOptions): Promise<SegmentListResponse>;
  /** `POST /segments` → OpenAPI `createSegment`. */
  create(input: SegmentCreateInput): Promise<SegmentCreated>;
  /** `GET /segments/{id}` → OpenAPI `getSegment`. */
  get(segmentId: string, options?: RequestSignalOptions): Promise<SegmentSummary>;
  /** `PUT /segments/{id}` → OpenAPI `updateSegment`. */
  update(segmentId: string, input: SegmentUpdateInput): Promise<SegmentSummary>;
  /** `DELETE /segments/{id}` → OpenAPI `archiveSegment`. */
  archive(segmentId: string, options?: RequestSignalOptions): Promise<unknown>;
  /** `POST /segments/{id}/restore` → OpenAPI `restoreSegment`. */
  restore(segmentId: string, options?: RequestSignalOptions): Promise<unknown>;
}

export class ComRaid {
  readonly push: PushApi;
  readonly messages: MessagesApi;
  readonly contacts: ContactsApi;
  readonly attributes: AttributesApi;
  readonly segments: SegmentsApi;
  constructor(options: ComRaidOptions);
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
  createIdempotencyKey(): string;
}
