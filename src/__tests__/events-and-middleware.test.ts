import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

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

	test("rejects invalid signature", () => {
		const middleware = webhookMiddleware("whsec_test");
		const req = {
			headers: { "anima-signature": "t=1234,v1=invalid" },
			body: JSON.stringify({ type: "test", data: {} }),
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
});
