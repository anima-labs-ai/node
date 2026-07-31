import type { RequestClient } from "../client";
import type {
	PaginatedResponse,
	ComplianceControlOutput,
	ComplianceControlListParams,
	ComplianceControlStatusInput,
	SeedFrameworkInput,
	SeedFrameworkOutput,
	ComplianceReportOutput,
	GenerateReportInput,
	ComplianceReportListParams,
	ExportReportInput,
	ExportReportOutput,
	ListTemplatesOutput,
	ComplianceDashboardOutput,
	DsarOutput,
	CreateDsarInput,
	DsarListParams,
	UpdateDsarStatusInput,
	RequestOptions,
} from "../types";

/**
 * Compliance controls, reports, and data-subject requests.
 *
 * Every route here is org-scoped, so `orgId` is the first argument rather than
 * a body field, and all of them require a master key (`mk_*`).
 */
export class ComplianceResource {
	public constructor(private readonly client: RequestClient) {}

	public listControls(orgId: string, params?: ComplianceControlListParams, options?: RequestOptions): Promise<PaginatedResponse<ComplianceControlOutput>> {
		return this.client.request<PaginatedResponse<ComplianceControlOutput>>(
			"GET",
			`/orgs/${orgId}/compliance/controls`,
			undefined,
			this.toControlQuery(params),
			options,
		);
	}

	public getControl(orgId: string, controlId: string, options?: RequestOptions): Promise<ComplianceControlOutput> {
		return this.client.request<ComplianceControlOutput>(
			"GET",
			`/orgs/${orgId}/compliance/controls/${controlId}`,
			undefined,
			undefined,
			options,
		);
	}

	public updateControlStatus(orgId: string, controlId: string, input: ComplianceControlStatusInput, options?: RequestOptions): Promise<ComplianceControlOutput> {
		return this.client.request<ComplianceControlOutput>(
			"PATCH",
			`/orgs/${orgId}/compliance/controls/${controlId}`,
			input,
			undefined,
			options,
		);
	}

	public seedFramework(orgId: string, input: SeedFrameworkInput, options?: RequestOptions): Promise<SeedFrameworkOutput> {
		return this.client.request<SeedFrameworkOutput>(
			"POST",
			`/orgs/${orgId}/compliance/seed`,
			input,
			undefined,
			options,
		);
	}

	public listTemplates(orgId: string, options?: RequestOptions): Promise<ListTemplatesOutput> {
		return this.client.request<ListTemplatesOutput>(
			"GET",
			`/orgs/${orgId}/compliance/templates`,
			undefined,
			undefined,
			options,
		);
	}

	public generateReport(orgId: string, input: GenerateReportInput, options?: RequestOptions): Promise<ComplianceReportOutput> {
		return this.client.request<ComplianceReportOutput>(
			"POST",
			`/orgs/${orgId}/compliance/reports`,
			input,
			undefined,
			options,
		);
	}

	public listReports(orgId: string, params?: ComplianceReportListParams, options?: RequestOptions): Promise<PaginatedResponse<ComplianceReportOutput>> {
		return this.client.request<PaginatedResponse<ComplianceReportOutput>>(
			"GET",
			`/orgs/${orgId}/compliance/reports`,
			undefined,
			this.toReportQuery(params),
			options,
		);
	}

	public getReport(orgId: string, reportId: string, options?: RequestOptions): Promise<ComplianceReportOutput> {
		return this.client.request<ComplianceReportOutput>(
			"GET",
			`/orgs/${orgId}/compliance/reports/${reportId}`,
			undefined,
			undefined,
			options,
		);
	}

	/**
	 * Export a generated report. The bytes come back inline as
	 * `{ data, contentType, filename }` — there is no signed download URL.
	 *
	 * Replaces `downloadReport`, which issued a GET to a `/download` sub-path
	 * that the API does not serve.
	 */
	public exportReport(orgId: string, reportId: string, input?: ExportReportInput, options?: RequestOptions): Promise<ExportReportOutput> {
		return this.client.request<ExportReportOutput>(
			"POST",
			`/orgs/${orgId}/compliance/reports/${reportId}/export`,
			input ?? {},
			undefined,
			options,
		);
	}

	public deleteReport(orgId: string, reportId: string, options?: RequestOptions): Promise<void> {
		return this.client.request<void>(
			"DELETE",
			`/orgs/${orgId}/compliance/reports/${reportId}`,
			undefined,
			undefined,
			options,
		);
	}

	public getDashboard(orgId: string, options?: RequestOptions): Promise<ComplianceDashboardOutput> {
		return this.client.request<ComplianceDashboardOutput>(
			"GET",
			`/orgs/${orgId}/compliance/dashboard`,
			undefined,
			undefined,
			options,
		);
	}

	public createDsar(orgId: string, input: CreateDsarInput, options?: RequestOptions): Promise<DsarOutput> {
		return this.client.request<DsarOutput>(
			"POST",
			`/orgs/${orgId}/compliance/dsars`,
			input,
			undefined,
			options,
		);
	}

	public listDsars(orgId: string, params?: DsarListParams, options?: RequestOptions): Promise<PaginatedResponse<DsarOutput>> {
		return this.client.request<PaginatedResponse<DsarOutput>>(
			"GET",
			`/orgs/${orgId}/compliance/dsars`,
			undefined,
			this.toDsarQuery(params),
			options,
		);
	}

	public getDsar(orgId: string, dsarId: string, options?: RequestOptions): Promise<DsarOutput> {
		return this.client.request<DsarOutput>(
			"GET",
			`/orgs/${orgId}/compliance/dsars/${dsarId}`,
			undefined,
			undefined,
			options,
		);
	}

	/**
	 * Move a DSAR along its lifecycle.
	 *
	 * Replaces `completeDsar`, which POSTed to a `/complete` sub-path that does
	 * not exist. The API models this as a PATCH carrying the new status.
	 */
	public updateDsarStatus(orgId: string, dsarId: string, input: UpdateDsarStatusInput, options?: RequestOptions): Promise<DsarOutput> {
		return this.client.request<DsarOutput>(
			"PATCH",
			`/orgs/${orgId}/compliance/dsars/${dsarId}`,
			input,
			undefined,
			options,
		);
	}

	private toControlQuery(params?: ComplianceControlListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.framework) query.framework = params.framework;
		if (params.category) query.category = params.category;
		if (params.status) query.status = params.status;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}

	private toReportQuery(params?: ComplianceReportListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.type) query.type = params.type;
		if (params.status) query.status = params.status;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}

	private toDsarQuery(params?: DsarListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.status) query.status = params.status;
		if (params.type) query.type = params.type;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}
}
