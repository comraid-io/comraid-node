import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("legacy @comraide/node package name remains", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
	assert.equal(pkg.name, "@comraide/node");
});

test("new @comraid/node package name exists beside legacy", () => {
	const pkgPath = path.join(root, "packages/comraid-node/package.json");
	assert.ok(fs.existsSync(pkgPath), "expected packages/comraid-node/package.json");
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
	assert.equal(pkg.name, "@comraid/node");
});

test("@comraid/node re-exports the public client API", async () => {
	const entry = path.join(root, "packages/comraid-node/index.js");
	assert.ok(fs.existsSync(entry), "expected packages/comraid-node/index.js");
	const mod = await import(pathToFileURL(entry).href);
	assert.equal(typeof mod.Comraide, "function");
	assert.equal(typeof mod.FetchTransport, "function");
});
