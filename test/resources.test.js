import assert from "node:assert/strict";
import test from "node:test";
import { ComRaid } from "../src/index.js";

function clientWithCapture() {
	const calls = [];
	const client = new ComRaid({
		transport: {
			request: async (options) => {
				calls.push(options);
				return { ok: true, echo: options };
			},
		},
	});
	return { client, calls };
}

test("messages.get fetches Message detail by id", async () => {
	const { client, calls } = clientWithCapture();
	const result = await client.messages.get("11111111-1111-4111-8111-111111111111", {
		signal: AbortSignal.timeout(5_000),
	});

	assert.equal(result.ok, true);
	assert.deepEqual(calls[0], {
		method: "GET",
		path: "/messages/11111111-1111-4111-8111-111111111111",
		signal: calls[0].signal,
	});
	assert.ok(calls[0].signal instanceof AbortSignal);
});

test("messages.cancel posts cancel for a Message id", async () => {
	const { client, calls } = clientWithCapture();
	await client.messages.cancel("11111111-1111-4111-8111-111111111111");

	assert.deepEqual(calls[0], {
		method: "POST",
		path: "/messages/11111111-1111-4111-8111-111111111111/cancel",
	});
});

test("messages.get and messages.cancel require a message id", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.messages.get(""), /messages\.get requires a message id/);
	assert.throws(() => client.messages.cancel(null), /messages\.cancel requires a message id/);
	assert.equal(calls.length, 0);
});

test("contacts.create posts ContactCreate", async () => {
	const { client, calls } = clientWithCapture();
	await client.contacts.create({
		external_user_id: "user_a",
		name: "Ada",
		attributes: { plan: "pro" },
		idempotencyKey: "contact-1",
	});

	assert.deepEqual(calls[0], {
		method: "POST",
		path: "/contacts",
		idempotencyKey: "contact-1",
		body: {
			external_user_id: "user_a",
			name: "Ada",
			attributes: { plan: "pro" },
		},
	});
});

test("contacts.upsert puts ContactUpsert by External user ID", async () => {
	const { client, calls } = clientWithCapture();
	await client.contacts.upsert("user/with spaces", {
		locale: "en-US",
		timezone: "America/New_York",
		attributes: { plan: "free" },
	});

	assert.deepEqual(calls[0], {
		method: "PUT",
		path: "/contacts/user%2Fwith%20spaces",
		body: {
			locale: "en-US",
			timezone: "America/New_York",
			attributes: { plan: "free" },
		},
	});
});

test("contacts.create requires external_user_id", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.contacts.create({ name: "Ada" }), /contacts\.create requires external_user_id/);
	assert.equal(calls.length, 0);
});

test("contacts.upsert requires external_user_id", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.contacts.upsert("", { name: "Ada" }), /contacts\.upsert requires external_user_id/);
	assert.equal(calls.length, 0);
});

test("attributes.upsert puts contact attributes by External user ID", async () => {
	const { client, calls } = clientWithCapture();
	await client.attributes.upsert("user_a", {
		attributes: { plan: "pro", seats: 3 },
	});

	assert.deepEqual(calls[0], {
		method: "PUT",
		path: "/contacts/user_a/attributes",
		body: { attributes: { plan: "pro", seats: 3 } },
	});
});

test("attributes.upsert requires external_user_id and attributes object", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.attributes.upsert("", { attributes: {} }), /attributes\.upsert requires external_user_id/);
	assert.throws(
		() => client.attributes.upsert("user_a", { attributes: null }),
		/attributes\.upsert requires attributes/,
	);
	assert.equal(calls.length, 0);
});

test("segments.list gets active Segments", async () => {
	const { client, calls } = clientWithCapture();
	await client.segments.list();

	assert.deepEqual(calls[0], {
		method: "GET",
		path: "/segments",
	});
});

test("segments.create posts SegmentCreate", async () => {
	const { client, calls } = clientWithCapture();
	await client.segments.create({
		name: "Pro users",
		description: "Paid plan",
		rules: { operator: "and", conditions: [{ field: "attr.plan", op: "eq", value: "pro" }] },
	});

	assert.deepEqual(calls[0], {
		method: "POST",
		path: "/segments",
		body: {
			name: "Pro users",
			description: "Paid plan",
			rules: { operator: "and", conditions: [{ field: "attr.plan", op: "eq", value: "pro" }] },
		},
	});
});

test("segments.get / update / archive / restore use Segment id paths", async () => {
	const { client, calls } = clientWithCapture();
	const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

	await client.segments.get(id);
	await client.segments.update(id, {
		name: "Renamed",
		rules: { operator: "or", conditions: [{ field: "attr.plan", op: "eq", value: "free" }] },
	});
	await client.segments.archive(id);
	await client.segments.restore(id);

	assert.deepEqual(
		calls.map((c) => ({ method: c.method, path: c.path })),
		[
			{ method: "GET", path: `/segments/${id}` },
			{ method: "PUT", path: `/segments/${id}` },
			{ method: "DELETE", path: `/segments/${id}` },
			{ method: "POST", path: `/segments/${id}/restore` },
		],
	);
	assert.deepEqual(calls[1].body, {
		name: "Renamed",
		rules: { operator: "or", conditions: [{ field: "attr.plan", op: "eq", value: "free" }] },
	});
});

test("segments.create requires name and rules", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.segments.create({ rules: { operator: "and", conditions: [] } }), /segments\.create requires name/);
	assert.throws(() => client.segments.create({ name: "X" }), /segments\.create requires rules/);
	assert.equal(calls.length, 0);
});

test("segments methods require a segment id", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.segments.get(""), /segments\.get requires a segment id/);
	assert.throws(() => client.segments.update(null, { name: "X", rules: { operator: "and", conditions: [] } }), /segments\.update requires a segment id/);
	assert.throws(() => client.segments.archive(undefined), /segments\.archive requires a segment id/);
	assert.throws(() => client.segments.restore(""), /segments\.restore requires a segment id/);
	assert.equal(calls.length, 0);
});
