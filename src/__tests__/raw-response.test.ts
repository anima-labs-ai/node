import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { AnimaClient } from "../client";

describe("Raw response", () => {
	const originalFetch = globalThis.fetch;
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		fetchMock = mock();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("returns data directly by default", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ id: "agent_1", name: "Test" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const client = new AnimaClient({ apiKey: "sk_test" });
		const result = await client.request<{ id: string; name: string }>("GET", "/agents/1");

		expect(result.id).toBe("agent_1");
		expect(result.name).toBe("Test");
	});

	test("returns { data, response } when rawResponse is true", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ id: "agent_1", name: "Test" }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"x-request-id": "req_abc123",
				},
			}),
		);

		const client = new AnimaClient({ apiKey: "sk_test" });
		const result = await client.request<{ data: { id: string; name: string }; response: { status: number; requestId: string | null; responseTimeMs: number; headers: Record<string, string> } }>(
			"GET",
			"/agents/1",
			undefined,
			undefined,
			{ rawResponse: true },
		);

		expect(result.data.id).toBe("agent_1");
		expect(result.data.name).toBe("Test");
		expect(result.response.status).toBe(200);
		expect(result.response.requestId).toBe("req_abc123");
		expect(typeof result.response.responseTimeMs).toBe("number");
		expect(result.response.headers["content-type"]).toBe("application/json");
	});

	test("raw response with 204 returns undefined data", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(null, {
				status: 204,
				headers: { "x-request-id": "req_del456" },
			}),
		);

		const client = new AnimaClient({ apiKey: "sk_test" });
		const result = await client.request<{ data: undefined; response: { status: number; requestId: string | null } }>(
			"DELETE",
			"/agents/1",
			undefined,
			undefined,
			{ rawResponse: true },
		);

		expect(result.data).toBeUndefined();
		expect(result.response.status).toBe(204);
		expect(result.response.requestId).toBe("req_del456");
	});

	test("raw response includes timing information", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const client = new AnimaClient({ apiKey: "sk_test" });
		const result = await client.request<{ data: unknown; response: { responseTimeMs: number } }>(
			"GET",
			"/test",
			undefined,
			undefined,
			{ rawResponse: true },
		);

		expect(result.response.responseTimeMs).toBeGreaterThanOrEqual(0);
	});
});
