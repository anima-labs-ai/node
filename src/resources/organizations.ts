import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	CreateOrganizationInput,
	OrganizationListParams,
	OrganizationOutput,
	RequestOptions,
	UpdateOrganizationInput,
} from "../types";

export class OrganizationsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(
		input: CreateOrganizationInput,
		options?: RequestOptions,
	): Promise<OrganizationOutput> {
		return this.client.request<OrganizationOutput>(
			"POST",
			"/orgs",
			input,
			undefined,
			options,
		);
	}

	public get(
		id: string,
		options?: RequestOptions,
	): Promise<OrganizationOutput> {
		return this.client.request<OrganizationOutput>(
			"GET",
			`/orgs/${id}`,
			undefined,
			undefined,
			options,
		);
	}

	public list(
		params?: OrganizationListParams,
	): PageIterator<OrganizationOutput> {
		return new PageIterator<OrganizationOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request(
				"GET",
				"/orgs",
				undefined,
				this.toQuery(merged),
			);
		});
	}

	public update(
		id: string,
		input: UpdateOrganizationInput,
		options?: RequestOptions,
	): Promise<OrganizationOutput> {
		return this.client.request<OrganizationOutput>(
			"PATCH",
			`/orgs/${id}`,
			{ ...input, id },
			undefined,
			options,
		);
	}

	public async delete(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>(
			"DELETE",
			`/orgs/${id}`,
			undefined,
			undefined,
			options,
		);
	}

	public rotateKey(
		id: string,
		options?: RequestOptions,
	): Promise<{ masterKey: string }> {
		return this.client.request<{ masterKey: string }>(
			"POST",
			`/orgs/${id}/rotate-key`,
			{ id },
			undefined,
			options,
		);
	}

	private toQuery(
		params?: OrganizationListParams,
	): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.query) query.query = params.query;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
