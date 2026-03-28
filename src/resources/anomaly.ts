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
} from "../types";

export class AnomalyResource {
	public constructor(private readonly client: RequestClient) {}

	public listAlerts(orgId: string, params?: AnomalyAlertListParams): Promise<PaginatedResponse<AnomalyAlertOutput>> {
		return this.client.request<PaginatedResponse<AnomalyAlertOutput>>(
			"GET",
			`/v1/orgs/${orgId}/anomaly/alerts`,
			undefined,
			this.toAlertQuery(params),
		);
	}

	public acknowledgeAlert(orgId: string, alertId: string): Promise<AnomalyAlertOutput> {
		return this.client.request<AnomalyAlertOutput>(
			"POST",
			`/v1/orgs/${orgId}/anomaly/alerts/${alertId}/acknowledge`,
		);
	}

	public resolveAlert(orgId: string, alertId: string): Promise<AnomalyAlertOutput> {
		return this.client.request<AnomalyAlertOutput>(
			"POST",
			`/v1/orgs/${orgId}/anomaly/alerts/${alertId}/resolve`,
		);
	}

	public listRules(orgId: string, params?: AnomalyRuleListParams): Promise<PaginatedResponse<AnomalyRuleOutput>> {
		return this.client.request<PaginatedResponse<AnomalyRuleOutput>>(
			"GET",
			`/v1/orgs/${orgId}/anomaly/rules`,
			undefined,
			this.toRuleQuery(params),
		);
	}

	public createRule(orgId: string, input: CreateAnomalyRuleInput): Promise<AnomalyRuleOutput> {
		return this.client.request<AnomalyRuleOutput>(
			"POST",
			`/v1/orgs/${orgId}/anomaly/rules`,
			input,
		);
	}

	public updateRule(orgId: string, ruleId: string, input: UpdateAnomalyRuleInput): Promise<AnomalyRuleOutput> {
		return this.client.request<AnomalyRuleOutput>(
			"PATCH",
			`/v1/orgs/${orgId}/anomaly/rules/${ruleId}`,
			input,
		);
	}

	public deleteRule(orgId: string, ruleId: string): Promise<void> {
		return this.client.request<void>(
			"DELETE",
			`/v1/orgs/${orgId}/anomaly/rules/${ruleId}`,
		);
	}

	public getBaseline(orgId: string, agentId: string): Promise<AgentBaselineOutput> {
		return this.client.request<AgentBaselineOutput>(
			"GET",
			`/v1/orgs/${orgId}/anomaly/baselines/${agentId}`,
		);
	}

	public quarantine(orgId: string, agentId: string, input: QuarantineInput): Promise<QuarantineOutput> {
		return this.client.request<QuarantineOutput>(
			"POST",
			`/v1/orgs/${orgId}/anomaly/quarantine/${agentId}`,
			input,
		);
	}

	public releaseQuarantine(orgId: string, agentId: string): Promise<QuarantineOutput> {
		return this.client.request<QuarantineOutput>(
			"POST",
			`/v1/orgs/${orgId}/anomaly/quarantine/${agentId}/release`,
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
