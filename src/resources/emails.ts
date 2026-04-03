import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	AttachmentDownloadOutput,
	EmailListParams,
	MessageOutput,
	RequestOptions,
	UploadAttachmentInput,
} from "../types";

export class EmailsResource {
	public constructor(private readonly client: RequestClient) {}

	public list(params?: EmailListParams): PageIterator<MessageOutput> {
		return new PageIterator<MessageOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request("GET", "/email", undefined, this.toQuery(merged));
		});
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

	private toQuery(params?: EmailListParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.agentId) query.agentId = params.agentId;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
