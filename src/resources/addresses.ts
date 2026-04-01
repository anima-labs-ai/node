import type { RequestClient } from "../client";
import type {
	AddressOutput,
	CreateAddressInput,
	ListAddressesParams,
	UpdateAddressInput,
	ValidateAddressOutput,
} from "../types";

export class AddressesResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreateAddressInput): Promise<AddressOutput> {
		return this.client.request<AddressOutput>("POST", "/addresses", input);
	}

	public list(params?: ListAddressesParams): Promise<{ items: AddressOutput[] }> {
		return this.client.request<{ items: AddressOutput[] }>("GET", "/addresses", undefined, this.toQuery(params));
	}

	public get(id: string, agentId: string): Promise<AddressOutput> {
		return this.client.request<AddressOutput>("GET", `/addresses/${id}`, undefined, { agentId });
	}

	public update(id: string, input: UpdateAddressInput): Promise<AddressOutput> {
		return this.client.request<AddressOutput>("PUT", `/addresses/${id}`, input);
	}

	public async delete(id: string, agentId: string): Promise<void> {
		await this.client.request<void>("DELETE", `/addresses/${id}`, { agentId });
	}

	public validate(id: string, agentId: string): Promise<ValidateAddressOutput> {
		return this.client.request<ValidateAddressOutput>("POST", `/addresses/${id}/validate`, { agentId });
	}

	private toQuery(params?: ListAddressesParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.agentId) query.agentId = params.agentId;
		if (params.type) query.type = params.type;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
