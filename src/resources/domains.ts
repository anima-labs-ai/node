import type { RequestClient } from "../client";
import type {
	AddDomainInput,
	DeliverabilityStatsOutput,
	DomainDnsRecordsOutput,
	DomainOutput,
	DomainZoneFileOutput,
	RequestOptions,
	UpdateDomainInput,
} from "../types";

export class DomainsResource {
	public constructor(private readonly client: RequestClient) {}

	public add(
		input: AddDomainInput,
		options?: RequestOptions,
	): Promise<DomainOutput> {
		return this.client.request<DomainOutput>(
			"POST",
			"/domains",
			input,
			undefined,
			options,
		);
	}

	public get(id: string, options?: RequestOptions): Promise<DomainOutput> {
		return this.client.request<DomainOutput>(
			"GET",
			`/domains/${id}`,
			undefined,
			undefined,
			options,
		);
	}

	public list(options?: RequestOptions): Promise<{ items: DomainOutput[] }> {
		return this.client.request<{ items: DomainOutput[] }>(
			"GET",
			"/domains",
			undefined,
			undefined,
			options,
		);
	}

	public async delete(id: string, options?: RequestOptions): Promise<void> {
		await this.client.request<void>(
			"DELETE",
			`/domains/${id}`,
			undefined,
			undefined,
			options,
		);
	}

	public update(
		id: string,
		input: UpdateDomainInput,
		options?: RequestOptions,
	): Promise<DomainOutput> {
		return this.client.request<DomainOutput>(
			"PATCH",
			`/domains/${id}`,
			input,
			undefined,
			options,
		);
	}

	public verify(id: string, options?: RequestOptions): Promise<DomainOutput> {
		return this.client.request<DomainOutput>(
			"POST",
			`/domains/${id}/verify`,
			{ id, domainId: id },
			undefined,
			options,
		);
	}

	public dnsRecords(
		id: string,
		options?: RequestOptions,
	): Promise<DomainDnsRecordsOutput> {
		return this.client.request<DomainDnsRecordsOutput>(
			"GET",
			`/domains/${id}/dns-records`,
			undefined,
			undefined,
			options,
		);
	}

	public deliverability(
		id: string,
		options?: RequestOptions,
	): Promise<DeliverabilityStatsOutput> {
		return this.client.request<DeliverabilityStatsOutput>(
			"GET",
			`/domains/${id}/deliverability`,
			undefined,
			undefined,
			options,
		);
	}

	public zoneFile(
		id: string,
		options?: RequestOptions,
	): Promise<DomainZoneFileOutput> {
		return this.client.request<DomainZoneFileOutput>(
			"GET",
			`/domains/${id}/zone-file`,
			undefined,
			undefined,
			options,
		);
	}
}
