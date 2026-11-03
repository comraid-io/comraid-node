import { createPrivateKey, sign as cryptoSign } from "node:crypto";

const AUDIENCE = "comraid:identity";
const DEFAULT_EXPIRES_IN_SECONDS = 5 * 60;
const MAX_EXPIRES_IN_SECONDS = 10 * 60;

function base64url(input) {
	const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
	return buf.toString("base64url");
}

function requireNonEmptyString(value, name) {
	if (typeof value !== "string" || value.trim() === "") {
		throw new TypeError(`${name} must be a non-empty string`);
	}
	return value.trim();
}

function resolveExpiresIn(expiresIn) {
	if (expiresIn === undefined || expiresIn === null) {
		return DEFAULT_EXPIRES_IN_SECONDS;
	}
	if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
		throw new TypeError("expiresIn must be a positive number of seconds");
	}
	const seconds = Math.floor(expiresIn);
	if (seconds > MAX_EXPIRES_IN_SECONDS) {
		throw new RangeError(
			`expiresIn must be at most ${MAX_EXPIRES_IN_SECONDS} seconds (10 minutes)`,
		);
	}
	return seconds;
}

/**
 * Mint an RS256 Identity verification JWT for mobile `login(externalUserId, jwt)`.
 *
 * Claims match server verification: iss=`comraid:{projectId}`, aud=`comraid:identity`,
 * sub + external_user_id, iat/exp (max 10 minutes).
 *
 * @param {string} externalUserId
 * @param {{
 *   projectId: string,
 *   privateKey: string | import('node:crypto').KeyObject,
 *   kid: string,
 *   expiresIn?: number,
 * }} options
 * @returns {string} compact JWT
 */
export function createToken(externalUserId, options = {}) {
	const sub = requireNonEmptyString(externalUserId, "externalUserId");
	const projectId = requireNonEmptyString(options.projectId, "projectId");
	const kid = requireNonEmptyString(options.kid, "kid");
	if (options.privateKey == null || options.privateKey === "") {
		throw new TypeError("privateKey is required");
	}

	const expiresIn = resolveExpiresIn(options.expiresIn);
	// Undocumented `now` (unix seconds) is for tests only — not part of the public API.
	const iat =
		typeof options.now === "number" && Number.isFinite(options.now)
			? Math.floor(options.now)
			: Math.floor(Date.now() / 1000);
	const exp = iat + expiresIn;

	const header = { alg: "RS256", typ: "JWT", kid };
	const payload = {
		external_user_id: sub,
		sub,
		iss: `comraid:${projectId}`,
		aud: AUDIENCE,
		iat,
		exp,
	};

	const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
	const key =
		typeof options.privateKey === "string"
			? createPrivateKey(options.privateKey)
			: options.privateKey;
	const signature = cryptoSign("RSA-SHA256", Buffer.from(signingInput), key);
	return `${signingInput}.${base64url(signature)}`;
}

export const identity = {
	createToken,
};
