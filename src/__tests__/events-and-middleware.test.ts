import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

import { AnimaClient } from "../client";
import { webhookMiddleware } from "../middleware";
import type { RequestEvent, ResponseEvent } from "../types";

describe("Request/Response events", () => {
	const originalFetch = globalThis.fetch;
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		fetchMock = mock();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("emits request event before HTTP call", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const events: RequestEvent[] = [];
		const client = new AnimaClient({ apiKey: "sk_test" });
		client.on("request", (e) => events.push(e));

		await client.request("GET", "/agents");

		expect(events).toHaveLength(1);
		expect(events[0].method).toBe("GET");
		expect(events[0].path).toBe("/agents");
		expect(events[0].headers.Authorization).toBe("Bearer [REDACTED]");
	});

	test("emits response event after HTTP response", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const events: ResponseEvent[] = [];
		const client = new AnimaClient({ apiKey: "sk_test" });
		client.on("response", (e) => events.push(e));

		await client.request("GET", "/agents");

		expect(events).toHaveLength(1);
		expect(events[0].method).toBe("GET");
		expect(events[0].path).toBe("/agents");
		expect(events[0].status).toBe(200);
		expect(typeof events[0].durationMs).toBe("number");
	});

	test("off removes listener", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const events: RequestEvent[] = [];
		const listener = (e: RequestEvent) => events.push(e);
		const client = new AnimaClient({ apiKey: "sk_test" });
		client.on("request", listener);
		client.off("request", listener);

		await client.request("GET", "/agents");

		expect(events).toHaveLength(0);
	});

	test("request event only emitted once even with retries", async () => {
		fetchMock
			.mockResolvedValueOnce(new Response("", { status: 500 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);

		const events: RequestEvent[] = [];
		const client = new AnimaClient({ apiKey: "sk_test", maxRetries: 1 });
		client.on("request", (e) => events.push(e));

		await client.request("GET", "/agents");

		expect(events).toHaveLength(1);
	});
});

describe("webhookMiddleware", () => {
	test("rejects missing signature header", () => {
		const middleware = webhookMiddleware("whsec_test");
		const req = { headers: {}, body: "{}" } as any;
		const res = {
			status: mock(() => res),
			json: mock(() => {}),
		} as any;
		const next = mock();

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
	});

	// The previous version of this test sent `anima-signature: t=1234,v1=invalid`
	// — the old header name, and no timestamp header at all. The middleware turns
	// those away on the missing-header branch before verification ever runs, so
	// the test passed without exercising a single byte of HMAC comparison. Stub
	// verifyWebhookSignature to return true unconditionally and it stayed green.
	//
	// Both cases below therefore send well-formed headers and a fresh timestamp,
	// so the request reaches verification. The pair is what makes them meaningful:
	// the reject case alone still passes if verification always fails, and the
	// accept case alone still passes if it always succeeds.
	const SECRET = "whsec_test";
	// The flat shape the platform actually sends. `{ type, data }` — what this
	// file used before — verifies its signature fine and is then rejected for a
	// missing `event`, which is the payload half of the bug this PR fixes.
	const rawBody = JSON.stringify({
		event: "message.received",
		occurredAt: "2026-08-12T10:00:00.000Z",
	});

	function sign(timestamp: string, body: string): string {
		// Derived from the platform's documented scheme — HMAC-SHA256, hex, over
		// `{timestamp}.{rawBody}` — rather than by calling the SDK's own signer,
		// so this fails if the SDK drifts from what the platform sends.
		return `v1=${createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex")}`;
	}

	test("rejects a present but incorrect signature", () => {
		const middleware = webhookMiddleware(SECRET);
		const req = {
			headers: {
				// Correct shape and length, wrong bytes — so this exercises the MAC
				// comparison rather than an early length or format guard.
				"x-anima-signature": `v1=${"0".repeat(64)}`,
				"x-anima-timestamp": new Date().toISOString(),
			},
			body: rawBody,
		} as any;
		const res = {
			status: mock(() => res),
			json: mock(() => {}),
		} as any;
		const next = mock();

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
	});

	test("accepts a correctly signed delivery", () => {
		const middleware = webhookMiddleware(SECRET);
		const timestamp = new Date().toISOString();
		const req = {
			headers: {
				"x-anima-signature": sign(timestamp, rawBody),
				"x-anima-timestamp": timestamp,
			},
			body: rawBody,
		} as any;
		const res = {
			status: mock(() => res),
			json: mock(() => {}),
		} as any;
		const next = mock();

		middleware(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});
});
