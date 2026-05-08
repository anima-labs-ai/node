import WebSocket from "ws";

import type { AnimaEvent, EventStreamOptions } from "../types";

/**
 * Callback type for event stream listeners.
 */
type EventCallback = (event: AnimaEvent) => void;
type ErrorCallback = (error: Error) => void;
type VoidCallback = () => void;

type EventListenerMap = {
	event: EventCallback;
	error: ErrorCallback;
	connected: VoidCallback;
	disconnected: VoidCallback;
};

const PING_INTERVAL_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_BACKOFF_FACTOR = 2;

/**
 * Real-time event stream over WebSocket.
 *
 * Supports subscribing to channel patterns, automatic reconnection
 * with exponential backoff, and ping/pong keepalive.
 */
export class AnimaEventStream {
	private ws: WebSocket | null = null;
	private readonly wsUrl: string;
	private readonly initialChannels: string[];

	private subscribedChannels: Set<string> = new Set();
	private lastEventId: string | undefined;

	private listeners: {
		event: EventCallback[];
		error: ErrorCallback[];
		connected: VoidCallback[];
		disconnected: VoidCallback[];
	} = {
		event: [],
		error: [],
		connected: [],
		disconnected: [],
	};

	private pingInterval: ReturnType<typeof setInterval> | null = null;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
	private closed = false;

	/** @internal */
	public constructor(wsUrl: string, channels: string[]) {
		this.wsUrl = wsUrl;
		this.initialChannels = channels;
		this.connect();
	}

	/**
	 * Register a listener for an event type.
	 */
	public on<K extends keyof EventListenerMap>(
		event: K,
		callback: EventListenerMap[K],
	): this {
		(this.listeners[event] as EventListenerMap[K][]).push(callback);
		return this;
	}

	/**
	 * Remove a listener for an event type.
	 */
	public off<K extends keyof EventListenerMap>(
		event: K,
		callback: EventListenerMap[K],
	): this {
		const list = this.listeners[event] as EventListenerMap[K][];
		const idx = list.indexOf(callback);
		if (idx !== -1) {
			list.splice(idx, 1);
		}
		return this;
	}

	/**
	 * Subscribe to additional channels.
	 */
	public subscribe(channels: string[]): void {
		for (const ch of channels) {
			this.subscribedChannels.add(ch);
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.send({
				type: "subscribe",
				channels,
				...(this.lastEventId ? { lastEventId: this.lastEventId } : {}),
			});
		}
	}

	/**
	 * Unsubscribe from channels.
	 */
	public unsubscribe(channels: string[]): void {
		for (const ch of channels) {
			this.subscribedChannels.delete(ch);
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.send({ type: "unsubscribe", channels });
		}
	}

	/**
	 * Close the WebSocket connection and stop reconnecting.
	 */
	public close(): void {
		this.closed = true;
		this.stopPing();
		this.clearReconnectTimeout();

		if (this.ws) {
			this.ws.removeAllListeners();
			if (
				this.ws.readyState === WebSocket.OPEN ||
				this.ws.readyState === WebSocket.CONNECTING
			) {
				this.ws.close(1000, "Client closed");
			}
			this.ws = null;
		}
	}

	private connect(): void {
		if (this.closed) {
			return;
		}

		this.ws = new WebSocket(this.wsUrl);

		this.ws.on("open", () => {
			this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
			this.startPing();

			// Subscribe to initial channels + any accumulated subscriptions
			const allChannels = new Set([
				...this.initialChannels,
				...this.subscribedChannels,
			]);
			for (const ch of this.initialChannels) {
				this.subscribedChannels.add(ch);
			}

			if (allChannels.size > 0) {
				this.send({
					type: "subscribe",
					channels: [...allChannels],
					...(this.lastEventId
						? { lastEventId: this.lastEventId }
						: {}),
				});
			}

			for (const cb of this.listeners.connected) {
				cb();
			}
		});

		this.ws.on("message", (raw: WebSocket.Data) => {
			try {
				const msg = JSON.parse(raw.toString());
				this.handleMessage(msg);
			} catch {
				// Ignore malformed messages
			}
		});

		this.ws.on("close", () => {
			this.stopPing();

			for (const cb of this.listeners.disconnected) {
				cb();
			}

			this.scheduleReconnect();
		});

		this.ws.on("error", (err: Error) => {
			for (const cb of this.listeners.error) {
				cb(err);
			}
		});
	}

	private handleMessage(msg: Record<string, unknown>): void {
		switch (msg.type) {
			case "event": {
				const event: AnimaEvent = {
					id: msg.id as string,
					eventType: msg.eventType as string,
					agentId: (msg.agentId as string) ?? undefined,
					orgId: msg.orgId as string,
					timestamp: msg.timestamp as string,
					data: msg.data as Record<string, unknown>,
				};

				this.lastEventId = event.id;

				for (const cb of this.listeners.event) {
					cb(event);
				}
				break;
			}
			case "error": {
				const error = new Error(
					`[${msg.code as string}] ${msg.message as string}`,
				);
				for (const cb of this.listeners.error) {
					cb(error);
				}
				break;
			}
			case "pong":
			case "subscribed":
				// Acknowledgement messages — no action needed
				break;
		}
	}

	private send(data: Record<string, unknown>): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	private startPing(): void {
		this.stopPing();
		this.pingInterval = setInterval(() => {
			this.send({ type: "ping" });
		}, PING_INTERVAL_MS);
	}

	private stopPing(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}

	private scheduleReconnect(): void {
		if (this.closed) {
			return;
		}

		this.clearReconnectTimeout();
		this.reconnectTimeout = setTimeout(() => {
			this.connect();
		}, this.reconnectDelay);

		this.reconnectDelay = Math.min(
			this.reconnectDelay * RECONNECT_BACKOFF_FACTOR,
			MAX_RECONNECT_DELAY_MS,
		);
	}

	private clearReconnectTimeout(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}
}

/**
 * Resource for real-time event streaming over WebSocket.
 */
export class EventsResource {
	private readonly wsBaseUrl: string;
	private readonly apiKey: string;

	public constructor(apiKey: string, baseUrl: string) {
		// Convert http(s) base URL to ws(s)
		this.wsBaseUrl = baseUrl
			.replace(/^https:\/\//, "wss://")
			.replace(/^http:\/\//, "ws://");
		this.apiKey = apiKey;
	}

	/**
	 * Open a real-time event stream.
	 *
	 * @param options - Optional configuration including initial channels to subscribe to.
	 * @returns An `AnimaEventStream` instance for receiving events.
	 *
	 * @example
	 * ```ts
	 * const stream = anima.events.connect({ channels: ["email.*"] });
	 * stream.on("event", (event) => console.log(event));
	 * stream.on("connected", () => console.log("Connected"));
	 * // Later:
	 * stream.subscribe(["sms.*"]);
	 * stream.close();
	 * ```
	 */
	public connect(options?: EventStreamOptions): AnimaEventStream {
		const channels = options?.channels ?? [];
		const wsUrl = `${this.wsBaseUrl}/ws/events?token=${encodeURIComponent(this.apiKey)}`;
		return new AnimaEventStream(wsUrl, channels);
	}
}
