import type { RequestClient } from "../client";
import type {
	CreatePodInput,
	PodOutput,
	UpdatePodInput,
	PodUsageOutput,
	ListPodsParams,
	RequestOptions,
} from "../types";

export class PodsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreatePodInput, options?: RequestOptions): Promise<PodOutput> {
		return this.client.request<PodOutput>("POST", "/pods", input, undefined, options);
	}

	public list(params?: ListPodsParams, options?: RequestOptions): Promise<{ items: PodOutput[] }> {
		return this.client.request<{ items: PodOutput[] }>("GET", "/pods", undefined, this.toQuery(params), options);
	}

	public get(id: string, options?: RequestOptions): Promise<PodOutput> {
		return this.client.request<PodOutput>("GET", `/pods/${id}`, undefined, undefined, options);
	}

	public update(id: string, input: UpdatePodInput, options?: RequestOptions): Promise<PodOutput> {
		return this.client.request<PodOutput>("PUT", `/pods/${id}`, input, undefined, options);
	}

	public async delete(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/pods/${id}`, undefined, undefined, options);
	}

	public usage(id: string, options?: RequestOptions): Promise<PodUsageOutput> {
		return this.client.request<PodUsageOutput>("GET", `/pods/${id}/usage`, undefined, undefined, options);
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
