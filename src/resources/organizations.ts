import type { RequestClient } from "../client";
import type {
	CreateOrganizationInput,
	OrganizationListParams,
	OrganizationOutput,
	PaginatedResponse,
	UpdateOrganizationInput,
} from "../types";

export class OrganizationsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreateOrganizationInput): Promise<OrganizationOutput> {
		return this.client.request<OrganizationOutput>("POST", "/orgs", input);
	}

	public get(id: string): Promise<OrganizationOutput> {
		return this.client.request<OrganizationOutput>("GET", `/orgs/${id}`);
	}

	public list(params?: OrganizationListParams): Promise<PaginatedResponse<OrganizationOutput>> {
		return this.client.request<PaginatedResponse<OrganizationOutput>>(
			"GET",
			"/orgs",
			undefined,
			this.toQuery(params),
		);
	}

	public update(id: string, input: UpdateOrganizationInput): Promise<OrganizationOutput> {
		return this.client.request<OrganizationOutput>("PATCH", `/orgs/${id}`, { ...input, id });
	}

	public async delete(id: string): Promise<void> {
		await this.client.request<void>("DELETE", `/orgs/${id}`);
	}

	public rotateKey(id: string): Promise<{ masterKey: string }> {
		return this.client.request<{ masterKey: string }>("POST", `/orgs/${id}/rotate-key`, { id });
	}

	private toQuery(params?: OrganizationListParams): Record<string, string> | undefined {
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
