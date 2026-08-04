import type { RequestClient } from "../client";
import type {
	RegisterAgentInput,
	RegistryAgentOutput,
	RegistrySearchParams,
	RequestOptions,
	UpdateRegistryAgentInput,
} from "../types";

export class RegistryResource {
	public constructor(private readonly client: RequestClient) {}

	public register(
		input: RegisterAgentInput,
		options?: RequestOptions,
	): Promise<RegistryAgentOutput> {
		return this.client.request<RegistryAgentOutput>(
			"POST",
			"/registry/agents",
			input,
			undefined,
			options,
		);
	}

	public search(
		query: string,
		params?: RegistrySearchParams,
		options?: RequestOptions,
	): Promise<{ items: RegistryAgentOutput[] }> {
		const queryParams: Record<string, string> = { q: query };
		if (params?.category) queryParams.category = params.category;
		if (params?.cursor) queryParams.cursor = params.cursor;
		if (params?.limit !== undefined) queryParams.limit = String(params.limit);
		return this.client.request<{ items: RegistryAgentOutput[] }>(
			"GET",
			"/registry/agents/search",
			undefined,
			queryParams,
			options,
		);
	}

	public lookup(
		did: string,
		options?: RequestOptions,
	): Promise<RegistryAgentOutput> {
		return this.client.request<RegistryAgentOutput>(
			"GET",
			`/registry/agents/${encodeURIComponent(did)}`,
			undefined,
			undefined,
			options,
		);
	}

	public update(
		did: string,
		input: UpdateRegistryAgentInput,
		options?: RequestOptions,
	): Promise<RegistryAgentOutput> {
		return this.client.request<RegistryAgentOutput>(
			"PUT",
			`/registry/agents/${encodeURIComponent(did)}`,
			input,
			undefined,
			options,
		);
	}

	public async unlist(did: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>(
			"DELETE",
			`/registry/agents/${encodeURIComponent(did)}`,
			undefined,
			undefined,
			options,
		);
	}
}
