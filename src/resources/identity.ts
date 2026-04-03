import type { RequestClient } from "../client";
import type {
	DidDocument,
	DidRotateOutput,
	RequestOptions,
	VerifiableCredential,
	VerifyCredentialOutput,
	AgentCardOutput,
} from "../types";

export class IdentityResource {
	public constructor(private readonly client: RequestClient) {}

	public getDid(agentId: string, options?: RequestOptions): Promise<DidDocument> {
		return this.client.request<DidDocument>("GET", `/agents/${agentId}/did`, undefined, undefined, options);
	}

	public resolveDid(did: string, options?: RequestOptions): Promise<DidDocument> {
		return this.client.request<DidDocument>("GET", `/identity/did/${encodeURIComponent(did)}`, undefined, undefined, options);
	}

	public rotateKeys(agentId: string, options?: RequestOptions): Promise<DidRotateOutput> {
		return this.client.request<DidRotateOutput>("POST", `/agents/${agentId}/did/rotate`, undefined, undefined, options);
	}

	public listCredentials(agentId: string, options?: RequestOptions): Promise<{ items: VerifiableCredential[] }> {
		return this.client.request<{ items: VerifiableCredential[] }>("GET", `/agents/${agentId}/credentials`, undefined, undefined, options);
	}

	public verifyCredential(jwtVc: string, options?: RequestOptions): Promise<VerifyCredentialOutput> {
		return this.client.request<VerifyCredentialOutput>("POST", "/identity/verify", { jwtVc }, undefined, options);
	}

	public getAgentCard(agentId: string, options?: RequestOptions): Promise<AgentCardOutput> {
		return this.client.request<AgentCardOutput>("GET", `/agents/${agentId}/card`, undefined, undefined, options);
	}
}
