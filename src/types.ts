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

export type AddressType = "BILLING" | "SHIPPING" | "MAILING" | "REGISTERED";

export interface CreateAddressInput {
	agentId: string;
	type: AddressType;
	label?: string;
	street1: string;
	street2?: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

export interface UpdateAddressInput {
	agentId: string;
	type?: AddressType;
	label?: string;
	street1?: string;
	street2?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	country?: string;
}

export interface AddressOutput {
	id: string;
	agentId: string;
	type: AddressType;
	label: string | null;
	street1: string;
	street2: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	validated: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ValidateAddressOutput {
	valid: boolean;
	normalizedAddress: AddressOutput | null;
	errors: string[];
}

export interface ListAddressesParams extends PaginationInput {
	agentId?: string;
	type?: AddressType;
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

// ---------------------------------------------------------------------------
// Real-time Events (WebSocket)
// ---------------------------------------------------------------------------

export interface EventStreamOptions {
	/** Channels to subscribe to on connect (e.g. `["email.*", "card.*"]`). */
	channels?: string[];
}

export interface AnimaEvent {
	/** Unique event ID. */
	id: string;
	/** Dot-separated event type (e.g. `email.received`). */
	eventType: string;
	/** Agent ID, if scoped to a specific agent. */
	agentId?: string;
	/** Organization ID. */
	orgId: string;
	/** ISO-8601 timestamp. */
	timestamp: string;
	/** Event payload. */
	data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Identity (DID / Verifiable Credentials)
// ---------------------------------------------------------------------------

export interface DidDocument {
	did: string;
	agentId: string;
	document: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface DidRotateOutput {
	did: string;
	agentId: string;
	document: Record<string, unknown>;
	previousDid: string | null;
	rotatedAt: string;
}

export interface VerifiableCredential {
	id: string;
	type: string;
	issuer: string;
	subject: string;
	issuanceDate: string;
	expirationDate: string | null;
	credentialSubject: Record<string, unknown>;
	proof: Record<string, unknown>;
}

export interface VerifyCredentialOutput {
	valid: boolean;
	credential: VerifiableCredential | null;
	errors: string[];
}

export interface AgentCardOutput {
	did: string;
	agentId: string;
	name: string;
	description: string | null;
	capabilities: string[];
	endpoints: Record<string, string>;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface RegisterAgentInput {
	did: string;
	name: string;
	description?: string;
	category?: string;
	capabilities?: string[];
	endpoints?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface UpdateRegistryAgentInput {
	name?: string;
	description?: string;
	category?: string;
	capabilities?: string[];
	endpoints?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface RegistryAgentOutput {
	did: string;
	name: string;
	description: string | null;
	category: string | null;
	capabilities: string[];
	endpoints: Record<string, string>;
	metadata: Record<string, unknown>;
	verified: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface RegistrySearchParams extends PaginationInput {
	category?: string;
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export type WalletStatus = "ACTIVE" | "FROZEN";

export interface CreateWalletInput {
	currency?: string;
	metadata?: Record<string, unknown>;
}

export interface UpdateWalletInput {
	metadata?: Record<string, unknown>;
	spendLimitDaily?: number | null;
	spendLimitMonthly?: number | null;
}

export interface WalletOutput {
	id: string;
	agentId: string;
	address: string;
	currency: string;
	balance: number;
	status: WalletStatus;
	spendLimitDaily: number | null;
	spendLimitMonthly: number | null;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface WalletPayInput {
	to: string;
	amount: number;
	currency?: string;
	memo?: string;
	metadata?: Record<string, unknown>;
}

export interface WalletPayOutput {
	transactionId: string;
	from: string;
	to: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: string;
}

export interface X402FetchInput {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
	maxPaymentAmount?: number;
}

export interface X402FetchOutput {
	status: number;
	headers: Record<string, string>;
	body: string;
	paymentAmount: number | null;
	transactionId: string | null;
}

export interface WalletTransactionOutput {
	id: string;
	walletId: string;
	type: string;
	amount: number;
	currency: string;
	from: string | null;
	to: string | null;
	memo: string | null;
	status: string;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface WalletTransactionsParams extends PaginationInput {
	status?: string;
}

// ---------------------------------------------------------------------------
// Pods
// ---------------------------------------------------------------------------

export type PodStatus = "RUNNING" | "STOPPED" | "CREATING" | "ERROR";

export interface CreatePodInput {
	agentId: string;
	name: string;
	image: string;
	resources?: PodResourceSpec;
	env?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface UpdatePodInput {
	name?: string;
	resources?: PodResourceSpec;
	env?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface PodResourceSpec {
	cpu?: string;
	memory?: string;
	storage?: string;
}

export interface PodOutput {
	id: string;
	agentId: string;
	name: string;
	image: string;
	status: PodStatus;
	resources: PodResourceSpec;
	env: Record<string, string>;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface PodUsageOutput {
	podId: string;
	cpuUsage: number;
	memoryUsage: number;
	storageUsage: number;
	networkIn: number;
	networkOut: number;
	uptimeSeconds: number;
	measuredAt: string;
}

export interface ListPodsParams extends PaginationInput {
	agentId?: string;
}

// ---------------------------------------------------------------------------
// A2A (Agent-to-Agent Protocol)
// ---------------------------------------------------------------------------

export type A2ATaskStatus =
	| "SUBMITTED"
	| "WORKING"
	| "INPUT_REQUIRED"
	| "COMPLETED"
	| "CANCELED"
	| "FAILED";

export interface A2ASubmitTaskInput {
	type: string;
	input: Record<string, unknown>;
	fromDid?: string;
}

export interface A2AArtifact {
	name: string;
	mimeType: string;
	data: string;
}

export interface A2ATaskOutput {
	id: string;
	agentId: string;
	type: string;
	status: A2ATaskStatus;
	input: Record<string, unknown>;
	output: Record<string, unknown> | null;
	artifacts: A2AArtifact[];
	fromDid: string | null;
	error: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface A2ATaskListParams extends PaginationInput {
	status?: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditActorType = "api_key" | "user" | "system" | "agent";
export type AuditResult = "success" | "failure" | "denied";

export interface AuditLogOutput {
	id: string;
	orgId: string;
	actorType: AuditActorType;
	actorId: string;
	action: string;
	resourceType: string;
	resourceId: string;
	result: AuditResult;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface AuditLogListParams extends PaginationInput {
	actorId?: string;
	actorType?: AuditActorType;
	action?: string;
	resourceType?: string;
	resourceId?: string;
	result?: AuditResult;
	from?: string;
	to?: string;
}

export interface AuditLogExportParams {
	format?: "csv" | "json";
	from?: string;
	to?: string;
	actorId?: string;
	action?: string;
	resourceType?: string;
}

export interface AuditLogExportOutput {
	url: string;
	format: "csv" | "json";
	recordCount: number;
	expiresAt: string;
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export type ComplianceFramework = "SOC2" | "GDPR" | "PCI";
export type ComplianceControlStatus = "not_started" | "in_progress" | "implemented" | "verified" | "failed";
export type ComplianceReportType = "soc2_summary" | "activity_report" | "access_review" | "audit_export" | "gdpr_dsar";
export type DsarStatus = "pending" | "in_progress" | "completed" | "rejected";

export interface ComplianceControlOutput {
	id: string;
	orgId: string;
	framework: ComplianceFramework;
	controlId: string;
	title: string;
	description: string;
	category: string;
	status: ComplianceControlStatus;
	owner: string | null;
	lastTestedAt: string | null;
	nextReviewAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ComplianceControlListParams extends PaginationInput {
	framework?: ComplianceFramework;
	category?: string;
	status?: ComplianceControlStatus;
}

export interface ComplianceControlStatusInput {
	status: ComplianceControlStatus;
	owner?: string;
}

export interface SeedFrameworkInput {
	framework: ComplianceFramework;
}

export interface SeedFrameworkOutput {
	controlsCreated: number;
	framework: ComplianceFramework;
}

export interface GenerateReportInput {
	type: ComplianceReportType;
	from?: string;
	to?: string;
	metadata?: Record<string, unknown>;
}

export interface ComplianceReportOutput {
	id: string;
	orgId: string;
	type: ComplianceReportType;
	status: string;
	title: string;
	summary: string | null;
	data: Record<string, unknown> | null;
	generatedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface ComplianceReportListParams extends PaginationInput {
	type?: ComplianceReportType;
}

export interface ComplianceReportDownloadOutput {
	url: string;
	format: string;
	expiresAt: string;
}

export interface ComplianceDashboardOutput {
	orgId: string;
	frameworks: Record<string, ComplianceFrameworkSummary>;
	overallScore: number;
	recentActivity: ComplianceReportOutput[];
}

export interface ComplianceFrameworkSummary {
	totalControls: number;
	implemented: number;
	verified: number;
	failed: number;
	notStarted: number;
	score: number;
}

export interface CreateDsarInput {
	subjectEmail: string;
	requestType: "access" | "deletion" | "rectification" | "portability";
	description?: string;
	metadata?: Record<string, unknown>;
}

export interface DsarOutput {
	id: string;
	orgId: string;
	subjectEmail: string;
	requestType: string;
	status: DsarStatus;
	description: string | null;
	metadata: Record<string, unknown> | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DsarListParams extends PaginationInput {
	status?: DsarStatus;
}

export interface CompleteDsarInput {
	notes?: string;
	metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Anomaly Detection
// ---------------------------------------------------------------------------

export type AnomalyMetric =
	| "email_send_rate"
	| "sms_send_rate"
	| "card_txn_count"
	| "vault_access_rate"
	| "api_call_rate"
	| "unique_recipients";

export type AnomalySeverity = "INFO" | "WARNING" | "CRITICAL";
export type AnomalyAlertStatus = "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE";
export type AnomalyCondition = "zscore_gt" | "rate_multiplier_gt" | "absolute_gt" | "time_violation";
export type QuarantineAction = "NONE" | "SOFT" | "HARD";
export type QuarantineLevel = "NONE" | "SOFT" | "HARD";
export type BaselinePeriod = "hourly" | "daily";

export interface AnomalyAlertOutput {
	id: string;
	orgId: string;
	agentId: string;
	metric: AnomalyMetric;
	severity: AnomalySeverity;
	status: AnomalyAlertStatus;
	baselineValue: number;
	actualValue: number;
	zScore: number;
	ruleId: string | null;
	details: Record<string, unknown> | null;
	acknowledgedBy: string | null;
	acknowledgedAt: string | null;
	resolvedBy: string | null;
	resolvedAt: string | null;
	createdAt: string;
}

export interface AnomalyAlertListParams extends PaginationInput {
	agentId?: string;
	metric?: AnomalyMetric;
	severity?: AnomalySeverity;
	status?: AnomalyAlertStatus;
}

export interface AnomalyRuleOutput {
	id: string;
	orgId: string;
	name: string;
	metric: AnomalyMetric;
	condition: AnomalyCondition;
	threshold: number;
	severity: AnomalySeverity;
	quarantineAction: QuarantineAction;
	cooldownMinutes: number;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AnomalyRuleListParams extends PaginationInput {
	metric?: AnomalyMetric;
	enabled?: boolean;
}

export interface CreateAnomalyRuleInput {
	name: string;
	metric: AnomalyMetric;
	condition: AnomalyCondition;
	threshold: number;
	severity: AnomalySeverity;
	quarantineAction?: QuarantineAction;
	cooldownMinutes?: number;
	enabled?: boolean;
}

export interface UpdateAnomalyRuleInput {
	name?: string;
	threshold?: number;
	severity?: AnomalySeverity;
	quarantineAction?: QuarantineAction;
	cooldownMinutes?: number;
	enabled?: boolean;
}

export interface AgentBaselineOutput {
	agentId: string;
	orgId: string;
	metrics: BaselineMetric[];
}

export interface BaselineMetric {
	metric: AnomalyMetric;
	period: BaselinePeriod;
	mean: number;
	stddev: number;
	sampleCount: number;
	hourlyPattern: Record<string, number> | null;
	windowStart: string;
	windowEnd: string;
}

export interface QuarantineInput {
	level: QuarantineLevel;
	reason?: string;
}

export interface QuarantineOutput {
	agentId: string;
	quarantineLevel: QuarantineLevel;
	quarantinedAt: string | null;
	reason: string | null;
}
