import type { RequestClient } from "../client";
import type {
	ApprovalList,
	Card,
	CardApproval,
	CardList,
	CardTransaction,
	CreateCardParams,
	CreatePolicyParams,
	KillSwitchParams,
	KillSwitchResult,
	ListApprovalsParams,
	ListCardsParams,
	ListTransactionsParams,
	RequestOptions,
	SpendingPolicy,
	TransactionList,
	UpdateCardParams,
	UpdatePolicyParams,
} from "../types";

export class CardsResource {
	public constructor(private readonly client: RequestClient) {}

	public async create(params: CreateCardParams, options?: RequestOptions): Promise<Card> {
		return this.client.request<Card>("POST", "/cards", params, undefined, options);
	}

	public async get(cardId: string, options?: RequestOptions): Promise<Card> {
		return this.client.request<Card>("GET", `/cards/${cardId}`, undefined, undefined, options);
	}

	public async list(params?: ListCardsParams, options?: RequestOptions): Promise<CardList> {
		return this.client.request<CardList>("GET", "/cards", undefined, this.toQuery(params), options);
	}

	public async update(cardId: string, params: UpdateCardParams, options?: RequestOptions): Promise<Card> {
		return this.client.request<Card>("PATCH", `/cards/${cardId}`, params, undefined, options);
	}

	public async delete(cardId: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/cards/${cardId}`, undefined, undefined, options);
	}

	public async freeze(cardId: string, options?: RequestOptions): Promise<Card> {
		return this.client.request<Card>("POST", `/cards/${cardId}/freeze`, undefined, undefined, options);
	}

	public async unfreeze(cardId: string, options?: RequestOptions): Promise<Card> {
		return this.client.request<Card>("POST", `/cards/${cardId}/unfreeze`, undefined, undefined, options);
	}

	public async createPolicy(cardId: string, params: CreatePolicyParams, options?: RequestOptions): Promise<SpendingPolicy> {
		return this.client.request<SpendingPolicy>("POST", "/cards/policies", { cardId, ...params }, undefined, options);
	}

	public async listPolicies(cardId: string, options?: RequestOptions): Promise<SpendingPolicy[]> {
		const response = await this.client.request<{ items: SpendingPolicy[] } | SpendingPolicy[]>(
			"GET",
			"/cards/policies",
			undefined,
			{ cardId },
			options,
		);

		return Array.isArray(response) ? response : response.items;
	}

	public async updatePolicy(policyId: string, params: UpdatePolicyParams, options?: RequestOptions): Promise<SpendingPolicy> {
		return this.client.request<SpendingPolicy>("PATCH", `/cards/policies/${policyId}`, params, undefined, options);
	}

	public async deletePolicy(policyId: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/cards/policies/${policyId}`, undefined, undefined, options);
	}

	public async listTransactions(params?: ListTransactionsParams, options?: RequestOptions): Promise<TransactionList> {
		return this.client.request<TransactionList>(
			"GET",
			"/cards/transactions",
			undefined,
			this.toQuery(params),
			options,
		);
	}

	public async getTransaction(transactionId: string, options?: RequestOptions): Promise<CardTransaction> {
		return this.client.request<CardTransaction>("GET", `/cards/transactions/${transactionId}`, undefined, undefined, options);
	}

	public async killSwitch(params: KillSwitchParams, options?: RequestOptions): Promise<KillSwitchResult> {
		return this.client.request<KillSwitchResult>("POST", "/cards/kill-switch", params, undefined, options);
	}

	public async listApprovals(params?: ListApprovalsParams, options?: RequestOptions): Promise<ApprovalList> {
		return this.client.request<ApprovalList>("GET", "/cards/approvals", undefined, this.toQuery(params), options);
	}

	public async decideApproval(
		approvalId: string,
		decision: "APPROVED" | "DECLINED",
		options?: RequestOptions,
	): Promise<CardApproval> {
		return this.client.request<CardApproval>("POST", `/cards/approvals/${approvalId}/decision`, {
			decision,
		}, undefined, options);
	}

	private toQuery(
		params?: ListCardsParams | ListTransactionsParams | ListApprovalsParams,
	): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
			if (value !== undefined) {
				query[key] = String(value);
			}
		}

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
