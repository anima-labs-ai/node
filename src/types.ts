export interface AnimaClientOptions {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	maxRetries?: number;
}

export interface CursorPagination {
	nextCursor: string | null;
	hasMore: boolean;
}

export interface PaginatedResponse<T> {
	items: T[];
	pagination: CursorPagination;
}

export interface PaginationInput {
	cursor?: string;
	limit?: number;
}

export interface DateRange {
	from?: string;
	to?: string;
}

export type Tier = "FREE" | "DEVELOPER" | "GROWTH" | "SCALE" | "ENTERPRISE";
export type AgentStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type PhoneProvider = "TELNYX" | "TWILIO";
export type TenDlcStatus = "PENDING" | "REGISTERED" | "REJECTED" | "NOT_REQUIRED";

export interface CreateOrganizationInput {
	name: string;
	slug: string;
	clerkOrgId?: string;
	tier?: Tier;
	settings?: Record<string, unknown>;
}

export interface UpdateOrganizationInput {
	name?: string;
	slug?: string;
	clerkOrgId?: string | null;
	tier?: Tier;
	settings?: Record<string, unknown>;
}

export interface OrganizationOutput {
	id: string;
	name: string;
	slug: string;
	clerkOrgId: string | null;
	tier: Tier;
	masterKey: string;
	settings: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface OrganizationListParams extends PaginationInput {
	query?: string;
}

export interface EmailIdentityOutput {
	id: string;
	email: string;
	domain: string;
	localPart: string;
	isPrimary: boolean;
	verified: boolean;
	createdAt: string;
}

export interface PhoneCapabilities {
	sms: boolean;
	mms: boolean;
	voice: boolean;
}

export interface PhoneIdentityOutput {
	id: string;
	phoneNumber: string;
	provider: PhoneProvider;
	providerId: string | null;
	capabilities: PhoneCapabilities;
	tenDlcStatus: TenDlcStatus;
	isPrimary: boolean;
	createdAt: string;
}

export interface CreateAgentInput {
	orgId: string;
	name: string;
	slug: string;
	email?: string;
	provisionPhone?: boolean;
	metadata?: Record<string, unknown>;
}

export interface UpdateAgentInput {
	name?: string;
	slug?: string;
	status?: AgentStatus;
	metadata?: Record<string, unknown>;
}

export interface AgentOutput {
	id: string;
	orgId: string;
	name: string;
	slug: string;
	status: AgentStatus;
	apiKeyPrefix: string | null;
	metadata: Record<string, unknown>;
	emailIdentities: EmailIdentityOutput[];
	phoneIdentities: PhoneIdentityOutput[];
	createdAt: string;
	updatedAt: string;
}

export interface AgentListParams extends PaginationInput {
	orgId?: string;
	status?: AgentStatus;
	query?: string;
}

export type MessageChannel = "EMAIL" | "SMS" | "MMS" | "VOICE";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageStatus =
	| "QUEUED"
	| "SENT"
	| "DELIVERED"
	| "FAILED"
	| "BOUNCED"
	| "BLOCKED"
	| "PENDING_APPROVAL";

export interface SendEmailInput {
	agentId: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
	bodyHtml?: string;
	headers?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface SendSmsInput {
	agentId: string;
	to: string;
	body: string;
	mediaUrls?: string[];
	metadata?: Record<string, unknown>;
}

export interface AttachmentOutput {
	id: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	storageKey: string;
	url: string | null;
	createdAt: string;
}

export interface MessageOutput {
	id: string;
	agentId: string;
	channel: MessageChannel;
	direction: MessageDirection;
	status: MessageStatus;
	fromAddress: string;
	toAddress: string;
	subject: string | null;
	body: string;
	bodyHtml: string | null;
	headers: Record<string, unknown> | null;
	metadata: Record<string, unknown> | null;
	threadId: string | null;
	inReplyTo: string | null;
	externalId: string | null;
	sentAt: string | null;
	receivedAt: string | null;
	attachments: AttachmentOutput[];
	createdAt: string;
	updatedAt: string;
}

export interface MessageListParams extends PaginationInput {
	agentId?: string;
	threadId?: string;
	channel?: MessageChannel;
	direction?: MessageDirection;
	dateRange?: DateRange;
}

export interface MessageSearchFilters {
	agentId?: string;
	channel?: MessageChannel;
	direction?: MessageDirection;
	status?: MessageStatus;
	dateRange?: DateRange;
}

export interface MessageSearchParams {
	filters?: MessageSearchFilters;
	pagination?: PaginationInput;
}

export interface UploadAttachmentInput {
	filename: string;
	mimeType: string;
	sizeBytes: number;
}

export interface AttachmentDownloadOutput {
	url: string;
	expiresAt: string;
}

export interface EmailListParams extends PaginationInput {
	agentId?: string;
}

export interface AddDomainInput {
	domain: string;
}

export interface UpdateDomainInput {
	feedbackEnabled?: boolean;
}

export type VerificationMethod = "DNS_TXT" | "DNS_CNAME";

export type DomainStatus =
	| "NOT_STARTED"
	| "PENDING"
	| "VERIFYING"
	| "VERIFIED"
	| "INVALID"
	| "FAILED";

export type DomainRecordStatus = "MISSING" | "INVALID" | "VALID";

export interface DomainStatusRecord {
	type: string;
	name: string;
	value: string;
	priority?: number;
	status: DomainRecordStatus;
}

export interface DomainOutput {
	id: string;
	domain: string;
	status: DomainStatus;
	verified: boolean;
	verificationCooldownUntil: string | null;
	verificationToken: string;
	verificationMethod: VerificationMethod;
	dkimSelector: string | null;
	dkimPublicKey: string | null;
	spfConfigured: boolean;
	dmarcConfigured: boolean;
	mxConfigured: boolean;
	feedbackEnabled: boolean;
	records: DomainStatusRecord[] | null;
	createdAt: string;
}

export interface DomainDnsRecord {
	name: string;
	value: string;
}

export interface DomainZoneFileOutput {
	zoneFile: string;
}

export interface DomainDnsRecordsOutput {
	txt: DomainDnsRecord;
	mailFrom: {
		name: string;
		mx: DomainDnsRecord & { priority: number };
		spf: string;
	};
	dkim: DomainDnsRecord[];
	mx: DomainDnsRecord & { priority: number };
	spf: string;
	dmarc: string;
}

export interface DeliverabilityStatsOutput {
	domain: string;
	sent: number;
	delivered: number;
	bounced: number;
	complained: number;
	bounceRate: number;
	complaintRate: number;
	isHealthy: boolean;
}

export interface ProvisionPhoneInput {
	agentId: string;
	countryCode?: string;
	areaCode?: string;
	capabilities?: Array<"sms" | "mms" | "voice">;
}

export interface PhoneConfigUpdateInput {
	isPrimary?: boolean;
	tenDlcStatus?: TenDlcStatus;
	metadata?: Record<string, unknown>;
}

export interface ListPhonesParams extends PaginationInput {
	agentId?: string;
}

export interface PhoneProvisionOutput {
	id: string;
	phoneNumber: string;
	provider: PhoneProvider;
	providerId: string | null;
	capabilities: PhoneCapabilities;
	tenDlcStatus: TenDlcStatus;
	isPrimary: boolean;
	createdAt: string;
}

export type CredentialType = "login" | "secure_note" | "card" | "identity";

export interface ProvisionVaultInput {
	agentId: string;
}

export interface DeprovisionVaultInput {
	agentId: string;
}

export interface VaultIdentityOutput {
	id: string;
	agentId: string;
	orgId: string;
	status: string;
	credentialCount: number;
	lastSyncAt: string | null;
	createdAt: string;
}

export interface VaultLoginData {
	username?: string;
	password?: string;
	uris?: Array<{ uri: string; match?: string }>;
	totp?: string;
}

export interface VaultCardData {
	cardholderName?: string;
	brand?: string;
	number?: string;
	expMonth?: string;
	expYear?: string;
	code?: string;
}

export interface VaultIdentityData {
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	address1?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	country?: string;
	company?: string;
}

export interface VaultCustomField {
	name: string;
	value: string;
	type: "text" | "hidden" | "boolean";
}

export interface VaultCredential {
	id: string;
	type: CredentialType;
	name: string;
	notes?: string;
	login?: VaultLoginData;
	card?: VaultCardData;
	identity?: VaultIdentityData;
	fields?: VaultCustomField[];
	favorite: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateVaultCredentialInput {
	agentId: string;
	type: CredentialType;
	name: string;
	notes?: string;
	login?: VaultLoginData;
	card?: VaultCardData;
	identity?: VaultIdentityData;
	fields?: VaultCustomField[];
	favorite?: boolean;
}

export interface UpdateVaultCredentialInput {
	name?: string;
	notes?: string;
	login?: VaultLoginData;
	card?: VaultCardData;
	identity?: VaultIdentityData;
	fields?: VaultCustomField[];
	favorite?: boolean;
}

export interface ListVaultCredentialsParams {
	agentId: string;
	type?: CredentialType;
}

export interface SearchVaultParams {
	agentId: string;
	search: string;
	type?: CredentialType;
}

export interface GeneratePasswordInput {
	length?: number;
	uppercase?: boolean;
	lowercase?: boolean;
	number?: boolean;
	special?: boolean;
}

export interface VaultTotpOutput {
	code: string;
	period: number;
}

export interface VaultStatusOutput {
	serverUrl: string;
	lastSync: string | null;
	status: string;
}

export type WebhookEventType =
	| "message.received"
	| "message.sent"
	| "message.failed"
	| "message.bounced"
	| "agent.created"
	| "agent.updated"
	| "agent.deleted"
	| "phone.provisioned"
	| "phone.released";

export interface CreateWebhookInput {
	url: string;
	events: WebhookEventType[];
	description?: string;
	active?: boolean;
}

export interface UpdateWebhookInput {
	url?: string;
	events?: WebhookEventType[];
	description?: string;
	active?: boolean;
}

export interface WebhookOutput {
	id: string;
	orgId: string;
	url: string;
	events: WebhookEventType[];
	active: boolean;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface WebhookListParams extends PaginationInput {}

export interface WebhookTestOutput {
	success: true;
	deliveryId: string;
}

export interface WebhookDeliveryOutput {
	id: string;
	webhookId: string;
	messageId: string | null;
	event: WebhookEventType;
	payload: Record<string, unknown>;
	statusCode: number | null;
	responseBody: string | null;
	attempts: number;
	maxAttempts: number;
	nextAttemptAt: string | null;
	completedAt: string | null;
	createdAt: string;
}

export interface WebhookDeliveryListParams extends PaginationInput {}

export interface SecurityScanInput {
	orgId: string;
	agentId?: string;
	channel: "EMAIL" | "SMS";
	subject?: string;
	body: string;
	metadata?: Record<string, unknown>;
}

export interface SecurityScanWarning {
	ruleId: string;
	severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
	description: string;
	match?: string;
}

export interface SecurityScanOutput {
	blocked: boolean;
	warnings: SecurityScanWarning[];
	summary: string;
}

export type SecurityEventType =
	| "PII_DETECTED"
	| "INJECTION_DETECTED"
	| "RATE_LIMITED"
	| "BLOCKED"
	| "APPROVED"
	| "REJECTED";

export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityEventOutput {
	id: string;
	orgId: string;
	agentId: string | null;
	messageId: string | null;
	type: SecurityEventType;
	severity: SecuritySeverity;
	details: Record<string, unknown>;
	resolved: boolean;
	resolvedBy: string | null;
	resolvedAt: string | null;
	createdAt: string;
}

export interface SecurityEventsListParams extends PaginationInput {
	orgId: string;
	agentId?: string;
	type?: SecurityEventType;
	severity?: SecuritySeverity;
}

export interface ApiErrorEnvelope {
	error?: {
		code?: string;
		message?: string;
		details?: unknown;
	};
	message?: string;
}

export interface WebhookEvent {
	id?: string;
	type: WebhookEventType;
	createdAt?: string;
	data: Record<string, unknown>;
}

export interface WebhookVerificationOptions {
	toleranceSeconds?: number;
	now?: number;
}

export interface Card {
	id: string;
	agentId: string;
	orgId: string;
	stripeCardId: string;
	cardType: "VIRTUAL" | "PHYSICAL";
	status: "ACTIVE" | "FROZEN" | "CANCELED";
	last4: string;
	brand: string;
	expMonth: number;
	expYear: number;
	currency: string;
	label: string | null;
	spendLimitDaily: number | null;
	spendLimitMonthly: number | null;
	spendLimitPerAuth: number | null;
	spentToday: number;
	spentThisMonth: number;
	killSwitchActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateCardParams {
	agentId: string;
	label?: string;
	currency?: string;
	spendLimitDaily?: number;
	spendLimitMonthly?: number;
	spendLimitPerAuth?: number;
	metadata?: Record<string, string>;
}

export interface UpdateCardParams {
	label?: string;
	status?: "ACTIVE" | "FROZEN" | "CANCELED";
	spendLimitDaily?: number | null;
	spendLimitMonthly?: number | null;
	spendLimitPerAuth?: number | null;
}

export interface ListCardsParams {
	agentId?: string;
	status?: "ACTIVE" | "FROZEN" | "CANCELED";
	cursor?: string;
	limit?: number;
}

export interface CardList {
	items: Card[];
	cursor?: string;
}

export interface SpendingPolicy {
	id: string;
	cardId: string;
	orgId: string;
	name: string;
	priority: number;
	action: "AUTO_APPROVE" | "REQUIRE_APPROVAL" | "ALWAYS_DECLINE";
	maxAmountCents: number | null;
	minAmountCents: number | null;
	allowedCategories: string[];
	blockedCategories: string[];
	allowedMerchants: string[];
	blockedMerchants: string[];
	allowedCountries: string[];
	blockedCountries: string[];
	createdAt: string;
}

export interface CreatePolicyParams {
	name: string;
	priority?: number;
	action: "AUTO_APPROVE" | "REQUIRE_APPROVAL" | "ALWAYS_DECLINE";
	maxAmountCents?: number;
	minAmountCents?: number;
	allowedCategories?: string[];
	blockedCategories?: string[];
	allowedMerchants?: string[];
	blockedMerchants?: string[];
	allowedCountries?: string[];
	blockedCountries?: string[];
}

export interface UpdatePolicyParams extends Partial<CreatePolicyParams> {}

export interface CardTransaction {
	id: string;
	cardId: string;
	status: "PENDING" | "APPROVED" | "DECLINED" | "REVERSED" | "EXPIRED";
	decision: string | null;
	amountCents: number;
	currency: string;
	merchantName: string | null;
	merchantCategory: string | null;
	merchantCategoryCode: string | null;
	createdAt: string;
}

export interface ListTransactionsParams {
	cardId?: string;
	agentId?: string;
	status?: string;
	cursor?: string;
	limit?: number;
}

export interface TransactionList {
	items: CardTransaction[];
	cursor?: string;
}

export interface KillSwitchParams {
	agentId?: string;
	cardId?: string;
	active: boolean;
}

export interface KillSwitchResult {
	affected: number;
	active: boolean;
}

export interface CardApproval {
	id: string;
	orgId: string;
	cardId: string;
	amountCents: number;
	currency: string;
	merchantName: string | null;
	status: "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED";
	decidedBy: string | null;
	expiresAt: string;
	createdAt: string;
}

export interface ListApprovalsParams {
	status?: "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED";
	cursor?: string;
	limit?: number;
}

export interface ApprovalList {
	items: CardApproval[];
	cursor?: string;
}
