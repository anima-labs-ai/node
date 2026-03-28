import { AnimaClient } from "./client";
import { AddressesResource } from "./resources/addresses";
import { AgentsResource } from "./resources/agents";
import { CardsResource } from "./resources/cards";
import { DomainsResource } from "./resources/domains";
import { EmailsResource } from "./resources/emails";
import { EventsResource } from "./resources/events";
import { IdentityResource } from "./resources/identity";
import { MessagesResource } from "./resources/messages";
import { OrganizationsResource } from "./resources/organizations";
import { PhonesResource } from "./resources/phones";
import { PodsResource } from "./resources/pods";
import { RegistryResource } from "./resources/registry";
import { SecurityResource } from "./resources/security";
import { VaultResource } from "./resources/vault";
import { WalletResource } from "./resources/wallet";
import { WebhooksResource } from "./resources/webhooks";
import { A2AResource } from "./resources/a2a";
import { AuditResource } from "./resources/audit";
import { ComplianceResource } from "./resources/compliance";
import { AnomalyResource } from "./resources/anomaly";
import type { AnimaClientOptions } from "./types";
import { constructWebhookEvent, verifyWebhookSignature } from "./webhooks";

const DEFAULT_BASE_URL = "https://api.anima.com";

export class Anima {
	private readonly client: AnimaClient;

	public readonly addresses: AddressesResource;
	public readonly organizations: OrganizationsResource;
	public readonly agents: AgentsResource;
	public readonly messages: MessagesResource;
	public readonly emails: EmailsResource;
	public readonly domains: DomainsResource;
	public readonly cards: CardsResource;
	public readonly identity: IdentityResource;
	public readonly phones: PhonesResource;
	public readonly pods: PodsResource;
	public readonly registry: RegistryResource;
	public readonly webhooks: WebhooksResource;
	public readonly security: SecurityResource;
	public readonly vault: VaultResource;
	public readonly wallet: WalletResource;
	public readonly events: EventsResource;
	public readonly a2a: A2AResource;
	public readonly audit: AuditResource;
	public readonly compliance: ComplianceResource;
	public readonly anomaly: AnomalyResource;

	public static readonly webhooks = {
		verify: verifyWebhookSignature,
		constructEvent: constructWebhookEvent,
	};

	public constructor(options: AnimaClientOptions) {
		this.client = new AnimaClient(options);

		const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

		this.addresses = new AddressesResource(this.client);
		this.organizations = new OrganizationsResource(this.client);
		this.agents = new AgentsResource(this.client);
		this.messages = new MessagesResource(this.client);
		this.emails = new EmailsResource(this.client);
		this.domains = new DomainsResource(this.client);
		this.cards = new CardsResource(this.client);
		this.identity = new IdentityResource(this.client);
		this.phones = new PhonesResource(this.client);
		this.pods = new PodsResource(this.client);
		this.registry = new RegistryResource(this.client);
		this.webhooks = new WebhooksResource(this.client);
		this.security = new SecurityResource(this.client);
		this.vault = new VaultResource(this.client);
		this.wallet = new WalletResource(this.client);
		this.events = new EventsResource(options.apiKey, baseUrl);
		this.a2a = new A2AResource(this.client);
		this.audit = new AuditResource(this.client);
		this.compliance = new ComplianceResource(this.client);
		this.anomaly = new AnomalyResource(this.client);
	}
}

export { AnimaClient } from "./client";
export {
	AnimaError,
	APIError,
	AuthError,
	ConflictError,
	InternalServerError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "./errors";
export { AnimaEventStream, EventsResource } from "./resources/events";
export * from "./types";
