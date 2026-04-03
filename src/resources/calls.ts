import type { RequestClient } from "../client";
import type {
	Call,
	CallTranscript,
	CreateCallInput,
	CreateCallOutput,
	ListCallsParams,
} from "../types";

export class CallsResource {
	public constructor(private readonly client: RequestClient) {}

	public list(params?: ListCallsParams): Promise<{ calls: Call[]; total: number }> {
		return this.client.request<{ calls: Call[]; total: number }>(
			"GET",
			"/voice/calls",
			undefined,
			this.toQuery(params),
		);
	}

	public get(callId: string): Promise<Call> {
		return this.client.request<Call>("GET", `/voice/calls/${callId}`);
	}

	public create(input: CreateCallInput): Promise<CreateCallOutput> {
		return this.client.request<CreateCallOutput>("POST", "/voice/calls", input);
	}

	public getTranscript(callId: string): Promise<CallTranscript> {
		return this.client.request<CallTranscript>("GET", `/voice/calls/${callId}/transcript`);
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
