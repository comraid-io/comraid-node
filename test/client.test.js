import assert from "node:assert/strict";
import test from "node:test";
import { Comraide, ComraideError, FetchTransport } from "../src/index.js";

test("rejects paths that would send credentials to another origin", async () => {
	let calls = 0;
	const transport = new FetchTransport({ apiKey: "secret", baseUrl: "https://api.example.test", fetch: async () => { calls++; } });
	for (const path of ["//other.example/send", "/\\other.example/send"]) {
		await assert.rejects(transport.request({ path }), /configured API origin/);
	}
	assert.equal(calls, 0);
});

test("timeout covers stalled response bodies", async () => {
	const transport = new FetchTransport({
		apiKey: "secret", baseUrl: "https://api.example.test", timeoutMs: 20, maxRetries: 0,
		fetch: async (_url, { signal }) => new Response(new ReadableStream({
			start(controller) {
				signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
			},
		})),
	});
	await assert.rejects(transport.request({ path: "/slow" }), error => error.code === "TIMEOUT");
});

test("validates retry and timeout limits", () => {
	for (const settings of [{ maxRetries: -1 }, { maxRetries: Infinity }, { timeoutMs: NaN }, { timeoutMs: 0 }]) {
		assert.throws(() => new FetchTransport({ apiKey: "secret", baseUrl: "https://api.example.test", ...settings }), TypeError);
	}
});

test("uses authentication, query values, and JSON bodies", async () => {
	let captured;
	const fetch = async (url, init) => {
		captured = { url, init };
		return new Response(JSON.stringify({ accepted: true }), {
			status: 202,
			headers: { "content-type": "application/json" },
		});
	};
	const client = new Comraide({ apiKey: "secret", baseUrl: "https://api.example.test", fetch, maxRetries: 0 });
	const result = await client.request({ method: "POST", path: "/contract-defined-path", query: { dryRun: true }, body: { hello: "world" } });

	assert.deepEqual(result, { accepted: true });
	assert.equal(captured.url.toString(), "https://api.example.test/contract-defined-path?dryRun=true");
	assert.equal(captured.init.headers.get("authorization"), "Bearer secret");
	assert.equal(captured.init.body, JSON.stringify({ hello: "world" }));
});

test("retries idempotent reads", async () => {
	let attempts = 0;
	const fetch = async () => {
		attempts += 1;
		return attempts === 1
			? new Response(JSON.stringify({ message: "busy" }), { status: 503, headers: { "content-type": "application/json", "retry-after": "0" } })
			: new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
	};
	const transport = new FetchTransport({ apiKey: "secret", baseUrl: "https://api.example.test", fetch, maxRetries: 1 });
	assert.deepEqual(await transport.request({ path: "/health" }), { ok: true });
	assert.equal(attempts, 2);
});

test("does not retry unsafe mutations without an idempotency key", async () => {
	let attempts = 0;
	const fetch = async () => {
		attempts += 1;
		return new Response(JSON.stringify({ code: "UNAVAILABLE", message: "try later" }), {
			status: 503,
			headers: { "content-type": "application/json", "x-request-id": "req-1" },
		});
	};
	const client = new Comraide({ apiKey: "secret", baseUrl: "https://api.example.test", fetch, maxRetries: 3 });
	await assert.rejects(
		client.request({ method: "POST", path: "/send", body: {} }),
		error => error instanceof ComraideError && error.code === "UNAVAILABLE" && error.requestId === "req-1",
	);
	assert.equal(attempts, 1);
});

test("supports an injected transport without API configuration", async () => {
	const client = new Comraide({ transport: { request: async options => ({ path: options.path }) } });
	assert.deepEqual(await client.request({ path: "/custom" }), { path: "/custom" });
	assert.match(client.createIdempotencyKey(), /^[0-9a-f-]{36}$/);
});
