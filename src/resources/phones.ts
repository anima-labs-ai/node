import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	AvailableNumber,
	ListPhoneIdentitiesParams,
	ListPhonesParams,
	PaginatedResponse,
	PhoneIdentityListItem,
	PhoneIdentityOutput,
	PhoneProvisionOutput,
	ProvisionPhoneInput,
	ReleasePhoneInput,
	RequestOptions,
	SearchPhonesParams,
	SmsSuppression,
	SmsSuppressionListParams,
	SmsThreadDetail,
	SmsThreadGetParams,
	SmsThreadListPage,
	SmsThreadListParams,
	SmsThreadStat,
	SmsThreadStatsParams,
	SmsUnsuppressInput,
	SmsUnsuppressOutput,
} from "../types";

export class PhonesResource {
	public constructor(private readonly client: RequestClient) {}

	public search(
		params?: SearchPhonesParams,
		options?: RequestOptions,
	): Promise<{ items: AvailableNumber[] }> {
		return this.client.request<{ items: AvailableNumber[] }>(
			"GET",
			"/phone/search",
			undefined,
			this.toSearchQuery(params),
			options,
		);
	}

	public provision(
		input: ProvisionPhoneInput,
		options?: RequestOptions,
	): Promise<PhoneProvisionOutput> {
		return this.client.request<PhoneProvisionOutput>(
			"POST",
			"/phone/provision",
			input,
			undefined,
			options,
		);
	}

	public release(
		input: ReleasePhoneInput,
		options?: RequestOptions,
	): Promise<{ success: true }> {
		return this.client.request<{ success: true }>(
			"POST",
			"/phone/release",
			input,
			undefined,
			options,
		);
	}

	public list(
		params: ListPhonesParams,
		options?: RequestOptions,
	): Promise<{ items: PhoneIdentityOutput[] }> {
		return this.client.request<{ items: PhoneIdentityOutput[] }>(
			"GET",
			"/phone/numbers",
			undefined,
			{ agentId: params.agentId },
			options,
		);
	}

	/**
	 * Every number in the organization, with the agent that owns each.
	 *
	 * The org-wide sibling of `list()`, which answers "what does this agent
	 * own" and is naturally small. This one answers "what does the org own" and
	 * is not, so it pages — auto-iterate it, or await it for the first page.
	 */
	public listIdentities(
		params?: ListPhoneIdentitiesParams,
	): PageIterator<PhoneIdentityListItem> {
		return new PageIterator<PhoneIdentityListItem>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request<PaginatedResponse<PhoneIdentityListItem>>(
				"GET",
				"/phone/identities",
				undefined,
				this.toIdentitiesQuery(merged),
			);
		});
	}

	/**
	 * SMS conversations, newest activity first.
	 *
	 * Offset-paged rather than cursor-paged, so this returns a plain page and
	 * not a `PageIterator`: advance with `offset`, and stop when `hasMore` is
	 * false. `total` counts every conversation matching the query, so with
	 * `unread: true` it counts unread conversations, not all of them.
	 */
	public listSmsThreads(
		params?: SmsThreadListParams,
		options?: RequestOptions,
	): Promise<SmsThreadListPage> {
		return this.client.request<SmsThreadListPage>(
			"GET",
			"/phone/sms/threads",
			undefined,
			this.toThreadsQuery(params),
			options,
		);
	}

	/**
	 * One conversation with its message history.
	 *
	 * `id` is a `threadId` from `listSmsThreads()` or `MessageOutput.threadId`.
	 */
	public getSmsThread(
		id: string,
		params?: SmsThreadGetParams,
		options?: RequestOptions,
	): Promise<SmsThreadDetail> {
		const query: Record<string, string> = {};
		if (params?.limit !== undefined) query.limit = String(params.limit);
		return this.client.request<SmsThreadDetail>(
			"GET",
			`/phone/sms/threads/${id}`,
			undefined,
			Object.keys(query).length > 0 ? query : undefined,
			options,
		);
	}

	/**
	 * Per-agent conversation totals for an SMS overview.
	 *
	 * An aggregate, so it is both correct and cheaper than counting a page of
	 * `listSmsThreads()` client-side — that approach makes every number a lower
	 * bound once the org exceeds one page, with nothing saying so.
	 */
	public smsThreadStats(
		params?: SmsThreadStatsParams,
		options?: RequestOptions,
	): Promise<{ items: SmsThreadStat[] }> {
		return this.client.request<{ items: SmsThreadStat[] }>(
			"GET",
			"/phone/sms/stats",
			undefined,
			params?.agentId ? { agentId: params.agentId } : undefined,
			options,
		);
	}

	/**
	 * Recipients that SMS sends are refused for. Master-key only.
	 *
	 * Sends to a suppressed number fail with `RECIPIENT_OPTED_OUT`.
	 */
	public listSmsSuppressions(
		params?: SmsSuppressionListParams,
	): PageIterator<SmsSuppression> {
		return new PageIterator<SmsSuppression>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			const query: Record<string, string> = {};
			if (merged?.phoneNumber) query.phoneNumber = merged.phoneNumber;
			if (merged?.cursor) query.cursor = merged.cursor;
			if (merged?.limit !== undefined) query.limit = String(merged.limit);
			return this.client.request<PaginatedResponse<SmsSuppression>>(
				"GET",
				"/phone/sms-suppressions",
				undefined,
				query,
			);
		});
	}

	/**
	 * Remove every SMS suppression for a number in this org. Master-key only.
	 *
	 * Use sparingly: a suppression records the recipient's own STOP, so
	 * reversing one is an org-owner decision, never an agent's. The
	 * recipient-driven lift is texting START, which needs no call here.
	 */
	public unsuppressSms(
		input: SmsUnsuppressInput,
		options?: RequestOptions,
	): Promise<SmsUnsuppressOutput> {
		return this.client.request<SmsUnsuppressOutput>(
			"POST",
			"/phone/sms-unsuppress",
			input,
			undefined,
			options,
		);
	}

	private toIdentitiesQuery(
		params?: ListPhoneIdentitiesParams,
	): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.query) query.query = params.query;
		if (params.agentId) query.agentId = params.agentId;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}

	private toThreadsQuery(
		params?: SmsThreadListParams,
	): Record<string, string> | undefined {
		if (!params) return undefined;
		const query: Record<string, string> = {};
		if (params.agentId) query.agentId = params.agentId;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.offset !== undefined) query.offset = String(params.offset);
		// Explicit `false` is meaningful — it is the All tab, not "unset".
		if (params.unread !== undefined) query.unread = String(params.unread);
		return Object.keys(query).length > 0 ? query : undefined;
	}

	private toSearchQuery(
		params?: SearchPhonesParams,
	): Record<string, string | string[]> | undefined {
		if (!params) return undefined;
		const query: Record<string, string | string[]> = {};
		if (params.countryCode) query.countryCode = params.countryCode;
		if (params.areaCode) query.areaCode = params.areaCode;
		if (params.capabilities) query["capabilities[]"] = params.capabilities;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return Object.keys(query).length > 0 ? query : undefined;
	}
}
