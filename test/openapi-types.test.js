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
	"MessageDetail",
	"SegmentCreate",
	"SegmentRules",
	"TargetingSpec",
	"PushAction",
	"MessageAccepted",
	"CampaignAccepted",
];

const REQUIRED_OPERATION_IDS = [
	"getMessage",
	"cancelMessage",
	"createContact",
	"upsertContact",
	"upsertContactAttributes",
	"listSegments",
	"createSegment",
	"getSegment",
	"updateSegment",
	"archiveSegment",
	"restoreSegment",
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

test("index.d.ts stays aligned with OpenAPI schema and operation names", () => {
	const openapiPath = resolveOpenApiPath();
	assert.ok(openapiPath, "OpenAPI file not found; set COMRAID_OPENAPI or keep sibling server checkout");
	const openapi = fs.readFileSync(openapiPath, "utf8");
	const dts = fs.readFileSync(path.join(root, "src/index.d.ts"), "utf8");

	for (const name of REQUIRED_SCHEMA_NAMES) {
		assert.match(openapi, new RegExp(`^\\s{4}${name}:`, "m"), `OpenAPI missing schema ${name}`);
		assert.match(dts, new RegExp(`\\b${name}\\b|OpenAPI \`${name}\``), `index.d.ts missing OpenAPI ${name}`);
	}
	for (const operationId of REQUIRED_OPERATION_IDS) {
		assert.match(openapi, new RegExp(`operationId:\\s*${operationId}\\b`), `OpenAPI missing operationId ${operationId}`);
		assert.match(dts, new RegExp(`OpenAPI \`${operationId}\``), `index.d.ts missing operationId ${operationId}`);
	}
});

test("PushSendInput documents OpenAPI Message create targeting and reliability fields", () => {
	const dts = fs.readFileSync(path.join(root, "src/index.d.ts"), "utf8");
	const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

	assert.match(dts, /endpoint_ids\??:\s*string\[\]/);
	assert.match(dts, /\bttl\??:\s*number\b/);
	assert.match(dts, /\bcollapse_key\??:\s*string\b/);
	assert.match(dts, /\bsend_at_local\??:\s*string\b/);

	assert.match(readme, /endpoint_ids/);
	assert.match(readme, /\bttl\b/);
	assert.match(readme, /collapse_key/);
	assert.match(readme, /send_at_local/);

	const openapiPath = resolveOpenApiPath();
	assert.ok(openapiPath, "OpenAPI file not found; set COMRAID_OPENAPI or keep sibling server checkout");
	const openapi = fs.readFileSync(openapiPath, "utf8");
	assert.match(openapi, /endpoint_ids:/);
	assert.match(openapi, /^\s{8}ttl:/m);
	assert.match(openapi, /^\s{8}collapse_key:/m);
	assert.match(openapi, /^\s{8}send_at_local:/m);
});
