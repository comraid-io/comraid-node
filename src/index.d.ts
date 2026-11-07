export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  path: `/${string}`;
  query?: Record<string, QueryValue>;
  /** JSON value, or `FormData` / `Blob` for multipart upload bodies. */
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
 * Rich fields map 1:1; `deep_link` is delivered to devices as `cr_deep_link`.
 */
export interface PushContent {
  /**
   * When true, Data-only Notification: Provider omits system tray UI.
   * Title/body become optional app hints; Message `data` must be non-empty.
   */
  data_only?: boolean;
  title?: string;
  body?: string;
  image_url?: string | null;
  /** First-class deep link / launch URL → device payload `cr_deep_link`. */
  deep_link?: string | null;
  /** Custom notification sound resource name; APNs uses `default` when omitted. */
  sound?: string | null;
  /** iOS alert subtitle (ignored on Android system notifications). */
  subtitle?: string | null;
  /** iOS badge; Android hybrid notifications map to notification count when supported. */
  badge?: number | null;
  /** iOS thread-id / Android notification tag. */
  thread_id?: string | null;
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
  | "scheduled"
  | "preparing"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type CampaignStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * OpenAPI `MessageAccepted` (202 create response). A Broadcast returns status
 * `preparing` without `delivery_count` / `recipients`; read counts from
 * `messages.get` once it leaves `preparing`.
 */
export interface MessageAccepted {
  message_id: string;
  channel: string;
  status: MessageStatus;
  /** Single send only. */
  delivery_count?: number;
  /** Single send only. */
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

/** OpenAPI `EndpointCreate` (body fields; `external_user_id` is the path segment). */
export interface EndpointCreate {
  channel?: "push";
  provider?: "fcm" | "apns";
  /** FCM registration token or APNs device token. */
  address: string;
  platform: "android" | "ios";
  metadata?: Record<string, unknown>;
}

/** Created Endpoint summary from OpenAPI `registerEndpoint`. */
export interface EndpointRegistered {
  endpoint_id: string;
  contact_id: string;
  channel: string;
  provider: string;
  platform: string;
}

/** OpenAPI `EndpointSummary` (list item; token omitted). */
export interface EndpointSummary {
  endpoint_id: string;
  channel: string;
  provider: string;
  platform?: string | null;
  is_active: boolean;
  created_at?: string;
  last_seen_at?: string | null;
}

/** OpenAPI `EndpointListResponse`. */
export interface EndpointListResponse {
  endpoints: EndpointSummary[];
}

/** OpenAPI deactivateEndpoint response. */
export interface EndpointDeactivated {
  status: "deactivated";
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

/**
 * Single-send targeting (OpenAPI `MessageCreate.to`).
 * Address Contacts by External user ID only.
 */
export type PushSendTo = { external_user_ids: string[] };

/** Shared Message create fields for push Single send / Broadcast. */
export interface PushMessageCreateFields {
  category?: string;
  type?: string;
  name?: string;
  priority?: "high" | "normal";
  /** Time-to-live in seconds from send time (or from `send_at` when scheduled). */
  ttl?: number;
  /** Collapse key so later sends with the same key replace earlier ones on device. */
  collapse_key?: string;
  data?: Record<string, unknown>;
  /** Absolute UTC send time. Mutually exclusive with `send_at_local`. */
  send_at?: string | null;
  /** Local wall-clock datetime without timezone. Mutually exclusive with `send_at`. */
  send_at_local?: string;
}

export interface PushSendInput extends PushMessageCreateFields {
  to: PushSendTo;
  content: PushContent;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface PushBroadcastInput extends PushMessageCreateFields {
  targeting: TargetingSpec;
  content: PushContent;
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
  /** Per-recipient TTL in seconds (OpenAPI CampaignCreate). */
  ttl?: number;
  collapse_key?: string;
  data?: Record<string, unknown>;
}

export interface PushMultiSendInput {
  recipients: [PushMultiSendRecipient, ...PushMultiSendRecipient[]];
  name?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/** OpenAPI `MediaUploadResponse` (POST /media). */
export interface MediaUploadResponse {
  asset_id: string;
  /** Public URL for `content.push.image_url`. */
  url: string;
}

export type PushUploadMediaFile = Buffer | Uint8Array | Blob | string | NodeJS.ReadableStream;

export interface PushUploadMediaOptions {
  /** Declared MIME type; must be `image/jpeg` or `image/png`. */
  contentType: "image/jpeg" | "image/png";
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface PushApi {
  /**
   * Upload a JPEG/PNG (max 1 MiB) → OpenAPI `uploadMedia` (`POST /media`).
   * Accepts Buffer, Blob, filesystem path, or Readable stream. Client checks
   * size and type; the server remains the authority.
   */
  uploadMedia(file: PushUploadMediaFile, options: PushUploadMediaOptions): Promise<MediaUploadResponse>;
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

export type EndpointRegisterInput = EndpointCreate & {
  external_user_id: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export interface ContactsEndpointsApi {
  /** `POST /contacts/{external_user_id}/endpoints` → OpenAPI `registerEndpoint`. */
  register(input: EndpointRegisterInput): Promise<EndpointRegistered>;
  /** `DELETE /endpoints/{endpoint_id}` → OpenAPI `deactivateEndpoint`. */
  deactivate(endpointId: string, options?: RequestSignalOptions): Promise<EndpointDeactivated>;
  /** `GET /contacts/{external_user_id}/endpoints` → OpenAPI `listContactEndpoints`. */
  list(externalUserId: string, options?: RequestSignalOptions): Promise<EndpointListResponse>;
}

export interface ContactsApi {
  /** `POST /contacts` → OpenAPI `createContact`. */
  create(input: ContactCreateInput): Promise<ContactResponse>;
  /** `PUT /contacts/{external_user_id}` → OpenAPI `upsertContact`. */
  upsert(externalUserId: string, input?: ContactUpsertInput): Promise<ContactResponse>;
  readonly endpoints: ContactsEndpointsApi;
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

export interface CreateIdentityTokenOptions {
  /** Project UUID — becomes JWT `iss` as `comraid:{projectId}`. */
  projectId: string;
  /** PEM-encoded RSA private key (PKCS#8 or PKCS#1), or a KeyObject. */
  privateKey: string | import("node:crypto").KeyObject;
  /** Key id that matches an uploaded identity verification public key. */
  kid: string;
  /**
   * Token lifetime in seconds from `iat`. Default 300 (5 minutes).
   * Must be ≤ 600 (server max).
   */
  expiresIn?: number;
}

/**
 * Mint an RS256 Identity verification JWT for mobile `login(externalUserId, jwt)`.
 * Offline helper — does not call the API. Upload the matching public key in Push settings.
 */
export function createToken(
  externalUserId: string,
  options: CreateIdentityTokenOptions,
): string;

export interface IdentityApi {
  createToken(externalUserId: string, options: CreateIdentityTokenOptions): string;
}

export const identity: IdentityApi;

export class ComRaid {
  static readonly identity: IdentityApi;
  readonly push: PushApi;
  readonly messages: MessagesApi;
  readonly contacts: ContactsApi;
  readonly attributes: AttributesApi;
  readonly segments: SegmentsApi;
  readonly identity: IdentityApi;
  constructor(options: ComRaidOptions);
  request<TResponse = unknown, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse>;
  createIdempotencyKey(): string;
}
