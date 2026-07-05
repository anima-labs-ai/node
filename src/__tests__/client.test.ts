import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { AnimaClient } from "../client";
import { APIError, AuthError, NotFoundError, RateLimitError, ValidationError } from "../errors";

describe("AnimaClient", () => {
	const originalFetch = globalThis.fetch;
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		fetchMock = mock();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("builds request with auth header and query", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const client = new AnimaClient({ apiKey: "mk_test", baseUrl: "https://api.example.com" });
		const result = await client.request<{ ok: boolean }>("GET", "/agents", undefined, { limit: "10" });

		expect(result.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("https://api.example.com/v1/agents?limit=10");
		expect(init.method).toBe("GET");
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer mk_test");
		expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
	});

	test("retries on 429 and succeeds", async () => {
		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: { code: "RATE_LIMIT", message: "slow down" } }), {
					status: 429,
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

		const client = new AnimaClient({ apiKey: "mk_test" });
		const result = await client.request<{ ok: boolean }>("GET", "/health");

		expect(result.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test("parses auth error response", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "bad key" } }), {
				status: 401,
			}),
		);

		const client = new AnimaClient({ apiKey: "mk_test" });
		expect(client.request("GET", "/agents")).rejects.toBeInstanceOf(AuthError);
	});

	test("parses not found error response", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "missing" } }), {
				status: 404,
			}),
		);

		const client = new AnimaClient({ apiKey: "mk_test" });
		expect(client.request("GET", "/agents/123")).rejects.toBeInstanceOf(NotFoundError);
	});

	test("parses validation error response", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { code: "INVALID", message: "invalid input" } }), {
				status: 422,
			}),
		);

		const client = new AnimaClient({ apiKey: "mk_test" });
		expect(client.request("POST", "/agents", {})).rejects.toBeInstanceOf(ValidationError);
	});

	test("parses rate limit error and retry-after", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { code: "RATE_LIMIT", message: "slow down" } }), {
				status: 429,
				headers: { "retry-after": "120" },
			}),
		);

		const client = new AnimaClient({ apiKey: "mk_test", maxRetries: 0 });
		expect(client.request("GET", "/messages")).rejects.toBeInstanceOf(RateLimitError);
	});

	test("throws APIError on timeout", async () => {
		fetchMock.mockImplementationOnce(
			(_url: string, init?: RequestInit) =>
				new Promise((_resolve, reject) => {
					if (!init?.signal) {
						reject(new Error("Missing signal"));
						return;
					}

					init.signal.addEventListener("abort", () => {
						const abortError = new Error("aborted");
						abortError.name = "AbortError";
						reject(abortError);
					});
				}),
		);

		const client = new AnimaClient({ apiKey: "mk_test", timeout: 1, maxRetries: 0 });
		expect(client.request("GET", "/timeout")).rejects.toBeInstanceOf(APIError);
	});
});
