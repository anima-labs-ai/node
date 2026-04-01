import type { RequestClient } from "../client";
import type {
	CreateWalletInput,
	WalletOutput,
	UpdateWalletInput,
	WalletPayInput,
	WalletPayOutput,
	X402FetchInput,
	X402FetchOutput,
	WalletTransactionOutput,
	WalletTransactionsParams,
} from "../types";

export class WalletResource {
	public constructor(private readonly client: RequestClient) {}

	public create(agentId: string, input?: CreateWalletInput): Promise<WalletOutput> {
		return this.client.request<WalletOutput>("POST", `/agents/${agentId}/wallet`, input);
	}

	public get(agentId: string): Promise<WalletOutput> {
		return this.client.request<WalletOutput>("GET", `/agents/${agentId}/wallet`);
	}

	public update(agentId: string, input: UpdateWalletInput): Promise<WalletOutput> {
		return this.client.request<WalletOutput>("PUT", `/agents/${agentId}/wallet`, input);
	}

	public pay(agentId: string, input: WalletPayInput): Promise<WalletPayOutput> {
		return this.client.request<WalletPayOutput>("POST", `/agents/${agentId}/wallet/pay`, input);
	}

	public x402Fetch(agentId: string, input: X402FetchInput): Promise<X402FetchOutput> {
		return this.client.request<X402FetchOutput>("POST", `/agents/${agentId}/wallet/x402-fetch`, input);
	}

	public transactions(agentId: string, params?: WalletTransactionsParams): Promise<{ items: WalletTransactionOutput[] }> {
		return this.client.request<{ items: WalletTransactionOutput[] }>(
			"GET",
			`/agents/${agentId}/wallet/transactions`,
			undefined,
			this.toQuery(params),
		);
	}

	public async freeze(agentId: string): Promise<void> {
		await this.client.request<void>("POST", `/agents/${agentId}/wallet/freeze`);
	}

	public async unfreeze(agentId: string): Promise<void> {
		await this.client.request<void>("POST", `/agents/${agentId}/wallet/unfreeze`);
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
