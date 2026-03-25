import type { RequestClient } from "../client";
import type {
	PaginatedResponse,
	SecurityEventOutput,
	SecurityEventsListParams,
	SecurityScanInput,
	SecurityScanOutput,
} from "../types";

export class SecurityResource {
	public constructor(private readonly client: RequestClient) {}

	public scanContent(input: SecurityScanInput): Promise<SecurityScanOutput> {
		return this.client.request<SecurityScanOutput>("POST", "/security/scan", input);
	}

	public listEvents(params: SecurityEventsListParams): Promise<PaginatedResponse<SecurityEventOutput>> {
		return this.client.request<PaginatedResponse<SecurityEventOutput>>(
			"GET",
			`/v1/orgs/${params.orgId}/security/events`,
			undefined,
			this.toQuery(params),
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
