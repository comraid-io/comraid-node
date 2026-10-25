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

test("push.send creates a Single-send Message by External user ID", async () => {
	const { client, calls } = clientWithCapture();
	const result = await client.push.send({
		to: { external_user_ids: ["user_a", "user_b"] },
		content: { title: "Hello", body: "World", image_url: "https://cdn.example/img.png" },
		category: "transactional",
		idempotencyKey: "idem-1",
	});

	assert.equal(result.ok, true);
	assert.equal(calls.length, 1);
	assert.deepEqual(calls[0], {
		method: "POST",
		path: "/messages",
		idempotencyKey: "idem-1",
		body: {
			channel: "push",
			to: { external_user_ids: ["user_a", "user_b"] },
			category: "transactional",
			content: {
				push: { title: "Hello", body: "World", image_url: "https://cdn.example/img.png" },
			},
		},
	});
});

test("push.send creates a Single-send Message by Endpoint id", async () => {
	const { client, calls } = clientWithCapture();
	const endpointId = "2344b756-df66-4311-b3a9-433fd48e8e59";
	await client.push.send({
		to: { endpoint_ids: [endpointId] },
		content: { title: "Anon", body: "Endpoint target" },
	});

	assert.deepEqual(calls[0].body.to, { endpoint_ids: [endpointId] });
	assert.equal(calls[0].body.channel, "push");
	assert.deepEqual(calls[0].body.content.push, { title: "Anon", body: "Endpoint target" });
});

test("push.send and push.broadcast pass through ttl, collapse_key, and send_at_local", async () => {
	const { client, calls } = clientWithCapture();

	await client.push.send({
		to: { external_user_ids: ["user_a"] },
		content: { title: "T", body: "B" },
		ttl: 3600,
		collapse_key: "order-42",
		send_at_local: "2026-10-22T09:00:00",
	});
	assert.equal(calls[0].body.ttl, 3600);
	assert.equal(calls[0].body.collapse_key, "order-42");
	assert.equal(calls[0].body.send_at_local, "2026-10-22T09:00:00");

	await client.push.broadcast({
		targeting: { everyone: true },
		content: { title: "T", body: "B" },
		ttl: 120,
		collapse_key: "promo",
		send_at_local: "2026-10-23T08:00:00",
	});
	assert.equal(calls[1].body.ttl, 120);
	assert.equal(calls[1].body.collapse_key, "promo");
	assert.equal(calls[1].body.send_at_local, "2026-10-23T08:00:00");
});

test("push.multiSend passes through per-recipient ttl and collapse_key", async () => {
	const { client, calls } = clientWithCapture();
	await client.push.multiSend({
		recipients: [
			{
				external_user_id: "user_a",
				content: { title: "Hi", body: "A" },
				ttl: 600,
				collapse_key: "welcome",
			},
		],
	});

	assert.equal(calls[0].body.recipients[0].ttl, 600);
	assert.equal(calls[0].body.recipients[0].collapse_key, "welcome");
});

test("push.send always sets channel to push", async () => {
	const { client, calls } = clientWithCapture();
	await client.push.send({
		to: { external_user_ids: ["user_a"] },
		content: { title: "T", body: "B" },
	});

	assert.equal(calls[0].body.channel, "push");
});

test("push.send and push.multiSend pass through rich OpenAPI push fields", async () => {
	const { client, calls } = clientWithCapture();
	const rich = {
		title: "Order shipped",
		body: "Your package is on the way",
		deep_link: "myapp://orders/42",
		sound: "shipping",
		subtitle: "Tracking update",
		badge: 3,
		thread_id: "orders",
	};

	await client.push.send({
		to: { external_user_ids: ["user_a"] },
		content: rich,
	});
	assert.deepEqual(calls[0].body.content.push, rich);

	await client.push.multiSend({
		recipients: [{ external_user_id: "user_a", content: rich }],
	});
	assert.deepEqual(calls[1].body.recipients[0].content.push, rich);
});

test("push.send and push.broadcast reject the wrong audience shape", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(
		() => client.push.send({ targeting: { everyone: true }, content: { title: "T", body: "B" } }),
		/push\.send requires to \(external_user_ids or endpoint_ids\)/,
	);
	assert.throws(
		() => client.push.broadcast({ to: { external_user_ids: ["a"] }, content: { title: "T", body: "B" } }),
		/push\.broadcast requires targeting/,
	);
	assert.equal(calls.length, 0);
});

test("push.broadcast creates a Message for Segment, rules, or everyone", async () => {
	const { client, calls } = clientWithCapture();

	await client.push.broadcast({
		targeting: { everyone: true },
		content: { title: "All", body: "Hello everyone" },
	});
	assert.deepEqual(calls[0].body, {
		channel: "push",
		targeting: { everyone: true },
		content: { push: { title: "All", body: "Hello everyone" } },
	});

	await client.push.broadcast({
		targeting: { segment_id: "seg_sys_subscribed" },
		content: { title: "Seg", body: "Segment send" },
	});
	assert.equal(calls[1].path, "/messages");
	assert.deepEqual(calls[1].body.targeting, { segment_id: "seg_sys_subscribed" });

	await client.push.broadcast({
		targeting: { rules: { operator: "and", conditions: [{ field: "attr.plan", op: "eq", value: "pro" }] } },
		content: { title: "Rules", body: "Ad-hoc" },
	});
	assert.deepEqual(calls[2].body.targeting.rules.operator, "and");
	assert.equal(calls[2].body.channel, "push");
});

test("push.multiSend creates a Campaign with per-Contact Contents", async () => {
	const { client, calls } = clientWithCapture();
	await client.push.multiSend({
		name: "Welcome batch",
		recipients: [
			{ external_user_id: "user_a", content: { title: "Hi A", body: "Welcome A" } },
			{ external_user_id: "user_b", content: { title: "Hi B", body: "Welcome B" }, priority: "high" },
		],
		idempotencyKey: "camp-1",
	});

	assert.deepEqual(calls[0], {
		method: "POST",
		path: "/campaigns",
		idempotencyKey: "camp-1",
		body: {
			channel: "push",
			name: "Welcome batch",
			recipients: [
				{ external_user_id: "user_a", content: { push: { title: "Hi A", body: "Welcome A" } } },
				{ external_user_id: "user_b", priority: "high", content: { push: { title: "Hi B", body: "Welcome B" } } },
			],
		},
	});
});

test("push.multiSend rejects an empty recipients list", () => {
	const { client, calls } = clientWithCapture();
	assert.throws(() => client.push.multiSend({ recipients: [] }), /non-empty recipients/);
	assert.equal(calls.length, 0);
});

test("push.send accepts data_only Content with optional title/body", async () => {
	const { client, calls } = clientWithCapture();
	await client.push.send({
		to: { external_user_ids: ["user_a"] },
		data: { order_id: "42" },
		content: {
			data_only: true,
			title: "Rematch?",
			body: "Play again",
			actions: [{ id: "accept", text: "Accept" }],
		},
	});
	assert.deepEqual(calls[0].body.content.push, {
		data_only: true,
		title: "Rematch?",
		body: "Play again",
		actions: [{ id: "accept", text: "Accept" }],
	});
	assert.deepEqual(calls[0].body.data, { order_id: "42" });
});

test("push.multiSend passes data_only on child Contents", async () => {
	const { client, calls } = clientWithCapture();
	await client.push.multiSend({
		recipients: [
			{
				external_user_id: "user_a",
				data: { k: "v" },
				content: { data_only: true },
			},
		],
	});
	assert.equal(calls[0].path, "/campaigns");
	assert.deepEqual(calls[0].body.recipients[0].content.push, { data_only: true });
});
