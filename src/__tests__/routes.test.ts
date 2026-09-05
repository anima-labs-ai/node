/**
 * Every path this SDK can call must exist on the API.
 *
 * The per-resource tests in resources.test.ts assert paths against a mock, so
 * they pass whether or not the server serves the route — that is how
 * `POST /security/scan` and `GET /identity/did/{did}` stayed green for the
 * whole life of those methods, and how two entire resources (wallet, pods)
 * shipped against products the API had removed. Twenty-four of this SDK's
 * calls went nowhere.
 *
 * This test reads the resource sources and checks each path literal against
 * the allowlist below, generated from the monorepo's
 * `packages/contracts/src/contracts/*.ts` at the commit in `.anima-ref`. A new
 * method reaching for a route that does not exist fails here.
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT. A path in the allowlist is DECLARED
 * in the contracts. That is not the same as "the product is alive". Killed
 * surfaces are routinely left in place — anima `894035bc` deleted the OAuth
 * console pages and says the procedures "remain dormant in packages/contracts
 * + apps/api/routes/handlers/vault.ts; full backend cleanup is a separate
 * chore" — and some are declared `deprecated: true` and answer 400 by design
 * (`POST /mcp-auth/sessions`). So a gap between this list and the SDK is NOT
 * by itself evidence of missing coverage. In 2026-08 six dormant vault OAuth
 * routes were read that way and re-added to all three SDKs; they were removed
 * again. Check git history for a deliberate removal before filling any gap.
 *
 * Regenerate when `.anima-ref` moves, from the monorepo root:
 *
 *   python3 - <<'EOF'
 *   import re, pathlib
 *   src = "".join(p.read_text() for p in
 *                 sorted(pathlib.Path("packages/contracts/src/contracts").glob("*.ts")))
 *   out = set()
 *   for m in re.finditer(r'\.route\(\s*\{(.*?)\}\s*\)', src, re.S):
 *       meth = re.search(r'method:\s*"([A-Z]+)"', m.group(1))
 *       path = re.search(r'path:\s*"([^"]+)"', m.group(1))
 *       if meth and path:
 *           out.add(meth.group(1) + " " + re.sub(r'\{[^}]*\}', '*', path.group(1)))
 *   print("\n".join(sorted(out)))
 *   EOF
 *
 * It must parse the whole `.route({...})` object, not one line: eight routes
 * spread method and path across lines (`POST /addresses/*&#47;validate`, the four
 * mcp-auth ones, three agents email-identity ones). The single-line grep this
 * header used to recommend silently dropped all eight.
 *
 * Then add the three routes registered directly on fastify rather than through
 * oRPC, which no contracts scan can see: GET /audit/events, GET /events/stream,
 * POST /a2a/inbound.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RESOURCES_DIR = join(import.meta.dir, "..", "resources");

/** Path params differ per call site; compare shapes, not ids. */
function normalise(path: string): string {
	return path
		.replace(/\$\{[^}]*\}/g, "*")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "");
}

/**
 * `METHOD /path` for every route the API serves, path params as `*`.
 * Sorted by path so a diff against the regenerated list is readable.
 */
const API_ROUTES: ReadonlySet<string> = new Set([
	"POST /a2a/inbound",
	"GET /addresses",
	"POST /addresses",
	"DELETE /addresses/*",
	"GET /addresses/*",
	"PUT /addresses/*",
	"POST /addresses/*/validate",
	"POST /agent/elevate",
	"POST /agent/elevate/request",
	"POST /agent/sign-up",
	"GET /agent/status",
	"POST /agent/verify",
	"GET /agents",
	"POST /agents",
	"DELETE /agents/*",
	"GET /agents/*",
	"PATCH /agents/*",
	"POST /agents/*/a2a/dispatch",
	"GET /agents/*/a2a/tasks",
	"POST /agents/*/a2a/tasks",
	"GET /agents/*/a2a/tasks/*",
	"POST /agents/*/a2a/tasks/*/cancel",
	"POST /agents/*/a2a/tasks/*/update",
	"GET /agents/*/card",
	"GET /agents/*/credentials",
	"POST /agents/*/credentials",
	"POST /agents/*/credentials/*/revoke",
	"GET /agents/*/did",
	"POST /agents/*/did/rotate",
	"GET /agents/*/email-identities",
	"POST /agents/*/email-identities/*/verify",
	"GET /agents/*/permissions",
	"POST /agents/*/permissions",
	"GET /agents/*/policy",
	"PUT /agents/*/policy",
	"POST /agents/*/rotate-key",
	"GET /api-keys",
	"POST /api-keys",
	"DELETE /api-keys/*",
	"PATCH /api-keys/*",
	"POST /api-keys/*/rotate",
	"GET /api-keys/scopes",
	"GET /attachments/*/download",
	"GET /attachments/*/text",
	"GET /audit/events",
	"POST /billing/change-plan",
	"POST /billing/checkout",
	"POST /billing/contact-enterprise",
	"GET /billing/features/*",
	"GET /billing/invoices",
	"GET /billing/overage",
	"PUT /billing/overage",
	"GET /billing/plans",
	"POST /billing/portal",
	"GET /billing/tier",
	"GET /billing/usage",
	"POST /demo/inbox",
	"GET /demo/inbox/*/messages",
	"GET /domains",
	"POST /domains",
	"DELETE /domains/*",
	"GET /domains/*",
	"PATCH /domains/*",
	"GET /domains/*/deliverability",
	"GET /domains/*/dns-records",
	"POST /domains/*/verify",
	"GET /domains/*/zone-file",
	"GET /email",
	"GET /email-rules",
	"POST /email-rules",
	"DELETE /email-rules/*",
	"POST /email-rules/evaluate",
	"GET /email/*",
	"POST /email/*/forward",
	"POST /email/*/reply",
	"GET /email/drafts",
	"POST /email/drafts",
	"DELETE /email/drafts/*",
	"GET /email/drafts/*",
	"POST /email/drafts/*/send",
	"POST /email/send",
	"GET /email/suppressions",
	"POST /email/unsuppress",
	"GET /events/stream",
	"POST /extension/connect",
	"POST /extension/exchange",
	"POST /extension/revoke",
	"GET /extension/settings",
	"PATCH /extension/settings",
	"POST /extension/token",
	"PATCH /extension/token/*",
	"GET /feedback",
	"POST /feedback",
	"POST /identities",
	"POST /identity/verify",
	"GET /inboxes",
	"POST /inboxes",
	"DELETE /inboxes/*",
	"GET /inboxes/*",
	"PATCH /inboxes/*",
	"POST /mcp-auth/sessions",
	"POST /mcp-auth/sessions/*/complete",
	"POST /mcp-auth/sessions/*/deny",
	"POST /mcp-auth/sessions/poll",
	"GET /me/agents",
	"GET /me/orgs",
	"GET /messages",
	"DELETE /messages/*",
	"GET /messages/*",
	"POST /messages/*/attachments",
	"PATCH /messages/*/labels",
	"POST /messages/*/restore",
	"POST /messages/email",
	"POST /messages/search",
	"POST /messages/search/semantic",
	"POST /messages/sms",
	"POST /oauth/apps",
	"GET /oauth/apps/*",
	"PATCH /oauth/apps/*",
	"POST /oauth/auth-codes/mint",
	"POST /oauth/register",
	"POST /oauth/revoke",
	"POST /oauth/token",
	"GET /oauth/userinfo",
	"GET /openclaw/agents",
	"GET /openclaw/authorize",
	"GET /openclaw/callback",
	"POST /openclaw/signup",
	"GET /orgs",
	"POST /orgs",
	"DELETE /orgs/*",
	"GET /orgs/*",
	"PATCH /orgs/*",
	"GET /orgs/*/access-reviews",
	"POST /orgs/*/access-reviews",
	"POST /orgs/*/access-reviews/*/complete",
	"GET /orgs/*/agents/*/baselines",
	"DELETE /orgs/*/agents/*/quarantine",
	"GET /orgs/*/agents/*/quarantine",
	"POST /orgs/*/agents/*/quarantine",
	"GET /orgs/*/anomaly-alerts",
	"GET /orgs/*/anomaly-alerts/*",
	"POST /orgs/*/anomaly-alerts/*/acknowledge",
	"POST /orgs/*/anomaly-alerts/*/false-positive",
	"POST /orgs/*/anomaly-alerts/*/resolve",
	"GET /orgs/*/anomaly-rules",
	"POST /orgs/*/anomaly-rules",
	"DELETE /orgs/*/anomaly-rules/*",
	"PATCH /orgs/*/anomaly-rules/*",
	"GET /orgs/*/audit-logs",
	"GET /orgs/*/audit-logs/*",
	"POST /orgs/*/audit-logs/export",
	"POST /orgs/*/claim",
	"GET /orgs/*/compliance/controls",
	"GET /orgs/*/compliance/controls/*",
	"PATCH /orgs/*/compliance/controls/*",
	"POST /orgs/*/compliance/controls/*/collect",
	"GET /orgs/*/compliance/controls/*/evidence",
	"POST /orgs/*/compliance/controls/*/evidence",
	"GET /orgs/*/compliance/dashboard",
	"GET /orgs/*/compliance/dsars",
	"POST /orgs/*/compliance/dsars",
	"GET /orgs/*/compliance/dsars/*",
	"PATCH /orgs/*/compliance/dsars/*",
	"GET /orgs/*/compliance/reports",
	"POST /orgs/*/compliance/reports",
	"DELETE /orgs/*/compliance/reports/*",
	"GET /orgs/*/compliance/reports/*",
	"POST /orgs/*/compliance/reports/*/export",
	"POST /orgs/*/compliance/seed",
	"GET /orgs/*/compliance/summary",
	"GET /orgs/*/compliance/templates",
	"GET /orgs/*/members",
	"POST /orgs/*/messages/*/approve",
	"POST /orgs/*/rotate-key",
	"GET /orgs/*/security/events",
	"GET /orgs/*/security/scanner-status",
	"GET /orgs/claimable",
	"POST /orgs/feature-interest",
	"GET /orgs/me",
	"GET /orgs/me/usage",
	"GET /orgs/me/workspace-health",
	"GET /phone/identities",
	"GET /phone/numbers",
	"PATCH /phone/numbers/*",
	"POST /phone/provision",
	"POST /phone/release",
	"GET /phone/requirements",
	"GET /phone/search",
	"POST /phone/send-sms",
	"GET /phone/sms-suppressions",
	"POST /phone/sms-unsuppress",
	"GET /phone/sms/stats",
	"GET /phone/sms/threads",
	"GET /phone/sms/threads/*",
	"GET /provisioning-requests",
	"POST /provisioning-requests",
	"GET /provisioning-requests/*",
	"POST /provisioning-requests/*/approve",
	"POST /provisioning-requests/*/cancel",
	"POST /provisioning-requests/*/decline",
	"POST /registry/agents",
	"DELETE /registry/agents/*",
	"GET /registry/agents/*",
	"PUT /registry/agents/*",
	"GET /registry/agents/search",
	"GET /scoped-tokens",
	"POST /scoped-tokens",
	"POST /scoped-tokens/revoke",
	"GET /threads",
	"PATCH /threads/*/labels",
	"GET /vault/audit",
	"GET /vault/credential-requests",
	"POST /vault/credential-requests",
	"GET /vault/credential-requests/*",
	"POST /vault/credential-requests/*/cancel",
	"GET /vault/credentials",
	"POST /vault/credentials",
	"DELETE /vault/credentials/*",
	"GET /vault/credentials/*",
	"PUT /vault/credentials/*",
	"POST /vault/credentials/*/use",
	"POST /vault/deprovision",
	"POST /vault/generate-password",
	"GET /vault/identities",
	"GET /vault/oauth/accounts",
	"DELETE /vault/oauth/accounts/*",
	"GET /vault/oauth/apps",
	"GET /vault/oauth/apps/*",
	"POST /vault/oauth/apps/*/custom",
	"DELETE /vault/oauth/apps/*/custom/*",
	"POST /vault/oauth/link",
	"GET /vault/oauth/link/*",
	"POST /vault/oauth/require-auth",
	"POST /vault/provision",
	"GET /vault/search",
	"POST /vault/share",
	"POST /vault/share/revoke",
	"GET /vault/shares",
	"GET /vault/status",
	"POST /vault/sync",
	"POST /vault/token",
	"POST /vault/token/exchange",
	"POST /vault/token/revoke",
	"GET /vault/totp/*",
	"GET /voice/analytics",
	"GET /voice/calls",
	"POST /voice/calls",
	"GET /voice/calls/*",
	"GET /voice/calls/*/recording",
	"GET /voice/calls/*/score",
	"GET /voice/calls/*/security",
	"GET /voice/calls/*/summary",
	"GET /voice/calls/*/transcript",
	"GET /voice/calls/contacts",
	"GET /voice/catalog",
	"POST /voice/search",
	"POST /voice/search/cross-channel",
	"GET /webhooks",
	"POST /webhooks",
	"DELETE /webhooks/*",
	"GET /webhooks/*",
	"PUT /webhooks/*",
	"GET /webhooks/*/dead-letters",
	"GET /webhooks/*/deliveries",
	"POST /webhooks/*/reenable",
	"POST /webhooks/*/rotate-secret",
	"GET /webhooks/*/stats",
	"POST /webhooks/*/test",
	"POST /webhooks/deliveries/*/replay",
	"GET /webhooks/event-types",
]);

/**
 * Every `request("METHOD", `path`)` this SDK issues, as `METHOD /path`.
 *
 * Anchored on the method literal rather than on `request<...>(`: the type
 * argument is often a nested generic (`request<PaginatedResponse<Alert>>(`),
 * and a `<[^>]*>` prefix stops at the inner `>` and silently skips the call.
 * That hole hid 55 of this SDK's ~140 calls on the first cut of this test.
 */
function sdkCalls(): { file: string; route: string }[] {
	const found: { file: string; route: string }[] = [];
	const pattern = /"(GET|POST|PUT|PATCH|DELETE)",\s*(?:`([^`]+)`|"(\/[^"]*)")/g;
	for (const file of readdirSync(RESOURCES_DIR).filter((f) =>
		f.endsWith(".ts"),
	)) {
		const source = readFileSync(join(RESOURCES_DIR, file), "utf8");
		for (const match of source.matchAll(pattern)) {
			const path = match[2] ?? match[3];
			if (!path?.startsWith("/")) continue;
			found.push({ file, route: `${match[1]} ${normalise(path)}` });
		}
	}
	return found;
}

/**
 * Finds a path built by concatenation instead of a single literal.
 *
 * `sdkCalls` above stops at the end of the first literal, so
 * `"GET", "/voice/calls/" + id + "/transcript"` would be checked as
 * `GET /voice/calls` — a real route, so it passes while everything after the
 * id goes unverified. The go SDK shipped exactly that.
 *
 * Both literal forms must be matched. Catching only the double-quoted one
 * leaves `` `/voice/calls/${id}` + "/transcript" `` free to reopen the same
 * hole, which is how this test was first written.
 *
 * Note the residual gap: a path that does not *start* with a literal at all
 * (`request("GET", basePath + "/x")`, `request("GET", this.build(id))`)
 * matches neither this nor `sdkCalls`, so it is never checked. The count
 * floor only catches a wholesale regression, not one added method.
 */
function concatenatedPaths(): { file: string; prefix: string }[] {
	const found: { file: string; prefix: string }[] = [];
	const pattern =
		/"(?:GET|POST|PUT|PATCH|DELETE)",\s*(?:"(\/[^"]*)"|`([^`]*)`)\s*\+/g;
	for (const file of readdirSync(RESOURCES_DIR).filter((f) =>
		f.endsWith(".ts"),
	)) {
		const source = readFileSync(join(RESOURCES_DIR, file), "utf8");
		for (const match of source.matchAll(pattern)) {
			found.push({ file, prefix: (match[1] ?? match[2]) as string });
		}
	}
	return found;
}

describe("every SDK route exists on the API", () => {
	const calls = sdkCalls();

	// If the regex above ever stops matching, this test would pass vacuously.
	// The floor is deliberately close to the real count (~134) so a partial
	// match is caught too, not just a total one.
	test("the scan actually found the resource calls", () => {
		expect(calls.length).toBeGreaterThan(120);
	});

	test("no resource calls a route the API does not serve", () => {
		const unknown = calls
			.filter(({ route }) => !API_ROUTES.has(route))
			.map(({ file, route }) => `${file}: ${route}`)
			.sort();
		expect(unknown).toEqual([]);
	});

	test("no resource builds a path by concatenation", () => {
		const concatenated = concatenatedPaths().map(
			({ file, prefix }) =>
				`${file}: "${prefix}" + … — the scan cannot see past the +, use a template literal`,
		);
		expect(concatenated).toEqual([]);
	});
});
