import { AnimaClient } from "./client";
import { AgentsResource } from "./resources/agents";
import { CardsResource } from "./resources/cards";
import { DomainsResource } from "./resources/domains";
import { EmailsResource } from "./resources/emails";
import { MessagesResource } from "./resources/messages";
import { OrganizationsResource } from "./resources/organizations";
import { PhonesResource } from "./resources/phones";
import { SecurityResource } from "./resources/security";
import { VaultResource } from "./resources/vault";
import { WebhooksResource } from "./resources/webhooks";
import type { AnimaClientOptions } from "./types";
import { constructWebhookEvent, verifyWebhookSignature } from "./webhooks";

export class Anima {
	private readonly client: AnimaClient;

	public readonly organizations: OrganizationsResource;
	public readonly agents: AgentsResource;
	public readonly messages: MessagesResource;
	public readonly emails: EmailsResource;
	public readonly domains: DomainsResource;
	public readonly cards: CardsResource;
	public readonly phones: PhonesResource;
	public readonly webhooks: WebhooksResource;
	public readonly security: SecurityResource;
	public readonly vault: VaultResource;

	public static readonly webhooks = {
		verify: verifyWebhookSignature,
		constructEvent: constructWebhookEvent,
	};

	public constructor(options: AnimaClientOptions) {
		this.client = new AnimaClient(options);

		this.organizations = new OrganizationsResource(this.client);
		this.agents = new AgentsResource(this.client);
		this.messages = new MessagesResource(this.client);
		this.emails = new EmailsResource(this.client);
		this.domains = new DomainsResource(this.client);
		this.cards = new CardsResource(this.client);
		this.phones = new PhonesResource(this.client);
		this.webhooks = new WebhooksResource(this.client);
		this.security = new SecurityResource(this.client);
		this.vault = new VaultResource(this.client);
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
export * from "./types";
