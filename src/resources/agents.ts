import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	AgentListParams,
	AgentOutput,
	CreateAgentInput,
	RequestOptions,
	UpdateAgentInput,
} from "../types";

export class AgentsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreateAgentInput, options?: RequestOptions): Promise<AgentOutput> {
		return this.client.request<AgentOutput>("POST", "/agents", input, undefined, options);
	}

	public get(id: string, options?: RequestOptions): Promise<AgentOutput> {
		return this.client.request<AgentOutput>("GET", `/agents/${id}`, undefined, undefined, options);
	}

	public list(params?: AgentListParams): PageIterator<AgentOutput> {
		return new PageIterator<AgentOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request("GET", "/agents", undefined, this.toQuery(merged));
		});
	}

	public update(id: string, input: UpdateAgentInput, options?: RequestOptions): Promise<AgentOutput> {
		return this.client.request<AgentOutput>("PATCH", `/agents/${id}`, { ...input, id }, undefined, options);
	}

	public async delete(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/agents/${id}`, undefined, undefined, options);
	}

	public rotateKey(id: string, options?: RequestOptions): Promise<{ apiKey: string; apiKeyPrefix: string }> {
		return this.client.request<{ apiKey: string; apiKeyPrefix: string }>(
			"POST",
			`/agents/${id}/rotate-key`,
			{ id },
			undefined,
			options,
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
