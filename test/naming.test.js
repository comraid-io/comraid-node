import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("primary package name is @comraid/node", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
	assert.equal(pkg.name, "@comraid/node");
});

test("legacy @comraide/node alias package remains", () => {
	const pkgPath = path.join(root, "packages/comraide-node/package.json");
	assert.ok(fs.existsSync(pkgPath), "expected packages/comraide-node/package.json");
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
	assert.equal(pkg.name, "@comraide/node");
});

test("primary export is ComRaid with Comraide alias", async () => {
	const mod = await import(pathToFileURL(path.join(root, "src/index.js")).href);
	assert.equal(typeof mod.ComRaid, "function");
	assert.equal(mod.Comraide, mod.ComRaid);
	assert.equal(mod.ComraideError, mod.ComRaidError);
});

test("@comraide/node alias re-exports the public client API", async () => {
	const entry = path.join(root, "packages/comraide-node/index.js");
	assert.ok(fs.existsSync(entry), "expected packages/comraide-node/index.js");
	const mod = await import(pathToFileURL(entry).href);
	assert.equal(typeof mod.ComRaid, "function");
	assert.equal(typeof mod.Comraide, "function");
	assert.equal(typeof mod.FetchTransport, "function");
});

test("User-Agent uses @comraid/node", () => {
	const transport = fs.readFileSync(path.join(root, "src/transport.js"), "utf8");
	assert.match(transport, /"@comraid\/node\/0\.1\.0"/);
	assert.doesNotMatch(transport, /@comraide\/node\//);
});
