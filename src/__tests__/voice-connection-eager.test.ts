/**
 * Tests for VoiceConnection — transcription.eager listener
 *
 * Verifies that call.transcription.eager WS messages are routed to
 * listeners registered via conn.on("transcription.eager", cb).
 */

import { describe, expect, test } from "bun:test";
import WebSocket from "ws";

import { VoiceConnection } from "../voice-connection";
import type { CallTranscriptionEagerEvent } from "../types";

// ---------------------------------------------------------------------------
// Mock WebSocket that captures registered handlers so we can trigger them
// ---------------------------------------------------------------------------

type MockWs = {
	readyState: number;
	handlers: Record<string, ((...args: unknown[]) => void)[]>;
	on: (event: string, cb: (...args: unknown[]) => void) => void;
	removeAllListeners: () => void;
	send: () => void;
	close: () => void;
	emit: (event: string, ...args: unknown[]) => void;
};

function makeMockWs(readyState = WebSocket.OPEN): MockWs {
	const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
	return {
		readyState,
		handlers,
		on(event: string, cb: (...args: unknown[]) => void) {
			if (!handlers[event]) handlers[event] = [];
			handlers[event].push(cb);
		},
		removeAllListeners() {
			for (const key of Object.keys(handlers)) {
				delete handlers[key];
			}
		},
		send() {},
		close() {},
		emit(event: string, ...args: unknown[]) {
			for (const cb of handlers[event] ?? []) cb(...args);
		},
	};
}

// ---------------------------------------------------------------------------
// TestVoiceConnection — injects mock WS via createWebSocket override
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------

describe("VoiceConnection — transcription.eager listener", () => {
	test("fires transcription.eager listener when server sends call.transcription.eager", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const events: CallTranscriptionEagerEvent[] = [];
		conn.on("transcription.eager", (event) => events.push(event));

		// Simulate the server sending call.transcription.eager
		mockWs.emit(
			"message",
			JSON.stringify({
				type: "call.transcription.eager",
				callId: "c1",
				turnId: "turn_1",
				text: "hello there",
				confidence: 0.7,
				timestamp: 1700000000000,
			}),
		);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({
			type: "call.transcription.eager",
			callId: "c1",
			turnId: "turn_1",
			text: "hello there",
			confidence: 0.7,
			timestamp: 1700000000000,
		});
	});

	test("does not fire transcription.eager for unrelated message types", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const events: CallTranscriptionEagerEvent[] = [];
		conn.on("transcription.eager", (event) => events.push(event));

		mockWs.emit(
			"message",
			JSON.stringify({
				type: "call.transcription",
				callId: "c2",
				text: "final transcript",
				isFinal: true,
			}),
		);

		expect(events).toHaveLength(0);
	});

	test("transcription.eager fires without turnId (optional field)", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const events: CallTranscriptionEagerEvent[] = [];
		conn.on("transcription.eager", (event) => events.push(event));

		mockWs.emit(
			"message",
			JSON.stringify({
				type: "call.transcription.eager",
				callId: "c3",
				text: "partial text",
				confidence: 0.9,
				timestamp: 1700000001000,
			}),
		);

		expect(events).toHaveLength(1);
		expect(events[0].turnId).toBeUndefined();
		expect(events[0].callId).toBe("c3");
		expect(events[0].confidence).toBe(0.9);
	});

	test("message listener still fires alongside transcription.eager listener", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const allMessages: unknown[] = [];
		const eagerEvents: CallTranscriptionEagerEvent[] = [];

		conn.on("message", (msg) => allMessages.push(msg));
		conn.on("transcription.eager", (event) => eagerEvents.push(event));

		mockWs.emit(
			"message",
			JSON.stringify({
				type: "call.transcription.eager",
				callId: "c4",
				text: "speculative text",
				confidence: 0.85,
				timestamp: 1700000002000,
			}),
		);

		// Both listeners should have fired
		expect(allMessages).toHaveLength(1);
		expect(eagerEvents).toHaveLength(1);
	});

	test("multiple transcription.eager listeners all fire", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const results: number[] = [];
		conn.on("transcription.eager", () => results.push(1));
		conn.on("transcription.eager", () => results.push(2));

		mockWs.emit(
			"message",
			JSON.stringify({
				type: "call.transcription.eager",
				callId: "c5",
				text: "hello",
				confidence: 0.6,
				timestamp: 1700000003000,
			}),
		);

		expect(results).toEqual([1, 2]);
	});

	test("off() removes the transcription.eager listener", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const events: CallTranscriptionEagerEvent[] = [];
		const listener = (event: CallTranscriptionEagerEvent) => events.push(event);

		conn.on("transcription.eager", listener);
		conn.off("transcription.eager", listener);

		mockWs.emit(
			"message",
			JSON.stringify({
				type: "call.transcription.eager",
				callId: "c6",
				text: "should not appear",
				confidence: 0.5,
				timestamp: 1700000004000,
			}),
		);

		expect(events).toHaveLength(0);
	});

	test("ignores unknown message types without throwing or surfacing them as eager events", () => {
		const mockWs = makeMockWs();
		const conn = new TestVoiceConnection(mockWs);

		const allMessages: unknown[] = [];
		const eagerEvents: CallTranscriptionEagerEvent[] = [];
		conn.on("message", (msg) => allMessages.push(msg));
		conn.on("transcription.eager", (event) => eagerEvents.push(event));

		// A frame type this SDK version has never seen. The server can add new
		// frame types at any time; older clients must ignore them (forward-compat)
		// rather than crash the read loop.
		const emitUnknown = () =>
			mockWs.emit(
				"message",
				JSON.stringify({
					type: "call.some.future.frame",
					callId: "c7",
					payload: { anything: true },
				}),
			);

		expect(emitUnknown).not.toThrow();
		// Unknown frames pass through to generic message listeners untouched...
		expect(allMessages).toHaveLength(1);
		// ...but are never mistaken for a speculative-transcription (eager) event.
		expect(eagerEvents).toHaveLength(0);
	});
});
