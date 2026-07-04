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
	ComplianceReportDownloadOutput,
	ComplianceDashboardOutput,
	DsarOutput,
	CreateDsarInput,
	DsarListParams,
	CompleteDsarInput,
	RequestOptions,
} from "../types";

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

	public downloadReport(orgId: string, reportId: string, options?: RequestOptions): Promise<ComplianceReportDownloadOutput> {
		return this.client.request<ComplianceReportDownloadOutput>(
			"GET",
			`/orgs/${orgId}/compliance/reports/${reportId}/download`,
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

	public completeDsar(orgId: string, dsarId: string, input?: CompleteDsarInput, options?: RequestOptions): Promise<DsarOutput> {
		return this.client.request<DsarOutput>(
			"POST",
			`/orgs/${orgId}/compliance/dsars/${dsarId}/complete`,
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
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}

	private toDsarQuery(params?: DsarListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.status) query.status = params.status;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}
}
