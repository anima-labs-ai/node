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
		return this.client.request<{ password: string }>("POST", "/vault/generate-password", input, undefined, options);
	}

	public getTotp(id: string, agentId?: string, options?: RequestOptions): Promise<VaultTotpOutput> {
		return this.client.request<VaultTotpOutput>("GET", `/vault/totp/${id}`, undefined, agentId ? { agentId } : undefined, options);
	}

	public status(agentId?: string, options?: RequestOptions): Promise<VaultStatusOutput> {
		return this.client.request<VaultStatusOutput>("GET", "/vault/status", undefined, agentId ? { agentId } : undefined, options);
	}

	public sync(agentId?: string, options?: RequestOptions): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/vault/sync", agentId ? { agentId } : undefined, undefined, options);
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
}
