import type { RequestClient } from "../client";
import type {
	AddressOutput,
	CreateAddressInput,
	ListAddressesParams,
	RequestOptions,
	UpdateAddressInput,
	ValidateAddressOutput,
} from "../types";

export class AddressesResource {
	public constructor(private readonly client: RequestClient) {}

	public create(
		input: CreateAddressInput,
		options?: RequestOptions,
	): Promise<AddressOutput> {
		return this.client.request<AddressOutput>(
			"POST",
			"/addresses",
			input,
			undefined,
			options,
		);
	}

	public list(
		params?: ListAddressesParams,
		options?: RequestOptions,
	): Promise<{ items: AddressOutput[] }> {
		return this.client.request<{ items: AddressOutput[] }>(
			"GET",
			"/addresses",
			undefined,
			this.toQuery(params),
			options,
		);
	}

	public get(
		id: string,
		agentId: string,
		options?: RequestOptions,
	): Promise<AddressOutput> {
		return this.client.request<AddressOutput>(
			"GET",
			`/addresses/${id}`,
			undefined,
			{ agentId },
			options,
		);
	}

	public update(
		id: string,
		input: UpdateAddressInput,
		options?: RequestOptions,
	): Promise<AddressOutput> {
		return this.client.request<AddressOutput>(
			"PUT",
			`/addresses/${id}`,
			input,
			undefined,
			options,
		);
	}

	public async delete(
		id: string,
		agentId: string,
		options?: RequestOptions,
	): Promise<void> {
		await this.client.request<void>(
			"DELETE",
			`/addresses/${id}`,
			{ agentId },
			undefined,
			options,
		);
	}

	public validate(
		id: string,
		agentId: string,
		options?: RequestOptions,
	): Promise<ValidateAddressOutput> {
		return this.client.request<ValidateAddressOutput>(
			"POST",
			`/addresses/${id}/validate`,
			{ agentId },
			undefined,
			options,
		);
	}

	private toQuery(
		params?: ListAddressesParams,
	): Record<string, string> | undefined {
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
