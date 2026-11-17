import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FetchTransport } from "../src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readPackage() {
	return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
}

test("package.json has publish metadata for npm", () => {
	const pkg = readPackage();
	assert.equal(pkg.repository?.type, "git");
	assert.equal(pkg.repository?.url, "git+https://github.com/comraid-io/comraid-node.git");
	assert.equal(pkg.homepage, "https://github.com/comraid-io/comraid-node#readme");
	assert.equal(pkg.bugs?.url, "https://github.com/comraid-io/comraid-node/issues");
	assert.ok(typeof pkg.author === "string" && pkg.author.includes("ComRaid"));
	assert.equal(pkg.publishConfig?.access, "public");
});

test("build writes VERSION from package.json into src/version.js", async () => {
	const { spawnSync } = await import("node:child_process");
	const pkg = readPackage();
	const result = spawnSync(process.execPath, [path.join(root, "scripts/write-version.mjs")], {
		cwd: root,
		encoding: "utf8",
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);
	const mod = await import(`${pathToFileURL(path.join(root, "src/version.js")).href}?t=${Date.now()}`);
	assert.equal(mod.VERSION, pkg.version);
});

test("User-Agent version matches package.json (build-time VERSION)", async () => {
	const pkg = readPackage();
	let captured;
	const fetch = async (_url, init) => {
		captured = init;
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	};
	const transport = new FetchTransport({
		apiKey: "secret",
		baseUrl: "https://api.example.test",
		fetch,
		maxRetries: 0,
	});
	await transport.request({ path: "/health" });
	assert.equal(captured.headers.get("user-agent"), `@comraid/node/${pkg.version}`);
});
