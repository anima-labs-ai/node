/**
 * Tests for VoiceConnection.speakStream()
 *
 * Wire format: VoiceConnection.send() emits flat JSON objects:
 *   { type, ...data, requestId }
 * So a call.speak.chunk frame looks like:
 *   { type: "call.speak.chunk", callId: "call-1", text: "Hello", requestId: "..." }
 */

import { describe, expect, mock, test } from "bun:test";
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
// Test setup — see TestVoiceConnection inside the suite for injection details.
// ---------------------------------------------------------------------------

describe("VoiceConnection.speakStream", () => {
	// -------------------------------------------------------------------------
	// VoiceConnection exposes a protected createWebSocket() factory method.
	// We override it here to return the test mock. The static slot is needed
	// only to bridge the gap between `new TestVoiceConnection(mockWs)` and the
	// `createWebSocket()` call that happens inside super() → connect(). Tests
	// run sequentially so there is no concurrency hazard.
	// -------------------------------------------------------------------------

	class TestVoiceConnection extends VoiceConnection {
		private static _mockWs: MockWs | null = null;

		constructor(mockWs: MockWs) {
			TestVoiceConnection._mockWs = mockWs;
			super("ws://test-url");
			TestVoiceConnection._mockWs = null;
		}

		protected override createWebSocket(_url: string): WebSocket {
			return TestVoiceConnection._mockWs as unknown as WebSocket;
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
