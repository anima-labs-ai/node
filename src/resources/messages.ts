import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	AttachmentDownloadOutput,
	MessageListParams,
	MessageOutput,
	MessageSearchParams,
	MessageUpdateLabelsInput,
	PaginatedResponse,
	RequestOptions,
	SemanticSearchOutput,
	SemanticSearchParams,
	SendEmailInput,
	SendSmsInput,
	UploadAttachmentInput,
} from "../types";

export class MessagesResource {
	public constructor(private readonly client: RequestClient) {}

	public sendEmail(input: SendEmailInput, options?: RequestOptions): Promise<MessageOutput> {
		return this.client.request<MessageOutput>("POST", "/messages/email", input, undefined, options);
	}

	public sendSms(input: SendSmsInput, options?: RequestOptions): Promise<MessageOutput> {
		return this.client.request<MessageOutput>("POST", "/phone/send-sms", input, undefined, options);
	}

	public get(id: string, options?: RequestOptions): Promise<MessageOutput> {
		return this.client.request<MessageOutput>("GET", `/messages/${id}`, undefined, undefined, options);
	}

	/**
	 * Add and/or remove labels on one message — the agent's workflow state.
	 * Returns the updated message, so the caller never has to guess what the
	 * labels became:
	 *
	 * ```ts
	 * await anima.messages.updateLabels(id, { addLabels: ["read"] });
	 * ```
	 *
	 * Adding `read` removes `unread` and vice versa. One message per call —
	 * there is no batch form.
	 */
	public updateLabels(
		id: string,
		input: MessageUpdateLabelsInput,
		options?: RequestOptions,
	): Promise<MessageOutput> {
		if (!input.addLabels?.length && !input.removeLabels?.length) {
			// Caught here rather than 400ing after a round trip: a call with neither
			// operation can only be a caller bug, and the API's own error would not
			// say which of the two you forgot.
			throw new TypeError(
				"messages.updateLabels requires at least one of addLabels or removeLabels.",
			);
		}
		return this.client.request<MessageOutput>(
			"PATCH",
			`/messages/${id}/labels`,
			{ id, ...input },
			undefined,
			options,
		);
	}

	public list(params?: MessageListParams): PageIterator<MessageOutput> {
		return new PageIterator<MessageOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request("GET", "/messages", undefined, this.toListQuery(merged));
		});
	}

	public search(
		query: string,
		searchParams?: MessageSearchParams,
		options?: RequestOptions,
	): Promise<PaginatedResponse<MessageOutput>> {
		return this.client.request<PaginatedResponse<MessageOutput>>("POST", "/messages/search", {
			query,
			filters: searchParams?.filters,
			pagination: searchParams?.pagination,
		}, undefined, options);
	}

	/**
	 * Semantic (embedding-based) search over message content. Unlike
	 * `search()`, which matches text, this ranks messages by meaning:
	 * "the invoice from last week" finds messages that never contain
	 * those words. Results are ordered by cosine similarity (best first).
	 */
	public semanticSearch(
		query: string,
		params?: SemanticSearchParams,
		options?: RequestOptions,
	): Promise<SemanticSearchOutput> {
		return this.client.request<SemanticSearchOutput>("POST", "/messages/search/semantic", {
			query,
			agentId: params?.agentId,
			limit: params?.limit,
			threshold: params?.threshold,
		}, undefined, options);
	}

	public uploadAttachment(
		messageId: string,
		input: UploadAttachmentInput,
		options?: RequestOptions,
	): Promise<{
		id: string;
		filename: string;
		mimeType: string;
		sizeBytes: number;
		storageKey: string;
		url: string | null;
		createdAt: string;
	}> {
		return this.client.request("POST", `/messages/${messageId}/attachments`, {
			messageId,
			...input,
		}, undefined, options);
	}

	public getAttachmentUrl(attachmentId: string, options?: RequestOptions): Promise<AttachmentDownloadOutput> {
		return this.client.request<AttachmentDownloadOutput>("GET", `/attachments/${attachmentId}/download`, undefined, undefined, options);
	}

	private toListQuery(params?: MessageListParams): Record<string, string | string[]> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string | string[]> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.agentId) query.agentId = params.agentId;
		if (params.threadId) query.threadId = params.threadId;
		if (params.channel) query.channel = params.channel;
		if (params.direction) query.direction = params.direction;
		// Passed through as an array so buildUrl emits one `labels=` key per label.
		// Joining on "," would send a single label literally named "a,b".
		if (params.labels?.length) query.labels = params.labels;
		// `!== undefined`, not truthiness: `includeSpam: false` is the caller
		// explicitly overriding and must reach the wire.
		if (params.includeSpam !== undefined) query.includeSpam = String(params.includeSpam);
		if (params.dateRange?.from) query["dateRange.from"] = params.dateRange.from;
		if (params.dateRange?.to) query["dateRange.to"] = params.dateRange.to;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
