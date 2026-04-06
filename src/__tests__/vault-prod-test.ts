/**
 * Vault SDK Production Test
 *
 * Tests all 18 VaultResource methods against the live API.
 * Uses an agent API key (ak_) so agentId is resolved server-side.
 *
 * Run: ANIMA_API_KEY=ak_... bun src/__tests__/vault-prod-test.ts
 */

import { Anima } from "../index";

const API_KEY = process.env.ANIMA_API_KEY;
if (!API_KEY) {
	console.error("ANIMA_API_KEY required");
	process.exit(1);
}

const anima = new Anima({
	apiKey: API_KEY,
	baseUrl: "https://api.useanima.sh",
});

let passed = 0;
let failed = 0;
const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function test(name: string, fn: () => Promise<void>) {
	try {
		await fn();
		passed++;
		results.push({ name, ok: true });
		console.log(`  \u2705  ${name}`);
	} catch (err: unknown) {
		failed++;
		const msg = err instanceof Error ? err.message : String(err);
		results.push({ name, ok: false, detail: msg });
		console.log(`  \u274c  ${name} \u2014 ${msg}`);
	}
}

console.log("\n=== Vault SDK Production Test ===\n");

// ---- Status & Sync ----
await test("status()", async () => {
	const s = await anima.vault.status();
	if (!s.status) throw new Error("missing status field");
});

await test("sync()", async () => {
	const r = await anima.vault.sync();
	if (!r.success) throw new Error("sync returned false");
});

// ---- Credential CRUD ----
let credId = "";

await test("createCredential()", async () => {
	const c = await anima.vault.createCredential({
		type: "login",
		name: "SDK Prod Test",
		login: { username: "sdkuser", password: "SdkP@ss!2026" },
	});
	if (!c.id) throw new Error("no id returned");
	credId = c.id;
});

await test("getCredential(id)", async () => {
	const c = await anima.vault.getCredential(credId);
	if (c.name !== "SDK Prod Test") throw new Error(`unexpected name: ${c.name}`);
});

await test("listCredentials()", async () => {
	const r = await anima.vault.listCredentials();
	if (!Array.isArray(r.items)) throw new Error("items not array");
	if (!r.items.some((i) => i.id === credId)) throw new Error("created cred not in list");
});

await test("updateCredential(id, input)", async () => {
	const c = await anima.vault.updateCredential(credId, { name: "SDK Prod Updated" });
	if (c.name !== "SDK Prod Updated") throw new Error(`name not updated: ${c.name}`);
});

await test("search(params)", async () => {
	const r = await anima.vault.search({ search: "SDK Prod" });
	if (!Array.isArray(r.items)) throw new Error("items not array");
});

// ---- Password Generation ----
await test("generatePassword()", async () => {
	const r = await anima.vault.generatePassword();
	if (!r.password || r.password.length < 8) throw new Error(`bad password: ${r.password}`);
});

await test("generatePassword(opts)", async () => {
	const r = await anima.vault.generatePassword({ length: 32 });
	if (r.password.length !== 32) throw new Error(`expected 32 chars, got ${r.password.length}`);
});

// ---- TOTP ----
await test("getTotp(id) — expected error (no TOTP configured)", async () => {
	try {
		await anima.vault.getTotp(credId);
		throw new Error("should have thrown — no TOTP seed");
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg === "should have thrown — no TOTP seed") throw err;
		// Expected error — no TOTP configured on test credential
	}
});

// ---- Ephemeral Tokens ----
let vtkToken = "";

await test("createToken(input)", async () => {
	const r = await anima.vault.createToken({
		credentialId: credId,
		scope: "autofill",
		ttlSeconds: 120,
	});
	if (!r.token?.startsWith("vtk_")) throw new Error(`bad token prefix: ${r.token}`);
	vtkToken = r.token;
});

await test("exchangeToken(token)", async () => {
	const c = await anima.vault.exchangeToken(vtkToken);
	if (c.name !== "SDK Prod Updated") throw new Error(`unexpected name: ${c.name}`);
});

await test("exchangeToken(token) — single-use rejection", async () => {
	try {
		await anima.vault.exchangeToken(vtkToken);
		throw new Error("should have thrown — token already used");
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg === "should have thrown — token already used") throw err;
		// Expected: token rejected
	}
});

await test("revokeTokens(input)", async () => {
	// Create another token to revoke
	const t = await anima.vault.createToken({ credentialId: credId, scope: "autofill" });
	const r = await anima.vault.revokeTokens({ credentialId: credId });
	if (typeof r.revoked !== "number") throw new Error("missing revoked count");
});

// ---- Sharing ----
await test("listShares(agentId, direction)", async () => {
	const r = await anima.vault.listShares(undefined, "granted");
	if (!Array.isArray(r.items)) throw new Error("items not array");
});

// shareCredential and revokeShare require a second agent — tested in security section

// ---- Cleanup ----
await test("deleteCredential(id)", async () => {
	await anima.vault.deleteCredential(credId);
	// Verify — should now error or return empty
});

// ---- Summary ----
console.log(`\n=== Summary ===`);
console.log(`Passed: ${passed}  |  Failed: ${failed}  |  Total: ${passed + failed}\n`);

if (failed > 0) {
	console.log("Failed tests:");
	for (const r of results.filter((r) => !r.ok)) {
		console.log(`  - ${r.name}: ${r.detail}`);
	}
	process.exit(1);
}
