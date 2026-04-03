import type { RequestClient } from "../client";
import { PageIterator } from "../pagination";
import type {
	CreateWebhookInput,
	RequestOptions,
	WebhookDeliveryListParams,
	WebhookDeliveryOutput,
	WebhookEventType,
	WebhookListParams,
	WebhookOutput,
	WebhookTestOutput,
	UpdateWebhookInput,
} from "../types";

export class WebhooksResource {
	public constructor(private readonly client: RequestClient) {}

	public create(input: CreateWebhookInput, options?: RequestOptions): Promise<WebhookOutput> {
		return this.client.request<WebhookOutput>("POST", "/webhooks", input, undefined, options);
	}

	public get(id: string, options?: RequestOptions): Promise<WebhookOutput> {
		return this.client.request<WebhookOutput>("GET", `/webhooks/${id}`, undefined, undefined, options);
	}

	public list(params?: WebhookListParams): PageIterator<WebhookOutput> {
		return new PageIterator<WebhookOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request("GET", "/webhooks", undefined, this.toListQuery(merged));
		});
	}

	public update(id: string, input: UpdateWebhookInput, options?: RequestOptions): Promise<WebhookOutput> {
		return this.client.request<WebhookOutput>("PUT", `/webhooks/${id}`, { ...input, id }, undefined, options);
	}

	public async delete(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>("DELETE", `/webhooks/${id}`, undefined, undefined, options);
	}

	public test(id: string, event?: WebhookEventType, options?: RequestOptions): Promise<WebhookTestOutput> {
		return this.client.request<WebhookTestOutput>("POST", `/webhooks/${id}/test`, { id, event }, undefined, options);
	}

	public listDeliveries(
		id: string,
		params?: WebhookDeliveryListParams,
	): PageIterator<WebhookDeliveryOutput> {
		return new PageIterator<WebhookDeliveryOutput>((cursor) => {
			const merged = cursor ? { ...params, cursor } : params;
			return this.client.request("GET", `/webhooks/${id}/deliveries`, undefined, this.toDeliveryQuery(merged, id));
		});
	}

	private toListQuery(params?: WebhookListParams): Record<string, string> | undefined {
		if (!params) {
			return undefined;
		}

		const query: Record<string, string> = {};
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);

		return Object.keys(query).length > 0 ? query : undefined;
	}

	private toDeliveryQuery(
		params: WebhookDeliveryListParams | undefined,
		webhookId: string,
	): Record<string, string> {
		const query: Record<string, string> = { webhookId };
		if (params?.cursor) query.cursor = params.cursor;
		if (params?.limit !== undefined) query.limit = String(params.limit);
		return query;
	}
}
