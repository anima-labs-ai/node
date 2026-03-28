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
} from "../types";

export class ComplianceResource {
	public constructor(private readonly client: RequestClient) {}

	public listControls(orgId: string, params?: ComplianceControlListParams): Promise<PaginatedResponse<ComplianceControlOutput>> {
		return this.client.request<PaginatedResponse<ComplianceControlOutput>>(
			"GET",
			`/v1/orgs/${orgId}/compliance/controls`,
			undefined,
			this.toControlQuery(params),
		);
	}

	public getControl(orgId: string, controlId: string): Promise<ComplianceControlOutput> {
		return this.client.request<ComplianceControlOutput>(
			"GET",
			`/v1/orgs/${orgId}/compliance/controls/${controlId}`,
		);
	}

	public updateControlStatus(orgId: string, controlId: string, input: ComplianceControlStatusInput): Promise<ComplianceControlOutput> {
		return this.client.request<ComplianceControlOutput>(
			"PATCH",
			`/v1/orgs/${orgId}/compliance/controls/${controlId}`,
			input,
		);
	}

	public seedFramework(orgId: string, input: SeedFrameworkInput): Promise<SeedFrameworkOutput> {
		return this.client.request<SeedFrameworkOutput>(
			"POST",
			`/v1/orgs/${orgId}/compliance/seed`,
			input,
		);
	}

	public generateReport(orgId: string, input: GenerateReportInput): Promise<ComplianceReportOutput> {
		return this.client.request<ComplianceReportOutput>(
			"POST",
			`/v1/orgs/${orgId}/compliance/reports`,
			input,
		);
	}

	public listReports(orgId: string, params?: ComplianceReportListParams): Promise<PaginatedResponse<ComplianceReportOutput>> {
		return this.client.request<PaginatedResponse<ComplianceReportOutput>>(
			"GET",
			`/v1/orgs/${orgId}/compliance/reports`,
			undefined,
			this.toReportQuery(params),
		);
	}

	public getReport(orgId: string, reportId: string): Promise<ComplianceReportOutput> {
		return this.client.request<ComplianceReportOutput>(
			"GET",
			`/v1/orgs/${orgId}/compliance/reports/${reportId}`,
		);
	}

	public downloadReport(orgId: string, reportId: string): Promise<ComplianceReportDownloadOutput> {
		return this.client.request<ComplianceReportDownloadOutput>(
			"GET",
			`/v1/orgs/${orgId}/compliance/reports/${reportId}/download`,
		);
	}

	public getDashboard(orgId: string): Promise<ComplianceDashboardOutput> {
		return this.client.request<ComplianceDashboardOutput>(
			"GET",
			`/v1/orgs/${orgId}/compliance/dashboard`,
		);
	}

	public createDsar(orgId: string, input: CreateDsarInput): Promise<DsarOutput> {
		return this.client.request<DsarOutput>(
			"POST",
			`/v1/orgs/${orgId}/compliance/dsars`,
			input,
		);
	}

	public listDsars(orgId: string, params?: DsarListParams): Promise<PaginatedResponse<DsarOutput>> {
		return this.client.request<PaginatedResponse<DsarOutput>>(
			"GET",
			`/v1/orgs/${orgId}/compliance/dsars`,
			undefined,
			this.toDsarQuery(params),
		);
	}

	public completeDsar(orgId: string, dsarId: string, input?: CompleteDsarInput): Promise<DsarOutput> {
		return this.client.request<DsarOutput>(
			"POST",
			`/v1/orgs/${orgId}/compliance/dsars/${dsarId}/complete`,
			input,
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
