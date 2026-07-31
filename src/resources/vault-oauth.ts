import type { RequestClient } from "../client";
import type {
	ConnectedAccount,
	ConnectLinkOutput,
	ConnectLinkStatusOutput,
	CreateConnectLinkInput,
	ListConnectedAccountsParams,
	ListOAuthAppsParams,
	OAuthAppDefinition,
	RequestOptions,
} from "../types";

/** The `items` envelope these routes return. Unwrapped before it reaches callers. */
interface ItemsEnvelope<T> {
	items: T[];
}

/**
 * OAuth connections: browse connectable services, hand a human a Connect Link,
 * and manage the accounts that come back.
 *
 * The agent never sees the tokens — a completed link stores them in the vault,
 * and outbound calls go through `vault.useCredential`.
 */
export class VaultOAuthResource {
	public constructor(private readonly client: RequestClient) {}

	/** List the services an agent can connect to. */
	public async listApps(
		params?: ListOAuthAppsParams,
		options?: RequestOptions,
	): Promise<OAuthAppDefinition[]> {
		const response = await this.client.request<ItemsEnvelope<OAuthAppDefinition>>(
			"GET",
			"/vault/oauth/apps",
			undefined,
			params?.category ? { category: params.category } : undefined,
			options,
		);
		return response.items;
	}

	/** Look up a single service by slug (e.g. `github`). */
	public getApp(slug: string, options?: RequestOptions): Promise<OAuthAppDefinition> {
		return this.client.request<OAuthAppDefinition>(
			"GET",
			`/vault/oauth/apps/${slug}`,
			undefined,
			undefined,
			options,
		);
	}

	/**
	 * Create a Connect Link — a hosted auth URL. Give `linkUrl` to the human;
	 * poll `getLinkStatus(token)` until it reports `COMPLETED`.
	 */
	public createLink(
		input: CreateConnectLinkInput,
		options?: RequestOptions,
	): Promise<ConnectLinkOutput> {
		return this.client.request<ConnectLinkOutput>(
			"POST",
			"/vault/oauth/link",
			input,
			undefined,
			options,
		);
	}

	/** Check whether a Connect Link has been completed. */
	public getLinkStatus(token: string, options?: RequestOptions): Promise<ConnectLinkStatusOutput> {
		return this.client.request<ConnectLinkStatusOutput>(
			"GET",
			`/vault/oauth/link/${token}`,
			undefined,
			undefined,
			options,
		);
	}

	/** List established service connections. */
	public async listAccounts(
		params?: ListConnectedAccountsParams,
		options?: RequestOptions,
	): Promise<ConnectedAccount[]> {
		const response = await this.client.request<ItemsEnvelope<ConnectedAccount>>(
			"GET",
			"/vault/oauth/accounts",
			undefined,
			this.toAccountsQuery(params),
			options,
		);
		return response.items;
	}

	/** Revoke a service connection. */
	public async disconnect(accountId: string, options?: RequestOptions): Promise<void> {
		await this.client.request<{ success: true }>(
			"DELETE",
			`/vault/oauth/accounts/${accountId}`,
			undefined,
			undefined,
			options,
		);
	}

	private toAccountsQuery(params?: ListConnectedAccountsParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.agentId) query.agentId = params.agentId;
		if (params.userId) query.userId = params.userId;
		if (params.appSlug) query.appSlug = params.appSlug;
		if (params.status) query.status = params.status;
		return query;
	}
}
