import { createHmac, timingSafeEqual } from "node:crypto";

import { ValidationError } from "./errors";
import type {
	WebhookEvent,
	WebhookSignatureHeaders,
	WebhookVerificationOptions,
} from "./types";

/**
 * Webhook verification, matching what the platform actually sends.
 *
 * Scheme `v1`: HMAC-SHA256, hex-encoded, over `${timestamp}.${rawBody}`, where
 * `timestamp` is the ISO-8601 string from `X-Anima-Timestamp`. Two headers
 * travel with every delivery:
 *
 *   X-Anima-Signature:  v1=<hex>
 *   X-Anima-Timestamp:  <ISO-8601>
 *
 * The timestamp is inside the signed content rather than merely alongside it,
 * which is what makes replay rejection possible: a captured delivery fails the
 * freshness window, and editing the timestamp to get past it invalidates the
 * MAC.
 *
 * This module previously implemented a Stripe-style single header
 * (`t=<unix>,v1=<hex>`) and MAC'd over a unix-seconds timestamp. Nothing the
 * platform sends has ever matched that, so both exported functions threw on
 * every real delivery. The tests did not catch it because they built their own
 * fixture from the same wrong assumption. See `__tests__/webhooks.test.ts`,
 * which now derives its fixture from the platform's published scheme instead.
 */

const DEFAULT_TOLERANCE_SECONDS = 300;
const SIGNATURE_VERSION = "v1";

function toPayloadString(payload: string | Buffer): string {
	return typeof payload === "string" ? payload : payload.toString("utf8");
}

/** Strips the `v1=` prefix. A bare hex digest passes through unchanged. */
function digestFromHeader(signatureHeader: string): string {
	const prefix = `${SIGNATURE_VERSION}=`;
	return signatureHeader.startsWith(prefix)
		? signatureHeader.slice(prefix.length)
		: signatureHeader;
}

/** Hex HMAC-SHA256 over `${timestamp}.${body}`. */
function computeSignature(
	secret: string,
	timestamp: string,
	body: string,
): string {
	return createHmac("sha256", secret)
		.update(`${timestamp}.${body}`)
		.digest("hex");
}

/**
 * Verifies a delivery's signature and freshness.
 *
 * Pass the **raw** request body. Verifying a re-serialised body will fail even
 * when the delivery is genuine, because re-encoding can reorder keys or change
 * whitespace and the MAC covers bytes.
 */
export function verifyWebhookSignature(
	payload: string | Buffer,
	headers: WebhookSignatureHeaders,
	secret: string,
	options?: WebhookVerificationOptions,
): boolean {
	const signedAt = Date.parse(headers.timestamp);
	if (Number.isNaN(signedAt)) {
		return false;
	}

	const now = options?.now ?? Date.now();
	const toleranceSeconds =
		options?.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
	if (Math.abs(now - signedAt) > toleranceSeconds * 1000) {
		return false;
	}

	const expected = computeSignature(
		secret,
		headers.timestamp,
		toPayloadString(payload),
	);
	const expectedBuffer = Buffer.from(expected, "hex");
	const providedBuffer = Buffer.from(digestFromHeader(headers.signature), "hex");

	if (expectedBuffer.length !== providedBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Verifies a delivery and returns the parsed payload.
 *
 * The payload is flat, so the returned object *is* the delivery: `event` and
 * `occurredAt` alongside that event's own fields. Throws {@link ValidationError}
 * if the signature does not verify or the body is not a webhook payload.
 */
export function constructWebhookEvent(
	payload: string | Buffer,
	headers: WebhookSignatureHeaders,
	secret: string,
	options?: WebhookVerificationOptions,
): WebhookEvent {
	if (!verifyWebhookSignature(payload, headers, secret, options)) {
		throw new ValidationError("Invalid webhook signature");
	}

	const parsed = JSON.parse(toPayloadString(payload)) as unknown;
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new ValidationError("Invalid webhook payload format");
	}

	const obj = parsed as Record<string, unknown>;
	if (typeof obj.event !== "string") {
		throw new ValidationError("Webhook payload missing event name");
	}
	if (typeof obj.occurredAt !== "string") {
		throw new ValidationError("Webhook payload missing occurredAt");
	}

	return obj as WebhookEvent;
}
