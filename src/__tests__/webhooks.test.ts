import { createHmac } from "node:crypto";

import { describe, expect, test } from "bun:test";

import { ValidationError } from "../errors";
import { constructWebhookEvent, verifyWebhookSignature } from "../webhooks";

function buildSignature(payload: string, secret: string, timestamp: number): string {
	const signedPayload = `${timestamp}.${payload}`;
	const hash = createHmac("sha256", secret).update(signedPayload).digest("hex");
	return `t=${timestamp},v1=${hash}`;
}

describe("webhook verification", () => {
	test("verifies valid signed payload", () => {
		const payload = JSON.stringify({ id: "evt_1", type: "message.sent", data: { messageId: "m1" } });
		const secret = "whsec_test_secret";
		const timestamp = 1_700_000_000;
		const signature = buildSignature(payload, secret, timestamp);

		const valid = verifyWebhookSignature(payload, signature, secret, {
			now: timestamp * 1000,
			toleranceSeconds: 300,
		});

		expect(valid).toBe(true);
	});

	test("rejects invalid signature", () => {
		const payload = JSON.stringify({ type: "message.sent", data: { messageId: "m1" } });
		const signature = "t=1700000000,v1=deadbeef";

		const valid = verifyWebhookSignature(payload, signature, "wrong_secret", {
			now: 1_700_000_000_000,
		});

		expect(valid).toBe(false);
	});

	test("rejects expired timestamp", () => {
		const payload = JSON.stringify({ type: "message.sent", data: { messageId: "m1" } });
		const secret = "whsec_test_secret";
		const timestamp = 1_700_000_000;
		const signature = buildSignature(payload, secret, timestamp);

		const valid = verifyWebhookSignature(payload, signature, secret, {
			now: (timestamp + 1_000) * 1000,
			toleranceSeconds: 300,
		});

		expect(valid).toBe(false);
	});

	test("constructEvent returns parsed event", () => {
		const payload = JSON.stringify({
			id: "evt_1",
			type: "message.sent",
			createdAt: "2026-01-01T00:00:00.000Z",
			data: { messageId: "m1" },
		});
		const secret = "whsec_test_secret";
		const timestamp = 1_700_000_000;
		const signature = buildSignature(payload, secret, timestamp);

		const event = constructWebhookEvent(payload, signature, secret, {
			now: timestamp * 1000,
		});

		expect(event.id).toBe("evt_1");
		expect(event.type).toBe("message.sent");
		expect(event.data.messageId).toBe("m1");
	});

	test("constructEvent throws on invalid signature", () => {
		const payload = JSON.stringify({ type: "message.sent", data: { messageId: "m1" } });

		expect(() => constructWebhookEvent(payload, "t=1,v1=bad", "secret", { now: 1_000 })).toThrow(
			ValidationError,
		);
	});
});
