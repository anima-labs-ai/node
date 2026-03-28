import type { RequestClient } from "../client";
import type {
	RegisterAgentInput,
	RegistryAgentOutput,
	RegistrySearchParams,
	UpdateRegistryAgentInput,
} from "../types";

export class RegistryResource {
	public constructor(private readonly client: RequestClient) {}

	public register(input: RegisterAgentInput): Promise<RegistryAgentOutput> {
		return this.client.request<RegistryAgentOutput>("POST", "/registry/agents", input);
	}

	public search(query: string, params?: RegistrySearchParams): Promise<{ items: RegistryAgentOutput[] }> {
		const queryParams: Record<string, string> = { q: query };
		if (params?.category) queryParams.category = params.category;
		if (params?.cursor) queryParams.cursor = params.cursor;
		if (params?.limit !== undefined) queryParams.limit = String(params.limit);
		return this.client.request<{ items: RegistryAgentOutput[] }>(
			"GET",
			"/registry/agents/search",
			undefined,
			queryParams,
		);
	}

	public lookup(did: string): Promise<RegistryAgentOutput> {
		return this.client.request<RegistryAgentOutput>("GET", `/registry/agents/${encodeURIComponent(did)}`);
	}

	public update(did: string, input: UpdateRegistryAgentInput): Promise<RegistryAgentOutput> {
		return this.client.request<RegistryAgentOutput>("PUT", `/registry/agents/${encodeURIComponent(did)}`, input);
	}

	public async unlist(did: string): Promise<void> {
		await this.client.request<{ success: true }>("DELETE", `/registry/agents/${encodeURIComponent(did)}`);
	}
}
