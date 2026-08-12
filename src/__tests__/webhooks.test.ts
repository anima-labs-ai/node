import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { ValidationError } from "../errors";
import { constructWebhookEvent, verifyWebhookSignature } from "../webhooks";

/**
 * These tests exist because the previous ones passed while the code could not
 * process a single real delivery.
 *
 * The old fixture built a Stripe-style `t=<unix>,v1=<hex>` header and a
 * `{ type, data }` payload — both invented to match the implementation. Nothing
 * compared either against what the platform sends, so the suite agreed with the
 * bug and stayed green.
 *
 * So `sign()` below is written from the platform's published scheme rather than
 * from this SDK's parser, and the payload is the real `message.received` shape.
 * Sources, both of which agree with each other:
 *
 *   - apps/api/src/services/webhook-signature.ts — buildWebhookSignatureHeaders
 *   - apps/api/src/workers/inbound-email.ts      — the emitted payload
 *   - docs.useanima.sh/webhooks                  — the customer-facing contract
 *
 * The two `rejects the pre-fix …` cases at the bottom are the regression guards.
 * If someone reintroduces the old scheme, those fail.
 */

const SECRET = "whsec_test_secret";
const SIGNED_AT = "2026-07-28T12:00:00.000Z";
const SIGNED_AT_MS = Date.parse(SIGNED_AT);

/** A real `message.received` delivery: flat, no `data` envelope. */
const PAYLOAD = JSON.stringify({
	event: "message.received",
	occurredAt: SIGNED_AT,
	messageId: "cme9x2k1p0001s601abcdefgh",
	agentId: "cme9x2k1p0000s601ijklmnop",
	channel: "email",
	direction: "INBOUND",
	fromAddress: "user@example.com",
	toAddress: "support-agent@agents.useanima.sh",
	threadId: "cme9x2k1p0002s601qrstuvwx",
	subject: "Hello",
	spam: false,
});

/**
 * Reproduces the platform's signer: HMAC-SHA256 over `${isoTimestamp}.${body}`,
 * hex, presented as `v1=<hex>` in its own header.
 */
function sign(body: string, timestamp: string, secret = SECRET): string {
	const hex = createHmac("sha256", secret)
		.update(`${timestamp}.${body}`)
		.digest("hex");
	return `v1=${hex}`;
}

function headers(body = PAYLOAD, timestamp = SIGNED_AT) {
	return { signature: sign(body, timestamp), timestamp };
}

describe("verifyWebhookSignature", () => {
	test("accepts a genuine delivery", () => {
		expect(
			verifyWebhookSignature(PAYLOAD, headers(), SECRET, {
				now: SIGNED_AT_MS,
			}),
		).toBe(true);
	});

	test("accepts a bare hex digest without the v1= prefix", () => {
		const { signature, timestamp } = headers();
		expect(
			verifyWebhookSignature(
				PAYLOAD,
				{ signature: signature.replace("v1=", ""), timestamp },
				SECRET,
				{ now: SIGNED_AT_MS },
			),
		).toBe(true);
	});

	test("accepts a Buffer body", () => {
		expect(
			verifyWebhookSignature(Buffer.from(PAYLOAD, "utf8"), headers(), SECRET, {
				now: SIGNED_AT_MS,
			}),
		).toBe(true);
	});

	test("rejects a tampered body", () => {
		const tampered = PAYLOAD.replace("user@example.com", "attacker@evil.com");
		expect(
			verifyWebhookSignature(tampered, headers(), SECRET, {
				now: SIGNED_AT_MS,
			}),
		).toBe(false);
	});

	test("rejects the wrong secret", () => {
		expect(
			verifyWebhookSignature(PAYLOAD, headers(), "whsec_other", {
				now: SIGNED_AT_MS,
			}),
		).toBe(false);
	});

	test("rejects a delivery outside the freshness window", () => {
		expect(
			verifyWebhookSignature(PAYLOAD, headers(), SECRET, {
				now: SIGNED_AT_MS + 301_000,
				toleranceSeconds: 300,
			}),
		).toBe(false);
	});

	test("rejects a replay whose timestamp was edited to look fresh", () => {
		// The captured signature stays valid only for the timestamp it signed, so
		// moving the clock forward breaks the MAC rather than the freshness check.
		const captured = headers();
		const replayedAt = new Date(SIGNED_AT_MS + 3_600_000).toISOString();

		expect(
			verifyWebhookSignature(
				PAYLOAD,
				{ signature: captured.signature, timestamp: replayedAt },
				SECRET,
				{ now: Date.parse(replayedAt) },
			),
		).toBe(false);
	});

	test("rejects an unparseable timestamp", () => {
		expect(
			verifyWebhookSignature(
				PAYLOAD,
				{ signature: sign(PAYLOAD, "not-a-date"), timestamp: "not-a-date" },
				SECRET,
				{ now: SIGNED_AT_MS },
			),
		).toBe(false);
	});
});

describe("constructWebhookEvent", () => {
	test("returns the delivery flat, with no data envelope to unwrap", () => {
		const event = constructWebhookEvent(PAYLOAD, headers(), SECRET, {
			now: SIGNED_AT_MS,
		});

		expect(event.event).toBe("message.received");
		expect(event.occurredAt).toBe(SIGNED_AT);
		expect(event.messageId).toBe("cme9x2k1p0001s601abcdefgh");
		expect(event.channel).toBe("email");
		expect(event.spam).toBe(false);
		expect(event.data).toBeUndefined();
	});

	test("throws on an invalid signature", () => {
		expect(() =>
			constructWebhookEvent(
				PAYLOAD,
				{ signature: "v1=deadbeef", timestamp: SIGNED_AT },
				SECRET,
				{ now: SIGNED_AT_MS },
			),
		).toThrow(ValidationError);
	});

	test("throws when the payload has no event name", () => {
		const body = JSON.stringify({ occurredAt: SIGNED_AT });
		expect(() =>
			constructWebhookEvent(body, headers(body), SECRET, { now: SIGNED_AT_MS }),
		).toThrow(ValidationError);
	});

	test("throws when the payload has no occurredAt", () => {
		const body = JSON.stringify({ event: "message.sent" });
		expect(() =>
			constructWebhookEvent(body, headers(body), SECRET, { now: SIGNED_AT_MS }),
		).toThrow(ValidationError);
	});
});

describe("regression guards for the pre-fix scheme", () => {
	test("rejects the pre-fix combined t=,v1= signature header", () => {
		// What this SDK used to expect. The platform has never sent it: the
		// timestamp travels in X-Anima-Timestamp, and the signature header holds
		// only `v1=<hex>`.
		const unix = Math.floor(SIGNED_AT_MS / 1000);
		const hex = createHmac("sha256", SECRET)
			.update(`${unix}.${PAYLOAD}`)
			.digest("hex");

		expect(
			verifyWebhookSignature(
				PAYLOAD,
				{ signature: `t=${unix},v1=${hex}`, timestamp: SIGNED_AT },
				SECRET,
				{ now: SIGNED_AT_MS },
			),
		).toBe(false);
	});

	test("rejects the pre-fix { type, data } payload", () => {
		// A correctly signed body in the old envelope shape still has no `event`,
		// so it cannot be mistaken for a delivery.
		const body = JSON.stringify({
			id: "evt_1",
			type: "message.sent",
			createdAt: SIGNED_AT,
			data: { messageId: "m1" },
		});

		expect(() =>
			constructWebhookEvent(body, headers(body), SECRET, { now: SIGNED_AT_MS }),
		).toThrow(ValidationError);
	});
});
