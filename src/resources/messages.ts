import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	AttachmentDownloadOutput,
	MessageListParams,
	MessageOutput,
	MessageSearchParams,
	PaginatedResponse,
	RequestOptions,
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

	private toListQuery(params?: MessageListParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.agentId) query.agentId = params.agentId;
		if (params.threadId) query.threadId = params.threadId;
		if (params.channel) query.channel = params.channel;
		if (params.direction) query.direction = params.direction;
		if (params.dateRange?.from) query["dateRange.from"] = params.dateRange.from;
		if (params.dateRange?.to) query["dateRange.to"] = params.dateRange.to;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
