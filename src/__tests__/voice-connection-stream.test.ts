/**
 * Tests for VoiceConnection.speakStream()
 *
 * Wire format: VoiceConnection.send() emits flat JSON objects:
 *   { type, ...data, requestId }
 * So a call.speak.chunk frame looks like:
 *   { type: "call.speak.chunk", callId: "call-1", text: "Hello", requestId: "..." }
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import WebSocket from "ws";

import { VoiceConnection } from "../voice-connection";

// ---------------------------------------------------------------------------
// WebSocket mock
// ---------------------------------------------------------------------------

type MockWs = {
	readyState: number;
	sentMessages: string[];
	send: ReturnType<typeof mock>;
	on: ReturnType<typeof mock>;
	removeAllListeners: ReturnType<typeof mock>;
	close: ReturnType<typeof mock>;
};

function makeMockWs(readyState = WebSocket.OPEN): MockWs {
	const ws: MockWs = {
		readyState,
		sentMessages: [],
		send: mock((data: string) => {
			ws.sentMessages.push(data);
		}),
		on: mock(),
		removeAllListeners: mock(),
		close: mock(),
	};
	return ws;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function* asyncChunks(...chunks: string[]): AsyncIterable<string> {
	for (const chunk of chunks) {
		yield chunk;
	}
}

function parsedMessages(ws: MockWs): Array<Record<string, unknown>> {
	return ws.sentMessages.map((m) => JSON.parse(m) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Test setup
//
// VoiceConnection calls `new WebSocket(url)` in its constructor. We intercept
// the module-level WebSocket constructor by swapping the import.
// ---------------------------------------------------------------------------

describe("VoiceConnection.speakStream", () => {
	let ws: MockWs;
	let conn: VoiceConnection;
	let originalWebSocket: typeof WebSocket;

	beforeEach(() => {
		// Replace the WebSocket constructor so VoiceConnection uses our mock
		ws = makeMockWs(WebSocket.OPEN);
		// biome-ignore lint: test mock
		(globalThis as Record<string, unknown>).WebSocket = function () {
			return ws;
		};

		// We need to mock the `ws` module's WebSocket. The simplest approach:
		// patch the module via bun's module mock, but since VoiceConnection
		// imports `ws` as a named import at load time, we instead inject via
		// a subclass that accepts a pre-built WS object. Because we can't easily
		// hot-swap the `ws` module in bun without mock.module (which requires
		// top-level await), we use a different approach:
		// expose the internal `ws` field via a test-only subclass.
		originalWebSocket = WebSocket;
	});

	afterEach(() => {
		// biome-ignore lint: test cleanup
		(globalThis as Record<string, unknown>).WebSocket = originalWebSocket;
	});

	// -------------------------------------------------------------------------
	// Because VoiceConnection.connect() calls `new WebSocket(url)` using the
	// imported `WebSocket` from 'ws' (not globalThis.WebSocket), we need a
	// different strategy: subclass VoiceConnection and override `connect`.
	// -------------------------------------------------------------------------

	class TestVoiceConnection extends VoiceConnection {
		constructor(mockWs: MockWs) {
			// We pass a dummy URL; connect() is overridden before it runs.
			// We must call super() which calls connect() — so we override first.
			// Trick: override on prototype before super() — not possible in TS.
			// Instead we pass a flag via a private static slot.
			TestVoiceConnection._pendingMockWs = mockWs;
			super("ws://test-url");
			TestVoiceConnection._pendingMockWs = null;
		}

		private static _pendingMockWs: MockWs | null = null;

		// biome-ignore lint: override for testing
		// @ts-expect-error — accessing private method for test injection
		protected override connect(): void {
			const mockWs = TestVoiceConnection._pendingMockWs;
			if (!mockWs) return;
			// biome-ignore lint: assign private field for testing
			// @ts-expect-error — assign private field for testing
			this.ws = mockWs;
			// Register no-op listeners so the class doesn't throw
			// (the mock's `on` method is a no-op mock)
		}
	}

	function makeConn(readyState = WebSocket.OPEN): { conn: TestVoiceConnection; ws: MockWs } {
		const mockWs = makeMockWs(readyState);
		const connection = new TestVoiceConnection(mockWs);
		return { conn: connection, ws: mockWs };
	}

	// -------------------------------------------------------------------------

	test("sends chunk frames then end frame for multi-chunk iterable", async () => {
		const { conn, ws: mockWs } = makeConn();

		await conn.speakStream("call-1", asyncChunks("Hello", " ", "there"));

		const msgs = parsedMessages(mockWs);
		// Expect exactly 4 messages: 3 chunks + 1 end
		expect(msgs).toHaveLength(4);

		expect(msgs[0].type).toBe("call.speak.chunk");
		expect(msgs[0].callId).toBe("call-1");
		expect(msgs[0].text).toBe("Hello");

		expect(msgs[1].type).toBe("call.speak.chunk");
		expect(msgs[1].callId).toBe("call-1");
		expect(msgs[1].text).toBe(" ");

		expect(msgs[2].type).toBe("call.speak.chunk");
		expect(msgs[2].callId).toBe("call-1");
		expect(msgs[2].text).toBe("there");

		expect(msgs[3].type).toBe("call.speak.end");
		expect(msgs[3].callId).toBe("call-1");
		expect(msgs[3].text).toBeUndefined();
	});

	test("skips empty-string chunks but still sends end frame", async () => {
		const { conn, ws: mockWs } = makeConn();

		await conn.speakStream("call-2", asyncChunks("Hi", "", "!"));

		const msgs = parsedMessages(mockWs);
		// "" is skipped → 2 chunk frames + 1 end
		expect(msgs).toHaveLength(3);

		expect(msgs[0].type).toBe("call.speak.chunk");
		expect(msgs[0].text).toBe("Hi");

		expect(msgs[1].type).toBe("call.speak.chunk");
		expect(msgs[1].text).toBe("!");

		expect(msgs[2].type).toBe("call.speak.end");
	});

	test("empty iterable sends only the end frame", async () => {
		const { conn, ws: mockWs } = makeConn();

		await conn.speakStream("call-3", asyncChunks());

		const msgs = parsedMessages(mockWs);
		expect(msgs).toHaveLength(1);
		expect(msgs[0].type).toBe("call.speak.end");
		expect(msgs[0].callId).toBe("call-3");
	});

	test("silently no-ops (does not throw) when WS is not open — mirrors send() behaviour", async () => {
		// send() silently does nothing when readyState !== OPEN.
		// speakStream should propagate that same behaviour without throwing.
		const { conn, ws: mockWs } = makeConn(WebSocket.CLOSED);

		await expect(conn.speakStream("call-4", asyncChunks("text"))).resolves.toBeUndefined();

		// Nothing was sent because WS is closed
		expect(mockWs.sentMessages).toHaveLength(0);
	});

	test("does not affect the existing speak() method", () => {
		const { conn, ws: mockWs } = makeConn();

		conn.speak("call-5", "hello world");

		const msgs = parsedMessages(mockWs);
		expect(msgs).toHaveLength(1);
		expect(msgs[0].type).toBe("call.speak");
		expect(msgs[0].callId).toBe("call-5");
		expect(msgs[0].text).toBe("hello world");
	});

	test("each chunk frame includes a requestId", async () => {
		const { conn, ws: mockWs } = makeConn();

		await conn.speakStream("call-6", asyncChunks("A", "B"));

		const msgs = parsedMessages(mockWs);
		for (const msg of msgs) {
			expect(typeof msg.requestId).toBe("string");
			expect((msg.requestId as string).length).toBeGreaterThan(0);
		}
	});
});
