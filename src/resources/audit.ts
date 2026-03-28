import type { RequestClient } from "../client";
import type {
	PaginatedResponse,
	AuditLogOutput,
	AuditLogListParams,
	AuditLogExportParams,
	AuditLogExportOutput,
} from "../types";

export class AuditResource {
	public constructor(private readonly client: RequestClient) {}

	public list(orgId: string, params?: AuditLogListParams): Promise<PaginatedResponse<AuditLogOutput>> {
		return this.client.request<PaginatedResponse<AuditLogOutput>>(
			"GET",
			`/v1/orgs/${orgId}/audit/logs`,
			undefined,
			this.toQuery(params),
		);
	}

	public get(orgId: string, logId: string): Promise<AuditLogOutput> {
		return this.client.request<AuditLogOutput>("GET", `/v1/orgs/${orgId}/audit/logs/${logId}`);
	}

	public export(orgId: string, params?: AuditLogExportParams): Promise<AuditLogExportOutput> {
		return this.client.request<AuditLogExportOutput>(
			"POST",
			`/v1/orgs/${orgId}/audit/export`,
			params,
		);
	}

	private toQuery(params?: AuditLogListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.actorId) query.actorId = params.actorId;
		if (params.actorType) query.actorType = params.actorType;
		if (params.action) query.action = params.action;
		if (params.resourceType) query.resourceType = params.resourceType;
		if (params.resourceId) query.resourceId = params.resourceId;
		if (params.result) query.result = params.result;
		if (params.from) query.from = params.from;
		if (params.to) query.to = params.to;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}
}
