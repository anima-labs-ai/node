import type { RequestClient } from "../client";
import type {
	PaginatedResponse,
	AnomalyAlertOutput,
	AnomalyAlertListParams,
	AnomalyRuleOutput,
	AnomalyRuleListParams,
	CreateAnomalyRuleInput,
	UpdateAnomalyRuleInput,
	AgentBaselineOutput,
	QuarantineInput,
	QuarantineOutput,
	RequestOptions,
} from "../types";

export class AnomalyResource {
	public constructor(private readonly client: RequestClient) {}

	public listAlerts(orgId: string, params?: AnomalyAlertListParams, options?: RequestOptions): Promise<PaginatedResponse<AnomalyAlertOutput>> {
		return this.client.request<PaginatedResponse<AnomalyAlertOutput>>(
			"GET",
			`/orgs/${orgId}/anomaly/alerts`,
			undefined,
			this.toAlertQuery(params),
			options,
		);
	}

	public acknowledgeAlert(orgId: string, alertId: string, options?: RequestOptions): Promise<AnomalyAlertOutput> {
		return this.client.request<AnomalyAlertOutput>(
			"POST",
			`/orgs/${orgId}/anomaly/alerts/${alertId}/acknowledge`,
			undefined,
			undefined,
			options,
		);
	}

	public resolveAlert(orgId: string, alertId: string, options?: RequestOptions): Promise<AnomalyAlertOutput> {
		return this.client.request<AnomalyAlertOutput>(
			"POST",
			`/orgs/${orgId}/anomaly/alerts/${alertId}/resolve`,
			undefined,
			undefined,
			options,
		);
	}

	public listRules(orgId: string, params?: AnomalyRuleListParams, options?: RequestOptions): Promise<PaginatedResponse<AnomalyRuleOutput>> {
		return this.client.request<PaginatedResponse<AnomalyRuleOutput>>(
			"GET",
			`/orgs/${orgId}/anomaly/rules`,
			undefined,
			this.toRuleQuery(params),
			options,
		);
	}

	public createRule(orgId: string, input: CreateAnomalyRuleInput, options?: RequestOptions): Promise<AnomalyRuleOutput> {
		return this.client.request<AnomalyRuleOutput>(
			"POST",
			`/orgs/${orgId}/anomaly/rules`,
			input,
			undefined,
			options,
		);
	}

	public updateRule(orgId: string, ruleId: string, input: UpdateAnomalyRuleInput, options?: RequestOptions): Promise<AnomalyRuleOutput> {
		return this.client.request<AnomalyRuleOutput>(
			"PATCH",
			`/orgs/${orgId}/anomaly/rules/${ruleId}`,
			input,
			undefined,
			options,
		);
	}

	public deleteRule(orgId: string, ruleId: string, options?: RequestOptions): Promise<void> {
		return this.client.request<void>(
			"DELETE",
			`/orgs/${orgId}/anomaly/rules/${ruleId}`,
			undefined,
			undefined,
			options,
		);
	}

	public getBaseline(orgId: string, agentId: string, options?: RequestOptions): Promise<AgentBaselineOutput> {
		return this.client.request<AgentBaselineOutput>(
			"GET",
			`/orgs/${orgId}/anomaly/baselines/${agentId}`,
			undefined,
			undefined,
			options,
		);
	}

	public quarantine(orgId: string, agentId: string, input: QuarantineInput, options?: RequestOptions): Promise<QuarantineOutput> {
		return this.client.request<QuarantineOutput>(
			"POST",
			`/orgs/${orgId}/anomaly/quarantine/${agentId}`,
			input,
			undefined,
			options,
		);
	}

	public releaseQuarantine(orgId: string, agentId: string, options?: RequestOptions): Promise<QuarantineOutput> {
		return this.client.request<QuarantineOutput>(
			"POST",
			`/orgs/${orgId}/anomaly/quarantine/${agentId}/release`,
			undefined,
			undefined,
			options,
		);
	}

	private toAlertQuery(params?: AnomalyAlertListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.agentId) query.agentId = params.agentId;
		if (params.metric) query.metric = params.metric;
		if (params.severity) query.severity = params.severity;
		if (params.status) query.status = params.status;
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}

	private toRuleQuery(params?: AnomalyRuleListParams): Record<string, string> {
		const query: Record<string, string> = {};
		if (!params) return query;
		if (params.metric) query.metric = params.metric;
		if (params.enabled !== undefined) query.enabled = String(params.enabled);
		if (params.cursor) query.cursor = params.cursor;
		if (params.limit !== undefined) query.limit = String(params.limit);
		return query;
	}
}
