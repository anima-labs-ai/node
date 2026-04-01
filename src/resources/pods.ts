import type { RequestClient } from "../client";
import type {
	CreatePodInput,
	PodOutput,
	UpdatePodInput,
	PodUsageOutput,
	ListPodsParams,
} from "../types";

export class PodsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreatePodInput): Promise<PodOutput> {
		return this.client.request<PodOutput>("POST", "/pods", input);
	}

	public list(params?: ListPodsParams): Promise<{ items: PodOutput[] }> {
		return this.client.request<{ items: PodOutput[] }>("GET", "/pods", undefined, this.toQuery(params));
	}

	public get(id: string): Promise<PodOutput> {
		return this.client.request<PodOutput>("GET", `/pods/${id}`);
	}

	public update(id: string, input: UpdatePodInput): Promise<PodOutput> {
		return this.client.request<PodOutput>("PUT", `/pods/${id}`, input);
	}

	public async delete(id: string): Promise<void> {
		await this.client.request<void>("DELETE", `/pods/${id}`);
	}

	public usage(id: string): Promise<PodUsageOutput> {
		return this.client.request<PodUsageOutput>("GET", `/pods/${id}/usage`);
	}

	private toQuery(params?: ListPodsParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.agentId) query.agentId = params.agentId;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
