import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const misspellings = ["comraide", "Comraide", "@comraide", "com.comraide"];

test("primary package name is @comraid/node", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
	assert.equal(pkg.name, "@comraid/node");
	assert.ok(!pkg.keywords?.includes("comraide"));
});

test("legacy @comraide/node alias package is removed", () => {
	assert.equal(fs.existsSync(path.join(root, "packages/comraide-node")), false);
});

test("primary export is ComRaid without Comraide alias", async () => {
	const mod = await import(pathToFileURL(path.join(root, "src/index.js")).href);
	assert.equal(typeof mod.ComRaid, "function");
	assert.equal(mod.Comraide, undefined);
	assert.equal(mod.ComraideError, undefined);
	assert.equal(mod.ComraideTimeoutError, undefined);
});

test("User-Agent uses @comraid/node only", () => {
	const transport = fs.readFileSync(path.join(root, "src/transport.js"), "utf8");
	assert.match(transport, /"@comraid\/node\/0\.1\.0"/);
	assert.doesNotMatch(transport, /@comraide\/node\//);
});

test("shipped paths contain no comraide misspelling", () => {
	const shipRoots = [
		path.join(root, "src"),
		path.join(root, "package.json"),
		path.join(root, "README.md"),
		path.join(root, "LICENSE"),
	];
	const offenders = [];
	for (const ship of shipRoots) {
		const files = fs.statSync(ship).isDirectory()
			? fs.readdirSync(ship, { withFileTypes: true }).flatMap((entry) => {
					const full = path.join(ship, entry.name);
					return entry.isFile() ? [full] : [];
				})
			: [ship];
		for (const file of files) {
			const text = fs.readFileSync(file, "utf8");
			for (const needle of misspellings) {
				if (text.includes(needle)) offenders.push(`${path.relative(root, file)}:${needle}`);
			}
		}
	}
	assert.deepEqual(offenders, []);
});
