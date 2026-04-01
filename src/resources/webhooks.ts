import type { RequestClient } from "../client";
import type {
	CreateWebhookInput,
	PaginatedResponse,
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

	public create(input: CreateWebhookInput): Promise<WebhookOutput> {
		return this.client.request<WebhookOutput>("POST", "/webhooks", input);
	}

	public get(id: string): Promise<WebhookOutput> {
		return this.client.request<WebhookOutput>("GET", `/webhooks/${id}`);
	}

	public list(params?: WebhookListParams): Promise<PaginatedResponse<WebhookOutput>> {
		return this.client.request<PaginatedResponse<WebhookOutput>>(
			"GET",
			"/webhooks",
			undefined,
			this.toListQuery(params),
		);
	}

	public update(id: string, input: UpdateWebhookInput): Promise<WebhookOutput> {
		return this.client.request<WebhookOutput>("PUT", `/webhooks/${id}`, { ...input, id });
	}

	public async delete(id: string): Promise<void> {
		await this.client.request<void>("DELETE", `/webhooks/${id}`);
	}

	public test(id: string, event?: WebhookEventType): Promise<WebhookTestOutput> {
		return this.client.request<WebhookTestOutput>("POST", `/webhooks/${id}/test`, { id, event });
	}

	public listDeliveries(
		id: string,
		params?: WebhookDeliveryListParams,
	): Promise<PaginatedResponse<WebhookDeliveryOutput>> {
		return this.client.request<PaginatedResponse<WebhookDeliveryOutput>>(
			"GET",
			`/webhooks/${id}/deliveries`,
			undefined,
			this.toDeliveryQuery(params, id),
		);
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
