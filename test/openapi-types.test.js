import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Schemas / operationIds the SDK types claim to track. */
const REQUIRED_SCHEMA_NAMES = [
	"ContactCreate",
	"ContactUpsert",
	"ContactResponse",
	"ContactPreference",
	"ContactPreferencesResponse",
	"ContactOptOutResponse",
	"EndpointCreate",
	"EndpointSummary",
	"EndpointListResponse",
	"MessageDetail",
	"MessageList",
	"MessageDraftUpdate",
	"SegmentCreate",
	"SegmentRules",
	"TargetingSpec",
	"PushAction",
	"MessageAccepted",
	"CampaignAccepted",
	"CampaignDetail",
	"CampaignCancelled",
	"MediaUploadResponse",
	"DeliveryInspection",
	"TargetingPreviewRequest",
	"TargetingPreviewResponse",
];

const REQUIRED_OPERATION_IDS = [
	"getMessage",
	"cancelMessage",
	"listMessages",
	"updateDraft",
	"archiveDraft",
	"sendDraft",
	"getCampaign",
	"cancelCampaign",
	"createContact",
	"upsertContact",
	"upsertContactAttributes",
	"listContactPreferences",
	"upsertContactPreferences",
	"putContactChannelOptOut",
	"registerEndpoint",
	"deactivateEndpoint",
	"listContactEndpoints",
	"listSegments",
	"createSegment",
	"getSegment",
	"updateSegment",
	"archiveSegment",
	"restoreSegment",
	"uploadMedia",
	"previewTargeting",
];

function resolveOpenApiPath() {
	if (process.env.COMRAID_OPENAPI) return process.env.COMRAID_OPENAPI;
	const candidates = [
		path.resolve(root, "../server/src/openapi/openapi.yaml"),
		path.resolve(root, "../../server/src/openapi/openapi.yaml"),
		path.resolve(root, "../../../server/src/openapi/openapi.yaml"),
		path.resolve(root, "../../../../server/src/openapi/openapi.yaml"),
	];
	return candidates.find((candidate) => fs.existsSync(candidate));
}

// Server is private; GitHub CI has no sibling checkout. OpenAPI-source checks run
// wherever the spec is reachable; index.d.ts / README assertions always run.
const openapiPath = resolveOpenApiPath();
const openapiSkip =
	!openapiPath && "OpenAPI file not found; set COMRAID_OPENAPI or keep sibling server checkout";

test("index.d.ts documents required OpenAPI schema and operation names", () => {
	const dts = fs.readFileSync(path.join(root, "src/index.d.ts"), "utf8");

	for (const name of REQUIRED_SCHEMA_NAMES) {
		assert.match(dts, new RegExp(`\\b${name}\\b|OpenAPI \`${name}\``), `index.d.ts missing OpenAPI ${name}`);
	}
	for (const operationId of REQUIRED_OPERATION_IDS) {
		assert.match(dts, new RegExp(`OpenAPI \`${operationId}\``), `index.d.ts missing operationId ${operationId}`);
	}
});

test("OpenAPI source includes schemas and operations tracked by index.d.ts", { skip: openapiSkip }, () => {
	const openapi = fs.readFileSync(openapiPath, "utf8");

	for (const name of REQUIRED_SCHEMA_NAMES) {
		assert.match(openapi, new RegExp(`^\\s{4}${name}:`, "m"), `OpenAPI missing schema ${name}`);
	}
	for (const operationId of REQUIRED_OPERATION_IDS) {
		assert.match(openapi, new RegExp(`operationId:\\s*${operationId}\\b`), `OpenAPI missing operationId ${operationId}`);
	}
});

test("PushSendInput documents OpenAPI Message create targeting and reliability fields", () => {
	const dts = fs.readFileSync(path.join(root, "src/index.d.ts"), "utf8");
	const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

	assert.match(dts, /external_user_ids:\s*string\[\]/);
	assert.doesNotMatch(dts, /endpoint_ids\??:\s*string\[\]/);
	assert.match(dts, /\bttl\??:\s*number\b/);
	assert.match(dts, /\bcollapse_key\??:\s*string\b/);
	assert.match(dts, /\bsend_at_local\??:\s*string\b/);

	assert.match(readme, /external_user_ids/);
	assert.match(readme, /endpoint_ids[`']? is rejected/);
	assert.match(readme, /\bttl\b/);
	assert.match(readme, /collapse_key/);
	assert.match(readme, /send_at_local/);
});

test("OpenAPI Message create documents targeting and reliability fields", { skip: openapiSkip }, () => {
	const openapi = fs.readFileSync(openapiPath, "utf8");
	assert.match(openapi, /to\.endpoint_ids[`']?\s*is rejected/);
	assert.doesNotMatch(openapi, /^\s+endpoint_ids:/m);
	assert.match(openapi, /^\s{8}ttl:/m);
	assert.match(openapi, /^\s{8}collapse_key:/m);
	assert.match(openapi, /^\s{8}send_at_local:/m);
});

test("PushContent documents data_only", () => {
	const dts = fs.readFileSync(path.join(root, "src/index.d.ts"), "utf8");
	assert.match(dts, /data_only\??:\s*boolean/);
});

test("OpenAPI documents data_only on push content", { skip: openapiSkip }, () => {
	const openapi = fs.readFileSync(openapiPath, "utf8");
	assert.match(openapi, /data_only:/);
});

test("segments.archive and restore are typed as SegmentSummary; push.previewAudience is declared", () => {
	const dts = fs.readFileSync(path.join(root, "src/index.d.ts"), "utf8");
	assert.match(
		dts,
		/archive\(segmentId: string, options\?: RequestSignalOptions\): Promise<SegmentSummary>/,
	);
	assert.match(
		dts,
		/restore\(segmentId: string, options\?: RequestSignalOptions\): Promise<SegmentSummary>/,
	);
	assert.match(dts, /previewAudience\(input: PushPreviewAudienceInput\): Promise<TargetingPreviewResponse>/);
	assert.match(dts, /interface TargetingPreviewRequest/);
	assert.match(dts, /interface TargetingPreviewResponse/);
});
