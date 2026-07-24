import type { RequestClient } from "../client";
import type { ListVoicesParams, RequestOptions, Voice } from "../types";

export class VoicesResource {
	public constructor(private readonly client: RequestClient) {}

	public list(params?: ListVoicesParams, options?: RequestOptions): Promise<{ voices: Voice[] }> {
		return this.client.request<{ voices: Voice[] }>(
			"GET",
			"/voice/catalog",
			undefined,
			this.toQuery(params),
			options,
		);
	}

	private toQuery(params?: ListVoicesParams): Record<string, string> | undefined {
		if (!params) return undefined;
		const query: Record<string, string> = {};
		if (params.gender) query.gender = params.gender;
		if (params.language) query.language = params.language;
		return Object.keys(query).length > 0 ? query : undefined;
	}
}
