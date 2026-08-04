import type { RequestClient } from "../client";
import type {
	PaginatedResponse,
	RequestOptions,
	ScannerStatusOutput,
	SecurityEventOutput,
	SecurityEventsListParams,
} from "../types";

export class SecurityResource {
	public constructor(private readonly client: RequestClient) {}

	// No `scanContent`. It POSTed to /security/scan, which the API has never
	// served — content scanning happens inside the send paths, not as a
	// callable endpoint. The security surface the API does expose is the event
	// feed and the scanner status below.

	public getScannerStatus(
		orgId: string,
		options?: RequestOptions,
	): Promise<ScannerStatusOutput> {
		return this.client.request<ScannerStatusOutput>(
			"GET",
			`/orgs/${orgId}/security/scanner-status`,
			undefined,
			undefined,
			options,
		);
	}

	public listEvents(
		params: SecurityEventsListParams,
		options?: RequestOptions,
	): Promise<PaginatedResponse<SecurityEventOutput>> {
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
