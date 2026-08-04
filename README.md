# Anima Node.js SDK

The official TypeScript/Node.js SDK for the [Anima API](https://docs.useanima.sh) — unified identity infrastructure for AI agents.

[![npm version](https://img.shields.io/npm/v/@anima-labs/sdk.svg)](https://www.npmjs.com/package/@anima-labs/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Installation

```bash
npm install @anima-labs/sdk
```

```bash
yarn add @anima-labs/sdk
```

```bash
pnpm add @anima-labs/sdk
```

## Quick Start

```ts
import { Anima } from "@anima-labs/sdk";

const anima = new Anima({
  apiKey: "mk_your_api_key",
});

// Send an email from an agent
const message = await anima.messages.sendEmail({
  agentId: "agent_abc123",
  to: ["user@example.com"],
  subject: "Welcome!",
  body: "Thanks for signing up.",
});

console.log(message.id, message.status);
```

## Configuration

```ts
const anima = new Anima({
  apiKey: "mk_your_api_key",   // Required — your organization master key or agent API key
  baseUrl: "https://api.useanima.sh", // Optional — defaults to https://api.useanima.sh
  timeout: 30_000,              // Optional — request timeout in ms (default: 30s)
  maxRetries: 3,                // Optional — retry count for 429/5xx errors (default: 3)
});
```

## Resources

### Organizations

```ts
// Create an organization
const org = await anima.organizations.create({
  name: "Acme Corp",
  slug: "acme-corp",
});

// List organizations
const orgs = await anima.organizations.list({ limit: 20 });

// Get, update, delete
const org = await anima.organizations.get("org_id");
await anima.organizations.update("org_id", { name: "New Name" });
await anima.organizations.delete("org_id");

// Rotate master key
const { masterKey } = await anima.organizations.rotateKey("org_id");
```

### Agents

```ts
// Create an agent
const agent = await anima.agents.create({
  orgId: "org_id",
  name: "Support Bot",
  slug: "support-bot",
  email: "support@yourdomain.com", // optional — provision email identity
  provisionPhone: true,             // optional — provision phone number
});

// List agents with filtering
const agents = await anima.agents.list({
  orgId: "org_id",
  status: "ACTIVE",
  query: "support",
  limit: 10,
});

// Get, update, delete
const agent = await anima.agents.get("agent_id");
await anima.agents.update("agent_id", { name: "Updated Name" });
await anima.agents.delete("agent_id");

// Rotate agent API key
const { apiKey, apiKeyPrefix } = await anima.agents.rotateKey("agent_id");
```

### Messages

```ts
// Send an email
const email = await anima.messages.sendEmail({
  agentId: "agent_id",
  to: ["recipient@example.com"],
  cc: ["cc@example.com"],
  subject: "Hello",
  body: "Plain text body",
  bodyHtml: "<h1>Hello</h1>",
});

// Send with attachments — each entry provides EITHER base64 `content`
// or a public `url` the server fetches (max 20 files, 25MB total)
const withAttachment = await anima.messages.sendEmail({
  agentId: "agent_id",
  to: ["recipient@example.com"],
  subject: "Report attached",
  body: "See the attached report.",
  attachments: [
    { filename: "report.pdf", contentType: "application/pdf", content: "JVBERi0xLjQK..." },
    { url: "https://files.example.com/big.pdf", filename: "big.pdf" },
  ],
});

// Reply in-thread by referencing Message-IDs
const reply = await anima.messages.sendEmail({
  agentId: "agent_id",
  to: ["recipient@example.com"],
  subject: "Re: Hello",
  body: "Replying in the same thread.",
  inReplyTo: "<message-id@agents.useanima.sh>",
  references: ["<message-id@agents.useanima.sh>"],
});

// Send an SMS
const sms = await anima.messages.sendSms({
  agentId: "agent_id",
  to: "+15551234567",
  body: "Your code is 123456",
});

// List messages
const messages = await anima.messages.list({
  agentId: "agent_id",
  channel: "EMAIL",
  direction: "OUTBOUND",
  limit: 20,
});

// Search messages
const results = await anima.messages.search("verification", {
  filters: { status: "SENT", channel: "EMAIL" },
  pagination: { limit: 10 },
});

// Semantic search — ranks messages by meaning, not text match:
// finds "the invoice from last week" even when no message contains
// those words. Results are ordered by similarity (best first).
const semantic = await anima.messages.semanticSearch("the invoice from last week", {
  agentId: "agent_id",   // optional — restrict to one agent
  limit: 10,             // optional — max results (default 10)
  threshold: 0.7,        // optional — min similarity 0-1 (default 0.7)
});
for (const hit of semantic.results) {
  console.log(hit.similarity.toFixed(2), hit.content);
}

// Get a single message
const msg = await anima.messages.get("msg_id");

// Attachments
const attachment = await anima.messages.uploadAttachment("msg_id", {
  filename: "report.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
});
const { url } = await anima.messages.getAttachmentUrl("attachment_id");
```

### Emails

```ts
// List email messages
const emails = await anima.emails.list({ agentId: "agent_id", limit: 20 });

// Attachment helpers
const uploaded = await anima.emails.uploadAttachment("msg_id", {
  filename: "doc.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
});
const download = await anima.emails.getAttachmentUrl("attachment_id");
```

### Email Drafts

```ts
// Compose a draft — may be incomplete (no recipients / subject yet)
const draft = await anima.drafts.create({
  agentId: "agent_id",
  to: ["recipient@example.com"],
  subject: "Quarterly report",
  body: "Numbers attached.",
});

// Get and list
const fetched = await anima.drafts.get(draft.id);
const drafts = await anima.drafts.list({ agentId: "agent_id", limit: 20 });

// Send — converts the draft into a real Message (threading, scanning and
// limits all apply) and deletes the draft row. Resolves to the sent
// Message; the draft id 404s afterwards. Incomplete drafts (missing
// to/subject/body) are rejected with a ValidationError.
const message = await anima.drafts.send(draft.id);
console.log(message.status); // "SENT"

// Delete without sending — resolves to the deleted draft
const discarded = await anima.drafts.delete("draft_id");
```

### Inboxes

```ts
// Create an inbox — all fields optional; create() alone provisions a
// generated address on the default domain
const inbox = await anima.inboxes.create({
  username: "support",           // local part → support@<domain>
  displayName: "Support",
  agentId: "agent_id",           // optional — associate with an agent
});
console.log(inbox.email);

// Get, list, update, delete
const fetched = await anima.inboxes.get("inbox_id");
const inboxes = await anima.inboxes.list({ query: "support", limit: 20 });
await anima.inboxes.update("inbox_id", { displayName: "Sales" });
await anima.inboxes.delete("inbox_id");
```

### Domains

```ts
// Add a custom domain
const domain = await anima.domains.add({ domain: "mail.example.com" });

// Verify domain DNS
const verified = await anima.domains.verify("domain_id");

// Get DNS records to configure
const records = await anima.domains.dnsRecords("domain_id");

// Get zone file
const { zoneFile } = await anima.domains.zoneFile("domain_id");

// Check deliverability stats
const stats = await anima.domains.deliverability("domain_id");

// List, get, update, delete
const domains = await anima.domains.list();
const domain = await anima.domains.get("domain_id");
await anima.domains.update("domain_id", { feedbackEnabled: true });
await anima.domains.delete("domain_id");
```

### Phones

```ts
// Provision a phone number for an agent
const phone = await anima.phones.provision({
  agentId: "agent_id",
  countryCode: "US",
  capabilities: ["sms", "voice"],
});

// List phone numbers
const phones = await anima.phones.list({ agentId: "agent_id" });

// Get, update config, release
const phone = await anima.phones.get("phone_id");
await anima.phones.updateConfig("phone_id", { isPrimary: true });
await anima.phones.release("phone_id");
```

### Voices

Browse the multilingual voice catalog and pick a voice for an agent's phone calls. Voices span several languages (English, Spanish, French, German, Italian, Japanese, Dutch, and more) — filter by `language` or `gender`.

```ts
// List every voice in the catalog
const { voices } = await anima.voices.list();

// Only Spanish voices
const spanish = await anima.voices.list({ language: "es" });

// Female English voices
const enFemale = await anima.voices.list({ gender: "female", language: "en" });

for (const voice of voices) {
  console.log(voice.id, voice.name, voice.language, voice.descriptors);
  // Play a preview: `sampleUrl` is a vendor-neutral clip served from the API
  // host (undefined until a sample has been generated for that voice).
  if (voice.sampleUrl) console.log("preview:", voice.sampleUrl);
}
```

### Webhooks

```ts
// Create a webhook
const webhook = await anima.webhooks.create({
  url: "https://your-app.com/webhooks/anima",
  events: ["message.received", "message.sent", "agent.created"],
  description: "Production webhook",
  // Optional: auth Anima presents to your endpoint, in addition to the
  // always-on X-Anima-Signature HMAC. Also: bearer / basic / custom_header.
  authConfig: { type: "bearer", token: "your-endpoint-secret" },
  rateLimitPerMinute: 60, // omit for unlimited
  maxAttempts: 5, // 1..10, default 3
});

// List, get, update, delete
const webhooks = await anima.webhooks.list({ limit: 10 });
const wh = await anima.webhooks.get("webhook_id");
await anima.webhooks.update("webhook_id", { active: false });
await anima.webhooks.delete("webhook_id");

// Test a webhook
const { deliveryId } = await anima.webhooks.test("webhook_id", "message.sent");

// List deliveries
const deliveries = await anima.webhooks.listDeliveries("webhook_id", { limit: 20 });
```

### Security

```ts
// Content scanning is not a call you make. It runs inside the send paths,
// so a blocked message surfaces as an error from emails.send / messages.send.
// What you can query is whether the scanner is actually running:
const { aiScanner } = await anima.security.getScannerStatus("org_id");

if (!aiScanner.active) {
  console.warn("AI scanning is off:", aiScanner.fallbackReason);
}

// List security events
const events = await anima.security.listEvents({
  orgId: "org_id",
  type: "PII_DETECTED",
  severity: "HIGH",
  limit: 20,
});
```

### Vault

```ts
// Provision a vault for an agent
const vault = await anima.vault.provision({ agentId: "agent_id" });

// Store credentials
const credential = await anima.vault.createCredential({
  agentId: "agent_id",
  type: "login",
  name: "GitHub",
  login: {
    username: "bot@example.com",
    password: "secure-password",
    uris: [{ uri: "https://github.com/login" }],
  },
});

// Or have the vault generate the password server-side — it is stored
// with the credential and never returned; the response carries only the
// masked credential ref. (Defaults: 24 chars, all character classes.)
const generated = await anima.vault.createCredential({
  agentId: "agent_id",
  type: "login",
  name: "Acme Portal",
  login: { username: "bot@example.com" },
  generatePassword: { length: 32 },
});

// List and search credentials
const creds = await anima.vault.listCredentials({ agentId: "agent_id", type: "login" });
const results = await anima.vault.search({ agentId: "agent_id", search: "github" });

// Get, update, delete
const cred = await anima.vault.getCredential("cred_id");
await anima.vault.updateCredential("cred_id", { name: "GitHub (prod)" });
await anima.vault.deleteCredential("cred_id");

// Generate a secure password
const { password } = await anima.vault.generatePassword({
  length: 32,
  uppercase: true,
  lowercase: true,
  number: true,
  special: true,
});

// TOTP codes
const { code, period } = await anima.vault.getTotp("cred_id");

// Vault status and sync
const status = await anima.vault.status("agent_id");
await anima.vault.sync("agent_id");

// Deprovision
await anima.vault.deprovision({ agentId: "agent_id" });
```

### Provisioning Requests

`vault.provision` and `phones.provision` both require a master key, which an
agent is never given. This is how an agent asks its owner instead — it files a
request, the owner approves it in the console, and the resource is created. The
agent gets the result, never the privilege.

```ts
// As the agent: ask for a vault. `reason` is shown verbatim to the owner.
const req = await anima.provisioningRequests.create({
  resource: "VAULT",
  reason: "To store the Stripe key so I can issue refunds",
});

// emailSent: false does NOT mean the request failed — it is live in the
// console either way — but nobody was told, so nothing will happen until
// someone looks.
if (!req.emailSent) console.warn("owner was not notified");

// Poll for the decision. `decidedNote` carries the owner's reason for a
// decline, so a second attempt can address it instead of repeating the first.
const current = await anima.provisioningRequests.get(req.requestId);
if (current.status === "APPROVED") {
  console.log("provisioned:", current.provisionedId);
}

// Withdraw an ask you no longer need.
await anima.provisioningRequests.cancel(req.requestId);

// As the owner (master key only): decide.
await anima.provisioningRequests.approve(req.requestId);
await anima.provisioningRequests.decline(req.requestId, {
  note: "Tell me which API first",
});

// A phone number takes options; Starter+ plans only.
await anima.provisioningRequests.create({
  resource: "PHONE_NUMBER",
  reason: "To receive delivery notifications",
  options: { countryCode: "US", areaCode: "415" },
});
```

### Extension

Mint a connect URL that opens the Anima browser extension already bound to an
agent's session — for headless / Puppeteer workers.

```ts
// With a master key, pass the agent to connect. As the agent's own key, omit
// agentId. `ttl` is optional and shorten-only ("15m" | "1h" | "session").
const { connectUrl, expiresAt, policy } = await anima.extension.connect({
  agentId: "agent_id",
  ttl: "15m",
});

// As the agent itself (agent key) — no arguments needed.
const session = await anima.extension.connect();
```

## Webhook Verification

Verify incoming webhook signatures using HMAC-SHA256:

```ts
import { Anima } from "@anima-labs/sdk";

// In your webhook handler
app.post("/webhooks/anima", (req, res) => {
  const payload = req.body; // raw string body
  const signature = req.headers["x-anima-signature"];
  const secret = "whsec_your_webhook_secret";

  // Option 1: Verify and parse in one step
  try {
    const event = Anima.webhooks.constructEvent(payload, signature, secret);
    console.log(event.type, event.data);
  } catch (err) {
    return res.status(400).send("Invalid signature");
  }

  // Option 2: Verify only
  const isValid = Anima.webhooks.verify(payload, signature, secret);
  if (!isValid) {
    return res.status(400).send("Invalid signature");
  }

  res.status(200).send("OK");
});
```

Signature format: `t=<unix_timestamp>,v1=<hmac_sha256_hex>`

## Error Handling

The SDK throws typed errors for different failure scenarios:

```ts
import {
  Anima,
  APIError,
  AuthError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@anima-labs/sdk";

try {
  await anima.agents.get("nonexistent");
} catch (error) {
  if (error instanceof AuthError) {
    // 401/403 — invalid or expired API key
    console.error("Auth failed:", error.message);
  } else if (error instanceof NotFoundError) {
    // 404 — resource doesn't exist
    console.error("Not found:", error.message);
  } else if (error instanceof ValidationError) {
    // 400/422 — invalid request parameters
    console.error("Validation:", error.message, error.details);
  } else if (error instanceof ConflictError) {
    // 409 — resource conflict (e.g. duplicate slug)
    console.error("Conflict:", error.message);
  } else if (error instanceof RateLimitError) {
    // 429 — rate limited, check retryAfter
    console.error("Rate limited, retry after:", error.retryAfter, "seconds");
  } else if (error instanceof InternalServerError) {
    // 5xx — server error
    console.error("Server error:", error.status, error.message);
  } else if (error instanceof APIError) {
    // Other API errors
    console.error(error.status, error.code, error.message);
  }
}
```

All errors extend `AnimaError` -> `APIError` with:
- `status` -- HTTP status code
- `code` -- Machine-readable error code
- `message` -- Human-readable message
- `details` -- Additional error context (when available)

| Error Class           | HTTP Status | Code              |
| --------------------- | ----------- | ----------------- |
| `AuthError`           | 401/403     | `AUTH_ERROR`      |
| `ValidationError`     | 400/422     | `VALIDATION_ERROR`|
| `NotFoundError`       | 404         | `NOT_FOUND`       |
| `ConflictError`       | 409         | `CONFLICT`        |
| `RateLimitError`      | 429         | `RATE_LIMIT`      |
| `InternalServerError` | 5xx         | `INTERNAL_ERROR`  |

## Pagination

All list endpoints support cursor-based pagination:

```ts
// First page
const page1 = await anima.agents.list({ orgId: "org_id", limit: 10 });
console.log(page1.items);
console.log(page1.pagination.hasMore);

// Next page
if (page1.pagination.hasMore && page1.pagination.nextCursor) {
  const page2 = await anima.agents.list({
    orgId: "org_id",
    limit: 10,
    cursor: page1.pagination.nextCursor,
  });
}

// Iterate all pages
let cursor: string | undefined;
do {
  const page = await anima.agents.list({ orgId: "org_id", limit: 100, cursor });
  for (const agent of page.items) {
    console.log(agent.name);
  }
  cursor = page.pagination.nextCursor ?? undefined;
} while (cursor);
```

## TypeScript

This SDK is written in TypeScript and ships with complete type definitions. All API methods return `Promise<T>` with resource-specific response types.

All types are exported from the main package:

```ts
import type {
  AgentOutput,
  MessageOutput,
  OrganizationOutput,
  SendEmailInput,
  WebhookEvent,
  AnimaClientOptions,
} from "@anima-labs/sdk";
```

## Requirements

- Node.js >= 18 (uses native `fetch`)
- TypeScript >= 5.0 (optional, for type checking)

## Documentation

Full API documentation is available at [docs.useanima.sh](https://docs.useanima.sh).

## Community

Join the [Anima Discord](https://discord.gg/pY3GK59Z9E) to ask questions in `#node-sdk`, share what you're building in `#showcase`, and stay up to date with releases in `#announcements`.

## License

MIT — see [LICENSE](LICENSE) for details.
