import type { RequestClient } from "../client";
import type {
	A2ASubmitTaskInput,
	A2ATaskOutput,
	A2ATaskListParams,
	PaginatedResponse,
	RequestOptions,
} from "../types";

export class A2AResource {
	public constructor(private readonly client: RequestClient) {}

	/**
	 * Discover an agent's capabilities by fetching its Agent Card
	 * from the well-known URL. This is a direct fetch to the agent's
	 * public URL, not through the Anima API.
	 */
	public async discover(agentUrl: string): Promise<Record<string, unknown>> {
		const url = new URL("/.well-known/agent.json", agentUrl);
		const res = await fetch(url.toString());
		if (!res.ok) {
			throw new Error(`Failed to discover agent at ${url}: ${res.status} ${res.statusText}`);
		}
		return res.json() as Promise<Record<string, unknown>>;
	}

	public submitTask(agentId: string, input: A2ASubmitTaskInput, options?: RequestOptions): Promise<A2ATaskOutput> {
		return this.client.request<A2ATaskOutput>(
			"POST",
			`/agents/${agentId}/a2a/tasks`,
			input,
			undefined,
			options,
		);
	}

	public getTask(agentId: string, taskId: string, options?: RequestOptions): Promise<A2ATaskOutput> {
		return this.client.request<A2ATaskOutput>(
			"GET",
			`/agents/${agentId}/a2a/tasks/${taskId}`,
			undefined,
			undefined,
			options,
		);
	}

	public listTasks(
		agentId: string,
		params?: A2ATaskListParams,
		options?: RequestOptions,
	): Promise<PaginatedResponse<A2ATaskOutput>> {
		return this.client.request<PaginatedResponse<A2ATaskOutput>>(
			"GET",
			`/agents/${agentId}/a2a/tasks`,
			undefined,
			this.toQuery(params),
			options,
		);
	}

	public cancelTask(agentId: string, taskId: string, options?: RequestOptions): Promise<A2ATaskOutput> {
		return this.client.request<A2ATaskOutput>(
			"POST",
			`/agents/${agentId}/a2a/tasks/${taskId}/cancel`,
			undefined,
			undefined,
			options,
		);
	}

	private toQuery(params?: A2ATaskListParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.status) query.status = params.status;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
