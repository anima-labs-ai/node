import type { RequestClient } from "../client";
import type {
	CreateVaultCredentialInput,
	CreateVaultTokenInput,
	DeprovisionVaultInput,
	GeneratePasswordInput,
	ListVaultCredentialsParams,
	ProvisionVaultInput,
	RequestOptions,
	RevokeShareInput,
	RevokeVaultTokensInput,
	SearchVaultParams,
	ShareCredentialInput,
	VaultCredential,
	VaultIdentityOutput,
	VaultShare,
	VaultStatusOutput,
	VaultTokenOutput,
	VaultTotpOutput,
	UpdateVaultCredentialInput,
} from "../types";

export class VaultResource {
	public constructor(private readonly client: RequestClient) {}

	public provision(input: ProvisionVaultInput, options?: RequestOptions): Promise<VaultIdentityOutput> {
		return this.client.request<VaultIdentityOutput>("POST", "/vault/provision", input, undefined, options);
	}

	public deprovision(input: DeprovisionVaultInput, options?: RequestOptions): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/vault/deprovision", input, undefined, options);
	}

	public listCredentials(params?: ListVaultCredentialsParams, options?: RequestOptions): Promise<{ items: VaultCredential[] }> {
		return this.client.request<{ items: VaultCredential[] }>(
			"GET",
			"/vault/credentials",
			undefined,
			this.toListQuery(params),
			options,
		);
	}

	public getCredential(id: string, agentId?: string, options?: RequestOptions): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("GET", `/vault/credentials/${id}`, undefined, agentId ? { agentId } : undefined, options);
	}

	public createCredential(input: CreateVaultCredentialInput, options?: RequestOptions): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("POST", "/vault/credentials", input, undefined, options);
	}

	public updateCredential(id: string, input: UpdateVaultCredentialInput, options?: RequestOptions): Promise<VaultCredential> {
		const { agentId, ...body } = input;
		return this.client.request<VaultCredential>("PUT", `/vault/credentials/${id}`, { agentId, ...body }, undefined, options);
	}

	public async deleteCredential(id: string, agentId?: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/vault/credentials/${id}`, agentId ? { agentId } : undefined, undefined, options);
	}

	public search(params: SearchVaultParams, options?: RequestOptions): Promise<{ items: VaultCredential[] }> {
		return this.client.request<{ items: VaultCredential[] }>(
			"GET",
			"/vault/search",
			undefined,
			this.toSearchQuery(params),
			options,
		);
	}

	public generatePassword(input?: GeneratePasswordInput, options?: RequestOptions): Promise<{ password: string }> {
		return this.client.request<{ password: string }>("POST", "/vault/generate-password", input ?? {}, undefined, options);
	}

	public getTotp(id: string, agentId?: string, options?: RequestOptions): Promise<VaultTotpOutput> {
		return this.client.request<VaultTotpOutput>("GET", `/vault/totp/${id}`, undefined, agentId ? { agentId } : undefined, options);
	}

	public status(agentId?: string, options?: RequestOptions): Promise<VaultStatusOutput> {
		return this.client.request<VaultStatusOutput>("GET", "/vault/status", undefined, agentId ? { agentId } : undefined, options);
	}

	public sync(agentId?: string, options?: RequestOptions): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/vault/sync", agentId ? { agentId } : {}, undefined, options);
	}

	// -----------------------------------------------------------------------
	// Sharing
	// -----------------------------------------------------------------------

	public shareCredential(input: ShareCredentialInput, options?: RequestOptions): Promise<VaultShare> {
		return this.client.request<VaultShare>("POST", "/vault/share", input, undefined, options);
	}

	public listShares(
		agentId: string | undefined,
		direction: "granted" | "received",
		options?: RequestOptions,
	): Promise<{ items: VaultShare[] }> {
		const query: Record<string, string> = { direction };
		if (agentId) query.agentId = agentId;
		return this.client.request<{ items: VaultShare[] }>(
			"GET",
			"/vault/shares",
			undefined,
			query,
			options,
		);
	}

	public async revokeShare(input: RevokeShareInput, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("POST", "/vault/share/revoke", input, undefined, options);
	}

	// -----------------------------------------------------------------------
	// Ephemeral tokens
	// -----------------------------------------------------------------------

	public createToken(input: CreateVaultTokenInput, options?: RequestOptions): Promise<VaultTokenOutput> {
		return this.client.request<VaultTokenOutput>("POST", "/vault/token", input, undefined, options);
	}

	public exchangeToken(token: string, options?: RequestOptions): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("POST", "/vault/token/exchange", { token }, undefined, options);
	}

	public revokeTokens(input: RevokeVaultTokensInput, options?: RequestOptions): Promise<{ success: boolean; revoked: number }> {
		return this.client.request<{ success: boolean; revoked: number }>(
			"POST",
			"/vault/token/revoke",
			input,
			undefined,
			options,
		);
	}

	private toListQuery(params?: ListVaultCredentialsParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.agentId) query.agentId = params.agentId;
		if (params.type) query.type = params.type;

		return Object.keys(query).length > 0 ? query : undefined;
	}

	private toSearchQuery(params: SearchVaultParams): Record<string, string> {
		const query: Record<string, string> = {
			search: params.search,
		};
		if (params.agentId) query.agentId = params.agentId;
		if (params.type) query.type = params.type;

		return query;
	}

	/** OAuth sub-resource for managing service connections */
	public get oauth(): VaultOAuthResource {
		return new VaultOAuthResource(this.client);
	}
}

// ── OAuth Sub-Resource ────────────────────────────────────────────────────

export interface OAuthApp {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	iconUrl: string | null;
	authMethod: string;
	defaultScopes: string[];
	requiresPkce: boolean;
	category: string | null;
	isManaged: boolean;
	isActive: boolean;
}

export interface ConnectedAccount {
	id: string;
	agentId: string;
	userId: string | null;
	appDefinitionId: string;
	appSlug: string;
	appName: string;
	appIconUrl: string | null;
	customAppId: string | null;
	grantedScopes: string[];
	accountLabel: string | null;
	accountEmail: string | null;
	status: string;
	statusMessage: string | null;
	tokenExpiresAt: string | null;
	lastRefreshedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ConnectLinkResult {
	linkUrl: string;
	token: string;
	expiresAt: string;
}

export interface ConnectLinkStatus {
	status: "PENDING" | "COMPLETED" | "EXPIRED" | "FAILED";
	connectedAccountId: string | null;
}

export interface CreateConnectLinkInput {
	agentId?: string;
	appSlug: string;
	userId?: string;
	scopes?: string[];
	callbackUrl?: string;
	customAppId?: string;
}

export interface ListConnectedAccountsInput {
	agentId?: string;
	userId?: string;
	appSlug?: string;
	status?: string;
}

class VaultOAuthResource {
	constructor(private readonly client: RequestClient) {}

	public listApps(category?: string, options?: RequestOptions): Promise<{ items: OAuthApp[] }> {
		const query = category ? { category } : undefined;
		return this.client.request<{ items: OAuthApp[] }>("GET", "/vault/oauth/apps", undefined, query, options);
	}

	public getApp(slug: string, options?: RequestOptions): Promise<OAuthApp> {
		return this.client.request<OAuthApp>("GET", `/vault/oauth/apps/${slug}`, undefined, undefined, options);
	}

	public createLink(input: CreateConnectLinkInput, options?: RequestOptions): Promise<ConnectLinkResult> {
		return this.client.request<ConnectLinkResult>("POST", "/vault/oauth/link", input, undefined, options);
	}

	public getLinkStatus(token: string, options?: RequestOptions): Promise<ConnectLinkStatus> {
		return this.client.request<ConnectLinkStatus>("GET", `/vault/oauth/link/${token}`, undefined, undefined, options);
	}

	public listAccounts(input?: ListConnectedAccountsInput, options?: RequestOptions): Promise<{ items: ConnectedAccount[] }> {
		const query: Record<string, string> = {};
		if (input?.agentId) query.agentId = input.agentId;
		if (input?.userId) query.userId = input.userId;
		if (input?.appSlug) query.appSlug = input.appSlug;
		if (input?.status) query.status = input.status;
		return this.client.request<{ items: ConnectedAccount[] }>("GET", "/vault/oauth/accounts", undefined, Object.keys(query).length > 0 ? query : undefined, options);
	}

	public disconnect(accountId: string, agentId?: string, options?: RequestOptions): Promise<{ success: boolean }> {
		const query = agentId ? { agentId } : undefined;
		return this.client.request<{ success: boolean }>("DELETE", `/vault/oauth/accounts/${accountId}`, undefined, query, options);
	}
}
