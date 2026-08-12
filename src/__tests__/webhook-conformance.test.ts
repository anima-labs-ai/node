import { describe, expect, test } from "bun:test";

import { constructWebhookEvent, verifyWebhookSignature } from "../webhooks";

/**
 * Cross-repo conformance: does this SDK verify what the platform actually signs?
 *
 * `webhooks.test.ts` reproduces the platform's signing scheme by hand, which is
 * an improvement on what came before but still a copy — and a copy can drift
 * back. This imports the monorepo's own signer and feeds its output to the SDK,
 * so the two cannot disagree without something here going red.
 *
 * That is the check that was missing. The SDK shipped a Stripe-style
 * `t=<unix>,v1=<hex>` header and a `{ type, data }` envelope; the platform has
 * always sent `X-Anima-Signature: v1=<hex>` with a separate ISO-8601
 * `X-Anima-Timestamp`, over a flat payload. Both sides had passing tests. Only
 * something spanning them could have caught it.
 *
 * `webhook-signature.ts` is a pure module — no database, no server boot — so
 * unlike `integration.test.ts` this needs nothing but the monorepo on disk.
 *
 * Skips when the monorepo is absent, which is the case in CI. Deliberately
 * loud about it: a silent skip here would restore the exact blind spot.
 */

// Structural, not a path-based type import: the monorepo is not on disk in CI
// and this file is typechecked there (tsconfig.tests.json).
interface PlatformSigner {
	buildWebhookSignatureHeaders(
		secret: string,
		body: string,
		timestamp: string,
	): { "X-Anima-Signature": string; "X-Anima-Timestamp": string };
}

const signerPath =
	process.env.ANIMA_WEBHOOK_SIGNER_PATH ??
	"../../../anima/apps/api/src/services/webhook-signature";

let platform: PlatformSigner | null = null;
let loadError: unknown = null;

try {
	platform = (await import(signerPath)) as unknown as PlatformSigner;
} catch (err) {
	loadError = err;
}

if (!platform) {
	console.warn(
		`[webhook conformance] SKIPPED — the monorepo signer was not loadable from "${signerPath}". ` +
			"This suite is the only cross-repo check that the SDK verifies what the platform signs. " +
			`Set ANIMA_WEBHOOK_SIGNER_PATH to run it. Original error: ${
				loadError instanceof Error ? loadError.message : String(loadError)
			}`,
	);
}

const itReal = platform ? test : test.skip;

describe("conformance with the platform signer", () => {
	const SECRET = "whsec_conformance";
	const TIMESTAMP = "2026-07-28T12:00:00.000Z";
	const BODY = JSON.stringify({
		event: "message.received",
		occurredAt: TIMESTAMP,
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

	itReal("the SDK verifies headers the platform produced", () => {
		const headers = (platform as PlatformSigner).buildWebhookSignatureHeaders(
			SECRET,
			BODY,
			TIMESTAMP,
		);

		expect(
			verifyWebhookSignature(
				BODY,
				{
					signature: headers["X-Anima-Signature"],
					timestamp: headers["X-Anima-Timestamp"],
				},
				SECRET,
				{ now: Date.parse(TIMESTAMP) },
			),
		).toBe(true);
	});

	itReal("the platform emits exactly the two headers the SDK reads", () => {
		const headers = (platform as PlatformSigner).buildWebhookSignatureHeaders(
			SECRET,
			BODY,
			TIMESTAMP,
		);

		expect(Object.keys(headers).sort()).toEqual([
			"X-Anima-Signature",
			"X-Anima-Timestamp",
		]);
		expect(headers["X-Anima-Signature"]).toMatch(/^v1=[0-9a-f]{64}$/);
		expect(headers["X-Anima-Timestamp"]).toBe(TIMESTAMP);
	});

	itReal("constructWebhookEvent parses a platform-signed delivery", () => {
		const headers = (platform as PlatformSigner).buildWebhookSignatureHeaders(
			SECRET,
			BODY,
			TIMESTAMP,
		);

		const event = constructWebhookEvent(
			BODY,
			{
				signature: headers["X-Anima-Signature"],
				timestamp: headers["X-Anima-Timestamp"],
			},
			SECRET,
			{ now: Date.parse(TIMESTAMP) },
		);

		expect(event.event).toBe("message.received");
		expect(event.messageId).toBe("cme9x2k1p0001s601abcdefgh");
		expect(event.data).toBeUndefined();
	});
});
