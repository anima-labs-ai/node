import type { RequestClient } from "../client";
import type {
	CreateWalletInput,
	WalletOutput,
	UpdateWalletInput,
	WalletPayInput,
	WalletPayOutput,
	RequestOptions,
	X402FetchInput,
	X402FetchOutput,
	WalletTransactionOutput,
	WalletTransactionsParams,
} from "../types";

export class WalletResource {
	public constructor(private readonly client: RequestClient) {}

	public create(agentId: string, input?: CreateWalletInput, options?: RequestOptions): Promise<WalletOutput> {
		return this.client.request<WalletOutput>("POST", `/agents/${agentId}/wallet`, input, undefined, options);
	}

	public get(agentId: string, options?: RequestOptions): Promise<WalletOutput> {
		return this.client.request<WalletOutput>("GET", `/agents/${agentId}/wallet`, undefined, undefined, options);
	}

	public update(agentId: string, input: UpdateWalletInput, options?: RequestOptions): Promise<WalletOutput> {
		return this.client.request<WalletOutput>("PUT", `/agents/${agentId}/wallet`, input, undefined, options);
	}

	public pay(agentId: string, input: WalletPayInput, options?: RequestOptions): Promise<WalletPayOutput> {
		return this.client.request<WalletPayOutput>("POST", `/agents/${agentId}/wallet/pay`, input, undefined, options);
	}

	public x402Fetch(agentId: string, input: X402FetchInput, options?: RequestOptions): Promise<X402FetchOutput> {
		return this.client.request<X402FetchOutput>("POST", `/agents/${agentId}/wallet/x402-fetch`, input, undefined, options);
	}

	public transactions(agentId: string, params?: WalletTransactionsParams, options?: RequestOptions): Promise<{ items: WalletTransactionOutput[] }> {
		return this.client.request<{ items: WalletTransactionOutput[] }>(
			"GET",
			`/agents/${agentId}/wallet/transactions`,
			undefined,
			this.toQuery(params),
			options,
		);
	}

	public async freeze(agentId: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("POST", `/agents/${agentId}/wallet/freeze`, undefined, undefined, options);
	}

	public async unfreeze(agentId: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("POST", `/agents/${agentId}/wallet/unfreeze`, undefined, undefined, options);
	}

	private toQuery(params?: WalletTransactionsParams): Record<string, string> | undefined {
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
