const isDebug = process.env.ANIMA_LOG === "debug";

export function debug(message: string, data?: Record<string, unknown>): void {
	if (!isDebug) return;
	const timestamp = new Date().toISOString();
	const suffix = data ? ` ${JSON.stringify(data)}` : "";
	console.debug(`[anima ${timestamp}] ${message}${suffix}`);
}
