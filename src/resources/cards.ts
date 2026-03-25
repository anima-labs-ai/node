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
	SpendingPolicy,
	TransactionList,
	UpdateCardParams,
	UpdatePolicyParams,
} from "../types";

export class CardsResource {
	public constructor(private readonly client: RequestClient) {}

	public async create(params: CreateCardParams): Promise<Card> {
		return this.client.request<Card>("POST", "/cards", params);
	}

	public async get(cardId: string): Promise<Card> {
		return this.client.request<Card>("GET", `/cards/${cardId}`);
	}

	public async list(params?: ListCardsParams): Promise<CardList> {
		return this.client.request<CardList>("GET", "/cards", undefined, this.toQuery(params));
	}

	public async update(cardId: string, params: UpdateCardParams): Promise<Card> {
		return this.client.request<Card>("PATCH", `/cards/${cardId}`, params);
	}

	public async delete(cardId: string): Promise<void> {
		await this.client.request<{ success: true }>("DELETE", `/cards/${cardId}`);
	}

	public async freeze(cardId: string): Promise<Card> {
		return this.client.request<Card>("POST", `/cards/${cardId}/freeze`);
	}

	public async unfreeze(cardId: string): Promise<Card> {
		return this.client.request<Card>("POST", `/cards/${cardId}/unfreeze`);
	}

	public async createPolicy(cardId: string, params: CreatePolicyParams): Promise<SpendingPolicy> {
		return this.client.request<SpendingPolicy>("POST", "/cards/policies", { cardId, ...params });
	}

	public async listPolicies(cardId: string): Promise<SpendingPolicy[]> {
		const response = await this.client.request<{ items: SpendingPolicy[] } | SpendingPolicy[]>(
			"GET",
			"/cards/policies",
			undefined,
			{ cardId },
		);

		return Array.isArray(response) ? response : response.items;
	}

	public async updatePolicy(policyId: string, params: UpdatePolicyParams): Promise<SpendingPolicy> {
		return this.client.request<SpendingPolicy>("PATCH", `/cards/policies/${policyId}`, params);
	}

	public async deletePolicy(policyId: string): Promise<void> {
		await this.client.request<{ success: true }>("DELETE", `/cards/policies/${policyId}`);
	}

	public async listTransactions(params?: ListTransactionsParams): Promise<TransactionList> {
		return this.client.request<TransactionList>(
			"GET",
			"/cards/transactions",
			undefined,
			this.toQuery(params),
		);
	}

	public async getTransaction(transactionId: string): Promise<CardTransaction> {
		return this.client.request<CardTransaction>("GET", `/cards/transactions/${transactionId}`);
	}

	public async killSwitch(params: KillSwitchParams): Promise<KillSwitchResult> {
		return this.client.request<KillSwitchResult>("POST", "/cards/kill-switch", params);
	}

	public async listApprovals(params?: ListApprovalsParams): Promise<ApprovalList> {
		return this.client.request<ApprovalList>("GET", "/cards/approvals", undefined, this.toQuery(params));
	}

	public async decideApproval(
		approvalId: string,
		decision: "APPROVED" | "DECLINED",
	): Promise<CardApproval> {
		return this.client.request<CardApproval>("POST", `/cards/approvals/${approvalId}/decision`, {
			decision,
		});
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
