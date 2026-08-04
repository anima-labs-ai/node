import type { RequestClient } from "../client";
import type {
	AgentCardOutput,
	DidDocument,
	DidRotateOutput,
	IssueCredentialInput,
	RequestOptions,
	VerifiableCredentialRecord,
	VerifyCredentialOutput,
} from "../types";

export class IdentityResource {
	public constructor(private readonly client: RequestClient) {}

	public getDid(
		agentId: string,
		options?: RequestOptions,
	): Promise<DidDocument> {
		return this.client.request<DidDocument>(
			"GET",
			`/agents/${agentId}/did`,
			undefined,
			undefined,
			options,
		);
	}

	// No `resolveDid`. It called GET /identity/did/{did}, which the API has
	// never served, and resolving a DID to its owning agent is what
	// `registry.lookup(did)` does — GET /registry/agents/{did}.

	public rotateKeys(
		agentId: string,
		options?: RequestOptions,
	): Promise<DidRotateOutput> {
		return this.client.request<DidRotateOutput>(
			"POST",
			`/agents/${agentId}/did/rotate`,
			undefined,
			undefined,
			options,
		);
	}

	/**
	 * List an agent's verifiable credentials. Returns a bare array (the
	 * endpoint is not paginated), newest first.
	 */
	public listCredentials(
		agentId: string,
		options?: RequestOptions,
	): Promise<VerifiableCredentialRecord[]> {
		return this.client.request<VerifiableCredentialRecord[]>(
			"GET",
			`/agents/${agentId}/credentials`,
			undefined,
			undefined,
			options,
		);
	}

	/**
	 * Issue a verifiable credential to an agent (master key). Only the
	 * org-attestation types (`AnimaAddressVerified`, `AnimaTrustScore`) can
	 * be issued here; platform-reserved types (email/phone/payment/KYB/owner
	 * verification) are auto-issued by their platform events and return 403.
	 */
	public issueCredential(
		agentId: string,
		input: IssueCredentialInput,
		options?: RequestOptions,
	): Promise<VerifiableCredentialRecord> {
		// agentId last: the path-derived value must win over any stray
		// `agentId` smuggled in via a non-literal `input` object.
		return this.client.request<VerifiableCredentialRecord>(
			"POST",
			`/agents/${agentId}/credentials`,
			{
				...input,
				agentId,
			},
			undefined,
			options,
		);
	}

	/**
	 * Revoke a previously issued credential (master key). Resolves to the
	 * updated record with `revoked: true`; verification of its `jwtVc` fails
	 * from then on.
	 */
	public revokeCredential(
		agentId: string,
		vcId: string,
		options?: RequestOptions,
	): Promise<VerifiableCredentialRecord> {
		return this.client.request<VerifiableCredentialRecord>(
			"POST",
			`/agents/${agentId}/credentials/${vcId}/revoke`,
			undefined,
			undefined,
			options,
		);
	}

	public verifyCredential(
		jwtVc: string,
		options?: RequestOptions,
	): Promise<VerifyCredentialOutput> {
		return this.client.request<VerifyCredentialOutput>(
			"POST",
			"/identity/verify",
			{ jwtVc },
			undefined,
			options,
		);
	}

	public getAgentCard(
		agentId: string,
		options?: RequestOptions,
	): Promise<AgentCardOutput> {
		return this.client.request<AgentCardOutput>(
			"GET",
			`/agents/${agentId}/card`,
			undefined,
			undefined,
			options,
		);
	}
}
