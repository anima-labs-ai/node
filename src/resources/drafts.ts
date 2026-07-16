import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	CreateEmailDraftInput,
	EmailDraftListParams,
	EmailDraftOutput,
	MessageOutput,
	RequestOptions,
} from "../types";

/**
 * Email drafts — composed-but-not-sent emails owned by an agent.
 *
 * `send()` is the interesting operation: it atomically converts the draft
 * into a real Message (email.send semantics — threading, scanning, limits
 * all apply) and deletes the draft row. It resolves to the new Message,
 * not the draft; the draft id 404s afterwards.
 */
export class DraftsResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreateEmailDraftInput, options?: RequestOptions): Promise<EmailDraftOutput> {
		return this.client.request<EmailDraftOutput>("POST", "/email/drafts", input, undefined, options);
	}

	public get(id: string, options?: RequestOptions): Promise<EmailDraftOutput> {
		return this.client.request<EmailDraftOutput>("GET", `/email/drafts/${id}`, undefined, undefined, options);
	}

	public list(params?: EmailDraftListParams): PageIterator<EmailDraftOutput> {
		return new PageIterator<EmailDraftOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request("GET", "/email/drafts", undefined, this.toQuery(merged));
		});
	}

	/**
	 * Send the draft. Converts it to a Message and deletes the draft
	 * atomically; resolves to the sent Message.
	 */
	public send(id: string, options?: RequestOptions): Promise<MessageOutput> {
		return this.client.request<MessageOutput>("POST", `/email/drafts/${id}/send`, { id }, undefined, options);
	}

	/** Delete the draft without sending. Resolves to the deleted draft. */
	public delete(id: string, options?: RequestOptions): Promise<EmailDraftOutput> {
		return this.client.request<EmailDraftOutput>("DELETE", `/email/drafts/${id}`, undefined, undefined, options);
	}

	private toQuery(params?: EmailDraftListParams): Record<string, string> | undefined {
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
