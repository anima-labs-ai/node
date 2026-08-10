/**
 * Conformance probe against a DEPLOYED Anima API.
 *
 * Everything else in this suite compares the SDK to a fixture written by
 * whoever wrote the code. That is why 24 calls to routes the API has never
 * served stayed green for months, and why `resources.test.ts` had
 * `"/security/scan"` pinned verbatim: the mock always agreed with the bug.
 * Even `integration.test.ts` falls back to an in-process mock in CI.
 *
 * This is the half a mock cannot cover. Each probe calls a real read-only
 * endpoint over HTTP and classifies the outcome:
 *
 * | outcome        | verdict | why                                              |
 * |----------------|---------|--------------------------------------------------|
 * | 200 + shape ok | pass    | route exists and the response looks as declared   |
 * | 401 / 403      | pass    | route exists; this key just lacks the scope       |
 * | 404            | FAIL    | the route is gone — the phantom-route class       |
 * | 400 / 422      | FAIL    | the API rejected OUR request: bad enum, bad param |
 * | 5xx            | FAIL    | reported separately; usually not the SDK's fault  |
 *
 * The 400 row is the one that earns its keep — it catches a request the SDK
 * built wrongly, which no mock will ever reject.
 *
 * Unlike the python probe, TypeScript types are erased at runtime, so nothing
 * validates the response for us. Where a probe declares an `expect` on the
 * payload, that assertion IS the shape check — keep them.
 *
 * STRICTLY READ-ONLY. No probe creates, mutates or deletes anything: this runs
 * against a real organization. Do not add a POST here.
 *
 *   ANIMA_LIVE_API_KEY=mk_...  # master key sees the most surface
 *   ANIMA_LIVE_ORG_ID=org_...  # required for org-scoped probes
 *   ANIMA_LIVE_AGENT_ID=...     # required for agent-scoped vault probes
 *   ANIMA_LIVE_BASE_URL=...    # optional, defaults to production
 *   bun test src/__tests__/live-conformance.test.ts
 *
 * Without ANIMA_LIVE_API_KEY every probe skips, so normal CI is unaffected.
 */
import { describe, expect, test } from "bun:test";
import {
	AuthError,
	InternalServerError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "../errors";
import { Anima } from "../index";
import type { ComplianceFramework, SecuritySeverity } from "../types";

// GitHub Actions interpolates an *unset* secret to the empty string rather
// than leaving the variable out: `FOO: ${{ secrets.FOO }}` with no FOO
// configured still puts FOO="" in the environment. `??` only falls back on
// null/undefined, so `apiKey ?? "unset"` below handed `new Anima()` an empty
// key and threw at import time — before a single `test.skip` could run. That
// is how an unconfigured repo went red on a workflow whose stated contract is
// "without them every probe skips, so a fork or an unconfigured repo is green
// rather than broken". Read empty as absent once, here; every guard below is
// already a truthiness check and was never the problem.
const env = (name: string): string | undefined => process.env[name] || undefined;

const apiKey = env("ANIMA_LIVE_API_KEY");
const orgId = env("ANIMA_LIVE_ORG_ID");
const baseUrl = env("ANIMA_LIVE_BASE_URL");

const live = apiKey ? test : test.skip;
const orgScoped = apiKey && orgId ? test : test.skip;
// Several vault routes are agent-scoped and REJECT a master key that does not
// name an agent ("agentId is required when using a master key"). Without an
// agent id there is no way to probe them at all, so they skip rather than fail
// for a reason that has nothing to do with conformance.
const agentId = env("ANIMA_LIVE_AGENT_ID");
const agentScoped = apiKey && agentId ? test : test.skip;

const anima = new Anima({
	apiKey: apiKey ?? "unset",
	...(baseUrl ? { baseUrl } : {}),
});

/**
 * How many probes got a real 2xx back.
 *
 * A 401 is a pass for each probe on its own — it proves the route exists — but
 * that does not compose: a key scoped for nothing is rejected everywhere and
 * turns this whole file green having checked no path, no query param and no
 * response shape. The final test below fails that run.
 */
let reached = 0;

/**
 * Run one read-only call and apply the verdict table above.
 *
 * `PromiseLike`, not `Promise`: the list methods return `PageIterator`, which
 * is thenable (awaiting it fetches the first page) but is not a real Promise.
 */
async function probe(call: () => PromiseLike<unknown>): Promise<void> {
	try {
		await call();
		reached++;
	} catch (err) {
		if (err instanceof NotFoundError) {
			throw new Error(
				`404 — the API does not serve this route. Either the SDK path is wrong ` +
					`or the endpoint was removed: ${err.message}`,
			);
		}
		if (err instanceof ValidationError) {
			throw new Error(
				`400/422 — the API rejected the request the SDK built. This is the class ` +
					`of bug a mock cannot catch (wrong enum casing, wrong query param name, ` +
					`wrong path param): ${err.message}`,
			);
		}
		// 401/403 proves the route exists and is reachable; this key simply is
		// not scoped for it. A pass for conformance purposes.
		if (err instanceof AuthError) return;
		if (err instanceof RateLimitError) return;
		if (err instanceof InternalServerError) {
			// A vault route that reaches `bw serve` and finds nothing listening
			// has already proved everything conformance cares about: the route
			// exists, auth passed, and the API accepted the request the SDK
			// built. The missing piece is the storage backend, which is a
			// property of the deployment — a local API without Vaultwarden, or
			// one mid-restart. Failing here would say "the SDK is wrong" about
			// an SDK that did everything right.
			//
			// Narrow on purpose: only the connectivity message. Any other 5xx
			// still fails, including a bw-serve error that indicates a real
			// fault rather than an absent process.
			if (err.message.includes("bw-serve: Unable to connect")) return;
			throw new Error(
				`5xx from the live API (likely not the SDK's fault): ${err.message}`,
			);
		}
		throw err;
	}
}

describe("live conformance — core surface", () => {
	live("agents.list", async () => {
		await probe(async () => {
			const page = await anima.agents.list({ limit: 1 });
			// The envelope is the thing a mock cannot get wrong. Assert it.
			expect(Array.isArray(page.items)).toBe(true);
			expect(page.pagination).toBeDefined();
			expect(typeof page.pagination.hasMore).toBe("boolean");
		});
	});

	live("domains.list", async () => {
		await probe(async () => {
			const result = await anima.domains.list();
			expect(Array.isArray(result.items)).toBe(true);
		});
	});

	live("inboxes.list", async () => {
		await probe(() => anima.inboxes.list({ limit: 1 }));
	});

	live("webhooks.list", async () => {
		await probe(() => anima.webhooks.list());
	});

	live("messages.list", async () => {
		await probe(() => anima.messages.list({ limit: 1 }));
	});
});

describe("live conformance — voice", () => {
	live("voices.list", async () => {
		await probe(() => anima.voices.list());
	});

	live("calls.list", async () => {
		await probe(() => anima.calls.list({ limit: 1 }));
	});
});

describe("live conformance — vault", () => {
	live("vault.listIdentities", async () => {
		await probe(() => anima.vault.listIdentities({ limit: 1 }));
	});

	live("vault.audit", async () => {
		await probe(() => anima.vault.audit({ limit: 1 }));
	});

	// Added 2026-08; nothing had exercised this route from any SDK.
	live("vault.credentialRequestList", async () => {
		await probe(() => anima.vault.credentialRequestList({ limit: 1 }));
	});

	// Read-only, and cheap. These build their query params by hand, which is
	// exactly the shape of bug a mock cannot catch — a wrong param name reads
	// as an empty result, not an error.
	agentScoped("vault.status", async () => {
		await probe(() => anima.vault.status(agentId));
	});

	agentScoped("vault.listShares — granted", async () => {
		await probe(() => anima.vault.listShares(agentId, "granted"));
	});

	agentScoped("vault.listShares — received", async () => {
		await probe(() => anima.vault.listShares(agentId, "received"));
	});
});

describe("live conformance — provisioning requests", () => {
	live("provisioningRequests.list", async () => {
		await probe(async () => {
			const page = await anima.provisioningRequests.list({ limit: 1 });
			expect(Array.isArray(page.items)).toBe(true);
			expect(page.pagination).toBeDefined();
		});
	});

	// The status filter is a server-side enum. Sending the wrong casing is the
	// classic drift this whole file exists to catch — the API answers 400, and
	// no fixture ever would.
	live("provisioningRequests.list — status filter", async () => {
		await probe(() =>
			anima.provisioningRequests.list({ status: "PENDING", limit: 1 }),
		);
	});

	live("provisioningRequests.list — resource filter", async () => {
		await probe(() =>
			anima.provisioningRequests.list({ resource: "VAULT", limit: 1 }),
		);
	});
});

describe("live conformance — org-scoped (the surface that was most wrong)", () => {
	orgScoped("audit.list", async () => {
		await probe(() => anima.audit.list(orgId as string, { limit: 1 }));
	});

	// UPPERCASE in the contract; this SDK had them lowercase until 2026-08-04.
	// Sent as FILTERS, so a wrong casing is a 400 rather than an empty list — a
	// response assertion would pass on an org with no audit rows, and TS erases
	// the type so nothing else can catch it.
	orgScoped("audit.list — actorType enum values are accepted", async () => {
		for (const actorType of ["API_KEY", "USER", "SYSTEM", "AGENT"] as const) {
			await probe(() =>
				anima.audit.list(orgId as string, { actorType, limit: 1 }),
			);
		}
	});

	orgScoped("audit.list — result enum values are accepted", async () => {
		for (const result of ["SUCCESS", "FAILURE", "DENIED"] as const) {
			await probe(() =>
				anima.audit.list(orgId as string, { result, limit: 1 }),
			);
		}
	});

	// The flat-envelope endpoints answer {items, nextCursor} with no
	// `pagination`. Awaiting the page used to yield `pagination: undefined`, and
	// iterating it threw on the first page boundary.
	orgScoped("audit.list — the flat envelope is normalized", async () => {
		await probe(async () => {
			const page = await anima.audit.list(orgId as string, { limit: 1 });
			expect(Array.isArray(page.items)).toBe(true);
			expect(page.pagination).toBeDefined();
			expect(typeof page.pagination.hasMore).toBe("boolean");
		});
	});

	orgScoped("anomaly.listAlerts", async () => {
		await probe(() => anima.anomaly.listAlerts(orgId as string, { limit: 1 }));
	});

	orgScoped("anomaly.listRules", async () => {
		await probe(() => anima.anomaly.listRules(orgId as string));
	});

	orgScoped("security.listEvents", async () => {
		await probe(() =>
			anima.security.listEvents({ orgId: orgId as string, limit: 1 }),
		);
	});

	orgScoped("security.getScannerStatus", async () => {
		await probe(async () => {
			const status = await anima.security.getScannerStatus(orgId as string);
			// `aiScanner.active` is the field the removed `scanContent` used to
			// imply; assert it so a rename cannot pass silently.
			expect(status.aiScanner).toBeDefined();
			expect(typeof status.aiScanner.active).toBe("boolean");
		});
	});

	orgScoped("compliance.listControls", async () => {
		await probe(() =>
			anima.compliance.listControls(orgId as string, { limit: 1 }),
		);
	});

	orgScoped("compliance.listTemplates", async () => {
		await probe(() => anima.compliance.listTemplates(orgId as string));
	});

	orgScoped("compliance.listReports", async () => {
		await probe(() =>
			anima.compliance.listReports(orgId as string, { limit: 1 }),
		);
	});

	orgScoped("compliance.listDsars", async () => {
		await probe(() =>
			anima.compliance.listDsars(orgId as string, { limit: 1 }),
		);
	});
});

/**
 * Send each enum value the SDK declares and confirm the API accepts it.
 *
 * This is the probe that would have caught the compliance bug outright: every
 * enum was lowercase against a contract validating SCREAMING_SNAKE, so each of
 * these would have returned 400 — while the mocked tests passed.
 */
describe("live conformance — declared enums are accepted", () => {
	// Spelled as `satisfies Record<Union, true>` rather than a plain array so
	// the compiler owns the list. Add a member to the union and this record is
	// missing a key; remove one and it has an excess key. Either way it fails
	// to build, so the probe cannot silently drift out of step with the type
	// it is meant to cover — a hand-written array agrees with itself forever,
	// which is the exact failure mode this file exists to end.
	//
	// The `Object.keys` cast is the standard workaround for its `string[]`
	// return type; the `satisfies` above is what makes it sound here.
	const frameworks = Object.keys({
		SOC2: true,
		GDPR: true,
		PCI: true,
	} satisfies Record<ComplianceFramework, true>) as ComplianceFramework[];

	const severities = Object.keys({
		LOW: true,
		MEDIUM: true,
		HIGH: true,
		CRITICAL: true,
	} satisfies Record<SecuritySeverity, true>) as SecuritySeverity[];

	for (const framework of frameworks) {
		orgScoped(`compliance framework ${framework}`, async () => {
			await probe(() =>
				anima.compliance.listControls(orgId as string, { framework, limit: 1 }),
			);
		});
	}

	for (const severity of severities) {
		orgScoped(`security severity ${severity}`, async () => {
			await probe(() =>
				anima.security.listEvents({
					orgId: orgId as string,
					severity,
					limit: 1,
				}),
			);
		});
	}
});

/**
 * Fail a run in which no probe ever got a 2xx.
 *
 * Every verdict above is sound on its own, but "401 is a pass" does not
 * compose: a key with no scopes is rejected everywhere, each probe passes
 * because the route demonstrably exists, and this file goes green having
 * verified nothing at all — the same hollow tick the mocks were giving us,
 * which is the entire reason the file exists.
 *
 * Deliberately last: bun runs tests within a file in source order, so every
 * probe above has already run and settled `reached`.
 */
describe("live conformance — the run reached the API", () => {
	live("at least one probe got a 2xx", () => {
		if (reached === 0) {
			throw new Error(
				"no probe reached the API: every call was rejected (401/403), rate " +
					"limited, or skipped, so this run verified no path, no query param " +
					"and no response shape. Check that ANIMA_LIVE_API_KEY is valid and " +
					"scoped — a green run in this state would prove nothing.",
			);
		}
	});
});
