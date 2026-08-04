import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	CreateProvisioningRequestInput,
	CreateProvisioningRequestOutput,
	DecideProvisioningRequestInput,
	ListProvisioningRequestsParams,
	PaginatedResponse,
	ProvisioningRequest,
	RequestOptions,
} from "../types";

/**
 * Ask the organization owner to provision something this agent cannot
 * provision for itself.
 *
 * `vault.provision` and `phones.provision` are both master-gated, and an agent
 * key is never given master authority — so for an agent, these are the only
 * routes to a vault (after sign-up) or a phone number at all.
 *
 * The authority split is enforced server-side, not by this class: `create`,
 * `list`, `get` and `cancel` work with an agent key; `approve` and `decline`
 * require a master credential and answer 403 without one. An agent can open
 * the conversation and withdraw from it, never conclude it.
 */
export class ProvisioningRequestsResource {
	public constructor(private readonly client: RequestClient) {}

	/**
	 * File a request and best-effort notify the owner by email.
	 *
	 * Check `emailSent` on the result: false does not mean the request failed
	 * — it is live and visible in the console regardless — but it does mean no
	 * human was told, so nothing will happen until someone looks.
	 *
	 * Filing an identical request while one is already pending returns the
	 * existing one rather than stacking duplicates in the owner's queue, so a
	 * retry after a timeout is safe.
	 */
	public create(
		input: CreateProvisioningRequestInput,
		options?: RequestOptions,
	): Promise<CreateProvisioningRequestOutput> {
		return this.client.request<CreateProvisioningRequestOutput>(
			"POST",
			"/provisioning-requests",
			input,
			undefined,
			options,
		);
	}

	/** Agents see only their own requests; org credentials see the whole org. */
	public list(
		params?: ListProvisioningRequestsParams,
	): PageIterator<ProvisioningRequest> {
		return new PageIterator<ProvisioningRequest>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request<PaginatedResponse<ProvisioningRequest>>(
				"GET",
				"/provisioning-requests",
				undefined,
				this.toListQuery(merged),
			);
		});
	}

	public get(
		requestId: string,
		options?: RequestOptions,
	): Promise<ProvisioningRequest> {
		return this.client.request<ProvisioningRequest>(
			"GET",
			`/provisioning-requests/${requestId}`,
			undefined,
			undefined,
			options,
		);
	}

	/**
	 * Approve and provision. Requires a master credential.
	 *
	 * Provisioning happens before the request is marked APPROVED, so a failure
	 * (plan too low, no numbers available, provider down) leaves it PENDING and
	 * you can fix the cause and approve again.
	 */
	public approve(
		requestId: string,
		input?: DecideProvisioningRequestInput,
		options?: RequestOptions,
	): Promise<ProvisioningRequest> {
		return this.client.request<ProvisioningRequest>(
			"POST",
			`/provisioning-requests/${requestId}/approve`,
			{ requestId, ...(input ?? {}) },
			undefined,
			options,
		);
	}

	/**
	 * Decline. Requires a master credential. Soft — the agent may ask again, so
	 * pass a `note` saying what would change your mind.
	 */
	public decline(
		requestId: string,
		input?: DecideProvisioningRequestInput,
		options?: RequestOptions,
	): Promise<ProvisioningRequest> {
		return this.client.request<ProvisioningRequest>(
			"POST",
			`/provisioning-requests/${requestId}/decline`,
			{ requestId, ...(input ?? {}) },
			undefined,
			options,
		);
	}

	/** Withdraw your own pending request. Works with an agent key. */
	public cancel(
		requestId: string,
		options?: RequestOptions,
	): Promise<ProvisioningRequest> {
		return this.client.request<ProvisioningRequest>(
			"POST",
			`/provisioning-requests/${requestId}/cancel`,
			{ requestId },
			undefined,
			options,
		);
	}

	private toListQuery(
		params?: ListProvisioningRequestsParams,
	): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.agentId) query.agentId = params.agentId;
		if (params.status) query.status = params.status;
		if (params.resource) query.resource = params.resource;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.cursor) query.cursor = params.cursor;
		return query;
	}
}
