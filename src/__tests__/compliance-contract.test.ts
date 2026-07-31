/**
 * Pins the compliance surface to the API contract.
 *
 * The compliance resource shipped with every enum in lowercase against an API
 * that validates SCREAMING_SNAKE, a DSAR body keyed `requestType` where the
 * API reads `type`, and two routes (`/reports/{id}/download`,
 * `/dsars/{id}/complete`) that the API does not serve. Every call this
 * resource could make was rejected. It had no test file at all, which is why
 * that survived from the day it was written.
 *
 * The daily drift canary (.github/workflows/anima-drift-canary.yml) does not
 * cover this: it fires when the monorepo's contracts CHANGE, and these types
 * were never right to begin with. The two are complements — the canary catches
 * the contract moving, this catches the SDK moving away from it.
 *
 * Source of truth for everything below, at the commit in .anima-ref:
 *   packages/contracts/src/schemas/compliance.ts
 *   packages/contracts/src/schemas/compliance-controls.ts
 *   packages/contracts/src/contracts/compliance.ts
 */

import { describe, expect, mock, test } from "bun:test";

import type { RequestClient } from "../client";
import { ComplianceResource } from "../resources/compliance";
import type {
	ComplianceControlCategory,
	ComplianceControlStatus,
	ComplianceFramework,
	ComplianceReportFormat,
	ComplianceReportStatus,
	ComplianceReportType,
	DsarStatus,
	DsarType,
} from "../types";

/**
 * Fails to compile unless `Pinned` and `Union` have exactly the same members.
 * A value added to the type but not to the list below — or vice versa — is a
 * type error here rather than a 400 at runtime.
 */
type ExactlyEquals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

const FRAMEWORKS = ["SOC2", "GDPR", "PCI"] as const;
const CONTROL_STATUSES = [
	"NOT_STARTED",
	"IN_PROGRESS",
	"IMPLEMENTED",
	"VERIFIED",
	"FAILED",
] as const;
const CONTROL_CATEGORIES = [
	"CC1",
	"CC2",
	"CC3",
	"CC4",
	"CC5",
	"CC6",
	"CC7",
	"CC8",
	"CC9",
	"A1",
	"PI1",
	"C1",
	"P1",
] as const;
const REPORT_TYPES = [
	"SOC2_SUMMARY",
	"ACTIVITY_REPORT",
	"ACCESS_REVIEW",
	"AUDIT_EXPORT",
	"GDPR_DSAR",
] as const;
const REPORT_STATUSES = ["PENDING", "GENERATING", "COMPLETED", "FAILED"] as const;
const REPORT_FORMATS = ["JSON", "CSV", "PDF"] as const;
const DSAR_TYPES = ["ACCESS", "DELETE", "RECTIFY", "PORTABILITY", "RESTRICT"] as const;
const DSAR_STATUSES = [
	"RECEIVED",
	"VERIFIED",
	"IN_PROGRESS",
	"COMPLETED",
	"DENIED",
	"OVERDUE",
] as const;

/**
 * Every entry is `true` only if the pinned list and the exported union match
 * exactly. Drift makes the corresponding slot `never`, so this declaration
 * stops compiling — `bun run typecheck` is what actually enforces the pins.
 */
const CONTRACT_PINS: [
	ExactlyEquals<(typeof FRAMEWORKS)[number], ComplianceFramework>,
	ExactlyEquals<(typeof CONTROL_STATUSES)[number], ComplianceControlStatus>,
	ExactlyEquals<(typeof CONTROL_CATEGORIES)[number], ComplianceControlCategory>,
	ExactlyEquals<(typeof REPORT_TYPES)[number], ComplianceReportType>,
	ExactlyEquals<(typeof REPORT_STATUSES)[number], ComplianceReportStatus>,
	ExactlyEquals<(typeof REPORT_FORMATS)[number], ComplianceReportFormat>,
	ExactlyEquals<(typeof DSAR_TYPES)[number], DsarType>,
	ExactlyEquals<(typeof DSAR_STATUSES)[number], DsarStatus>,
] = [true, true, true, true, true, true, true, true];

function createMockClient(): {
	resource: ComplianceResource;
	requestMock: ReturnType<typeof mock>;
} {
	const requestMock = mock(async () => ({ ok: true }));
	const client: RequestClient = { request: requestMock as RequestClient["request"] };
	return { resource: new ComplianceResource(client), requestMock };
}

/** [method, path] of the single call the resource made. */
function callSignature(requestMock: ReturnType<typeof mock>): [string, string] {
	const [method, path] = requestMock.mock.calls[0] as [string, string];
	return [method, path];
}

describe("compliance enums match the API contract", () => {
	// The type-level assertions above are the real guard; these keep the values
	// visible in test output so a mismatch reads as a diff, not a type error in
	// a file nobody opened.
	test("the type-level pins all hold", () => {
		expect(CONTRACT_PINS).toEqual([true, true, true, true, true, true, true, true]);
	});

	test("every enum is SCREAMING_SNAKE", () => {
		const all: string[] = [
			...FRAMEWORKS,
			...CONTROL_STATUSES,
			...REPORT_TYPES,
			...REPORT_STATUSES,
			...REPORT_FORMATS,
			...DSAR_TYPES,
			...DSAR_STATUSES,
		];
		for (const value of all) {
			expect(value).toBe(value.toUpperCase());
		}
	});

	test("DSAR types are the five the API accepts", () => {
		expect([...DSAR_TYPES]).toEqual(["ACCESS", "DELETE", "RECTIFY", "PORTABILITY", "RESTRICT"]);
	});

	test("DSAR statuses include OVERDUE, which the SDK used to omit", () => {
		expect([...DSAR_STATUSES]).toContain("OVERDUE");
	});
});

describe("compliance routes match the API contract", () => {
	test("createDsar POSTs the org-scoped collection", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.createDsar("org_1", { type: "ACCESS", subjectEmail: "a@b.com" });
		expect(callSignature(requestMock)).toEqual(["POST", "/orgs/org_1/compliance/dsars"]);
	});

	test("createDsar sends `type`, never `requestType`", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.createDsar("org_1", { type: "DELETE", subjectEmail: "a@b.com" });
		const body = requestMock.mock.calls[0][2] as Record<string, unknown>;
		expect(body.type).toBe("DELETE");
		expect(body).not.toHaveProperty("requestType");
	});

	test("updateDsarStatus PATCHes the DSAR itself, not a /complete sub-path", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.updateDsarStatus("org_1", "dsar_1", { status: "COMPLETED" });
		expect(callSignature(requestMock)).toEqual([
			"PATCH",
			"/orgs/org_1/compliance/dsars/dsar_1",
		]);
	});

	test("exportReport POSTs /export rather than GETting /download", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.exportReport("org_1", "rep_1", { format: "PDF" });
		expect(callSignature(requestMock)).toEqual([
			"POST",
			"/orgs/org_1/compliance/reports/rep_1/export",
		]);
	});

	test("getDsar reads a single request", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.getDsar("org_1", "dsar_1");
		expect(callSignature(requestMock)).toEqual(["GET", "/orgs/org_1/compliance/dsars/dsar_1"]);
	});

	test("listTemplates reads the template catalogue", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.listTemplates("org_1");
		expect(callSignature(requestMock)).toEqual(["GET", "/orgs/org_1/compliance/templates"]);
	});

	test("generateReport POSTs a report type the API accepts", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.generateReport("org_1", { type: "SOC2_SUMMARY" });
		const [method, path] = callSignature(requestMock);
		const body = requestMock.mock.calls[0][2] as Record<string, unknown>;
		expect([method, path]).toEqual(["POST", "/orgs/org_1/compliance/reports"]);
		expect(REPORT_TYPES).toContain(body.type as (typeof REPORT_TYPES)[number]);
	});

	test("control status update PATCHes with an uppercase status", async () => {
		const { resource, requestMock } = createMockClient();
		await resource.updateControlStatus("org_1", "CC6.1", { status: "IMPLEMENTED" });
		const body = requestMock.mock.calls[0][2] as Record<string, unknown>;
		expect(callSignature(requestMock)).toEqual([
			"PATCH",
			"/orgs/org_1/compliance/controls/CC6.1",
		]);
		expect(body.status).toBe("IMPLEMENTED");
	});
});
