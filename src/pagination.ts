import type { RequestClient } from "./client";
import type { PaginatedResponse } from "./types";

/**
 * A paginated list result that supports both single-page access and
 * automatic iteration across all pages.
 *
 * Single page (backwards compatible):
 *   const page = await anima.agents.list();
 *   console.log(page.items, page.pagination);
 *
 * Auto-pagination:
 *   for await (const agent of anima.agents.list()) {
 *     console.log(agent);
 *   }
 */
export class PageIterator<T>
	implements PromiseLike<PaginatedResponse<T>>, AsyncIterable<T>
{
	private readonly fetchPage: (
		cursor?: string,
	) => Promise<PaginatedResponse<T>>;

	constructor(fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>) {
		this.fetchPage = fetchPage;
	}

	/** Await the first page (backwards compatible with Promise<PaginatedResponse<T>>) */
	then<TResult1 = PaginatedResponse<T>, TResult2 = never>(
		onfulfilled?:
			| ((value: PaginatedResponse<T>) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.fetchPage().then(onfulfilled, onrejected);
	}

	/** Iterate over all items across all pages automatically */
	async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
		let cursor: string | undefined;
		do {
			const page = await this.fetchPage(cursor);
			for (const item of page.items) {
				yield item;
			}
			cursor =
				page.pagination.hasMore && page.pagination.nextCursor
					? page.pagination.nextCursor
					: undefined;
		} while (cursor);
	}
}

/** Helper to create a PageIterator from a client request */
export function createPageIterator<T, P extends { cursor?: string }>(
	client: RequestClient,
	method: string,
	path: string,
	params: P | undefined,
	toQuery: (params?: P) => Record<string, string> | undefined,
): PageIterator<T> {
	return new PageIterator<T>((cursor) => {
		const merged = cursor ? ({ ...params, cursor } as P) : params;
		return client.request<PaginatedResponse<T>>(
			method,
			path,
			undefined,
			toQuery(merged),
		);
	});
}
