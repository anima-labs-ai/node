import type { RequestClient } from "../client";
import type {
	AddDomainInput,
	DeliverabilityStatsOutput,
	DomainDnsRecordsOutput,
	DomainOutput,
	DomainZoneFileOutput,
	UpdateDomainInput,
} from "../types";

export class DomainsResource {
	public constructor(private readonly client: RequestClient) {}

	public add(input: AddDomainInput): Promise<DomainOutput> {
		return this.client.request<DomainOutput>("POST", "/domains", input);
	}

	public get(id: string): Promise<DomainOutput> {
		return this.client.request<DomainOutput>("GET", `/domains/${id}`);
	}

	public list(): Promise<{ items: DomainOutput[] }> {
		return this.client.request<{ items: DomainOutput[] }>("GET", "/domains");
	}

	public async delete(id: string): Promise<void> {
		await this.client.request<void>("DELETE", `/domains/${id}`);
	}

	public update(id: string, input: UpdateDomainInput): Promise<DomainOutput> {
		return this.client.request<DomainOutput>("PATCH", `/domains/${id}`, input);
	}

	public verify(id: string): Promise<DomainOutput> {
		return this.client.request<DomainOutput>("POST", `/domains/${id}/verify`, { id, domainId: id });
	}

	public dnsRecords(id: string): Promise<DomainDnsRecordsOutput> {
		return this.client.request<DomainDnsRecordsOutput>("GET", `/domains/${id}/dns-records`);
	}

	public deliverability(id: string): Promise<DeliverabilityStatsOutput> {
		return this.client.request<DeliverabilityStatsOutput>("GET", `/domains/${id}/deliverability`);
	}

	public zoneFile(id: string): Promise<DomainZoneFileOutput> {
		return this.client.request<DomainZoneFileOutput>("GET", `/domains/${id}/zone-file`);
	}
}
