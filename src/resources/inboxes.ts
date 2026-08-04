import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	CreateInboxInput,
	InboxListParams,
	InboxOutput,
	RequestOptions,
	UpdateInboxInput,
} from "../types";

export class InboxesResource {
	public constructor(private readonly client: RequestClient) {}

	/**
	 * Create an inbox. All fields are optional — `create()` with no
	 * arguments provisions an inbox with a generated address on the
	 * default domain.
	 */
	public create(
		input: CreateInboxInput = {},
		options?: RequestOptions,
	): Promise<InboxOutput> {
		return this.client.request<InboxOutput>(
			"POST",
			"/inboxes",
			input,
			undefined,
			options,
		);
	}

	public get(id: string, options?: RequestOptions): Promise<InboxOutput> {
		return this.client.request<InboxOutput>(
			"GET",
			`/inboxes/${id}`,
			undefined,
			undefined,
			options,
		);
	}

	public list(params?: InboxListParams): PageIterator<InboxOutput> {
		return new PageIterator<InboxOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request(
				"GET",
				"/inboxes",
				undefined,
				this.toQuery(merged),
			);
		});
	}

	public update(
		id: string,
		input: UpdateInboxInput,
		options?: RequestOptions,
	): Promise<InboxOutput> {
		return this.client.request<InboxOutput>(
			"PATCH",
			`/inboxes/${id}`,
			{ ...input, id },
			undefined,
			options,
		);
	}

	public async delete(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>(
			"DELETE",
			`/inboxes/${id}`,
			undefined,
			undefined,
			options,
		);
	}

	private toQuery(
		params?: InboxListParams,
	): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		if (params.query) query.query = params.query;

		return Object.keys(query).length > 0 ? query : undefined;
	}
}
