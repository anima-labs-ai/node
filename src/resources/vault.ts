import type { RequestClient } from "../client";
import type {
	CreateVaultCredentialInput,
	DeprovisionVaultInput,
	GeneratePasswordInput,
	ListVaultCredentialsParams,
	ProvisionVaultInput,
	SearchVaultParams,
	VaultCredential,
	VaultIdentityOutput,
	VaultStatusOutput,
	VaultTotpOutput,
	UpdateVaultCredentialInput,
} from "../types";

export class VaultResource {
	public constructor(private readonly client: RequestClient) {}

	public provision(input: ProvisionVaultInput): Promise<VaultIdentityOutput> {
		return this.client.request<VaultIdentityOutput>("POST", "/vault/provision", input);
	}

	public deprovision(input: DeprovisionVaultInput): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/vault/deprovision", input);
	}

	public listCredentials(params?: ListVaultCredentialsParams): Promise<{ items: VaultCredential[] }> {
		return this.client.request<{ items: VaultCredential[] }>(
			"GET",
			"/vault/credentials",
			undefined,
			this.toListQuery(params),
		);
	}

	public getCredential(id: string): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("GET", `/vault/credentials/${id}`);
	}

	public createCredential(input: CreateVaultCredentialInput): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("POST", "/vault/credentials", input);
	}

	public updateCredential(id: string, input: UpdateVaultCredentialInput): Promise<VaultCredential> {
		return this.client.request<VaultCredential>("PUT", `/vault/credentials/${id}`, input);
	}

	public async deleteCredential(id: string): Promise<void> {
		await this.client.request<{ success: true }>("DELETE", `/vault/credentials/${id}`);
	}

	public search(params: SearchVaultParams): Promise<{ items: VaultCredential[] }> {
		return this.client.request<{ items: VaultCredential[] }>(
			"GET",
			"/vault/search",
			undefined,
			this.toSearchQuery(params),
		);
	}

	public generatePassword(input?: GeneratePasswordInput): Promise<{ password: string }> {
		return this.client.request<{ password: string }>("POST", "/vault/generate-password", input);
	}

	public getTotp(id: string): Promise<VaultTotpOutput> {
		return this.client.request<VaultTotpOutput>("GET", `/vault/totp/${id}`);
	}

	public status(agentId: string): Promise<VaultStatusOutput> {
		return this.client.request<VaultStatusOutput>("GET", "/vault/status", undefined, { agentId });
	}

	public sync(agentId: string): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/vault/sync", { agentId });
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
