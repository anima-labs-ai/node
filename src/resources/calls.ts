import type { RequestClient } from "../client";
import type {
	Call,
	CallTranscript,
	CreateCallInput,
	CreateCallOutput,
	ListCallsParams,
	RequestOptions,
	VoiceConnectionOptions,
} from "../types";
import { VoiceConnection } from "../voice-connection";

export class CallsResource {
	private readonly apiKey: string;
	private readonly wsBaseUrl: string;

	public constructor(client: RequestClient, apiKey: string, baseUrl: string);
	public constructor(client: RequestClient);
	public constructor(
		private readonly client: RequestClient,
		apiKey?: string,
		baseUrl?: string,
	) {
		this.apiKey = apiKey ?? "";
		this.wsBaseUrl = (baseUrl ?? "")
			.replace(/^https:\/\//, "wss://")
			.replace(/^http:\/\//, "ws://");
	}

	public list(params?: ListCallsParams, options?: RequestOptions): Promise<{ calls: Call[]; total: number }> {
		return this.client.request<{ calls: Call[]; total: number }>(
			"GET",
			"/voice/calls",
			undefined,
			this.toQuery(params),
			options,
		);
	}

	public get(callId: string, options?: RequestOptions): Promise<Call> {
		return this.client.request<Call>("GET", `/voice/calls/${callId}`, undefined, undefined, options);
	}

	public create(input: CreateCallInput, options?: RequestOptions): Promise<CreateCallOutput> {
		return this.client.request<CreateCallOutput>("POST", "/voice/calls", input, undefined, options);
	}

	public getTranscript(callId: string, options?: RequestOptions): Promise<CallTranscript> {
		return this.client.request<CallTranscript>("GET", `/voice/calls/${callId}/transcript`, undefined, undefined, options);
	}

	/**
	 * Open a bidirectional WebSocket connection for real-time voice call control.
	 *
	 * @example
	 * ```ts
	 * const conn = anima.calls.connect();
	 * conn.on("message", (msg) => {
	 *   if (msg.type === "call.transcription") {
	 *     console.log(msg.data?.text);
	 *   }
	 * });
	 * conn.createCall("+15551234567");
	 * ```
	 */
	public connect(options?: VoiceConnectionOptions): VoiceConnection {
		const params = new URLSearchParams({ token: this.apiKey });
		if (options?.agentId) params.set("agentId", options.agentId);
		const wsUrl = `${this.wsBaseUrl}/ws/voice?${params.toString()}`;
		return new VoiceConnection(wsUrl, options);
	}

	private toQuery(params?: ListCallsParams): Record<string, string> | undefined {
		if (!params) return undefined;
		const query: Record<string, string> = {};
		if (params.agentId) query.agentId = params.agentId;
		if (params.direction) query.direction = params.direction;
		if (params.state) query.state = params.state;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.offset !== undefined) query.offset = String(params.offset);
		return Object.keys(query).length > 0 ? query : undefined;
	}
}
