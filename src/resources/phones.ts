import type { RequestClient } from "../client";
import type {
	ListPhonesParams,
	PhoneConfigUpdateInput,
	PhoneIdentityOutput,
	PhoneProvisionOutput,
	ProvisionPhoneInput,
} from "../types";

export class PhonesResource {
	public constructor(private readonly client: RequestClient) {}

	public provision(input: ProvisionPhoneInput): Promise<PhoneProvisionOutput> {
		return this.client.request<PhoneProvisionOutput>("POST", "/phone/provision", input);
	}

	public get(id: string): Promise<PhoneIdentityOutput> {
		return this.client.request<PhoneIdentityOutput>("GET", `/phones/${id}`);
	}

	public list(params?: ListPhonesParams): Promise<{ items: PhoneIdentityOutput[] }> {
		if (params?.agentId) {
			return this.client.request<{ items: PhoneIdentityOutput[] }>(
				"GET",
				"/phone/numbers",
				undefined,
				{ agentId: params.agentId },
			);
		}

		return this.client.request<{ items: PhoneIdentityOutput[] }>("GET", "/phones", undefined, this.toQuery(params));
	}

	public async release(id: string): Promise<void> {
		await this.client.request<{ success: true }>("DELETE", `/phones/${id}`);
	}

	public updateConfig(id: string, input: PhoneConfigUpdateInput): Promise<PhoneIdentityOutput> {
		return this.client.request<PhoneIdentityOutput>("PATCH", `/phones/${id}`, input);
	}

	private toQuery(params?: ListPhonesParams): Record<string, string> | undefined {
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
