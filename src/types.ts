export interface AnimaClientOptions {
	/**
	 * API key for authentication. Falls back to `ANIMA_API_KEY` env var if not provided.
	 */
	apiKey?: string;
	/**
	 * Base URL for the API. Falls back to `ANIMA_API_URL` env var, then `https://api.useanima.sh`.
	 */
	baseUrl?: string;
	timeout?: number;
	maxRetries?: number;
}

/** Per-request options */
export interface RequestOptions {
	/** Idempotency key for safe retries. Auto-generated UUID if not provided on mutating requests. */
	idempotencyKey?: string;
	/** Request timeout in milliseconds (overrides client default) */
	timeout?: number;
	/** Max retries (overrides client default) */
	maxRetries?: number;
	/** When true, returns `{ data, response }` instead of just the data */
	rawResponse?: boolean;
}

/** Raw HTTP response metadata */
export interface RawResponse {
	status: number;
	headers: Record<string, string>;
	requestId: string | null;
	responseTimeMs: number;
}

/** Response shape when rawResponse: true */
export interface WithRawResponse<T> {
	data: T;
	response: RawResponse;
}

/** Emitted before each HTTP request */
export interface RequestEvent {
	method: string;
	path: string;
	headers: Record<string, string>;
}

/** Emitted after each HTTP response */
export interface ResponseEvent {
	method: string;
	path: string;
	status: number;
	durationMs: number;
	headers: Record<string, string>;
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

/**
 * Organization subscription tier. Mirrors `TierSchema` in the anima contracts
 * and the Prisma `Tier` enum.
 *
 * Not decoration: `tier` on {@link CreateOrganizationInput} and
 * {@link UpdateOrganizationInput} is typed with this union, so a tier missing
 * here cannot be passed at all. STARTER was absent while DEVELOPER and SCALE —
 * which the API neither accepts nor returns — were listed.
 */
export type Tier = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";
export type AgentStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type PhoneProvider = "TELNYX";
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

/**
 * File attachment for outbound email. Provide exactly ONE of `content`
 * (base64-encoded bytes inline) or `url` (the server fetches the file).
 * Max 20 attachments per email, 25MB total after decode/fetch.
 */
export interface EmailAttachmentInput {
	/**
	 * Filename presented to the recipient. Inferred from the URL path when
	 * `url` is used and this is omitted; falls back to "attachment".
	 */
	filename?: string;
	/**
	 * Content-ID for inline attachments referenced in the HTML body via
	 * `cid:` URIs (e.g. set to "logo" and reference `<img src="cid:logo">`).
	 * When present the attachment is `Content-Disposition: inline`;
	 * when absent, `attachment`.
	 */
	contentId?: string;
	/** MIME type. Auto-detected from the filename extension if omitted. */
	contentType?: string;
	/** Base64-encoded attachment bytes. Mutually exclusive with `url`. */
	content?: string;
	/**
	 * Public URL the server fetches and attaches. Mutually exclusive with
	 * `content`. URLs to private/loopback IPs are rejected (SSRF guard).
	 */
	url?: string;
}

export interface SendEmailInput {
	agentId: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
	bodyHtml?: string;
	/** File attachments (max 20 per email, 25MB total). */
	attachments?: EmailAttachmentInput[];
	/** Message-ID of the email this is replying to (threads the reply). */
	inReplyTo?: string;
	/** Message-IDs forming the email thread chain (RFC `References`). */
	references?: string[];
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
	/**
	 * Workflow labels on this message. Always contains exactly one of the system
	 * labels `unread` or `read`; may also contain `archived`, `spam` (the inbound
	 * spam verdict) and any labels you add. Change them with
	 * `messages.updateLabels()`.
	 */
	labels: string[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Label filters, shared by message list/search and email list so the surfaces
 * cannot disagree on what "my unread mail" means.
 */
export interface MessageLabelFilters {
	/**
	 * Only return messages carrying ALL of these labels (`['urgent','unread']`
	 * means urgent AND still unread). Case-insensitive. System labels: `unread`,
	 * `read`, `archived`, `spam`.
	 */
	labels?: string[];
	/**
	 * Include messages classified as spam on arrival. Excluded by default. Naming
	 * `spam` in `labels` also counts as asking for it.
	 */
	includeSpam?: boolean;
}

export interface MessageListParams extends PaginationInput, MessageLabelFilters {
	agentId?: string;
	threadId?: string;
	channel?: MessageChannel;
	direction?: MessageDirection;
	dateRange?: DateRange;
}

export interface MessageSearchFilters extends MessageLabelFilters {
	agentId?: string;
	channel?: MessageChannel;
	direction?: MessageDirection;
	status?: MessageStatus;
	dateRange?: DateRange;
}

/**
 * Add and/or remove labels on one message. Supply at least one of
 * `addLabels`/`removeLabels`.
 *
 * Add/remove rather than a whole-array replace: two agents working the same
 * inbox would silently erase each other's tags under a `set`, and the server
 * applies both operations in a single statement so concurrent callers converge.
 */
export interface MessageUpdateLabelsInput {
	/**
	 * Labels to add. Adding `read` removes `unread` and vice versa — one state
	 * under two names, and a message always carries exactly one of them.
	 */
	addLabels?: string[];
	/** Labels to remove. A message is never left with neither `read` nor `unread`. */
	removeLabels?: string[];
}

export interface MessageSearchParams {
	filters?: MessageSearchFilters;
	pagination?: PaginationInput;
}

/** Optional filters for `messages.semanticSearch()`. */
export interface SemanticSearchParams {
	/** Restrict results to a single agent. Agent-scoped keys are always scoped to their own agent. */
	agentId?: string;
	/** Maximum number of results (1-50, server default 10). */
	limit?: number;
	/** Minimum cosine-similarity score to include (0-1, server default 0.7). */
	threshold?: number;
}

/** A message matched by semantic (embedding) search. */
export interface SemanticSearchResult {
	id: string;
	/** Message content text (the body the embedding was computed over). */
	content: string;
	/** Cosine similarity between the query and the message, 0-1 (higher = closer). */
	similarity: number;
	/** Communication channel, e.g. "EMAIL" or "SMS" (string per the API contract). */
	channel: string;
	/** Message direction, "INBOUND" or "OUTBOUND" (string per the API contract). */
	direction: string;
	createdAt: string;
	agentId: string;
}

export interface SemanticSearchOutput {
	/** Messages ranked by semantic similarity, best match first. */
	results: SemanticSearchResult[];
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

export interface EmailListParams extends PaginationInput, MessageLabelFilters {
	agentId?: string;
}

// ---------------------------------------------------------------------------
// Email drafts
// ---------------------------------------------------------------------------

/**
 * Composed-but-not-sent email owned by an agent. Distinct from a Message:
 * drafts can be incomplete (no `to`, no `subject`) and have no
 * threadId/status/delivery. `drafts.send()` converts a draft into a
 * Message and deletes the draft row atomically.
 */
export interface EmailDraftOutput {
	id: string;
	agentId: string;
	orgId: string;
	/**
	 * EmailIdentity used as the sender, or null to use the agent's primary
	 * identity at send time.
	 */
	fromIdentityId: string | null;
	to: string[];
	cc: string[];
	bcc: string[];
	/** Subject line, or null if not yet written. */
	subject: string | null;
	/** Plain-text body, or null if not yet written. */
	body: string | null;
	bodyHtml: string | null;
	/** Optional In-Reply-To Message-ID applied for threading on send. */
	inReplyTo: string | null;
	/** Optional References Message-ID chain applied for threading on send. */
	references: string[];
	metadata: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateEmailDraftInput {
	/** Owning agent ID. */
	agentId: string;
	/**
	 * Optional EmailIdentity ID to send from. Must belong to this agent and
	 * be verified.
	 */
	fromIdentityId?: string;
	/** Recipient email addresses (may be empty for an incomplete draft). */
	to?: string[];
	cc?: string[];
	bcc?: string[];
	subject?: string;
	body?: string;
	bodyHtml?: string;
	/** Optional In-Reply-To header applied for threading on send. */
	inReplyTo?: string;
	/** Optional References chain applied for threading on send. */
	references?: string[];
	metadata?: Record<string, unknown>;
}

export interface EmailDraftListParams extends PaginationInput {
	/** Filter drafts by owning agent ID. */
	agentId?: string;
}

// ---------------------------------------------------------------------------
// Inboxes
// ---------------------------------------------------------------------------

export interface CreateInboxInput {
	/**
	 * Local part of the inbox email address (letters, numbers, dots,
	 * hyphens, underscores; normalized to lowercase). Auto-generated
	 * when omitted.
	 */
	username?: string;
	/** Domain for the inbox address; the default domain when omitted. */
	domain?: string;
	/** Human-readable display name (max 128 characters). */
	displayName?: string;
	/** ID of the agent to associate with this inbox. */
	agentId?: string;
}

export interface UpdateInboxInput {
	/** Updated display name (set to null to clear). */
	displayName?: string | null;
	/** Updated agent association (set to null to unlink). */
	agentId?: string | null;
}

export interface InboxOutput {
	id: string;
	/** Full email address of the inbox. */
	email: string;
	domain: string;
	localPart: string;
	displayName: string | null;
	agentId: string | null;
	createdAt: string;
}

export interface InboxListParams extends PaginationInput {
	/** Free-text search over inbox email and display name. */
	query?: string;
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

export interface ReleasePhoneInput {
	agentId: string;
	phoneNumber: string;
}

export interface SearchPhonesParams {
	countryCode?: string;
	areaCode?: string;
	capabilities?: Array<"sms" | "mms" | "voice">;
	limit?: number;
}

export interface AvailableNumber {
	phoneNumber: string;
	region?: string;
	capabilities: PhoneCapabilities;
	monthlyCost?: number;
}

export interface ListPhonesParams {
	agentId: string;
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

export type CredentialType =
	| "login"
	| "secure_note"
	| "card"
	| "identity"
	| "oauth_token"
	| "api_key"
	| "certificate";

/**
 * Governs the credential's plaintext reveal paths. "brokered" refuses reveal
 * and export on every key type — including the org master key — so the secret
 * is only usable through `useCredential` (recovery = rotation).
 */
export type RevealPolicy = "standard" | "brokered";

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

export interface ListVaultIdentitiesParams {
	status?: "ACTIVE" | "LOCKED" | "ERROR";
	limit?: number;
	cursor?: string;
}

export interface VaultIdentityListItem extends VaultIdentityOutput {
	agentName: string;
	agentSlug: string;
}

export interface VaultAuditQueryParams {
	credentialId?: string;
	agentId?: string;
	/** e.g. access, store, delete, broker_use, broker_use_denied */
	action?: string;
	since?: string;
	until?: string;
	cursor?: string;
	limit?: number;
}

export interface VaultAuditLogEntry {
	id: string;
	credentialId: string;
	agentId: string;
	orgId: string;
	action: string;
	actor: string;
	ipAddress?: string | null;
	metadata?: Record<string, unknown> | null;
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

export interface VaultRateLimit {
	requests: number;
	/** Rate-limit window, e.g. "1m", "1h", "1d". */
	window: string;
}

export interface VaultApiKeyData {
	provider: string;
	/** The API key value. Stored encrypted; always read back masked. Optional on
	 * this shared read/write type, mirroring VaultLoginData.password?. */
	key?: string;
	prefix?: string;
	rateLimit?: VaultRateLimit;
	expiresAt?: string;
	scopes?: string[];
	/**
	 * Hosts this key may be brokered to via `useCredential`. Fail-closed:
	 * with no hosts the broker refuses every call. After creation only a
	 * master key may change this list.
	 */
	allowedHosts?: string[];
	/** Header the broker injects the key into (default "Authorization"). */
	authHeader?: string;
	/** Value prefix before the key (default "Bearer "; "" for a raw key). */
	authScheme?: string;
}

export interface VaultOAuthTokenData {
	provider: string;
	/** Stored encrypted; always read back masked. Optional on this shared
	 * read/write type, mirroring VaultLoginData.password?. */
	accessToken?: string;
	/** Stored encrypted; never read back — always absent on reads. */
	refreshToken?: string;
	tokenEndpoint: string;
	clientId: string;
	clientSecret?: string;
	scopes: string[];
	expiresAt: string;
	autoRefresh?: boolean;
	/** Hosts this token may be brokered to via `useCredential`. Fail-closed. */
	allowedHosts?: string[];
}

export interface VaultCertificateData {
	format: "pem" | "p12" | "jks";
	certificate: string;
	/** Stored encrypted; always read back masked. Optional on this shared
	 * read/write type, mirroring VaultLoginData.password?. */
	privateKey?: string;
	chain?: string[];
	expiresAt: string;
}

export interface VaultCredential {
	id: string;
	type: CredentialType;
	name: string;
	notes?: string;
	login?: VaultLoginData;
	card?: VaultCardData;
	identity?: VaultIdentityData;
	oauthToken?: VaultOAuthTokenData;
	apiKey?: VaultApiKeyData;
	certificate?: VaultCertificateData;
	fields?: VaultCustomField[];
	favorite: boolean;
	revealPolicy?: RevealPolicy;
	folderId?: string;
	organizationId?: string;
	collectionIds?: string[];
	createdAt: string;
	updatedAt: string;
}

export interface GeneratePasswordOptions {
	length?: number;
	uppercase?: boolean;
	lowercase?: boolean;
	number?: boolean;
	special?: boolean;
}

export interface CreateVaultCredentialInput {
	agentId?: string;
	type: CredentialType;
	name: string;
	notes?: string;
	login?: VaultLoginData;
	card?: VaultCardData;
	identity?: VaultIdentityData;
	oauthToken?: VaultOAuthTokenData;
	apiKey?: VaultApiKeyData;
	certificate?: VaultCertificateData;
	fields?: VaultCustomField[];
	favorite?: boolean;
	/**
	 * Generate the login password server-side (login type only, mutually
	 * exclusive with login.password). The password is stored in the vault
	 * and never returned — the response carries only the masked credential
	 * ref. Server defaults: 24 characters, all character classes.
	 */
	generatePassword?: GeneratePasswordOptions;
	/**
	 * When omitted, agent-key-created logins default to "brokered" and
	 * oauth_token credentials are always brokered; everything else follows
	 * the org's default reveal policy.
	 */
	revealPolicy?: RevealPolicy;
}

export interface UpdateVaultCredentialInput {
	agentId?: string;
	name?: string;
	notes?: string;
	login?: VaultLoginData;
	card?: VaultCardData;
	identity?: VaultIdentityData;
	oauthToken?: VaultOAuthTokenData;
	apiKey?: VaultApiKeyData;
	certificate?: VaultCertificateData;
	fields?: VaultCustomField[];
	favorite?: boolean;
	/**
	 * Upgrading standard → brokered needs UPDATE access; downgrading
	 * brokered → standard is master-key-only and audited.
	 */
	revealPolicy?: RevealPolicy;
}

export interface ListVaultCredentialsParams {
	agentId?: string;
	type?: CredentialType;
}

export interface SearchVaultParams {
	agentId?: string;
	search: string;
	type?: CredentialType;
}

export interface GeneratePasswordInput extends GeneratePasswordOptions {
	agentId?: string;
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

// ---------------------------------------------------------------------------
// Vault — Human-in-the-loop credential requests
// ---------------------------------------------------------------------------

export type VaultCredentialRequestStatus =
	| "PENDING"
	| "FULFILLED"
	| "EXPIRED"
	| "DECLINED"
	| "CANCELLED";

export interface CreateVaultCredentialRequestInput {
	agentId?: string;
	/** Type of credential the human is asked to provide. */
	type: CredentialType;
	/** Display name for the credential to be created. */
	name: string;
	/** Shown to the owner: why the credential is needed. */
	reason: string;
	/** Request TTL in seconds (60-3600, default 900). */
	ttlSeconds?: number;
	/** Email the fill URL to the org owner. */
	notifyOwner?: boolean;
}

export interface VaultCredentialRequest {
	requestId: string;
	/** Token-gated URL where the human submits the secret. */
	fillUrl: string;
	status: VaultCredentialRequestStatus;
	expiresAt: string;
	emailSent: boolean;
	/** Set when the request resolves synchronously; null/absent otherwise. */
	credentialId?: string | null;
}

export interface VaultCredentialRequestStatusOutput {
	status: VaultCredentialRequestStatus;
	/** Vault credential ID once FULFILLED, null otherwise. */
	credentialId: string | null;
	/** Masked preview (e.g. ****1234) — never the plaintext. */
	maskedPreview: string | null;
}

export interface CancelVaultCredentialRequestOutput {
	status: VaultCredentialRequestStatus;
}

// ---------------------------------------------------------------------------
// Vault — Sharing
// ---------------------------------------------------------------------------

export type SharePermission = "READ" | "USE" | "MANAGE";

export interface ShareCredentialInput {
	/** ID of the agent that OWNS the credential being shared. */
	sourceAgentId: string;
	credentialId: string;
	targetAgentId: string;
	permission: SharePermission;
	/** Relative TTL — mutually exclusive with `expiresAt`. */
	expiresInSeconds?: number;
	/** Absolute ISO-8601 timestamp — wins over `expiresInSeconds` if both set. */
	expiresAt?: string;
}

export interface VaultShare {
	id: string;
	credentialId: string;
	sourceAgentId: string;
	targetAgentId: string;
	permission: SharePermission;
	expiresAt: string | null;
	createdAt: string;
}

export interface RevokeShareInput {
	shareId: string;
	agentId?: string;
}

// ---------------------------------------------------------------------------
// Vault — Ephemeral Tokens
// ---------------------------------------------------------------------------

export type TokenScope = "autofill" | "proxy" | "export";

export interface CreateVaultTokenInput {
	agentId?: string;
	credentialId: string;
	scope: TokenScope;
	ttlSeconds?: number;
}

export interface VaultTokenOutput {
	token: string;
	credentialId: string;
	scope: TokenScope;
	expiresAt: string;
}

export interface RevokeVaultTokensInput {
	agentId?: string;
	credentialId: string;
}

/**
 * Input for {@link VaultResource.useCredential}. The platform makes this HTTP
 * call with the stored credential attached server-side; the plaintext secret is
 * never returned. The target host must be on the credential's allowlist.
 */
export interface UseVaultCredentialInput {
	agentId?: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
	/** Absolute https:// URL whose host is on the credential allowlist. */
	url: string;
	/** Extra headers. Any Authorization/auth header is ignored and replaced. */
	headers?: Record<string, string>;
	body?: string;
}

/** The upstream response, scrubbed of the injected credential. */
export interface UseVaultCredentialOutput {
	status: number;
	headers: Record<string, string>;
	body: string;
	truncated: boolean;
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

/**
 * Authentication the platform presents to your endpoint on each delivery, in
 * addition to the always-on `X-Anima-Signature` HMAC header. Secrets set here
 * (`token`, `password`, `value`) are write-only and are never returned on reads.
 */
export type WebhookAuthConfig =
	| { type: "none" }
	| { type: "bearer"; token: string }
	| { type: "basic"; username: string; password: string }
	| { type: "custom_header"; headerName: string; value: string };

export interface CreateWebhookInput {
	url: string;
	events: WebhookEventType[];
	description?: string;
	active?: boolean;
	authConfig?: WebhookAuthConfig;
	rateLimitPerMinute?: number;
	maxAttempts?: number;
}

export interface UpdateWebhookInput {
	url?: string;
	events?: WebhookEventType[];
	description?: string;
	active?: boolean;
	authConfig?: WebhookAuthConfig;
	rateLimitPerMinute?: number | null;
	maxAttempts?: number | null;
}

export type WebhookAuthType = "NONE" | "BEARER" | "BASIC" | "CUSTOM_HEADER";

export interface WebhookOutput {
	id: string;
	orgId: string;
	url: string;
	events: WebhookEventType[];
	active: boolean;
	description: string | null;
	authType: WebhookAuthType;
	authHeaderName: string | null;
	rateLimitPerMinute: number | null;
	maxAttempts: number | null;
	consecutiveFailures: number;
	disabledReason: string | null;
	disabledAt: string | null;
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

// ---------------------------------------------------------------------------
// Real-time Events (WebSocket)
// ---------------------------------------------------------------------------

export interface EventStreamOptions {
	/** Channels to subscribe to on connect (e.g. `["email.*"]`). */
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

/**
 * The credential types Anima issues. Platform verification events
 * auto-issue `AnimaEmailVerified`/`AnimaOwnerBound` (email OTP),
 * `AnimaPhoneVerified` (number provisioning), and `AnimaPaymentCapable`
 * (paid Stripe checkout); those platform-reserved types (plus
 * `AnimaKYBCompleted`) cannot be issued through the API — only the
 * org-attestation types (`AnimaAddressVerified`, `AnimaTrustScore`) can.
 */
export type VerifiableCredentialType =
	| "AnimaEmailVerified"
	| "AnimaPhoneVerified"
	| "AnimaAddressVerified"
	| "AnimaKYBCompleted"
	| "AnimaPaymentCapable"
	| "AnimaOwnerBound"
	| "AnimaTrustScore";

/**
 * A Verifiable Credential record as stored by the platform — the shape
 * returned by `identity.listCredentials`, `identity.issueCredential`, and
 * `identity.revokeCredential`. The W3C credential itself is the signed
 * `jwtVc` string; the other fields are the platform's record around it.
 */
export interface VerifiableCredentialRecord {
	id: string;
	agentId: string;
	orgId: string;
	type: string;
	/** The signed JWT-VC — pass to `identity.verifyCredential` to decode/verify. */
	jwtVc: string;
	issuerDid: string;
	subjectDid: string;
	issuedAt: string;
	expiresAt: string | null;
	revoked: boolean;
	revokedAt: string | null;
	revocationIndex: number | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

export interface IssueCredentialInput {
	/** Credential type to issue (org-attestation types only; platform-reserved types 403). */
	type: VerifiableCredentialType;
	/** Additional claims for the credential subject (the subject id is always the agent's DID). */
	claims?: Record<string, unknown>;
	/** Optional credential lifetime in seconds (omit for non-expiring). */
	expiresInSeconds?: number;
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

export interface A2ADispatchInput {
	toDid: string;
	type: string;
	input: Record<string, unknown>;
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

// ── Voice & Calls ──

export type VoiceTier = "basic" | "premium";
export type VoiceGender = "male" | "female" | "neutral";
export type CallDirection = "INBOUND" | "OUTBOUND";

/**
 * A voice in the catalog. Vendor-neutral: the underlying provider/model is
 * never exposed — only descriptive metadata and a proxied preview URL.
 */
export interface Voice {
	id: string;
	name: string;
	gender: VoiceGender;
	accent?: string;
	age?: string;
	/** Tone descriptors, e.g. `["warm", "smooth"]`. */
	descriptors: string[];
	useCases: string[];
	/** Base language code, e.g. `"en"`, `"es"`, `"ja"`. */
	language: string;
	/**
	 * Vendor-neutral preview URL under the API host — the client never touches
	 * the provider CDN. Absent until a sample clip has been generated.
	 */
	sampleUrl?: string;
}

export interface ListVoicesParams {
	gender?: VoiceGender;
	language?: string;
}

export interface Call {
	id: string;
	agentId: string;
	phoneIdentityId: string;
	direction: CallDirection;
	tier: VoiceTier;
	state: string;
	from: string;
	to: string;
	startedAt: string;
	answeredAt: string | null;
	endedAt: string | null;
	endReason: string | null;
	durationSeconds: number | null;
	createdAt: string;
}

export interface ListCallsParams {
	agentId?: string;
	direction?: CallDirection;
	state?: string;
	limit?: number;
	offset?: number;
}

export interface CreateCallInput {
	to: string;
	agentId?: string;
	tier?: VoiceTier;
	greeting?: string;
	fromNumber?: string;
}

export interface CreateCallOutput {
	callId: string;
	state: string;
	from: string;
	to: string;
	tier: string;
	direction: "OUTBOUND";
}

export interface TranscriptSegment {
	speaker: string;
	text: string;
	startTime: number;
	endTime: number;
	confidence: number;
	isFinal: boolean;
}

export interface CallTranscript {
	callId: string;
	segments: TranscriptSegment[];
}

// ---------------------------------------------------------------------------
// Voice WebSocket types
// ---------------------------------------------------------------------------

export type VoiceMessageType =
	| "call.create"
	| "call.accept"
	| "call.reject"
	| "call.speak"
	| "call.speak.chunk"
	| "call.speak.end"
	| "call.speak.cancel"
	| "call.hangup"
	| "call.hold"
	| "call.resume"
	| "call.dtmf"
	| "ping"
	| "call.started"
	| "call.ringing"
	| "call.answered"
	| "call.transcription"
	| "call.transcription.eager"
	| "call.speak.ended"
	| "call.interrupted"
	| "call.ended"
	| "call.error"
	| "call.security.alert"
	| "connected"
	| "pong";

export interface CallTranscriptionEagerEvent {
	type: "call.transcription.eager";
	callId: string;
	turnId?: string;
	text: string;
	confidence: number;
	timestamp: number;
}

export interface VoiceMessage {
	type: VoiceMessageType;
	data?: Record<string, unknown>;
	timestamp?: string;
}

export interface VoiceConnectionOptions {
	agentId?: string;
}

// ---------------------------------------------------------------------------
// Extension — headless connect
// ---------------------------------------------------------------------------

// Time-to-live for the browser session the connect URL opens. Shorten-only:
// the server caps it at the agent's configured maximum. "session" ties the
// lifetime to the browser session.
export type ExtensionConnectTtl = "15m" | "1h" | "session";

export interface ConnectExtensionInput {
	// Required when authenticating with a master key (mk_ / ak_ admin);
	// omit it when authenticating as the agent itself (its own key).
	agentId?: string;
	ttl?: ExtensionConnectTtl;
}

export interface ConnectExtensionResult {
	agentId: string;
	connectUrl: string;
	// null when the session has no wall-clock expiry (e.g. ttl "session").
	expiresAt: string | null;
	exchangeExpiresAt: string;
	policy: "session" | "pre_approved";
}
