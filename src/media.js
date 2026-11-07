import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { requestOptions } from "./request-options.js";

export const MAX_UPLOAD_BYTES = 1 << 20; // 1 MiB

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);

const JPEG_PREFIX = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Upload a JPEG/PNG for `content.push.image_url` via `POST /media`.
 * Client checks size and type; the server remains the authority.
 */
export async function uploadMedia(client, file, options = {}) {
	const contentType = normalizeContentType(options.contentType);
	const bytes = await readUploadBytes(file);
	assertUploadSize(bytes.byteLength);
	assertImageMagic(bytes, contentType);

	const form = new FormData();
	const filename = contentType === "image/png" ? "upload.png" : "upload.jpg";
	form.append("file", new Blob([bytes], { type: contentType }), filename);

	return client.request(
		requestOptions({
			method: "POST",
			path: "/media",
			body: form,
			idempotencyKey: options.idempotencyKey,
			signal: options.signal,
		}),
	);
}

function normalizeContentType(contentType) {
	if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
		throw new TypeError("uploadMedia contentType must be image/jpeg or image/png");
	}
	return contentType;
}

function assertUploadSize(byteLength) {
	if (byteLength <= 0) {
		throw new TypeError("uploadMedia file must not be empty");
	}
	if (byteLength > MAX_UPLOAD_BYTES) {
		throw new TypeError("uploadMedia file exceeds the 1 MiB limit");
	}
}

function assertImageMagic(bytes, contentType) {
	const buffer = Buffer.from(bytes);
	if (contentType === "image/jpeg" && buffer.subarray(0, 3).equals(JPEG_PREFIX)) return;
	if (contentType === "image/png" && buffer.subarray(0, 8).equals(PNG_PREFIX)) return;
	throw new TypeError("uploadMedia only accepts JPEG or PNG image bytes");
}

async function readUploadBytes(file) {
	if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
		return file instanceof Uint8Array && !(file instanceof Buffer) ? file : new Uint8Array(file);
	}
	if (typeof Blob !== "undefined" && file instanceof Blob) {
		return new Uint8Array(await file.arrayBuffer());
	}
	if (typeof file === "string") {
		const data = await readFile(file);
		return new Uint8Array(data);
	}
	if (isReadableStream(file)) {
		return readStreamLimited(file);
	}
	throw new TypeError("uploadMedia file must be a Buffer, Blob, file path, or Readable stream");
}

function isReadableStream(value) {
	return value != null && typeof value === "object" && typeof value.pipe === "function";
}

async function readStreamLimited(stream) {
	const readable = stream instanceof Readable ? stream : Readable.from(stream);
	const chunks = [];
	let total = 0;
	for await (const chunk of readable) {
		const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		total += part.byteLength;
		if (total > MAX_UPLOAD_BYTES) {
			readable.destroy?.();
			throw new TypeError("uploadMedia file exceeds the 1 MiB limit");
		}
		chunks.push(part);
	}
	return new Uint8Array(Buffer.concat(chunks));
}
