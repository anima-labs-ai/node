import { afterEach, beforeEach, describe, expect, mock, test, spyOn } from "bun:test";

import { AnimaClient } from "../client";

describe("Environment variable fallback", () => {
	const originalFetch = globalThis.fetch;
	const originalEnv = { ...process.env };
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		fetchMock = mock();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		// Clear env vars
		delete process.env.ANIMA_API_KEY;
		delete process.env.ANIMA_API_URL;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		// Restore env
		delete process.env.ANIMA_API_KEY;
		delete process.env.ANIMA_API_URL;
		Object.assign(process.env, originalEnv);
	});

	test("uses ANIMA_API_KEY env var when apiKey not provided", async () => {
		process.env.ANIMA_API_KEY = "sk_env_test";
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const client = new AnimaClient();
		await client.request("GET", "/agents");

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_env_test");
	});

	test("explicit apiKey takes precedence over env var", async () => {
		process.env.ANIMA_API_KEY = "sk_env_test";
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const client = new AnimaClient({ apiKey: "sk_explicit" });
		await client.request("GET", "/agents");

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_explicit");
	});

	test("throws when no apiKey and no env var", () => {
		expect(() => new AnimaClient()).toThrow("Missing API key");
	});

	test("uses ANIMA_API_URL env var for base URL", async () => {
		process.env.ANIMA_API_KEY = "sk_test";
		process.env.ANIMA_API_URL = "https://custom.example.com";
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const client = new AnimaClient();
		await client.request("GET", "/agents");

		const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("https://custom.example.com/api/agents");
	});

	test("explicit baseUrl takes precedence over ANIMA_API_URL", async () => {
		process.env.ANIMA_API_KEY = "sk_test";
		process.env.ANIMA_API_URL = "https://env.example.com";
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const client = new AnimaClient({ baseUrl: "https://explicit.example.com" });
		await client.request("GET", "/agents");

		const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("https://explicit.example.com/api/agents");
	});

	test("defaults to production URL when no env var or option", async () => {
		process.env.ANIMA_API_KEY = "sk_test";
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		const client = new AnimaClient();
		await client.request("GET", "/agents");

		const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("https://api.useanima.sh/api/agents");
	});
});

describe("Debug logging", () => {
	test("debug function is callable and does not throw", async () => {
		// Import dynamically to test the module
		const { debug } = await import("../logger");
		expect(() => debug("test message")).not.toThrow();
		expect(() => debug("test message", { key: "value" })).not.toThrow();
	});
});
