import type { RequestClient } from "../client";
import type {
	AgentListParams,
	AgentOutput,
	CreateAgentInput,
	PaginatedResponse,
	UpdateAgentInput,
} from "../types";

export class AgentsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreateAgentInput): Promise<AgentOutput> {
		return this.client.request<AgentOutput>("POST", "/agents", input);
	}

	public get(id: string): Promise<AgentOutput> {
		return this.client.request<AgentOutput>("GET", `/agents/${id}`);
	}

	public list(params?: AgentListParams): Promise<PaginatedResponse<AgentOutput>> {
		return this.client.request<PaginatedResponse<AgentOutput>>(
			"GET",
			"/agents",
			undefined,
			this.toQuery(params),
		);
	}

	public update(id: string, input: UpdateAgentInput): Promise<AgentOutput> {
		return this.client.request<AgentOutput>("PATCH", `/agents/${id}`, { ...input, id });
	}

	public async delete(id: string): Promise<void> {
		await this.client.request<{ success: true }>("DELETE", `/agents/${id}`);
	}

	public rotateKey(id: string): Promise<{ apiKey: string; apiKeyPrefix: string }> {
		return this.client.request<{ apiKey: string; apiKeyPrefix: string }>(
			"POST",
			`/agents/${id}/rotate-key`,
			{ id },
		);
	}

	private toQuery(params?: AgentListParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.orgId) query.orgId = params.orgId;
		if (params.status) query.status = params.status;
		if (params.query) query.query = params.query;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
