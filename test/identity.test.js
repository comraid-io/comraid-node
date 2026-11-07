import assert from "node:assert/strict";
import { generateKeyPairSync, createPublicKey, verify as cryptoVerify } from "node:crypto";
import test from "node:test";
import { identity } from "../src/index.js";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const EXTERNAL_USER_ID = "user_123";
const KID = "key-1";
const AUDIENCE = "comraid:identity";

function generatePemPair() {
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});
	return { privateKey, publicKey };
}

function decodeJwt(raw) {
	const [headerB64, payloadB64, signatureB64] = raw.split(".");
	assert.equal(raw.split(".").length, 3);
	const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
	const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
	return { header, payload, headerB64, payloadB64, signatureB64 };
}

function verifyRs256(raw, publicKeyPem) {
	const { headerB64, payloadB64, signatureB64 } = decodeJwt(raw);
	const key = createPublicKey(publicKeyPem);
	return cryptoVerify(
		"RSA-SHA256",
		Buffer.from(`${headerB64}.${payloadB64}`),
		key,
		Buffer.from(signatureB64, "base64url"),
	);
}

test("identity.createJwt returns an RS256 JWT ComRaid login accepts", () => {
	const { privateKey, publicKey } = generatePemPair();
	const token = identity.createJwt(EXTERNAL_USER_ID, {
		projectId: PROJECT_ID,
		privateKey,
		kid: KID,
		expiresIn: 300,
	});

	assert.equal(typeof token, "string");
	assert.ok(verifyRs256(token, publicKey));

	const { header, payload } = decodeJwt(token);
	assert.equal(header.alg, "RS256");
	assert.equal(header.typ, "JWT");
	assert.equal(header.kid, KID);
	assert.equal(payload.iss, `comraid:${PROJECT_ID}`);
	assert.equal(payload.aud, AUDIENCE);
	assert.equal(payload.sub, EXTERNAL_USER_ID);
	assert.equal(payload.external_user_id, EXTERNAL_USER_ID);
	assert.equal(typeof payload.iat, "number");
	assert.equal(typeof payload.exp, "number");
	assert.equal(payload.exp - payload.iat, 300);
});

test("identity.createJwt rejects expired lifetime beyond the 10 minute max", () => {
	const { privateKey } = generatePemPair();
	assert.throws(
		() =>
			identity.createJwt(EXTERNAL_USER_ID, {
				projectId: PROJECT_ID,
				privateKey,
				kid: KID,
				expiresIn: 601,
			}),
		/expiresIn|10 minute|600/i,
	);
});

test("createJwt embeds the requested external_user_id in sub and external_user_id claims", () => {
	const { privateKey } = generatePemPair();
	const token = identity.createJwt(EXTERNAL_USER_ID, {
		projectId: PROJECT_ID,
		privateKey,
		kid: KID,
	});
	const { payload } = decodeJwt(token);
	assert.equal(payload.sub, EXTERNAL_USER_ID);
	assert.equal(payload.external_user_id, EXTERNAL_USER_ID);
});

test("createJwt can mint a past-dated JWT for server expiry checks (test-only now)", () => {
	const { privateKey } = generatePemPair();
	const token = identity.createJwt(EXTERNAL_USER_ID, {
		projectId: PROJECT_ID,
		privateKey,
		kid: KID,
		expiresIn: 60,
		now: Math.floor(Date.now() / 1000) - 120,
	});
	const { payload } = decodeJwt(token);
	assert.ok(payload.exp < Math.floor(Date.now() / 1000));
});
