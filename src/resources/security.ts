import type { RequestClient } from "../client";
import type {
	PaginatedResponse,
	RequestOptions,
	SecurityEventOutput,
	SecurityEventsListParams,
	SecurityScanInput,
	SecurityScanOutput,
} from "../types";

export class SecurityResource {
	public constructor(private readonly client: RequestClient) {}

	public scanContent(input: SecurityScanInput, options?: RequestOptions): Promise<SecurityScanOutput> {
		return this.client.request<SecurityScanOutput>("POST", "/security/scan", input, undefined, options);
	}

	public listEvents(params: SecurityEventsListParams, options?: RequestOptions): Promise<PaginatedResponse<SecurityEventOutput>> {
		return this.client.request<PaginatedResponse<SecurityEventOutput>>(
			"GET",
			`/orgs/${params.orgId}/security/events`,
			undefined,
			this.toQuery(params),
			options,
		);
	}

	private toQuery(params: SecurityEventsListParams): Record<string, string> {
		const query: Record<string, string> = { orgId: params.orgId };
		if (params.agentId) query.agentId = params.agentId;
		if (params.type) query.type = params.type;
		if (params.severity) query.severity = params.severity;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}
}
