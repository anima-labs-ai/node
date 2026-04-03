import type { RequestClient } from "../client";
import type {
	CreateVaultCredentialInput,
	DeprovisionVaultInput,
	GeneratePasswordInput,
	ListVaultCredentialsParams,
	ProvisionVaultInput,
	RequestOptions,
	SearchVaultParams,
	VaultCredential,
	VaultIdentityOutput,
	VaultStatusOutput,
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

	public getCredential(id: string, options?: RequestOptions): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("GET", `/vault/credentials/${id}`, undefined, undefined, options);
	}

	public createCredential(input: CreateVaultCredentialInput, options?: RequestOptions): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("POST", "/vault/credentials", input, undefined, options);
	}

	public updateCredential(id: string, input: UpdateVaultCredentialInput, options?: RequestOptions): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("PUT", `/vault/credentials/${id}`, input, undefined, options);
	}

	public async deleteCredential(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/vault/credentials/${id}`, undefined, undefined, options);
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

	public getTotp(id: string, options?: RequestOptions): Promise<VaultTotpOutput> {
		return this.client.request<VaultTotpOutput>("GET", `/vault/totp/${id}`, undefined, undefined, options);
	}

	public status(agentId: string, options?: RequestOptions): Promise<VaultStatusOutput> {
		return this.client.request<VaultStatusOutput>("GET", "/vault/status", undefined, { agentId }, options);
	}

	public sync(agentId: string, options?: RequestOptions): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/vault/sync", { agentId }, undefined, options);
	}

	private toListQuery(params?: ListVaultCredentialsParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = { agentId: params.agentId };
		if (params.type) query.type = params.type;

		return query;
	}

	private toSearchQuery(params: SearchVaultParams): Record<string, string> {
		const query: Record<string, string> = {
			agentId: params.agentId,
			search: params.search,
		};
		if (params.type) query.type = params.type;

		return query;
	}
}
