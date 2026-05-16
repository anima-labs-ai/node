import WebSocket from "ws";

import type { CallTranscriptionEagerEvent, VoiceConnectionOptions, VoiceMessage, VoiceMessageType } from "./types";

type VoiceEventCallback = (message: VoiceMessage) => void;
type ErrorCallback = (error: Error) => void;
type VoidCallback = () => void;

type VoiceListenerMap = {
	message: VoiceEventCallback;
	error: ErrorCallback;
	connected: VoidCallback;
	disconnected: VoidCallback;
	"transcription.eager": (event: CallTranscriptionEagerEvent) => void;
};

const PING_INTERVAL_MS = 30_000;

/**
 * Bidirectional WebSocket connection for real-time voice call control.
 *
 * Send commands (call.create, call.speak, call.hangup) and receive events
 * (call.started, call.transcription, call.ended) over a persistent connection.
 */
export class VoiceConnection {
	private ws: WebSocket | null = null;
	private readonly wsUrl: string;
	private pingInterval: ReturnType<typeof setInterval> | null = null;
	private closed = false;

	private listeners: {
		message: VoiceEventCallback[];
		error: ErrorCallback[];
		connected: VoidCallback[];
		disconnected: VoidCallback[];
		"transcription.eager": Array<(event: CallTranscriptionEagerEvent) => void>;
	} = {
		message: [],
		error: [],
		connected: [],
		disconnected: [],
		"transcription.eager": [],
	};

	/** @internal — use CallsResource.connect() instead. */
	public constructor(wsUrl: string, _options?: VoiceConnectionOptions) {
		this.wsUrl = wsUrl;
		this.connect();
	}

	public on<K extends keyof VoiceListenerMap>(event: K, callback: VoiceListenerMap[K]): this {
		(this.listeners[event] as VoiceListenerMap[K][]).push(callback);
		return this;
	}

	public off<K extends keyof VoiceListenerMap>(event: K, callback: VoiceListenerMap[K]): this {
		const list = this.listeners[event] as VoiceListenerMap[K][];
		const idx = list.indexOf(callback);
		if (idx !== -1) list.splice(idx, 1);
		return this;
	}

	/** Send a voice command to the server. */
	public send(type: VoiceMessageType, data?: Record<string, unknown>): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			// Server expects flat messages with type + fields at the top level
			const msg: Record<string, unknown> = { type, ...data };
			if (!msg.requestId) {
				msg.requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			}
			this.ws.send(JSON.stringify(msg));
		}
	}

	/** Create an outbound call. */
	public createCall(to: string, options?: { tier?: string; greeting?: string; fromNumber?: string }): void {
		this.send("call.create", { to, ...options });
	}

	/** Send text for TTS playback. */
	public speak(callId: string, text: string): void {
		this.send("call.speak", { callId, text });
	}

	/**
	 * Stream text into a live call. Each yielded chunk dispatches a
	 * call.speak.chunk frame; call.speak.end is sent when the iterable
	 * completes. Use this when piping LLM tokens directly so TTS can
	 * begin synthesizing on the first phrase instead of waiting for the
	 * full reply.
	 *
	 * Empty chunks (empty string) are skipped (no message sent) but the
	 * trailing call.speak.end still fires.
	 *
	 * Silently no-ops (does not throw) when the WebSocket is not open —
	 * same behaviour as send(). Caller is responsible for cancelling the
	 * iterable on barge-in (the server cancels ElevenLabs server-side on
	 * call.interrupted).
	 */
	public async speakStream(callId: string, chunks: AsyncIterable<string>): Promise<void> {
		for await (const text of chunks) {
			if (!text) continue;
			this.send("call.speak.chunk", { callId, text });
		}
		this.send("call.speak.end", { callId });
	}

	/** Cancel in-progress speech. */
	public cancelSpeak(callId: string): void {
		this.send("call.speak.cancel", { callId });
	}

	/** Hang up a call. */
	public hangup(callId: string): void {
		this.send("call.hangup", { callId });
	}

	/** Accept an inbound call. */
	public accept(callId: string): void {
		this.send("call.accept", { callId });
	}

	/** Reject an inbound call. */
	public reject(callId: string): void {
		this.send("call.reject", { callId });
	}

	/** Place a call on hold. */
	public hold(callId: string): void {
		this.send("call.hold", { callId });
	}

	/** Resume a held call. */
	public resume(callId: string): void {
		this.send("call.resume", { callId });
	}

	/** Send DTMF tone(s). */
	public dtmf(callId: string, digits: string): void {
		this.send("call.dtmf", { callId, digits });
	}

	/** Close the connection. */
	public close(): void {
		this.closed = true;
		this.stopPing();
		if (this.ws) {
			this.ws.removeAllListeners();
			if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
				this.ws.close(1000, "Client closed");
			}
			this.ws = null;
		}
	}

	/** @internal — override in tests to inject a mock WebSocket. */
	protected createWebSocket(url: string): WebSocket {
		return new WebSocket(url);
	}

	private connect(): void {
		if (this.closed) return;

		this.ws = this.createWebSocket(this.wsUrl);

		this.ws.on("open", () => {
			this.startPing();
			for (const cb of this.listeners.connected) cb();
		});

		this.ws.on("message", (raw: WebSocket.Data) => {
			try {
				const msg = JSON.parse(raw.toString()) as VoiceMessage;
				for (const cb of this.listeners.message) cb(msg);
				if (msg.type === "call.transcription.eager") {
					const eager = msg as unknown as CallTranscriptionEagerEvent;
					for (const cb of this.listeners["transcription.eager"]) cb(eager);
				}
			} catch {
				// Ignore malformed messages
			}
		});

		this.ws.on("close", () => {
			this.stopPing();
			for (const cb of this.listeners.disconnected) cb();
		});

		this.ws.on("error", (err: Error) => {
			for (const cb of this.listeners.error) cb(err);
		});
	}

	private startPing(): void {
		this.stopPing();
		this.pingInterval = setInterval(() => {
			this.send("ping");
		}, PING_INTERVAL_MS);
	}

	private stopPing(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}
}
