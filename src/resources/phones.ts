import type { RequestClient } from "../client";
import type {
	AvailableNumber,
	ListPhonesParams,
	PhoneIdentityOutput,
	PhoneProvisionOutput,
	ProvisionPhoneInput,
	ReleasePhoneInput,
	SearchPhonesParams,
} from "../types";

export class PhonesResource {
	public constructor(private readonly client: RequestClient) {}

	public search(
		params?: SearchPhonesParams,
	): Promise<{ items: AvailableNumber[] }> {
		return this.client.request<{ items: AvailableNumber[] }>(
			"GET",
			"/phone/search",
			undefined,
			this.toSearchQuery(params),
		);
	}

	public provision(input: ProvisionPhoneInput): Promise<PhoneProvisionOutput> {
		return this.client.request<PhoneProvisionOutput>("POST", "/phone/provision", input);
	}

	public release(input: ReleasePhoneInput): Promise<{ success: true }> {
		return this.client.request<{ success: true }>("POST", "/phone/release", input);
	}

	public list(params: ListPhonesParams): Promise<{ items: PhoneIdentityOutput[] }> {
		return this.client.request<{ items: PhoneIdentityOutput[] }>(
			"GET",
			"/phone/numbers",
			undefined,
			{ agentId: params.agentId },
		);
	}

	private toSearchQuery(params?: SearchPhonesParams): Record<string, string | string[]> | undefined {
		if (!params) return undefined;
		const query: Record<string, string | string[]> = {};
		if (params.countryCode) query.countryCode = params.countryCode;
		if (params.areaCode) query.areaCode = params.areaCode;
		if (params.capabilities) query["capabilities[]"] = params.capabilities;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return Object.keys(query).length > 0 ? query : undefined;
	}

}
