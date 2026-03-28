import type { RequestClient } from "../client";
import type {
	DidDocument,
	DidRotateOutput,
	VerifiableCredential,
	VerifyCredentialOutput,
	AgentCardOutput,
} from "../types";

export class IdentityResource {
	public constructor(private readonly client: RequestClient) {}

	public getDid(agentId: string): Promise<DidDocument> {
		return this.client.request<DidDocument>("GET", `/agents/${agentId}/did`);
	}

	public resolveDid(did: string): Promise<DidDocument> {
		return this.client.request<DidDocument>("GET", `/identity/did/${encodeURIComponent(did)}`);
	}

	public rotateKeys(agentId: string): Promise<DidRotateOutput> {
		return this.client.request<DidRotateOutput>("POST", `/agents/${agentId}/did/rotate`);
	}

	public listCredentials(agentId: string): Promise<{ items: VerifiableCredential[] }> {
		return this.client.request<{ items: VerifiableCredential[] }>("GET", `/agents/${agentId}/credentials`);
	}

	public verifyCredential(jwtVc: string): Promise<VerifyCredentialOutput> {
		return this.client.request<VerifyCredentialOutput>("POST", "/identity/verify", { jwtVc });
	}

	public getAgentCard(agentId: string): Promise<AgentCardOutput> {
		return this.client.request<AgentCardOutput>("GET", `/agents/${agentId}/card`);
	}
}
