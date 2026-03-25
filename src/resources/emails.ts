import type { RequestClient } from "../client";
import type {
	AttachmentDownloadOutput,
	EmailListParams,
	MessageOutput,
	PaginatedResponse,
	UploadAttachmentInput,
} from "../types";

export class EmailsResource {
	public constructor(private readonly client: RequestClient) {}

	public list(params?: EmailListParams): Promise<PaginatedResponse<MessageOutput>> {
		return this.client.request<PaginatedResponse<MessageOutput>>(
			"GET",
			"/email",
			undefined,
			this.toQuery(params),
		);
	}

	public uploadAttachment(
		messageId: string,
		input: UploadAttachmentInput,
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
		});
	}

	public getAttachmentUrl(attachmentId: string): Promise<AttachmentDownloadOutput> {
		return this.client.request<AttachmentDownloadOutput>("GET", `/attachments/${attachmentId}/download`);
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
