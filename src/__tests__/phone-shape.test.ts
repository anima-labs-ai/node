/**
 * The phone types are a wire contract with the API's phone schemas.
 *
 * `PhoneIdentityOutput.provider` and `PhoneProvisionOutput.provider` were
 * declared REQUIRED and the API returns neither: both schemas dropped the
 * field (packages/contracts/src/schemas/agent.ts and .../phone.ts), and oRPC
 * strips anything the schema does not declare. Every phone object a caller
 * received had `undefined` where the type promised a `PhoneProvider`, and the
 * compiler cheerfully allowed `phone.provider.toLowerCase()`.
 *
 * It was dropped on purpose, not by accident: naming the carrier on a product
 * surface is what the vendor-neutrality rule forbids, so `provider` is not
 * coming back and the `PhoneProvider` union goes with it — the same way
 * `VoiceTier` went when `tier` was dropped.
 *
 * The reverse direction cost something too. `voiceId` has been on
 * `PhoneIdentityOutput` since the per-number voice landed, and the SDK never
 * declared it, so callers could not reach a field the API was already
 * sending — the per-number voice was unreadable through the typed API.
 *
 * Runtime tests cannot catch a field that is merely absent from a response, so
 * these guards are type-level, in the style of call-shape.test.ts. They are
 * enforced by `bun run typecheck`, which includes tsconfig.tests.json.
 */

import { describe, expect, test } from "bun:test";

import type {
	PhoneIdentityListItem,
	TenDlcStatus,
	PhoneIdentityOutput,
	PhoneProvisionOutput,
	SmsSuppression,
	SmsThread,
	SmsThreadDetail,
	SmsThreadListPage,
	SmsThreadStat,
} from "../types";

/**
 * The fields each schema actually carries. Spelled out rather than derived from
 * the SDK types — a check that reads the same type it is checking cannot fail
 * when that type is wrong.
 */
const LIVE_PHONE_IDENTITY_FIELDS = [
	"id",
	"phoneNumber",
	"providerId",
	"capabilities",
	"tenDlcStatus",
	"isPrimary",
	"voiceId",
	"createdAt",
] as const;

const LIVE_PHONE_PROVISION_FIELDS = [
	"id",
	"phoneNumber",
	"providerId",
	"capabilities",
	"tenDlcStatus",
	"isPrimary",
	"createdAt",
] as const;

/**
 * The SMS conversation surface, added when the phone contracts gained
 * `listIdentities` and `smsThreadStats`. Same rule as the two lists above:
 * transcribed from packages/contracts/src/schemas/phone.ts, never derived from
 * the SDK types they check.
 */
const LIVE_PHONE_IDENTITY_LIST_FIELDS = [
	...LIVE_PHONE_IDENTITY_FIELDS,
	"agentId",
	"agentName",
	"agentSlug",
] as const;

const LIVE_SMS_THREAD_FIELDS = [
	"threadId",
	"agentId",
	"participantAddress",
	"agentAddress",
	"lastMessageAt",
	"lastMessageSnippet",
	"lastMessageDirection",
	"messageCount",
	"unreadCount",
] as const;

// `{items, total, hasMore}` — offset-paged, so neither the `{items, pagination}`
// nor the `{items, nextCursor}` envelope. Asserted because feeding this shape
// to PageIterator yields `hasMore: false` on page one and silently truncates.
const LIVE_SMS_THREAD_PAGE_FIELDS = ["items", "total", "hasMore"] as const;

const LIVE_SMS_THREAD_DETAIL_FIELDS = [
	"threadId",
	"agentId",
	"participantAddress",
	"agentAddress",
	"messages",
	"messageCount",
	"hasMore",
] as const;

const LIVE_SMS_THREAD_STAT_FIELDS = [
	"agentId",
	"conversations",
	"unread",
	"lastMessageAt",
] as const;

const LIVE_SMS_SUPPRESSION_FIELDS = [
	"id",
	"phoneNumber",
	"agentId",
	"reason",
	"source",
	"createdAt",
] as const;

/**
 * Every 10DLC status the contract declares.
 *
 * `UNREGISTERED` has been in the contract since anima #314 (2026-07-17) and is
 * described there as "the state every newly provisioned US long code starts
 * in", but this union omitted it — so a `switch` over the status had no branch
 * for the one value a fresh US number actually carries, and narrowing told the
 * caller the case was impossible. The python SDK, which validates, raised
 * outright on the same payload.
 *
 * The drift canary cannot catch this class of gap: it diffs the pinned commit
 * against HEAD, and this landed before the pin.
 */
const LIVE_TEN_DLC_STATUSES = [
	"PENDING",
	"REGISTERED",
	"REJECTED",
	"NOT_REQUIRED",
	"UNREGISTERED",
] as const;

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Exact match, both directions. A field the API returns but the SDK omits is
// data a caller cannot reach; a field the SDK declares but the API never sends
// is a value that is always undefined behind a type that says otherwise.
const _phoneIdentityMatchesContract: Equals<
	keyof PhoneIdentityOutput,
	(typeof LIVE_PHONE_IDENTITY_FIELDS)[number]
> = true;

const _phoneProvisionMatchesContract: Equals<
	keyof PhoneProvisionOutput,
	(typeof LIVE_PHONE_PROVISION_FIELDS)[number]
> = true;

const _phoneIdentityListMatchesContract: Equals<
	keyof PhoneIdentityListItem,
	(typeof LIVE_PHONE_IDENTITY_LIST_FIELDS)[number]
> = true;

const _smsThreadMatchesContract: Equals<
	keyof SmsThread,
	(typeof LIVE_SMS_THREAD_FIELDS)[number]
> = true;

const _smsThreadPageMatchesContract: Equals<
	keyof SmsThreadListPage,
	(typeof LIVE_SMS_THREAD_PAGE_FIELDS)[number]
> = true;

const _smsThreadDetailMatchesContract: Equals<
	keyof SmsThreadDetail,
	(typeof LIVE_SMS_THREAD_DETAIL_FIELDS)[number]
> = true;

const _smsThreadStatMatchesContract: Equals<
	keyof SmsThreadStat,
	(typeof LIVE_SMS_THREAD_STAT_FIELDS)[number]
> = true;

const _smsSuppressionMatchesContract: Equals<
	keyof SmsSuppression,
	(typeof LIVE_SMS_SUPPRESSION_FIELDS)[number]
> = true;

const _tenDlcStatusMatchesContract: Equals<
	TenDlcStatus,
	(typeof LIVE_TEN_DLC_STATUSES)[number]
> = true;

describe("phone shapes match the API contract", () => {
	test("the type-level guards are asserted", () => {
		// The real assertions are the two `= true` bindings above, checked by
		// tsc. This keeps the file a runnable test and documents the count, so
		// deleting a guard is visible rather than silent.
		expect([
			_phoneIdentityMatchesContract,
			_phoneProvisionMatchesContract,
			_phoneIdentityListMatchesContract,
			_smsThreadMatchesContract,
			_smsThreadPageMatchesContract,
			_smsThreadDetailMatchesContract,
			_smsThreadStatMatchesContract,
			_smsSuppressionMatchesContract,
			_tenDlcStatusMatchesContract,
		]).toEqual([true, true, true, true, true, true, true, true, true]);
	});
});
